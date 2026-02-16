import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Music, X, TrendingUp, Clock, Calendar, Sparkles, Disc, MessageSquare, Info, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Layout } from './components/Layout';
import { Artist, Album, Song } from './types';
// import { TopCharts } from './components/TopCharts';
import { RankingWidget } from './components/RankingWidget';
import { AISpotlight } from './components/AISpotlight';
import { AISearchBar } from './components/AISearchBar';
import { TrendingArtists } from './components/TrendingArtists';
import { UpcomingArtists } from './components/UpcomingArtists';
import { rankingMockData } from './mockData';
import { ActivityHeatmap } from './components/ActivityHeatmap';
import { ChartSkeleton } from './components/LoadingSkeleton';

// Extract dominant color from an image URL using canvas sampling
const MIN_PIXEL_BRIGHTNESS = 40;
const MAX_PIXEL_BRIGHTNESS = 700;
const MIN_SATURATION_RANGE = 30;
const FALLBACK_AURA_COLOR = '#FA2D48';
const AURORA_AMPLITUDE = 0.8;
const AURORA_BLEND = 0.5;
const AURORA_SPEED = 0.7;

function extractDominantColor(imageUrl: string): Promise<string> {
    return new Promise((resolve) => {
        if (!imageUrl) { resolve(FALLBACK_AURA_COLOR); return; }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(FALLBACK_AURA_COLOR); return; }
                canvas.width = 50;
                canvas.height = 50;
                ctx.drawImage(img, 0, 0, 50, 50);
                const data = ctx.getImageData(0, 0, 50, 50).data;
                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < data.length; i += 16) {
                    const pr = data[i], pg = data[i+1], pb = data[i+2];
                    // Skip very dark and very light pixels for better color extraction
                    const brightness = pr + pg + pb;
                    if (brightness > MIN_PIXEL_BRIGHTNESS && brightness < MAX_PIXEL_BRIGHTNESS) {
                        r += pr; g += pg; b += pb; count++;
                    }
                }
                if (count === 0) { resolve(FALLBACK_AURA_COLOR); return; }
                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);
                // Fall back if color is too desaturated for a visible aura
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                if (max - min < MIN_SATURATION_RANGE) { resolve(FALLBACK_AURA_COLOR); return; }
                const componentToHex = (value: number) => value.toString(16).padStart(2, '0');
                resolve(`#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`);
            } catch { resolve(FALLBACK_AURA_COLOR); }
        };
        img.onerror = () => resolve(FALLBACK_AURA_COLOR);
        img.src = imageUrl;
    });
}

// RANKED COMPONENT: Top Album (Standard)
import { 
    getAuthUrl, 
    getTokenFromUrl, 
    fetchSpotifyData, 
    redirectToAuthCodeFlow, 
    getAccessToken,
    refreshAccessToken,
    fetchArtistImages
} from './services/spotifyService';
import { syncRecentPlays, fetchListeningStats, fetchDashboardStats, logSinglePlay, fetchCharts } from './services/dbService';
import { generateMusicInsight, generateRankingInsights } from './services/geminiService';
import { supabase } from './services/supabaseClient';

// RANKED COMPONENT: Top Album (Standard)
const RankedAlbum = ({ album, rank, onClick }: { album: Album, rank: number, onClick?: () => void }) => (
    <div 
        className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]"
        onClick={onClick}
    >
        <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40 text-white/5">
            {rank}
        </span>
        <div className="relative z-10 ml-10 md:ml-12">
            <div className="w-32 h-32 md:w-40 md:h-40 overflow-hidden rounded-xl bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                <img src={album.cover} alt={album.title} loading="lazy" className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm" />
                {/* Hover Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                     <span className="text-white font-bold text-xl drop-shadow-md">{album.timeStr}</span>
                </div>
            </div>
            <div className="mt-3 relative z-20">
                <h3 className="text-[15px] font-semibold text-white truncate w-32 md:w-40 leading-tight group-hover:text-white transition-colors">{album.title}</h3>
                <p className="text-[13px] text-[#8E8E93] truncate w-32 md:w-40 mt-0.5 font-medium">{album.artist} • <span className="text-white/60">{album.timeStr}</span></p>
            </div>
        </div>
    </div>
);

// RANKED COMPONENT: Top Artist (Number style like Top Albums)
const RankedArtist = ({ artist, rank, realImage, onClick }: { artist: Artist, rank: number, realImage?: string, onClick?: () => void }) => (
    <div 
        className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]"
        onClick={onClick}
    >
        <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40 text-white/5">
            {rank}
        </span>
        <div className="relative z-10 ml-10 md:ml-12">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                <img 
                    src={realImage || artist.image || `https://ui-avatars.com/api/?name=${artist.name}&background=1DB954&color=fff`} 
                    alt={artist.name} 
                    loading="lazy"
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm" 
                />
                {/* Hover Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                     <span className="text-white font-bold text-xl drop-shadow-md">{artist.timeStr}</span>
                </div>
            </div>
            <div className="mt-3 relative z-20">
                <h3 className="text-[15px] font-semibold text-white truncate w-32 md:w-40 leading-tight group-hover:text-white transition-colors">{artist.name}</h3>
            </div>
        </div>
    </div>
);

// RANKED COMPONENT: Top Song (Ranked Album Style)
const RankedSong = ({ song, rank, onClick }: { song: Song, rank: number, onClick?: () => void }) => (
    <div 
        className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]"
        onClick={onClick}
    >
        <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40 text-white/5">
            {rank}
        </span>
        <div className="relative z-10 ml-10 md:ml-12">
            <div className="w-32 h-32 md:w-40 md:h-40 overflow-hidden rounded-xl bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                <img src={song.cover} alt={song.title} loading="lazy" className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm" />
                {/* Hover Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                     <span className="text-white font-bold text-xl drop-shadow-md">{song.timeStr}</span>
                </div>
            </div>
            <div className="mt-3 relative z-20">
                <h3 className="text-[15px] font-semibold text-white truncate w-32 md:w-40 leading-tight group-hover:text-white transition-colors">{song.title}</h3>
                <p className="text-[13px] text-[#8E8E93] truncate w-32 md:w-40 mt-0.5 font-medium">{song.artist} • <span className="text-white/60">{song.timeStr}</span></p>
            </div>
        </div>
    </div>
);

const MobileHeroCard = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="glass-morph rounded-[28px] p-7 shadow-xl border border-white/[0.15]">
        <h1 className="text-[26px] font-bold text-white leading-tight tracking-tight">{title}</h1>
        <p className="text-[14px] text-white/70 mt-3 leading-relaxed font-medium">{subtitle}</p>
    </div>
);

const MobileArtistCard = ({ artist, rank, image, onClick }: { artist: Artist; rank: number; image?: string; onClick?: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className="relative w-[220px] h-[280px] shrink-0 snap-start rounded-[32px] overflow-hidden shadow-2xl border border-white/[0.12] bg-[#1C1C1E]/90 active:scale-[0.97] transition-transform"
    >
        <img
            src={image || artist.image || `https://ui-avatars.com/api/?name=${artist.name}&background=1DB954&color=fff`}
            alt={artist.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/75" />
        <div className="absolute top-4 left-4 text-white text-[28px] font-bold drop-shadow-2xl number-display">{rank}</div>
        <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
            <p className="text-[19px] font-bold text-white leading-tight tracking-tight drop-shadow-lg">{artist.name}</p>
            <p className="text-[14px] text-white/80 mt-1 font-medium">{artist.timeStr}</p>
        </div>
    </button>
);

const MobileListRow = ({ rank, cover, title, subtitle, meta }: { rank: number; cover: string; title: string; subtitle: string; meta?: string }) => (
    <div className="flex items-center gap-3 py-3 active:bg-white/5 transition-colors rounded-xl px-1">
        <div className="w-8 text-center text-[15px] font-semibold text-white/50 flex-shrink-0 number-display">{rank}</div>
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 shadow-md">
            <img src={cover} alt={title} loading="lazy" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-white truncate leading-tight tracking-tight">{title}</p>
            <p className="text-[13px] text-white/60 truncate mt-0.5 font-medium">{subtitle}</p>
        </div>
        {meta && <div className="text-[12px] text-white/50 whitespace-nowrap font-medium flex-shrink-0 number-display">{meta}</div>}
    </div>
);

import { SeeAllModal } from './components/SeeAllModal';
import PrismaticBurst from './components/reactbits/PrismaticBurst';
import Aurora from './components/reactbits/Aurora';

const WRAPPED_COVER_POSITIONS = [
    { top: '5%', left: '2%', rotate: -15, size: 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28', delay: 0 },
    { top: '8%', right: '5%', rotate: 12, size: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24', delay: 0.1 },
    { top: '20%', left: '15%', rotate: -8, size: 'w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20', delay: 0.2 },
    { top: '15%', right: '12%', rotate: 20, size: 'w-18 h-18 sm:w-22 sm:h-22 md:w-28 md:h-28', delay: 0.15 },
    { bottom: '25%', left: '5%', rotate: 10, size: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24', delay: 0.3 },
    { bottom: '18%', right: '3%', rotate: -18, size: 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28', delay: 0.25 },
    { bottom: '8%', left: '20%', rotate: 5, size: 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20', delay: 0.35 },
    { bottom: '5%', right: '15%', rotate: -10, size: 'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24', delay: 0.4 },
    { top: '35%', left: '-2%', rotate: 22, size: 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20', delay: 0.2 },
    { top: '30%', right: '-1%', rotate: -25, size: 'w-14 h-14 sm:w-18 sm:h-18 md:w-22 md:h-22', delay: 0.3 },
    { bottom: '35%', left: '12%', rotate: 15, size: 'w-12 h-12 sm:w-14 sm:h-14 md:w-18 md:h-18', delay: 0.45 },
    { bottom: '30%', right: '10%', rotate: -8, size: 'w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20', delay: 0.5 },
] as const;

function App() {
  const hasAuthCallback = window.location.search.includes('code=') || window.location.hash.includes('access_token=');
  const authFlowHandledRef = useRef(false);
  const [token, setToken] = useState<string | null>(localStorage.getItem('spotify_token'));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [authenticating, setAuthenticating] = useState(hasAuthCallback);
  const [connecting, setConnecting] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [dbUnifiedData, setDbUnifiedData] = useState<any>(null);
  // Persist images to prevent reloading glitches
  const [artistImages, setArtistImages] = useState<Record<string, string>>(() => {
      try {
          const saved = localStorage.getItem('artist_images_cache');
          return saved ? JSON.parse(saved) : {};
      } catch (e) { return {}; }
  });

  // Top Artist/Album/Song Modal States
  const [selectedTopArtist, setSelectedTopArtist] = useState<Artist | null>(null);
  const [selectedTopAlbum, setSelectedTopAlbum] = useState<Album | null>(null);
  const [selectedTopSong, setSelectedTopSong] = useState<Song | null>(null);

  // See All Modal State
  const [seeAllModal, setSeeAllModal] = useState<{ isOpen: boolean; title: string; items: any[]; type: 'artist' | 'album' | 'song' }>({
      isOpen: false,
      title: '',
      items: [],
      type: 'artist'
  });

  // AI Discovery Modal State
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Wrapped Under Construction Message State
  const [showWrappedMessage, setShowWrappedMessage] = useState(false);

  // Dynamic aura colors extracted from item images
  const [auraColor, setAuraColor] = useState<string>('#FA2D48');

  // Extract aura color when a top item modal opens
  useEffect(() => {
    if (selectedTopArtist) {
      const imgUrl = artistImages[selectedTopArtist.name] || selectedTopArtist.image || '';
      extractDominantColor(imgUrl).then(setAuraColor);
    } else if (selectedTopAlbum) {
      extractDominantColor(selectedTopAlbum.cover || '').then(setAuraColor);
    } else if (selectedTopSong) {
      extractDominantColor(selectedTopSong.cover || '').then(setAuraColor);
    } else {
      setAuraColor('#FA2D48');
    }
  }, [selectedTopArtist, selectedTopAlbum, selectedTopSong, artistImages]);

  // Fetch Artist Images when data loads
  useEffect(() => {
    const loadImages = async () => {
        if (!token) return;
        const artistsToFetch = new Set<string>();
        
        // 1. Get names from Top Artists (using robust fallback)
        const topArtists = (dbUnifiedData?.artists?.length > 0) ? dbUnifiedData.artists : (data?.artists || []);
        topArtists.slice(0, 15).forEach((a: Artist) => artistsToFetch.add(a.name));

        // 2. Get names from Recent to help Trending
        const recent = dbUnifiedData?.recentPlays || data?.recentRaw || [];
        recent.slice(0, 50).forEach((p: any) => artistsToFetch.add(p.artist_name));

        if (artistsToFetch.size === 0) return;

        const needed = Array.from(artistsToFetch).filter(name => !artistImages[name]);
        
        if (needed.length > 0) {
            try {
                const newImages = await fetchArtistImages(token, needed);
                setArtistImages(prev => {
                    const next = { ...prev, ...newImages };
                    localStorage.setItem('artist_images_cache', JSON.stringify(next));
                    return next;
                });
            } catch (e) {
                console.error("BG Image Fetch Error", e);
            }
        }
    };
    
    // De-bounce slightly or just run when data settles
    if (dbUnifiedData || (data && data.artists && data.artists.length > 0)) {
        loadImages();
    }
  }, [dbUnifiedData, data, token]);

  const [timeRange, setTimeRange] = useState<'Daily' | 'Weekly' | 'Monthly' | 'All Time' | 'Custom'>('Weekly');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  
  // Ref to track current fetch to prevent race conditions
  const fetchIdRef = useRef(0);

      // Function to refresh DB view
      const refreshDbStats = async () => {
          // Increment fetch ID to track this specific request
          const currentFetchId = ++fetchIdRef.current;
          const requestedRange = timeRange; // Capture current value
          
          console.log(`[App] 📊 Refreshing DB Stats for ${requestedRange}... (fetchId: ${currentFetchId})`);
          try {
            const stats = await fetchListeningStats();
            const dashboardStuff = await fetchDashboardStats(requestedRange);
            
            // Check if this request is still the latest one
            if (currentFetchId !== fetchIdRef.current) {
                console.log(`[App] ⚠️ Discarding stale response for ${requestedRange} (fetchId: ${currentFetchId}, current: ${fetchIdRef.current})`);
                return; // Discard stale response
            }
            
            // Fetch dynamic charts for AI context
            const currentCharts = await fetchCharts(requestedRange.toLowerCase() as any);
            
            console.log(`[App] ✅ Dashboard Stats for ${requestedRange}:`, { 
                hasStats: !!stats, 
                artistCount: dashboardStuff?.artists?.length || 0,
                songCount: dashboardStuff?.songs?.length || 0,
                albumCount: dashboardStuff?.albums?.length || 0
            });

            if (dashboardStuff) {
                const safeStats = stats ?? {};
                setDbStats({ ...safeStats, charts: currentCharts });
                setDbUnifiedData(dashboardStuff);
            }
          } catch (e) {
              console.error("[App] refreshDbStats failed:", e);
          }
      };

  // Realtime Subscription for Instant Updates
  useEffect(() => {
     const channel = supabase
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'listening_history'
            },
            (payload) => {
                console.log('Realtime change detected:', payload);
                refreshDbStats();
            }
        )
        .subscribe();

     return () => {
         supabase.removeChannel(channel);
     };
  }, []);

  // Sync Data to Supabase when data is loaded
  useEffect(() => {
      const syncAndFetchStats = async () => {
        if (data && data.recentRaw) {
             // Use syncRecentPlays as the source of truth, pass token for image backfill
             await syncRecentPlays(data.recentRaw, token); 
             
             // Refresh stats after every sync to ensure live updates
             refreshDbStats();
        }
      };
      if (token && data) syncAndFetchStats();
  }, [data]);

  // Refresh data when timeRange changes
  useEffect(() => {
      if (token) refreshDbStats();
  }, [timeRange]);


  // Polling Effect - Refresh every 10 seconds (as requested by user)
  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
        if (!token) return;
        try {
            let spotifyData = await fetchSpotifyData(token);
            
            if (!spotifyData) {
                // Attempt auto-refresh in background loop
                const newToken = await refreshAccessToken();
                if (newToken) {
                    setToken(newToken);
                    spotifyData = await fetchSpotifyData(newToken);
                }
            }

            if (spotifyData) {
                setData(spotifyData);
            }
        } catch (e) {
            console.error("Critical Load Error", e);
        } finally {
             setLoading(false);
        }
    };

    // Initial load
    setLoading(true);
    loadData().then(() => setLoading(false));

    // Polling for Spotify Data & Recently Played (30s)
    const spotifyInterval = setInterval(() => {
        loadData();
    }, 30000);

    // Also refresh DB stats regularly to keep UI in sync with potential remote changes
    const dbInterval = setInterval(() => {
        if (token) refreshDbStats();
    }, 30000);

    return () => {
        clearInterval(spotifyInterval);
        clearInterval(dbInterval);
    };
  }, [token]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Escape - Close any modal
        if (e.key === 'Escape') {
            setSelectedTopArtist(null);
            setSelectedTopAlbum(null);
            setSelectedTopSong(null);
            setSeeAllModal(prev => ({ ...prev, isOpen: false }));
        }
        
        // Cmd/Ctrl + K - Focus AI search
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            const searchInput = document.querySelector('[placeholder*="ask me something"]') as HTMLInputElement;
            if (searchInput) {
                searchInput.focus();
                searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (authFlowHandledRef.current) return;
    authFlowHandledRef.current = true;

    const handleAuth = async () => {
      // Check for Auth Code (PKCE - New Standard)
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const urlToken = !code ? getTokenFromUrl() : null;
      if (!code && !urlToken) {
        setAuthenticating(false);
        return;
      }
      
      try {
        if (code) {
          try {
            const accessToken = await getAccessToken(code);
            if (accessToken) {
                setToken(accessToken);
                localStorage.setItem('spotify_token', accessToken);
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (e) {
            console.error(e);
          }
          return;
        }

        // Check URL for token (Implicit Grant - Legacy Backup)
        if (urlToken) {
            setToken(urlToken);
            localStorage.setItem('spotify_token', urlToken);
            window.location.hash = '';
        }
      } finally {
        setAuthenticating(false);
      }
    };
    handleAuth();
  }, []);

  useEffect(() => {
    if (token) {
        fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    let result = await fetchSpotifyData(token);
    
    if (!result) {
        // Token might be expired, try to refresh
        console.log("Token expired, attempting refresh...");
        const newToken = await refreshAccessToken();
        if (newToken) {
            setToken(newToken);
            result = await fetchSpotifyData(newToken);
        }
    }

    if (result) {
        setData(result);
    } else {
        // Token and refresh failed
        setToken(null);
        localStorage.removeItem('spotify_token');
        localStorage.removeItem('spotify_refresh_token');
    }
    setLoading(false);
  };

  // Ensure favicon is updated based on top album if available
  useEffect(() => {
    if (data && data.albums && data.albums.length > 0) {
        const randomAlbum = data.albums[Math.floor(Math.random() * Math.min(data.albums.length, 5))];
        const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
        // @ts-ignore
        link.type = 'image/jpeg';
        // @ts-ignore
        link.rel = 'icon';
        // @ts-ignore
        link.href = randomAlbum.cover;
        document.getElementsByTagName('head')[0].appendChild(link);
        
        // Also update title incase it wasn't
        document.title = "Punky | Your Music DNA";
    }
  }, [data]);

  const handleConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      await redirectToAuthCodeFlow();
    } catch (e) {
      console.error(e);
    } finally {
      setConnecting(false);
    }
  };

  const handleGetInsight = async (query?: string) => {
    setLoadingInsight(true);
    setInsight(null);
    
    // Combine data sources for AI context
    const statsContext = {
        ...dbUnifiedData,
        weeklyStats: dbStats
    };

    try {
        const aiResponse = await generateMusicInsight(query || "Give me a daily recap", statsContext);
        setInsight(aiResponse);
    } catch (e) {
        setInsight("I had a glitch connecting to the music brain. Try again!");
    }
    setLoadingInsight(false);
  };

  // ONLY fallback to Spotify data if DB is strictly empty, but we expect DB to have data now with rolling windows
  // If user has 0 database plays, then we might show Spotify data, which is acceptable as a "seed" state.
  // But to respect "use the database", we rely on the fact that if they have History, they have Stats.
  // UPDATE: User requested "Start Listening" if no data. Do NOT fallback to Spotify.

  const hasDbData = dbUnifiedData && 
                    (dbUnifiedData.artists?.length > 0 || 
                     dbUnifiedData.songs?.length > 0 || 
                     dbUnifiedData.albums?.length > 0);

  const safeArtists = dbUnifiedData?.artists || [];
  const safeAlbums = dbUnifiedData?.albums || [];
  const safeSongs = dbUnifiedData?.songs || [];
  const safeRecent = dbUnifiedData?.recentPlays || data?.recentRaw || []; // Recent plays can still come from Spotify recent for immediate feedback? 
                                                                          // Actually user said "always use the database". 
                                                                          // But recent plays are usually synced. stick to DB for charts. 
                                                                          // Keep recentPlays logic hybrid for responsiveness, or strict DB?
                                                                          // User said "if it is daily and i did not lsisne song ... tell the user start listening"
                                                                          // So we should be strict.

  const selectedArtistStats = useMemo(() => {
      if (!selectedTopArtist) return null;

      const artistName = selectedTopArtist.name;
      const artistPlays = safeRecent.filter((play: any) => play.artist_name === artistName || play.artist === artistName);
      const totalPlaysAllArtists = safeArtists.reduce((sum: number, artist: Artist) => sum + (artist.totalListens || 0), 0);
      const popularityScore = totalPlaysAllArtists > 0
          ? Math.round(((selectedTopArtist.totalListens || 0) / totalPlaysAllArtists) * 100)
          : 0;

      const dayCounts: Record<string, number> = {};
      const uniqueDays = new Set<string>();
      artistPlays.forEach((play: any) => {
          if (!play.played_at) return;
          const date = new Date(play.played_at);
          if (Number.isNaN(date.getTime())) return;
          uniqueDays.add(date.toISOString().slice(0, 10));
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;
      });

      const activeDays = uniqueDays.size;
      const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

      return {
          popularityScore,
          activeDays,
          peakDay
      };
  }, [selectedTopArtist, safeArtists, safeRecent]);
  
  // Strict DB check for charts
  const showEmptyState = !loading && dbUnifiedData && !hasDbData;

  if (!token && authenticating) {
      return (
          <Layout user={null} currentTrack={null}>
              <div className="flex h-[80vh] flex-col items-center justify-center gap-6 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6 animate-pulse">
                          <Music className="w-8 h-8 text-white opacity-50" />
                      </div>
                      <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Finishing Sign In</h3>
                      <p className="text-[#8E8E93] text-sm animate-pulse">Completing your Spotify authentication...</p>
                  </div>
              </div>
          </Layout>
      );
  }

  if (!token) {
      return (
          <div className="min-h-[100dvh] min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center p-6 relative overflow-hidden">
              <div className="absolute inset-0">
                  <div className="absolute top-[-20%] left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#FA2D48]/[0.06] blur-[120px]" />
                  <div className="absolute bottom-[-20%] right-[-10%] h-[400px] w-[400px] rounded-full bg-white/[0.03] blur-[140px]" />
              </div>

              <div className="relative w-full max-w-md p-8 md:p-12 z-10 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-white rounded-[24px] flex items-center justify-center mb-8 shadow-[0_0_60px_rgba(255,255,255,0.1)]">
                      <Music className="w-10 h-10 text-black" strokeWidth={2.5} />
                  </div>
                  
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3 text-white">Punky Stats</h1>
                  <p className="text-[#8E8E93] text-base max-w-sm leading-relaxed mb-10 font-medium">
                      Your listening DNA. Real-time charts, AI insights, and your personalized music story.
                  </p>
                  
                  <button 
                    onClick={handleConnect}
                    disabled={connecting}
                    className="w-full max-w-xs bg-white hover:bg-gray-100 text-black font-bold text-base py-4 rounded-2xl transition-all active:scale-[0.97] shadow-lg shadow-white/5"
                  >
                    {connecting ? 'Connecting...' : 'Connect with Spotify'}
                  </button>
                  
                  <p className="mt-6 text-[11px] text-[#505055] font-semibold tracking-widest uppercase">
                      Secure Access • Read-only
                  </p>
              </div>
          </div>
      );
  }



  if (loading || !data) {
      return (
          <Layout user={null} currentTrack={null}>
              <div className="flex h-[80vh] flex-col items-center justify-center gap-6 relative overflow-hidden">
                  <div className="relative z-10 flex flex-col items-center">
                      <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6 animate-pulse">
                          <Music className="w-8 h-8 text-white opacity-50" />
                      </div>
                      <h3 className="text-2xl font-bold text-white tracking-tight mb-2">Syncing Library</h3>
                      <p className="text-[#8E8E93] text-sm animate-pulse">Analyzing your listening history...</p>
                  </div>
                  
                  {/* Modern Minimal Loader */}
                  <div className="flex gap-1 mt-4">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                  </div>

                  {loading === false && !data && (
                      <button 
                        onClick={handleConnect}
                        disabled={connecting}
                        className="mt-8 px-8 py-3 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors z-10"
                      >
                        {connecting ? 'Connecting...' : 'Retry Connection'}
                      </button>
                  )}
              </div>
          </Layout>
      );
  }


    
  return (
    <>
    <Layout user={data.user} currentTrack={data.currentTrack}>
        <div className="lg:hidden space-y-10 safe-area-bottom safe-area-top safe-area-x px-4">
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-bold">Your Stats</p>
                        <h2 className="text-[26px] font-bold text-white mt-1">Hey {data.user?.display_name || 'there'}</h2>
                    </div>
                    {data.user?.images?.[0]?.url && (
                        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shadow-xl">
                            <img src={data.user.images[0].url} alt={data.user.display_name} loading="lazy" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile AI Search Bar */}
            <div className="space-y-3">
                <AISearchBar
                    token={token}
                    history={safeRecent}
                    user={data.user}
                    contextData={{
                        userName: data.user?.display_name,
                        artists: safeArtists.map((a: Artist, idx: number) => {
                            const time = String(a.timeStr || '');
                            const mins = time.replace('m', '');
                            return `Rank #${idx + 1}: ${a.name} (${mins} minutes listened, ${a.totalListens || 0} plays)`;
                        }),
                        albums: safeAlbums.map((a: Album, idx: number) => {
                            const time = String(a.timeStr || '');
                            const mins = time.replace('m', '');
                            return `Rank #${idx + 1}: ${a.title} by ${a.artist} (${mins} minutes, ${a.totalListens || 0} plays)`;
                        }),
                        songs: safeSongs.map((s: Song, idx: number) => {
                            const time = String(s.timeStr || '');
                            const mins = time.replace('m', '');
                            return `Rank #${idx + 1}: ${s.title} by ${s.artist} (${mins} minutes, ${s.listens || 0} plays)`;
                        }),
                        globalStats: dbStats
                    }}
                />
                
                {/* Mobile Punky Wrapped Button */}
                <button
                    onClick={() => setShowWrappedMessage(true)}
                    className="w-full rounded-2xl p-5 border border-white/10 hover:border-white/20 active:scale-[0.98] transition-all relative overflow-hidden"
                >
                    <div className="absolute inset-0 z-0">
                        <PrismaticBurst animationType="rotate3d" intensity={1.5} speed={0.3} colors={['#FA2D48', '#7C3AED', '#ffffff']} mixBlendMode="lighten" />
                    </div>
                    <div className="absolute inset-0 bg-black/60 z-[1]" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="text-left">
                            <h3 className="text-[15px] font-bold text-white tracking-tight">Punky Wrapped</h3>
                            <p className="text-[12px] text-white/60 font-medium">View your story</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/60 flex-shrink-0" />
                    </div>
                </button>
            </div>

            <div className="flex gap-2 p-1.5 overflow-x-auto no-scrollbar rounded-2xl border border-white/10 bg-white/5 mb-2">
                {(['Daily', 'Weekly', 'Monthly', 'All Time'] as const).map((range) => (
                    <button
                        key={range}
                        onClick={() => {
                            setTimeRange(range);
                            setCustomDateRange(null);
                            fetchDashboardStats(range).then(data => setDbUnifiedData(data));
                        }}
                        aria-pressed={timeRange === range}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                            timeRange === range
                                ? 'bg-white text-black'
                                : 'text-white/70 hover:text-white hover:bg-white/10'
                        }`}
                    >
                        {range}
                    </button>
                ))}
                <button
                    onClick={() => setShowDatePicker(true)}
                    aria-pressed={timeRange === 'Custom'}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                        timeRange === 'Custom'
                            ? 'bg-white text-black'
                            : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                >
                    <Calendar size={14} />
                    {timeRange === 'Custom' && customDateRange 
                        ? `${new Date(customDateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(customDateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : 'Custom Range'}
                </button>
            </div>

            {showEmptyState ? (
                <div className="flex flex-col items-center justify-center py-16 bg-[#1C1C1E] rounded-3xl border border-white/5 animate-in fade-in zoom-in-95 duration-500 text-center">
                    <Music size={40} className="text-white/20 mb-3" />
                    <h3 className="text-lg font-bold text-white">No data yet</h3>
                    <p className="text-[#8E8E93] text-sm mt-2 px-6">
                        Start listening to music to see your {timeRange.toLowerCase()} stats appear here.
                    </p>
                </div>
            ) : (
                <>
                    <section className="space-y-5">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[20px] font-bold text-white tracking-tight">Your Top Artists</h3>
                            {safeArtists.length > 0 && (
                                <button
                                    onClick={() => setSeeAllModal({
                                        isOpen: true,
                                        title: 'Top Artists',
                                        items: safeArtists,
                                        type: 'artist'
                                    })}
                                    className="text-[12px] font-bold text-white/60 uppercase tracking-wider hover:text-white transition-colors"
                                >
                                    See all
                                </button>
                            )}
                        </div>
                        {safeArtists.length > 0 ? (
                            <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar snap-x px-1">
                                {safeArtists.slice(0, 6).map((artist: Artist, index: number) => (
                                    <MobileArtistCard
                                        key={artist.id}
                                        artist={artist}
                                        rank={index + 1}
                                        image={artistImages[artist.name]}
                                        onClick={() => setSelectedTopArtist(artist)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-[#8E8E93] text-sm italic px-1">Not enough data to rank artists yet.</p>
                        )}
                    </section>

                    <section className="space-y-5">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[20px] font-bold text-white tracking-tight">Top Songs</h3>
                            {safeSongs.length > 0 && (
                                <button
                                    onClick={() => setSeeAllModal({
                                        isOpen: true,
                                        title: 'Top Songs',
                                        items: safeSongs,
                                        type: 'song'
                                    })}
                                    className="text-[12px] font-bold text-white/60 uppercase tracking-wider hover:text-white transition-colors"
                                >
                                    See all
                                </button>
                            )}
                        </div>
                        <div className="glass-morph rounded-[28px] px-5 py-3 border border-white/[0.15]">
                            {safeSongs.length > 0 ? (
                                safeSongs.slice(0, 6).map((song: Song, index: number) => (
                                    <div key={song.id} onClick={() => setSelectedTopSong(song)} className="cursor-pointer">
                                        <MobileListRow
                                            rank={index + 1}
                                            cover={song.cover}
                                            title={song.title}
                                            subtitle={song.artist}
                                            meta={song.timeStr}
                                        />
                                    </div>
                                ))
                            ) : (
                                <p className="text-[#8E8E93] text-sm py-8 text-center italic">Not enough data to rank songs yet.</p>
                            )}
                        </div>
                    </section>

                    {/* Mobile Upcoming Artists */}
                    <section className="space-y-5">
                        <UpcomingArtists
                            recentPlays={safeRecent}
                            topArtists={safeArtists}
                            artistImages={artistImages}
                        />
                    </section>

                    <section className="space-y-5">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[20px] font-bold text-white tracking-tight">Top Albums</h3>
                            {safeAlbums.length > 0 && (
                                <button
                                    onClick={() => setSeeAllModal({
                                        isOpen: true,
                                        title: 'Top Albums',
                                        items: safeAlbums,
                                        type: 'album'
                                    })}
                                    className="text-[12px] font-bold text-white/60 uppercase tracking-wider hover:text-white transition-colors"
                                >
                                    See all
                                </button>
                            )}
                        </div>
                        {safeAlbums.length > 0 ? (
                            <div className="flex gap-4 overflow-x-auto pb-3 no-scrollbar snap-x px-1">
                                {safeAlbums.slice(0, 6).map((album: Album, index: number) => (
                                    <div key={album.id} className="w-[150px] shrink-0 snap-start group cursor-pointer" onClick={() => setSelectedTopAlbum(album)}>
                                        <div className="relative w-full h-[150px] rounded-[24px] overflow-hidden shadow-xl border-2 border-white/[0.1] active:scale-95 transition-transform">
                                            <img src={album.cover} alt={album.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                                            <div className="absolute top-3 left-3 text-white text-[17px] font-bold bg-black/50 backdrop-blur-md w-8 h-8 rounded-full flex items-center justify-center shadow-lg number-display">{index + 1}</div>
                                        </div>
                                        <p className="mt-3 text-[14px] font-semibold text-white truncate tracking-tight">{album.title}</p>
                                        <p className="text-[12px] text-white/60 truncate mt-0.5 font-medium">{album.artist}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[#8E8E93] text-sm italic px-1">Not enough data to rank albums yet.</p>
                        )}
                    </section>



                    {/* Mobile Obsession Orbit */}
                    <section className="space-y-5">
                        <div className="overflow-hidden">
                            <TrendingArtists 
                                artists={safeArtists}
                                albums={safeAlbums}
                                songs={safeSongs}
                                recentPlays={safeRecent}
                                artistImages={artistImages}
                                timeRange={timeRange}
                            />
                        </div>
                    </section>

                    {/* Mobile Activity Heatmap */}
                    <section className="space-y-5">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[20px] font-bold text-white tracking-tight">Activity Heatmap</h3>
                        </div>
                        <div className="glass-morph rounded-[28px] p-5 overflow-hidden border border-white/[0.15] shadow-xl">
                            <ActivityHeatmap history={safeRecent} />
                        </div>
                    </section>

                    {/* Mobile AI Discovery Button */}
                    <section className="space-y-5" id="mobile-ai-chat">
                        <button
                            onClick={() => setAiModalOpen(true)}
                            className="w-full glass-morph rounded-[28px] p-7 shadow-xl border border-white/[0.15] active:scale-[0.98] transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div className="text-left">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-[#1C1C1E] flex items-center justify-center border border-white/10">
                                            <Sparkles className="w-5 h-5 text-[#FA2D48]" />
                                        </div>
                                        <h3 className="text-[20px] font-bold text-white tracking-tight">AI Discovery</h3>
                                    </div>
                                    <p className="text-[14px] text-white/70 font-medium">Ask questions about your music</p>
                                </div>
                                <MessageSquare className="w-7 h-7 text-[#FA2D48] flex-shrink-0" />
                            </div>
                        </button>
                    </section>
                </>
            )}
        </div>

        <div className="hidden lg:block">
            {/* SECTION 1: AI DISCOVERY - Search Bar */}
            <div className="mb-8 mt-8">
                <AISearchBar
                    token={token}
                    history={safeRecent}
                    user={data.user}
                    contextData={{
                        userName: data.user?.display_name,
                        artists: safeArtists.map((a: Artist, idx: number) => {
                            const time = String(a.timeStr || '');
                            const mins = time.replace('m', '');
                            return `Rank #${idx + 1}: ${a.name} (${mins} minutes listened, ${a.totalListens || 0} plays)`;
                        }),
                        albums: safeAlbums.map((a: Album, idx: number) => {
                            const time = String(a.timeStr || '');
                            const mins = time.replace('m', '');
                            return `Rank #${idx + 1}: ${a.title} by ${a.artist} (${mins} minutes, ${a.totalListens || 0} plays)`;
                        }),
                        songs: safeSongs.map((s: Song, idx: number) => {
                            const time = String(s.timeStr || '');
                            const mins = time.replace('m', '');
                            return `Rank #${idx + 1}: ${s.title} by ${s.artist} (${mins} minutes, ${s.listens || 0} plays)`;
                        }),
                        globalStats: dbStats
                    }}
                />
            </div>
            
            {/* Desktop Punky Wrapped Button */}
            <div className="mb-16">
                <button
                    onClick={() => setShowWrappedMessage(true)}
                    className="w-full rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all group active:scale-[0.99] relative overflow-hidden"
                >
                    <div className="absolute inset-0 z-0">
                        <PrismaticBurst animationType="rotate3d" intensity={1.5} speed={0.3} colors={['#FA2D48', '#7C3AED', '#ffffff']} mixBlendMode="lighten" />
                    </div>
                    <div className="absolute inset-0 bg-black/60 z-[1]" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="text-left">
                            <h3 className="text-[15px] font-bold text-white tracking-tight">Punky Wrapped</h3>
                            <p className="text-[12px] text-white/60 font-medium">View your story</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transition-colors flex-shrink-0" />
                    </div>
                </button>
            </div>

            {/* SECTION 2: TOP RANKINGS - Prominent Showcase */}
            <div className="mb-20">
                <div className="flex items-center justify-between mb-8 px-1">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Your Top Charts</h2>
                        <p className="text-[#8E8E93] text-sm mt-1">Your most played this {timeRange.toLowerCase()}</p>
                    </div>
                    <div className="flex gap-2 p-1.5 rounded-2xl border border-white/10 bg-white/5 overflow-x-auto no-scrollbar">
                        {(['Daily', 'Weekly', 'Monthly', 'All Time'] as const).map((range) => (
                            <button 
                                key={range}
                                onClick={() => {
                                    setTimeRange(range);
                                    setCustomDateRange(null);
                                    fetchDashboardStats(range).then(data => setDbUnifiedData(data));
                                }}
                                aria-pressed={timeRange === range}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    timeRange === range 
                                        ? 'bg-white text-black' 
                                        : 'text-[#8E8E93] hover:text-white hover:bg-white/10'
                                }`}
                            >
                                {range}
                            </button>
                        ))}
                        <button
                            onClick={() => setShowDatePicker(true)}
                            aria-pressed={timeRange === 'Custom'}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                                timeRange === 'Custom'
                                    ? 'bg-white text-black'
                                    : 'text-[#8E8E93] hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <Calendar size={14} />
                            {timeRange === 'Custom' && customDateRange
                                ? `${new Date(customDateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(customDateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                : 'Custom'}
                        </button>
                    </div>
                </div>
                
                {showEmptyState ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-[#1C1C1E] rounded-3xl border border-white/5 animate-in fade-in zoom-in-95 duration-500">
                        <Music size={48} className="text-white/20 mb-4" />
                        <h3 className="text-xl font-bold text-white">No data for this period</h3>
                        <p className="text-[#8E8E93] max-w-sm text-center mt-2">
                            Start listening to music to see your {timeRange.toLowerCase()} stats appear here!
                        </p>
                    </div>
                ) : (
                <div key={timeRange} className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                    {/* TOP ARTISTS */}
                    <div>
                        <div className="flex justify-between items-center mb-6 px-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-[20px] font-bold text-white tracking-tight">Top Artists</h3>
                            </div>
                            {safeArtists.length > 0 && (
                            <button 
                                onClick={() => setSeeAllModal({ 
                                    isOpen: true, 
                                    title: 'Top Artists', 
                                    items: safeArtists,
                                    type: 'artist' 
                                })}
                                className="text-xs font-bold text-white hover:text-white/70 transition-colors uppercase tracking-wider"
                            >
                                See All
                            </button>
                            )}
                        </div>
                        {safeArtists.length > 0 ? (
                            <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-6 scroll-smooth gap-0">
                                {safeArtists.slice(0, 8).map((artist: Artist, index: number) => (
                                    <RankedArtist 
                                        key={artist.id} 
                                        artist={artist} 
                                        rank={index + 1} 
                                        realImage={artistImages[artist.name]} 
                                        onClick={() => setSelectedTopArtist(artist)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-[#8E8E93] text-sm pl-6 italic">Not enough data to rank artists yet.</p>
                        )}
                    </div>

                    {/* TOP ALBUMS */}
                    <div>
                        <div className="flex justify-between items-center mb-6 px-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-[20px] font-bold text-white tracking-tight">Top Albums</h3>
                            </div>
                            {safeAlbums.length > 0 && (
                            <button 
                                onClick={() => setSeeAllModal({ 
                                    isOpen: true, 
                                    title: 'Top Albums', 
                                    items: safeAlbums,
                                    type: 'album' 
                                })}
                                className="text-xs font-bold text-white hover:text-white/70 transition-colors uppercase tracking-wider"
                            >
                                See All
                            </button>
                            )}
                        </div>
                        {safeAlbums.length > 0 ? (
                            <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-6 scroll-smooth gap-0">
                                {safeAlbums.slice(0, 8).map((album: Album, index: number) => (
                                    <RankedAlbum key={album.id} album={album} rank={index + 1} onClick={() => setSelectedTopAlbum(album)} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-[#8E8E93] text-sm pl-6 italic">Not enough data to rank albums yet.</p>
                        )}
                    </div>

                    {/* TOP SONGS */}
                    <div>
                        <div className="flex justify-between items-center mb-6 px-1">
                            <div className="flex items-center gap-3">
                                <h3 className="text-[20px] font-bold text-white tracking-tight">Top Songs</h3>
                            </div>
                            {safeSongs.length > 0 && (
                            <button 
                                onClick={() => setSeeAllModal({ 
                                    isOpen: true, 
                                    title: 'Top Songs', 
                                    items: safeSongs,
                                    type: 'song' 
                                })}
                                className="text-xs font-bold text-white hover:text-white/70 transition-colors uppercase tracking-wider"
                            >
                                See All
                            </button>
                            )}
                        </div>
                        {safeSongs.length > 0 ? (
                            <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-6 scroll-smooth gap-0">
                                {safeSongs.slice(0, 8).map((song: Song, index: number) => (
                                    <RankedSong key={song.id} song={song} rank={index + 1} onClick={() => setSelectedTopSong(song)} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-[#8E8E93] text-sm pl-6 italic">Not enough data to rank songs yet.</p>
                        )}
                    </div>

                    {/* UPCOMING ARTISTS */}
                    <div>
                        <UpcomingArtists
                            recentPlays={safeRecent}
                            topArtists={safeArtists}
                            artistImages={artistImages}
                        />
                    </div>

                </div>
                )}
            </div>

            {/* SECTION 3: ORBIT + ANALYTICS DASHBOARD */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-20">
                {/* LEFT: OBSESSION ORBIT */}
                <div className="rounded-3xl p-6 relative overflow-hidden min-h-[600px] border-none bg-transparent">
                    
                    <TrendingArtists 
                        artists={safeArtists}
                        albums={safeAlbums}
                        songs={safeSongs}
                        recentPlays={safeRecent}
                        artistImages={artistImages}
                        timeRange={timeRange}
                    />
                </div>

                {/* RIGHT: WRAPPED + EXTRAS - empty for now */}
                <div className="space-y-8">
                </div>
                
            </div>
            
            {/* Activity Heatmap - Bottom */}
            <div className="mb-24 px-1">
                 <ActivityHeatmap history={safeRecent} />
            </div>
        </div>

    </Layout>

    {/* Global Modals - Moved Outside Layout to fix positioning context */}
    <SeeAllModal 
        isOpen={seeAllModal.isOpen}
        onClose={() => setSeeAllModal(prev => ({ ...prev, isOpen: false }))}
        title={seeAllModal.title}
        items={seeAllModal.items}
        type={seeAllModal.type}
    />

    {/* Artist Detail Modal - Apple Music Style */}
    <AnimatePresence>
        {selectedTopArtist && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 backdrop-blur-3xl bg-black/90"
                onClick={() => setSelectedTopArtist(null)}
            >
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute inset-0 opacity-40">
                        <Aurora colorStops={[auraColor, '#7C3AED', auraColor]} amplitude={AURORA_AMPLITUDE} blend={AURORA_BLEND} speed={AURORA_SPEED} />
                    </div>
                    <div className="absolute inset-0 bg-black/55" />
                </div>
                <div 
                    className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto no-scrollbar flex flex-col items-center" 
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Close Button */}
                    <button 
                        onClick={() => setSelectedTopArtist(null)}
                        className="absolute top-2 right-2 md:top-0 md:right-0 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all z-50 border border-white/[0.08] hover:scale-105 active:scale-95"
                    >
                        <X size={18} />
                    </button>

                    {/* Artist Spotlight Image */}
                    <motion.div 
                        initial={{ scale: 0.85, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 220, damping: 22 }}
                        className="relative z-10 mb-8 group"
                    >
                        <div className="w-40 h-40 md:w-56 md:h-56 rounded-full p-1.5 border-2 border-white/[0.12] bg-black shadow-2xl relative overflow-visible">
                            <div className="absolute -inset-4 rounded-full blur-3xl opacity-[0.15] group-hover:opacity-[0.25] transition-opacity duration-700" style={{ backgroundColor: auraColor }}></div>
                            <img 
                                src={artistImages[selectedTopArtist.name] || selectedTopArtist.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTopArtist.name)}&background=1C1C1E&color=fff`} 
                                className="w-full h-full object-cover rounded-full shadow-[0_30px_60px_rgba(0,0,0,0.6)] bg-[#1C1C1E]" 
                                alt={selectedTopArtist.name}
                            />
                            
                            {/* Rank Badge */}
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-1 rounded-full font-black text-xs shadow-xl border-2 border-black/10 whitespace-nowrap">
                                #{safeArtists.findIndex((a: Artist) => a.id === selectedTopArtist.id) + 1 || '?'}
                            </div>
                        </div>
                    </motion.div>

                    {/* Artist Name */}
                    <motion.h2 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-2xl md:text-4xl font-black text-white text-center mb-2 tracking-tight px-4"
                    >
                        {selectedTopArtist.name}
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.12 }}
                        className="text-[#8E8E93] text-sm mb-8"
                    >
                        {selectedTopArtist.timeStr || '0m'} listened
                    </motion.p>

                    {/* Stats Cards - Simplified and Cleaner */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                        className="grid grid-cols-3 gap-3 w-full max-w-md mb-8 px-3"
                    >
                        <div className="bg-gradient-to-br from-[#1C1C1E] to-[#121212] border border-white/[0.08] rounded-2xl p-4 flex flex-col items-center text-center hover:border-white/[0.15] transition-all">
                            <TrendingUp size={14} className="mb-2" style={{ color: auraColor }} />
                            <span className="text-2xl font-black text-white mb-0.5">{selectedTopArtist.totalListens || 0}</span>
                            <span className="text-[9px] uppercase tracking-[0.15em] text-[#8E8E93] font-bold">Plays</span>
                        </div>
                        <div className="bg-gradient-to-br from-[#1C1C1E] to-[#121212] border border-white/[0.08] rounded-2xl p-4 flex flex-col items-center text-center hover:border-white/[0.15] transition-all">
                            <Clock size={14} className="mb-2" style={{ color: auraColor }} />
                            <span className="text-2xl font-black text-white mb-0.5">{selectedTopArtist.timeStr ? String(selectedTopArtist.timeStr).replace('m', '') : '0'}</span>
                            <span className="text-[9px] uppercase tracking-[0.15em] text-[#8E8E93] font-bold">Minutes</span>
                        </div>
                        <div className="bg-gradient-to-br from-[#1C1C1E] to-[#121212] border border-white/[0.08] rounded-2xl p-4 flex flex-col items-center text-center hover:border-white/[0.15] transition-all">
                            <Sparkles size={14} className="mb-2" style={{ color: auraColor }} />
                            <span className="text-2xl font-black text-white mb-0.5">{selectedArtistStats?.popularityScore || 0}%</span>
                            <span className="text-[9px] uppercase tracking-[0.15em] text-[#8E8E93] font-bold">Of Time</span>
                        </div>
                    </motion.div>

                    {/* Top Tracks Section - More Compact */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="w-full max-w-md bg-gradient-to-b from-[#1C1C1E] to-[#121212] border border-white/[0.08] rounded-2xl p-4 mx-3"
                    >
                         <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Disc size={14} style={{ color: auraColor }} /> Top Tracks
                         </h3>
                         
                         <div className="space-y-1">
                            {(dbUnifiedData?.songs || [])
                                .filter((s: any) => s.artist_name === selectedTopArtist.name || s.artist === selectedTopArtist.name)
                                .sort((a: any, b: any) => (b.plays || b.listens || 0) - (a.plays || a.listens || 0))
                                .slice(0, 5)
                                .map((song: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2.5 p-2 hover:bg-white/5 rounded-lg transition-all group active:scale-[0.98]">
                                        <div className="text-[#8E8E93] font-mono text-xs w-4 font-bold text-right">{idx + 1}</div>
                                        <div className="w-9 h-9 rounded-md bg-[#2C2C2E] overflow-hidden flex-shrink-0 relative border border-white/5">
                                            <img src={song.cover || song.album_cover} className="w-full h-full object-cover" alt={song.title} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-semibold text-white truncate group-hover:text-[#FA2D48] transition-colors">
                                                {song.track_name || song.title}
                                            </div>
                                            <div className="text-[10px] text-[#8E8E93] font-medium">
                                                    {song.listens || song.plays || 0} plays
                                            </div>
                                        </div>
                                    </div>
                            ))}
                            {(dbUnifiedData?.songs || []).filter((s: any) => s.artist_name === selectedTopArtist.name || s.artist === selectedTopArtist.name).length === 0 && (
                                <p className="text-[#8E8E93] text-xs text-center py-4 italic">No track data available</p>
                            )}
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        )}
    </AnimatePresence>

    {/* Album Detail Modal - Apple Music Style */}
    <AnimatePresence>
        {selectedTopAlbum && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black"
                onClick={() => setSelectedTopAlbum(null)}
            >
                <div className="absolute inset-0 overflow-hidden">
                    <img 
                        src={selectedTopAlbum.cover} 
                        className="w-full h-full object-cover scale-110 blur-3xl opacity-20"
                        alt=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
                </div>

                <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="relative h-full overflow-y-auto no-scrollbar px-4 py-16"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        onClick={() => setSelectedTopAlbum(null)}
                        className="fixed top-4 right-4 sm:top-6 sm:right-6 p-2.5 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all z-50 border border-white/10 hover:scale-105 active:scale-95"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex flex-col items-center max-w-2xl mx-auto">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.1 }}
                            className="relative mb-6 group"
                        >
                            <div className="absolute -inset-4 rounded-2xl blur-3xl opacity-[0.2] group-hover:opacity-[0.3] transition-opacity duration-700" style={{ backgroundColor: auraColor }}></div>
                            <div className="w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-2xl overflow-hidden ring-4 ring-white/10 shadow-2xl relative">
                                <img 
                                    src={selectedTopAlbum.cover} 
                                    className="w-full h-full object-cover" 
                                    alt={selectedTopAlbum.title}
                                />
                            </div>
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-1 rounded-full font-bold text-xs shadow-xl">
                                #{safeAlbums.findIndex((a: Album) => a.id === selectedTopAlbum.id) + 1 || '?'}
                            </div>
                        </motion.div>

                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center tracking-tight mb-1"
                        >
                            {selectedTopAlbum.title}
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg text-white/70 mb-2"
                        >
                            {selectedTopAlbum.artist}
                        </motion.p>
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.22 }}
                            className="text-sm text-[#FA2D48] font-medium mb-6"
                        >
                            {selectedTopAlbum.timeStr || '0m'} listened
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="grid grid-cols-3 gap-3 w-full max-w-lg mb-8"
                        >
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                                <TrendingUp size={16} className="text-[#FA2D48] mb-1.5" />
                                <span className="text-xl font-bold text-white">{selectedTopAlbum.totalListens || selectedTopAlbum.listens || 0}</span>
                                <span className="text-[10px] uppercase tracking-wider text-[#8E8E93]">Plays</span>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                                <Clock size={16} className="text-[#FA2D48] mb-1.5" />
                                <span className="text-xl font-bold text-white">{selectedTopAlbum.timeStr ? String(selectedTopAlbum.timeStr).replace('m', '') : '0'}</span>
                                <span className="text-[10px] uppercase tracking-wider text-[#8E8E93]">Minutes</span>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                                <Disc size={16} className="text-[#FA2D48] mb-1.5" />
                                <span className="text-xl font-bold text-white">
                                    {(dbUnifiedData?.songs || []).filter((s: any) => (s.album === selectedTopAlbum.title || s.album_name === selectedTopAlbum.title) && (s.artist === selectedTopAlbum.artist || s.artist_name === selectedTopAlbum.artist)).length}
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-[#8E8E93]">Tracks</span>
                            </div>
                        </motion.div>

                        {/* Album Tracks - More Compact */}
                        <motion.div 
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="w-full max-w-md bg-gradient-to-b from-[#1C1C1E] to-[#121212] border border-white/[0.08] rounded-2xl p-4"
                        >
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <Music size={14} className="text-[#FA2D48]" /> Tracks
                            </h3>
                            <div className="space-y-1 max-h-64 overflow-y-auto no-scrollbar">
                                {(() => {
                                    // Normalize album/artist once to avoid repeated operations
                                    const normalizedAlbumTitle = (selectedTopAlbum.title || '').toLowerCase().trim();
                                    const normalizedAlbumArtist = (selectedTopAlbum.artist || '').toLowerCase().trim();
                                    
                                    const filteredTracks = (dbUnifiedData?.songs || [])
                                        .filter((s: any) => {
                                            const songAlbum = (s.album || s.album_name || '').toLowerCase().trim();
                                            const songArtist = (s.artist || s.artist_name || '').toLowerCase().trim();
                                            return songAlbum === normalizedAlbumTitle && songArtist === normalizedAlbumArtist;
                                        })
                                        .sort((a: any, b: any) => (b.plays || b.listens || 0) - (a.plays || a.listens || 0))
                                        .slice(0, 10);
                                    
                                    return filteredTracks.length === 0 ? (
                                        <p className="text-[#8E8E93] text-xs text-center py-4 italic">No track data available</p>
                                    ) : (
                                        filteredTracks.map((song: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded-lg transition-all group">
                                                <div className="text-[#8E8E93] font-mono text-xs w-4 font-bold text-right">{idx + 1}</div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-semibold text-white truncate group-hover:text-[#FA2D48] transition-colors">
                                                        {song.track_name || song.title}
                                                    </div>
                                                    <div className="text-[10px] text-[#8E8E93]">
                                                        {song.listens || song.plays || 0} plays
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    );
                                })()}
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>

    {/* Song Detail Modal */}
    <AnimatePresence>
        {selectedTopSong && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black"
                onClick={() => setSelectedTopSong(null)}
            >
                <div className="absolute inset-0 overflow-hidden">
                    <img 
                        src={selectedTopSong.cover} 
                        className="w-full h-full object-cover scale-110 blur-3xl opacity-30"
                        alt=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
                </div>

                <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 50, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="relative h-full overflow-y-auto no-scrollbar px-4 py-16"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        onClick={() => setSelectedTopSong(null)}
                        className="fixed top-4 right-4 sm:top-6 sm:right-6 p-2.5 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all z-50 border border-white/10 hover:scale-105 active:scale-95"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex flex-col items-center max-w-2xl mx-auto">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.1 }}
                            className="relative mb-6 group"
                        >
                            <div className="absolute -inset-4 rounded-2xl blur-3xl opacity-[0.2] group-hover:opacity-[0.3] transition-opacity duration-700" style={{ backgroundColor: auraColor }}></div>
                            <div className="w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-2xl overflow-hidden ring-4 ring-white/10 shadow-2xl relative">
                                <img 
                                    src={selectedTopSong.cover} 
                                    className="w-full h-full object-cover" 
                                    alt={selectedTopSong.title}
                                />
                            </div>
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-1 rounded-full font-bold text-xs shadow-xl">
                                #{safeSongs.findIndex((s: Song) => s.id === selectedTopSong.id) + 1 || '?'}
                            </div>
                        </motion.div>

                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center tracking-tight mb-1"
                        >
                            {selectedTopSong.title}
                        </motion.h1>
                        <motion.p 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg text-white/70 mb-2"
                        >
                            {selectedTopSong.artist}
                        </motion.p>
                        {selectedTopSong.album && (
                            <motion.p 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.22 }}
                                className="text-sm text-white/50 mb-4"
                            >
                                {selectedTopSong.album}
                            </motion.p>
                        )}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.25 }}
                            className="flex items-center gap-2 text-[#FA2D48] text-sm font-semibold mb-8"
                        >
                            <Music size={14} />
                            <span>{selectedTopSong.duration || '0:00'}</span>
                        </motion.div>

                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="grid grid-cols-3 gap-3 w-full max-w-lg mb-8"
                        >
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                                <TrendingUp size={16} className="text-[#FA2D48] mb-1.5" />
                                <span className="text-xl font-bold text-white">{selectedTopSong.listens || 0}</span>
                                <span className="text-[10px] uppercase tracking-wider text-[#8E8E93]">Plays</span>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                                <Clock size={16} className="text-[#FA2D48] mb-1.5" />
                                <span className="text-xl font-bold text-white">{selectedTopSong.timeStr ? String(selectedTopSong.timeStr).replace('m', '') : '0'}</span>
                                <span className="text-[10px] uppercase tracking-wider text-[#8E8E93]">Minutes</span>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center relative group">
                                <Sparkles size={16} className="text-[#FA2D48] mb-1.5" />
                                <span className="text-xl font-bold text-white">
                                    {selectedTopSong.listens ? Math.round((selectedTopSong.listens / (safeRecent.length || 1)) * 100) : 0}%
                                </span>
                                <span className="text-[10px] uppercase tracking-wider text-[#8E8E93]">Of Plays</span>
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 w-48">
                                    <div className="bg-[#1C1C1E] border border-white/10 rounded-lg px-3 py-2 shadow-xl">
                                        <p className="text-[10px] text-white/80 text-center leading-relaxed">
                                            This song represents this percentage of your total listening activity in the current time range.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>

    {/* AI Discovery Modal */}
    <AnimatePresence>
        {aiModalOpen && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] bg-[#0a0a0a]"
                style={{ height: '100dvh' }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3 }}
                    className="relative w-full h-full flex flex-col"
                    style={{ height: '100dvh' }}
                >
                    {/* Modal Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#FA2D48]/10 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-[#FA2D48]" />
                            </div>
                            <h2 className="text-base font-bold text-white tracking-tight">AI Discovery</h2>
                        </div>
                        <button
                            onClick={() => setAiModalOpen(false)}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* AI Spotlight Content */}
                    <div className="flex-1 overflow-hidden min-h-0 h-0">
                        <AISpotlight
                            token={token}
                            history={safeRecent}
                            user={data.user}
                            contextData={{
                                userName: data.user?.display_name,
                                artists: safeArtists.map((a: Artist, idx: number) => {
                                    const time = String(a.timeStr || '');
                                    const mins = time.replace('m', '');
                                    return `Rank #${idx + 1}: ${a.name} (${mins} minutes listened, ${a.totalListens || 0} plays)`;
                                }),
                                albums: safeAlbums.map((a: Album, idx: number) => {
                                    const time = String(a.timeStr || '');
                                    const mins = time.replace('m', '');
                                    return `Rank #${idx + 1}: ${a.title} by ${a.artist} (${mins} minutes, ${a.totalListens || 0} plays)`;
                                }),
                                songs: safeSongs.map((s: Song, idx: number) => {
                                    const time = String(s.timeStr || '');
                                    const mins = time.replace('m', '');
                                    return `Rank #${idx + 1}: ${s.title} by ${s.artist} (${mins} minutes, ${s.listens || 0} plays)`;
                                }),
                                globalStats: dbStats
                            }}
                        />
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>

    {/* Date Range Picker Modal */}
    <AnimatePresence>
        {showDatePicker && (
            <>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100]"
                    onClick={() => setShowDatePicker(false)}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:w-[90vw] max-w-md max-h-[calc(100vh-2rem)] bg-[#1C1C1E] rounded-2xl border border-white/10 shadow-2xl z-[101] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-6 border-b border-white/10">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold text-white">Custom Date Range</h2>
                            <button
                                onClick={() => setShowDatePicker(false)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <p className="text-sm text-[#8E8E93]">Select a custom date range for your stats</p>
                    </div>

                    {/* Date Inputs */}
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                max={new Date().toISOString().split('T')[0]}
                                onChange={(e) => {
                                    const newStart = e.target.value;
                                    setCustomDateRange(prev => ({
                                        start: newStart,
                                        end: prev?.end || new Date().toISOString().split('T')[0]
                                    }));
                                }}
                                value={customDateRange?.start || ''}
                                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FA2D48] transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                max={new Date().toISOString().split('T')[0]}
                                min={customDateRange?.start}
                                onChange={(e) => {
                                    const newEnd = e.target.value;
                                    setCustomDateRange(prev => ({
                                        start: prev?.start || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                        end: newEnd
                                    }));
                                }}
                                value={customDateRange?.end || ''}
                                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FA2D48] transition-colors"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/10 flex gap-3">
                        <button
                            onClick={() => setShowDatePicker(false)}
                            className="flex-1 px-4 py-3 rounded-xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                if (customDateRange?.start && customDateRange?.end) {
                                    setTimeRange('Custom');
                                    setShowDatePicker(false);
                                    // TODO: Backend integration required
                                    // The custom date range UI is implemented, but fetchDashboardStats
                                    // needs to be updated to accept custom date ranges as parameters.
                                    // Current behavior: UI will show the custom range but stats won't filter
                                    console.log('Custom range selected:', customDateRange);
                                }
                            }}
                            disabled={!customDateRange?.start || !customDateRange?.end}
                            className="flex-1 px-4 py-3 rounded-xl bg-[#FA2D48] text-white font-semibold text-sm hover:bg-[#FF6B82] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Apply Range
                        </button>
                    </div>
                </motion.div>
            </>
        )}

        {/* Punky Wrapped Title Screen */}
        {showWrappedMessage && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black overflow-hidden"
                style={{ height: '100dvh' }}
            >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

                {/* Floating Album Covers */}
                {(() => {
                    const covers = [
                        ...safeAlbums.slice(0, 8).map(a => a.cover),
                        ...safeArtists.slice(0, 4).map(a => a.image)
                    ].filter(Boolean);
                    return covers.map((cover, i) => {
                        if (i >= WRAPPED_COVER_POSITIONS.length) return null;
                        const pos = WRAPPED_COVER_POSITIONS[i];
                        const style: React.CSSProperties = { 
                            transform: `rotate(${pos.rotate}deg)`,
                            ...(pos.top ? { top: pos.top } : {}),
                            ...(pos.bottom ? { bottom: pos.bottom } : {}),
                            ...(pos.left ? { left: pos.left } : {}),
                            ...(pos.right ? { right: pos.right } : {})
                        };
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 0.7, scale: 1 }}
                                transition={{ delay: pos.delay, duration: 0.8, ease: 'easeOut' }}
                                className={`absolute ${pos.size} rounded-xl overflow-hidden shadow-2xl border border-white/10`}
                                style={style}
                            >
                                <img src={cover} alt="" className="w-full h-full object-cover" />
                            </motion.div>
                        );
                    });
                })()}

                {/* Center Title */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
                        className="text-center"
                    >
                        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-none">
                            Punk
                        </h1>
                        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-none">
                            Wrapped
                        </h1>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.5 }}
                            className="text-white/50 text-sm sm:text-base mt-4 font-medium"
                        >
                            Your listening story
                        </motion.p>
                    </motion.div>
                </div>

                {/* Close Button */}
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    onClick={() => setShowWrappedMessage(false)}
                    className="absolute top-4 right-4 z-20 p-2.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white/70 hover:text-white transition-all"
                >
                    <X size={20} />
                </motion.button>
            </motion.div>
        )}
    </AnimatePresence>

    </>
  );
}

export default App;
