import React, { useState, useMemo } from 'react';
import { ArrowUpRight, Disc, Info, X, TrendingUp, BarChart3 } from 'lucide-react';
import { Artist } from '../types';
import { AnimatePresence, motion } from 'framer-motion';

interface UpcomingArtistsProps {
    recentPlays: any[];
    topArtists: Artist[];
    artistImages: Record<string, string>;
}

export const UpcomingArtists: React.FC<UpcomingArtistsProps> = ({ recentPlays, topArtists, artistImages }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [selectedArtist, setSelectedArtist] = useState<any>(null);
    
    // Logic: distinct artists in recentPlays who are NOT in topArtists (Top 20)
    // This simulates "New Discoveries"
    
    const topArtistNames = new Set(topArtists.slice(0, 30).map(a => a.name));
    
    const candidates: Record<string, any> = {};

    recentPlays.forEach(play => {
        if (!topArtistNames.has(play.artist_name)) {
            if (!candidates[play.artist_name]) {
                candidates[play.artist_name] = {
                    name: play.artist_name,
                    image: artistImages[play.artist_name] || play.album_cover || play.cover, // Prefer artist image
                    firstPlay: play.played_at,
                    lastPlay: play.played_at,
                    plays: 0,
                    trackSample: play.track_name,
                    uniqueTracks: new Set(),
                    totalDuration: 0,
                    playDates: []
                };
            }
            candidates[play.artist_name].plays += 1;
            candidates[play.artist_name].uniqueTracks.add(play.track_name);
            candidates[play.artist_name].totalDuration += (play.duration_ms || 180000);
            candidates[play.artist_name].playDates.push(play.played_at);
            // Update last play time
            if (new Date(play.played_at) > new Date(candidates[play.artist_name].lastPlay)) {
                candidates[play.artist_name].lastPlay = play.played_at;
            }
        }
    });

    // Filter for "Meaningful" discoveries (at least 2 plays) and format stats
    const upcoming = Object.values(candidates)
        .filter(c => c.plays >= 2)
        .map(c => ({
            ...c,
            uniqueTracksCount: c.uniqueTracks.size,
            avgDuration: Math.floor(c.totalDuration / c.plays / 1000 / 60), // in minutes
            daysSinceFirstPlay: Math.floor((Date.now() - new Date(c.firstPlay).getTime()) / (1000 * 60 * 60 * 24))
        }))
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 8); // Top 8 new artists

    // Compute growth data for selected artist
    const growthData = useMemo(() => {
        if (!selectedArtist?.playDates) return [];
        const dateMap = new Map<string, number>();
        selectedArtist.playDates.forEach((d: string) => {
            const key = new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dateMap.set(key, (dateMap.get(key) || 0) + 1);
        });
        return Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }));
    }, [selectedArtist]);

    if (upcoming.length === 0) return null;

    return (
        <div>
             <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex items-center gap-3">
                    <h3 className="text-[20px] font-bold text-white tracking-tight flex items-center gap-2">
                        <ArrowUpRight className="text-blue-400" /> Upcoming Artists
                        <button
                            onClick={() => setShowTooltip(!showTooltip)}
                            className="relative p-1 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <Info size={16} className="text-[#8E8E93]" />
                            {showTooltip && (
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 bg-[#1C1C1E] border border-white/10 rounded-xl p-3 w-64 shadow-2xl">
                                    <p className="text-xs text-white/70 leading-relaxed text-left font-normal">
                                        Artists entering your radar — new names appearing in your recent listening that aren&apos;t in your top charts yet. Our algorithm spots fresh discoveries in your rotation.
                                    </p>
                                </div>
                            )}
                        </button>
                    </h3>
                </div>
                <p className="text-[#8E8E93] text-xs">New artists entering your orbit</p>
             </div>

            <div className="flex items-center justify-center">
                <div className="flex items-center overflow-x-auto pb-8 pt-2 no-scrollbar snap-x scroll-smooth gap-0 px-6">
                    {upcoming.map((artist, idx) => (
                        <div 
                            key={artist.name} 
                            className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]"
                            onClick={() => setSelectedArtist(artist)}
                        >
                            <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40 text-white/5">
                                {idx + 1}
                            </span>
                            <div className="relative z-10 ml-10 md:ml-12">
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-blue-400/30 transition-all duration-300 group-hover:-translate-y-2 relative">
                                    <img 
                                        src={artist.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=1DB954&color=fff`}
                                        alt={artist.name} 
                                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm" 
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                                        <span className="text-white font-bold text-xl drop-shadow-md">{artist.plays} plays</span>
                                    </div>
                                </div>
                                <div className="mt-3 relative z-20">
                                    <h3 className="text-[15px] font-semibold text-white truncate w-32 md:w-40 leading-tight group-hover:text-white transition-colors">
                                        {artist.name}
                                    </h3>
                                    <p className="text-[13px] text-[#8E8E93] truncate w-32 md:w-40 mt-0.5 font-medium flex items-center gap-1">
                                        <Disc size={12} /> {artist.trackSample}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal for Selected Artist - Full Screen Style */}
            <AnimatePresence>
                {selectedArtist && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black"
                        onClick={() => setSelectedArtist(null)}
                    >
                        {/* Full-screen blurred background */}
                        <div className="absolute inset-0 overflow-hidden">
                            <img
                                src={selectedArtist.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedArtist.name)}&background=1DB954&color=fff`}
                                className="w-full h-full object-cover scale-110 blur-3xl opacity-20"
                                alt=""
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
                        </div>

                        <motion.div
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 50, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="relative h-full overflow-y-auto no-scrollbar px-4 py-16"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedArtist(null)}
                                className="fixed top-4 right-4 sm:top-6 sm:right-6 p-2.5 sm:p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all z-50 border border-white/10 hover:scale-105 active:scale-95"
                            >
                                <X size={18} />
                            </button>

                            <div className="flex flex-col items-center max-w-2xl mx-auto">
                                {/* Artist Image */}
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.1 }}
                                    className="relative mb-6 group"
                                >
                                    <div className="absolute -inset-4 rounded-full blur-3xl opacity-[0.2] bg-blue-500/30 group-hover:opacity-[0.3] transition-opacity duration-700"></div>
                                    <div className="w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full overflow-hidden ring-4 ring-white/10 shadow-2xl relative">
                                        <img
                                            src={selectedArtist.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedArtist.name)}&background=1DB954&color=fff`}
                                            className="w-full h-full object-cover bg-[#1C1C1E]"
                                            alt={selectedArtist.name}
                                        />
                                    </div>
                                    {/* Tag */}
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-300 px-4 py-1 rounded-full font-bold text-xs shadow-xl uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap">
                                        <TrendingUp size={12} className="text-blue-400" />
                                        Upcoming
                                    </div>
                                </motion.div>

                                {/* Name + Intro */}
                                <motion.h1
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 }}
                                    className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center tracking-tight mb-2"
                                >
                                    {selectedArtist.name}
                                </motion.h1>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-lg text-white/60 mb-8 text-center"
                                >
                                    Discovered {selectedArtist.daysSinceFirstPlay} days ago
                                </motion.p>

                                {/* Stats Row */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 }}
                                    className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl mb-8"
                                >
                                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                                        <p className="text-[9px] uppercase tracking-wider text-white/40 font-bold mb-1">Total Plays</p>
                                        <span className="text-xl font-black text-white">{selectedArtist.plays}</span>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                                        <p className="text-[9px] uppercase tracking-wider text-white/40 font-bold mb-1">Unique Tracks</p>
                                        <span className="text-xl font-black text-white">{selectedArtist.uniqueTracksCount || 1}</span>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                                        <p className="text-[9px] uppercase tracking-wider text-white/40 font-bold mb-1">Avg Listen</p>
                                        <span className="text-xl font-black text-white">{selectedArtist.avgDuration || 3}m</span>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center">
                                        <p className="text-[9px] uppercase tracking-wider text-white/40 font-bold mb-1">First Heard</p>
                                        <span className="text-sm font-bold text-white mt-1">
                                            {new Date(selectedArtist.firstPlay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                </motion.div>

                                {/* Growth Graph - Enhanced */}
                                {growthData.length > 1 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 mb-6"
                                    >
                                        <p className="text-[11px] uppercase tracking-wider text-white/40 font-bold mb-4 flex items-center gap-2">
                                            <BarChart3 size={14} className="text-blue-400" /> Listening Activity
                                        </p>
                                        <div className="flex items-end gap-2 h-32">
                                            {growthData.map((d, i) => {
                                                const maxCount = Math.max(...growthData.map(g => g.count));
                                                const height = (d.count / maxCount) * 100;
                                                return (
                                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                                        <div className="relative w-full flex items-end justify-center h-full">
                                                            <div 
                                                                className="w-full max-w-[20px] rounded-t-sm bg-gradient-to-t from-blue-500/40 to-blue-400/80 transition-all hover:from-blue-500/60 hover:to-blue-400 min-h-[4px]"
                                                                style={{ height: `${Math.max(4, height)}%` }}
                                                            ></div>
                                                            {/* Tooltip */}
                                                            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1C1C1E] border border-white/10 px-2 py-1 rounded text-[10px] whitespace-nowrap z-10 pointer-events-none">
                                                                {d.count} plays
                                                            </div>
                                                        </div>
                                                        {growthData.length <= 10 && (
                                                            <span className="text-[9px] text-white/30 truncate w-full text-center font-mono">{d.date.split(' ')[1]}</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                    {/* Recent Track */}
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.35 }}
                                        className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5"
                                    >
                                        <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-3 flex items-center gap-1.5">
                                            <Disc size={12} /> Recent Track
                                        </p>
                                        <p className="text-lg font-bold text-white truncate">{selectedArtist.trackSample}</p>
                                    </motion.div>

                                    {/* Trajectory Summary */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.35 }}
                                        className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5"
                                    >
                                        <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-3">Trajectory</p>
                                        <p className="text-sm text-white/70 leading-relaxed">
                                            With <span className="text-white font-bold">{selectedArtist.plays} plays</span> across <span className="text-white font-bold">{selectedArtist.uniqueTracksCount || 1} tracks</span>,
                                            {selectedArtist.plays >= 5 ? ' this artist is gaining serious momentum in your rotation.' : ' you\'re just getting started with this artist.'}
                                        </p>
                                    </motion.div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
