
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

export const syncRecentPlays = async (recentItems: any[]) => {
  if (!recentItems || recentItems.length === 0) return;

  const historyItems: HistoryItem[] = recentItems.map(item => ({
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
    console.log(`Synced ${historyItems.length} items to Supabase`);
  }
};

export const fetchListeningStats = async () => {
  // Example: Get total count
  const { count, error } = await supabase
    .from('listening_history')
    .select('*', { count: 'exact', head: true });
    
  if (error) return null;
  return count;
};
