import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Music, X, TrendingUp, Clock, Calendar, Sparkles, Disc, Info, ChevronRight, Shuffle, RefreshCw, ArrowUp, Zap, Layers, Globe, Database } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Layout } from './components/Layout';
import { BackToTop } from './components/BackToTop';
import { Artist, Album, Song } from './types';
// import { TopCharts } from './components/TopCharts';
import { RankingWidget } from './components/RankingWidget';
import { AISpotlight } from './components/AISpotlight';
import { AISearchBar } from './components/AISearchBar';
import { TrendingArtists } from './components/TrendingArtists';
import { UpcomingArtists } from './components/UpcomingArtists';
import { ActivityHeatmap } from './components/ActivityHeatmap';
import { ArtistOrbit } from './components/ArtistOrbit';
import { EmptyState } from './components/EmptyState';
import Particles from './components/reactbits/Particles';
import { FullScreenModal } from './components/FullScreenModal';
import { Calendar as ShadcnCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

import { 
    getTokenFromUrl, 
    fetchSpotifyData, 
    redirectToAuthCodeFlow, 
    getAccessToken,
    refreshAccessToken,
    fetchArtistImages
} from './services/spotifyService';
import { syncRecentPlays, fetchListeningStats, fetchDashboardStats, fetchCharts, getDiscoveryDate } from './services/dbService';
import { supabase } from './services/supabaseClient';
import { logger } from './services/logger';

// RANKED COMPONENT: Top Album (Standard)
const RankedAlbum = ({ album, rank, onClick }: { album: Album, rank: number, onClick?: () => void }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    return (
    <div 
        className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]"
        onClick={onClick}
    >
        <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40 text-white/5">
            {rank}
        </span>
        <div className="relative z-10 ml-10 md:ml-12">
            <div className="w-32 h-32 md:w-40 md:h-40 overflow-hidden rounded-xl bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                {!imageLoaded && (
                    <div className="absolute inset-0 bg-[#2C2C2E] animate-pulse rounded-xl z-10" />
                )}
                <img
                    src={album.cover}
                    alt={album.title}
                    loading="lazy"
                    onLoad={() => setImageLoaded(true)}
                    className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm ${!imageLoaded ? 'opacity-0' : 'opacity-100'}`}
                />
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
};

// RANKED COMPONENT: Top Artist (Number style like Top Albums)
const RankedArtist = ({ artist, rank, realImage, onClick }: { artist: Artist, rank: number, realImage?: string, onClick?: () => void }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    return (
    <div 
        className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]"
        onClick={onClick}
    >
        <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40 text-white/5">
            {rank}
        </span>
        <div className="relative z-10 ml-10 md:ml-12">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                {!imageLoaded && (
                    <div className="absolute inset-0 bg-[#2C2C2E] animate-pulse rounded-full z-10" />
                )}
                <img 
                    src={realImage || artist.image || `https://ui-avatars.com/api/?name=${artist.name}&background=1DB954&color=fff`} 
                    alt={artist.name} 
                    loading="lazy"
                    onLoad={() => setImageLoaded(true)}
                    className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm ${!imageLoaded ? 'opacity-0' : 'opacity-100'}`}
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
};

// RANKED COMPONENT: Top Song (Ranked Album Style)
const RankedSong = ({ song, rank, onClick }: { song: Song, rank: number, onClick?: () => void }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    return (
    <div 
        className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]"
        onClick={onClick}
    >
        <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40 text-white/5">
            {rank}
        </span>
        <div className="relative z-10 ml-10 md:ml-12">
            <div className="w-32 h-32 md:w-40 md:h-40 overflow-hidden rounded-xl bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                {!imageLoaded && (
                    <div className="absolute inset-0 bg-[#2C2C2E] animate-pulse rounded-xl z-10" />
                )}
                <img
                    src={song.cover}
                    alt={song.title}
                    loading="lazy"
                    onLoad={() => setImageLoaded(true)}
                    className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm ${!imageLoaded ? 'opacity-0' : 'opacity-100'}`}
                />
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
};

const MobileHeroCard = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="glass-morph rounded-[32px] p-8 shadow-xl border border-white/[0.15]">
        <h1 className="text-[28px] font-bold text-white leading-tight tracking-tight">{title}</h1>
        <p className="text-[15px] text-white/70 mt-3 leading-relaxed font-medium">{subtitle}</p>
    </div>
);

const MobileArtistCard = ({ artist, rank, image, onClick }: { artist: Artist; rank: number; image?: string; onClick?: () => void }) => (
    <button
        type="button"
        onClick={onClick}
        className="relative w-[210px] h-[280px] shrink-0 snap-start rounded-[28px] overflow-hidden shadow-2xl border border-white/[0.08] active:scale-[0.97] transition-transform"
    >
        <img
            src={image || artist.image || `https://ui-avatars.com/api/?name=${artist.name}&background=1DB954&color=fff`}
            alt={artist.name}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/80" />
        <div className="absolute bottom-0 left-0 right-0 p-5 text-left">
            <p className="text-[20px] font-bold text-white leading-tight tracking-tight drop-shadow-lg">{artist.name}</p>
            <p className="text-[14px] text-white/70 mt-1 font-medium">{artist.timeStr}</p>
        </div>
    </button>
);

const MobileListRow = ({ rank, cover, title, subtitle, meta }: { rank: number; cover: string; title: string; subtitle: string; meta?: string }) => (
    <div className="flex items-center gap-4 py-4 active:bg-white/5 transition-colors rounded-2xl">
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 shadow-md border border-white/[0.06]">
            <img src={cover} alt={title} loading="lazy" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-[16px] font-semibold text-white truncate leading-tight tracking-tight">{title}</p>
            <p className="text-[14px] text-white/50 truncate mt-1 font-medium">{subtitle}</p>
        </div>
        {meta && <div className="text-[13px] text-white/40 whitespace-nowrap font-medium flex-shrink-0">{meta}</div>}
    </div>
);

import { SeeAllModal } from './components/SeeAllModal';
import { DatabaseViewer } from './components/DatabaseViewer';

const StatsCarousel = ({ stats, artist }: { stats: any, artist: Artist }) => {
    const [page, setPage] = useState(0);

    // Group stats
    const slide1 = [
        { icon: TrendingUp, value: artist.totalListens || 0, label: "Total Plays", color: "text-white" },
        { icon: Clock, value: artist.timeStr ? String(artist.timeStr).replace('m', '') : '0', label: "Minutes", color: "text-white" },
        { icon: Sparkles, value: `${stats?.popularityScore || 0}%`, label: "Of Time", color: "text-white" }
    ];

    const slide2 = [
         { icon: Layers, value: stats?.varietyCount || 0, label: "Unique Songs", color: "text-white" },
         { icon: Zap, value: stats?.dailyAverage || 0, label: "Avg / Day", color: "text-white" },
         { icon: Globe, value: stats?.peakTimeLabel || '-', label: "Peak Time", color: "text-white" }
    ];

    const slides = [slide1, slide2];

    useEffect(() => {
        const interval = setInterval(() => {
            setPage(prev => (prev + 1) % slides.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [slides.length]);

    return (
        <div className="w-full max-w-lg mb-8 overflow-hidden relative">
             <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${page * 100}%)` }}>
                {slides.map((slide, i) => (
                    <div key={i} className="min-w-full grid grid-cols-3 gap-3 px-1">
                        {slide.map((stat, j) => (
                            <div key={j} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                                <stat.icon size={16} className={`mb-1.5 opacity-80 ${stat.color}`} />
                                <span className="text-xl font-black text-white">{stat.value}</span>
                                <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                ))}
             </div>
             {/* Indicators */}
             <div className="flex justify-center gap-1.5 mt-3">
                {slides.map((_, i) => (
                    <button
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === page ? 'bg-white' : 'bg-white/20'}`}
                        onClick={() => setPage(i)}
                    />
                ))}
             </div>
        </div>
    );
};

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
  const [artistDiscoveryDate, setArtistDiscoveryDate] = useState<string | null>(null);
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
  const [aiInitialQuery, setAiInitialQuery] = useState<string | undefined>(undefined);
  const [databaseViewerOpen, setDatabaseViewerOpen] = useState(false);

  // Dynamic aura colors extracted from item images
  const [auraColor, setAuraColor] = useState<string>('#FA2D48');

  // Extract aura color when a top item modal opens
  useEffect(() => {
    if (selectedTopArtist) {
      const imgUrl = artistImages[selectedTopArtist.name] || selectedTopArtist.image || '';
      extractDominantColor(imgUrl).then(setAuraColor);

      // Fetch discovery date
      getDiscoveryDate(selectedTopArtist.name).then(res => {
         if (res) setArtistDiscoveryDate(res.first_played);
         else setArtistDiscoveryDate(null);
      });
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
                logger.error("BG Image Fetch Error", e);
            }
        }
    };
    
    // De-bounce slightly or just run when data settles
    if (dbUnifiedData || (data && data.artists && data.artists.length > 0)) {
        loadImages();
    }
  }, [dbUnifiedData, data, token, artistImages]);

  const [timeRange, setTimeRange] = useState<'Daily' | 'Weekly' | 'Monthly' | 'All Time' | 'Custom'>('Weekly');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string } | null>(null);
  const [dateRangePickerOpen, setDateRangePickerOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<any | undefined>();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good morning';
      if (hour < 18) return 'Good afternoon';
      return 'Good evening';
  };

  const handleManualRefresh = async () => {
      if (isRefreshing) return;
      setIsRefreshing(true);
      await refreshDbStats();
      setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleConnect = async () => {
      setConnecting(true);
      try {
          await redirectToAuthCodeFlow();
      } catch (e) {
          logger.error("Auth redirect failed", e);
          setConnecting(false);
      }
  };

  const handleSeeAll = (type: 'artist' | 'album' | 'song') => {
      let items: any[] = [];
      let title = '';
      if (type === 'artist') {
          items = safeArtists;
          title = 'Top Artists';
      } else if (type === 'album') {
          items = safeAlbums;
          title = 'Top Albums';
      } else if (type === 'song') {
          items = safeSongs;
          title = 'Top Songs';
      }
      setSeeAllModal({ isOpen: true, title, items, type });
  };

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
  
  // Ref to track current fetch to prevent race conditions
  const fetchIdRef = useRef(0);
  const refreshDbStatsRef = useRef<() => Promise<void>>(null);

      // Function to refresh DB view
      const refreshDbStats = useCallback(async () => {
          // Increment fetch ID to track this specific request
          const currentFetchId = ++fetchIdRef.current;
          const requestedRange = timeRange; // Capture current value
          const currentCustomRange = customDateRange; // Capture custom range
          
          logger.info(`[App] 📊 Refreshing DB Stats for ${requestedRange}... (fetchId: ${currentFetchId})`);
          try {
            const stats = await fetchListeningStats();
            const dashboardStuff = requestedRange === 'Custom' && currentCustomRange
                ? await fetchDashboardStats('Custom', currentCustomRange)
                : await fetchDashboardStats(requestedRange);
            
            // Check if this request is still the latest one
            if (currentFetchId !== fetchIdRef.current) {
                logger.info(`[App] ⚠️ Discarding stale response for ${requestedRange} (fetchId: ${currentFetchId}, current: ${fetchIdRef.current})`);
                return; // Discard stale response
            }
            
            // Fetch dynamic charts for AI context
            const currentCharts = await fetchCharts(requestedRange.toLowerCase() as any);
            
            logger.info(`[App] ✅ Dashboard Stats for ${requestedRange}:`, {
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
              logger.error("[App] refreshDbStats failed:", e);
          }
      }, [timeRange, customDateRange]);

  // Update the ref whenever refreshDbStats changes
  useEffect(() => {
    refreshDbStatsRef.current = refreshDbStats;
  }, [refreshDbStats]);

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
                logger.info('Realtime change detected:', payload);
                refreshDbStatsRef.current?.();
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
             await syncRecentPlays(data.recentRaw, token); 
             refreshDbStatsRef.current?.();
        }
      };
      if (token && data) syncAndFetchStats();
  }, [data]);

  // Refresh data when timeRange changes
  useEffect(() => {
      if (token) refreshDbStatsRef.current?.();
  }, [timeRange]);


  // Polling Effect
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
            logger.error("Critical Load Error", e);
        } finally {
             setLoading(false);
        }
    };

    // Initial load
    setLoading(true);
    loadData().then(() => setLoading(false));

    const spotifyInterval = setInterval(() => {
        loadData();
    }, 30000);

    const dbInterval = setInterval(() => {
        if (token) refreshDbStatsRef.current?.();
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
            const searchInput = document.querySelector('[placeholder*="Ask Lotus"]') as HTMLInputElement;
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
      selectedTopSong
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
  }, [selectedTopArtist, selectedTopAlbum, selectedTopSong]);

  useEffect(() => {
    if (authFlowHandledRef.current) return;
    authFlowHandledRef.current = true;

    const handleAuth = async () => {
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
                window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (e) {
            logger.error(e);
          }
          return;
        }

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

  // Safe data extraction
  const safeArtists = (dbUnifiedData?.artists?.length > 0) ? dbUnifiedData.artists : (data?.artists || []);
  const safeAlbums = (dbUnifiedData?.albums?.length > 0) ? dbUnifiedData.albums : (data?.albums || []);
  const safeSongs = (dbUnifiedData?.songs?.length > 0) ? dbUnifiedData.songs : (data?.songs || []);
  const safeRecent = (dbUnifiedData?.recentPlays?.length > 0) ? dbUnifiedData.recentPlays : (data?.recentRaw || []);
  const hasDbData = safeArtists.length > 0 || safeSongs.length > 0 || safeAlbums.length > 0;
  const showEmptyState = !loading && dbUnifiedData && !hasDbData;

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

      // New Stats
      const dailyAverage = activeDays > 0 ? Math.round((selectedTopArtist.totalListens || 0) / activeDays) : 0;

      const uniqueSongs = new Set(artistPlays.map((p: any) => p.track_name || p.title));
      const varietyCount = uniqueSongs.size;

      const hourCounts: Record<number, number> = {};
      artistPlays.forEach((play: any) => {
          if (!play.played_at) return;
          const hour = new Date(play.played_at).getHours();
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const peakHour = parseInt(Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '12');
      let peakTimeLabel = 'Day';
      if (peakHour >= 5 && peakHour < 12) peakTimeLabel = 'Morning';
      else if (peakHour >= 12 && peakHour < 17) peakTimeLabel = 'Afternoon';
      else if (peakHour >= 17 && peakHour < 21) peakTimeLabel = 'Evening';
      else peakTimeLabel = 'Night';

      return {
          popularityScore,
          activeDays,
          dailyAverage,
          varietyCount,
          peakTimeLabel
      };
  }, [selectedTopArtist, safeArtists, safeRecent]);

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
          <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-between p-6 overflow-hidden font-sans">
              <div className="w-full flex justify-center pt-8 relative z-20">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/5 shadow-lg">
                      <Music size={20} className="text-white opacity-90" />
                  </div>
              </div>
              <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-50">
                  <Particles
                      particleCount={450}
                      particleSpread={12}
                      speed={0.12}
                      particleColors={['#ffffff', '#a0a0a0', '#404040']}
                      moveParticlesOnHover={true}
                      particleHoverFactor={1.5}
                      alphaParticles={false}
                      particleBaseSize={90}
                      sizeRandomness={0.8}
                      cameraDistance={22}
                  />
              </div>
              <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8 pb-10 animate-fade-in">
                  <div className="text-center space-y-3">
                      <h1 className="text-[34px] font-bold tracking-tight text-white leading-tight drop-shadow-lg">Welcome</h1>
                      <p className="text-white/50 text-[17px] font-medium tracking-wide">Your journey starts from here</p>
                  </div>
                  <div className="w-full space-y-3">
                      <button
                          onClick={handleConnect}
                          disabled={connecting}
                          className="auth-button-primary flex items-center justify-center gap-2 shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all"
                      >
                          {connecting ? 'Connecting...' : 'Continue with Spotify'}
                      </button>
                       <button className="auth-button-secondary opacity-60 cursor-not-allowed hover:bg-[#1C1C1E] active:scale-[0.98] transition-all" disabled>
                          <svg className="w-4 h-4 fill-current mb-0.5" viewBox="0 0 24 24">
                              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.64 4.09-1.29 1.57.14 2.68.86 3.39 1.96-3.23 1.97-2.69 6.2 1.25 7.6-.66 1.7-1.6 3.48-3.81 3.96zm-1.89-13.43c.8-.97 1.34-2.31 1.19-3.66-1.15.05-2.54.77-3.36 1.73-.78.91-1.46 2.37-1.28 3.65 1.3.1 2.62-.63 3.45-1.72z"/>
                          </svg> Continue with Apple
                      </button>
                  </div>
                  <p className="text-[11px] text-white/30 text-center max-w-[260px] leading-relaxed font-medium">
                      By pressing on "Continue with..." you agree to our <span className="text-white/50 cursor-pointer hover:underline">Terms of Service</span> and <span className="text-white/50 cursor-pointer hover:underline">Privacy Policy</span>
                  </p>
              </div>
          </div>
      );
  }

  if (loading || !data) {
      return (
          <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center p-6 overflow-hidden font-sans z-50">
              <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-30">
                  <Particles
                      particleCount={200}
                      particleSpread={10}
                      speed={0.1}
                      particleColors={['#ffffff', '#808080']}
                      moveParticlesOnHover={false}
                      particleHoverFactor={1}
                      alphaParticles={false}
                      particleBaseSize={100}
                      sizeRandomness={0.5}
                      cameraDistance={20}
                  />
              </div>
              <div className="relative z-10 flex flex-col items-center animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/10 shadow-2xl backdrop-blur-md">
                      <RefreshCw className="w-8 h-8 text-white opacity-80 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>
                  <h3 className="text-3xl font-bold text-white tracking-tight mb-2 text-center drop-shadow-xl">Syncing Library</h3>
                  <p className="text-white/50 text-sm font-medium tracking-wide">Analyzing your listening history...</p>

                  {loading === false && !data && (
                      <button onClick={handleConnect} disabled={connecting} className="mt-8 px-8 py-3 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors z-10 shadow-xl">
                        {connecting ? 'Connecting...' : 'Retry Connection'}
                      </button>
                  )}
              </div>
          </div>
      );
  }

  return (
    <>
    <Layout user={data.user} currentTrack={data.currentTrack}>

        <div className="lg:hidden space-y-8 safe-area-bottom safe-area-top safe-area-x px-4 sm:px-5 pb-20">
            {/* Mobile Content */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-[34px] font-bold text-white leading-none tracking-tight">{getGreeting()}, {data.user?.display_name?.split(' ')[0] || 'friend'}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setDatabaseViewerOpen(true)}
                            className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                            title="View Database"
                        >
                            <Database size={16} className="text-white/70" />
                        </button>
                        <button
                            onClick={handleManualRefresh}
                            className={`p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                            title="Refresh Data"
                        >
                            <RefreshCw size={16} className="text-white/70" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                <AISearchBar
                    token={token}
                    history={safeRecent}
                    user={data.user}
                    contextData={{
                        userName: data.user?.display_name,
                        artists: safeArtists.map((a: Artist) => a.name),
                        albums: safeAlbums.map((a: Album) => a.title),
                        songs: safeSongs.map((s: Song) => s.title),
                        globalStats: dbStats
                    }}
                    onSearch={(query) => {
                        setAiInitialQuery(query);
                        setAiModalOpen(true);
                    }}
                />
                
            </div>

            <div className="relative">
                {/* Time Range Selector */}
                <div className="flex gap-2 p-1.5 overflow-x-auto no-scrollbar rounded-2xl border border-white/10 bg-white/5 mb-2 items-center">
                    {(['Daily', 'Weekly', 'Monthly', 'All Time'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => {
                                setTimeRange(range);
                                setCustomDateRange(null);
                            }}
                            aria-pressed={timeRange === range}
                            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                                timeRange === range ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {range}
                        </button>
                    ))}

                    <Popover open={dateRangePickerOpen} onOpenChange={setDateRangePickerOpen}>
                        <PopoverTrigger asChild>
                            <button
                                className={cn(
                                    "px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5",
                                    timeRange === 'Custom' ? 'bg-white text-black' : 'text-white/70 hover:text-white hover:bg-white/10'
                                )}
                            >
                                <Calendar size={12} />
                                {timeRange === 'Custom' && customDateRange
                                    ? `${new Date(customDateRange.start).toLocaleDateString()} - ${new Date(customDateRange.end).toLocaleDateString()}`
                                    : 'Custom'}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <ShadcnCalendar
                                mode="range"
                                selected={calendarDate}
                                onSelect={(range) => {
                                    setCalendarDate(range);
                                    if (range?.from && range?.to) {
                                        setCustomDateRange({
                                            start: format(range.from, 'yyyy-MM-dd'),
                                            end: format(range.to, 'yyyy-MM-dd')
                                        });
                                        setTimeRange('Custom');
                                        setDateRangePickerOpen(false);
                                    }
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            {showEmptyState ? (
                <EmptyState timeRange={timeRange} />
            ) : (
                <>
                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[20px] font-bold text-white tracking-tight">Your Top Artists</h3>
                            <button onClick={() => handleSeeAll('artist')} className="text-xs font-semibold text-[#FA2D48] hover:text-[#ff5c70] transition-colors">See All</button>
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
                            <div className="px-1">
                                <p className="text-[#8E8E93] text-sm py-8 text-center italic">No artists found.</p>
                            </div>
                        )}
                    </section>

                    <section className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-[20px] font-bold text-white tracking-tight">Top Songs</h3>
                            <button onClick={() => handleSeeAll('song')} className="text-xs font-semibold text-[#FA2D48] hover:text-[#ff5c70] transition-colors">See All</button>
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
                            <button onClick={() => handleSeeAll('album')} className="text-xs font-semibold text-[#FA2D48] hover:text-[#ff5c70] transition-colors">See All</button>
                        </div>
                        {safeAlbums.length > 0 ? (
                            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x px-1">
                                {safeAlbums.slice(0, 6).map((album: Album, index: number) => (
                                    <div key={album.id} className="w-[180px] shrink-0 snap-start group cursor-pointer" onClick={() => setSelectedTopAlbum(album)}>
                                        <div className="relative w-full h-[180px] rounded-[24px] overflow-hidden shadow-xl border border-white/[0.08] active:scale-95 transition-transform">
                                            <img src={album.cover} alt={album.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                                        </div>
                                        <p className="mt-3 text-[16px] font-semibold text-white truncate tracking-tight">{album.title}</p>
                                        <p className="text-[14px] text-white/50 truncate mt-1 font-medium">{album.artist}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[#8E8E93] text-sm italic px-1">Not enough data to rank albums yet.</p>
                        )}
                    </section>

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
            {/* Desktop Layout */}
            <div className="mb-8 mt-8 max-w-4xl mx-auto">
                <AISearchBar
                    token={token}
                    history={safeRecent}
                    user={data.user}
                    contextData={{
                        userName: data.user?.display_name,
                        artists: safeArtists.map((a: Artist) => a.name),
                        albums: safeAlbums.map((a: Album) => a.title),
                        songs: safeSongs.map((s: Song) => s.title),
                        globalStats: dbStats
                    }}
                    onSearch={(query) => {
                        setAiInitialQuery(query);
                        setAiModalOpen(true);
                    }}
                />
            </div>
            
            {/* Desktop Date Range Selector */}
            <div className="flex items-center justify-between mb-12">
                <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10 items-center">
                    {(['Daily', 'Weekly', 'Monthly', 'All Time'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => {
                                setTimeRange(range);
                                setCustomDateRange(null);
                            }}
                            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                                timeRange === range ? 'bg-white text-black shadow-lg scale-105' : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            {range}
                        </button>
                    ))}

                    <Popover open={dateRangePickerOpen} onOpenChange={setDateRangePickerOpen}>
                        <PopoverTrigger asChild>
                            <button
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2",
                                    timeRange === 'Custom' ? 'bg-white text-black shadow-lg scale-105' : 'text-white/60 hover:text-white hover:bg-white/10'
                                )}
                            >
                                <Calendar size={14} />
                                {timeRange === 'Custom' && customDateRange
                                    ? `${new Date(customDateRange.start).toLocaleDateString()} - ${new Date(customDateRange.end).toLocaleDateString()}`
                                    : 'Custom Range'}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <ShadcnCalendar
                                mode="range"
                                selected={calendarDate}
                                onSelect={(range) => {
                                    setCalendarDate(range);
                                    if (range?.from && range?.to) {
                                        setCustomDateRange({
                                            start: format(range.from, 'yyyy-MM-dd'),
                                            end: format(range.to, 'yyyy-MM-dd')
                                        });
                                        setTimeRange('Custom');
                                        setDateRangePickerOpen(false);
                                    }
                                }}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setDatabaseViewerOpen(true)}
                        className="p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                        title="View Database"
                    >
                        <Database size={20} className="text-white/70" />
                    </button>
                    <button
                        onClick={handleManualRefresh}
                        className={`p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all ${isRefreshing ? 'animate-spin' : 'hover:rotate-180 duration-500'}`}
                        title="Refresh Data"
                    >
                        <RefreshCw size={20} className="text-white/70" />
                    </button>
                </div>
            </div>

            <div className="mb-20">
                {/* ... Top Charts ... */}
                {showEmptyState ? <EmptyState timeRange={timeRange} /> : (
                    <div key={timeRange} className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* TOP ARTISTS */}
                        <div>
                            <div className="flex justify-between items-center mb-6 px-1">
                                <h3 className="text-[20px] font-bold text-white tracking-tight">Top Artists</h3>
                                <button onClick={() => handleSeeAll('artist')} className="text-sm font-semibold text-[#FA2D48] hover:text-[#ff5c70] transition-colors px-4 py-2 bg-white/5 rounded-full hover:bg-white/10">See All</button>
                            </div>
                            {safeArtists.length > 0 && (
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
                            )}
                        </div>

                        {/* TOP ALBUMS */}
                        <div>
                            <div className="flex justify-between items-center mb-6 px-1">
                                <h3 className="text-[20px] font-bold text-white tracking-tight">Top Albums</h3>
                                <button onClick={() => handleSeeAll('album')} className="text-sm font-semibold text-[#FA2D48] hover:text-[#ff5c70] transition-colors px-4 py-2 bg-white/5 rounded-full hover:bg-white/10">See All</button>
                            </div>
                            {safeAlbums.length > 0 && (
                                <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-6 scroll-smooth gap-0">
                                    {safeAlbums.slice(0, 8).map((album: Album, index: number) => (
                                        <RankedAlbum key={album.id} album={album} rank={index + 1} onClick={() => setSelectedTopAlbum(album)} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* TOP SONGS */}
                        <div>
                            <div className="flex justify-between items-center mb-6 px-1">
                                <h3 className="text-[20px] font-bold text-white tracking-tight">Top Songs</h3>
                                <button onClick={() => handleSeeAll('song')} className="text-sm font-semibold text-[#FA2D48] hover:text-[#ff5c70] transition-colors px-4 py-2 bg-white/5 rounded-full hover:bg-white/10">See All</button>
                            </div>
                            {safeSongs.length > 0 && (
                                <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-6 scroll-smooth gap-0">
                                    {safeSongs.slice(0, 8).map((song: Song, index: number) => (
                                        <RankedSong key={song.id} song={song} rank={index + 1} onClick={() => setSelectedTopSong(song)} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <UpcomingArtists recentPlays={safeRecent} topArtists={safeArtists} artistImages={artistImages} />
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-20">
                <div className="rounded-3xl p-6 relative overflow-hidden min-h-[600px] border-none bg-transparent">
                    <TrendingArtists artists={safeArtists} albums={safeAlbums} songs={safeSongs} recentPlays={safeRecent} artistImages={artistImages} timeRange={timeRange} />
                </div>
            </div>
            
            <div className="mb-24 px-1">
                 <ActivityHeatmap history={safeRecent} />
            </div>
        </div>

    </Layout>

    <SeeAllModal 
        isOpen={seeAllModal.isOpen}
        onClose={() => setSeeAllModal(prev => ({ ...prev, isOpen: false }))}
        title={seeAllModal.title}
        items={seeAllModal.items}
        type={seeAllModal.type}
    />

    <DatabaseViewer
        isOpen={databaseViewerOpen}
        onClose={() => setDatabaseViewerOpen(false)}
    />

    {/* ARTIST DETAIL MODAL */}
    <FullScreenModal
        isOpen={!!selectedTopArtist}
        onClose={() => setSelectedTopArtist(null)}
        image={selectedTopArtist ? (artistImages[selectedTopArtist.name] || selectedTopArtist.image) : undefined}
        color={auraColor}
    >
        {selectedTopArtist && (
            <div className="flex flex-col items-center max-w-2xl mx-auto">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.1 }}
                    className="relative mb-6 group"
                >
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
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex flex-col items-center gap-1 mb-6"
                >
                    <div className="flex items-center justify-center gap-3">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center tracking-tight">
                            {selectedTopArtist.name}
                        </h1>
                    </div>

                    <p className="text-lg text-white/70">
                        {selectedTopArtist.timeStr || '0m'} listened
                    </p>

                    {artistDiscoveryDate && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/60 mt-2">
                            <Calendar size={12} />
                            <span>First discovered on {new Date(artistDiscoveryDate).toLocaleDateString()}</span>
                        </div>
                    )}
                </motion.div>

                {/* Stats Carousel (Auto-Rotating) */}
                <StatsCarousel stats={selectedArtistStats} artist={selectedTopArtist} />

                <div className="w-full mb-6">
                    {/* Obsession Orbit */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                        className="w-full"
                    >
                        <ArtistOrbit
                            centralNode={{ id: selectedTopArtist.id, name: selectedTopArtist.name, image: artistImages[selectedTopArtist.name] || selectedTopArtist.image || '' }}
                            orbitNodes={(dbUnifiedData?.songs || [])
                                .filter((s: any) => s.artist_name === selectedTopArtist.name || s.artist === selectedTopArtist.name)
                                .sort((a: any, b: any) => (b.plays || b.listens || 0) - (a.plays || a.listens || 0))
                                .slice(0, 24)
                                .map((s: any) => ({
                                    id: s.id,
                                    name: s.track_name || s.title,
                                    image: s.cover || s.album_cover,
                                    plays: s.listens || s.plays,
                                    time: s.timeStr
                                }))
                            }
                            color={auraColor}
                            history={safeRecent.filter((p: any) => p.artist_name === selectedTopArtist.name)}
                        />
                    </motion.div>
                </div>
            </div>
        )}
    </FullScreenModal>

    {/* ALBUM DETAIL MODAL */}
    <FullScreenModal
        isOpen={!!selectedTopAlbum}
        onClose={() => setSelectedTopAlbum(null)}
        image={selectedTopAlbum?.cover}
        color={auraColor}
    >
        {selectedTopAlbum && (
            <div className="flex flex-col items-center max-w-2xl mx-auto">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.1 }}
                    className="relative mb-6 group"
                >
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

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center justify-center gap-3 mb-1"
                >
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center tracking-tight">
                        {selectedTopAlbum.title}
                    </h1>
                </motion.div>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg text-white/70 mb-2 text-center"
                >
                    {selectedTopAlbum.artist}
                </motion.p>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.22 }}
                    className="text-sm font-medium mb-6 text-center text-white/50"
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
                        <TrendingUp size={16} className="mb-1.5 opacity-80" />
                        <span className="text-xl font-bold text-white">{selectedTopAlbum.totalListens || (selectedTopAlbum as any).listens || 0}</span>
                        <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Plays</span>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                        <Clock size={16} className="mb-1.5 opacity-80" />
                        <span className="text-xl font-bold text-white">{selectedTopAlbum.timeStr ? String(selectedTopAlbum.timeStr).replace('m', '') : '0'}</span>
                        <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Minutes</span>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center relative group">
                        <Sparkles size={16} className="mb-1.5 opacity-80" />
                        <span className="text-xl font-bold text-white">
                            {selectedTopAlbum.totalListens ? Math.round((selectedTopAlbum.totalListens / (safeRecent.length || 1)) * 100) : 0}%
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Of Plays</span>
                    </div>
                </motion.div>
            </div>
        )}
    </FullScreenModal>

    {/* SONG DETAIL MODAL */}
    <FullScreenModal
        isOpen={!!selectedTopSong}
        onClose={() => setSelectedTopSong(null)}
        image={selectedTopSong?.cover}
        color={auraColor}
    >
        {selectedTopSong && (
            <div className="flex flex-col items-center max-w-2xl mx-auto">
                <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.1 }}
                    className="relative mb-6 group"
                >
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

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center justify-center gap-3 mb-1"
                >
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center tracking-tight">
                        {selectedTopSong.title}
                    </h1>
                </motion.div>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg text-white/70 mb-2 text-center"
                >
                    {selectedTopSong.artist}
                </motion.p>
                {selectedTopSong.album && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.22 }}
                        className="text-sm text-white/50 mb-4 text-center"
                    >
                        {selectedTopSong.album}
                    </motion.p>
                )}

                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="grid grid-cols-3 gap-3 w-full max-w-lg mb-8"
                >
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                        <TrendingUp size={16} className="mb-1.5 opacity-80" />
                        <span className="text-xl font-bold text-white">{selectedTopSong.listens || 0}</span>
                        <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Plays</span>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                        <Clock size={16} className="mb-1.5 opacity-80" />
                        <span className="text-xl font-bold text-white">{selectedTopSong.timeStr ? String(selectedTopSong.timeStr).replace('m', '') : '0'}</span>
                        <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Minutes</span>
                    </div>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center relative group">
                        <Sparkles size={16} className="mb-1.5 opacity-80" />
                        <span className="text-xl font-bold text-white">
                            {selectedTopSong.listens ? Math.round((selectedTopSong.listens / (safeRecent.length || 1)) * 100) : 0}%
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">Of Plays</span>
                    </div>
                </motion.div>
            </div>
        )}
    </FullScreenModal>

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
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#FA2D48]/10 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-[#FA2D48]" />
                            </div>
                            <h2 className="text-base font-bold text-white tracking-tight">AI Discovery</h2>
                        </div>
                        <button
                            onClick={() => { setAiModalOpen(false); setAiInitialQuery(undefined); }}
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden min-h-0 h-0">
                        <AISpotlight
                            token={token}
                            history={safeRecent}
                            user={data.user}
                            contextData={{
                                userName: data.user?.display_name,
                                artists: safeArtists.map((a: Artist) => a.name),
                                albums: safeAlbums.map((a: Album) => a.title),
                                songs: safeSongs.map((s: Song) => s.title),
                                globalStats: dbStats
                            }}
                            initialQuery={aiInitialQuery}
                        />
                    </div>
                </motion.div>
            </motion.div>
        )}
    </AnimatePresence>

        <BackToTop />
    </>
  );
}

export default App;
