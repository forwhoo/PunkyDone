
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
  const trendString = hoursDiff >= 0 ? `+${hoursDiff}h vs last week` : `${hoursDiff}h vs last week`;

  // Get total tracks count for "New Discoveries" proxy or just total db count
  const { count } = await supabase.from('listening_history').select('*', { count: 'exact', head: true });

  return {
    weeklyTime: `${currentHours}h ${currentMins}m`,
    weeklyTrend: trendString,
    totalTracks: count || 0
  };
};
