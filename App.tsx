import React, { useState, useEffect } from 'react';
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
const RankedArtist = ({ artist, rank, realImage }: { artist: Artist, rank: number, realImage?: string }) => (
    <div className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]">
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
        
        // 1. Get names from Top Artists
        const topArtists = dbUnifiedData?.artists || data?.artists || [];
        topArtists.slice(0, 15).forEach((a: Artist) => artistsToFetch.add(a.name));

        // 2. Get names from Recent to help Trending
        const recent = dbUnifiedData?.recentPlays || [];
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
          const stats = await fetchListeningStats();
          const dashboardStuff = await fetchDashboardStats(timeRange);
          // Fetch dynamic charts for AI context
          const currentCharts = await fetchCharts(timeRange.toLowerCase() as any);
          
          setDbStats({ ...stats, charts: currentCharts });
          setDbUnifiedData(dashboardStuff);
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
          <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
              <div className="w-20 h-20 bg-gradient-to-tr from-[#FA2D48] to-[#FF2D55] rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(250,45,72,0.4)]">
                  <Music className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Connect to Spotify</h1>
              <p className="text-[#8E8E93] max-w-md mb-8 text-lg">
                  Connect your account to unlock your personalized dashboard with real-time stats and AI insights.
              </p>
              
              <div className="w-full max-w-sm space-y-4">
                  <button 
                    onClick={handleConnect}
                    className="w-full bg-[#FA2D48] hover:bg-[#d4253d] text-white font-semibold py-3 rounded-xl transition-all active:scale-95"
                  >
                    Connect Account
                  </button>
                  <p className="text-xs text-[#555] mt-4">
                      By connecting, you agree to allow us to view your top artists and tracks.
                  </p>
              </div>
          </div>
      );
  }

// Set dynamic favicon (user wanted random album cover)
  useEffect(() => {
     if (data && data.albums && data.albums.length > 0) {
         // Pick random album
         const randomAlbum = data.albums[Math.floor(Math.random() * data.albums.length)];
         // Find or create favicon link
         let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
         if (!link) {
             link = document.createElement('link');
             link.rel = 'icon';
             document.head.appendChild(link);
         }
         
         if (randomAlbum.cover) {
             link.href = randomAlbum.cover;
         }
     }
  }, [data]);

  if (loading || !data) {
      return (
          <Layout user={null} currentTrack={null}>
              <div className="flex h-[60vh] flex-col items-center justify-center gap-6">
                  <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-2 border-[#FA2D48] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[#8E8E93] text-sm font-medium">Syncing your library...</p>
                  </div>
                  
                  {loading === false && !data && (
                      <button 
                        onClick={handleConnect}
                        className="px-6 py-2 bg-[#FA2D48] text-white text-xs font-bold rounded-full hover:scale-105 transition-transform"
                      >
                        Reconnect Spotify
                      </button>
                  )}
              </div>
          </Layout>
      );
  }

  return (
    <Layout user={data.user} currentTrack={data.currentTrack}>
        
        {/* SECTION 1: AI DISCOVERY - Clean Centered Design */}
        <div className="mb-24 mt-8">
            <AISpotlight 
                token={token}
                history={dbUnifiedData?.recentPlays || data?.recentRaw || []}
                user={data.user}
                contextData={{
                    artists: (dbUnifiedData?.artists || data.artists).map((a: Artist) => {
                        const time = a.timeStr || '';
                        const mins = time.replace('m', '');
                        return `${a.name} (${mins} minutes listened, ${a.totalListens || 0} plays)`;
                    }),
                    albums: (dbUnifiedData?.albums || data.albums).map((a: Album) => {
                        const time = a.timeStr || '';
                        const mins = time.replace('m', '');
                        return `${a.title} by ${a.artist} (${mins} minutes, ${a.totalListens || 0} plays)`;
                    }),
                    songs: (dbUnifiedData?.songs || data.songs).map((s: Song) => {
                        const time = s.timeStr || '';
                        const mins = time.replace('m', '');
                        return `${s.title} by ${s.artist} (${mins} minutes, ${s.listens || 0} plays)`;
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
            
            <div className="space-y-12">
                {/* TOP ARTISTS */}
                <div>
                    <div className="flex justify-between items-center mb-6 px-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[20px] font-bold text-white tracking-tight">Top Artists</h3>
                        </div>
                        <button 
                            onClick={() => setSeeAllModal({ 
                                isOpen: true, 
                                title: 'Top Artists', 
                                items: dbUnifiedData?.artists || data.artists,
                                type: 'artist' 
                            })}
                            className="text-xs font-bold text-[#FA2D48] hover:text-white transition-colors uppercase tracking-wider"
                        >
                            See All
                        </button>
                    </div>
                    <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-6 scroll-smooth gap-0">
                        {(dbUnifiedData?.artists || data.artists).slice(0, 8).map((artist: Artist, index: number) => (
                            <RankedArtist key={artist.id} artist={artist} rank={index + 1} realImage={artistImages[artist.name]} />
                        ))}
                    </div>
                </div>

                {/* TOP ALBUMS */}
                <div>
                    <div className="flex justify-between items-center mb-6 px-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[20px] font-bold text-white tracking-tight">Top Albums</h3>
                        </div>
                        <button 
                            onClick={() => setSeeAllModal({ 
                                isOpen: true, 
                                title: 'Top Albums', 
                                items: dbUnifiedData?.albums || data.albums,
                                type: 'album' 
                            })}
                            className="text-xs font-bold text-[#FA2D48] hover:text-white transition-colors uppercase tracking-wider"
                        >
                            See All
                        </button>
                    </div>
                    <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-6 scroll-smooth gap-0">
                        {(dbUnifiedData?.albums || data.albums).slice(0, 8).map((album: Album, index: number) => (
                            <RankedAlbum key={album.id} album={album} rank={index + 1} />
                        ))}
                    </div>
                </div>

                {/* TOP SONGS */}
                <div>
                    <div className="flex justify-between items-center mb-6 px-1">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[20px] font-bold text-white tracking-tight">Top Songs</h3>
                        </div>
                        <button 
                            onClick={() => setSeeAllModal({ 
                                isOpen: true, 
                                title: 'Top Songs', 
                                items: dbUnifiedData?.songs || data.songs,
                                type: 'song' 
                            })}
                            className="text-xs font-bold text-[#FA2D48] hover:text-white transition-colors uppercase tracking-wider"
                        >
                            See All
                        </button>
                    </div>
                    <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-6 scroll-smooth gap-0">
                        {(dbUnifiedData?.songs || data.songs).slice(0, 8).map((song: Song, index: number) => (
                            <RankedSong key={song.id} song={song} rank={index + 1} />
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* SECTION 3: ORBIT + ANALYTICS DASHBOARD */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-20">
            {/* LEFT: OBSESSION ORBIT */}
            <div className="rounded-3xl p-6 relative overflow-hidden min-h-[600px] border-none bg-transparent">
                
                <TrendingArtists 
                    artists={dbUnifiedData?.artists || data.artists}
                    albums={dbUnifiedData?.albums || data.albums}
                    songs={dbUnifiedData?.songs || data.songs}
                    recentPlays={dbUnifiedData?.recentPlays || []}
                    artistImages={artistImages}
                />
            </div>

            {/* RIGHT: CHARTS + ARCHIVE */}
            <div className="space-y-8">
            </div>
            
        </div>
        
        {/* Activity Heatmap - Bottom */}
        <div className="mb-24 px-1">
             <ActivityHeatmap history={dbUnifiedData?.recentPlays || data?.recentRaw || []} />
        </div>

        {/* Global Modals */}
        <SeeAllModal 
            isOpen={seeAllModal.isOpen}
            onClose={() => setSeeAllModal(prev => ({ ...prev, isOpen: false }))}
            title={seeAllModal.title}
            items={seeAllModal.items}
            type={seeAllModal.type}
        />

    </Layout>
  );
}

export default App;