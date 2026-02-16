import React, { useState } from 'react';
import { ArrowUpRight, Disc, Info, X, TrendingUp } from 'lucide-react';
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
                    totalDuration: 0
                };
            }
            candidates[play.artist_name].plays += 1;
            candidates[play.artist_name].uniqueTracks.add(play.track_name);
            candidates[play.artist_name].totalDuration += (play.duration_ms || 180000);
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

            <div className="flex items-center justify-center overflow-x-auto pb-8 pt-2 no-scrollbar snap-x px-3 md:px-6 scroll-smooth gap-0">
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
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
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

            {/* Modal for Selected Artist */}
            <AnimatePresence>
                {selectedArtist && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100]"
                            onClick={() => setSelectedArtist(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:w-[90vw] max-w-md max-h-[calc(100vh-2rem)] bg-[#1C1C1E] rounded-2xl border border-white/10 shadow-2xl z-[101] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedArtist(null)}
                                className="absolute top-4 right-4 z-10 bg-black/40 hover:bg-black/60 rounded-full p-2 text-white transition-all"
                            >
                                <X size={18} />
                            </button>

                            {/* Header */}
                            <div className="relative h-48 overflow-hidden">
                                <img
                                    src={selectedArtist.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedArtist.name)}&background=1DB954&color=fff`}
                                    alt={selectedArtist.name}
                                    className="w-full h-full object-cover blur-sm scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] to-transparent"></div>
                                <div className="absolute bottom-4 left-6 right-6">
                                    <h2 className="text-2xl font-black text-white mb-2 drop-shadow-lg">{selectedArtist.name}</h2>
                                    <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full">
                                        <TrendingUp size={12} className="text-blue-400" />
                                        <span className="text-xs font-semibold text-blue-300">Upcoming Artist</span>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <p className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-bold mb-1">Total Plays</p>
                                        <p className="text-2xl font-black text-white">{selectedArtist.plays}</p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <p className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-bold mb-1">Unique Tracks</p>
                                        <p className="text-2xl font-black text-white">{selectedArtist.uniqueTracksCount || 1}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <p className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-bold mb-1">First Heard</p>
                                        <p className="text-sm font-semibold text-white">
                                            {new Date(selectedArtist.firstPlay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </p>
                                        <p className="text-[9px] text-white/50 mt-0.5">
                                            {selectedArtist.daysSinceFirstPlay} days ago
                                        </p>
                                    </div>
                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                        <p className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-bold mb-1">Avg Listen</p>
                                        <p className="text-sm font-semibold text-white">
                                            {selectedArtist.avgDuration || 3} mins
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <p className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-bold mb-2">Growth Trajectory</p>
                                    <p className="text-[13px] text-white/80 leading-relaxed">
                                        This artist entered your rotation <span className="font-semibold text-white">{selectedArtist.daysSinceFirstPlay} days ago</span> with <span className="font-semibold text-white">{selectedArtist.plays} plays</span> across <span className="font-semibold text-white">{selectedArtist.uniqueTracksCount || 1} different tracks</span>. They're gaining momentum and could soon join your top artists!
                                    </p>
                                </div>

                                <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                    <p className="text-[10px] uppercase tracking-wider text-[#8E8E93] font-bold mb-2 flex items-center gap-1">
                                        <Disc size={10} /> Recent Track
                                    </p>
                                    <p className="text-sm font-medium text-white truncate">{selectedArtist.trackSample}</p>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
