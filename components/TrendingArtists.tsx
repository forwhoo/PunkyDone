import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Sparkles, Disc, Mic2, Music, X, Clock } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface TrendingItem {
    id: string;
    name: string; // Artist Name or Album Title
    subName?: string; // Artist Name for albums
    image: string;
    trendScore: number;
    recentPlays: number;
    type: 'artist' | 'album' | 'song';
    tracks?: any[]; // For expanded view
}

interface TrendingArtistsProps {
    artists: any[];
    albums?: any[];
    songs?: any[]; // Add songs support
    recentPlays: any[];
    artistImages?: Record<string, string>;
    timeRange?: 'Daily' | 'Weekly' | 'Monthly'; 
}

export const TrendingArtists: React.FC<TrendingArtistsProps> = ({ artists, albums, songs, recentPlays, artistImages, timeRange = 'Weekly' }) => {
    const [activeTab, setActiveTab] = useState<'artist' | 'album'>('artist');
    const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<TrendingItem | null>(null);

    // Stats Calculation Helper
    const calculateArtistStats = (artistName: string) => {
        const artistPlays = recentPlays.filter(p => p.artist_name === artistName);
        if (!artistPlays.length) return null;

        // 1. Streak Calculation
        const playDates = Array.from(new Set(artistPlays.map(p => new Date(p.played_at).setHours(0,0,0,0)))).sort((a,b) => a - b);
        let currentStreak = 0;
        let maxStreak = 0;
        let prevDate = null;

        // Calculate "Current Active Streak" (ending today or yesterday)
        let activeStreak = 0;
        const now = new Date().setHours(0,0,0,0);
        const yesterday = now - 86400000;
        
        // Reverse iterate for active streak
        for (let i = playDates.length - 1; i >= 0; i--) {
            if (i === playDates.length - 1) {
                // Must be today or yesterday to start counting "active" streak
                if (playDates[i] === now || playDates[i] === yesterday) {
                    activeStreak = 1;
                } else {
                    break;
                }
            } else {
                const dayDiff = (playDates[i+1] - playDates[i]) / 86400000;
                if (dayDiff === 1) activeStreak++;
                else break;
            }
        }

        // 2. Favorite Song
        const songCounts: Record<string, number> = {};
        artistPlays.forEach(p => songCounts[p.track_name] = (songCounts[p.track_name] || 0) + 1);
        const topSongEntry = Object.entries(songCounts).sort((a,b) => b[1] - a[1])[0];
        
        // 3. Peak Listening Time (Hour)
        const hourCounts = new Array(24).fill(0);
        artistPlays.forEach(p => {
            const h = new Date(p.played_at).getHours();
            hourCounts[h]++;
        });
        const peakHour = hourCounts.indexOf(Math.max(...hourCounts));
        const formatTime = (h: number) => {
            if (h === 0) return 'Midnight';
            if (h === 12) return 'Noon';
            return h > 12 ? `${h-12} PM` : `${h} AM`;
        };

        // 4. Total Listening Time (Estimated)
        const totalDurationMs = artistPlays.reduce((acc, curr) => acc + (curr.duration_ms || 180000), 0);
        const hours = Math.floor(totalDurationMs / (1000 * 60 * 60));
        const minutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));

        return {
            streak: activeStreak,
            topSong: topSongEntry ? topSongEntry[0] : 'Unknown',
            peakTime: formatTime(peakHour),
            totalTime: `${hours}h ${minutes}m`,
            firstPlay: new Date(Math.min(...artistPlays.map(p => new Date(p.played_at).getTime()))).toLocaleDateString()
        };
    };

    const handleItemClick = (item: TrendingItem) => {
        if (item.type === 'artist') {
            const stats = calculateArtistStats(item.name);
            setSelectedItem({ ...item, stats }); // Attach stats to item
        } else {
            setSelectedItem(item);
        }
    };

    // Scroll Lock Effect
    useEffect(() => {
        if (selectedItem) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedItem]);

    // Calculate Trending Data based on Active Tab
    const calculateTrending = () => {
        if (!recentPlays || recentPlays.length === 0) return;

        const now = new Date().getTime();
        const dayMs = 24 * 60 * 60 * 1000;
        const sessionGapMs = 90 * 60 * 1000; // 90 minutes

        const stats: Record<string, { plays: number[], image: string, subName?: string, tracks: any[] }> = {};

        recentPlays.forEach(play => {
            let key = ''; 
            let name = '';
            let subName = '';
            let image = '';
            
            if (activeTab === 'artist') {
                key = play.artist_name;
                name = play.artist_name;
                image = (artistImages && artistImages[name]) ? artistImages[name] : (play.album_cover || play.cover);
                
                // Update if valid image found
                if (artistImages && artistImages[name]) image = artistImages[name];
            } else {
                key = `${play.album_name}||${play.artist_name}`;
                name = play.album_name;
                subName = play.artist_name;
                image = play.album_cover || play.cover;
            }

            if (!stats[key]) {
                // Ensure image is valid
                const validImage = image && image.length > 5 ? image : null;
                stats[key] = { plays: [], image: validImage, subName, tracks: [] };
            } else if (!stats[key].image && image && image.length > 5) {
                // Retroactively fix image if missing
                stats[key].image = image;
            }
            stats[key].plays.push(new Date(play.played_at).getTime());
            
            // Add track info for detail view (dedupe by track name)
            if (!stats[key].tracks.find((t: any) => t.track_name === play.track_name)) {
                stats[key].tracks.push(play);
            }
        });

        // Compute Scores
        const result: TrendingItem[] = [];
        Object.entries(stats).forEach(([key, data]) => {
            if (data.plays.length < 1) return;

            const sortedPlays = data.plays.sort((a,b) => a - b);
            const totalPlays = sortedPlays.length;
            const firstPlay = sortedPlays[0];
            const lastPlay = sortedPlays[totalPlays - 1];

            const spanDays = Math.max(1, Math.ceil((lastPlay - firstPlay) / 24 * 60 * 60 * 1000) + 1);
            const uniqueDays = new Set(sortedPlays.map(play => new Date(play).toDateString())).size;
            const consistency = uniqueDays / spanDays;
            const playsPerDay = totalPlays / uniqueDays;

            let sessionCount = 1;
            const sessionGapMs = 90 * 60 * 1000;
            for (let i = 1; i < sortedPlays.length; i += 1) {
                if (sortedPlays[i] - sortedPlays[i - 1] > sessionGapMs) sessionCount += 1;
            }
            const sessionIntensity = totalPlays / sessionCount;

            const daysSinceLastPlay = (now - lastPlay) / (24 * 60 * 60 * 1000);
            const recencyFactor = Math.exp(-daysSinceLastPlay / 14);

            const halfLifeMs = 14 * 24 * 60 * 60 * 1000;
            const recencyWeightedPlays = sortedPlays.reduce((sum, play) => {
                const age = now - play;
                return sum + Math.exp(-age / halfLifeMs);
            }, 0);

            const volumeScore = Math.log1p(totalPlays) * 28;
            const consistencyScore = Math.min(1, consistency) * 40;
            const intensityScore = Math.min(1.5, playsPerDay / 3) * 22;
            const focusScore = Math.min(1.5, sessionIntensity / 4) * 18;
            const recencyScore = Math.min(1.5, recencyFactor * 1.5) * 20;
            const momentumScore = recencyWeightedPlays * 6;

            const score = volumeScore + consistencyScore + intensityScore + focusScore + recencyScore + momentumScore;

            // Use specific fallbacks for known issues or generic
            let finalImage = data.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(key)}&background=random`;
            
            result.push({
                id: `trend-${key.replace(/\s+/g, '-').toLowerCase()}-${activeTab}`, // Unique ID
                name: activeTab === 'artist' ? key : data.subName ? key.split('||')[0] : key,
                subName: data.subName,
                image: finalImage,
                trendScore: Math.round(score),
                recentPlays: totalPlays,
                type: activeTab,
                tracks: data.tracks
            });
        });

        result.sort((a, b) => b.trendScore - a.trendScore);
        setTrendingItems(result.slice(0, 27)); // Top 27 fit the rings
    };

    useEffect(() => {
        calculateTrending();
    }, [recentPlays, activeTab, artistImages]);

    // Live update
    useEffect(() => {
        const interval = setInterval(calculateTrending, 5000);
        return () => clearInterval(interval);
    }, [recentPlays, activeTab]);

    // Handle Closing
    const handleClose = () => setSelectedItem(null);


    // ORBITAL LAYOUT
    const centerItem = trendingItems[0];
    const innerRing = trendingItems.slice(1, 9);
    const outerRing = trendingItems.slice(9, 27);

    // Dynamic rotation for rings
    // We use Framer Motion for smooth continuous rotation
    
    return (
        <div className="relative z-0 flex flex-col md:flex-row gap-8 items-start mb-12">
            
            <div className="flex-1 w-full relative min-h-[400px] md:min-h-[500px]">
                <div className="flex justify-between items-end mb-4 md:mb-16 px-2 relative z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                            Obsession Orbit
                        </h2>
                        <p className="text-[#8E8E93] text-sm mt-1">
                            Your {activeTab} universe in motion
                        </p>
                    </div>
                    

                    {/* Custom Toggle UI */}
                    <div className="bg-[#1C1C1EFF] p-1 rounded-full flex gap-1 border border-white/5 shadow-sm">
                        <button 
                            onClick={() => setActiveTab('artist')}
                            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'artist' ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93] hover:text-white'}`}
                        >
                             Artists
                        </button>
                        <button 
                            onClick={() => setActiveTab('album')}
                            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'album' ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93] hover:text-white'}`}
                        >
                             Albums
                        </button>
                    </div>
                </div>

                {/* MAIN ORBIT VIEW */}
                <motion.div 
                    layout
                    className="relative w-full max-w-[480px] mx-auto aspect-square select-none scale-[0.65] sm:scale-75 md:scale-100 origin-center md:origin-top mt-[-40px] md:mt-0"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    
                    {/* Center Item */}
                    {centerItem && (
                        <div 
                            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group transition-all duration-300 ${selectedItem && selectedItem.id !== centerItem.id ? 'opacity-30 blur-sm scale-90' : 'opacity-100'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleItemClick(centerItem);
                            }}
                        >
                            <div className="relative w-28 h-28 md:w-36 md:h-36">
                                <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#1C1C1E] shadow-2xl relative z-10 bg-[#1C1C1E] transition-transform duration-500 group-hover:scale-105">
                                    <img src={centerItem.image} className="w-full h-full object-cover" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Inner Ring Layer (Counter-Clockwise) */}
                    <div 
                        className={`absolute inset-0 z-20 transition-all duration-500 pointer-events-none ${selectedItem ? '[animation-play-state:paused] opacity-30' : 'hover:[animation-play-state:paused] opacity-100'}`}
                        style={{ animation: 'spin-slow 60s linear infinite' }}
                    >
                         <style>{`
                            @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                            @keyframes spin-reverse-slow { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                            .animate-spin-slow { animation: spin-slow 60s linear infinite; }
                            .animate-spin-reverse-slow { animation: spin-reverse-slow 90s linear infinite; }
                         `}</style>
                        
                        <div className="w-full h-full absolute inset-0 animate-spin-slow group-hover:[animation-play-state:paused]">
                            {innerRing.map((item, i) => {
                                const total = innerRing.length;
                                const angle = (i / total) * 360;
                                const radius = 34; // %
                                
                                return (
                                    <div 
                                        key={item.id}
                                        className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-auto"
                                        style={{ 
                                            transform: `rotate(${angle}deg) translate(${radius * 5}px) rotate(-${angle}deg)` 
                                        }}
                                    >
                                        <div className="animate-spin-reverse-slow group-hover:[animation-play-state:paused]">
                                            <OrbitNode 
                                                item={item} 
                                                rank={i + 2} 
                                                size={60} 
                                                isActive={selectedItem?.id === item.id}
                                                isDimmed={selectedItem !== null && selectedItem.id !== item.id}
                                                onClick={() => handleItemClick(item)} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Outer Ring Layer (Clockwise) */}
                    <div 
                        className={`absolute inset-0 z-10 transition-all duration-500 pointer-events-none ${selectedItem ? '[animation-play-state:paused] opacity-30' : 'hover:[animation-play-state:paused] opacity-100'}`}
                        style={{ animation: 'spin-reverse-slow 90s linear infinite' }}
                    >
                         <div className="w-full h-full absolute inset-0 animate-spin-reverse-slow group-hover:[animation-play-state:paused]">
                            {outerRing.map((item, i) => {
                                const total = outerRing.length;
                                const angle = (i / total) * 360;
                                const radius = 48; // %
                                
                                return (
                                    <div 
                                        key={item.id}
                                        className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-auto"
                                        style={{ 
                                            transform: `rotate(${angle}deg) translate(${radius * 5}px) rotate(-${angle}deg)` 
                                        }}
                                    >
                                        <div className="animate-spin-slow group-hover:[animation-play-state:paused]">
                                            <OrbitNode 
                                                item={item} 
                                                rank={i + 10} 
                                                size={40} 
                                                isActive={selectedItem?.id === item.id}
                                                isDimmed={selectedItem !== null && selectedItem.id !== item.id}
                                                onClick={() => handleItemClick(item)} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Orbital Lines */}
                    <div className="absolute inset-0 rounded-full border border-white/5 opacity-60 scale-[0.68] pointer-events-none"></div>
                    <div className="absolute inset-0 rounded-full border border-white/5 opacity-40 scale-[0.96] pointer-events-none"></div>
                    <div className="absolute inset-0 rounded-full border border-white/5 opacity-30 scale-[0.82] pointer-events-none"></div>
                </motion.div>
            </div>
            
            {/* SIDE PANEL VIEW (Replaces Modal) */}
            {createPortal(
                <AnimatePresence mode="wait">
                    {selectedItem && (
                        <>
                            {/* Global Backdrop (Click to close) */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150]"
                                onClick={() => setSelectedItem(null)}
                            />

                            {/* Floating Side Panel */}
                            <motion.div 
                                initial={{ opacity: 0, x: 50, scale: 0.95 }} 
                                animate={{ opacity: 1, x: 0, scale: 1 }} 
                                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="fixed top-2 bottom-2 right-2 w-[calc(100vw-16px)] md:w-[320px] z-[200] max-h-[calc(100vh-16px)] pointer-events-none"
                            >
                                <div 
                                    className="h-full w-full bg-[#1C1C1E] rounded-3xl overflow-hidden flex flex-col relative shadow-2xl border border-white/10 pointer-events-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button 
                                        onClick={() => setSelectedItem(null)} 
                                        className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 rounded-full p-2 text-white z-50 transition-colors backdrop-blur-md"
                                    >
                                        <X size={20} />
                                    </button>

                            {/* BANNER HEADER */}
                            <div className="relative w-full h-56 overflow-hidden flex-shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-transparent to-transparent z-10"></div>
                                <img 
                                    src={selectedItem.image} 
                                    alt={selectedItem.name} 
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-4 left-6 z-20">
                                    <h2 className="text-2xl font-black text-white leading-none tracking-tight mb-1 drop-shadow-lg line-clamp-2">{selectedItem.name}</h2>
                                    {selectedItem.subName && <p className="text-white/60 text-xs font-medium tracking-wide drop-shadow-md">{selectedItem.subName}</p>}
                                    <div className="inline-flex items-center gap-1.5 mt-2 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/5">
                                        <Sparkles size={10} className="text-white" />
                                        <span className="text-[10px] uppercase font-bold text-white tracking-wider">Obsession Score: {selectedItem.trendScore}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto no-scrollbar pb-8 pt-2">
                                {/* STATS ROW (Grid Layout) */}
                                {/* @ts-ignore */}
                                {selectedItem.stats ? (
                                    <>
                                        <div className="grid grid-cols-3 gap-2 px-4 mb-6">
                                            {/* @ts-ignore */}
                                            <div className="bg-white/5 p-3 rounded-lg text-center flex flex-col items-center justify-center">
                                                <div className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Streak</div>
                                                {/* @ts-ignore */}
                                                <div className="text-lg font-bold text-white leading-none">{selectedItem.stats.streak}<span className="text-[10px] font-normal text-white/40 ml-0.5">d</span></div>
                                            </div>

                                            <div className="bg-white/5 p-3 rounded-lg text-center flex flex-col items-center justify-center">
                                                <div className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Peak</div>
                                                {/* @ts-ignore */}
                                                <div className="text-base font-bold text-white leading-none truncate w-full">{selectedItem.stats.peakTime}</div>
                                            </div>

                                            <div className="bg-white/5 p-3 rounded-lg text-center flex flex-col items-center justify-center">
                                                <div className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Time</div>
                                                {/* @ts-ignore */}
                                                <div className="text-base font-bold text-white leading-none truncate w-full">{selectedItem.stats.totalTime}</div>
                                            </div>
                                        </div>

                                        {/* TOP SONGS LIST */}
                                        <div className="px-4">
                                            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-3 pl-2 opacity-50">Top Tracks</h3>
                                            <div className="space-y-0.5">
                                                {/* @ts-ignore */}
                                                {selectedItem.tracks && selectedItem.tracks.length > 0 ? (
                                                    // Group and sort tracks
                                                    Object.values(selectedItem.tracks.reduce((acc: any, track: any) => {
                                                        const id = track.track_name; 
                                                        if (!acc[id]) acc[id] = { ...track, count: 0 };
                                                        acc[id].count++;
                                                        return acc;
                                                    }, {}))
                                                    // @ts-ignore
                                                    .sort((a: any, b: any) => b.count - a.count)
                                                    .slice(0, 15) // Show more tracks since list is compact
                                                    .map((track: any, idx) => (
                                                        <div key={idx} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-md group transition-colors cursor-default">
                                                            <div className="text-[#8E8E93] font-mono text-[10px] w-4 text-center">{idx + 1}</div>
                                                            <div className="w-8 h-8 rounded bg-[#2C2C2E] overflow-hidden flex-shrink-0">
                                                                <img src={track.album_cover || track.cover} className="w-full h-full object-cover" alt="" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-[13px] font-medium text-white truncate group-hover:text-white transition-colors">{track.track_name}</div>
                                                                <div className="text-[10px] text-[#8E8E93] truncate">{track.count} plays</div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                     <div className="text-xs text-[#8E8E93] italic py-4 text-center">Track data unavailable</div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-white/40 py-20 flex flex-col items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        <span className="text-xs tracking-widest uppercase">Calculating Orbit...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
};

// Helper Component for Orbit Nodes
const OrbitNode = ({ item, rank, size, isActive, isDimmed, onClick }: { item: TrendingItem, rank: number, size: number, isActive: boolean, isDimmed: boolean, onClick: () => void }) => {
    return (
        <div 
            className={`group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${isDimmed ? 'opacity-20 scale-75 blur-[1px]' : 'opacity-100'} ${isActive ? 'scale-110 z-50' : ''}`}
            onClick={onClick}
        >
            <div 
                className={`relative rounded-full overflow-hidden border transition-all duration-300 bg-[#1C1C1E] ${isActive ? 'border-[#FA2D48] shadow-[0_0_20px_#FA2D48]' : 'border-[#1C1C1E] shadow-lg group-hover:scale-125'}`}
                style={{ width: size, height: size }}
            >
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                
                {/* Shiny overlay on hover */}
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full pointer-events-none"></div>
            </div>

            {/* Custom Tooltip - STRAIGHT (Not rotated via parent) */}
            <div className={`absolute top-full mt-3 left-1/2 -translate-x-1/2 transition-all duration-200 pointer-events-none z-[60] min-w-[max-content] text-center ${isActive || isDimmed ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2'}`}>
                 <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 shadow-2xl transform-none flex items-center gap-3">
                     <span className="text-[10px] font-black text-[#FA2D48] font-mono">#{rank}</span>
                     <div className="h-3 w-px bg-white/20"></div>
                     <p className="text-[11px] font-bold text-white whitespace-nowrap">{item.recentPlays} plays</p>
                 </div>
            </div>
        </div>
    );
};
