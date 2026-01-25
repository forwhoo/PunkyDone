import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { TopCharts } from './components/TopCharts';
import { HeroCarousel } from './components/HeroCarousel';
import { ChevronRight, Play, Music, BarChart2 } from 'lucide-react';
import { Artist, Album, Song } from './types';
import { 
    getAuthUrl, 
    getTokenFromUrl, 
    fetchSpotifyData, 
    redirectToAuthCodeFlow, 
    getAccessToken 
} from './services/spotifyService';
import { syncRecentPlays, fetchListeningStats, fetchDashboardStats } from './services/dbService';

const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex justify-between items-end mb-6 px-1 mx-1">
        <h2 className="text-[22px] font-bold text-white tracking-tight">{title}</h2>
        <div className="flex items-center gap-1 text-[#FA2D48] cursor-pointer hover:opacity-80 transition-opacity">
            <span className="text-[13px] font-medium">See All</span>
            <ChevronRight className="w-4 h-4" />
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
                     <span className="text-white font-bold text-2xl drop-shadow-md">{album.totalListens}m</span>
                     <span className="text-white/80 text-[10px] uppercase tracking-widest font-bold">Listened</span>
                </div>
            </div>
            <div className="mt-3 relative z-20">
                <h3 className="text-[15px] font-semibold text-white truncate w-32 md:w-40 leading-tight group-hover:text-[#FA2D48] transition-colors">{album.title}</h3>
                <p className="text-[13px] text-[#8E8E93] truncate w-32 md:w-40 mt-0.5">{album.artist}</p>
            </div>
        </div>
    </div>
);

// RANKED COMPONENT: Top Artist (Circle with Number)
const RankedArtist = ({ artist, rank }: { artist: Artist, rank: number }) => (
    <div className="flex-shrink-0 relative flex flex-col items-center snap-start group cursor-pointer w-[140px] md:w-[160px] mr-2">
        <div className="relative">
            {/* Number positioned top-left of circle */}
            <span className="text-[80px] leading-none font-black text-outline absolute -left-4 -top-8 z-0 select-none pointer-events-none italic opacity-60">
                {rank}
            </span>
            <div className="relative z-10 w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-[#2C2C2E] border border-white/5 group-hover:scale-105 transition-transform duration-300 shadow-xl">
                {/* Fallback image if blank from DB */}
                <img src={artist.image || `https://ui-avatars.com/api/?name=${artist.name}&background=random`} alt={artist.name} className="w-full h-full object-cover group-hover:blur-[2px] transition-all" />
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <span className="text-white font-bold text-lg">{artist.totalListens}</span>
                    <span className="text-white/80 text-[10px] uppercase font-bold tracking-widest">Plays</span>
                </div>
            </div>
        </div>
        <div className="text-center mt-3 px-1">
             <h3 className="text-[15px] font-medium text-white truncate w-full group-hover:text-primary transition-colors">{artist.name}</h3>
             <p className="text-[12px] text-[#8E8E93] font-medium">Rank #{rank}</p>
        </div>
    </div>
);

// RANKED COMPONENT: Top Song (Horizontal Card with Number)
const RankedSong = ({ song, rank }: { song: Song, rank: number }) => (
    <div className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[240px] md:w-[280px] mr-4">
        <div className="flex items-center gap-4 bg-[#1C1C1E]/50 hover:bg-[#1C1C1E] border border-white/5 rounded-xl p-3 pr-6 transition-all duration-300 w-full backdrop-blur-sm">
            <span className="text-[40px] font-black text-outline leading-none w-8 text-center italic opacity-70">
                {rank}
            </span>
            <div className="relative w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden bg-[#2C2C2E]">
                <img src={song.cover} alt={song.title} className="w-full h-full object-cover group-hover:blur-[1px] transition-all" />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-bold text-white truncate leading-tight group-hover:text-[#FA2D48] transition-colors">{song.title}</h3>
                <p className="text-[12px] text-[#8E8E93] truncate mt-0.5">{song.artist}</p>
                <div className="flex items-center gap-2 mt-1">
                   <p className="text-[10px] text-[#FA2D48] font-medium uppercase tracking-wide">{song.listens} Plays</p>
                   <span className="text-[10px] text-white/40">•</span>
                   <p className="text-[10px] text-white/60">{song.duration}m</p>
                </div>
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

  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  // Sync Data to Supabase when data is loaded
  useEffect(() => {
      const syncAndFetchStats = async () => {
        if (data && data.recentRaw) {
            await syncRecentPlays(data.recentRaw);
            const stats = await fetchListeningStats();
            setDbStats(stats);
            
            // Fetch DB dashboard data
            const dashboardStuff = await fetchDashboardStats();
            setDbUnifiedData(dashboardStuff);
        }
      };
      syncAndFetchStats();
  }, [data]);

  // Polling Effect - Refresh every 3 minutes
  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
        // Don't set loading true on background refreshes to avoid full screen spinner
        const spotifyData = await fetchSpotifyData(token);
        if (spotifyData) {
            setData(spotifyData);
        } else {
             // If token expired or error
             if (!data) setLoading(false);
        }
    };

    // Initial load
    setLoading(true);
    loadData().then(() => setLoading(false));

    // Set interval for 6 seconds (6000 ms) for near-realtime updates
    const intervalId = setInterval(() => {
        console.log("Refreshing data...");
        loadData();
    }, 6000);

    return () => clearInterval(intervalId);
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
    const result = await fetchSpotifyData(token);
    if (result) {
        setData(result);
    } else {
        // Token might be expired
        setToken(null);
        localStorage.removeItem('spotify_token');
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
    
    setTimeout(() => {
        if (query) {
             setInsight(`Based on "${query}", your data shows high activity in the ${data?.songs[0]?.artist || "Pop"} genre recently.`);
        } else {
             setInsight(`You've been listening to a lot of ${data?.artists[0]?.name || "music"} lately. Your evening activity is peaking.`);
        }
        setLoadingInsight(false);
    }, 2000);
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
              <div className="flex h-[60vh] items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-2 border-[#FA2D48] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[#8E8E93] text-sm font-medium">Syncing your library...</p>
                  </div>
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
            topArtistImage={data.artists[0]?.image}
            topAlbumImage={data.albums[0]?.cover}
            weeklyStats={dbStats}
        />

        {/* TOP ALBUMS - Horizontal Scroll */}
        <div className="mb-12">
             <SectionHeader title="Top Albums" />
             <div className="flex items-end overflow-x-auto pb-10 pt-2 no-scrollbar snap-x pl-2 scroll-smooth">
                {(dbUnifiedData?.albums || data.albums).map((album: Album, index: number) => (
                    <RankedAlbum key={album.id} album={album} rank={index + 1} />
                ))}
             </div>
        </div>

        {/* TOP SONGS - Horizontal Scroll Cards */}
        <div className="mb-12">
             <SectionHeader title="Top Songs" />
             <div className="flex items-center overflow-x-auto pb-6 no-scrollbar snap-x pl-1 scroll-smooth">
                {(dbUnifiedData?.songs || data.songs).map((song: Song, index: number) => (
                    <RankedSong key={song.id} song={song} rank={index + 1} />
                ))}
             </div>
        </div>

        {/* TOP ARTISTS - Horizontal Scroll Circles */}
        <div className="mb-16">
             <SectionHeader title="Top Artists" />
             <div className="flex items-start overflow-x-auto pb-8 pt-6 no-scrollbar snap-x pl-4 scroll-smooth">
                {(dbUnifiedData?.artists || data.artists).map((artist: Artist, index: number) => (
                    <RankedArtist key={artist.id} artist={artist} rank={index + 1} />
                ))}
             </div>
        </div>

        {/* LISTENING ACTIVITY */}
        <div className="mb-8">
            <TopCharts 
                title="Listening Trends"
                artists={data.artists}
                songs={data.songs}
                albums={data.albums}
                hourlyActivity={data.hourly}
            />
        </div>
    </Layout>
  );
}

export default App;