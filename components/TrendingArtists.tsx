import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Sparkles } from 'lucide-react';

interface TrendingArtist {
    name: string;
    image: string;
    trendScore: number;
    recentPlays: number;
    spreadTime: number; 
    avgTimeReturn: number;
}

interface TrendingArtistsProps {
    artists: any[];
    recentPlays: any[];
    artistImages?: Record<string, string>;
}

export const TrendingArtists: React.FC<TrendingArtistsProps> = ({ artists, recentPlays, artistImages }) => {
    const [trendingArtists, setTrendingArtists] = useState<TrendingArtist[]>([]);

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
            if (artistImages && artistImages[artist]) {
                artistStats[artist].image = artistImages[artist];
            }
            artistStats[artist].plays.push({ time: new Date(play.played_at).getTime() });
        });

        // Calculate trend scores
        const trending: TrendingArtist[] = [];

        Object.entries(artistStats).forEach(([name, stats]) => {
            if (stats.plays.length < 1) return; 

            const times = stats.plays.map(p => p.time).sort((a, b) => a - b);
            const recentPlays24h = times.filter(t => t > last24Hours).length;
            
            const firstPlay = times[0];
            const lastPlay = times[times.length - 1];
            const spreadTimeHours = (lastPlay - firstPlay) / (1000 * 60 * 60);

            // Simple score for visualization population if data is sparse
            // Priority: Recent plays (last 24h) > Total plays (last 7d)
            const trendScore = (recentPlays24h * 10) + (times.length * 2);

            trending.push({
                name,
                image: stats.image,
                trendScore: Math.round(trendScore),
                recentPlays: recentPlays24h,
                spreadTime: Math.round(spreadTimeHours),
                avgTimeReturn: 0
            } as any);
        });

        // Sort by trend score desc
        trending.sort((a, b) => b.trendScore - a.trendScore);
        
        // Take top 27 fits nicely (1 center + 8 inner + 18 outer)
        setTrendingArtists(trending.slice(0, 27));
    };

    useEffect(() => {
        calculateTrendingArtists();
    }, [artists, recentPlays, artistImages]);

    // Live update
    useEffect(() => {
        const interval = setInterval(() => calculateTrendingArtists(), 5000); // 5s refresh is enough
        return () => clearInterval(interval);
    }, [recentPlays]);

    // ORBITAL LAYOUT CALCULATIONS
    const centerArtist = trendingArtists[0];
    const innerRing = trendingArtists.slice(1, 9); // 8 items
    const outerRing = trendingArtists.slice(9, 27); // 18 items

    const renderOrbitalItem = (artist: TrendingArtist, index: number, total: number, radiusPct: number, sizePx: number) => {
        // Calculate angle
        // Start from -90deg (Top)
        const angle = (index / total) * 2 * Math.PI - (Math.PI / 2); 
        
        // Calculate Position (Percent based to be responsive)
        // Center is 50, 50
        // Cos = X, Sin = Y
        const left = 50 + (radiusPct * Math.cos(angle));
        const top = 50 + (radiusPct * Math.sin(angle));

        return (
            <div 
                key={artist.name}
                className="absolute group z-10 hover:z-50 transition-all duration-500"
                style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    transform: 'translate(-50%, -50%)', // Center the bubble on the point
                }}
            >
                <div 
                    className="relative rounded-full overflow-hidden border-2 border-[#1C1C1E] group-hover:border-[#FA2D48] shadow-2xl transition-all duration-300 group-hover:scale-150 cursor-pointer animate-in fade-in zoom-in"
                    style={{ 
                        width: `${sizePx}px`, 
                        height: `${sizePx}px`,
                        animationDelay: `${index * 50}ms`
                    }}
                >
                    <img 
                        src={artist.image} 
                        alt={artist.name}
                        className="w-full h-full object-cover"
                    />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 text-center">
                        <span className="text-white text-[8px] font-bold leading-tight truncate w-full px-1">{artist.name}</span>
                        <span className="text-[#FA2D48] text-[7px] font-mono mt-0.5">#{index + (total === 18 ? 9 : 1) + 1}</span>
                        <span className="text-white/60 text-[6px]">{artist.recentPlays} plays</span>
                    </div>
                </div>
            </div>
        );
    };

    if (!centerArtist) return null;

    return (
        <div className="mb-12 relative">
            <div className="flex justify-between items-end mb-4 px-1">
                 <div>
                    <h2 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-2">
                        Obsession Orbit
                    </h2>
                    <p className="text-[#8E8E93] text-[13px]">
                        Your listening hierarchy
                    </p>
                </div>
                {/* Score of top artist */}
                <div className="text-right">
                     <p className="text-[#FA2D48] font-black text-2xl leading-none">{centerArtist.trendScore}</p>
                     <p className="text-[9px] text-white/50 uppercase tracking-widest font-bold">Top Heat</p>
                </div>
            </div>

            {/* ORBIT CONTAINER */}
            {/* The container is square and responsive */}
            <div className="relative w-full max-w-[500px] mx-auto aspect-square my-8 select-none">
                
                {/* Background Decor Circles */}
                <div className="absolute inset-0 rounded-full border border-white/5 scale-[0.65]"></div>
                <div className="absolute inset-0 rounded-full border border-white/5 scale-[0.98] border-dashed opacity-50"></div>
                
                {/* CENTER (Rank 1) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 group">
                    <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#1C1C1E] shadow-[0_0_50px_rgba(250,45,72,0.3)] group-hover:shadow-[0_0_80px_rgba(250,45,72,0.6)] transition-all duration-500 overflow-hidden bg-[#1C1C1E]">
                        <img src={centerArtist.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        {/* Center Badge */}
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-[#FA2D48] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                            #{1}
                        </div>
                    </div>
                </div>

                {/* INNER RING (Rank 2-9) */}
                {/* Radius approx 32% (so diameter is 64%) */}
                <div className="absolute inset-0 animate-[spin_60s_linear_infinite] hover:[animation-play-state:paused]">
                     {/* Counter-rotate bubbles if we wanted images upright while spinning, 
                         but simpler to just spin the whole ring if user wants 'movement'. 
                         Or we can just rely on static position for readability. 
                         Let's do static with subtle float for better UX. 
                     */}
                </div>
                
                 {/* 
                   Actually, user said "make it move and animated". 
                   A subtle slow rotation of the Container Rings is cool.
                   But images must stay upright.
                   Let's stick to calculated positions and maybe a subtle 'breathing' scale animation.
                */}
                
                {/* Render Inner Ring */}
                {innerRing.map((artist, i) => renderOrbitalItem(artist, i, innerRing.length, 33, 70))}

                {/* Render Outer Ring */}
                {outerRing.map((artist, i) => renderOrbitalItem(artist, i, outerRing.length, 48, 45))}

            </div>
            
            <div className="text-center mt-4">
                 <p className="text-[10px] text-[#8E8E93] uppercase tracking-widest">
                    Based on recent listening frequency
                 </p>
            </div>
        </div>
    );
};
