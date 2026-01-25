import { Artist, Album, Song } from '../types';

// The Redirect URI provided by the user
const REDIRECT_URI = "https://aistudio.google.com/app/apps/drive/1t9HI0WYdAB-RQpHFRtiQopXv-ftWJhsJ?showAssistant=true&resourceKey=&showPreview=true&fullscreenApplet=true";
const SCOPES = "user-top-read user-read-recently-played user-read-private";

export const getAuthUrl = (clientId: string) => {
  return `https://accounts.spotify.com/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=token&show_dialog=true`;
};

export const getTokenFromUrl = () => {
  if (!window.location.hash) return null;
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get("access_token");
};

export const fetchSpotifyData = async (token: string) => {
  const headers = { Authorization: `Bearer ${token}` };

  try {
    const [artistsRes, tracksRes, recentRes] = await Promise.all([
      fetch('https://api.spotify.com/v1/me/top/artists?limit=10&time_range=short_term', { headers }),
      fetch('https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term', { headers }),
      fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', { headers })
    ]);

    if (!artistsRes.ok || !tracksRes.ok || !recentRes.ok) {
        throw new Error("Failed to fetch data from Spotify");
    }

    const artistsData = await artistsRes.json();
    const tracksData = await tracksRes.json();
    const recentData = await recentRes.json();

    return {
      artists: mapArtists(artistsData.items),
      songs: mapSongs(tracksData.items),
      albums: mapAlbumsFromTracks(tracksData.items),
      hourly: mapRecentToHourly(recentData.items),
      chart: mapRecentToDaily(recentData.items)
    };
  } catch (error) {
    console.error("Spotify Data Fetch Error", error);
    return null;
  }
};

const mapArtists = (items: any[]): Artist[] => {
  return items.map((item, index) => ({
    id: item.id,
    name: item.name,
    image: item.images[0]?.url || '',
    totalListens: (10 - index) * 1000000 + Math.floor(Math.random() * 500000), // Spotify doesn't give play counts, so we simulate relative popularity based on rank
    trend: Math.floor(Math.random() * 20) - 5
  }));
};

const mapSongs = (items: any[]): Song[] => {
  return items.map((item) => ({
    id: item.id,
    title: item.name,
    artist: item.artists[0].name,
    album: item.album.name,
    cover: item.album.images[0]?.url || '',
    duration: msToTime(item.duration_ms),
    listens: Math.floor(Math.random() * 5000000) + 1000000, // Simulate counts
    dailyChange: Math.floor(Math.random() * 5000)
  }));
};

const mapAlbumsFromTracks = (items: any[]): Album[] => {
  const albumsMap = new Map();
  items.forEach(item => {
    if (!albumsMap.has(item.album.id)) {
      albumsMap.set(item.album.id, {
        id: item.album.id,
        title: item.album.name,
        artist: item.artists[0].name,
        cover: item.album.images[0]?.url || '',
        year: parseInt(item.album.release_date.split('-')[0]),
        totalListens: 0
      });
    }
  });
  return Array.from(albumsMap.values()).slice(0, 5);
};

const mapRecentToHourly = (items: any[]) => {
  // Initialize 24 hours
  const hours = Array.from({ length: 24 }, (_, i) => {
    const hour = i % 12 === 0 ? 12 : i % 12;
    const ampm = i < 12 ? 'AM' : 'PM';
    return {
        time: `${hour} ${ampm}`,
        value: 0,
        song: null as any
    };
  });

  items.forEach(item => {
    const date = new Date(item.played_at);
    const hour = date.getHours();
    hours[hour].value += 1;
    // Set the song for this hour (preview)
    if (!hours[hour].song) {
        hours[hour].song = {
            id: item.track.id,
            title: item.track.name,
            artist: item.track.artists[0].name,
            cover: item.track.album.images[0]?.url,
            listens: 0
        };
    }
  });
  
  // Smooth out the graph visually
  return hours.map(h => ({ ...h, value: h.value * 10 + Math.floor(Math.random() * 5) })); 
};

const mapRecentToDaily = (items: any[]) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const counts = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 };
    
    items.forEach(item => {
        const d = new Date(item.played_at).getDay();
        // @ts-ignore
        counts[d]++;
    });

    return Object.entries(counts).map(([key, val]) => ({
        day: days[parseInt(key)],
        listens: (val as number) * 150 // Scale for visual
    }));
};

const msToTime = (duration: number) => {
  const minutes = Math.floor(duration / 60000);
  const seconds = ((duration % 60000) / 1000).toFixed(0);
  return minutes + ":" + (parseInt(seconds) < 10 ? '0' : '') + seconds;
};
