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
}

export const TrendingArtists: React.FC<TrendingArtistsProps> = ({ artists, albums, songs, recentPlays, artistImages }) => {
    const [activeTab, setActiveTab] = useState<'artist' | 'album'>('artist');
    const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<TrendingItem | null>(null);

    // Calculate Trending Data based on Active Tab
    const calculateTrending = () => {
        if (!recentPlays || recentPlays.length === 0) return;

        const now = new Date().getTime();
        const last24Hours = now - (24 * 60 * 60 * 1000);
        const last7Days = now - (7 * 24 * 60 * 60 * 1000);

        // Filter recent plays window
        const recentWindow = recentPlays.filter(play => new Date(play.played_at).getTime() > last7Days);

        const stats: Record<string, { plays: number[], image: string, subName?: string, tracks: any[] }> = {};

        recentWindow.forEach(play => {
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
            const recent24h = sortedPlays.filter(t => t > last24Hours).length;
            
            // POPULARITY SCORE FORMULA
            // 1. Base: Recent Plays (Last 24h) * 15
            // 2. Volume: Total Plays (Last 7d) * 2
            // 3. Recency Boost: If played in last 3 hours, +20 points
            const timeSinceLastPlay = (now - sortedPlays[sortedPlays.length - 1]) / (1000 * 60 * 60);
            const recencyBoost = timeSinceLastPlay < 3 ? 20 : 0;

            const score = (recent24h * 15) + (data.plays.length * 2) + recencyBoost;

            result.push({
                id: key,
                name: activeTab === 'artist' ? key : data.subName ? key.split('||')[0] : key,
                subName: data.subName,
                image: data.image,
                trendScore: Math.round(score),
                recentPlays: recent24h,
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


    // ORBITAL LAYOUT
    const centerItem = trendingItems[0];
    const innerRing = trendingItems.slice(1, 9);
    const outerRing = trendingItems.slice(9, 27);

    // Dynamic rotation for rings
    // We use Framer Motion for smooth continuous rotation
    
    return (
        <div className="mb-24 relative z-0">
             <div className="flex justify-between items-end mb-6 px-2">
                 <div>
                    <h2 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-2">
                        Obsession Orbit
                    </h2>
                    <p className="text-[#8E8E93] text-[13px]">
                        Your {activeTab} rotation
                    </p>
                </div>
                
                {/* Custom Toggle UI */}
                <div className="bg-[#1C1C1E] p-1 rounded-full flex gap-1 border border-white/10">
                    <button 
                        onClick={() => setActiveTab('artist')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'artist' ? 'bg-[#FA2D48] text-white shadow-lg' : 'text-[#8E8E93] hover:text-white'}`}
                    >
                        <Mic2 size={12} /> Artists
                    </button>
                    <button 
                        onClick={() => setActiveTab('album')}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${activeTab === 'album' ? 'bg-[#FA2D48] text-white shadow-lg' : 'text-[#8E8E93] hover:text-white'}`}
                    >
                        <Disc size={12} /> Albums
                    </button>
                </div>
            </div>

            {/* MAIN ORBIT VIEW */}
            <div className="relative w-full max-w-[500px] mx-auto aspect-square my-8 select-none perspective-1000">
                
                {/* Center Item */}
                {centerItem && (
                    <div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group"
                        onClick={() => setSelectedItem(centerItem)}
                    >
                        <div className="relative w-32 h-32 md:w-40 md:h-40">
                             {/* Shiny Effect Ring */}
                             <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-white/20 to-transparent blur-sm animate-pulse"></div>
                             
                             <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#1C1C1E] shadow-2xl relative z-10 bg-[#1C1C1E] transition-transform duration-500 group-hover:scale-105">
                                <img src={centerItem.image} className="w-full h-full object-cover" />
                             </div>
                             
                             {/* Badge */}
                             <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-black px-3 py-1 rounded-full shadow-lg z-20 flex items-center gap-1 whitespace-nowrap">
                                <Sparkles size={10} className="text-[#FA2D48] fill-[#FA2D48]" />
                                #{1} OBSESSION
                             </div>
                        </div>
                    </div>
                )}

                {/* Inner Ring Layer (Counter-Clockwise) */}
                <div className="absolute inset-0 z-20 pointer-events-none">
                     <motion.div 
                        className="w-full h-full absolute inset-0"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
                     >
                        {innerRing.map((item, i) => {
                             const total = innerRing.length;
                             const angle = (i / total) * 360;
                             const radius = 34; // %
                             
                             return (
                                <div 
                                    key={item.id}
                                    className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-auto"
                                    style={{ 
                                        transform: `rotate(${angle}deg) translate(${radius * 5}px) rotate(-${angle}deg)` // maintain upright
                                    }}
                                >
                                     <OrbitNode item={item} rank={i + 2} size={60} onClick={() => setSelectedItem(item)} />
                                </div>
                             );
                        })}
                     </motion.div>
                </div>

                {/* Outer Ring Layer (Clockwise) */}
                <div className="absolute inset-0 z-10 pointer-events-none">
                     <motion.div 
                        className="w-full h-full absolute inset-0"
                        animate={{ rotate: -360 }}
                        transition={{ repeat: Infinity, duration: 90, ease: "linear" }}
                     >
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
                                     <OrbitNode item={item} rank={i + 10} size={40} onClick={() => setSelectedItem(item)} />
                                </div>
                             );
                        })}
                     </motion.div>
                </div>

                {/* Orbital Lines */}
                <div className="absolute inset-0 rounded-full border border-white/5 opacity-50 scale-[0.68]"></div>
                <div className="absolute inset-0 rounded-full border border-white/5 opacity-30 scale-[0.96] border-dashed"></div>
            </div>

            {/* DETAIL MODAL OVERLAY */}
            <AnimatePresence>
                {selectedItem && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedItem(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm" // click outside to close
                        />
                        <motion.div 
                             initial={{ scale: 0.9, opacity: 0, y: 20 }}
                             animate={{ scale: 1, opacity: 1, y: 0 }}
                             exit={{ scale: 0.9, opacity: 0, y: 20 }}
                             className="bg-[#1C1C1E] border border-white/10 w-full max-w-md max-h-[70vh] rounded-3xl overflow-hidden relative shadow-2xl z-[101]"
                        >
                            {/* Close Button */}
                            <button 
                                onClick={() => setSelectedItem(null)}
                                className="absolute top-4 right-4 bg-black/40 hover:bg-black/80 rounded-full p-2 text-white z-20 transition-colors"
                            >
                                <X size={16} />
                            </button>

                            {/* Modal Header */}
                            <div className="relative h-40">
                                <img src={selectedItem.image} className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] to-transparent"></div>
                                <div className="absolute bottom-4 left-6 right-6">
                                     <h2 className="text-2xl font-bold text-white leading-tight truncate">{selectedItem.name}</h2>
                                     {selectedItem.subName && <p className="text-sm text-[#FA2D48] font-medium">{selectedItem.subName}</p>}
                                     <div className="flex items-center gap-3 mt-2">
                                         <span className="text-xs bg-white/10 backdrop-blur-md px-2 py-0.5 rounded text-white/80">
                                             Heat Score: {selectedItem.trendScore}
                                         </span>
                                         <span className="text-xs bg-white/10 backdrop-blur-md px-2 py-0.5 rounded text-white/80">
                                             {selectedItem.recentPlays} recent plays
                                         </span>
                                     </div>
                                </div>
                            </div>

                            {/* Song List */}
                            <div className="p-4 overflow-y-auto max-h-[calc(70vh-160px)]">
                                <h4 className="text-xs font-bold text-[#8E8E93] uppercase tracking-widest mb-3 px-2">Recently Played Tracks</h4>
                                <div className="space-y-1">
                                    {selectedItem.tracks?.map((track: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-xl transition-colors group">
                                            <div className="w-8 h-8 rounded-md overflow-hidden bg-[#2C2C2E] flex-shrink-0 relative">
                                                <img src={track.album_cover || track.cover} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div className="w-1 h-3 bg-white rounded-full"></div> {/* Simple play bar icon */}
                                                </div>
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
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Helper Component for Orbit Nodes
const OrbitNode = ({ item, rank, size, onClick }: { item: TrendingItem, rank: number, size: number, onClick: () => void }) => {
    return (
        <div 
            className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
            onClick={onClick}
        >
            <div 
                className="relative rounded-full overflow-hidden border border-[#1C1C1E] shadow-lg transition-transform duration-300 group-hover:scale-125 bg-[#1C1C1E]"
                style={{ width: size, height: size }}
            >
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                
                {/* Shiny overlay on hover */}
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full pointer-events-none"></div>
            </div>

            {/* Custom Tooltip */}
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 min-w-[100px] text-center">
                 <div className="bg-[#1C1C1E] border border-white/10 rounded-lg px-2 py-1.5 shadow-xl backdrop-blur-md">
                     <p className="text-[9px] font-bold text-white truncate max-w-[120px]">{item.name}</p>
                     <p className="text-[8px] text-[#FA2D48] leading-none mt-0.5">Rank #{rank}</p>
                 </div>
            </div>
        </div>
    );
};
