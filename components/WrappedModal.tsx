import React, { useEffect, useState } from 'react';
import { X, Share2, Sparkles, Music2, Headphones, Clock, TrendingUp, Mic2, Disc, ChevronRight, ChevronLeft, Play, Sun, Moon, Sunset, Sunrise, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateWrappedStory, generateWrappedVibe } from '../services/geminiService';
import { getWrappedStats, getPeakListeningHour, getRadarArtists } from '../services/dbService';

interface WrappedModalProps {
    isOpen: boolean;
    onClose: () => void;
    period?: string;
    userImage?: string;
    userName?: string;
}

export const WrappedModal: React.FC<WrappedModalProps> = ({ isOpen, onClose, period = "Weekly", userImage, userName }) => {
    const [story, setStory] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [peakHour, setPeakHour] = useState<any>(null);
    const [radarArtists, setRadarArtists] = useState<any[]>([]);
    const [vibeCheck, setVibeCheck] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);

    const mapPeriod = (p: string): 'daily' | 'weekly' | 'monthly' => {
        const lower = p.toLowerCase();
        if (lower.includes('day') || lower.includes('daily')) return 'daily';
        if (lower.includes('month')) return 'monthly';
        return 'weekly';
    };

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setCurrentSlide(0);
            const mappedPeriod = mapPeriod(period);
            
            Promise.all([
                generateWrappedStory(period),
                getWrappedStats(mappedPeriod),
                getPeakListeningHour(mappedPeriod),
                getRadarArtists(mappedPeriod)
            ]).then(([storyData, statsData, peakData, radarData]) => {
                setStory(storyData);
                setStats(statsData);
                setPeakHour(peakData);
                setRadarArtists(radarData);
                
                // Generate vibe check from top tracks
                if (statsData?.topTracks && statsData.topTracks.length > 0) {
                    generateWrappedVibe(statsData.topTracks).then(vibe => {
                        setVibeCheck(vibe);
                    });
                }
                
                setLoading(false);
            }).catch(err => {
                console.error('Wrapped loading error:', err);
                setLoading(false);
            });
        }
    }, [isOpen, period]);

    if (!isOpen) return null;

    const topArtist = stats?.topArtist;
    const topSong = stats?.topSong;
    const topTracks = stats?.topTracks || [];
    const totalMinutes = stats?.totalMinutes || story?.listeningMinutes || 0;
    const totalTracks = stats?.totalTracks || story?.totalTracks || 0;
    const totalHours = Math.round(totalMinutes / 60);
    const topGenre = story?.topGenre || 'Mixed';

    const avatarFallback = (name: string) =>
        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1C1C1E&color=fff`;

    const getProgressWidth = (index: number) => {
        if (index < currentSlide) return "100%";
        if (index === currentSlide) return "100%";
        return "0%";
    };

    const totalSlides = 9;

    const handleNext = () => setCurrentSlide(prev => Math.min(totalSlides - 1, prev + 1));
    const handlePrev = () => setCurrentSlide(prev => Math.max(0, prev - 1));

    const handleTap = (e: React.MouseEvent) => {
        const width = e.currentTarget.clientWidth;
        const x = e.nativeEvent.offsetX;
        if (x < width / 3) {
            handlePrev();
        } else {
            handleNext();
        }
    };

    const getPeakIcon = () => {
        if (!peakHour) return <Sun className="w-16 h-16 text-[#FA2D48]" />;
        const hour = peakHour.hour;
        if (hour >= 6 && hour < 12) return <Sunrise className="w-16 h-16 text-[#FA2D48]" />;
        if (hour >= 12 && hour < 17) return <Sun className="w-16 h-16 text-[#FA2D48]" />;
        if (hour >= 17 && hour < 21) return <Sunset className="w-16 h-16 text-[#FA2D48]" />;
        return <Moon className="w-16 h-16 text-[#FA2D48]" />;
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl">
            <div className="relative w-full max-w-md h-[100dvh] md:h-[90vh] md:rounded-[32px] overflow-hidden bg-[#0A0A0A] shadow-2xl flex flex-col border border-white/5">

                {/* Progress Bars */}
                <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-50">
                    {Array.from({ length: totalSlides }).map((_, i) => (
                        <div key={i} className="h-[3px] flex-1 bg-white/15 rounded-full overflow-hidden">
                            {isOpen && (
                                <motion.div
                                    initial={{ width: "0%" }}
                                    animate={{ width: getProgressWidth(i) }}
                                    transition={{ duration: i === currentSlide ? 6 : 0.3, ease: "linear" }}
                                    className="h-full bg-white rounded-full"
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-10 right-4 z-50 text-white/50 hover:text-white p-2 rounded-full bg-white/10 backdrop-blur-md transition-all hover:bg-white/20"
                >
                    <X size={18} />
                </button>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 border-[3px] border-white/10 border-t-[#FA2D48] rounded-full animate-spin" />
                            <Headphones className="absolute inset-0 m-auto w-8 h-8 text-[#FA2D48] animate-pulse" />
                        </div>
                        <p className="text-white/40 font-semibold text-xs tracking-widest uppercase animate-pulse">Building your wrapped...</p>
                    </div>
                ) : (
                    <>
                        {/* Main Content Area */}
                        <div className="flex-1 relative cursor-pointer overflow-hidden" onClick={handleTap}>
                            <AnimatePresence mode="wait">

                                {/* SLIDE 0: INTRO */}
                                {currentSlide === 0 && (
                                    <motion.div
                                        key="intro"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                                    >
                                        <div className="absolute inset-0 bg-[#0A0A0A]" />
                                        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#FA2D48] rounded-full blur-[100px] opacity-[0.15]" />
                                        
                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="relative z-10 mb-8"
                                        >
                                            {userImage ? (
                                                <div className="w-24 h-24 rounded-full overflow-hidden border-[3px] border-white/20 shadow-[0_0_60px_rgba(250,45,72,0.3)]">
                                                    <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-24 h-24 bg-[#FA2D48] rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(250,45,72,0.4)]">
                                                    <Play size={36} className="fill-white text-white ml-1" />
                                                </div>
                                            )}
                                        </motion.div>
                                        <motion.h1
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.35 }}
                                            className="relative z-10 text-4xl font-black text-white mb-3 tracking-tight"
                                        >
                                            Your {period} <span className="text-[#FA2D48]">Wrapped</span>
                                        </motion.h1>
                                        <motion.p
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                            className="relative z-10 text-lg text-[#8E8E93] font-medium"
                                        >
                                            {userName ? `Hey ${userName}, let's dive in` : "Let's dive into your stats"}
                                        </motion.p>
                                    </motion.div>
                                )}

                                {/* SLIDE 1: TOTAL LISTENING TIME */}
                                {currentSlide === 1 && (
                                    <motion.div
                                        key="time"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                                    >
                                        <div className="absolute inset-0 bg-[#0A0A0A]" />
                                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#FA2D48] rounded-full blur-[120px] opacity-[0.1]" />
                                        
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                            className="relative z-10"
                                        >
                                            <span className="text-sm font-bold text-[#FA2D48] uppercase tracking-widest mb-6 block">Total Listening Time</span>
                                            <div className="flex items-baseline justify-center gap-3 mb-4">
                                                <motion.span
                                                    initial={{ scale: 0.5, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: 0.4, type: "spring" }}
                                                    className="text-[100px] leading-none font-black text-white tracking-tighter"
                                                >
                                                    {totalMinutes}
                                                </motion.span>
                                            </div>
                                            <p className="text-xl text-white/60 font-semibold">minutes listened</p>
                                            <div className="mt-8 flex items-center justify-center gap-6">
                                                <div className="bg-white/5 border border-white/5 px-5 py-3 rounded-2xl">
                                                    <span className="text-2xl font-black text-white block">{totalTracks}</span>
                                                    <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">tracks</span>
                                                </div>
                                                <div className="bg-white/5 border border-white/5 px-5 py-3 rounded-2xl">
                                                    <span className="text-2xl font-black text-white block">{totalHours}</span>
                                                    <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">hours</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* SLIDE 2: TOP ARTIST */}
                                {currentSlide === 2 && (
                                    <motion.div
                                        key="artist"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                                    >
                                        <div className="absolute inset-0 bg-[#0A0A0A]" />
                                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#FA2D48] rounded-full blur-[100px] opacity-[0.12]" />
                                        
                                        <motion.span
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="relative z-10 text-sm font-bold text-[#FA2D48] uppercase tracking-widest mb-6"
                                        >
                                            Your #1 Artist
                                        </motion.span>

                                        {topArtist && (
                                            <>
                                                <motion.div
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: 0.2, type: "spring" }}
                                                    className="relative z-10 mb-6"
                                                >
                                                    <div className="absolute inset-0 bg-white/10 blur-3xl rounded-full animate-pulse" />
                                                    <img
                                                        src={topArtist.image || avatarFallback(topArtist.name)}
                                                        alt={topArtist.name}
                                                        className="w-48 h-48 sm:w-56 sm:h-56 rounded-full object-cover border-[3px] border-white/10 shadow-2xl relative z-10"
                                                    />
                                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-black font-black px-5 py-1.5 rounded-full z-20 whitespace-nowrap shadow-xl text-sm">
                                                        #1 Artist
                                                    </div>
                                                </motion.div>
                                                <motion.h2
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.4 }}
                                                    className="relative z-10 text-3xl sm:text-4xl font-black text-white mb-2"
                                                >
                                                    {topArtist.name}
                                                </motion.h2>
                                                <motion.p
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.5 }}
                                                    className="relative z-10 text-white/50 text-lg"
                                                >
                                                    {topArtist.count} plays
                                                </motion.p>
                                            </>
                                        )}

                                        {!topArtist && (
                                            <div className="relative z-10 text-white/40">
                                                <Mic2 size={64} className="mx-auto mb-4 opacity-30" />
                                                <p>Not enough listening data yet</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* SLIDE 3: TOP SONG */}
                                {currentSlide === 3 && (
                                    <motion.div
                                        key="song"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                                    >
                                        <div className="absolute inset-0 bg-[#0A0A0A]" />
                                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#FA2D48] rounded-full blur-[100px] opacity-[0.12]" />
                                        
                                        <motion.span
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="relative z-10 text-sm font-bold text-[#FA2D48] uppercase tracking-widest mb-6"
                                        >
                                            Your #1 Song
                                        </motion.span>

                                        {topSong && (
                                            <>
                                                <motion.div
                                                    initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                                    transition={{ delay: 0.2, type: "spring" }}
                                                    className="relative z-10 mb-6"
                                                >
                                                    <div className="absolute inset-0 bg-white/10 blur-3xl rounded-2xl animate-pulse" />
                                                    <img
                                                        src={topSong.cover || avatarFallback(topSong.title)}
                                                        alt={topSong.title}
                                                        className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover border-[3px] border-white/10 shadow-2xl relative z-10"
                                                    />
                                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-black font-black px-5 py-1.5 rounded-full z-20 whitespace-nowrap shadow-xl text-sm">
                                                        #1 Song
                                                    </div>
                                                </motion.div>
                                                <motion.h2
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.4 }}
                                                    className="relative z-10 text-2xl sm:text-3xl font-black text-white mb-1"
                                                >
                                                    {topSong.title}
                                                </motion.h2>
                                                <motion.p
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.45 }}
                                                    className="relative z-10 text-white/60 text-base mb-1"
                                                >
                                                    {topSong.artist}
                                                </motion.p>
                                                <motion.p
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.5 }}
                                                    className="relative z-10 text-white/40 text-sm"
                                                >
                                                    {topSong.count} plays
                                                </motion.p>
                                            </>
                                        )}

                                        {!topSong && (
                                            <div className="relative z-10 text-white/40">
                                                <Music2 size={64} className="mx-auto mb-4 opacity-30" />
                                                <p>Not enough listening data yet</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* SLIDE 4: RADAR / NEW DISCOVERIES */}
                                {currentSlide === 4 && (
                                    <motion.div
                                        key="radar"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                                    >
                                        <div className="absolute inset-0 bg-[#0A0A0A]" />
                                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#FA2D48] rounded-full blur-[120px] opacity-[0.08]" />
                                        
                                        <motion.div
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="relative z-10 mb-8"
                                        >
                                            <span className="text-sm font-bold text-[#FA2D48] uppercase tracking-widest mb-4 block">On Your Radar</span>
                                            <h2 className="text-2xl font-black text-white mb-2">New Discoveries</h2>
                                            <p className="text-white/50 text-sm">Artists that entered your rotation</p>
                                        </motion.div>

                                        {radarArtists.length > 0 ? (
                                            <motion.div
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.3 }}
                                                className="relative z-10 grid grid-cols-3 gap-4 w-full max-w-xs"
                                            >
                                                {radarArtists.slice(0, 6).map((artist, idx) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ scale: 0, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        transition={{ delay: 0.4 + idx * 0.1, type: "spring" }}
                                                        className="flex flex-col items-center"
                                                    >
                                                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 mb-2 bg-[#1C1C1E]">
                                                            <img
                                                                src={artist.image || avatarFallback(artist.name)}
                                                                alt={artist.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <p className="text-white text-xs font-semibold truncate w-full text-center">{artist.name}</p>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        ) : (
                                            <div className="relative z-10 text-white/40">
                                                <Sparkles size={64} className="mx-auto mb-4 opacity-30" />
                                                <p>Keep exploring new music!</p>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* SLIDE 5: PEAK LISTENING TIME */}
                                {currentSlide === 5 && (
                                    <motion.div
                                        key="peak"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                                    >
                                        <div className="absolute inset-0 bg-[#0A0A0A]" />
                                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#FA2D48] rounded-full blur-[120px] opacity-[0.1]" />
                                        
                                        <motion.div
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="relative z-10"
                                        >
                                            <span className="text-sm font-bold text-[#FA2D48] uppercase tracking-widest mb-6 block">Peak Listening</span>
                                            
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.2, type: "spring" }}
                                                className="mb-8"
                                            >
                                                {getPeakIcon()}
                                            </motion.div>

                                            <motion.h2
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.4 }}
                                                className="text-4xl font-black text-white mb-3"
                                            >
                                                {peakHour?.label || 'Afternoon'}
                                            </motion.h2>
                                            <motion.p
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.5 }}
                                                className="text-white/50 text-base"
                                            >
                                                You listened most during the {peakHour?.label.toLowerCase() || 'afternoon'}
                                            </motion.p>
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* SLIDE 6: AI VIBE CHECK */}
                                {currentSlide === 6 && (
                                    <motion.div
                                        key="vibe"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                                    >
                                        <div className="absolute inset-0 bg-[#0A0A0A]" />
                                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#FA2D48] rounded-full blur-[120px] opacity-[0.15]" />
                                        
                                        <motion.div
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="relative z-10 mb-6"
                                        >
                                            <Zap className="w-12 h-12 text-[#FA2D48] mx-auto mb-4" />
                                            <span className="text-sm font-bold text-[#FA2D48] uppercase tracking-widest block mb-6">Vibe Check</span>
                                        </motion.div>

                                        {vibeCheck ? (
                                            <>
                                                <motion.h2
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.3 }}
                                                    className="relative z-10 text-3xl sm:text-4xl font-black text-white mb-4 leading-tight"
                                                >
                                                    {vibeCheck.title}
                                                </motion.h2>
                                                <motion.p
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.5 }}
                                                    className="relative z-10 text-white/60 text-base leading-relaxed max-w-sm"
                                                >
                                                    {vibeCheck.description}
                                                </motion.p>
                                            </>
                                        ) : (
                                            <motion.p
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.3 }}
                                                className="relative z-10 text-white/40"
                                            >
                                                Keep vibing to your favorite tracks
                                            </motion.p>
                                        )}
                                    </motion.div>
                                )}

                                {/* SLIDE 7: SUMMARY + TOP TRACKS */}
                                {currentSlide === 7 && (
                                    <motion.div
                                        key="summary"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute inset-0 flex flex-col p-6 pt-14 overflow-y-auto no-scrollbar"
                                    >
                                        <div className="absolute inset-0 bg-[#0A0A0A] -z-10" />
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 bg-[#FA2D48] rounded-full blur-[100px] opacity-[0.08] -z-10" />

                                        <motion.h2
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-2xl font-black text-white mb-2 mt-4"
                                        >
                                            Your {period} <span className="text-[#FA2D48]">Recap</span>
                                        </motion.h2>
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-white/50 text-sm mb-6 leading-relaxed"
                                        >
                                            {story?.storyText || "You explored new horizons this period."}
                                        </motion.p>

                                        {/* Stats Row */}
                                        <motion.div
                                            initial={{ y: 10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="grid grid-cols-3 gap-3 mb-6"
                                        >
                                            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                                                <Clock className="w-4 h-4 text-[#FA2D48] mx-auto mb-1" />
                                                <span className="text-lg font-black text-white block">{totalHours}h</span>
                                                <span className="text-[9px] uppercase tracking-wider text-white/40 font-semibold">Time</span>
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                                                <Disc className="w-4 h-4 text-[#FA2D48] mx-auto mb-1" />
                                                <span className="text-lg font-black text-white block">{totalTracks}</span>
                                                <span className="text-[9px] uppercase tracking-wider text-white/40 font-semibold">Plays</span>
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                                                <TrendingUp className="w-4 h-4 text-[#FA2D48] mx-auto mb-1" />
                                                <span className="text-lg font-black text-white block">{topGenre}</span>
                                                <span className="text-[9px] uppercase tracking-wider text-white/40 font-semibold">Genre</span>
                                            </div>
                                        </motion.div>

                                        {/* Top Tracks List */}
                                        {topTracks.length > 0 && (
                                            <motion.div
                                                initial={{ y: 10, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.4 }}
                                                className="space-y-2 pb-4"
                                            >
                                                <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Top Tracks</h3>
                                                {topTracks.slice(0, 5).map((track: any, idx: number) => (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ x: 20, opacity: 0 }}
                                                        animate={{ x: 0, opacity: 1 }}
                                                        transition={{ delay: 0.5 + idx * 0.08 }}
                                                        className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5"
                                                    >
                                                        <span className="font-black text-white/20 text-sm w-5 text-center flex-shrink-0">{idx + 1}</span>
                                                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#1C1C1E] flex-shrink-0">
                                                            {track.cover ? (
                                                                <img src={track.cover} className="w-full h-full object-cover" alt={track.title} />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Music2 className="w-4 h-4 text-white/20" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-white font-semibold text-[13px] truncate">{track.title}</h4>
                                                            <p className="text-white/40 text-[11px] truncate">{track.artist}</p>
                                                        </div>
                                                        <span className="text-white/30 text-[11px] font-medium flex-shrink-0">{track.plays} plays</span>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        )}
                                    </motion.div>
                                )}

                                {/* SLIDE 8: OUTRO */}
                                {currentSlide === 8 && (
                                    <motion.div
                                        key="outro"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                                    >
                                        <div className="absolute inset-0 bg-[#0A0A0A]" />
                                        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#FA2D48] rounded-full blur-[120px] opacity-[0.12]" />
                                        
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.2, type: "spring" }}
                                            className="relative z-10 mb-8"
                                        >
                                            <Sparkles className="w-20 h-20 text-[#FA2D48]" />
                                        </motion.div>

                                        <motion.h2
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                            className="relative z-10 text-3xl font-black text-white mb-3"
                                        >
                                            Keep Listening
                                        </motion.h2>
                                        <motion.p
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                            className="relative z-10 text-white/60 text-base max-w-xs"
                                        >
                                            Your musical journey continues. See you in the next wrapped!
                                        </motion.p>
                                    </motion.div>
                                )}

                            </AnimatePresence>
                        </div>

                        {/* Footer Navigation */}
                        <div className="p-4 bg-[#0A0A0A] border-t border-white/5 flex gap-3 flex-shrink-0">
                            {currentSlide > 0 && (
                                <button
                                    onClick={handlePrev}
                                    className="px-5 py-3 rounded-2xl bg-white/10 text-white font-semibold text-xs tracking-wider uppercase hover:bg-white/15 transition-all flex items-center gap-1.5 active:scale-95"
                                >
                                    <ChevronLeft size={14} />
                                    Back
                                </button>
                            )}
                            <button
                                onClick={currentSlide === totalSlides - 1 ? onClose : handleNext}
                                className="flex-1 py-3.5 rounded-2xl bg-white text-black font-bold text-xs tracking-wider uppercase hover:bg-gray-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {currentSlide === totalSlides - 1 ? (
                                    <>
                                        <Share2 className="w-3.5 h-3.5" />
                                        Done
                                    </>
                                ) : (
                                    <>
                                        Next
                                        <ChevronRight size={14} />
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
