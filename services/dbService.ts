
import { supabase } from './supabaseClient';

export interface HistoryItem {
  spotify_id: string;
  played_at: string;
  track_name: string;
  artist_name: string;
  album_name: string;
  album_cover: string;
  duration_ms: number;
}

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
    console.log(`Synced ${historyItems.length} NEW items to Supabase`);
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

export const fetchDashboardStats = async () => {
    // 1. Top Artists (count by artist_name)
    const { data: artistsData, error: artistsError } = await supabase
       .from('listening_history')
       .select('artist_name')
    
    // Client-side aggregation for Top Artists
    const artistCounts: Record<string, number> = {};
    artistsData?.forEach((item: any) => {
        artistCounts[item.artist_name] = (artistCounts[item.artist_name] || 0) + 1;
    });
    
    // Sort and map
    const topArtists = Object.entries(artistCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([name, count], index) => ({
            id: `artist-${index}`,
            name,
            image: '', // We might need to fetch image from spotify separate or store it? DB doesn't have artist image.
            totalListens: count,
            trend: 0
        }));

    // 2. Top Songs (count by track_name)
    const { data: songsData, error: songsError } = await supabase
        .from('listening_history')
        .select('track_name, artist_name, album_cover, duration_ms');
        
    const songCounts: Record<string, { count: number, artist: string, cover: string, duration: number }> = {};
    songsData?.forEach((item: any) => {
        const key = item.track_name; // unique by name for now
        if (!songCounts[key]) {
            songCounts[key] = { count: 0, artist: item.artist_name, cover: item.album_cover, duration: item.duration_ms };
        }
        songCounts[key].count++;
    });

    const topSongs = Object.entries(songCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 20)
        .map(([title, info], index) => ({
            id: `song-${index}`,
            title,
            artist: info.artist,
            album: '', 
            cover: info.cover,
            duration: msToTime(info.duration),
            listens: info.count,
            dailyChange: 0
        }));

    // 3. Top Albums (sum duration or count)
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
        .sort(([, a], [, b]) => b.duration - a.duration) // Sort by duration listened
        .slice(0, 10)
        .map(([title, info], index) => ({
            id: `album-${index}`,
            title,
            artist: info.artist,
            cover: info.cover,
            year: 2024,
            totalListens: Math.floor(info.duration / 60000) // Storing Minutes here instead of plays
        }));

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

