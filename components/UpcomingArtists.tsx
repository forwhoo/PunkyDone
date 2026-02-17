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

            {/* Modal for Selected Artist - Side Panel Style */}
            <AnimatePresence>
                {selectedArtist && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
                            onClick={() => setSelectedArtist(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-32px)] max-w-md z-[101] pointer-events-none"
                        >
                            <div 
                                className="h-auto max-h-[85vh] w-full bg-[#1C1C1E] rounded-3xl overflow-hidden flex flex-col relative shadow-2xl border border-white/10 pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Close Button */}
                                <button
                                    onClick={() => setSelectedArtist(null)}
                                    className="absolute top-4 right-4 z-10 bg-black/40 hover:bg-black/60 rounded-full p-2 text-white transition-all backdrop-blur-md"
                                >
                                    <X size={16} />
                                </button>

                                {/* Header Image */}
                                <div className="relative h-44 overflow-hidden flex-shrink-0">
                                    <img
                                        src={selectedArtist.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedArtist.name)}&background=1DB954&color=fff`}
                                        alt={selectedArtist.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-transparent to-transparent"></div>
                                    <div className="absolute bottom-4 left-5 right-5">
                                        <h2 className="text-xl font-black text-white mb-1.5 drop-shadow-lg line-clamp-1">{selectedArtist.name}</h2>
                                        <div className="inline-flex items-center gap-1.5 bg-blue-500/20 border border-blue-400/30 px-2.5 py-0.5 rounded-full">
                                            <TrendingUp size={10} className="text-blue-400" />
                                            <span className="text-[10px] font-bold text-blue-300">Upcoming Artist</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className="bg-white/[0.04] p-3.5 rounded-xl border border-white/5">
                                            <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-1">Total Plays</p>
                                            <p className="text-xl font-black text-white">{selectedArtist.plays}</p>
                                        </div>
                                        <div className="bg-white/[0.04] p-3.5 rounded-xl border border-white/5">
                                            <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-1">Unique Tracks</p>
                                            <p className="text-xl font-black text-white">{selectedArtist.uniqueTracksCount || 1}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        <div className="bg-white/[0.04] p-3.5 rounded-xl border border-white/5">
                                            <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-1">First Heard</p>
                                            <p className="text-sm font-semibold text-white">
                                                {new Date(selectedArtist.firstPlay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </p>
                                            <p className="text-[9px] text-white/30 mt-0.5">
                                                {selectedArtist.daysSinceFirstPlay} days ago
                                            </p>
                                        </div>
                                        <div className="bg-white/[0.04] p-3.5 rounded-xl border border-white/5">
                                            <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-1">Avg Listen</p>
                                            <p className="text-sm font-semibold text-white">
                                                {selectedArtist.avgDuration || 3} mins
                                            </p>
                                        </div>
                                    </div>

                                    {/* Growth Graph */}
                                    {growthData.length > 1 && (
                                        <div className="bg-white/[0.04] p-4 rounded-xl border border-white/5">
                                            <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-3 flex items-center gap-1">
                                                <BarChart3 size={10} className="text-blue-400" /> Listening Growth
                                            </p>
                                            <div className="flex items-end gap-1 h-16">
                                                {growthData.map((d, i) => {
                                                    const maxCount = Math.max(...growthData.map(g => g.count));
                                                    const height = (d.count / maxCount) * 100;
                                                    return (
                                                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                            <div 
                                                                className="w-full rounded-t bg-gradient-to-t from-blue-500/60 to-blue-400/30 transition-all hover:from-blue-500/80 hover:to-blue-400/50 min-h-[2px]"
                                                                style={{ height: `${Math.max(4, height)}%` }}
                                                                title={`${d.date}: ${d.count} plays`}
                                                            />
                                                            {growthData.length <= 7 && (
                                                                <span className="text-[7px] text-white/20 truncate w-full text-center">{d.date.split(' ')[1]}</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Trajectory Summary */}
                                    <div className="bg-white/[0.04] p-4 rounded-xl border border-white/5">
                                        <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2">Growth Trajectory</p>
                                        <p className="text-[12px] text-white/60 leading-relaxed">
                                            Entered your rotation <span className="font-semibold text-white">{selectedArtist.daysSinceFirstPlay} days ago</span> with <span className="font-semibold text-white">{selectedArtist.plays} plays</span> across <span className="font-semibold text-white">{selectedArtist.uniqueTracksCount || 1} tracks</span>. {selectedArtist.plays >= 5 ? 'Gaining serious momentum!' : 'Still early — keep listening!'}
                                        </p>
                                    </div>

                                    {/* Recent Track */}
                                    <div className="bg-white/[0.04] p-4 rounded-xl border border-white/5">
                                        <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold mb-2 flex items-center gap-1">
                                            <Disc size={10} /> Recent Track
                                        </p>
                                        <p className="text-sm font-medium text-white truncate">{selectedArtist.trackSample}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
