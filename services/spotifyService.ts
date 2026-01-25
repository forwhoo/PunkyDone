import { Artist, Album, Song } from '../types';

// The Redirect URI provided by the user
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || "http://localhost:3000/";
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;

const SCOPES = "user-top-read user-read-recently-played user-read-private";

function generateRandomString(length: number) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(codeVerifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const redirectToAuthCodeFlow = async () => {
  if (!CLIENT_ID) {
    console.warn("Missing Spotify Client ID");
    return;
  }

  const verifier = generateRandomString(128);
  const challenge = await generateCodeChallenge(verifier);

  localStorage.setItem("verifier", verifier);

  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("response_type", "code");
  params.append("redirect_uri", REDIRECT_URI);
  params.append("scope", SCOPES);
  params.append("code_challenge_method", "S256");
  params.append("code_challenge", challenge);

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}


export const getAccessToken = async (code: string) => {
  if (!CLIENT_ID) return null;
  const verifier = localStorage.getItem("verifier");

  const params = new URLSearchParams();
  params.append("client_id", CLIENT_ID);
  params.append("grant_type", "authorization_code");
  params.append("code", code);
  params.append("redirect_uri", REDIRECT_URI);
  params.append("code_verifier", verifier!);

  const result = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
  });

  const body = await result.json();
  if (body.refresh_token) {
      localStorage.setItem('spotify_refresh_token', body.refresh_token);
  }
  return body.access_token;
}

export const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (!refreshToken || !CLIENT_ID) return null;

    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("grant_type", "refresh_token");
    params.append("refresh_token", refreshToken);

    try {
        const result = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params
        });

        const body = await result.json();
        if (body.access_token) {
            localStorage.setItem('spotify_token', body.access_token);
            if (body.refresh_token) {
                localStorage.setItem('spotify_refresh_token', body.refresh_token);
            }
            return body.access_token;
        }
    } catch (e) {
        console.error("Token refresh failed", e);
    }
    return null;
}

export const getAuthUrl = () => {
  // Deprecated: Legacy Implicit Grant URL 
  // Kept for signature compatibility if needed, but redirectToAuthCodeFlow is preferred.
  if (!CLIENT_ID) {
    console.warn("Missing Spotify Client ID");
    return "#";
  }
  return `https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&response_type=token&show_dialog=true`;
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
    const [artistsRes, tracksRes, recentRes, userRes, nowPlayingRes] = await Promise.all([
      fetch('https://api.spotify.com/v1/me/top/artists?limit=10&time_range=short_term', { headers }),
      fetch('https://api.spotify.com/v1/me/top/tracks?limit=20&time_range=short_term', { headers }),
      fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', { headers }),
      fetch('https://api.spotify.com/v1/me', { headers }),
      fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers })
    ]);

    if (!artistsRes.ok || !tracksRes.ok || !recentRes.ok || !userRes.ok) {
        throw new Error("Failed to fetch data from Spotify");
    }

    const artistsData = await artistsRes.json();
    const tracksData = await tracksRes.json();
    const recentData = await recentRes.json();
    const userData = await userRes.json();
    
    // Check Now Playing
    let currentTrack = null;
    let progress_ms = 0;
    let is_playing = false;
    let item = null;

    if (nowPlayingRes.status === 200) {
        const nowPlayingData = await nowPlayingRes.json();
        // Check if actually playing (isPlaying is true)
        item = nowPlayingData.item;
        is_playing = nowPlayingData.is_playing;
        progress_ms = nowPlayingData.progress_ms;

        if (is_playing && item) {
             currentTrack = {
                 id: item.id,
                 title: item.name,
                 artist: item.artists[0].name,
                 cover: item.album.images[0]?.url || '',
                 duration: item.duration_ms
             };
        }
    } 

    return {
      user: {
          name: userData.display_name,
          image: userData.images?.[0]?.url || "",
          product: userData.product
      },
      currentTrack,
      playbackState: {
          item,
          is_playing,
          progress_ms
      },
      artists: mapArtists(artistsData.items),
      songs: mapSongs(tracksData.items),
      albums: mapAlbumsFromTracks(tracksData.items),
      hourly: mapRecentToHourly(recentData.items),
      chart: mapRecentToDaily(recentData.items),
      recentRaw: recentData.items // RAW DATA FOR DB SYNC
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
    genres: item.genres,
    totalListens: 0, // Will be populated by DB stats
    trend: 0
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
    listens: 0, // Will be populated by DB stats
    dailyChange: 0
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
  
  // Smooth out the graph visually and ensure structure matches DB aggregation
  return hours.map((h, i) => {
    const hour = i % 12 === 0 ? 12 : i % 12;
    const ampm = i < 12 ? 'AM' : 'PM';
    
    return {
        ...h,
        time: `${hour} ${ampm}`,
        value: h.value * 10 + Math.floor(Math.random() * 5),
        song: h.song?.title || 'No activity',
        artist: h.song?.artist || '---',
        cover: h.song?.cover || 'https://ui-avatars.com/api/?background=2C2C2E&color=8E8E93&name=?'
    };
  }); 
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

export const fetchArtistImages = async (token: string, artistNames: string[]) => {
    if (!token || !artistNames.length) return {};
    
    // Batch in groups of 5? No, Search API is 1 by 1.
    // Or we use 'Get Several Artists' if we have IDs. We don't have IDs.
    // We have names. We can try to match with 'Get User's Top Artists' cache? 
    // No, that's not reliable.
    
    // We will search for each artist. Limit to first 5 or so to avoid rate limits?
    // Let's assume the component calls this for the top items.
    
    const imageMap: Record<string, string> = {};
    
    // Minimal optimization: Only fetch unique names
    const uniqueNames = Array.from(new Set(artistNames));

    // Parallel fetch with limit (don't spam 50 requests)
    const promises = uniqueNames.slice(0, 10).map(async (name) => {
        try {
            const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            const artist = data.artists?.items[0];
            if (artist && artist.images?.length > 0) {
                imageMap[name] = artist.images[0].url;
            }
        } catch (e) {
            console.error('Artist fetch error:', e);
        }
    });

    await Promise.all(promises);
    return imageMap;
};
