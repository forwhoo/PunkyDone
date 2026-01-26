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
    // CSS to enable smooth arranging transition
    const containerStyle: React.CSSProperties = {
        position: 'relative',
        height: '400px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px',
        maxWidth: '900px',
        margin: '0 auto'
    };
    
    // Sort logic handled in calculation
    
    if (trendingArtists.length === 0) return null;

    return (
        <div className="mb-16">
            <div className="flex justify-between items-end mb-8 px-1 mx-1">
                <div>
                    <h2 className="text-[22px] font-bold text-white tracking-tight">Trending Artists</h2>
                    <p className="text-[#8E8E93] text-[13px]">Live visualization of your obsession levels</p>
                </div>
                <div className="flex items-center gap-2 text-[#555] text-[10px]">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Updated {lastUpdate.toLocaleTimeString()}</span>
                </div>
            </div>
            
            {/* Concentric / Clustered Bubble Visualization */}
            <div style={containerStyle} className="p-4">
                 {trendingArtists.slice(0, 10).map((artist: any, index: number) => {
                     // Calculate size based on score: 
                     // Max score ~300 -> 220px
                     // Min score ~50 -> 100px
                     const maxScore = trendingArtists[0].trendScore || 100;
                     const size = 100 + Math.floor((artist.trendScore / maxScore) * 120);
                     
                     return (
                         <div 
                            key={artist.name}
                            className="relative group transition-all duration-700 ease-in-out hover:z-50"
                            style={{
                                width: size,
                                height: size,
                                borderRadius: '50%',
                                transitionDelay: `${index * 50}ms`
                            }}
                         >
                            {/* Inner Bubble */}
                            <div className={`w-full h-full rounded-full overflow-hidden relative shadow-2xl transition-transform duration-300 group-hover:scale-110 border-4 cursor-pointer ${
                                index === 0 ? 'border-[#FA2D48] shadow-[0_0_50px_rgba(250,45,72,0.3)]' : 'border-[#2C2C2E] group-hover:border-[#FA2D48]'
                            }`}>
                                <img 
                                    src={artist.image || `https://ui-avatars.com/api/?name=${artist.name}&background=1DB954&color=fff`}
                                    alt={artist.name}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />

                                {/* Text Overlay - Clean & Centered */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 opacity-100 transition-opacity">
                                    <h3 className="text-white font-bold drop-shadow-md leading-tight mb-1" style={{ fontSize: Math.max(12, size/10) }}>
                                        {artist.name}
                                    </h3>
                                    <div className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1 group-hover:bg-[#FA2D48] transition-colors">
                                         <TrendingUp className="w-3 h-3 text-[#FA2D48] group-hover:text-white" />
                                         <span className="text-white text-xs font-bold">{artist.trendScore}</span>
                                    </div>
                                </div>
                            </div>
                         </div>
                     )
                 })}
            </div>
        </div>
    );
};
