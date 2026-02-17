
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

export const fetchDashboardStats = async (timeRange: 'Daily' | 'Weekly' | 'Monthly' | 'All Time' | 'Custom' = 'Weekly', customRange?: { start: string; end: string }) => {
    console.log(`[dbService] 📊 fetchDashboardStats called with timeRange: ${timeRange}`, customRange);
    const functionStart = performance.now();

    // Calculate date range based on timeRange selection
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    if (timeRange === 'Custom' && customRange) {
        // Use custom date range
        startDate = new Date(customRange.start);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customRange.end);
        endDate.setHours(23, 59, 59, 999);
    } else if (timeRange === 'Daily') {
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
    const query = supabase
        .from('listening_history')
        .select('track_name, artist_name, album_name, album_cover, duration_ms, played_at')
        .gte('played_at', startDate.toISOString())
        .order('played_at', { ascending: false });
    
    // Add end date filter if we have a custom range or not fetching all time
    if (timeRange !== 'All Time') {
        query.lte('played_at', endDate.toISOString());
    }
    
    const { data: historyData, error: historyError } = await query;

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

// ─── COMPARATIVE & GROWTH TOOLS ─────────────────────────────────────

// Compare artist performance across two periods
export const compareArtistPerformance = async (
    artistName: string,
    periodA: string,
    periodB: string
): Promise<{ total_plays: [number, number]; minutes: [number, number]; delta_percent: number } | null> => {
    const getPeriodDates = (period: string): { start: Date; end: Date } => {
        const now = new Date();
        const periodLower = period.toLowerCase();
        
        if (periodLower.includes('last week')) {
            const end = new Date(now);
            end.setDate(end.getDate() - end.getDay());
            end.setHours(0, 0, 0, 0);
            const start = new Date(end);
            start.setDate(start.getDate() - 7);
            return { start, end };
        } else if (periodLower.includes('this week')) {
            const start = new Date(now);
            start.setDate(start.getDate() - start.getDay());
            start.setHours(0, 0, 0, 0);
            return { start, end: now };
        } else if (periodLower.includes('last month')) {
            const end = new Date(now.getFullYear(), now.getMonth(), 1);
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return { start, end };
        } else if (periodLower.includes('this month')) {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            return { start, end: now };
        }
        
        // Default: last 7 days for periodA, current 7 days for periodB
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        return { start, end: now };
    };

    try {
        const datesA = getPeriodDates(periodA);
        const datesB = getPeriodDates(periodB);

        // Fetch period A
        const { data: dataA } = await supabase
            .from('listening_history')
            .select('duration_ms')
            .ilike('artist_name', `%${artistName}%`)
            .gte('played_at', datesA.start.toISOString())
            .lt('played_at', datesA.end.toISOString());

        // Fetch period B
        const { data: dataB } = await supabase
            .from('listening_history')
            .select('duration_ms')
            .ilike('artist_name', `%${artistName}%`)
            .gte('played_at', datesB.start.toISOString())
            .lt('played_at', datesB.end.toISOString());

        const playsA = dataA?.length || 0;
        const playsB = dataB?.length || 0;
        const minutesA = Math.round((dataA?.reduce((sum, item) => sum + (item.duration_ms || 0), 0) || 0) / 60000);
        const minutesB = Math.round((dataB?.reduce((sum, item) => sum + (item.duration_ms || 0), 0) || 0) / 60000);

        const deltaPercent = playsA > 0 ? Math.round(((playsB - playsA) / playsA) * 100) : (playsB > 0 ? 100 : 0);

        return {
            total_plays: [playsA, playsB],
            minutes: [minutesA, minutesB],
            delta_percent: deltaPercent
        };
    } catch (error) {
        console.error('compareArtistPerformance error:', error);
        return null;
    }
};

// Get rank shift for an entity over time
export const getRankShift = async (
    entityName: string,
    entityType: 'artist' | 'song',
    timeRange: string = 'weekly'
): Promise<{ previous_rank: number; current_rank: number; movement: string } | null> => {
    try {
        const now = new Date();
        
        // Current period
        let currentStart: Date;
        if (timeRange === 'weekly') {
            currentStart = new Date(now);
            currentStart.setDate(currentStart.getDate() - 7);
        } else if (timeRange === 'monthly') {
            currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            currentStart = new Date(now);
            currentStart.setDate(currentStart.getDate() - 1);
        }

        // Previous period
        const previousEnd = new Date(currentStart);
        const previousStart = new Date(currentStart);
        if (timeRange === 'weekly') {
            previousStart.setDate(previousStart.getDate() - 7);
        } else if (timeRange === 'monthly') {
            previousStart.setMonth(previousStart.getMonth() - 1);
        } else {
            previousStart.setDate(previousStart.getDate() - 1);
        }

        // Get current rankings
        const { data: currentData } = await supabase
            .from('listening_history')
            .select(entityType === 'artist' ? 'artist_name' : 'track_name')
            .gte('played_at', currentStart.toISOString())
            .lte('played_at', now.toISOString());

        // Get previous rankings
        const { data: previousData } = await supabase
            .from('listening_history')
            .select(entityType === 'artist' ? 'artist_name' : 'track_name')
            .gte('played_at', previousStart.toISOString())
            .lt('played_at', previousEnd.toISOString());

        const field = entityType === 'artist' ? 'artist_name' : 'track_name';
        
        // Count occurrences for current period
        const currentCounts: Record<string, number> = {};
        currentData?.forEach(item => {
            const name = item[field];
            if (name) currentCounts[name] = (currentCounts[name] || 0) + 1;
        });

        // Count occurrences for previous period
        const previousCounts: Record<string, number> = {};
        previousData?.forEach(item => {
            const name = item[field];
            if (name) previousCounts[name] = (previousCounts[name] || 0) + 1;
        });

        // Sort and rank
        const currentRanking = Object.entries(currentCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name);
        
        const previousRanking = Object.entries(previousCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([name]) => name);

        const currentRank = currentRanking.findIndex(name => 
            name.toLowerCase().includes(entityName.toLowerCase())
        ) + 1;
        
        const previousRank = previousRanking.findIndex(name => 
            name.toLowerCase().includes(entityName.toLowerCase())
        ) + 1;

        if (currentRank === 0) return null;

        const movement = previousRank === 0 ? 'NEW' : 
            previousRank > currentRank ? `+${previousRank - currentRank}` :
            previousRank < currentRank ? `-${currentRank - previousRank}` : '=';

        return {
            previous_rank: previousRank || 0,
            current_rank: currentRank,
            movement
        };
    } catch (error) {
        console.error('getRankShift error:', error);
        return null;
    }
};

// Get loyalty score for an artist within their genre
export const getLoyaltyScore = async (artistName: string): Promise<{ loyalty_ratio: number; status: string } | null> => {
    try {
        // Get all plays for the artist
        const { data: artistPlays } = await supabase
            .from('listening_history')
            .select('*')
            .ilike('artist_name', `%${artistName}%`);

        if (!artistPlays || artistPlays.length === 0) return null;

        // For simplicity, compare to all other artists (genre data would require Spotify API)
        const { data: allPlays } = await supabase
            .from('listening_history')
            .select('artist_name');

        if (!allPlays) return null;

        const totalPlays = allPlays.length;
        const artistPlayCount = artistPlays.length;
        const ratio = totalPlays > 0 ? artistPlayCount / totalPlays : 0;

        let status = 'Casual';
        if (ratio >= 0.5) status = 'Die-hard';
        else if (ratio >= 0.3) status = 'Super Fan';
        else if (ratio >= 0.15) status = 'Big Fan';
        else if (ratio >= 0.05) status = 'Regular';

        return {
            loyalty_ratio: Math.round(ratio * 100) / 100,
            status
        };
    } catch (error) {
        console.error('getLoyaltyScore error:', error);
        return null;
    }
};

// Get market share breakdown
export const getMarketShare = async (entityType: 'artist' | 'genre'): Promise<{ top_entities: Array<{ name: string; share: string }> } | null> => {
    try {
        const field = entityType === 'artist' ? 'artist_name' : 'album_name'; // Using album as genre proxy
        
        const { data } = await supabase
            .from('listening_history')
            .select(field);

        if (!data || data.length === 0) return null;

        const counts: Record<string, number> = {};
        data.forEach(item => {
            const name = item[field];
            if (name) counts[name] = (counts[name] || 0) + 1;
        });

        const totalPlays = data.length;
        const topEntities = Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name, count]) => ({
                name,
                share: `${Math.round((count / totalPlays) * 100)}%`
            }));

        return { top_entities: topEntities };
    } catch (error) {
        console.error('getMarketShare error:', error);
        return null;
    }
};

// ─── BEHAVIORAL & DISCOVERY TOOLS ─────────────────────────────────────

// Get discovery date for an artist
export const getDiscoveryDate = async (artistName: string): Promise<{ first_played: string; first_song: string } | null> => {
    try {
        const { data } = await supabase
            .from('listening_history')
            .select('played_at, track_name')
            .ilike('artist_name', `%${artistName}%`)
            .order('played_at', { ascending: true })
            .limit(1);

        if (!data || data.length === 0) return null;

        return {
            first_played: new Date(data[0].played_at).toLocaleDateString(),
            first_song: data[0].track_name
        };
    } catch (error) {
        console.error('getDiscoveryDate error:', error);
        return null;
    }
};

// Get binge listening sessions
export const getBingeSessions = async (thresholdMinutes: number = 60): Promise<{ sessions: Array<{ date: string; duration: string; artist: string }> } | null> => {
    try {
        const { data } = await supabase
            .from('listening_history')
            .select('played_at, artist_name, duration_ms')
            .order('played_at', { ascending: true });

        if (!data || data.length === 0) return null;

        const sessions: Array<{ date: string; duration: string; artist: string }> = [];
        let currentSession: { artist: string; start: Date; totalMs: number } | null = null;
        const gapThreshold = 30 * 60 * 1000; // 30 minutes gap tolerance

        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            const playTime = new Date(item.played_at);
            
            if (!currentSession || 
                currentSession.artist !== item.artist_name ||
                (playTime.getTime() - (new Date(data[i-1].played_at).getTime() + (data[i-1].duration_ms || 0))) > gapThreshold) {
                
                // Save previous session if it meets threshold
                if (currentSession && currentSession.totalMs >= thresholdMinutes * 60 * 1000) {
                    sessions.push({
                        date: currentSession.start.toLocaleDateString(),
                        duration: `${Math.round(currentSession.totalMs / 60000)}m`,
                        artist: currentSession.artist
                    });
                }
                
                // Start new session
                currentSession = {
                    artist: item.artist_name,
                    start: playTime,
                    totalMs: item.duration_ms || 0
                };
            } else {
                currentSession.totalMs += item.duration_ms || 0;
            }
        }

        // Check last session
        if (currentSession && currentSession.totalMs >= thresholdMinutes * 60 * 1000) {
            sessions.push({
                date: currentSession.start.toLocaleDateString(),
                duration: `${Math.round(currentSession.totalMs / 60000)}m`,
                artist: currentSession.artist
            });
        }

        return { sessions: sessions.slice(0, 10) }; // Return top 10
    } catch (error) {
        console.error('getBingeSessions error:', error);
        return null;
    }
};

// Get one-hit wonders (artists with one dominant song)
export const getOneHitWonders = async (minPlays: number = 5): Promise<{ artists: Array<{ name: string; top_song: string; song_share: string }> } | null> => {
    try {
        const { data } = await supabase
            .from('listening_history')
            .select('artist_name, track_name');

        if (!data || data.length === 0) return null;

        const artistSongs: Record<string, Record<string, number>> = {};
        data.forEach(item => {
            if (!item.artist_name || !item.track_name) return;
            if (!artistSongs[item.artist_name]) {
                artistSongs[item.artist_name] = {};
            }
            artistSongs[item.artist_name][item.track_name] = (artistSongs[item.artist_name][item.track_name] || 0) + 1;
        });

        const oneHitWonders: Array<{ name: string; top_song: string; song_share: string }> = [];

        for (const [artist, songs] of Object.entries(artistSongs)) {
            const totalPlays = Object.values(songs).reduce((sum, count) => sum + count, 0);
            if (totalPlays < minPlays) continue;

            const sortedSongs = Object.entries(songs).sort((a, b) => b[1] - a[1]);
            const topSong = sortedSongs[0];
            const songShare = (topSong[1] / totalPlays) * 100;

            if (songShare >= 80) { // 80%+ of plays on one song
                oneHitWonders.push({
                    name: artist,
                    top_song: topSong[0],
                    song_share: `${Math.round(songShare)}%`
                });
            }
        }

        return { artists: oneHitWonders.slice(0, 10) };
    } catch (error) {
        console.error('getOneHitWonders error:', error);
        return null;
    }
};

// Get album completion stats
export const getAlbumCompletionist = async (albumName: string): Promise<{ tracks_played: number; total_tracks: number; completion: string } | null> => {
    try {
        const { data } = await supabase
            .from('listening_history')
            .select('track_name')
            .ilike('album_name', `%${albumName}%`);

        if (!data || data.length === 0) return null;

        const uniqueTracks = new Set(data.map(item => item.track_name));
        const tracksPlayed = uniqueTracks.size;
        
        // Estimate total tracks (would need Spotify API for exact count)
        // Using a heuristic: assume typical album has 12-15 tracks
        const estimatedTotal = Math.max(tracksPlayed, 12);
        const completion = Math.min(100, Math.round((tracksPlayed / estimatedTotal) * 100));

        return {
            tracks_played: tracksPlayed,
            total_tracks: estimatedTotal,
            completion: `${completion}%`
        };
    } catch (error) {
        console.error('getAlbumCompletionist error:', error);
        return null;
    }
};

// Get earworm report (most looped song)
export const getEarwormReport = async (daysBack: number = 7): Promise<{ song: string; repeat_count: number; max_repeats_in_one_hour: number } | null> => {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);

        const { data } = await supabase
            .from('listening_history')
            .select('track_name, artist_name, played_at')
            .gte('played_at', startDate.toISOString())
            .order('played_at', { ascending: true });

        if (!data || data.length === 0) return null;

        const songCounts: Record<string, number> = {};
        const hourlyRepeats: Record<string, Record<string, number>> = {};

        data.forEach(item => {
            const songKey = `${item.track_name} - ${item.artist_name}`;
            songCounts[songKey] = (songCounts[songKey] || 0) + 1;

            const hour = new Date(item.played_at).toISOString().slice(0, 13);
            if (!hourlyRepeats[songKey]) hourlyRepeats[songKey] = {};
            hourlyRepeats[songKey][hour] = (hourlyRepeats[songKey][hour] || 0) + 1;
        });

        const topSong = Object.entries(songCounts).sort((a, b) => b[1] - a[1])[0];
        if (!topSong) return null;

        const maxHourlyRepeats = Math.max(...Object.values(hourlyRepeats[topSong[0]] || {}));

        return {
            song: topSong[0],
            repeat_count: topSong[1],
            max_repeats_in_one_hour: maxHourlyRepeats || 0
        };
    } catch (error) {
        console.error('getEarwormReport error:', error);
        return null;
    }
};

// ─── TIME & CONTEXTUAL TOOLS ─────────────────────────────────────

// Get work vs play stats (weekday vs weekend)
export const getWorkVsPlayStats = async (): Promise<{ workday_top: string[]; weekend_top: string[] } | null> => {
    try {
        const { data } = await supabase
            .from('listening_history')
            .select('artist_name, played_at');

        if (!data || data.length === 0) return null;

        const weekdayCounts: Record<string, number> = {};
        const weekendCounts: Record<string, number> = {};

        data.forEach(item => {
            const date = new Date(item.played_at);
            const day = date.getDay();
            const isWeekend = day === 0 || day === 6;
            const artist = item.artist_name;

            if (!artist) return;

            if (isWeekend) {
                weekendCounts[artist] = (weekendCounts[artist] || 0) + 1;
            } else {
                weekdayCounts[artist] = (weekdayCounts[artist] || 0) + 1;
            }
        });

        const workdayTop = Object.entries(weekdayCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);

        const weekendTop = Object.entries(weekendCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);

        return { workday_top: workdayTop, weekend_top: weekendTop };
    } catch (error) {
        console.error('getWorkVsPlayStats error:', error);
        return null;
    }
};

// Get seasonal vibe
export const getSeasonalVibe = async (season: 'Summer' | 'Winter' | 'Spring' | 'Fall'): Promise<{ top_genres: string[]; avg_tempo: string } | null> => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        
        let startMonth: number, endMonth: number;
        switch (season) {
            case 'Summer': startMonth = 5; endMonth = 8; break;
            case 'Winter': startMonth = 11; endMonth = 2; break;
            case 'Spring': startMonth = 2; endMonth = 5; break;
            case 'Fall': startMonth = 8; endMonth = 11; break;
        }

        const { data } = await supabase
            .from('listening_history')
            .select('artist_name, album_name');

        if (!data || data.length === 0) return null;

        // Filter by season months
        const seasonalData = data.filter(item => {
            const date = new Date(item.played_at || '');
            const month = date.getMonth();
            if (season === 'Winter') {
                return month === 11 || month === 0 || month === 1;
            }
            return month >= startMonth && month < endMonth;
        });

        // Use albums as genre proxy
        const genreCounts: Record<string, number> = {};
        seasonalData.forEach(item => {
            if (item.album_name) {
                genreCounts[item.album_name] = (genreCounts[item.album_name] || 0) + 1;
            }
        });

        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);

        return {
            top_genres: topGenres,
            avg_tempo: 'Medium' // Would need Spotify audio features
        };
    } catch (error) {
        console.error('getSeasonalVibe error:', error);
        return null;
    }
};

// Get anniversary flashback (what was playing one year ago)
export const getAnniversaryFlashback = async (date?: string): Promise<{ date: string; top_song: string; total_minutes: number } | null> => {
    try {
        const targetDate = date ? new Date(date) : new Date();
        const oneYearAgo = new Date(targetDate);
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        const startOfDay = new Date(oneYearAgo);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(oneYearAgo);
        endOfDay.setHours(23, 59, 59, 999);

        const { data } = await supabase
            .from('listening_history')
            .select('track_name, artist_name, duration_ms')
            .gte('played_at', startOfDay.toISOString())
            .lte('played_at', endOfDay.toISOString());

        if (!data || data.length === 0) return null;

        const songCounts: Record<string, number> = {};
        let totalMs = 0;

        data.forEach(item => {
            const songKey = `${item.track_name} - ${item.artist_name}`;
            songCounts[songKey] = (songCounts[songKey] || 0) + 1;
            totalMs += item.duration_ms || 0;
        });

        const topSong = Object.entries(songCounts).sort((a, b) => b[1] - a[1])[0];

        return {
            date: oneYearAgo.toLocaleDateString(),
            top_song: topSong ? topSong[0] : 'No data',
            total_minutes: Math.round(totalMs / 60000)
        };
    } catch (error) {
        console.error('getAnniversaryFlashback error:', error);
        return null;
    }
};

// Get commute soundtrack (8-9am, 5-6pm)
export const getCommuteSoundtrack = async (): Promise<{ top_artists: string[]; time_window: string } | null> => {
    try {
        const { data } = await supabase
            .from('listening_history')
            .select('artist_name, played_at');

        if (!data || data.length === 0) return null;

        const commuteCounts: Record<string, number> = {};

        data.forEach(item => {
            const date = new Date(item.played_at);
            const hour = date.getHours();
            
            // Morning commute (7-9am) or evening commute (5-7pm)
            if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
                const artist = item.artist_name;
                if (artist) {
                    commuteCounts[artist] = (commuteCounts[artist] || 0) + 1;
                }
            }
        });

        const topArtists = Object.entries(commuteCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);

        return {
            top_artists: topArtists,
            time_window: '7-9am & 5-7pm'
        };
    } catch (error) {
        console.error('getCommuteSoundtrack error:', error);
        return null;
    }
};

// Get sleep pattern
export const getSleepPattern = async (): Promise<{ avg_stop_time: string; sleep_genres: string[] } | null> => {
    try {
        const { data } = await supabase
            .from('listening_history')
            .select('artist_name, album_name, played_at')
            .order('played_at', { ascending: true });

        if (!data || data.length === 0) return null;

        const nightListening: { hour: number; artist: string; album: string }[] = [];

        data.forEach(item => {
            const date = new Date(item.played_at);
            const hour = date.getHours();
            
            // Late night listening (10pm - 2am)
            if (hour >= 22 || hour < 2) {
                nightListening.push({
                    hour,
                    artist: item.artist_name,
                    album: item.album_name
                });
            }
        });

        // Find most common stop time
        const stopHours = nightListening.map(item => item.hour);
        const avgStopHour = stopHours.length > 0 
            ? Math.round(stopHours.reduce((sum, h) => sum + h, 0) / stopHours.length)
            : 23;

        const avgStopTime = avgStopHour === 0 ? '12:00 AM' : 
                           avgStopHour < 12 ? `${avgStopHour}:00 AM` :
                           avgStopHour === 12 ? '12:00 PM' :
                           `${avgStopHour - 12}:00 PM`;

        // Get common albums/artists (as genre proxy)
        const genreCounts: Record<string, number> = {};
        nightListening.forEach(item => {
            if (item.album) genreCounts[item.album] = (genreCounts[item.album] || 0) + 1;
        });

        const sleepGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([name]) => name);

        return {
            avg_stop_time: avgStopTime,
            sleep_genres: sleepGenres
        };
    } catch (error) {
        console.error('getSleepPattern error:', error);
        return null;
    }
};

// ─── DIVERSITY & TECHNICAL TOOLS ─────────────────────────────────────

// Get diversity index
export const getDiversityIndex = async (timeRange: string = 'monthly'): Promise<{ score: number; unique_artists: number; repeat_rate: string } | null> => {
    try {
        const now = new Date();
        let startDate: Date;

        if (timeRange === 'weekly') {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
        } else if (timeRange === 'monthly') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else {
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 30);
        }

        const { data } = await supabase
            .from('listening_history')
            .select('artist_name')
            .gte('played_at', startDate.toISOString());

        if (!data || data.length === 0) return null;

        const uniqueArtists = new Set(data.map(item => item.artist_name).filter(Boolean));
        const totalPlays = data.length;
        const uniqueCount = uniqueArtists.size;

        // Diversity score: higher when more unique artists relative to total plays
        const diversityScore = Math.min(100, Math.round((uniqueCount / totalPlays) * 100 * 10));
        
        const repeatRate = totalPlays > 0 ? (totalPlays - uniqueCount) / totalPlays : 0;
        const repeatLabel = repeatRate < 0.3 ? 'low' : repeatRate < 0.6 ? 'medium' : 'high';

        return {
            score: diversityScore,
            unique_artists: uniqueCount,
            repeat_rate: repeatLabel
        };
    } catch (error) {
        console.error('getDiversityIndex error:', error);
        return null;
    }
};

// Get genre evolution over time
export const getGenreEvolution = async (months: number = 6): Promise<{ timeline: Array<{ month: string; top: string }> } | null> => {
    try {
        const { data } = await supabase
            .from('listening_history')
            .select('artist_name, album_name, played_at')
            .order('played_at', { ascending: true });

        if (!data || data.length === 0) return null;

        const now = new Date();
        const timeline: Array<{ month: string; top: string }> = [];

        for (let i = months - 1; i >= 0; i--) {
            const monthDate = new Date(now);
            monthDate.setMonth(monthDate.getMonth() - i);
            const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
            const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

            const monthData = data.filter(item => {
                const itemDate = new Date(item.played_at);
                return itemDate >= monthStart && itemDate <= monthEnd;
            });

            const genreCounts: Record<string, number> = {};
            monthData.forEach(item => {
                // Use artist as genre proxy
                if (item.artist_name) {
                    genreCounts[item.artist_name] = (genreCounts[item.artist_name] || 0) + 1;
                }
            });

            const topGenre = Object.entries(genreCounts)
                .sort((a, b) => b[1] - a[1])[0];

            timeline.push({
                month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
                top: topGenre ? topGenre[0] : 'None'
            });
        }

        return { timeline };
    } catch (error) {
        console.error('getGenreEvolution error:', error);
        return null;
    }
};

// Get skip rate by artist
export const getSkipRateByArtist = async (artistName: string): Promise<{ skip_percent: string; avg_listen_duration: string } | null> => {
    try {
        const { data } = await supabase
            .from('listening_history')
            .select('duration_ms')
            .ilike('artist_name', `%${artistName}%`);

        if (!data || data.length === 0) return null;

        // Assume songs < 30 seconds are skipped
        const skipped = data.filter(item => (item.duration_ms || 0) < 30000);
        const skipPercent = Math.round((skipped.length / data.length) * 100);

        const avgDuration = data.reduce((sum, item) => sum + (item.duration_ms || 0), 0) / data.length;
        const avgMinutes = Math.floor(avgDuration / 60000);
        const avgSeconds = Math.floor((avgDuration % 60000) / 1000);

        return {
            skip_percent: `${skipPercent}%`,
            avg_listen_duration: `${avgMinutes}m ${avgSeconds}s`
        };
    } catch (error) {
        console.error('getSkipRateByArtist error:', error);
        return null;
    }
};

// Get gateway tracks (songs that led to discovering an artist)
export const getGatewayTracks = async (artistName: string): Promise<{ gateway_song: string; follow_up_plays: number } | null> => {
    try {
        const { data } = await supabase
            .from('listening_history')
            .select('track_name, played_at')
            .ilike('artist_name', `%${artistName}%`)
            .order('played_at', { ascending: true });

        if (!data || data.length < 2) return null;

        const firstSong = data[0].track_name;
        const totalFollowUps = data.length - 1;

        return {
            gateway_song: firstSong,
            follow_up_plays: totalFollowUps
        };
    } catch (error) {
        console.error('getGatewayTracks error:', error);
        return null;
    }
};

// Get top collaborations (artists played in same session)
export const getTopCollaborations = async (): Promise<{ pairs: Array<{ artists: string; co_occurrence: number }> } | null> => {
    try {
        const { data } = await supabase
            .from('listening_history')
            .select('artist_name, played_at')
            .order('played_at', { ascending: true });

        if (!data || data.length === 0) return null;

        // Group by sessions (within 30 min gaps)
        const sessions: string[][] = [];
        let currentSession: Set<string> = new Set();
        let lastTime: Date | null = null;

        data.forEach(item => {
            const currentTime = new Date(item.played_at);
            
            if (!lastTime || (currentTime.getTime() - lastTime.getTime()) > 30 * 60 * 1000) {
                if (currentSession.size > 0) {
                    sessions.push(Array.from(currentSession));
                }
                currentSession = new Set();
            }
            
            if (item.artist_name) currentSession.add(item.artist_name);
            lastTime = currentTime;
        });

        if (currentSession.size > 0) {
            sessions.push(Array.from(currentSession));
        }

        // Count co-occurrences
        const pairCounts: Record<string, number> = {};
        sessions.forEach(session => {
            const artists = Array.from(new Set(session));
            for (let i = 0; i < artists.length; i++) {
                for (let j = i + 1; j < artists.length; j++) {
                    const pair = [artists[i], artists[j]].sort().join(' & ');
                    pairCounts[pair] = (pairCounts[pair] || 0) + 1;
                }
            }
        });

        const topPairs = Object.entries(pairCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([artists, count]) => ({
                artists,
                co_occurrence: count
            }));

        return { pairs: topPairs };
    } catch (error) {
        console.error('getTopCollaborations error:', error);
        return null;
    }
};

// Get milestone tracker
export const getMilestoneTracker = async (targetPlays: number, artistName?: string): Promise<{ artist: string; current: number; remaining: number; est_days: number } | null> => {
    try {
        let query = supabase
            .from('listening_history')
            .select('artist_name, played_at');

        if (artistName) {
            query = query.ilike('artist_name', `%${artistName}%`);
        }

        const { data } = await query;

        if (!data || data.length === 0) return null;

        let targetArtist: string;
        let currentPlays: number;

        if (artistName) {
            targetArtist = artistName;
            currentPlays = data.length;
        } else {
            // Find top artist
            const artistCounts: Record<string, number> = {};
            data.forEach(item => {
                if (item.artist_name) {
                    artistCounts[item.artist_name] = (artistCounts[item.artist_name] || 0) + 1;
                }
            });
            const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0];
            if (!topArtist) return null;
            targetArtist = topArtist[0];
            currentPlays = topArtist[1];
        }

        const remaining = Math.max(0, targetPlays - currentPlays);

        // Estimate days based on recent play rate (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentPlays = data.filter(item => new Date(item.played_at) >= thirtyDaysAgo).length;
        const dailyRate = recentPlays / 30;
        const estDays = dailyRate > 0 ? Math.ceil(remaining / dailyRate) : 0;

        return {
            artist: targetArtist,
            current: currentPlays,
            remaining,
            est_days: estDays
        };
    } catch (error) {
        console.error('getMilestoneTracker error:', error);
        return null;
    }
};

// Enhanced obsession score with date filtering
export const getObsessionScore = async (
    artistName?: string,
    startDate?: string,
    endDate?: string
): Promise<{ artist: string; obsession_score: number; total_plays: number; top_song: string; image: string } | null> => {
    try {
        let query = supabase
            .from('listening_history')
            .select('track_name, artist_name, album_cover');

        if (startDate) {
            query = query.gte('played_at', new Date(startDate).toISOString());
        }
        if (endDate) {
            query = query.lte('played_at', new Date(endDate).toISOString());
        }
        if (artistName) {
            query = query.ilike('artist_name', `%${artistName}%`);
        }

        const { data, error } = await query;

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

        // Find artist with highest obsession score
        let bestArtist = null;
        let bestScore = 0;

        for (const [artist, data] of Object.entries(artistSongs)) {
            if (data.total < 3) continue;
            const topSongEntry = Object.entries(data.songs).sort((a, b) => b[1] - a[1])[0];
            if (!topSongEntry) continue;
            
            // Obsession score: combination of single-song dominance and total plays
            const dominancePercent = (topSongEntry[1] / data.total) * 100;
            const obsessionScore = Math.round(dominancePercent * (1 + Math.log10(data.total)));

            if (obsessionScore > bestScore) {
                bestScore = obsessionScore;
                bestArtist = {
                    artist,
                    obsession_score: obsessionScore,
                    total_plays: data.total,
                    top_song: topSongEntry[0],
                    image: data.image
                };
            }
        }

        return bestArtist;
    } catch (error) {
        console.error('getObsessionScore error:', error);
        return null;
    }
};
