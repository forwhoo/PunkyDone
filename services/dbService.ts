
import { supabase } from './supabaseClient';
import { Song } from '../types';

export interface HistoryItem {
    spotify_id: string;
    played_at: string;
    track_name: string;
    artist_name: string;
    album_name: string;
    album_cover: string;
    duration_ms: number;
    user_timezone?: string;
    popularity?: number; // Requires extra fetch usually, but we can store if we had it
}

// DYNAMIC CHART GENERATION (No Stored Table)
// Calls Supabase RPC to calc Trends, Streaks on the fly
export const fetchCharts = async (period: 'daily' | 'weekly' | 'monthly' | 'all time' = 'weekly'): Promise<any[]> => {
    try {
        console.log("Fetching charts for", period);

        // DISABLE RPC CALL due to "ambiguous column" error on server side
        // OLD: const { data, error } = await supabase.rpc('get_dynamic_chart', ...);

        // ALWAYS USE FALLBACK (Manual Calc) UNTIL RPC IS FIXED
        const dashboardStats = await fetchDashboardStats(
            (period === 'all time' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)) as any
        );

        // Convert dashboardStats.songs to chart format
        return (dashboardStats.songs || []).slice(0, 20).map((song: any, i: number) => ({
            id: song.id,
            title: song.title,
            artist: song.artist,
            cover: song.cover,
            listens: song.listens,
            timeStr: song.timeStr,
            rank: i + 1,
            prev: null,
            peak: i + 1,
            streak: 1,
            trend: 'NEW'
        }));

    } catch (err) {
        console.error("fetchCharts Exception:", err);
        return [];
    }
};

const formatDuration = (ms: number) => {
    const min = Math.floor(ms / 60000);
    return `${min}m`;
};

// Removed old ChartEntry interface to avoid confusion
export interface ChartEntry {
    // Placeholder if needed elsewhere
}

// ... (Rest of file)

export const logSinglePlay = async (track: any, listenedMs: number, extraData: any = {}) => {
    // Log if at least 30 seconds (Spotify standard)
    if (!track || listenedMs < 30000) return;

    // Cap duration
    const duration = track.duration_ms ? Math.min(listenedMs, track.duration_ms) : listenedMs;

    const historyItem: HistoryItem = {
        spotify_id: track.id,
        played_at: new Date().toISOString(),
        track_name: track.name,
        artist_name: track.artists[0].name,
        album_name: track.album.name,
        album_cover: track.album.images[0]?.url || '',
        duration_ms: listenedMs,
        user_timezone: extraData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    const { error } = await supabase
        .from('listening_history')
        .insert(historyItem);

    if (error) {
        console.error("Failed to log play:", error);
    } else {
        // console.log("Logged play:", track.name, listenedMs);
    }
};

let lastSyncedTime: string | null = null;

export const syncRecentPlays = async (recentItems: any[], token?: string) => {
    if (!recentItems || recentItems.length === 0) return;

    // If we haven't synced yet this session, look up the latest song in DB
    if (!lastSyncedTime) {
        const { data } = await supabase
            .from('listening_history')
            .select('played_at')
            .order('played_at', { ascending: false })
            .limit(1)
            .single();

        if (data) {
            lastSyncedTime = data.played_at;
        }
    }

    // Filter out songs we've already synced
    // If lastSyncedTime is set, only keep items newer than it
    const newItems = lastSyncedTime
        ? recentItems.filter(item => new Date(item.played_at) > new Date(lastSyncedTime!))
        : recentItems;

    if (newItems.length === 0) return;

    const historyItems: HistoryItem[] = newItems.map(item => ({
        spotify_id: item.track.id,
        played_at: item.played_at,
        track_name: item.track.name,
        artist_name: item.track.artists[0].name,
        album_name: item.track.album.name,
        album_cover: item.track.album.images[0]?.url || '',
        duration_ms: item.track.duration_ms
    }));

    const { error } = await supabase
        .from('listening_history')
        .upsert(historyItems, { onConflict: 'played_at' });

    if (error) {
        console.error('Error syncing history:', error);
    } else {
        // Update local cache of latest time
        // Sort new items to find the latest
        const latest = newItems.reduce((max, item) =>
            new Date(item.played_at) > new Date(max.played_at) ? item : max
            , newItems[0]);

        lastSyncedTime = latest.played_at;

        // Backfill missing artist images if token is available
        if (token) {
            // Get unique artists that need images
            const artistsNeedingImages = [...new Set(
                historyItems
                    .filter(item => !item.album_cover || item.album_cover === '')
                    .map(item => item.artist_name)
            )];

            if (artistsNeedingImages.length > 0) {
                console.log(`[syncRecentPlays] Fetching images for ${artistsNeedingImages.length} artists`);
                try {
                    const { fetchArtistImages } = await import('./spotifyService');
                    const artistImages = await fetchArtistImages(token, artistsNeedingImages);

                    // Update records with artist images
                    for (const [artistName, imageUrl] of Object.entries(artistImages)) {
                        await supabase
                            .from('listening_history')
                            .update({ album_cover: imageUrl })
                            .eq('artist_name', artistName)
                            .or('album_cover.is.null,album_cover.eq.');
                    }
                } catch (err) {
                    console.error('[syncRecentPlays] Failed to fetch artist images:', err);
                }
            }
        }

        // console.log(`Synced ${historyItems.length} NEW items to Supabase`);
    }
};

// removed syncCharts

export const fetchListeningStats = async () => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch data for the last 14 days to calculate current week vs last week
    const { data, error } = await supabase
        .from('listening_history')
        .select('duration_ms, played_at')
        .gte('played_at', fourteenDaysAgo.toISOString());

    if (error || !data) return null;

    let currentWeekMs = 0;
    let lastWeekMs = 0;

    data.forEach(item => {
        const playTime = new Date(item.played_at);
        if (playTime >= sevenDaysAgo) {
            currentWeekMs += item.duration_ms;
        } else {
            lastWeekMs += item.duration_ms;
        }
    });

    // Calculate detailed stats for AI (Longest Gap, etc.)
    // Sort by time
    data.sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());

    let longestGapMs = 0;
    let maxSessionMs = 0;
    let currentSessionMs = 0;
    let lastEndTime = 0;

    if (data.length > 0) {
        lastEndTime = new Date(data[0].played_at).getTime() + (data[0].duration_ms || 0);
        currentSessionMs = (data[0].duration_ms || 0);

        for (let i = 1; i < data.length; i++) {
            const start = new Date(data[i].played_at).getTime();
            const gap = start - lastEndTime;

            if (gap > longestGapMs) longestGapMs = gap;

            // Define session: breaks < 30 mins
            if (gap < 30 * 60 * 1000) {
                currentSessionMs += (data[i].duration_ms || 0);
            } else {
                if (currentSessionMs > maxSessionMs) maxSessionMs = currentSessionMs;
                currentSessionMs = (data[i].duration_ms || 0);
            }

            lastEndTime = start + (data[i].duration_ms || 0);
        }
        if (currentSessionMs > maxSessionMs) maxSessionMs = currentSessionMs;
    }

    const longestGapHours = (longestGapMs / (1000 * 60 * 60)).toFixed(1);
    const longestSessionHours = (maxSessionMs / (1000 * 60 * 60)).toFixed(1);

    const currentHours = Math.floor(currentWeekMs / (1000 * 60 * 60));
    const currentMins = Math.floor((currentWeekMs % (1000 * 60 * 60)) / (1000 * 60));

    const lastHours = Math.floor(lastWeekMs / (1000 * 60 * 60));

    // Calculate trend
    const hoursDiff = currentHours - (lastHours || 0);
    const trendString = hoursDiff >= 0 ? `+${hoursDiff}h vs last week` : `${hoursDiff}h vs last week`;

    // Get total stats (overall history)
    const { data: allData, count } = await supabase.from('listening_history').select('duration_ms', { count: 'exact' });
    const totalMs = allData?.reduce((acc, item) => acc + (item.duration_ms || 0), 0) || 0;
    const totalMinutes = Math.floor(totalMs / 60000);

    return {
        weeklyTime: `${currentHours}h ${currentMins}m`,
        weeklyTrend: trendString,
        totalTracks: count || 0,
        totalMinutes,
        extraStats: {
            longestGapHours,
            longestSessionHours
        }
    };
};

export const fetchDashboardStats = async (timeRange: 'Daily' | 'Weekly' | 'Monthly' | 'All Time' = 'Weekly') => {
    console.log(`[dbService] 📊 fetchDashboardStats called with timeRange: ${timeRange}`);
    const functionStart = performance.now();

    // Calculate date range based on timeRange selection
    const now = new Date();
    let startDate: Date;

    if (timeRange === 'Daily') {
        // Get data from today (12:00 AM to now)
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (timeRange === 'Weekly') {
        // Get data from last Monday 12:00 AM
        const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const daysToMonday = (dayOfWeek + 6) % 7; // Days since last Monday
        startDate = new Date(now.getTime() - daysToMonday * 24 * 60 * 60 * 1000);
        startDate.setHours(0, 0, 0, 0);
    } else if (timeRange === 'Monthly') {
        // Monthly - get data from first day of current month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else {
        // All Time
        startDate = new Date(1970, 0, 1);
    }

    // OPTIMIZATION: Use Server-side RPC for All Time to avoid crashing browser with 80k rows
    if (timeRange === 'All Time') {
        const startTime = performance.now();
        console.log("[dbService] ⏳ Fetching ALL TIME stats from RPC...");

        const { data, error } = await supabase.rpc('get_all_time_stats');

        const elapsed = Math.round(performance.now() - startTime);
        console.log(`[dbService] ⏱️ RPC completed in ${elapsed}ms`);

        if (error) {
            console.error("[dbService] ❌ RPC Error:", error);
            console.log("[dbService] Returning empty fallback for All Time");
            // Return structure matching what the rest of this function returns
            return {
                artists: [],
                songs: [],
                albums: [],
                hourlyActivity: [],
                recentPlays: []
            };
        }

        if (!data) {
            console.warn("[dbService] ⚠️ RPC returned null/undefined data");
            return {
                artists: [],
                songs: [],
                albums: [],
                hourlyActivity: [],
                recentPlays: []
            };
        }

        // Log stats
        const artistCount = data.artists?.length || 0;
        const songCount = data.songs?.length || 0;
        const albumCount = data.albums?.length || 0;
        const totalMins = data.totals?.minutes || 0;
        const totalTracks = data.totals?.tracks || 0;

        console.log(`[dbService] ✅ ALL TIME Stats Loaded:`);
        console.log(`   → ${artistCount} artists, ${songCount} songs, ${albumCount} albums`);
        console.log(`   → Total: ${totalMins} minutes listened, ${totalTracks} plays (>30s)`);

        // Transform RPC result to expected format (matching non-RPC return shape)
        const artists = (data.artists || []).map((a: any, i: number) => ({
            id: `artist-${i}`,
            name: a.name,
            image: a.image || '',
            totalListens: a.totalListens || 0,
            timeStr: a.timeStr || '0m',
            trend: 0
        }));

        const songs = (data.songs || []).map((s: any, i: number) => ({
            id: `song-${i}`,
            title: s.title,
            artist: s.artist,
            album: '',
            cover: s.cover || '',
            duration: '',
            listens: s.listens || 0,
            timeStr: s.timeStr || '0m'
        }));

        const albums = (data.albums || []).map((a: any, i: number) => ({
            id: `album-${i}`,
            title: a.title,
            artist: a.artist,
            cover: a.cover || '',
            year: 2024,
            totalListens: a.totalListens || 0,
            timeStr: a.timeStr || '0m'
        }));

        // Return structure matching the non-RPC path
        return {
            artists: artists,
            songs: songs,
            albums: albums,
            hourlyActivity: [],
            recentPlays: []
        };
    }

    // 1. Fetch all data in a single optimized query
    const { data: historyData, error: historyError } = await supabase
        .from('listening_history')
        .select('track_name, artist_name, album_name, album_cover, duration_ms, played_at')
        .gte('played_at', startDate.toISOString())
        .order('played_at', { ascending: false });

    if (historyError) {
        console.error("[dbService] ❌ Query Error:", historyError);
        return { artists: [], songs: [], albums: [], hourlyActivity: [], recentPlays: [] };
    }

    const allData = historyData || [];

    // Use Maps for O(1) lookups - much faster than objects for large datasets
    const artistCounts = new Map<string, { count: number, time: number, image: string }>();
    const songCounts = new Map<string, { count: number, artist: string, cover: string, duration: number, totalTime: number }>();
    const albumStats = new Map<string, { count: number, duration: number, artist: string, cover: string }>();

    // Single pass through data to compute all stats
    for (const item of allData) {
        const durationMs = item.duration_ms || 0;
        const isValidPlay = durationMs > 30000; // Only count as play if > 30s

        // Artist stats
        if (item.artist_name) {
            if (!artistCounts.has(item.artist_name)) {
                artistCounts.set(item.artist_name, { count: 0, time: 0, image: item.album_cover || '' });
            }
            const artist = artistCounts.get(item.artist_name)!;
            if (isValidPlay) artist.count++;
            artist.time += durationMs;
            if (!artist.image && item.album_cover) artist.image = item.album_cover;
        }

        // Song stats
        if (item.track_name && item.artist_name) {
            const songKey = `${item.track_name}||${item.artist_name}`;
            if (!songCounts.has(songKey)) {
                songCounts.set(songKey, { count: 0, artist: item.artist_name, cover: item.album_cover || '', duration: durationMs, totalTime: 0 });
            }
            const song = songCounts.get(songKey)!;
            if (isValidPlay) song.count++;
            song.totalTime += durationMs;
            if (!song.cover && item.album_cover) song.cover = item.album_cover;
        }

        // Album stats
        if (item.album_name && item.album_name !== 'Unknown Album' && item.artist_name) {
            const albumKey = `${item.album_name}||${item.artist_name}`;
            if (!albumStats.has(albumKey)) {
                albumStats.set(albumKey, { count: 0, duration: 0, artist: item.artist_name, cover: item.album_cover || '' });
            }
            const album = albumStats.get(albumKey)!;
            if (isValidPlay) album.count++;
            album.duration += durationMs;
            if (!album.cover && item.album_cover) album.cover = item.album_cover;
        }
    }

    // Convert Maps to sorted arrays
    const topArtists = Array.from(artistCounts.entries())
        .sort(([, a], [, b]) => b.time - a.time)
        .slice(0, 100)
        .map(([name, info], index) => ({
            id: `artist-${index}`,
            name,
            image: info.image,
            totalListens: info.count,
            timeStr: `${Math.floor(info.time / 60000)}m`,
            trend: 0
        }));

    const topSongs = Array.from(songCounts.entries())
        .sort(([, a], [, b]) => b.totalTime - a.totalTime)
        .slice(0, 100)
        .map(([key, info], index) => ({
            id: `song-${index}`,
            title: key.split('||')[0],
            artist: info.artist,
            album: '',
            cover: info.cover,
            duration: msToTime(info.duration),
            listens: info.count,
            timeStr: `${Math.floor(info.totalTime / 60000)}m`
        }));

    const topAlbums = Array.from(albumStats.entries())
        .sort(([, a], [, b]) => b.duration - a.duration)
        .slice(0, 100)
        .map(([key, info], index) => ({
            id: `album-${index}`,
            title: key.split('||')[0],
            artist: info.artist,
            cover: info.cover,
            year: 2024,
            totalListens: info.count,
            timeStr: `${Math.floor(info.duration / 60000)}m`
        }));

    // 4. Hourly Activity Graph (Today) - Use data we already have if today
    const today = new Date().toISOString().split('T')[0];

    // Helper for American Time
    const formatTo12Hour = (hour: number) => {
        const h = hour % 12 || 12;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        return `${h} ${ampm}`;
    };

    // Bucket by hour (00 to 23) - reuse allData if it contains today
    const hourlyMap: Record<number, { min: number, count: number, songs: any[] }> = {};
    for (let i = 0; i < 24; i++) hourlyMap[i] = { min: 0, count: 0, songs: [] };

    // Filter today's data from allData or fetch separately if needed
    const todayData = allData.filter(item => item.played_at?.startsWith(today));

    for (const item of todayData) {
        const date = new Date(item.played_at);
        const hour = date.getHours();

        hourlyMap[hour].min += ((item.duration_ms || 0) / 60000);
        hourlyMap[hour].count += 1;
        hourlyMap[hour].songs.push(item);
    }

    const hourlyActivity = Object.entries(hourlyMap).map(([h, data]) => {
        const hour = parseInt(h);
        // Optimize: use Map for counting instead of filter
        let topSong: any = null;
        if (data.songs.length > 0) {
            const songCountMap = new Map<string, { count: number, song: any }>();
            for (const s of data.songs) {
                const key = s.track_name;
                if (!songCountMap.has(key)) {
                    songCountMap.set(key, { count: 0, song: s });
                }
                songCountMap.get(key)!.count++;
            }
            let maxCount = 0;
            songCountMap.forEach(({ count, song }) => {
                if (count > maxCount) {
                    maxCount = count;
                    topSong = song;
                }
            });
        }

        return {
            time: formatTo12Hour(hour),
            hourNum: hour,
            value: Math.round(data.min),
            count: data.count,
            song: topSong?.track_name || 'No activity',
            artist: topSong?.artist_name || '---',
            cover: topSong?.album_cover || 'https://ui-avatars.com/api/?background=2C2C2E&color=8E8E93&name=?'
        };
    });

    // 5. Recent Plays - Use allData instead of separate query (already sorted desc)
    const recentPlays = allData.slice(0, 2000).map((item: any) => ({
        ...item,
        cover: item.album_cover
    })) || [];

    const elapsed = Math.round(performance.now() - functionStart);
    console.log(`[dbService] ✅ ${timeRange} stats computed in ${elapsed}ms`);
    console.log(`   → ${topArtists.length} artists, ${topSongs.length} songs, ${topAlbums.length} albums`);

    return {
        artists: topArtists,
        songs: topSongs,
        albums: topAlbums,
        hourlyActivity,
        recentPlays
    };
};

const msToTime = (duration: number) => {
    const minutes = Math.floor(duration / 60000);
    const seconds = ((duration % 60000) / 1000).toFixed(0);
    return minutes + ":" + (parseInt(seconds) < 10 ? '0' : '') + seconds;
};

// Helper to get day of week (0-6)
const getDayOfWeek = (i: number) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days[i % 7];
};

interface AIFilter {
    type?: 'song' | 'album' | 'artist';
    field?: 'artist_name' | 'album_name' | 'track_name';
    value?: string;
    contains?: string;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'latenight';
    dayOfWeek?: 'weekday' | 'weekend';
    recentDays?: number;
    minDurationMs?: number;
    maxDurationMs?: number;
    sortBy?: 'plays' | 'minutes' | 'recency' | 'duration';
    sortOrder?: 'highest' | 'lowest';
    minPlays?: number;
    limit?: number;
}

const TIME_RANGES: Record<string, [number, number]> = {
    morning: [5, 11],
    afternoon: [12, 16],
    evening: [17, 20],
    night: [21, 23],
    latenight: [0, 4]
};

export const fetchSmartPlaylist = async (concept: { filter: AIFilter }) => {
    try {
        const filter = concept.filter;
        const resultLimit = filter.limit || 20;
        const type = filter.type || 'song';

        // Start with base query - get more data for better filtering
        let query = supabase
            .from('listening_history')
            .select('*')
            .order('played_at', { ascending: false })
            .limit(5000);

        // Apply exact field filter at DB level
        if (filter.field && filter.value) {
            query = query.ilike(filter.field, `%${filter.value}%`);
        }

        // Apply contains filter (partial match across multiple fields)
        if (filter.contains) {
            query = query.or(`track_name.ilike.%${filter.contains}%,album_name.ilike.%${filter.contains}%,artist_name.ilike.%${filter.contains}%`);
        }

        // Apply recent days filter at DB level
        if (filter.recentDays) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - filter.recentDays);
            query = query.gte('played_at', cutoff.toISOString());
        }

        const { data, error } = await query;
        if (error || !data || data.length === 0) {
            console.error("Smart Playlist Fetch Error:", error);
            return [];
        }

        let filtered = data;

        // Apply time of day filter (client-side for timezone accuracy)
        if (filter.timeOfDay && TIME_RANGES[filter.timeOfDay]) {
            const [start, end] = TIME_RANGES[filter.timeOfDay];
            filtered = filtered.filter(item => {
                const h = new Date(item.played_at).getHours();
                if (start <= end) {
                    return h >= start && h <= end;
                } else {
                    return h >= start || h <= end;
                }
            });
        }

        // Apply day of week filter
        if (filter.dayOfWeek) {
            const isWeekend = filter.dayOfWeek === 'weekend';
            filtered = filtered.filter(item => {
                const day = new Date(item.played_at).getDay();
                const itemIsWeekend = day === 0 || day === 6;
                return isWeekend ? itemIsWeekend : !itemIsWeekend;
            });
        }

        // Apply duration filters
        if (filter.minDurationMs) {
            filtered = filtered.filter(item => (item.duration_ms || 0) >= filter.minDurationMs!);
        }
        if (filter.maxDurationMs) {
            filtered = filtered.filter(item => (item.duration_ms || 0) <= filter.maxDurationMs!);
        }

        // Aggregate by result type
        const stats: Record<string, {
            id: string;
            title: string;
            artist: string;
            album: string;
            cover: string;
            plays: number;
            totalMs: number;
            lastPlayed: Date;
            type: 'song' | 'album' | 'artist';
        }> = {};

        filtered.forEach((item: any) => {
            let key = '';
            let title = '';
            let cover = item.album_cover || '';
            const artist = item.artist_name || 'Unknown';
            const album = item.album_name || '';

            if (type === 'artist') {
                key = artist;
                title = artist;
                // Artist image not available in listening_history, handled in frontend or separate fetch
                cover = '';
            } else if (type === 'album') {
                key = `${album}|||${artist}`;
                title = album;
                cover = item.album_cover;
            } else {
                // Song
                key = `${item.track_name}|||${item.artist_name}`;
                title = item.track_name;
            }

            if (!stats[key]) {
                stats[key] = {
                    id: item.spotify_id, // For song/album links?
                    title: title,
                    artist: artist,
                    album: album,
                    cover: cover,
                    plays: 0,
                    totalMs: 0,
                    lastPlayed: new Date(item.played_at),
                    type: type
                };
            }
            stats[key].plays += 1;
            stats[key].totalMs += item.duration_ms || 0;
            const itemDate = new Date(item.played_at);
            if (itemDate > stats[key].lastPlayed) {
                stats[key].lastPlayed = itemDate;
                // Update cover to latest
                if (type !== 'artist' && item.album_cover) {
                    stats[key].cover = item.album_cover;
                }
            }
        });

        // Convert to array
        let results = Object.values(stats);

        // Apply minPlays filter
        if (filter.minPlays) {
            results = results.filter(r => r.plays >= filter.minPlays!);
        }

        // Sort
        const ascending = filter.sortOrder === 'lowest';
        const sortField = filter.sortBy || 'plays';

        if (sortField === 'minutes') {
            results.sort((a, b) => ascending ? a.totalMs - b.totalMs : b.totalMs - a.totalMs);
        } else if (sortField === 'duration') {
            results.sort((a, b) => {
                const avgA = a.plays > 0 ? a.totalMs / a.plays : 0;
                const avgB = b.plays > 0 ? b.totalMs / b.plays : 0;
                return ascending ? avgA - avgB : avgB - avgA;
            });
        } else if (sortField === 'recency') {
            results.sort((a, b) => ascending
                ? a.lastPlayed.getTime() - b.lastPlayed.getTime()
                : b.lastPlayed.getTime() - a.lastPlayed.getTime());
        } else {
            results.sort((a, b) => ascending ? a.plays - b.plays : b.plays - a.plays);
        }

        // Map to output format
        return results.slice(0, resultLimit).map(item => ({
            id: item.id,
            title: item.title,
            artist: item.artist,
            album: item.album,
            cover: item.cover,
            listens: item.plays,
            timeStr: `${Math.round(item.totalMs / 60000)}m`,
            totalMinutes: Math.round(item.totalMs / 60000),
            totalMs: item.totalMs,
            avgDurationMs: item.plays > 0 ? Math.round(item.totalMs / item.plays) : 0,
            lastPlayed: item.lastPlayed.toISOString(),
            type: item.type
        }));

    } catch (e) {
        console.error("Smart Fetch Exception:", e);
        return [];
    }
};

/**
 * FETCH ARTIST NETWORK (For Graph View)
 * Calculates co-occurrence of artists in the same listening session (within 5 mins)
 */
export const fetchArtistNetwork = async (limit = 1000) => {
    const { data, error } = await supabase
        .from('listening_history')
        .select('artist_name, played_at, album_cover')
        .order('played_at', { ascending: false })
        .limit(limit);

    if (error || !data) return { artistInfo: {}, pairs: {} };

    const pairs: Record<string, Record<string, number>> = {};
    const artistInfo: Record<string, { id: string, name: string, image: string, count: number }> = {};

    // First pass: gather info
    data.forEach(item => {
        if (!artistInfo[item.artist_name]) {
            artistInfo[item.artist_name] = {
                id: item.artist_name,
                name: item.artist_name,
                image: item.album_cover,
                count: 0
            };
        }
        artistInfo[item.artist_name].count++;
    });

    // Second pass: find pairs (simple sliding window)
    for (let i = 0; i < data.length - 1; i++) {
        const itemA = data[i];
        const timeA = new Date(itemA.played_at).getTime();

        // Check next few items for proximity
        for (let j = i + 1; j < Math.min(i + 15, data.length); j++) {
            const itemB = data[j];
            const timeB = new Date(itemB.played_at).getTime();

            // Played within 10 mins of each other?
            if (Math.abs(timeA - timeB) < 10 * 60 * 1000 && itemA.artist_name !== itemB.artist_name) {
                const a = itemA.artist_name;
                const b = itemB.artist_name;

                if (!pairs[a]) pairs[a] = {};
                pairs[a][b] = (pairs[a][b] || 0) + 1;

                if (!pairs[b]) pairs[b] = {};
                pairs[b][a] = (pairs[b][a] || 0) + 1;
            }
        }
    }

    return { artistInfo, pairs };
};

// --- Extended History Migration Types & Logic ---

export interface SpotifyHistoryItem {
    ts: string;
    username: string;
    platform: string;
    ms_played: number;
    conn_country: string;
    ip_addr_decrypted?: string;
    ip_addr?: string;
    user_agent_decrypted?: string;
    master_metadata_track_name: string | null;
    master_metadata_album_artist_name: string | null;
    master_metadata_album_album_name: string | null;
    spotify_track_uri: string | null;
    episode_name: string | null;
    episode_show_name: string | null;
    spotify_episode_uri: string | null;
    reason_start: string;
    reason_end: string;
    shuffle: boolean | null;
    skipped: boolean | null;
    offline: boolean | null;
    offline_timestamp: number | null;
    incognito_mode: boolean | null;
    [key: string]: any;
}

export const uploadExtendedHistory = async (
    jsonData: SpotifyHistoryItem[],
    onProgress: (percent: number) => void
): Promise<{ success: boolean; message: string }> => {
    const CHUNK_SIZE = 500;
    const total = jsonData.length;
    let processed = 0;

    // Helper to map JSON to our DB Schema (extended_streaming_history matching listening_history)
    const mapToDbSchema = (item: any): any => {
        // Skip items with no track name (podcasts usually, or errors) if you only want music
        if (!item.master_metadata_track_name) return null;

        return {
            played_at: item.ts,
            track_name: item.master_metadata_track_name,
            artist_name: item.master_metadata_album_artist_name || 'Unknown Artist',
            album_name: item.master_metadata_album_album_name || 'Unknown Album',
            spotify_id: item.spotify_track_uri || item.spotify_episode_uri || 'unknown',
            duration_ms: item.ms_played,
            album_cover: null, // Will be backfilled after upload
            user_timezone: 'UTC',

            // Optional extras
            platform: item.platform,
            conn_country: item.conn_country,
            ip_addr_decrypted: item.ip_addr_decrypted || item.ip_addr,
            reason_start: item.reason_start,
            reason_end: item.reason_end,
            shuffle: item.shuffle,
            skipped: item.skipped
        };
    };

    try {
        console.log('[uploadExtendedHistory] Starting upload of', total, 'records');

        for (let i = 0; i < total; i += CHUNK_SIZE) {
            const rawChunk = jsonData.slice(i, i + CHUNK_SIZE);
            // Map and filter out nulls (podcasts/bad data)
            const chunk = rawChunk.map(mapToDbSchema).filter(x => x !== null);

            if (chunk.length === 0) {
                processed += rawChunk.length;
                continue;
            }

            const { error } = await supabase
                .from('extended_streaming_history')
                .upsert(chunk, { onConflict: 'played_at, track_name', ignoreDuplicates: true });

            if (error) {
                console.error('Error uploading chunk:', error);
                return { success: false, message: `Upload failed at index ${i}: ${error.message}` };
            }

            processed += rawChunk.length;
            const percent = Math.min(Math.round((processed / total) * 100), 100);
            onProgress(percent);
        }

        console.log('[uploadExtendedHistory] Upload complete, starting image backfill...');
        return { success: true, message: 'Upload complete - backfilling images...' };
    } catch (err: any) {
        return { success: false, message: err.message };
    }
};

// Backfill images for extended_streaming_history after upload
// Uses server-side RPC functions for reliable updates
export const backfillExtendedHistoryImages = async (
    token: string,
    onProgress: (status: string) => void
): Promise<{ success: boolean; message: string }> => {
    try {
        console.log('[backfillImages] 🎨 Starting image backfill process...');
        onProgress('🔍 Checking current status...');

        // STEP 0: Check how many need covers
        const { data: statusBefore, error: statusError } = await supabase.rpc('count_null_covers');
        if (statusError) {
            console.error('[backfillImages] ❌ count_null_covers not found. Run supabase_backfill_covers.sql first!');
            return { success: false, message: 'Please run supabase_backfill_covers.sql in Supabase SQL Editor first!' };
        }

        console.log('[backfillImages] 📊 Status before:', statusBefore);
        onProgress(`📊 ${statusBefore.null_covers} records need covers (${statusBefore.percent_complete}% complete)`);

        if (statusBefore.null_covers === 0) {
            onProgress('✅ All records already have covers!');
            return { success: true, message: 'All records already have covers!' };
        }

        // STEP 1: Borrow from listening_history (server-side)
        onProgress('📚 Step 1: Copying covers from listening_history...');
        console.log('[backfillImages] 📚 Calling backfill_covers_from_history RPC...');

        const { data: borrowResult, error: borrowError } = await supabase.rpc('backfill_covers_from_history');

        if (borrowError) {
            console.error('[backfillImages] ❌ Borrow error:', borrowError);
        } else {
            console.log('[backfillImages] 📚 Borrow result:', borrowResult);
            onProgress(`📚 Borrowed ${borrowResult.total_updated} covers from listening_history`);
        }

        // STEP 2: Get albums still needing covers (NOW INCLUDES RECORD IDS)
        onProgress('🎵 Step 2: Finding albums that still need covers...');
        console.log('[backfillImages] 🎵 Calling get_albums_needing_covers RPC...');

        const { data: albumsNeeded, error: albumsError } = await supabase.rpc('get_albums_needing_covers', { max_results: 2000 });

        if (albumsError) {
            console.error('[backfillImages] ❌ Albums error:', albumsError);
            return { success: false, message: 'Failed to get albums: ' + albumsError.message };
        }

        console.log(`[backfillImages] 🎵 ${albumsNeeded?.length || 0} unique albums still need covers`);
        console.log('[backfillImages] 🎵 Sample album:', albumsNeeded?.[0]);

        if (!albumsNeeded || albumsNeeded.length === 0) {
            const msg = `✅ Done! Borrowed ${borrowResult?.total_updated || 0} covers from history`;
            onProgress(msg);
            return { success: true, message: msg };
        }

        onProgress(`🌐 Step 3: Fetching ${albumsNeeded.length} albums from Spotify...`);

        // STEP 3: Fetch album covers from Spotify AND update immediately
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
        const chunkSize = 5;
        let fetched = 0;
        let found = 0;
        let totalUpdated = 0;

        for (let i = 0; i < albumsNeeded.length; i += chunkSize) {
            const chunk = albumsNeeded.slice(i, i + chunkSize);

            // Fetch covers for this chunk
            const coversToUpdate: { ids: number[]; cover: string }[] = [];

            await Promise.all(chunk.map(async (item: { album_name: string; artist_name: string; sample_ids: number[] }) => {
                try {
                    await delay(Math.random() * 100 + 50);

                    // Search for album by name + artist
                    const query = encodeURIComponent(`album:${item.album_name} artist:${item.artist_name}`);
                    const res = await fetch(`https://api.spotify.com/v1/search?q=${query}&type=album&limit=1`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    fetched++;

                    if (res.status === 429) {
                        console.warn('[backfillImages] ⚠️ Rate limit hit');
                        return;
                    }

                    if (!res.ok) return;

                    const data = await res.json();
                    const albumData = data.albums?.items[0];
                    if (albumData?.images?.[0]?.url && item.sample_ids?.length > 0) {
                        coversToUpdate.push({
                            ids: item.sample_ids,
                            cover: albumData.images[0].url
                        });
                        found++;
                    }
                } catch (e) {
                    console.error(`[backfillImages] ❌ Error fetching "${item.album_name}":`, e);
                }
            }));

            // Update this batch immediately using direct ID update
            for (const item of coversToUpdate) {
                const { data: updated, error } = await supabase.rpc('update_covers_direct', {
                    record_ids: item.ids,
                    cover_url: item.cover
                });

                if (!error && updated) {
                    totalUpdated += updated;
                    console.log(`[backfillImages] ✓ Updated ${updated} records`);
                } else if (error) {
                    console.error('[backfillImages] ❌ Update error:', error);
                }
            }

            const percent = Math.round(((i + chunk.length) / albumsNeeded.length) * 100);
            console.log(`[backfillImages] 🌐 ${percent}% - Fetched ${fetched}, found ${found}, updated ${totalUpdated}`);
            onProgress(`🌐 ${percent}% (found ${found}, saved ${totalUpdated} records)`);

            if (i + chunkSize < albumsNeeded.length) await delay(300);
        }

        console.log(`[backfillImages] 📥 Total: fetched ${fetched}, found ${found}, updated ${totalUpdated}`);

        // STEP 4: Check final status
        const { data: statusAfter } = await supabase.rpc('count_null_covers');
        console.log('[backfillImages] 📊 Status after:', statusAfter);

        const finalMessage = `✅ Done! Borrowed ${borrowResult?.total_updated || 0} + Spotify ${totalUpdated} = ${statusAfter?.percent_complete || 0}% complete`;
        console.log(`[backfillImages] 🎉 ${finalMessage}`);
        onProgress(finalMessage);

        return { success: true, message: finalMessage };

    } catch (err: any) {
        console.error('[backfillImages] ❌ Error:', err);
        onProgress(`❌ Error: ${err.message}`);
        return { success: false, message: err.message };
    }
};

// FIXED: Fetch ALL history for heatmap (lightweight: just dates and duration)
export const fetchHeatmapData = async () => {
    // console.log("[dbService] Fetching full heat map data");
    // We only need played_at and duration_ms to build the grid
    const { data, error } = await supabase
        .from('listening_history')
        .select('played_at, duration_ms, track_name, artist_name, album_cover')
        .order('played_at', { ascending: false }); // Newest first

    if (error) {
        console.error("Heatmap Fetch Error:", error);
        return [];
    }
    return data || [];
};

// WRAPPED GENERATOR (Local Data Aggregation)
export const getWrappedStats = async (period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    const now = new Date();
    let startDate: Date;
    let label = '';

    if (period === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0); // Today 12AM
        label = "Today's Wrapped";
    } else if (period === 'weekly') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
        startDate = new Date(now.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        label = "This Week's Wrapped";
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); // 1st of Month
        label = "Monthly Wrapped";
    }

    const { data: rawData, error } = await supabase
        .from('listening_history')
        .select('*')
        .gte('played_at', startDate.toISOString());

    if (error || !rawData || rawData.length === 0) {
        return null; // No data
    }

    const totalMs = rawData.reduce((acc, curr) => acc + (curr.duration_ms || 0), 0);
    const totalMinutes = Math.floor(totalMs / 60000);

    // Top Artist
    const artists: Record<string, { count: number, image: string }> = {};
    const songs: Record<string, { count: number, cover: string, artist: string }> = {};
    const albums: Record<string, { count: number, cover: string, artist: string }> = {};

    rawData.forEach(item => {
        // Artist
        if (item.artist_name) {
            if (!artists[item.artist_name]) artists[item.artist_name] = { count: 0, image: item.album_cover || '' };
            artists[item.artist_name].count++;
            if (item.album_cover && !artists[item.artist_name].image) artists[item.artist_name].image = item.album_cover;
        }
        // Song
        if (item.track_name) {
            const key = item.track_name;
            if (!songs[key]) songs[key] = { count: 0, cover: item.album_cover || '', artist: item.artist_name };
            songs[key].count++;
        }
        // Album
        if (item.album_name) {
            const albumKey = item.album_name;
            if (!albums[albumKey]) albums[albumKey] = { count: 0, cover: item.album_cover || '', artist: item.artist_name };
            albums[albumKey].count++;
        }
    });


    const topArtistEntry = Object.entries(artists).sort((a, b) => b[1].count - a[1].count)[0];
    const topSongEntry = Object.entries(songs).sort((a, b) => b[1].count - a[1].count)[0];
    const topAlbumEntry = Object.entries(albums).sort((a, b) => b[1].count - a[1].count)[0];

    // Sort all songs for the "Vibe Check" list
    const topTracks = Object.entries(songs)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 50)
        .map(([key, data]) => ({
            title: key,
            artist: data.artist,
            cover: data.cover,
            plays: data.count,
            type: 'song'
        }));

    // All album covers for grid background
    const albumCovers = [...new Set(rawData.map(item => item.album_cover).filter(Boolean))];

    return {
        type: 'WRAPPED',
        period: period,
        title: label,
        totalMinutes,
        topArtist: topArtistEntry ? { name: topArtistEntry[0], count: topArtistEntry[1].count, image: topArtistEntry[1].image } : null,
        topSong: topSongEntry ? { title: topSongEntry[0], count: topSongEntry[1].count, cover: topSongEntry[1].cover, artist: topSongEntry[1].artist } : null,
        topAlbum: topAlbumEntry ? { title: topAlbumEntry[0], count: topAlbumEntry[1].count, cover: topAlbumEntry[1].cover, artist: topAlbumEntry[1].artist } : null,
        topTracks: topTracks,
        totalTracks: rawData.length,
        albumCovers: albumCovers
    };
}

// Get peak listening hour for wrapped
export const getPeakListeningHour = async (period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    const now = new Date();
    let startDate: Date;

    if (period === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'weekly') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.getFullYear(), now.getMonth(), diff);
        startDate.setHours(0, 0, 0, 0);
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const { data: rawData, error } = await supabase
        .from('listening_history')
        .select('played_at, duration_ms')
        .gte('played_at', startDate.toISOString());

    if (error || !rawData || rawData.length === 0) {
        return { hour: 12, label: 'Afternoon', count: 0 }; // Default fallback
    }

    // Group by hour
    const hourlyMap: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourlyMap[i] = 0;

    rawData.forEach(item => {
        const date = new Date(item.played_at);
        const hour = date.getHours();
        hourlyMap[hour]++;
    });

    // Find peak hour
    let peakHour = 0;
    let maxCount = 0;
    Object.entries(hourlyMap).forEach(([h, count]) => {
        if (count > maxCount) {
            maxCount = count;
            peakHour = parseInt(h);
        }
    });

    // Label the time of day
    let label = 'Morning';
    if (peakHour >= 6 && peakHour < 12) label = 'Morning';
    else if (peakHour >= 12 && peakHour < 17) label = 'Afternoon';
    else if (peakHour >= 17 && peakHour < 21) label = 'Evening';
    else label = 'Night';

    return { hour: peakHour, label, count: maxCount };
}

// Get radar artists (artists that are new to user's top list)
export const getRadarArtists = async (period: 'daily' | 'weekly' | 'monthly' = 'daily') => {
    const now = new Date();
    let startDate: Date;

    if (period === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'weekly') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.getFullYear(), now.getMonth(), diff);
        startDate.setHours(0, 0, 0, 0);
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get previous period start
    const previousStart = new Date(startDate);
    if (period === 'daily') {
        previousStart.setDate(previousStart.getDate() - 1);
    } else if (period === 'weekly') {
        previousStart.setDate(previousStart.getDate() - 7);
    } else {
        previousStart.setMonth(previousStart.getMonth() - 1);
    }

    // Get current period artists
    const { data: currentData } = await supabase
        .from('listening_history')
        .select('artist_name, album_cover')
        .gte('played_at', startDate.toISOString());

    // Get previous period artists
    const { data: previousData } = await supabase
        .from('listening_history')
        .select('artist_name')
        .gte('played_at', previousStart.toISOString())
        .lt('played_at', startDate.toISOString());

    if (!currentData || currentData.length === 0) {
        return [];
    }

    // Count current artists
    const currentArtists: Record<string, { count: number, image: string }> = {};
    currentData.forEach(item => {
        if (item.artist_name) {
            if (!currentArtists[item.artist_name]) {
                currentArtists[item.artist_name] = { count: 0, image: item.album_cover || '' };
            }
            currentArtists[item.artist_name].count++;
        }
    });

    // Get previous period artist set
    const previousArtistSet = new Set(previousData?.map(d => d.artist_name) || []);

    // Find new artists (in current but not in previous, or with significant increase)
    const radarArtists = Object.entries(currentArtists)
        .filter(([name, _]) => !previousArtistSet.has(name))
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6)
        .map(([name, data]) => ({
            name,
            image: data.image,
            plays: data.count
        }));

    return radarArtists;
}

// Get the most skipped song (shortest average listen ratio relative to track duration)
export const getMostSkippedSong = async (period: 'daily' | 'weekly' | 'monthly' = 'weekly') => {
    const now = new Date();
    let startDate: Date;

    if (period === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'weekly') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.getFullYear(), now.getMonth(), diff);
        startDate.setHours(0, 0, 0, 0);
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const { data, error } = await supabase
        .from('listening_history')
        .select('track_name, artist_name, album_cover, duration_ms')
        .gte('played_at', startDate.toISOString());

    if (error || !data || data.length === 0) return null;

    // Group by song and find ones with many short plays (skips)
    const songMap: Record<string, { totalDuration: number; count: number; artist: string; cover: string }> = {};
    data.forEach(item => {
        if (!item.track_name) return;
        const key = item.track_name;
        if (!songMap[key]) songMap[key] = { totalDuration: 0, count: 0, artist: item.artist_name, cover: item.album_cover || '' };
        songMap[key].totalDuration += item.duration_ms || 0;
        songMap[key].count++;
    });

    // Find song with lowest average duration that was played more than once (indicates skipping)
    const candidates = Object.entries(songMap)
        .filter(([_, d]) => d.count >= 2)
        .map(([name, d]) => ({
            title: name,
            artist: d.artist,
            cover: d.cover,
            avgDuration: d.totalDuration / d.count,
            plays: d.count
        }))
        .sort((a, b) => a.avgDuration - b.avgDuration);

    return candidates[0] || null;
};

// Get late night anthem (most played song after 1 AM)
export const getLateNightAnthem = async (period: 'daily' | 'weekly' | 'monthly' = 'weekly') => {
    const now = new Date();
    let startDate: Date;

    if (period === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'weekly') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.getFullYear(), now.getMonth(), diff);
        startDate.setHours(0, 0, 0, 0);
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const { data, error } = await supabase
        .from('listening_history')
        .select('track_name, artist_name, album_cover, played_at')
        .gte('played_at', startDate.toISOString());

    if (error || !data || data.length === 0) return null;

    // Filter to late night plays (1 AM - 5 AM)
    const lateNightPlays = data.filter(item => {
        const hour = new Date(item.played_at).getHours();
        return hour >= 1 && hour < 5;
    });

    if (lateNightPlays.length === 0) return null;

    const songMap: Record<string, { count: number; artist: string; cover: string }> = {};
    lateNightPlays.forEach(item => {
        if (!item.track_name) return;
        if (!songMap[item.track_name]) songMap[item.track_name] = { count: 0, artist: item.artist_name, cover: item.album_cover || '' };
        songMap[item.track_name].count++;
    });

    const topEntry = Object.entries(songMap).sort((a, b) => b[1].count - a[1].count)[0];
    if (!topEntry) return null;

    return {
        title: topEntry[0],
        artist: topEntry[1].artist,
        cover: topEntry[1].cover,
        plays: topEntry[1].count
    };
};

// Get rising star artist (most growth in recent period)
export const getRisingStar = async (period: 'daily' | 'weekly' | 'monthly' = 'weekly') => {
    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;

    if (period === 'daily') {
        currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 1);
    } else if (period === 'weekly') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        currentStart = new Date(now.getFullYear(), now.getMonth(), diff);
        currentStart.setHours(0, 0, 0, 0);
        previousStart = new Date(currentStart);
        previousStart.setDate(previousStart.getDate() - 7);
    } else {
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    const { data: currentData } = await supabase
        .from('listening_history')
        .select('artist_name, album_cover')
        .gte('played_at', currentStart.toISOString());

    const { data: previousData } = await supabase
        .from('listening_history')
        .select('artist_name, album_cover')
        .gte('played_at', previousStart.toISOString())
        .lt('played_at', currentStart.toISOString());

    if (!currentData || currentData.length === 0) return null;

    const currentCounts: Record<string, { count: number; image: string }> = {};
    currentData.forEach(item => {
        if (!item.artist_name) return;
        if (!currentCounts[item.artist_name]) currentCounts[item.artist_name] = { count: 0, image: item.album_cover || '' };
        currentCounts[item.artist_name].count++;
    });

    const previousCounts: Record<string, number> = {};
    (previousData || []).forEach(item => {
        if (!item.artist_name) return;
        previousCounts[item.artist_name] = (previousCounts[item.artist_name] || 0) + 1;
    });

    // Find artist with biggest growth
    const growth = Object.entries(currentCounts)
        .map(([name, data]) => ({
            name,
            image: data.image,
            currentPlays: data.count,
            previousPlays: previousCounts[name] || 0,
            increase: data.count - (previousCounts[name] || 0)
        }))
        .filter(a => a.increase > 0)
        .sort((a, b) => b.increase - a.increase);

    return growth[0] || null;
};

// Get obsession artist (artist where one song dominates their streams)
export const getObsessionArtist = async (period: 'daily' | 'weekly' | 'monthly' = 'weekly') => {
    const now = new Date();
    let startDate: Date;

    if (period === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (period === 'weekly') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        startDate = new Date(now.getFullYear(), now.getMonth(), diff);
        startDate.setHours(0, 0, 0, 0);
    } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const { data, error } = await supabase
        .from('listening_history')
        .select('track_name, artist_name, album_cover')
        .gte('played_at', startDate.toISOString());

    if (error || !data || data.length === 0) return null;

    // Group plays by artist, and within each artist by song
    const artistSongs: Record<string, { total: number; image: string; songs: Record<string, number> }> = {};
    data.forEach(item => {
        if (!item.artist_name || !item.track_name) return;
        if (!artistSongs[item.artist_name]) {
            artistSongs[item.artist_name] = { total: 0, image: item.album_cover || '', songs: {} };
        }
        artistSongs[item.artist_name].total++;
        artistSongs[item.artist_name].songs[item.track_name] = (artistSongs[item.artist_name].songs[item.track_name] || 0) + 1;
    });

    // Find artist where one song has highest percentage of total plays (min 3 total plays)
    let bestArtist = null;
    let bestPercentage = 0;

    for (const [artistName, data] of Object.entries(artistSongs)) {
        if (data.total < 3) continue;
        const topSongEntry = Object.entries(data.songs).sort((a, b) => b[1] - a[1])[0];
        if (!topSongEntry) continue;
        const percentage = (topSongEntry[1] / data.total) * 100;
        if (percentage > bestPercentage && percentage >= 50) {
            bestPercentage = percentage;
            bestArtist = {
                artist: artistName,
                image: data.image,
                topSong: topSongEntry[0],
                percentage: Math.round(percentage),
                totalPlays: data.total
            };
        }
    }

    return bestArtist;
};
