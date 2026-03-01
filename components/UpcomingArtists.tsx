import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpRight, Disc, Info, TrendingUp, BarChart3, Clock, Play } from 'lucide-react';
import { Artist } from '../types';
import { motion } from 'framer-motion';
import { getDiscoveryDate } from '../services/dbService';
import { FullScreenModal } from './FullScreenModal';
import { ChartRadarGridCircleFill } from './ChartRadarGridCircleFill';

interface UpcomingArtistsProps {
    recentPlays: any[];
    topArtists: Artist[];
    artistImages: Record<string, string>;
}

export const UpcomingArtists: React.FC<UpcomingArtistsProps> = ({ recentPlays, topArtists, artistImages }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [selectedArtist, setSelectedArtist] = useState<any>(null);
    const [upcoming, setUpcoming] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!recentPlays || recentPlays.length === 0) return;

        const processCandidates = async () => {
            setLoading(true);
            const topArtistNames = new Set(topArtists.slice(0, 30).map(a => a.name));
            const candidates: Record<string, any> = {};

            recentPlays.forEach(play => {
                const artistName = play.artist_name || play.artist;
                if (!artistName) return;

                if (!topArtistNames.has(artistName)) {
                    if (!candidates[artistName]) {
                        candidates[artistName] = {
                            name: artistName,
                            image: artistImages[artistName] || play.album_cover || play.cover,
                            firstPlay: play.played_at,
                            lastPlay: play.played_at,
                            plays: 0,
                            trackSample: play.track_name,
                            uniqueTracks: new Set(),
                            trackCounts: {},
                            totalDuration: 0,
                            playDates: []
                        };
                    }
                    candidates[artistName].plays += 1;
                    candidates[artistName].uniqueTracks.add(play.track_name);

                    const trackName = play.track_name;
                    candidates[artistName].trackCounts[trackName] = (candidates[artistName].trackCounts[trackName] || 0) + 1;

                    candidates[artistName].totalDuration += (play.duration_ms || 180000);
                    candidates[artistName].playDates.push(play.played_at);

                    if (new Date(play.played_at) > new Date(candidates[artistName].lastPlay)) {
                        candidates[artistName].lastPlay = play.played_at;
                    }
                }
            });

            const potentialCandidates = Object.values(candidates)
                .filter(c => c.plays >= 2)
                .sort((a, b) => b.plays - a.plays)
                .slice(0, 15);

            const verificationResults = await Promise.all(
                potentialCandidates.map(async (candidate) => {
                    try {
                        const discovery = await getDiscoveryDate(candidate.name);
                        if (discovery) {
                            const firstPlayedDate = new Date(discovery.first_played);
                            const now = new Date();
                            const daysSinceFirst = (now.getTime() - firstPlayedDate.getTime()) / (1000 * 60 * 60 * 24);

                            if (daysSinceFirst <= 60) {
                                return {
                                    ...candidate,
                                    uniqueTracksCount: candidate.uniqueTracks.size,
                                    avgDuration: Math.floor(candidate.totalDuration / candidate.plays / 1000 / 60),
                                    firstPlay: discovery.first_played,
                                    daysSinceFirstPlay: Math.floor(daysSinceFirst)
                                };
                            }
                        }
                    } catch (e) {
                        console.warn("Verification failed for", candidate.name, e);
                    }
                    return null;
                })
            );

            const verifiedList = verificationResults.filter(Boolean);
            setUpcoming(verifiedList.sort((a: any, b: any) => b.plays - a.plays).slice(0, 8));
            setLoading(false);
        };

        processCandidates();
    }, [recentPlays, topArtists, artistImages]);

    const radarData = useMemo(() => {
        if (!selectedArtist) return null;

        // Map real metrics to radar axes
        // Discovery: how recently discovered (max 60 days)
        const discoveryScore = Math.max(0, 100 - (selectedArtist.daysSinceFirstPlay * 1.5));

        // Variety: unique tracks vs total plays
        const varietyScore = Math.min(100, (selectedArtist.uniqueTracksCount / (selectedArtist.plays || 1)) * 200);

        // Intensity: total plays (cap at 50 for max score)
        const intensityScore = Math.min(100, (selectedArtist.plays / 50) * 100);

        // Longevity: avg listen duration (max 5 mins)
        const longevityScore = Math.min(100, (selectedArtist.avgDuration / 5) * 100);

        // Energy: calculated from track counts variety
        const energyScore = 75; // Baseline for upcoming

        return [
            { subject: 'Discovery', A: discoveryScore, fullMark: 100 },
            { subject: 'Variety', A: varietyScore, fullMark: 100 },
            { subject: 'Intensity', A: intensityScore, fullMark: 100 },
            { subject: 'Longevity', A: longevityScore, fullMark: 100 },
            { subject: 'Energy', A: energyScore, fullMark: 100 },
        ];
    }, [selectedArtist]);

    if (loading && upcoming.length === 0) return null;
    if (upcoming.length === 0) return null;

    return (
        <div>
             <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex items-center gap-3">
                    <h3 className="text-[20px] font-bold text-[#141413] tracking-tight flex items-center gap-2">
                        <ArrowUpRight className="text-blue-400" /> Upcoming Artists
                        <button
                            onClick={() => setShowTooltip(!showTooltip)}
                            className="relative p-1 rounded-full hover:bg-[#e8e6dc] transition-colors"
                        >
                            <Info size={16} className="text-[#b0aea5]" />
                            {showTooltip && (
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 bg-white border border-[#e8e6dc] rounded-xl p-3 w-64 shadow-2xl">
                                    <p className="text-xs text-[#141413]/70 leading-relaxed text-left font-normal">
                                        Artists entering your radar — new names appearing in your recent listening that aren&apos;t in your top charts yet.
                                    </p>
                                </div>
                            )}
                        </button>
                    </h3>
                </div>
                <p className="text-[#b0aea5] text-xs">New artists entering your orbit</p>
             </div>

            <div className="flex items-center justify-center">
                <div className="flex items-center overflow-x-auto pb-8 pt-2 no-scrollbar snap-x scroll-smooth gap-0 px-6">
                    {upcoming.map((artist, idx) => (
                        <div 
                            key={artist.name} 
                            className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]"
                            onClick={() => setSelectedArtist(artist)}
                        >
                            <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40 text-[#141413]/5">
                                {idx + 1}
                            </span>
                            <div className="relative z-10 ml-10 md:ml-12">
                                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-[#2C2C2E] shadow-2xl border border-[#e8e6dc] group-hover:border-blue-400/30 transition-all duration-300 group-hover:-translate-y-2 relative">
                                    <img 
                                        src={artist.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=1DB954&color=fff`}
                                        alt={artist.name} 
                                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm" 
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-[#faf9f5]/40">
                                        <span className="text-[#141413] font-bold text-xl drop-shadow-md">{artist.plays} plays</span>
                                    </div>
                                </div>
                                <div className="mt-3 relative z-20">
                                    <h3 className="text-[15px] font-semibold text-[#141413] truncate w-32 md:w-40 leading-tight group-hover:text-[#141413] transition-colors">
                                        {artist.name}
                                    </h3>
                                    <p className="text-[13px] text-[#b0aea5] truncate w-32 md:w-40 mt-0.5 font-medium flex items-center gap-1">
                                        <Disc size={12} /> {artist.trackSample}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* FULL SCREEN MODAL */}
            <FullScreenModal
                isOpen={!!selectedArtist}
                onClose={() => setSelectedArtist(null)}
                image={selectedArtist?.image}
                title="Rising Star"
            >
                {selectedArtist && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl mx-auto items-start pb-20">
                        {/* LEFT COLUMN */}
                        <div className="flex flex-col gap-6">
                            {/* Artist Hero */}
                            <div className="flex flex-col items-center bg-[#e8e6dc]/50 border border-[#e8e6dc] rounded-3xl p-8 shadow-2xl ">
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden shadow-2xl border-4 border-[#e8e6dc] mb-6 relative"
                                >
                                    <div className="absolute inset-0 bg-[#faf9f5]/20" />
                                    <img
                                        src={selectedArtist.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedArtist.name)}&background=1DB954&color=fff`}
                                        className="w-full h-full object-cover"
                                        alt={selectedArtist.name}
                                    />
                                </motion.div>
                                <h1 className="text-3xl sm:text-5xl font-bold text-[#141413] text-center tracking-tight mb-4">
                                    {selectedArtist.name}
                                </h1>
                                <div className="flex items-center gap-2 bg-blue-500/20 px-4 py-1.5 rounded-full border border-blue-500/30">
                                    <TrendingUp size={14} className="text-blue-400" />
                                    <span className="text-sm font-bold text-blue-100">Discovered {selectedArtist.daysSinceFirstPlay} days ago</span>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#e8e6dc]/50 border border-[#e8e6dc] rounded-2xl p-5 flex flex-col items-center text-center hover:bg-[#e8e6dc] transition-colors">
                                    <Play size={20} className="text-[#141413]/50 mb-2" />
                                    <span className="text-2xl font-bold text-[#141413]">{selectedArtist.plays}</span>
                                    <span className="text-xs uppercase tracking-wider text-[#141413]/40 font-bold mt-1">Total Plays</span>
                                </div>
                                <div className="bg-[#e8e6dc]/50 border border-[#e8e6dc] rounded-2xl p-5 flex flex-col items-center text-center hover:bg-[#e8e6dc] transition-colors">
                                    <Disc size={20} className="text-[#141413]/50 mb-2" />
                                    <span className="text-2xl font-bold text-[#141413]">{selectedArtist.uniqueTracksCount || 1}</span>
                                    <span className="text-xs uppercase tracking-wider text-[#141413]/40 font-bold mt-1">Unique Tracks</span>
                                </div>
                                <div className="bg-[#e8e6dc]/50 border border-[#e8e6dc] rounded-2xl p-5 flex flex-col items-center text-center hover:bg-[#e8e6dc] transition-colors">
                                    <Clock size={20} className="text-[#141413]/50 mb-2" />
                                    <span className="text-2xl font-bold text-[#141413]">{selectedArtist.avgDuration || 3}m</span>
                                    <span className="text-xs uppercase tracking-wider text-[#141413]/40 font-bold mt-1">Avg Listen</span>
                                </div>
                                <div className="bg-[#e8e6dc]/50 border border-[#e8e6dc] rounded-2xl p-5 flex flex-col items-center text-center hover:bg-[#e8e6dc] transition-colors">
                                    <BarChart3 size={20} className="text-[#141413]/50 mb-2" />
                                    <span className="text-lg font-bold text-[#141413] mt-1 leading-tight">
                                        {new Date(selectedArtist.firstPlay).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <span className="text-xs uppercase tracking-wider text-[#141413]/40 font-bold mt-1">First Heard</span>
                                </div>
                            </div>

                             {/* Recent Track Info */}
                             <div className="w-full bg-[#e8e6dc]/50 border border-[#e8e6dc] rounded-3xl p-6 flex items-center gap-4 hover:bg-[#e8e6dc] transition-colors">
                                <div className="w-12 h-12 rounded-full bg-[#e8e6dc] flex items-center justify-center shrink-0">
                                    <Clock size={24} className="text-[#141413]" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-[#141413]">{selectedArtist.trackSample}</h4>
                                    <p className="text-sm text-[#141413]/50">Most recent track in rotation</p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex flex-col gap-6">
                            {/* RADAR CHART */}
                            <div className="bg-[#e8e6dc]/50 border border-[#e8e6dc] rounded-3xl p-6 overflow-hidden relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                <ChartRadarGridCircleFill data={radarData || undefined} />
                            </div>

                            {/* Top Tracks */}
                            <div className="w-full bg-[#e8e6dc]/50 border border-[#e8e6dc] rounded-3xl p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Disc size={16} className="text-[#d97757]" />
                                    <h3 className="text-sm font-bold text-[#141413] uppercase tracking-wide">Top Tracks</h3>
                                </div>
                                <div className="space-y-3">
                                    {Object.entries(selectedArtist.trackCounts || {})
                                        .sort(([, a], [, b]) => (b as number) - (a as number))
                                        .slice(0, 3)
                                        .map(([track, count], idx) => (
                                        <div key={idx} className="flex items-center justify-between group p-2 hover:bg-[#e8e6dc]/50 rounded-lg transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[#141413]/20 font-bold text-sm w-4">{idx + 1}</span>
                                                <span className="text-[#141413] font-medium text-sm">{track}</span>
                                            </div>
                                            <div className="text-[#141413]/40 text-xs font-bold bg-[#e8e6dc]/50 px-2 py-1 rounded-md group-hover:bg-[#e8e6dc] transition-colors">
                                                {count as number} plays
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </FullScreenModal>
        </div>
    );
};
