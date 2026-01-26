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

    const displayArtist = hoveredArtist || trendingArtists[0];

    return (
        <div className="mb-12">
            <div className="flex justify-between items-end mb-6 px-1 mx-1">
                <div>
                    <h2 className="text-[22px] font-bold text-white tracking-tight">Trending Artists</h2>
                    <p className="text-[#8E8E93] text-[13px]">Artists you're coming back to most • Live updates</p>
                </div>
                <div className="flex items-center gap-2 text-[#555] text-[10px]">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Updated {lastUpdate.toLocaleTimeString()}</span>
                </div>
            </div>
            
            <div className="flex items-start overflow-x-auto pb-6 pt-2 no-scrollbar snap-x pl-2 scroll-smooth">
                {trendingArtists.map((artist: any, index) => (
                    <div 
                        key={artist.name} 
                        className="flex-shrink-0 relative flex flex-col items-center snap-start group cursor-pointer w-[140px] md:w-[160px] mr-3"
                        onMouseEnter={() => setHoveredArtist(artist)}
                        onMouseLeave={() => setHoveredArtist(null)}
                    >
                        <div className="relative">
                            {/* Big Number Style (Like Top Albums) */}
                            <span className={`text-[100px] leading-none font-black text-outline absolute -left-4 -bottom-2 z-0 select-none pointer-events-none scale-y-90 italic ${index === 0 ? 'text-[#FA2D48]/20 opacity-100' : 'opacity-20'}`}>
                                {index + 1}
                            </span>

                            <div className={`relative z-10 w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-[#2C2C2E] border group-hover:scale-105 transition-all duration-300 shadow-xl ml-4 ${index === 0 ? 'border-[#FA2D48] shadow-[0_0_30px_rgba(250,45,72,0.3)]' : 'border-white/5 group-hover:border-[#FA2D48]/50'}`}>
                                <img 
                                    src={artist.image || `https://ui-avatars.com/api/?name=${artist.name}&background=1DB954&color=fff`} 
                                    alt={artist.name} 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                                />
                                {index === 0 && (
                                     <div className="absolute inset-0 bg-gradient-to-tr from-[#FA2D48]/20 to-transparent animate-pulse pointer-events-none"></div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center gap-1">
                                    <TrendingUp className="w-3 h-3 text-[#FA2D48]" />
                                    <span className="text-white text-[10px] font-bold">{Math.round(artist.trendScore)}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-center mt-3 px-1 w-full">
                            <h3 className="text-[14px] font-medium text-white truncate w-full group-hover:text-[#FA2D48] transition-colors">{artist.name}</h3>
                            <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-[#8E8E93]">
                                <Clock className="w-3 h-3" />
                                <span>
                                    {artist.avgTimeReturn < 3600000 
                                        ? `${Math.round(artist.avgTimeReturn / 60000)}m` 
                                        : `${(artist.avgTimeReturn / 3600000).toFixed(1)}h`} avg return
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Separate Analysis Bar (Always Visible / Updates on Hover) */}
            <div className="mt-4 mx-2 bg-[#1C1C1E] border border-white/5 rounded-xl p-4 flex items-center justify-between transition-all duration-300">
                <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-[#2C2C2E] overflow-hidden border border-white/10 hidden md:block">
                         <img src={displayArtist.image} className="w-full h-full object-cover" />
                     </div>
                     <div>
                         <div className="text-[10px] uppercase font-bold text-[#FA2D48] tracking-wider mb-0.5">
                             {hoveredArtist ? 'Current Selection' : 'Top Trending'}
                         </div>
                         <div className="text-white font-bold text-sm">{displayArtist.name} Analysis</div>
                     </div>
                </div>

                <div className="flex items-center gap-4 md:gap-8 text-right md:text-left">
                     <div className="hidden md:block">
                        <div className="text-[10px] text-[#8E8E93] uppercase">24h Vol</div>
                        <div className="text-white font-bold text-xs">{displayArtist.recentPlays} plays</div>
                     </div>
                     <div>
                        <div className="text-[10px] text-[#8E8E93] uppercase">Speed</div>
                        <div className="text-white font-bold text-xs">{displayArtist.velocity}% ↑</div>
                     </div>
                     <div>
                        <div className="text-[10px] text-[#8E8E93] uppercase">Return</div>
                        <div className="text-white font-bold text-xs">{displayArtist.returnFrequencyHrs}h</div>
                     </div>
                      <div>
                        <div className="text-[10px] text-[#8E8E93] uppercase">Score</div>
                        <div className="text-[#FA2D48] font-black text-xl">{displayArtist.trendScore}</div>
                     </div>
                </div>
            </div>
        </div>
    );
};
