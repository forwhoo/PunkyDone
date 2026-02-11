import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Music, X, TrendingUp, Clock, Calendar, Sparkles, Disc } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Layout } from './components/Layout';
import { Artist, Album, Song } from './types';
// import { TopCharts } from './components/TopCharts';
import { RankingWidget } from './components/RankingWidget';
import { AISpotlight } from './components/AISpotlight';
import { TrendingArtists } from './components/TrendingArtists';
import { UpcomingArtists } from './components/UpcomingArtists';
import { rankingMockData } from './mockData';
import { ActivityHeatmap } from './components/ActivityHeatmap';

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
const RankedAlbum = ({ album, rank }: { album: Album, rank: number }) => (
    <div className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[160px] sm:w-[180px] md:w-[220px]">
        <span className="text-[120px] sm:text-[140px] leading-none font-black text-outline absolute -left-5 sm:-left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40 text-white/5">
            {rank}
        </span>
        <div className="relative z-10 ml-8 sm:ml-10 md:ml-12">
            <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 overflow-hidden rounded-xl bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                <img src={album.cover} alt={album.title} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm" />
                {/* Hover Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                    <span className="text-white font-bold text-lg sm:text-xl drop-shadow-md">{album.timeStr}</span>
                </div>
            </div>
            <div className="mt-2 sm:mt-3 relative z-20">
                <h3 className="text-[13px] sm:text-[15px] font-semibold text-white truncate w-28 sm:w-32 md:w-40 leading-tight group-hover:text-white transition-colors">{album.title}</h3>
                <p className="text-[11px] sm:text-[13px] text-[#8E8E93] truncate w-28 sm:w-32 md:w-40 mt-0.5 font-medium">{album.artist} • <span className="text-white/60">{album.timeStr}</span></p>
            </div>
        </div>
    </div>
);

// RANKED COMPONENT: Top Artist (Number style like Top Albums)
const RankedArtist = ({ artist, rank, realImage, onClick }: { artist: Artist, rank: number, realImage?: string, onClick?: () => void }) => (
    <div
        className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[160px] sm:w-[180px] md:w-[220px]"
        onClick={onClick}
    >
        <span className="text-[120px] sm:text-[140px] leading-none font-black text-outline absolute -left-5 sm:-left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40 text-white/5">
            {rank}
        </span>
        <div className="relative z-10 ml-8 sm:ml-10 md:ml-12">
            <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                <img
                    src={realImage || artist.image || `https://ui-avatars.com/api/?name=${artist.name}&background=1DB954&color=fff`}
                    alt={artist.name}
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm"
                />
                {/* Hover Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                    <span className="text-white font-bold text-lg sm:text-xl drop-shadow-md">{artist.timeStr}</span>
                </div>
            </div>
            <div className="mt-2 sm:mt-3 relative z-20">
                <h3 className="text-[13px] sm:text-[15px] font-semibold text-white truncate w-28 sm:w-32 md:w-40 leading-tight group-hover:text-white transition-colors">{artist.name}</h3>
            </div>
        </div>
    </div>
);

// RANKED COMPONENT: Top Song (Ranked Album Style)
const RankedSong = ({ song, rank }: { song: Song, rank: number }) => (
    <div className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[160px] sm:w-[180px] md:w-[220px]">
        <span className="text-[120px] sm:text-[140px] leading-none font-black text-outline absolute -left-5 sm:-left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40 text-white/5">
            {rank}
        </span>
        <div className="relative z-10 ml-8 sm:ml-10 md:ml-12">
            <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-40 md:h-40 overflow-hidden rounded-xl bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                <img src={song.cover} alt={song.title} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm" />
                {/* Hover Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                    <span className="text-white font-bold text-lg sm:text-xl drop-shadow-md">{song.timeStr}</span>
                </div>
            </div>
            <div className="mt-2 sm:mt-3 relative z-20">
                <h3 className="text-[13px] sm:text-[15px] font-semibold text-white truncate w-28 sm:w-32 md:w-40 leading-tight group-hover:text-white transition-colors">{song.title}</h3>
                <p className="text-[11px] sm:text-[13px] text-[#8E8E93] truncate w-28 sm:w-32 md:w-40 mt-0.5 font-medium">{song.artist} • <span className="text-white/60">{song.timeStr}</span></p>
            </div>
        </div>
    </div>
);


import { PunkyWrapped } from './components/PunkyWrapped';
import { SeeAllModal } from './components/SeeAllModal';

function App() {
    const [token, setToken] = useState<string | null>(localStorage.getItem('spotify_token'));
    const [showWrapped, setShowWrapped] = useState(false);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [dbStats, setDbStats] = useState<any>(null);
    const [dbUnifiedData, setDbUnifiedData] = useState<any>(null);

    // Persist images to prevent reloading glitches
    const [artistImages, setArtistImages] = useState<Record<string, string>>(() => {
        try {
            const saved = localStorage.getItem('artist_images_cache');
            return saved ? JSON.parse(saved) : {};
        } catch (e) { return {}; }
    });

    // Top Artist Side Modal State
    const [selectedTopArtist, setSelectedTopArtist] = useState<Artist | null>(null);

    // See All Modal State
    const [seeAllModal, setSeeAllModal] = useState<{ isOpen: boolean; title: string; items: any[]; type: 'artist' | 'album' | 'song' }>({
        isOpen: false,
        title: '',
        items: [],
        type: 'artist'
    });

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

    const [timeRange, setTimeRange] = useState<'Daily' | 'Weekly' | 'Monthly' | 'All Time'>('Weekly');

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

    useEffect(() => {
        const handleAuth = async () => {
            // Check for Auth Code (PKCE - New Standard)
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");

            if (code) {
                try {
                    const accessToken = await getAccessToken(code);
                    if (accessToken) {
                        setToken(accessToken);
                        localStorage.setItem('spotify_token', accessToken);
                        // Clean URL
                        window.history.replaceState({}, document.title, "/");
                    }
                } catch (e) {
                    console.error(e);
                }
                return;
            }

            // Check URL for token (Implicit Grant - Legacy Backup)
            const urlToken = getTokenFromUrl();
            if (urlToken) {
                setToken(urlToken);
                localStorage.setItem('spotify_token', urlToken);
                window.location.hash = '';
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
        await redirectToAuthCodeFlow();
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

    if (!token) {
        return (
            <div className="min-h-[100dvh] min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-white/5 blur-[120px]" />
                    <div className="absolute bottom-[-20%] right-[-10%] h-[400px] w-[400px] rounded-full bg-white/5 blur-[140px]" />
                </div>

                <div className="relative w-full max-w-xl p-8 md:p-12 z-10 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center mb-8 shadow-[0_0_80px_rgba(255,255,255,0.15)]">
                        <Music className="w-12 h-12 text-black" strokeWidth={2.5} />
                    </div>

                    <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-4 text-white">Muse Analytics</h1>
                    <p className="text-[#8E8E93] text-lg max-w-md leading-relaxed mb-10">
                        Unlock your listening DNA. Real-time charts, AI insights, and your personalized music story.
                    </p>

                    <button
                        onClick={handleConnect}
                        className="w-full max-w-sm bg-white hover:bg-gray-200 text-black font-semibold text-lg py-4 rounded-full transition-all active:scale-[0.98] shadow-lg shadow-white/10"
                    >
                        Connect with Spotify
                    </button>

                    <p className="mt-6 text-xs text-[#505055] font-medium tracking-wide uppercased">
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
                            className="mt-8 px-8 py-3 bg-white text-black text-sm font-bold rounded-full hover:bg-gray-200 transition-colors z-10"
                        >
                            Retry Connection
                        </button>
                    )}
                </div>
            </Layout>
        );
    }



    return (
        <>
            <Layout user={data.user} currentTrack={data.currentTrack}>

                {/* SECTION 1: AI DISCOVERY - Clean Centered Design */}
                <div className="mb-24 mt-8 relative">
                    <div className="absolute -top-16 right-0 z-20 hidden md:block">
                        <button
                            onClick={() => setShowWrapped(true)}
                            className="group relative overflow-hidden bg-[#1C1C1E] border border-white/20 text-white font-black uppercase text-xs tracking-[0.2em] px-8 py-3 rounded-full hover:border-white/50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95"
                        >
                            <span className="relative z-10 block group-hover:-translate-y-10 transition-transform duration-300">Punky Wrapped</span>
                            <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 font-bold italic bg-white text-black translate-y-10 group-hover:translate-y-0">
                                Arrived!
                            </span>
                            {/* Shine Effect */}
                            <span className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-25deg] group-hover:animate-shine" />
                        </button>
                    </div>
                    <AISpotlight
                        token={token}
                        history={safeRecent}
                        user={data.user}
                        contextData={{
                            userName: data.user?.display_name,
                            artists: safeArtists.map((a: Artist, idx: number) => {
                                const time = String(a.timeStr || '');
                                const mins = time.replace('m', '');
                                // Include Rank for AI
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

                {/* SECTION 2: TOP RANKINGS - Prominent Showcase */}
                <div className="mb-20">
                    <div className="flex items-center justify-between mb-8 px-1">
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Your Top Charts</h2>
                            <p className="text-[#8E8E93] text-sm mt-1">Your most played this {timeRange.toLowerCase()}</p>
                        </div>
                        <div className="flex gap-2">
                            {(['Daily', 'Weekly', 'Monthly', 'All Time'] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => {
                                        setTimeRange(range);
                                        fetchDashboardStats(range).then(data => setDbUnifiedData(data));
                                    }}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${timeRange === range
                                        ? 'bg-white text-black'
                                        : 'bg-[#1C1C1E] text-[#8E8E93] hover:text-white border border-white/10'
                                        }`}
                                >
                                    {range}
                                </button>
                            ))}
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
                                    <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-4 sm:pl-6 scroll-smooth gap-0">
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
                                    <p className="text-[#8E8E93] text-sm pl-4 sm:pl-6 italic">Not enough data to rank artists yet.</p>
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
                                    <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-4 sm:pl-6 scroll-smooth gap-0">
                                        {safeAlbums.slice(0, 8).map((album: Album, index: number) => (
                                            <RankedAlbum key={album.id} album={album} rank={index + 1} />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[#8E8E93] text-sm pl-4 sm:pl-6 italic">Not enough data to rank albums yet.</p>
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
                                    <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-4 sm:pl-6 scroll-smooth gap-0">
                                        {safeSongs.slice(0, 8).map((song: Song, index: number) => (
                                            <RankedSong key={song.id} song={song} rank={index + 1} />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[#8E8E93] text-sm pl-6 italic">Not enough data to rank songs yet.</p>
                                )}
                            </div>

                            {/* UPCOMING ARTISTS */}
                            <UpcomingArtists
                                recentPlays={safeRecent}
                                topArtists={safeArtists}
                                artistImages={artistImages}
                            />

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

                    {/* RIGHT: CHARTS + ARCHIVE */}
                    <div className="space-y-8">
                    </div>

                </div>

                {/* Activity Heatmap - Bottom */}
                <div className="mb-24 px-1">
                    <ActivityHeatmap history={safeRecent} />
                </div>

            </Layout>

            {/* Global Modals - Moved Outside Layout to fix positioning context */}
            <AnimatePresence>
                {showWrapped && (
                    <PunkyWrapped
                        period={timeRange === 'Daily' ? 'daily' : timeRange === 'All Time' ? 'all time' : 'weekly'}
                        onClose={() => setShowWrapped(false)}
                    />
                )}
            </AnimatePresence>

            <SeeAllModal
                isOpen={seeAllModal.isOpen}
                onClose={() => setSeeAllModal(prev => ({ ...prev, isOpen: false }))}
                title={seeAllModal.title}
                items={seeAllModal.items}
                type={seeAllModal.type}
            />

            {/* Artist Side Modal (Orbit Style) */}
            <AnimatePresence>
                {selectedTopArtist && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 backdrop-blur-3xl bg-black/85"
                        onClick={() => setSelectedTopArtist(null)}
                    >
                        <div
                            className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto no-scrollbar flex flex-col items-center py-6 sm:py-8"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedTopArtist(null)}
                                className="absolute top-2 right-2 sm:top-4 sm:right-4 lg:right-0 p-2.5 sm:p-3 bg-[#2C2C2E]/80 hover:bg-[#3A3A3C] rounded-full text-white backdrop-blur-md transition-all z-50 border border-white/10 hover:border-white/20"
                            >
                                <X size={18} className="sm:w-5 sm:h-5" />
                            </button>

                            {/* Artist Spotlight Image (Unblurred & Centered) */}
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                                className="relative z-10 mb-6 sm:mb-8 group"
                            >
                                <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 rounded-full p-1.5 sm:p-2 border-2 border-white/10 bg-black shadow-2xl relative overflow-visible">
                                    <div className="absolute inset-0 rounded-full bg-[#FA2D48] blur-[60px] sm:blur-3xl opacity-5 group-hover:opacity-15 transition-opacity duration-500"></div>
                                    <img
                                        src={artistImages[selectedTopArtist.name] || selectedTopArtist.image || `https://ui-avatars.com/api/?name=${selectedTopArtist.name}`}
                                        className="w-full h-full object-cover rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-[#1C1C1E]"
                                        alt={selectedTopArtist.name}
                                    />

                                    {/* Rank Badge */}
                                    <div className="absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 bg-gradient-to-br from-white to-gray-100 text-black px-4 sm:px-6 py-1 sm:py-1.5 rounded-full font-bold text-xs sm:text-sm shadow-xl border-2 border-white/30 whitespace-nowrap">
                                        Rank #{safeArtists.findIndex((a: Artist) => a.id === selectedTopArtist.id) + 1 || '?'}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Artist Name */}
                            <motion.h2
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-3xl sm:text-4xl md:text-5xl font-black text-white text-center mb-6 sm:mb-8 md:mb-10 tracking-tight px-4"
                            >
                                {selectedTopArtist.name}
                            </motion.h2>

                            {/* Stats Grid */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full max-w-3xl mb-8 sm:mb-10 md:mb-12 px-3 sm:px-4"
                            >
                                <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center hover:bg-[#2C2C2E] transition-all hover:border-white/10 hover:scale-105">
                                    <TrendingUp size={18} className="sm:w-5 sm:h-5 text-[#FA2D48] mb-2" />
                                    <span className="text-xl sm:text-2xl font-bold text-white mb-1">{selectedTopArtist.totalListens || 0}</span>
                                    <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#8E8E93]">Total Plays</span>
                                </div>
                                <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center hover:bg-[#2C2C2E] transition-all hover:border-white/10 hover:scale-105">
                                    <Clock size={18} className="sm:w-5 sm:h-5 text-[#FA2D48] mb-2" />
                                    <span className="text-xl sm:text-2xl font-bold text-white mb-1">{selectedTopArtist.timeStr ? String(selectedTopArtist.timeStr).replace('m', '') : '0'}</span>
                                    <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#8E8E93]">Minutes</span>
                                </div>
                                <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center hover:bg-[#2C2C2E] transition-all hover:border-white/10 hover:scale-105">
                                    <Calendar size={18} className="sm:w-5 sm:h-5 text-[#FA2D48] mb-2" />
                                    <span className="text-xl sm:text-2xl font-bold text-white mb-1">{selectedArtistStats?.peakDay || '—'}</span>
                                    <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#8E8E93]">Peak Day</span>
                                </div>
                                <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 sm:p-5 flex flex-col items-center text-center hover:bg-[#2C2C2E] transition-all hover:border-white/10 hover:scale-105">
                                    <Sparkles size={18} className="sm:w-5 sm:h-5 text-[#FA2D48] mb-2" />
                                    <span className="text-xl sm:text-2xl font-bold text-white mb-1">{selectedArtistStats?.popularityScore || 0}%</span>
                                    <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-[#8E8E93]">Popularity</span>
                                </div>
                            </motion.div>

                            {/* Top Tracks List */}
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="w-full max-w-2xl bg-[#1C1C1E] border border-white/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 mx-3 sm:mx-4"
                            >
                                <h3 className="text-base sm:text-lg font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
                                    <Disc size={16} className="sm:w-[18px] sm:h-[18px] text-[#FA2D48]" /> Top Tracks
                                </h3>

                                <div className="space-y-1.5 sm:space-y-2">
                                    {(dbUnifiedData?.songs || [])
                                        .filter((s: any) => s.artist_name === selectedTopArtist.name || s.artist === selectedTopArtist.name)
                                        .sort((a: any, b: any) => (b.plays || b.listens || 0) - (a.plays || a.listens || 0))
                                        .slice(0, 5)
                                        .map((song: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3 sm:gap-4 p-2.5 sm:p-3 hover:bg-white/5 rounded-lg sm:rounded-xl transition-colors group">
                                                <div className="text-[#8E8E93] font-mono text-xs sm:text-sm w-3 sm:w-4 flex-shrink-0">{idx + 1}</div>
                                                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#2C2C2E] overflow-hidden flex-shrink-0 relative">
                                                    <img src={song.cover || song.album_cover} className="w-full h-full object-cover" alt={song.title} />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs sm:text-sm font-bold text-white truncate">
                                                        {song.track_name || song.title}
                                                    </div>
                                                    <div className="text-[10px] sm:text-xs text-[#8E8E93] mt-0.5">
                                                        {song.listens || song.plays || 0} plays • {song.timeStr || '0m'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    {(dbUnifiedData?.songs || []).filter((s: any) => s.artist_name === selectedTopArtist.name).length === 0 && (
                                        <p className="text-[#8E8E93] text-xs sm:text-sm text-center py-6 sm:py-8 italic">No track data available for this artist in this period.</p>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default App;
