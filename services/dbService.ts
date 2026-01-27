
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
    
    // 1. Top Artists (count by artist_name)
    const { data: artistsData, error: artistError } = await supabase
       .from('listening_history')
       .select('artist_name, duration_ms, played_at')
       .gte('played_at', startDate.toISOString());

    // NOTE: Extended history fetching removed - handled by RPC for All Time
    let extendedArtists: any[] = [];
    // NOTE: Extended history fetching removed - All Time is handled entirely by RPC block above

    const combinedArtists = [...(artistsData || [])];
    
    const artistCounts: Record<string, { count: number, time: number }> = {};
    const artistImages: Record<string, string> = {}; // Helper to find an image

    combinedArtists?.forEach((item: any) => {
        if (!artistCounts[item.artist_name]) artistCounts[item.artist_name] = { count: 0, time: 0 };
        
        // Fix: Only count as a "Play" if duration > 30s
        if ((item.duration_ms || 0) > 30000) {
            artistCounts[item.artist_name].count += 1;
        }
        
        artistCounts[item.artist_name].time += (item.duration_ms || 0);
    });

    // Also scan albums to find matching images for artists
    const { data: albumCovers } = await supabase.from('listening_history').select('artist_name, album_cover');
    albumCovers?.forEach((item:any) => {
        if (!artistImages[item.artist_name] && item.album_cover) {
            artistImages[item.artist_name] = item.album_cover;
        }
    });
    
    const topArtists = Object.entries(artistCounts)
        .sort(([, a], [, b]) => b.time - a.time) // Sort by TIME listened, not just adds
        .slice(0, 100)
        .map(([name, info], index) => ({
            id: `artist-${index}`,
            name,
            image: artistImages[name] || '', 
            totalListens: info.count,
            timeStr: `${Math.floor(info.time / 60000)}m`,
            trend: 0
        }));

    // 2. Top Songs
    const { data: songsData } = await supabase
        .from('listening_history')
        .select('track_name, artist_name, album_cover, duration_ms, played_at')
        .gte('played_at', startDate.toISOString());

    // NOTE: All Time Logic moved to RPC block above, so this section only handles Daily/Weekly/Monthly now
    // (kept cleanup for consistent code flow if RPC fails/is removed)
    
    // FETCH EXTENDED IF ALL TIME
    let extendedSongs: any[] = [];
    // if (timeRange === 'All Time') { ... } // RPC HANDLED
    const combinedSongs = [...(songsData || []), ...extendedSongs];
        
    const songCounts: Record<string, { count: number, artist: string, cover: string, duration: number, totalTime: number }> = {};
    combinedSongs?.forEach((item: any) => {
        const key = `${item.track_name}||${item.artist_name}`; 
        if (!songCounts[key]) {
            songCounts[key] = { count: 0, artist: item.artist_name, cover: item.album_cover || '', duration: item.duration_ms, totalTime: 0 };
        }
        // Prefer an entry that HAS a cover if one exists
        if (item.album_cover && !songCounts[key].cover) {
             songCounts[key].cover = item.album_cover;
        }

        // Fix: Only count as a "Play" if duration > 30s
        if ((item.duration_ms || 0) > 30000) {
            songCounts[key].count++;
        }
        
        songCounts[key].totalTime += (item.duration_ms || 0);
    });

    const topSongs = Object.entries(songCounts)
        .sort(([, a], [, b]) => b.totalTime - a.totalTime)
        .slice(0, 100)
        .map(([key, info], index) => ({
            id: `song-${index}`,
            title: key.split('||')[0],
            artist: info.artist,
            album: '', 
            cover: info.cover,
            duration: msToTime(info.duration), // Track length
            listens: info.count,
            timeStr: `${Math.floor(info.totalTime / 60000)}m`
        }));

    // 3. Top Albums
    const { data: albumsData } = await supabase
        .from('listening_history')
        .select('album_name, artist_name, album_cover, duration_ms, played_at')
        .gte('played_at', startDate.toISOString());

    // NOTE: All Time Logic moved to RPC block above
    
    // FETCH EXTENDED IF ALL TIME
    let extendedAlbums: any[] = [];
    
    const combinedAlbums = [...(albumsData || []), ...extendedAlbums];

    const albumStats: Record<string, { count: number, duration: number, artist: string, cover: string }> = {};
    combinedAlbums?.forEach((item: any) => {
         // Skip empty albums
        if (!item.album_name || item.album_name === 'Unknown Album') return;

        const key = `${item.album_name}||${item.artist_name}`;
        if (!albumStats[key]) {
             albumStats[key] = { count: 0, duration: 0, artist: item.artist_name, cover: item.album_cover || '' };
        }
        if (item.album_cover && !albumStats[key].cover) {
             albumStats[key].cover = item.album_cover;
        }

        // Fix: Only count as a "Play" if duration > 30s
        if ((item.duration_ms || 0) > 30000) {
            albumStats[key].count++;
        }
        
        albumStats[key].duration += (item.duration_ms || 0);
    });

    const topAlbums = Object.entries(albumStats)
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
    
    // 4. Hourly Activity Graph (Today)
    const today = new Date().toISOString().split('T')[0];
    const { data: todayData } = await supabase
        .from('listening_history')
        .select('*')
        .gte('played_at', `${today}T00:00:00.000Z`)
        .order('played_at', { ascending: true });
    
    // Helper for American Time
    const formatTo12Hour = (hour: number) => {
        const h = hour % 12 || 12;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        return `${h} ${ampm}`;
    };

    // Bucket by hour (00 to 23)
    const hourlyMap: Record<number, { min: number, count: number, songs: any[] }> = {};
    for (let i=0; i<24; i++) hourlyMap[i] = { min: 0, count: 0, songs: [] };

    if (todayData) {
        todayData.forEach((item: any) => {
            const date = new Date(item.played_at);
            const hour = date.getHours(); // Local browser time
            
            hourlyMap[hour].min += (item.duration_ms / 60000);
            hourlyMap[hour].count += 1;
            hourlyMap[hour].songs.push(item);
        });
    }

    const hourlyActivity = Object.entries(hourlyMap).map(([h, data]) => {
        const hour = parseInt(h);
        const topSong = data.songs.length > 0 ? 
            data.songs.reduce((prev, current) => 
                (data.songs.filter(s => s.track_name === prev.track_name).length > 
                 data.songs.filter(s => s.track_name === current.track_name).length) ? prev : current
            ) : null;

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

    // 5. Recent Plays (Last 2000 for Timeline Heatmap)
    const { data: recentHistory } = await supabase
        .from('listening_history')
        .select('*')
        .order('played_at', { ascending: false })
        .limit(2000);
        
    const recentPlays = recentHistory?.map((item: any) => ({
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
export const backfillExtendedHistoryImages = async (
  token: string,
  onProgress: (status: string) => void
): Promise<{ success: boolean; message: string }> => {
    try {
        console.log('[backfillImages] 🎨 Starting image backfill process...');
        onProgress('🔍 Scanning database for missing images...');
        
        // Get unique artists (that don't have images yet) - check for NULL only first
        const { data: artistsNeedingImages, error: fetchError } = await supabase
            .from('extended_streaming_history')
            .select('artist_name')
            .is('album_cover', null)
            .not('artist_name', 'is', null)
            .limit(10000);

        if (fetchError) {
            console.error('[backfillImages] ❌ Error fetching artists:', fetchError);
            return { success: false, message: 'Failed to fetch artists: ' + fetchError.message };
        }

        console.log(`[backfillImages] 📊 Query returned ${artistsNeedingImages?.length || 0} records with NULL album_cover`);

        if (!artistsNeedingImages || artistsNeedingImages.length === 0) {
            console.log('[backfillImages] ✅ No images to backfill - all records have covers!');
            onProgress('✅ All images already present!');
            return { success: true, message: 'All images already present!' };
        }

        const uniqueArtists = [...new Set(artistsNeedingImages.map(x => x.artist_name).filter(Boolean))] as string[];
        console.log(`[backfillImages] 📊 Found ${artistsNeedingImages.length} records from ${uniqueArtists.length} unique artists needing images`);
        console.log('[backfillImages] 🎤 Sample artists:', uniqueArtists.slice(0, 10));
        
        onProgress(`🎤 Found ${uniqueArtists.length} artists needing images. Fetching from Spotify...`);
        
        // Import fetchArtistImages from spotifyService
        const { fetchArtistImages } = await import('./spotifyService');
        
        console.log('[backfillImages] 🌐 Calling Spotify API for artist images (this may take a while)...');
        const startTime = Date.now();
        
        // Pass onProgress to fetchArtistImages for real-time Spotify API progress
        const artistImages = await fetchArtistImages(token, uniqueArtists, onProgress);
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const imageCount = Object.keys(artistImages).length;
        console.log(`[backfillImages] 📥 Spotify returned ${imageCount}/${uniqueArtists.length} images in ${elapsed}s`);
        
        if (imageCount === 0) {
            console.warn('[backfillImages] ⚠️ No images returned from Spotify!');
            onProgress('⚠️ Spotify returned no images');
            return { success: false, message: 'Spotify returned no images - check token' };
        }
        
        onProgress(`📝 Updating database with ${imageCount} images...`);
        
        // Update each artist's records with their image
        let updatedRecords = 0;
        let updatedArtists = 0;
        let processed = 0;
        const total = Object.entries(artistImages).length;
        
        console.log(`[backfillImages] 🔄 Starting database updates for ${total} artists...`);
        
        for (const [artistName, imageUrl] of Object.entries(artistImages)) {
            const { data, error } = await supabase
                .from('extended_streaming_history')
                .update({ album_cover: imageUrl })
                .eq('artist_name', artistName)
                .is('album_cover', null)
                .select('id');
            
            processed++;
            const percent = Math.round((processed / total) * 100);
            
            if (!error && data && data.length > 0) {
                updatedArtists++;
                updatedRecords += data.length;
                console.log(`[backfillImages] ✓ ${percent}% - Updated ${data.length} tracks for "${artistName}"`);
            } else if (error) {
                console.error(`[backfillImages] ✗ ${percent}% - DB error for "${artistName}":`, error);
            } else {
                console.log(`[backfillImages] - ${percent}% - No NULL records found for "${artistName}" (maybe already updated?)`);
            }
            
            // Update UI progress
            onProgress(`📝 ${percent}% complete (${updatedArtists} artists, ${updatedRecords} tracks)`);
        }
        
        const finalMessage = `✅ Done! Updated ${updatedRecords} tracks across ${updatedArtists} artists`;
        console.log(`[backfillImages] 🎉 ${finalMessage}`);
        onProgress(finalMessage);
        return { success: true, message: finalMessage };
        
    } catch (err: any) {
        console.error('[backfillImages] ❌ Error:', err);
        onProgress(`❌ Error: ${err.message}`);
        return { success: false, message: err.message };
    }
};



