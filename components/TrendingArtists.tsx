import React, { useState, useEffect } from 'react';
import { TrendingUp, Clock } from 'lucide-react';

interface TrendingArtist {
    name: string;
    image: string;
    trendScore: number;
    recentPlays: number;
    spreadTime: number; // hours since first play in recent window
    avgTimeReturn: number; // avg hours between listens
}

interface TrendingArtistsProps {
    artists: any[];
    recentPlays: any[];
    artistImages?: Record<string, string>;
}

export const TrendingArtists: React.FC<TrendingArtistsProps> = ({ artists, recentPlays, artistImages }) => {
    const [trendingArtists, setTrendingArtists] = useState<TrendingArtist[]>([]);
    const [lastUpdate, setLastUpdate] = useState(new Date());

    const calculateTrendingArtists = () => {
        if (!recentPlays || recentPlays.length === 0) return;

        const now = new Date().getTime();
        const last24Hours = now - (24 * 60 * 60 * 1000);
        const last7Days = now - (7 * 24 * 60 * 60 * 1000);

        // Filter recent plays from last 7 days
        const recentWindow = recentPlays.filter(play => 
            new Date(play.played_at).getTime() > last7Days
        );

        // Analyze by artist
        const artistStats: Record<string, {
            plays: { time: number }[];
            image: string;
        }> = {};

        recentWindow.forEach(play => {
            const artist = play.artist_name;
            if (!artistStats[artist]) {
                artistStats[artist] = {
                    plays: [],
                    image: (artistImages && artistImages[artist]) 
                        ? artistImages[artist] 
                        : (play.album_cover || play.cover)
                };
            }
            // Update image if we got a better one later (or passed in props update)
            if (artistImages && artistImages[artist]) {
                artistStats[artist].image = artistImages[artist];
            }
            
            artistStats[artist].plays.push({
                time: new Date(play.played_at).getTime()
            });
        });

        // Calculate trend scores
        const trending: TrendingArtist[] = [];

        Object.entries(artistStats).forEach(([name, stats]) => {
            if (stats.plays.length < 3) return; // Need at least 3 plays

            const times = stats.plays.map(p => p.time).sort((a, b) => a - b);
            const recentPlays24h = times.filter(t => t > last24Hours).length;
            
            // Calculate spread time (how long they've been listening to this artist)
            const firstPlay = times[0];
            const lastPlay = times[times.length - 1];
            const spreadTimeHours = (lastPlay - firstPlay) / (1000 * 60 * 60);

            // Calculate average time between listens
            const gaps = [];
            for (let i = 1; i < times.length; i++) {
                gaps.push(times[i] - times[i - 1]);
            }
            const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
            const avgTimeReturnMs = avgGap;

            // TREND SCORE ALGORITHM
            // Higher score = trending up
            // Factors:
            // 1. Recent plays (last 24h) - more = better
            // 2. Return rate - shorter gaps = better (coming back frequently)
            // 3. Velocity - plays in last 24h vs average
            
            const avgPlaysPerDay = stats.plays.length / (spreadTimeHours / 24 || 1);
            const velocity = recentPlays24h / (avgPlaysPerDay || 1);
            
            // Calculate return frequency in hours for trend score
            const avgTimeReturnHours = avgTimeReturnMs / (1000 * 60 * 60);
            
            const trendScore = 
                (recentPlays24h * 15) + // Recent activity weight
                (velocity * 15) +       // Velocity
                Math.min(70, (100 / (avgTimeReturnHours + 0.1))); // Return frequency weight (inverse) - heavier impact for repeats

            trending.push({
                name,
                image: stats.image,
                trendScore: Math.round(trendScore),
                recentPlays: recentPlays24h,
                spreadTime: Math.round(spreadTimeHours),
                avgTimeReturn: avgTimeReturnMs, // Store in MS for accurate display
                velocity: Math.round(velocity * 100),
                returnFrequencyHrs: (avgTimeReturnMs / 3600000).toFixed(1)
            } as any);
        });

        // Sort by trend score
        trending.sort((a: any, b: any) => b.trendScore - a.trendScore);
        setTrendingArtists(trending.slice(0, 15));
        setLastUpdate(new Date());
    };

    // Initial calculation
    useEffect(() => {
        calculateTrendingArtists();
    }, [artists, recentPlays, artistImages]);

    // Live update every 1 second
    useEffect(() => {
        const interval = setInterval(() => {
            calculateTrendingArtists();
        }, 1000);

        return () => clearInterval(interval);
    }, [recentPlays]);

    const [hoveredArtist, setHoveredArtist] = useState<TrendingArtist | null>(null);

    // ... (rest of code)
    
    if (trendingArtists.length === 0) return null;

    // Use top 7 for the specific grid layout
    const displayList = trendingArtists.slice(0, 7);
    const topArtist = displayList[0];
    const otherArtists = displayList.slice(1);

    return (
        <div className="mb-16">
            <div className="flex justify-between items-end mb-6 px-1 mx-1">
                <div>
                    <h2 className="text-[22px] font-bold text-white tracking-tight">Trending Artists</h2>
                    <p className="text-[#8E8E93] text-[13px]">Obsession Heatmap</p>
                </div>
                <div className="flex items-center gap-2 text-[#555] text-[10px]">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Updated {lastUpdate.toLocaleTimeString()}</span>
                </div>
            </div>
            
            {/* COMPACT BENTO GRID LAYOUT */}
            {/* Takes up about 250px height max, very efficient */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-[280px] md:h-[260px]">
                 
                 {/* #1 SPOTLIGHT (Left Large Cell) */}
                 <div className="col-span-2 row-span-2 relative group cursor-pointer overflow-hidden rounded-2xl bg-[#CC293E] shadow-[0_10px_40px_rgba(250,45,72,0.2)] border-2 border-[#FA2D48] transition-transform hover:scale-[1.01]">
                     <img 
                        src={topArtist.image} 
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-60 group-hover:scale-110 transition-all duration-700" 
                     />
                     
                     {/* Overlay Content */}
                     <div className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black via-black/40 to-transparent">
                         <span className="inline-flex items-center gap-2 bg-[#FA2D48] w-fit px-3 py-1 rounded-full text-white text-[10px] font-black uppercase tracking-widest mb-2 shadow-lg">
                             <TrendingUp className="w-3 h-3" /> #1 Trending
                         </span>
                         <h3 className="text-3xl font-black text-white leading-none mb-1">{topArtist.name}</h3>
                         <div className="flex items-center gap-4 text-white/80 text-xs font-mono">
                             <span>{topArtist.trendScore} Score</span>
                             <span>{topArtist.velocity}% Velocity</span>
                         </div>
                     </div>
                 </div>

                 {/* GRID OF OTHERS (Right Side) */}
                 {otherArtists.map((artist, idx) => (
                     <div 
                        key={artist.name}
                        className="col-span-1 row-span-1 relative group cursor-pointer overflow-hidden rounded-xl bg-[#2C2C2E] border border-white/5 hover:border-white/20 transition-all"
                     >
                         <img 
                            src={artist.image} 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-40 group-hover:scale-110 transition-all duration-500" 
                         />
                         
                         <div className="absolute inset-0 flex flex-col justify-center items-center p-2 text-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-sm z-10">
                              <span className="text-[#FA2D48] font-bold text-xl">{artist.trendScore}</span>
                              <span className="text-white/50 text-[10px] uppercase">Score</span>
                         </div>

                         <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent group-hover:opacity-0 transition-opacity">
                             <h4 className="text-white font-bold text-sm truncate">{artist.name}</h4>
                             <p className="text-[#FA2D48] text-[10px] font-bold">#{idx + 2}</p>
                         </div>
                     </div>
                 ))}
                 
                 {/* Fill empty slots if less than 7 artists (optional) */}
                 {Array.from({ length: Math.max(0, 6 - otherArtists.length) }).map((_, i) => (
                     <div key={`empty-${i}`} className="col-span-1 row-span-1 bg-white/5 rounded-xl animate-pulse" />
                 ))}
            </div>
        </div>
    );
};
