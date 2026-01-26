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
            <div className="flex justify-between items-end mb-8 px-1">
                <div>
                    <h2 className="text-[22px] font-bold text-white tracking-tight">Obsession Heatmap</h2>
                    <p className="text-[#8E8E93] text-[13px]">Real-time artist velocity</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-[#FA2D48] tracking-widest uppercase bg-[#FA2D48]/10 px-3 py-1.5 rounded-full border border-[#FA2D48]/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#FA2D48] animate-pulse"></div>
                    Live Update
                </div>
            </div>

            {/* Unique Bento Grid Heatmap */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-3 min-h-[440px]">
                
                {/* HERO AREA: Trending #1 (Big Block) */}
                <div className="lg:col-span-4 lg:row-span-2 group relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#1C1C1E] to-[#0A0A0A] border border-white/5 hover:border-[#FA2D48]/30 transition-all duration-500 shadow-2xl">
                    {/* Background Image with Heat Blur */}
                    <div className="absolute inset-0 z-0">
                        <img 
                            src={topArtist.image} 
                            style={{ filter: 'blur(2px)' }}
                            className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700 group-hover:blur-0" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                    </div>

                    <div className="absolute top-6 left-6 z-10">
                        <div className="flex items-center gap-2 bg-[#FA2D48] text-white text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                            <TrendingUp size={10} />
                            #{1} trending
                        </div>
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 z-10">
                        <div className="flex items-end justify-between">
                            <div className="min-w-0">
                                <h3 className="text-3xl font-black text-white leading-tight mb-2 truncate drop-shadow-lg">{topArtist.name}</h3>
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Plays (24h)</span>
                                        <span className="text-xl font-mono text-white leading-none mt-1">{topArtist.recentPlays}</span>
                                    </div>
                                    <div className="w-[1px] h-6 bg-white/10"></div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-white/50 uppercase font-bold tracking-widest">Heat Score</span>
                                        <span className="text-xl font-mono text-[#FA2D48] leading-none mt-1">{topArtist.trendScore}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid of Others */}
                <div className="lg:col-span-8 lg:row-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {otherArtists.map((artist, i) => (
                        <div 
                            key={artist.name}
                            className="relative group overflow-hidden rounded-[1.5rem] bg-[#1C1C1E]/50 border border-white/5 hover:border-white/10 hover:bg-[#1C1C1E] transition-all duration-300 flex flex-col p-4 shadow-lg hover:shadow-2xl cursor-pointer"
                        >
                            {/* Inner Glow based on Trend */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FA2D48]/5 blur-3xl rounded-full group-hover:bg-[#FA2D48]/10 transition-colors"></div>

                            <div className="flex items-start justify-between mb-auto">
                                <div className="relative">
                                    <img 
                                        src={artist.image} 
                                        className="w-16 h-16 rounded-2xl object-cover shadow-2xl group-hover:scale-105 transition-transform" 
                                    />
                                    <div className="absolute -top-1 -right-1 bg-black border border-white/10 text-white text-[9px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                                        {i + 2}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[20px] font-mono text-white leading-none">
                                        {artist.trendScore}
                                    </div>
                                    <div className="text-[9px] text-[#8E8E93] uppercase font-bold tracking-tighter mt-1">Heat</div>
                                </div>
                            </div>

                            <div className="mt-4">
                                <h4 className="text-white font-bold text-sm truncate leading-tight group-hover:text-[#FA2D48] transition-colors">{artist.name}</h4>
                                <div className="flex items-center gap-2 mt-2">
                                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-[#FA2D48] to-orange-400 rounded-full"
                                            style={{ width: `${Math.min(100, (artist.trendScore / topArtist.trendScore) * 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[9px] font-mono text-[#8E8E93] whitespace-nowrap">{artist.recentPlays} plays</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
