import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Music, X, TrendingUp, Clock, Calendar, Sparkles, Disc, Info, ChevronRight } from 'lucide-react';
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
import LotusWrapped from './components/LotusWrapped';
import BrutalistDashboard from './components/BrutalistDashboard';

// Extract dominant color from an image URL using canvas sampling
const MIN_PIXEL_BRIGHTNESS = 40;
const MAX_PIXEL_BRIGHTNESS = 700;
const MIN_SATURATION_RANGE = 30;
const FALLBACK_AURA_COLOR = '#FA2D48';

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
        className="relative w-[176px] h-[228px] shrink-0 snap-start rounded-[24px] overflow-hidden shadow-2xl border border-white/[0.08] active:scale-[0.97] transition-transform"
    >
        <img
            src={image || artist.image || `https://ui-avatars.com/api/?name=${artist.name}&background=1DB954&color=fff`}
            alt={artist.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
            <p className="text-[17px] font-bold text-white leading-tight tracking-tight drop-shadow-lg">{artist.name}</p>
            <p className="text-[13px] text-white/70 mt-1 font-medium">{artist.timeStr}</p>
        </div>
    </button>
);

const MobileListRow = ({ rank, cover, title, subtitle, meta }: { rank: number; cover: string; title: string; subtitle: string; meta?: string }) => (
    <div className="flex items-center gap-3 py-3 active:bg-white/5 transition-colors rounded-xl">
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 shadow-md border border-white/[0.06]">
            <img src={cover} alt={title} loading="lazy" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold text-white truncate leading-tight tracking-tight">{title}</p>
            <p className="text-[13px] text-white/50 truncate mt-0.5 font-medium">{subtitle}</p>
        </div>
        {meta && <div className="text-[12px] text-white/40 whitespace-nowrap font-medium flex-shrink-0">{meta}</div>}
    </div>
);

import { SeeAllModal } from './components/SeeAllModal';
import PrismaticBurst from './components/reactbits/PrismaticBurst';

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

  // Brutalist mode toggle
  const [brutalistMode, setBrutalistMode] = useState(false);

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

  const wrappedRange = useMemo(() => {
    const now = new Date();
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    let start = new Date(now);
    let end = new Date(now);

    if (timeRange === 'Daily') {
      start.setHours(0, 0, 0, 0);
    } else if (timeRange === 'Weekly') {
      const dow = now.getDay();
      const daysToMonday = dow === 0 ? 6 : dow - 1;
      start = new Date(now.getTime() - daysToMonday * 24 * 60 * 60 * 1000);
      start.setHours(0, 0, 0, 0);
    } else if (timeRange === 'Monthly') {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    } else if (timeRange === 'Custom' && customDateRange?.start && customDateRange?.end) {
      start = new Date(`${customDateRange.start}T00:00:00`);
      end = new Date(`${customDateRange.end}T23:59:59`);
    } else {
      start = new Date(0);
    }

    return {
      label: `${fmt(start)} - ${fmt(end)}`,
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, [timeRange, customDateRange]);
  
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  
  // Ref to track current fetch to prevent race conditions
  const fetchIdRef = useRef(0);

      // Function to refresh DB view
      const refreshDbStats = async () => {
          // Increment fetch ID to track this specific request
          const currentFetchId = ++fetchIdRef.current;
          const requestedRange = timeRange; // Capture current value
          const currentCustomRange = customDateRange; // Capture custom range
          
          console.log(`[App] 📊 Refreshing DB Stats for ${requestedRange}... (fetchId: ${currentFetchId})`);
          try {
            const stats = await fetchListeningStats();
            const dashboardStuff = requestedRange === 'Custom' && currentCustomRange
                ? await fetchDashboardStats('Custom', currentCustomRange)
                : await fetchDashboardStats(requestedRange);
            
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

  useEffect(() => {
    if (!showWrappedMessage) return;
  }, [showWrappedMessage]);

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

  // Prevent page scrolling while any full-screen modal is open
  useEffect(() => {
    const shouldLockScroll = Boolean(
      selectedTopArtist ||
      selectedTopAlbum ||
      selectedTopSong ||
      showWrappedMessage
    );

    if (!shouldLockScroll) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [selectedTopArtist, selectedTopAlbum, selectedTopSong, showWrappedMessage]);

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
        document.title = "Lotus | Your Music DNA";
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
          <div className="min-h-[100dvh] bg-[#050505] text-white flex items-center justify-center p-6 relative overflow-hidden">
              {/* Animated gradient orbs */}
              <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute top-[-15%] left-[-10%] h-[500px] w-[500px] rounded-full bg-[#FA2D48]/[0.08] blur-[100px] animate-pulse" />
                  <div className="absolute bottom-[-20%] right-[-5%] h-[400px] w-[400px] rounded-full bg-[#1DB954]/[0.05] blur-[120px] animate-pulse" style={{animationDelay: '1s'}} />
                  <div className="absolute top-[40%] left-[60%] h-[300px] w-[300px] rounded-full bg-purple-900/[0.06] blur-[100px]" />
                  {/* Subtle grid */}
                  <div className="absolute inset-0 opacity-[0.02]" style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
              </div>

              <div className="relative w-full max-w-sm flex flex-col items-center text-center gap-8 z-10">
                  {/* Logo */}
                  <div className="relative">
                      <div className="w-20 h-20 bg-white rounded-[22px] flex items-center justify-center shadow-[0_0_80px_rgba(255,255,255,0.12),0_0_30px_rgba(255,255,255,0.06)]">
                          <Music className="w-10 h-10 text-black" strokeWidth={2.5} />
                      </div>
                      <div className="absolute -inset-2 rounded-[28px] border border-white/[0.08] pointer-events-none" />
                  </div>

                  {/* Headline */}
                  <div className="space-y-3">
                      <h1 className="text-[42px] font-black tracking-[-0.03em] leading-none text-white">
                          Lotus<span className="text-[#FA2D48]">.</span>
                      </h1>
                      <p className="text-[15px] text-white/40 max-w-[260px] mx-auto leading-relaxed font-medium">
                          Your music, analyzed. Real-time charts, AI insights & personalized wrapped stories.
                      </p>
                  </div>

                  {/* CTA */}
                  <div className="w-full space-y-3">
                      <button
                          onClick={handleConnect}
                          disabled={connecting}
                          className="w-full bg-white text-black font-bold text-[15px] py-4 rounded-2xl transition-all active:scale-[0.97] shadow-[0_0_40px_rgba(255,255,255,0.08)] hover:shadow-[0_0_60px_rgba(255,255,255,0.15)] disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                          {connecting ? (
                              <>
                                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                  Connecting...
                              </>
                          ) : (
                              <>
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
                                  Continue with Spotify
                              </>
                          )}
                      </button>

                      <p className="text-[11px] text-white/20 font-medium tracking-wider uppercase">
                          Secure • Read-only access • No data stored without consent
                      </p>
                  </div>

                  {/* Feature hints */}
                  <div className="flex items-center gap-6 text-[11px] text-white/25 font-medium">
                      <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#FA2D48]"></span>Live Charts</span>
                      <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-[#1DB954]"></span>AI Insights</span>
                      <span className="flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-purple-400"></span>Wrapped</span>
                  </div>
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
        <div className="lg:hidden space-y-12 safe-area-bottom safe-area-top safe-area-x px-4 sm:px-5">
            <div className="space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.25em] text-white/40 font-bold">Your Stats</p>
                        <h2 className="text-[30px] font-bold text-white mt-1">Hey {data.user?.display_name || 'there'}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setBrutalistMode(true)}
                            className="group flex items-center gap-2 rounded-xl border border-yellow-400/20 bg-gradient-to-r from-[#161616] to-[#111111] px-3 py-2 text-left transition-all hover:border-yellow-400/45 hover:shadow-[0_0_22px_rgba(250,204,21,0.2)]"
                            title="Switch to Brutalist Mode"
                        >
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-yellow-400/35 bg-yellow-300/10 text-[13px]">
                                ⚡
                            </span>
                            <span className="leading-tight">
                                <span className="block text-[9px] font-semibold uppercase tracking-[0.25em] text-white/35">Mode</span>
                                <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-yellow-300/80 group-hover:text-yellow-200">Brutalist</span>
                            </span>
                        </button>
                        {data.user?.images?.[0]?.url && (
                            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 shadow-xl">
                                <img src={data.user.images[0].url} alt={data.user.display_name} loading="lazy" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
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
                
                {/* Mobile Lotus Wrapped Button */}
                <button
                    onClick={() => setShowWrappedMessage(true)}
                    className="w-full rounded-2xl p-6 border border-white/10 hover:border-white/20 active:scale-[0.98] transition-all relative overflow-hidden"
                >
                    <div className="absolute inset-0 z-0">
                        <PrismaticBurst animationType="rotate3d" intensity={1.5} speed={0.3} colors={['#FA2D48', '#7C3AED', '#ffffff']} mixBlendMode="lighten" />
                    </div>
                    <div className="absolute inset-0 bg-black/60 z-[1]" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="text-left">
                            <h3 className="text-[17px] font-bold text-white tracking-tight">Lotus Wrapped</h3>
                            <p className="text-[13px] text-white/60 font-medium">View your story</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/60 flex-shrink-0" />
                    </div>
                </button>
            </div>

            <div className="relative">
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
                        onClick={() => setShowDatePicker(prev => !prev)}
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
                <AnimatePresence>
                    {showDatePicker && (
                        <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                            className="absolute top-full left-0 right-0 mt-1 bg-[#1C1C1E] rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden p-5 space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Calendar size={14} className="text-[#FA2D48]" />
                                    <h2 className="text-sm font-bold text-white">Custom Range</h2>
                                </div>
                                <button onClick={() => setShowDatePicker(false)} className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { label: 'Last 3 days', days: 3 },
                                    { label: 'Last 2 weeks', days: 14 },
                                    { label: 'Last 3 months', days: 90 },
                                ].map(preset => (
                                    <button
                                        key={preset.days}
                                        onClick={() => {
                                            const end = new Date();
                                            const start = new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000);
                                            setCustomDateRange({
                                                start: start.toISOString().split('T')[0],
                                                end: end.toISOString().split('T')[0]
                                            });
                                        }}
                                        className="px-2 py-2 rounded-xl text-[10px] font-semibold text-white/60 bg-white/5 hover:bg-white/10 hover:text-white transition-all border border-white/5"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="block text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1.5">From</label>
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
                                        className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#FA2D48] transition-colors"
                                    />
                                </div>
                                <div className="flex items-end pb-3 text-white/20">→</div>
                                <div className="flex-1">
                                    <label className="block text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1.5">To</label>
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
                                        className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#FA2D48] transition-colors"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    if (customDateRange?.start && customDateRange?.end) {
                                        setTimeRange('Custom');
                                        setShowDatePicker(false);
                                        fetchDashboardStats('Custom', customDateRange).then(data => setDbUnifiedData(data));
                                    }
                                }}
                                disabled={!customDateRange?.start || !customDateRange?.end}
                                className="w-full px-4 py-2.5 rounded-xl bg-[#FA2D48] text-white font-bold text-xs hover:bg-[#FF6B82] transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
                            >
                                Apply Range
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {showEmptyState ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-3xl border border-white/5 text-center px-6">
                    <div className="relative mb-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FA2D48]/20 to-purple-900/20 flex items-center justify-center">
                            <Music size={32} className="text-white/30" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#FA2D48]/30 flex items-center justify-center text-xs">🎵</div>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Nothing here yet</h3>
                    <p className="text-[#8E8E93] text-sm leading-relaxed max-w-[260px]">
                        Your {timeRange.toLowerCase()} stats will appear after you've been listening. Go put on some music! 🎧
                    </p>
                    <div className="mt-6 px-4 py-2 rounded-full border border-white/10 text-xs text-white/40 font-medium">
                        Tip: Switch to "All Time" to see your complete history
                    </div>
                </div>
            ) : (
                <>
                    <section className="space-y-4">
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
                            <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar snap-x px-1">
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

                    <section className="space-y-4">
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
                        <div>
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
                    <section>
                        <UpcomingArtists
                            recentPlays={safeRecent}
                            topArtists={safeArtists}
                            artistImages={artistImages}
                        />
                    </section>

                    <section className="space-y-4">
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
                            <div className="flex gap-3 overflow-x-auto pb-3 no-scrollbar snap-x px-1">
                                {safeAlbums.slice(0, 6).map((album: Album, index: number) => (
                                    <div key={album.id} className="w-[156px] shrink-0 snap-start group cursor-pointer" onClick={() => setSelectedTopAlbum(album)}>
                                        <div className="relative w-full h-[156px] rounded-[20px] overflow-hidden shadow-xl border border-white/[0.08] active:scale-95 transition-transform">
                                            <img src={album.cover} alt={album.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                                        </div>
                                        <p className="mt-3 text-[14px] font-semibold text-white truncate tracking-tight">{album.title}</p>
                                        <p className="text-[12px] text-white/50 truncate mt-0.5 font-medium">{album.artist}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[#8E8E93] text-sm italic px-1">Not enough data to rank albums yet.</p>
                        )}
                    </section>



                    {/* Mobile Obsession Orbit */}
                    <section>
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
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[20px] font-bold text-white tracking-tight">Activity Heatmap</h3>
                        </div>
                        <div className="overflow-hidden">
                            <ActivityHeatmap history={safeRecent} />
                        </div>
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
            
            {/* Desktop Lotus Wrapped Button */}
            <div className="mb-16 flex gap-3">
                <button
                    onClick={() => setShowWrappedMessage(true)}
                    className="flex-1 rounded-2xl p-5 border border-white/10 hover:border-white/20 transition-all group active:scale-[0.99] relative overflow-hidden"
                >
                    <div className="absolute inset-0 z-0">
                        <PrismaticBurst animationType="rotate3d" intensity={1.5} speed={0.3} colors={['#FA2D48', '#7C3AED', '#ffffff']} mixBlendMode="lighten" />
                    </div>
                    <div className="absolute inset-0 bg-black/60 z-[1]" />
                    <div className="flex items-center justify-between relative z-10">
                        <div className="text-left">
                            <h3 className="text-[15px] font-bold text-white tracking-tight">Lotus Wrapped</h3>
                            <p className="text-[12px] text-white/60 font-medium">View your story</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/60 group-hover:text-white transition-colors flex-shrink-0" />
                    </div>
                </button>
                <button
                    onClick={() => setBrutalistMode(true)}
                    className="group rounded-2xl border border-yellow-400/20 bg-gradient-to-br from-[#151515] via-[#101010] to-[#080808] p-4 hover:border-yellow-400/45 transition-all active:scale-[0.99] relative overflow-hidden min-w-[156px]"
                    title="Switch to Brutalist Mode"
                >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.18),transparent_60%)] opacity-80 group-hover:opacity-100" />
                    <div className="relative z-10 flex h-full flex-col justify-between gap-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-white/45">Mode</span>
                            <span className="rounded-md border border-yellow-300/40 bg-yellow-300/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.2em] text-yellow-200">Beta</span>
                        </div>
                        <div className="flex items-end justify-between">
                            <div className="text-left">
                                <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-yellow-200/95">Brutalist</p>
                                <p className="text-[11px] font-medium text-white/45">Raw analytics view</p>
                            </div>
                            <span className="text-xl leading-none">⚡</span>
                        </div>
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
                    <div className="relative">
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
                                onClick={() => setShowDatePicker(prev => !prev)}
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
                        <AnimatePresence>
                            {showDatePicker && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                    className="absolute top-full right-0 mt-2 w-80 bg-[#1C1C1E] rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden p-5 space-y-4"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-[#FA2D48]" />
                                            <h2 className="text-sm font-bold text-white">Custom Range</h2>
                                        </div>
                                        <button onClick={() => setShowDatePicker(false)} className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Last 3 days', days: 3 },
                                            { label: 'Last 2 weeks', days: 14 },
                                            { label: 'Last 3 months', days: 90 },
                                        ].map(preset => (
                                            <button
                                                key={preset.days}
                                                onClick={() => {
                                                    const end = new Date();
                                                    const start = new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000);
                                                    setCustomDateRange({
                                                        start: start.toISOString().split('T')[0],
                                                        end: end.toISOString().split('T')[0]
                                                    });
                                                }}
                                                className="px-2 py-2 rounded-xl text-[10px] font-semibold text-white/60 bg-white/5 hover:bg-white/10 hover:text-white transition-all border border-white/5"
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="block text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1.5">From</label>
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
                                                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#FA2D48] transition-colors"
                                            />
                                        </div>
                                        <div className="flex items-end pb-3 text-white/20">→</div>
                                        <div className="flex-1">
                                            <label className="block text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1.5">To</label>
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
                                                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-[#FA2D48] transition-colors"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (customDateRange?.start && customDateRange?.end) {
                                                setTimeRange('Custom');
                                                setShowDatePicker(false);
                                                fetchDashboardStats('Custom', customDateRange).then(data => setDbUnifiedData(data));
                                                console.log('Custom range selected:', customDateRange);
                                            }
                                        }}
                                        disabled={!customDateRange?.start || !customDateRange?.end}
                                        className="w-full px-4 py-2.5 rounded-xl bg-[#FA2D48] text-white font-bold text-xs hover:bg-[#FF6B82] transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-[0.98]"
                                    >
                                        Apply Range
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
                
                {showEmptyState ? (
                    <div className="flex flex-col items-center justify-center py-20 rounded-3xl border border-white/5 text-center px-6">
                        <div className="relative mb-6">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FA2D48]/20 to-purple-900/20 flex items-center justify-center">
                                <Music size={32} className="text-white/30" />
                            </div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#FA2D48]/30 flex items-center justify-center text-xs">🎵</div>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Nothing here yet</h3>
                        <p className="text-[#8E8E93] text-sm leading-relaxed max-w-[260px]">
                            Your {timeRange.toLowerCase()} stats will appear after you've been listening. Go put on some music! 🎧
                        </p>
                        <div className="mt-6 px-4 py-2 rounded-full border border-white/10 text-xs text-white/40 font-medium">
                            Tip: Switch to "All Time" to see your complete history
                        </div>
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

    {/* Artist Detail Modal - Full Screen */}
    <AnimatePresence>
        {selectedTopArtist && (
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black"
                onClick={() => setSelectedTopArtist(null)}
            >
                {/* Full-screen blurred background */}
                <div className="absolute inset-0 overflow-hidden">
                    <img 
                        src={artistImages[selectedTopArtist.name] || selectedTopArtist.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTopArtist.name)}&background=1C1C1E&color=fff`}
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
                    {/* Close Button */}
                    <button 
                        onClick={() => setSelectedTopArtist(null)}
                        className="fixed top-4 right-4 sm:top-6 sm:right-6 p-2.5 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all z-50 border border-white/10 hover:scale-105 active:scale-95"
                    >
                        <X size={18} />
                    </button>

                    {/* Artist Image + Info */}
                    <div className="flex flex-col items-center max-w-2xl mx-auto">
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.1 }}
                            className="relative mb-6 group"
                        >
                            <div className="absolute -inset-4 rounded-full blur-3xl opacity-[0.2] group-hover:opacity-[0.3] transition-opacity duration-700" style={{ backgroundColor: auraColor }}></div>
                            <div className="w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full overflow-hidden ring-4 ring-white/10 shadow-2xl relative">
                                <img 
                                    src={artistImages[selectedTopArtist.name] || selectedTopArtist.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTopArtist.name)}&background=1C1C1E&color=fff`} 
                                    className="w-full h-full object-cover bg-[#1C1C1E]" 
                                    alt={selectedTopArtist.name}
                                />
                            </div>
                            {/* Rank Badge */}
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-black px-4 py-1 rounded-full font-bold text-xs shadow-xl">
                                #{safeArtists.findIndex((a: Artist) => a.id === selectedTopArtist.id) + 1 || '?'}
                            </div>
                        </motion.div>

                        {/* Name + Listening Time */}
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center tracking-tight mb-1"
                        >
                            {selectedTopArtist.name}
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="text-lg text-white/70 mb-8"
                        >
                            {selectedTopArtist.timeStr || '0m'} listened
                        </motion.p>

                        {/* Stats Row */}
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="grid grid-cols-3 gap-3 w-full max-w-lg mb-8"
                        >
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                                <TrendingUp size={16} className="mb-1.5" style={{ color: auraColor }} />
                                <span className="text-xl font-black text-white">{selectedTopArtist.totalListens || 0}</span>
                                <span className="text-[10px] uppercase tracking-wider text-[#8E8E93]">Plays</span>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                                <Clock size={16} className="mb-1.5" style={{ color: auraColor }} />
                                <span className="text-xl font-black text-white">{selectedTopArtist.timeStr ? String(selectedTopArtist.timeStr).replace('m', '') : '0'}</span>
                                <span className="text-[10px] uppercase tracking-wider text-[#8E8E93]">Minutes</span>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                                <Sparkles size={16} className="mb-1.5" style={{ color: auraColor }} />
                                <span className="text-xl font-black text-white">{selectedArtistStats?.popularityScore || 0}%</span>
                                <span className="text-[10px] uppercase tracking-wider text-[#8E8E93]">Of Time</span>
                            </div>
                        </motion.div>

                        {/* Top Tracks Section */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4"
                        >
                             <h3 className="text-xs font-bold text-white/70 mb-3 flex items-center gap-2 uppercase tracking-wider">
                                <Disc size={12} style={{ color: auraColor }} /> Top Tracks
                             </h3>
                             
                             <div className="space-y-0.5">
                                {(dbUnifiedData?.songs || [])
                                    .filter((s: any) => s.artist_name === selectedTopArtist.name || s.artist === selectedTopArtist.name)
                                    .sort((a: any, b: any) => (b.plays || b.listens || 0) - (a.plays || a.listens || 0))
                                    .slice(0, 5)
                                    .map((song: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-2.5 p-2 hover:bg-white/5 rounded-xl transition-all group active:scale-[0.98]">
                                            <div className="text-white/25 font-mono text-[10px] w-4 font-bold text-right">{idx + 1}</div>
                                            <div className="w-8 h-8 rounded-lg bg-[#2C2C2E] overflow-hidden flex-shrink-0 border border-white/5">
                                                <img src={song.cover || song.album_cover} className="w-full h-full object-cover" alt={song.title} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-xs font-semibold text-white truncate group-hover:text-[#FA2D48] transition-colors">
                                                    {song.track_name || song.title}
                                                </div>
                                                <div className="text-[10px] text-white/30 font-medium">
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

    {/* Lotus Wrapped Title Screen */}
        {showWrappedMessage && (
            <LotusWrapped
                onClose={() => setShowWrappedMessage(false)}
                albumCovers={[...new Set([
                    ...safeAlbums.map((a: Album) => a.cover),
                    ...safeSongs.map((s: Song) => s.cover),
                    ...safeArtists.map((a: Artist) => a.image)
                ].filter(Boolean))]}
                totalMinutes={dbStats?.totalMinutes ?? 0}
                artists={safeArtists}
                albums={safeAlbums}
                songs={safeSongs}
                weeklyMinutes={dbUnifiedData?.totalMinutes ?? 0}
                rangeLabel={wrappedRange.label}
                rangeStart={wrappedRange.start}
                rangeEnd={wrappedRange.end}
            />
        )}

        {/* Brutalist Dashboard */}
        {brutalistMode && (
            <BrutalistDashboard
                onToggleOff={() => setBrutalistMode(false)}
                artists={safeArtists}
                songs={safeSongs}
                albums={safeAlbums}
                totalMinutes={dbStats?.totalMinutes ?? 0}
                userName={data?.user?.display_name}
                userImage={data?.user?.images?.[0]?.url}
                artistImages={artistImages}
                timeRange={timeRange}
                onTimeRangeChange={(range) => {
                    setTimeRange(range);
                    fetchDashboardStats(range).then((d: any) => setDbUnifiedData(d));
                }}
            />
        )}

    </>
  );
}

export default App;
