import React, { useState, useEffect, useMemo } from 'react';
import { Music, X, TrendingUp, Clock, Calendar } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Layout } from './components/Layout';
// import { TopCharts } from './components/TopCharts';
import { RankingWidget } from './components/RankingWidget';
import { AISpotlight } from './components/AISpotlight';
import { TrendingArtists } from './components/TrendingArtists';
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
    <div className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]">
        <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40">
            {rank}
        </span>
        <div className="relative z-10 ml-10 md:ml-12">
            <div className="w-32 h-32 md:w-40 md:h-40 overflow-hidden rounded-xl bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                <img src={album.cover} alt={album.title} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm" />
                {/* Hover Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                     <span className="text-white font-bold text-xl drop-shadow-md">{album.timeStr}</span>
                </div>
            </div>
            <div className="mt-3 relative z-20">
                <h3 className="text-[15px] font-semibold text-white truncate w-32 md:w-40 leading-tight group-hover:text-[#FA2D48] transition-colors">{album.title}</h3>
                <p className="text-[13px] text-[#8E8E93] truncate w-32 md:w-40 mt-0.5 font-medium">{album.artist} • <span className="text-[#FA2D48]">{album.timeStr}</span></p>
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
        <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40">
            {rank}
        </span>
        <div className="relative z-10 ml-10 md:ml-12">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                <img 
                    src={realImage || artist.image || `https://ui-avatars.com/api/?name=${artist.name}&background=1DB954&color=fff`} 
                    alt={artist.name} 
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm" 
                />
                {/* Hover Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                     <span className="text-white font-bold text-xl drop-shadow-md">{artist.timeStr}</span>
                </div>
            </div>
            <div className="mt-3 relative z-20">
                <h3 className="text-[15px] font-semibold text-white truncate w-32 md:w-40 leading-tight group-hover:text-[#FA2D48] transition-colors">{artist.name}</h3>
            </div>
        </div>
    </div>
);

// RANKED COMPONENT: Top Song (Ranked Album Style)
const RankedSong = ({ song, rank }: { song: Song, rank: number }) => (
    <div className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]">
        <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40">
            {rank}
        </span>
        <div className="relative z-10 ml-10 md:ml-12">
            <div className="w-32 h-32 md:w-40 md:h-40 overflow-hidden rounded-xl bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                <img src={song.cover} alt={song.title} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm" />
                {/* Hover Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                     <span className="text-white font-bold text-xl drop-shadow-md">{song.timeStr}</span>
                </div>
            </div>
            <div className="mt-3 relative z-20">
                <h3 className="text-[15px] font-semibold text-white truncate w-32 md:w-40 leading-tight group-hover:text-[#FA2D48] transition-colors">{song.title}</h3>
                <p className="text-[13px] text-[#8E8E93] truncate w-32 md:w-40 mt-0.5 font-medium">{song.artist} • <span className="text-[#FA2D48]">{song.timeStr}</span></p>
            </div>
        </div>
    </div>
);

import { SeeAllModal } from './components/SeeAllModal';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('spotify_token'));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [dbUnifiedData, setDbUnifiedData] = useState<any>(null);
  const [artistImages, setArtistImages] = useState<Record<string, string>>({}); // Real artist images

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
                setArtistImages(prev => ({ ...prev, ...newImages }));
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

  const [timeRange, setTimeRange] = useState<'Daily' | 'Weekly' | 'Monthly'>('Weekly');
  
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

      // Function to refresh DB view
      const refreshDbStats = async () => {
          console.log(`[App] Refreshing DB Stats for ${timeRange}...`);
          try {
            // If we have manual data, don't clear it immediately to prevent flashing
            const stats = await fetchListeningStats();
            const dashboardStuff = await fetchDashboardStats(timeRange);
            // Fetch dynamic charts for AI context
            const currentCharts = await fetchCharts(timeRange.toLowerCase() as any);
            
            console.log("[App] Dashboard Stats Fetched:", { 
                hasStats: !!stats, 
                artistCount: dashboardStuff?.artists?.length || 0,
                songCount: dashboardStuff?.songs?.length || 0,
                albumCount: dashboardStuff?.albums?.length || 0
            });

            if (dashboardStuff) {
                setDbStats({ ...stats, charts: currentCharts });
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
             // Use syncRecentPlays as the source of truth
             await syncRecentPlays(data.recentRaw); 
             
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

  if (!token) {
      return (
          <div className="min-h-[100dvh] min-h-screen bg-[#0B0B0C] text-white flex items-center justify-center p-6 relative overflow-hidden">
              <div className="absolute inset-0">
                  <div className="absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#FA2D48]/15 blur-[120px]" />
                  <div className="absolute bottom-[-20%] right-[-10%] h-[360px] w-[360px] rounded-full bg-[#2C2C2E]/40 blur-[140px]" />
              </div>

              <div className="relative w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#1C1C1E]/90 backdrop-blur-xl p-8 md:p-12 shadow-2xl">
                  <div className="flex flex-col items-center text-center gap-6">
                      <div className="w-20 h-20 bg-gradient-to-tr from-[#FA2D48] to-[#FF2D55] rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(250,45,72,0.4)]">
                          <Music className="w-10 h-10 text-white" />
                      </div>
                      <div className="space-y-3">
                          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Authenticate with Spotify</h1>
                          <p className="text-[#8E8E93] text-base md:text-lg max-w-xl">
                              Link your Spotify account to unlock real-time charts, AI insights, and your personalized listening story.
                          </p>
                      </div>
                  </div>
                  
                  <div className="mt-8 space-y-4">
                      <button 
                        onClick={handleConnect}
                        className="w-full bg-[#FA2D48] hover:bg-[#d4253d] text-white font-semibold py-3.5 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-[#FA2D48]/25"
                      >
                        Connect Spotify
                      </button>
                      <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#8E8E93]">
                          <span className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                              Secure OAuth • Read-only access
                          </span>
                          <span>
                              We only use your listening history to build your dashboard.
                          </span>
                      </div>
                  </div>
              </div>
          </div>
      );
  }



  if (loading || !data) {
      return (
          <Layout user={null} currentTrack={null}>
              <div className="flex h-[80vh] flex-col items-center justify-center gap-8 relative overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,45,72,0.25),_rgba(0,0,0,0))]" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(44,44,46,0.45),_rgba(0,0,0,0))]" />
                  </div>

                  <div className="relative w-full max-w-lg rounded-[28px] border border-white/10 bg-[#1C1C1E]/90 p-8 backdrop-blur-xl shadow-2xl">
                      <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl bg-[#2C2C2E] flex items-center justify-center border border-white/10">
                              <Music className="w-7 h-7 text-[#FA2D48]" />
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-white tracking-tight">Syncing your library</h3>
                              <p className="text-[#8E8E93] text-sm">Building your charts and AI insights</p>
                          </div>
                      </div>

                      <div className="mt-6 space-y-4">
                          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full w-1/2 bg-gradient-to-r from-[#FA2D48] via-[#FF2D55] to-[#FA2D48] animate-pulse rounded-full" />
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                              {['Top artists', 'Top tracks', 'Recent plays'].map((label) => (
                                  <div key={label} className="rounded-xl border border-white/5 bg-white/5 p-3">
                                      <div className="h-3 w-16 bg-white/20 rounded-full mb-3 animate-pulse" />
                                      <div className="h-6 w-full bg-[#2C2C2E] rounded-lg" />
                                      <p className="text-[10px] text-[#8E8E93] mt-3 uppercase tracking-widest">{label}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  
                  {loading === false && !data && (
                      <button 
                        onClick={handleConnect}
                        className="mt-2 px-6 py-2.5 bg-[#FA2D48] text-white text-xs font-bold rounded-full hover:scale-105 transition-transform z-10 shadow-lg shadow-[#FA2D48]/20"
                      >
                        Reconnect Spotify
                      </button>
                  )}
              </div>
          </Layout>
      );
  }

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
  
  // Strict DB check for charts
  const showEmptyState = !loading && dbUnifiedData && !hasDbData;

  return (
    <>
    <Layout user={data.user} currentTrack={data.currentTrack}>
        
        {/* SECTION 1: AI DISCOVERY - Clean Centered Design */}
        <div className="mb-24 mt-8">
            <AISpotlight 
                token={token}
                history={safeRecent}
                user={data.user}
                contextData={{
                    userName: data.user?.display_name,
                    artists: safeArtists.map((a: Artist, idx: number) => {
                        const time = a.timeStr || '';
                        const mins = time.replace('m', '');
                        // Include Rank for AI
                        return `Rank #${idx + 1}: ${a.name} (${mins} minutes listened, ${a.totalListens || 0} plays)`;
                    }),
                    albums: safeAlbums.map((a: Album, idx: number) => {
                        const time = a.timeStr || '';
                        const mins = time.replace('m', '');
                        return `Rank #${idx + 1}: ${a.title} by ${a.artist} (${mins} minutes, ${a.totalListens || 0} plays)`;
                    }),
                    songs: safeSongs.map((s: Song, idx: number) => {
                        const time = s.timeStr || '';
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
                    {(['Daily', 'Weekly', 'Monthly'] as const).map((range) => (
                        <button 
                            key={range}
                            onClick={() => {
                                setTimeRange(range);
                                fetchDashboardStats(range).then(setDbUnifiedData);
                            }}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                                timeRange === range 
                                    ? 'bg-[#FA2D48] text-white' 
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
                    <Music size={48} className="text-[#FA2D48] mb-4 opacity-50" />
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
                            className="text-xs font-bold text-[#FA2D48] hover:text-white transition-colors uppercase tracking-wider"
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
                            className="text-xs font-bold text-[#FA2D48] hover:text-white transition-colors uppercase tracking-wider"
                        >
                            See All
                        </button>
                        )}
                    </div>
                    {safeAlbums.length > 0 ? (
                        <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-6 scroll-smooth gap-0">
                            {safeAlbums.slice(0, 8).map((album: Album, index: number) => (
                                <RankedAlbum key={album.id} album={album} rank={index + 1} />
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
                            className="text-xs font-bold text-[#FA2D48] hover:text-white transition-colors uppercase tracking-wider"
                        >
                            See All
                        </button>
                        )}
                    </div>
                    {safeSongs.length > 0 ? (
                        <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-6 scroll-smooth gap-0">
                            {safeSongs.slice(0, 8).map((song: Song, index: number) => (
                                <RankedSong key={song.id} song={song} rank={index + 1} />
                            ))}
                        </div>
                    ) : (
                        <p className="text-[#8E8E93] text-sm pl-6 italic">Not enough data to rank songs yet.</p>
                    )}
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
            <>
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedTopArtist(null)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] lg:z-[40] lg:bg-transparent lg:backdrop-blur-none lg:pointer-events-none"
                />
                
                <motion.div 
                    initial={{ opacity: 0, x: 20, scale: 0.95 }} 
                    animate={{ opacity: 1, x: 0, scale: 1 }} 
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    className="fixed bottom-0 lg:bottom-12 right-0 lg:right-12 w-full lg:w-[320px] max-h-[85vh] z-[70] outline-none pointer-events-auto"
                >
                    <div className="bg-[#1C1C1E]/95 backdrop-blur-2xl border-t lg:border border-white/10 lg:rounded-3xl rounded-t-[32px] overflow-hidden shadow-2xl relative flex flex-col max-h-full">
                        
                        {/* Header Image */}
                        <div className="relative h-48 flex-shrink-0">
                            <img 
                                src={artistImages[selectedTopArtist.name] || selectedTopArtist.image || `https://ui-avatars.com/api/?name=${selectedTopArtist.name}`} 
                                className="w-full h-full object-cover opacity-80" 
                                alt={selectedTopArtist.name}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-[#1C1C1E]/40 to-transparent"></div>
                            
                            <button 
                                onClick={() => setSelectedTopArtist(null)}
                                className="absolute top-4 right-4 bg-black/40 hover:bg-black/80 rounded-full p-2 text-white z-20 backdrop-blur-md transition-all active:scale-95 border border-white/10"
                            >
                                <X size={18} />
                            </button>

                            <div className="absolute bottom-4 left-6 right-6">
                                <div className="flex items-center gap-2 mb-2">
                                        <span className="bg-[#FA2D48] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg shadow-red-500/20">
                                        Rank #{data?.artists?.findIndex((a: Artist) => a.id === selectedTopArtist.id) + 1 || '?'}
                                        </span>
                                </div>
                                <h2 className="text-2xl font-black text-white leading-tight drop-shadow-lg line-clamp-2">
                                    {selectedTopArtist.name}
                                </h2>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-6 pt-2 overflow-y-auto custom-scrollbar bg-gradient-to-b from-[#1C1C1E] to-black">
                            
                            {/* Key Stats Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center text-center">
                                    <TrendingUp size={16} className="text-[#FA2D48] mb-1" />
                                    <span className="text-xl font-bold text-white">{selectedTopArtist.totalListens || 0}</span>
                                    <span className="text-[9px] uppercase tracking-widest text-[#8E8E93]">Plays</span>
                                </div>
                                <div className="bg-white/5 rounded-2xl p-3 border border-white/5 flex flex-col items-center justify-center text-center">
                                    <Clock size={16} className="text-[#FA2D48] mb-1" />
                                    <span className="text-xl font-bold text-white">{selectedTopArtist.timeStr ? String(selectedTopArtist.timeStr).replace('m', '') : '0'}</span>
                                    <span className="text-[9px] uppercase tracking-widest text-[#8E8E93]">Minutes</span>
                                </div>
                            </div>

                            {/* "Why this top?" / Insights */}
                            <div className="mb-6">
                                <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Sparkles size={12} className="text-[#FA2D48]" /> Listening Traits
                                </h4>
                                
                                <div className="space-y-2">
                                    <div className="bg-[#2C2C2E]/50 rounded-xl p-3 flex items-center gap-3 border border-white/5">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-orange-400">
                                            <Calendar size={14} />
                                        </div>
                                        <div>
                                            <div className="text-white text-xs font-bold">Consistent Fan</div>
                                            <div className="text-[#8E8E93] text-[10px]">Appears frequently in your weekly rotation.</div>
                                        </div>
                                    </div>
                                    
                                    {/* Calculated Insight Placeholder */}
                                    <div className="bg-[#2C2C2E]/50 rounded-xl p-3 flex items-center gap-3 border border-white/5">
                                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-blue-400">
                                            <Music size={14} />
                                        </div>
                                        <div>
                                            <div className="text-white text-xs font-bold">Catalogue Explorer</div>
                                            <div className="text-[#8E8E93] text-[10px]">You listen to multiple tracks from this artist.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Top Songs List */}
                            <div>
                                <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-widest mb-3">Top Tracks</h4>
                                <div className="space-y-2">
                                    {(dbUnifiedData?.songs || [])
                                        .filter((s: any) => s.artist_name === selectedTopArtist.name || s.artist === selectedTopArtist.name)
                                        .sort((a: any, b: any) => (b.plays || b.listens || 0) - (a.plays || a.listens || 0))
                                        .slice(0, 5)
                                        .map((song: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors group">
                                                <div className="w-8 h-8 rounded-md bg-[#2C2C2E] overflow-hidden flex-shrink-0 relative">
                                                    <img src={song.cover || song.album_cover} className="w-full h-full object-cover" alt={song.title} />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="w-0.5 h-2 bg-white mx-0.5 rounded-full"></div>
                                                        <div className="w-0.5 h-3 bg-white mx-0.5 rounded-full"></div>
                                                        <div className="w-0.5 h-2 bg-white mx-0.5 rounded-full"></div>
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-xs font-bold text-white truncate group-hover:text-[#FA2D48] transition-colors">
                                                        {song.track_name || song.title}
                                                    </div>
                                                    <div className="text-[9px] text-[#8E8E93]">
                                                            {song.listens || song.plays || 0} plays • {song.timeStr || '0m'}
                                                    </div>
                                                </div>
                                            </div>
                                    ))}
                                    {(dbUnifiedData?.songs || []).filter((s: any) => s.artist_name === selectedTopArtist.name).length === 0 && (
                                        <p className="text-[#8E8E93] text-xs italic">No specific track data available.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </>
        )}
    </AnimatePresence>
    </>
  );
}

export default App;
