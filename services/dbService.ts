
import { supabase } from './supabaseClient';

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

export const logSinglePlay = async (track: any, listenedMs: number, extraData: any = {}) => {
    // Log if at least 3 seconds
    if (!track || listenedMs < 3000) return;

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

export const syncRecentPlays = async (recentItems: any[]) => {
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
    // console.log(`Synced ${historyItems.length} NEW items to Supabase`);
  }
};

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

  const currentHours = Math.floor(currentWeekMs / (1000 * 60 * 60));
  const currentMins = Math.floor((currentWeekMs % (1000 * 60 * 60)) / (1000 * 60));
  
  const lastHours = Math.floor(lastWeekMs / (1000 * 60 * 60));
  
  // Calculate trend
  const hoursDiff = currentHours - (lastHours || 0);
  const trendString = hoursDiff >= 0 ? `+${hoursDiff}h vs last week` : `${hoursDiff}h vs last week`;

  // Get total tracks count for "New Discoveries" proxy or just total db count
  const { count } = await supabase.from('listening_history').select('*', { count: 'exact', head: true });

  return {
    weeklyTime: `${currentHours}h ${currentMins}m`,
    weeklyTrend: trendString,
    totalTracks: count || 0
  };
};

export const fetchDashboardStats = async () => {
    // 1. Top Artists (count by artist_name)
    const { data: artistsData } = await supabase
       .from('listening_history')
       .select('artist_name, duration_ms');
    
    const artistCounts: Record<string, { count: number, time: number }> = {};
    const artistImages: Record<string, string> = {}; // Helper to find an image

    artistsData?.forEach((item: any) => {
        if (!artistCounts[item.artist_name]) artistCounts[item.artist_name] = { count: 0, time: 0 };
        artistCounts[item.artist_name].count += 1;
        artistCounts[item.artist_name].time += item.duration_ms;
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
        .slice(0, 10)
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
        .select('track_name, artist_name, album_cover, duration_ms');
        
    const songCounts: Record<string, { count: number, artist: string, cover: string, duration: number, totalTime: number }> = {};
    songsData?.forEach((item: any) => {
        const key = item.track_name; 
        if (!songCounts[key]) {
            songCounts[key] = { count: 0, artist: item.artist_name, cover: item.album_cover, duration: item.duration_ms, totalTime: 0 };
        }
        songCounts[key].count++;
        songCounts[key].totalTime += item.duration_ms;
    });

    const topSongs = Object.entries(songCounts)
        .sort(([, a], [, b]) => b.totalTime - a.totalTime)
        .slice(0, 20)
        .map(([title, info], index) => ({
            id: `song-${index}`,
            title,
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
        .select('album_name, artist_name, album_cover, duration_ms');

    const albumStats: Record<string, { count: number, duration: number, artist: string, cover: string }> = {};
    albumsData?.forEach((item: any) => {
        const key = item.album_name;
        if (!albumStats[key]) {
             albumStats[key] = { count: 0, duration: 0, artist: item.artist_name, cover: item.album_cover };
        }
        albumStats[key].count++;
        albumStats[key].duration += item.duration_ms;
    });

    const topAlbums = Object.entries(albumStats)
        .sort(([, a], [, b]) => b.duration - a.duration)
        .slice(0, 10)
        .map(([title, info], index) => ({
            id: `album-${index}`,
            title,
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
        .select('*') // Get everything to do aggregation
        .gte('played_at', `${today}T00:00:00.000Z`)
        .order('played_at', { ascending: true });
    
    // Bucket by hour (00 to 23)
    // We must use LOCAL time logic if possible, but 'today' string above is UTC based in ISO.
    // For simplicity, we assume browser/local time for display.
    const hourlyMap: Record<number, { min: number, topSong: string, topSongCover: string, topSongArtist: string }> = {};
    for (let i=0; i<24; i++) hourlyMap[i] = { min: 0, topSong: '', topSongCover: '', topSongArtist: '' };

    if (todayData) {
        // Find most played song PER hour
        const hourSongs: Record<number, Record<string, any>> = {}; // hour -> songName -> {count, ...obj}
        
        todayData.forEach((item: any) => {
            const date = new Date(item.played_at);
            const hour = date.getHours(); // Local browser time
            
            hourlyMap[hour].min += (item.duration_ms / 60000);
            
            // Track song occurrence in this hour
            if (!hourSongs[hour]) hourSongs[hour] = {};
            if (!hourSongs[hour][item.track_name]) {
                hourSongs[hour][item.track_name] = { count: 0, ...item };
            }
            hourSongs[hour][item.track_name].count++;
        });

        // Determine top song for each hour
        Object.keys(hourSongs).forEach((h) => {
            const hour = parseInt(h);
            const songsInHour = Object.values(hourSongs[hour]);
            if (songsInHour.length > 0) {
                 // Sort by count
                 songsInHour.sort((a: any, b: any) => b.count - a.count);
                 const best = songsInHour[0];
                 hourlyMap[hour].topSong = best.track_name;
                 hourlyMap[hour].topSongCover = best.album_cover;
                 hourlyMap[hour].topSongArtist = best.artist_name;
            }
        });
    }

    const hourlyActivity = Object.entries(hourlyMap).map(([hour, data]) => ({
        time: `${hour}:00`,
        value: Math.round(data.min), // Minutes
        song: data.topSong,
        artist: data.topSongArtist,
        cover: data.topSongCover
    }));

    return {
        artists: topArtists,
        songs: topSongs,
        albums: topAlbums,
        hourlyActivity
    };
};

    return {
        artists: topArtists,
        songs: topSongs,
        albums: topAlbums
    };
};

const msToTime = (duration: number) => {
  const minutes = Math.floor(duration / 60000);
  const seconds = ((duration % 60000) / 1000).toFixed(0);
  return minutes + ":" + (parseInt(seconds) < 10 ? '0' : '') + seconds;
};

