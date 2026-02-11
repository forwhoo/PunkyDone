
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Zap, Clock, Disc, Share2, Sparkles, Rewind } from 'lucide-react';
import { getAlgorithmicWrappedStats } from '../services/dbService';

interface PunkyWrappedProps {
    onClose: () => void;
    period?: 'daily' | 'weekly' | 'monthly' | 'all time';
}

// Helper for formatting time
const formatTime = (hour: number) => {
    const h = hour % 12 || 12;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return `${h} ${ampm}`;
}

export const PunkyWrapped: React.FC<PunkyWrappedProps> = ({ onClose, period = 'weekly' }) => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await getAlgorithmicWrappedStats(period);
            setStats(data);
            setLoading(false);
        };
        load();
    }, [period]);

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
            </div>
        );
    }

    const { topArtists, topSongs, topAlbums, obsession, hourlyAnthem, orbit } = stats;
    const topArtist = topArtists[0];
    const topSong = topSongs[0];
    const topAlbum = topAlbums[0];

    return (
        <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-black text-white overflow-y-auto no-scrollbar"
        >
            {/* Background Gradients (Apple Replay Style) */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-900/40 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-orange-900/40 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] bg-pink-900/30 blur-[100px] rounded-full mix-blend-screen" />
            </div>

            {/* Header / Nav */}
            <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-center z-50 mix-blend-difference">
                <h1 className="text-2xl font-black tracking-tighter uppercase">Replay_26</h1>
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* CONTENT SCROLL */}
            <div className="relative z-10 w-full max-w-2xl mx-auto pt-24 pb-20 px-6 space-y-24">

                {/* 1. INTRO / SUMMARY */}
                <section className="min-h-[60vh] flex flex-col justify-center items-center text-center">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className="text-[12px] font-bold tracking-[0.2em] text-[#8E8E93] mb-4 uppercase">Your {period} Recap</h2>
                        <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-6">
                            You listened<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                                {topArtists.reduce((acc: number, a: any) => {
                                    const timeStr = a.timeStr || '0m';
                                    const mins = Number(timeStr.replace('m', '')) || 0;
                                    return acc + mins;
                                }, 0)}
                            </span> mins.
                        </h1>
                        <p className="text-xl text-white/60 max-w-md mx-auto">
                            That's a lot of vibes. Let's see what stuck.
                        </p>
                    </motion.div>
                </section>

                {/* 2. TOP ARTIST (Hero Card) */}
                {topArtist && (
                    <section className="relative">
                        <div className="aspect-square w-full max-w-[400px] mx-auto relative group">
                            {/* Glow */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-orange-500 blur-[60px] opacity-40 group-hover:opacity-60 transition-opacity" />

                            <div className="relative h-full w-full bg-[#1C1C1E] border border-white/10 rounded-[40px] overflow-hidden shadow-2xl">
                                <img src={topArtist.image} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" alt={topArtist.name} />

                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

                                <div className="absolute bottom-8 left-8 right-8">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Sparkles size={16} className="text-yellow-400 fill-yellow-400" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-white/80">Top Artist</span>
                                    </div>
                                    <h2 className="text-4xl font-black tracking-tight leading-none mb-2">{topArtist.name}</h2>
                                    <p className="text-lg font-medium text-white/60">{topArtist.timeStr} listened</p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* 3. ALGORITHMIC HIGHLIGHTS (Obsession & Anthem) */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* OBSESSION */}
                    {obsession && (
                        <div className="bg-[#1C1C1E]/50 backdrop-blur-md border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-6">
                                    <Zap className="text-red-500" size={20} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">Current Obsession</h3>
                                </div>
                                <div className="flex items-center gap-4">
                                    <img src={obsession.album_cover} className="w-16 h-16 rounded-lg shadow-lg" alt="" />
                                    <div>
                                        <h4 className="font-bold text-lg leading-tight line-clamp-1">{obsession.track_name}</h4>
                                        <p className="text-sm text-white/50">{obsession.artist_name}</p>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Gap Average</p>
                                    <p className="text-2xl font-mono font-bold text-white">
                                        {obsession.avgGapMinutes < 60 ? `${obsession.avgGapMinutes}m` : `${(obsession.avgGapMinutes / 60).toFixed(1)}h`}
                                    </p>
                                    <p className="text-xs text-white/40 mt-1">Shortest time between plays</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HOURLY ANTHEM */}
                    {hourlyAnthem && (
                        <div className="bg-[#1C1C1E]/50 backdrop-blur-md border border-white/10 p-6 rounded-3xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-6">
                                    <Clock className="text-blue-500" size={20} />
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">Your {formatTime(hourlyAnthem.hour)} Anthem</h3>
                                </div>
                                <div className="flex items-center gap-4">
                                    <img src={hourlyAnthem.album_cover} className="w-16 h-16 rounded-lg shadow-lg" alt="" />
                                    <div>
                                        <h4 className="font-bold text-lg leading-tight line-clamp-1">{hourlyAnthem.track_name}</h4>
                                        <p className="text-sm text-white/50">{hourlyAnthem.artist_name}</p>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <p className="text-xs text-white/40 uppercase tracking-widest mb-1">Consistency</p>
                                    <p className="text-2xl font-mono font-bold text-white">
                                        {hourlyAnthem.count}x
                                    </p>
                                    <p className="text-xs text-white/40 mt-1">Played at this time</p>
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* 4. TOP SONGS LIST (Apple Music Style) */}
                <section>
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                        <Disc size={24} /> Top Songs
                    </h3>
                    <div className="bg-[#1C1C1E]/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-sm">
                        {topSongs.slice(0, 5).map((song: any, idx: number) => (
                            <div key={idx} className="flex items-center p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group">
                                <span className="text-2xl font-black text-white/20 w-10 text-center mr-4 group-hover:text-white/40 transition-colors">{idx + 1}</span>
                                <img src={song.cover} className="w-12 h-12 rounded-md bg-black/50" alt="" />
                                <div className="ml-4 flex-1 min-w-0">
                                    <h4 className="font-bold text-white truncate">{song.title}</h4>
                                    <p className="text-sm text-white/50 truncate">{song.artist}</p>
                                </div>
                                <div className="text-right">
                                    <span className="font-mono text-sm font-bold text-white/80">{song.listens} plays</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 5. FOOTER / SHARE */}
                <section className="flex flex-col items-center justify-center pt-10">
                    <button className="flex items-center gap-3 bg-white text-black px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)]">
                        <Share2 size={20} />
                        Share Replay
                    </button>
                    <p className="mt-6 text-sm text-white/30 uppercase tracking-widest font-medium">Muse Analytics Wrapped</p>
                </section>

            </div>
        </motion.div>
    );
};
