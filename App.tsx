import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { TopCharts } from './components/TopCharts';
import { HeroCarousel } from './components/HeroCarousel';
import { RankingWidget } from './components/RankingWidget';
import { AISpotlight } from './components/AISpotlight';
import { TrendingArtists } from './components/TrendingArtists';
import { rankingMockData } from './mockData';
import { Play, Music, BarChart2, Mic2, Disc, Trophy, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { Artist, Album, Song } from './types';
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

// HISTORY COMPONENT: Enhanced Glass Card
const HistoryCard = ({ item }: { item: any }) => (
    <div className="flex-shrink-0 relative group cursor-pointer w-[160px] md:w-[180px] mr-4">
        <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg bg-[#2C2C2E] border border-white/5 group-hover:border-white/20 transition-all duration-300">
            <img src={item.cover} alt={item.track_name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <Play className="w-10 h-10 text-white fill-white drop-shadow-xl scale-75 group-hover:scale-100 transition-transform" />
            </div>
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10">
                <span className="text-[10px] text-white font-mono font-bold">
                    {new Date(item.played_at).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}).replace(' ', '')}
                </span>
            </div>
        </div>
        <div className="mt-3">
             <h3 className="text-[14px] font-bold text-white truncate group-hover:text-[#FA2D48] transition-colors">{item.track_name}</h3>
             <p className="text-[12px] text-[#8E8E93] truncate">{item.artist_name}</p>
        </div>
    </div>
);

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

// RANKED COMPONENT: Top Song (Vertical Ticket Style)
const RankedSong = ({ song, rank }: { song: Song, rank: number }) => (
    <div className="flex-shrink-0 relative group cursor-pointer w-[160px] md:w-[180px] mr-4 snap-start">
         {/* Rank Badge */}
         <div className="absolute -top-3 -left-3 z-20 bg-[#FA2D48] text-white w-8 h-8 flex items-center justify-center font-black text-sm rounded-lg shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
            #{rank}
         </div>

         <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-[#2C2C2E] shadow-lg border border-white/5 group-hover:border-white/20 transition-all">
             <img src={song.cover} alt={song.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90"></div>
             
             {/* Text Content */}
             <div className="absolute bottom-0 left-0 right-0 p-4">
                 <h3 className="text-[16px] font-bold text-white leading-tight mb-1 line-clamp-2 group-hover:text-[#FA2D48] transition-colors">{song.title}</h3>
                 <p className="text-[12px] text-white/60 truncate font-medium">{song.artist}</p>
             </div>
         </div>
    </div>
);

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('spotify_token'));
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dbStats, setDbStats] = useState<any>(null);
  const [dbUnifiedData, setDbUnifiedData] = useState<any>(null);
  const [artistImages, setArtistImages] = useState<Record<string, string>>({}); // Real artist images

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
            // syncRecentPlays is called in the useEffect above when data changes
        } else {
             if (!data) setLoading(false);
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
        <HeroCarousel 
            insight={insight}  
            loadingInsight={loadingInsight} 
            onGenerateInsight={handleGetInsight} 
            topArtistImage={(dbUnifiedData?.artists?.[0] || data?.artists?.[0])?.image}
            topAlbumImage={(dbUnifiedData?.albums?.[0] || data?.albums?.[0])?.cover}
            weeklyStats={dbStats}
            topGenre={(dbUnifiedData?.artists?.[0] || data?.artists?.[0])?.genres?.[0] ? (dbUnifiedData?.artists?.[0] || data?.artists?.[0]).genres[0].charAt(0).toUpperCase() + (dbUnifiedData?.artists?.[0] || data?.artists?.[0]).genres[0].slice(1) : "Pop"}
            longestSession={dbUnifiedData?.songs?.[0] || data?.songs?.[0]}
            recentPlays={dbUnifiedData?.recentPlays || []}
            topSongs={dbUnifiedData?.songs || data?.songs}
        />

        {/* THE DISCOVERY - Moved to top as requested */}
        <div className="mb-16 px-1">
             <AISpotlight 
                token={token}
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

        {/* TOP ALBUMS - Horizontal Scroll */}
        <div className="mb-12">
             <div className="flex justify-between items-end mb-6 px-1 mx-1">
                <h2 className="text-[22px] font-bold text-white tracking-tight">Top Albums</h2>
             </div>
             <div className="flex items-end overflow-x-auto pb-10 pt-2 no-scrollbar snap-x pl-2 scroll-smooth">
                {(dbUnifiedData?.albums || data.albums).slice(0, 10).map((album: Album, index: number) => (
                    <RankedAlbum key={album.id} album={album} rank={index + 1} />
                ))}
             </div>
        </div>

        {/* TOP SONGS - Horizontal Scroll Cards */}
        <div className="mb-12">
             <div className="flex justify-between items-end mb-6 px-1 mx-1">
                <h2 className="text-[22px] font-bold text-white tracking-tight">Top Songs</h2>
             </div>
             <div className="flex items-center overflow-x-auto pb-6 no-scrollbar snap-x pl-1 scroll-smooth">
                {(dbUnifiedData?.songs || data.songs).slice(0, 20).map((song: Song, index: number) => (
                    <RankedSong key={song.id} song={song} rank={index + 1} />
                ))}
             </div>
        </div>

        {/* TOP ARTISTS - Horizontal Scroll Circles */}
        <div className="mb-12">
             <div className="flex justify-between items-end mb-6 px-1 mx-1">
                <h2 className="text-[22px] font-bold text-white tracking-tight">Top Artists</h2>
             </div>
             <div className="flex items-start overflow-x-auto pb-8 pt-6 no-scrollbar snap-x pl-4 scroll-smooth">
                {(dbUnifiedData?.artists || data.artists).slice(0, 10).map((artist: Artist, index: number) => (
                    <RankedArtist key={artist.id} artist={artist} rank={index + 1} realImage={artistImages[artist.name]} />
                ))}
             </div>
        </div>

        {/* TRENDING ARTISTS - Live updating */}
        <TrendingArtists 
            artists={dbUnifiedData?.artists || data.artists}
            recentPlays={dbUnifiedData?.recentPlays || []}
            artistImages={artistImages}
        />

        {/* RECENTLY PLAYED - New Section */}
        <div className="mb-16">
             <div className="flex justify-between items-end mb-6 px-1 mx-1">
                <h2 className="text-[22px] font-bold text-white tracking-tight">Recently Played</h2>
             </div>
             <div className="flex items-start overflow-x-auto pb-4 pt-2 no-scrollbar snap-x pl-4 scroll-smooth">
                {(dbUnifiedData?.recentPlays || []).slice(0, 15).map((item: any, index: number) => (
                    <HistoryCard key={index} item={item} />
                ))}
                {(dbUnifiedData?.recentPlays || []).length === 0 && (
                    <div className="text-[#8E8E93] text-sm pl-2">No recent history found.</div>
                )}
             </div>
        </div>

        {/* LISTENING ACTIVITY */}
        <div className="mb-8">
            <TopCharts 
                title="Listening Trends"
                username={data?.user?.name || 'Your'}
                artists={dbUnifiedData?.artists || data.artists}
                songs={dbUnifiedData?.songs || data.songs}
                albums={dbUnifiedData?.albums || data.albums}
                hourlyActivity={dbUnifiedData?.hourlyActivity || data.hourly}
                timeRange={timeRange}
                onTimeRangeChange={(range) => {
                    setTimeRange(range);
                    // Refresh data with new time range
                    fetchDashboardStats(range).then(setDbUnifiedData);
                }}
            />
        </div>
    </Layout>
  );
}

export default App;