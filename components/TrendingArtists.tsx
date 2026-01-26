import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Sparkles, Disc, Mic2, Music, X } from 'lucide-react';
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
                stats[key] = { plays: [], image, subName, tracks: [] };
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

            const spanDays = Math.max(1, Math.ceil((lastPlay - firstPlay) / dayMs) + 1);
            const uniqueDays = new Set(sortedPlays.map(play => new Date(play).toDateString())).size;
            const consistency = uniqueDays / spanDays;
            const playsPerDay = totalPlays / uniqueDays;

            let sessionCount = 1;
            for (let i = 1; i < sortedPlays.length; i += 1) {
                if (sortedPlays[i] - sortedPlays[i - 1] > sessionGapMs) sessionCount += 1;
            }
            const sessionIntensity = totalPlays / sessionCount;

            const daysSinceLastPlay = (now - lastPlay) / dayMs;
            const recencyFactor = Math.exp(-daysSinceLastPlay / 14);

            const halfLifeMs = 14 * dayMs;
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

            result.push({
                id: key,
                name: activeTab === 'artist' ? key : data.subName ? key.split('||')[0] : key,
                subName: data.subName,
                image: data.image,
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
                            onClick={() => setSelectedItem(selectedItem?.id === centerItem.id ? null : centerItem)}
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
                        className={`absolute inset-0 z-20 transition-all duration-500 hover:[animation-play-state:paused] ${selectedItem ? 'opacity-30' : 'opacity-100'}`}
                        style={{ animation: 'spin-slow 60s linear infinite' }}
                    >
                         {/* Note: spin-slow needs to be defined or we use inline keyframes equivalent */}
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
                                                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Outer Ring Layer (Clockwise) */}
                    <div 
                        className={`absolute inset-0 z-10 transition-all duration-500 ${selectedItem ? 'opacity-30' : 'opacity-100'}`}
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
                                                onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Orbital Lines - Enhanced */}
                    <div className="absolute inset-0 rounded-full border border-white/5 opacity-60 scale-[0.68]"></div>
                    <div className="absolute inset-0 rounded-full border border-white/5 opacity-40 scale-[0.96]"></div>
                    <div className="absolute inset-0 rounded-full border border-white/5 opacity-30 scale-[0.82]"></div>
                </motion.div>
            </div>

            {/* SIDE PANEL DETAILS (Replaces Modal) */}
            <AnimatePresence>
                {selectedItem && (
                    <motion.div 
                        initial={{ opacity: 0, x: 50, width: 0 }} 
                        animate={{ opacity: 1, x: 0, width: 400 }} 
                        exit={{ opacity: 0, x: 50, width: 0 }}
                        className="h-[600px] w-[400px] flex-shrink-0 bg-[#1C1C1E] border border-white/10 rounded-3xl overflow-hidden relative shadow-2xl z-20 hidden lg:block"
                    >
                        {/* Close Button */}
                        <button 
                            onClick={handleClose}
                            className="absolute top-4 right-4 bg-black/40 hover:bg-black/80 rounded-full p-2 text-white z-20 transition-colors"
                        >
                            <X size={16} />
                        </button>

                        {/* Panel Header */}
                        <div className="relative h-48 w-full">
                            <img src={selectedItem.image} className="w-full h-full object-cover opacity-80" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] to-transparent"></div>
                            <div className="absolute bottom-4 left-6 right-6">
                                    <h2 className="text-2xl font-bold text-white leading-tight truncate">{selectedItem.name}</h2>
                                    {selectedItem.subName && <p className="text-sm text-[#FA2D48] font-medium">{selectedItem.subName}</p>}
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-xs bg-white/10 backdrop-blur-md px-2 py-0.5 rounded text-white/80">
                                            Score: {selectedItem.trendScore}
                                        </span>
                                        <span className="text-xs bg-white/10 backdrop-blur-md px-2 py-0.5 rounded text-white/80">
                                            {selectedItem.recentPlays} recent plays
                                        </span>
                                    </div>
                            </div>
                        </div>

                        {/* Song List */}
                        <div className="p-4 overflow-y-auto h-[calc(100%-192px)] custom-scrollbar">
                            <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-widest mb-3 px-2">Track History</h4>
                            <div className="space-y-1">
                                {selectedItem.tracks?.map((track: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors group">
                                        <div className="w-8 h-8 rounded-md overflow-hidden bg-[#2C2C2E] flex-shrink-0 relative">
                                            <img src={track.album_cover || track.cover} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h5 className="text-sm font-medium text-white truncate group-hover:text-[#FA2D48] transition-colors">{track.track_name}</h5>
                                            <p className="text-[11px] text-[#8E8E93] truncate">{track.played_at ? new Date(track.played_at).toLocaleDateString() : 'Unknown date'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile Modal Fallback */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="lg:hidden fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedItem(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div 
                             initial={{ scale: 0.9, opacity: 0, y: 20 }}
                             animate={{ scale: 1, opacity: 1, y: 0 }}
                             exit={{ scale: 0.9, opacity: 0, y: 20 }}
                             className="bg-[#1C1C1E] border border-white/10 w-full max-w-md max-h-[70vh] rounded-3xl overflow-hidden relative shadow-2xl z-[101]"
                        >
                            <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 bg-black/40 hover:bg-black/80 rounded-full p-2 text-white z-20"><X size={16} /></button>
                            <div className="relative h-40">
                                <img src={selectedItem.image} className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] to-transparent"></div>
                                <div className="absolute bottom-4 left-6 right-6">
                                     <h2 className="text-xl font-bold text-white leading-tight truncate">{selectedItem.name}</h2>
                                     {selectedItem.subName && <p className="text-sm text-[#FA2D48] font-medium">{selectedItem.subName}</p>}
                                     
                                     {/* Obsession Score Display */}
                                     <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-[#FA2D48]/20 border border-[#FA2D48]/50 rounded-full text-[#FA2D48]">
                                        <TrendingUp size={12} />
                                        <span className="text-[10px] font-bold tracking-wider">+{selectedItem.trendScore} OBSESSION POINTS</span>
                                     </div>
                                </div>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[calc(70vh-160px)]">
                                <div className="space-y-1">
                                    {selectedItem.tracks?.map((track: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors">
                                            <div className="min-w-0 flex-1">
                                                <h5 className="text-sm font-medium text-white truncate">{track.track_name}</h5>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
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
