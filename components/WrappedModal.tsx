import React, { useEffect, useState } from 'react';
import { X, Share2, Sparkles, Music2, Headphones, Clock, Mic2, Disc, ChevronRight, ChevronLeft, Play, Sun, Moon, Sunset, Sunrise, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateWrappedStory, generateWrappedVibe, generateWrappedQuiz, QuizQuestion } from '../services/geminiService';
import { getWrappedStats, getPeakListeningHour, getRadarArtists } from '../services/dbService';
import Aurora from './reactbits/Aurora';
import Particles from './reactbits/Particles';
import GridMotion from './reactbits/GridMotion';
import CountUp from './reactbits/CountUp';

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
    const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
    const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [orbitSpeed, setOrbitSpeed] = useState(20);

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
            setQuizAnswer(null);
            setOrbitSpeed(20);
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
                
                if (statsData?.topTracks && statsData.topTracks.length > 0) {
                    generateWrappedVibe(statsData.topTracks)
                        .then(vibe => setVibeCheck(vibe))
                        .catch(err => console.error('Vibe check error:', err));
                }

                generateWrappedQuiz({
                    topArtist: statsData?.topArtist?.name,
                    topSong: statsData?.topSong?.title,
                    topAlbum: statsData?.topAlbum?.title,
                    totalMinutes: statsData?.totalMinutes,
                    totalTracks: statsData?.totalTracks,
                    peakHour: peakData?.label
                }).then(q => setQuiz(q)).catch(err => console.error('Quiz error:', err));
                
                setLoading(false);
            }).catch(err => {
                console.error('Wrapped loading error:', err);
                setLoading(false);
            });
        }
    }, [isOpen, period]);

    // Orbit speed animation for slide 8
    useEffect(() => {
        if (currentSlide === 8) {
            setOrbitSpeed(2);
            const timer = setTimeout(() => setOrbitSpeed(20), 2000);
            return () => clearTimeout(timer);
        }
    }, [currentSlide]);

    if (!isOpen) return null;

    const topArtist = stats?.topArtist;
    const topSong = stats?.topSong;
    const topAlbum = stats?.topAlbum;
    const topTracks = stats?.topTracks || [];
    const albumCovers = stats?.albumCovers || [];
    const totalMinutes = stats?.totalMinutes || story?.listeningMinutes || 0;
    const totalTracks = stats?.totalTracks || story?.totalTracks || 0;
    const totalHours = Math.round(totalMinutes / 60);
    const totalDays = (totalMinutes / 1440).toFixed(1);

    const avatarFallback = (name: string) =>
        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1C1C1E&color=fff`;

    const totalSlides = 11;

    const handleNext = () => setCurrentSlide(prev => Math.min(totalSlides - 1, prev + 1));
    const handlePrev = () => setCurrentSlide(prev => Math.max(0, prev - 1));

    const handleTap = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('[data-clickable]')) return;
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

    const getPeakTimeLabel = (hour: number) => {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h = hour % 12 || 12;
        return `${h}:00 ${ampm}`;
    };

    const peakSongs = topTracks.filter((_: any, i: number) => i < 3);

    return (
        <div className="fixed inset-0 z-[100] bg-black">
            <div className="relative w-full h-[100dvh] overflow-hidden bg-black flex flex-col">

                {/* Progress Bars */}
                <div className="absolute top-4 left-4 right-4 flex gap-1 z-50">
                    {Array.from({ length: totalSlides }).map((_, i) => (
                        <div key={i} className="h-[3px] flex-1 bg-white/15 rounded-full overflow-hidden">
                            {isOpen && (
                                <motion.div
                                    initial={{ width: "0%" }}
                                    animate={{ width: i < currentSlide ? "100%" : i === currentSlide ? "100%" : "0%" }}
                                    transition={{ duration: i === currentSlide ? 8 : 0.3, ease: "linear" }}
                                    className="h-full bg-white rounded-full"
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-10 right-4 z-50 text-white/50 hover:text-white p-2 rounded-full bg-black/30 backdrop-blur-md transition-all hover:bg-white/20"
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
                    <div className="flex-1 relative cursor-pointer overflow-hidden" onClick={handleTap}>
                        <AnimatePresence mode="wait">

                            {/* SLIDE 0: INTRO with GridMotion album backgrounds */}
                            {currentSlide === 0 && (
                                <motion.div
                                    key="intro"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute inset-0 z-0">
                                        <GridMotion
                                            items={albumCovers.length > 0 ? albumCovers : undefined}
                                            gradientColor="rgba(0,0,0,0.8)"
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80 z-10" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-20">
                                        <motion.div
                                            initial={{ y: 30, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="mb-8"
                                        >
                                            {userImage ? (
                                                <div className="w-28 h-28 rounded-full overflow-hidden border-[3px] border-white/30 shadow-[0_0_80px_rgba(250,45,72,0.4)]">
                                                    <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="w-28 h-28 bg-[#FA2D48] rounded-full flex items-center justify-center shadow-[0_0_80px_rgba(250,45,72,0.5)]">
                                                    <Play size={40} className="fill-white text-white ml-1" />
                                                </div>
                                            )}
                                        </motion.div>
                                        <motion.h1
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                            className="text-5xl sm:text-6xl font-black text-white mb-4 tracking-tight"
                                        >
                                            Your {period} <span className="text-[#FA2D48]">Wrapped</span>
                                        </motion.h1>
                                        <motion.p
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.7 }}
                                            className="text-lg text-white/60 font-medium"
                                        >
                                            {userName ? `${userName}, let's dive into your music journey` : "Let's dive into your music journey"}
                                        </motion.p>
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 1.2 }}
                                            className="mt-12 text-white/30 text-sm animate-bounce"
                                        >
                                            Tap to continue →
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}

                            {/* SLIDE 1: QUIZ */}
                            {currentSlide === 1 && (
                                <motion.div
                                    key="quiz"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute inset-0 z-0">
                                        <Particles
                                            particleCount={100}
                                            particleSpread={8}
                                            speed={0.05}
                                            particleColors={['#FA2D48', '#FF6B81', '#FF9A9E']}
                                            alphaParticles={true}
                                            particleBaseSize={80}
                                            sizeRandomness={0.5}
                                            cameraDistance={25}
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/50 z-5" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 z-10">
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="w-full max-w-sm"
                                        >
                                            <span className="text-sm font-bold text-[#FA2D48] uppercase tracking-widest mb-6 block text-center">Quick Quiz</span>
                                            <h2 className="text-2xl font-black text-white mb-8 text-center leading-tight">
                                                {quiz?.question || "How well do you know your music?"}
                                            </h2>
                                            <div className="space-y-3" data-clickable>
                                                {(quiz?.choices || ['A', 'B', 'C', 'D']).map((choice, idx) => (
                                                    <motion.button
                                                        key={idx}
                                                        initial={{ x: -20, opacity: 0 }}
                                                        animate={{ x: 0, opacity: 1 }}
                                                        transition={{ delay: 0.4 + idx * 0.1 }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (quizAnswer === null) setQuizAnswer(idx);
                                                        }}
                                                        className={`w-full p-4 rounded-2xl text-left font-semibold text-sm transition-all border ${
                                                            quizAnswer === null
                                                                ? 'bg-white/10 border-white/10 text-white hover:bg-white/20 hover:border-white/20'
                                                                : idx === quiz?.correctIndex
                                                                    ? 'bg-green-500/20 border-green-500/50 text-green-300'
                                                                    : quizAnswer === idx
                                                                        ? 'bg-red-500/20 border-red-500/50 text-red-300'
                                                                        : 'bg-white/5 border-white/5 text-white/30'
                                                        }`}
                                                    >
                                                        <span className="flex items-center gap-3">
                                                            <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                                {String.fromCharCode(65 + idx)}
                                                            </span>
                                                            {choice}
                                                            {quizAnswer !== null && idx === quiz?.correctIndex && (
                                                                <CheckCircle className="w-5 h-5 text-green-400 ml-auto flex-shrink-0" />
                                                            )}
                                                            {quizAnswer !== null && quizAnswer === idx && idx !== quiz?.correctIndex && (
                                                                <XCircle className="w-5 h-5 text-red-400 ml-auto flex-shrink-0" />
                                                            )}
                                                        </span>
                                                    </motion.button>
                                                ))}
                                            </div>
                                            {quizAnswer !== null && (
                                                <motion.p
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="text-center mt-6 text-white/50 text-sm"
                                                >
                                                    {quizAnswer === quiz?.correctIndex ? "🎉 Nailed it!" : "😅 Better luck next time!"}
                                                </motion.p>
                                            )}
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}

                            {/* SLIDE 2: TOTAL MINUTES */}
                            {currentSlide === 2 && (
                                <motion.div
                                    key="minutes"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute inset-0 z-0">
                                        <Particles
                                            particleCount={150}
                                            particleSpread={12}
                                            speed={0.08}
                                            particleColors={['#FA2D48', '#FF4757', '#FF6B81']}
                                            alphaParticles={true}
                                            particleBaseSize={60}
                                            sizeRandomness={1}
                                            cameraDistance={20}
                                        />
                                    </div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
                                        <motion.span
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-sm font-bold text-[#FA2D48] uppercase tracking-widest mb-8"
                                        >
                                            Total Listening Time
                                        </motion.span>
                                        <div className="text-[100px] sm:text-[120px] leading-none font-black text-white tracking-tighter mb-4">
                                            <CountUp to={totalMinutes} duration={2.5} separator="," />
                                        </div>
                                        <motion.p
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                            className="text-2xl text-white/60 font-semibold"
                                        >
                                            minutes listened
                                        </motion.p>
                                    </div>
                                </motion.div>
                            )}

                            {/* SLIDE 3: TOTAL PLAYS */}
                            {currentSlide === 3 && (
                                <motion.div
                                    key="plays"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0 bg-[#0A0A0A]"
                                >
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                        <motion.span
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-sm font-bold text-[#FA2D48] uppercase tracking-widest mb-8"
                                        >
                                            Total Plays
                                        </motion.span>
                                        <div className="text-[100px] sm:text-[120px] leading-none font-black text-white tracking-tighter mb-4">
                                            <CountUp to={totalTracks} duration={2} separator="," />
                                        </div>
                                        <motion.p
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                            className="text-2xl text-white/60 font-semibold"
                                        >
                                            tracks played
                                        </motion.p>
                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.8 }}
                                            className="mt-8 flex items-center gap-4"
                                        >
                                            <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl text-center">
                                                <span className="text-2xl font-black text-white block">{totalHours}</span>
                                                <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">hours</span>
                                            </div>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}

                            {/* SLIDE 4: DAYS CONVERSION */}
                            {currentSlide === 4 && (
                                <motion.div
                                    key="days"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute inset-0 z-0">
                                        <Aurora
                                            colorStops={['#FA2D48', '#0A0A0A', '#FA2D48']}
                                            amplitude={1.2}
                                            blend={0.6}
                                            speed={0.5}
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 z-5" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
                                        <motion.span
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.2 }}
                                            className="text-sm font-bold text-white/80 uppercase tracking-widest mb-4"
                                        >
                                            That's roughly
                                        </motion.span>
                                        <motion.div
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                                            className="text-[80px] sm:text-[100px] leading-none font-black text-white tracking-tighter mb-2"
                                        >
                                            {totalDays}
                                        </motion.div>
                                        <motion.p
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.7 }}
                                            className="text-3xl text-white/80 font-bold"
                                        >
                                            days of music
                                        </motion.p>
                                        <motion.p
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 1 }}
                                            className="text-white/40 text-sm mt-6"
                                        >
                                            {totalMinutes.toLocaleString()} min → {totalHours}h → {totalDays} days
                                        </motion.p>
                                    </div>
                                </motion.div>
                            )}

                            {/* SLIDE 5: TOP ARTIST */}
                            {currentSlide === 5 && (
                                <motion.div
                                    key="artist"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute inset-0 z-0">
                                        <Aurora
                                            colorStops={['#FA2D48', '#7C3AED', '#FA2D48']}
                                            amplitude={1.5}
                                            blend={0.7}
                                            speed={0.8}
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/30 z-5" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
                                        <motion.span
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-sm font-bold text-white uppercase tracking-widest mb-6"
                                        >
                                            Your #1 Artist
                                        </motion.span>

                                        {topArtist ? (
                                            <>
                                                <motion.div
                                                    initial={{ scale: 0.6, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                                                    className="relative mb-6"
                                                >
                                                    <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full animate-pulse scale-125" />
                                                    <img
                                                        src={topArtist.image || avatarFallback(topArtist.name)}
                                                        alt={topArtist.name}
                                                        className="w-52 h-52 sm:w-60 sm:h-60 rounded-full object-cover border-4 border-white/20 shadow-2xl relative z-10"
                                                    />
                                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-black font-black px-6 py-2 rounded-full z-20 whitespace-nowrap shadow-xl text-sm">
                                                        #1 Artist
                                                    </div>
                                                </motion.div>
                                                <motion.h2
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.5 }}
                                                    className="text-4xl sm:text-5xl font-black text-white mb-2"
                                                >
                                                    {topArtist.name}
                                                </motion.h2>
                                                <motion.p
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.6 }}
                                                    className="text-white/60 text-lg"
                                                >
                                                    {topArtist.count} plays
                                                </motion.p>
                                            </>
                                        ) : (
                                            <div className="text-white/40">
                                                <Mic2 size={64} className="mx-auto mb-4 opacity-30" />
                                                <p>Not enough listening data yet</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* SLIDE 6: TOP ALBUM */}
                            {currentSlide === 6 && (
                                <motion.div
                                    key="album"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute inset-0 z-0">
                                        <Aurora
                                            colorStops={['#06B6D4', '#8B5CF6', '#06B6D4']}
                                            amplitude={1.2}
                                            blend={0.5}
                                            speed={0.6}
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/30 z-5" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
                                        <motion.span
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-sm font-bold text-white uppercase tracking-widest mb-6"
                                        >
                                            Top Album
                                        </motion.span>

                                        {topAlbum ? (
                                            <>
                                                <motion.div
                                                    initial={{ scale: 0.6, opacity: 0, rotate: -5 }}
                                                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                                                    className="relative mb-6"
                                                >
                                                    <div className="absolute inset-0 bg-white/15 blur-3xl rounded-2xl animate-pulse scale-110" />
                                                    <img
                                                        src={topAlbum.cover || avatarFallback(topAlbum.title)}
                                                        alt={topAlbum.title}
                                                        className="w-52 h-52 sm:w-60 sm:h-60 rounded-2xl object-cover border-4 border-white/20 shadow-2xl relative z-10"
                                                    />
                                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-black font-black px-6 py-2 rounded-full z-20 whitespace-nowrap shadow-xl text-sm">
                                                        #1 Album
                                                    </div>
                                                </motion.div>
                                                <motion.h2
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.5 }}
                                                    className="text-3xl sm:text-4xl font-black text-white mb-1"
                                                >
                                                    {topAlbum.title}
                                                </motion.h2>
                                                <motion.p
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.55 }}
                                                    className="text-white/60 text-base mb-1"
                                                >
                                                    {topAlbum.artist}
                                                </motion.p>
                                                <motion.p
                                                    initial={{ y: 20, opacity: 0 }}
                                                    animate={{ y: 0, opacity: 1 }}
                                                    transition={{ delay: 0.6 }}
                                                    className="text-white/40 text-sm"
                                                >
                                                    {topAlbum.count} plays
                                                </motion.p>
                                            </>
                                        ) : (
                                            <div className="text-white/40">
                                                <Disc size={64} className="mx-auto mb-4 opacity-30" />
                                                <p>Not enough listening data yet</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* SLIDE 7: PEAK LISTENING TIME */}
                            {currentSlide === 7 && (
                                <motion.div
                                    key="peak"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0 bg-[#0A0A0A]"
                                >
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                        <motion.span
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-sm font-bold text-[#FA2D48] uppercase tracking-widest mb-6"
                                        >
                                            Peak Listening
                                        </motion.span>
                                        
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.2, type: "spring" }}
                                            className="mb-6"
                                        >
                                            {getPeakIcon()}
                                        </motion.div>

                                        <motion.h2
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                            className="text-5xl font-black text-white mb-2"
                                        >
                                            {peakHour ? getPeakTimeLabel(peakHour.hour) : 'Afternoon'}
                                        </motion.h2>
                                        <motion.p
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                            className="text-white/50 text-base mb-8"
                                        >
                                            {peakHour?.count || 0} songs at your peak — {peakHour?.label || 'Afternoon'}
                                        </motion.p>

                                        {/* Songs at peak time */}
                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.6 }}
                                            className="w-full max-w-xs space-y-2"
                                        >
                                            <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3">Top Tracks During Peak</p>
                                            {peakSongs.map((track: any, idx: number) => (
                                                <motion.div
                                                    key={idx}
                                                    initial={{ x: -20, opacity: 0 }}
                                                    animate={{ x: 0, opacity: 1 }}
                                                    transition={{ delay: 0.7 + idx * 0.1 }}
                                                    className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/5"
                                                >
                                                    <span className="font-black text-white/20 text-xs w-4 text-center">{idx + 1}</span>
                                                    <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#1C1C1E] flex-shrink-0">
                                                        {track.cover ? (
                                                            <img src={track.cover} className="w-full h-full object-cover" alt={track.title} />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Music2 className="w-3 h-3 text-white/20" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-white font-semibold text-xs truncate">{track.title}</h4>
                                                        <p className="text-white/40 text-[10px] truncate">{track.artist}</p>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}

                            {/* SLIDE 8: OBSESSION ORBIT */}
                            {currentSlide === 8 && (
                                <motion.div
                                    key="orbit"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0 bg-[#0A0A0A]"
                                >
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                                        <motion.span
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-sm font-bold text-[#FA2D48] uppercase tracking-widest mb-4"
                                        >
                                            Obsession Orbit
                                        </motion.span>
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="text-white/40 text-xs mb-8"
                                        >
                                            Your weekly obsession — what you can't stop playing
                                        </motion.p>

                                        {/* Orbit Animation */}
                                        <div className="relative w-72 h-72 sm:w-80 sm:h-80">
                                            {/* Orbit rings */}
                                            <div className="absolute inset-0 rounded-full border border-white/10" />
                                            <div className="absolute inset-6 rounded-full border border-white/5" />
                                            <div className="absolute inset-12 rounded-full border border-white/5" />

                                            {/* Center - Top Song */}
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.5, type: "spring" }}
                                                className="absolute inset-0 flex items-center justify-center"
                                            >
                                                {topSong?.cover ? (
                                                    <img
                                                        src={topSong.cover}
                                                        alt={topSong.title}
                                                        className="w-20 h-20 rounded-full object-cover border-2 border-[#FA2D48] shadow-[0_0_30px_rgba(250,45,72,0.4)]"
                                                    />
                                                ) : (
                                                    <div className="w-20 h-20 rounded-full bg-[#FA2D48] flex items-center justify-center">
                                                        <Music2 className="w-8 h-8 text-white" />
                                                    </div>
                                                )}
                                            </motion.div>

                                            {/* Orbiting items */}
                                            {topTracks.slice(0, 6).map((track: any, idx: number) => {
                                                const angle = (idx / 6) * Math.PI * 2;
                                                const radius = 120;
                                                return (
                                                    <motion.div
                                                        key={idx}
                                                        className="absolute"
                                                        style={{
                                                            left: '50%',
                                                            top: '50%',
                                                            marginLeft: -16,
                                                            marginTop: -16,
                                                        }}
                                                        initial={{ opacity: 0, scale: 0 }}
                                                        animate={{
                                                            opacity: 1,
                                                            scale: 1,
                                                            x: Math.cos(angle) * radius,
                                                            y: Math.sin(angle) * radius,
                                                            rotate: 360,
                                                        }}
                                                        transition={{
                                                            opacity: { delay: 0.8 + idx * 0.1 },
                                                            scale: { delay: 0.8 + idx * 0.1, type: "spring" },
                                                            x: { delay: 0.8 + idx * 0.1 },
                                                            y: { delay: 0.8 + idx * 0.1 },
                                                            rotate: {
                                                                duration: orbitSpeed,
                                                                repeat: Infinity,
                                                                ease: "linear",
                                                            },
                                                        }}
                                                    >
                                                        {track.cover ? (
                                                            <img
                                                                src={track.cover}
                                                                alt={track.title}
                                                                className="w-8 h-8 rounded-full object-cover border border-white/20"
                                                            />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                                                                <Music2 className="w-3 h-3 text-white/40" />
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>

                                        {/* Song and Album labels */}
                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 1.2 }}
                                            className="mt-8 text-center"
                                        >
                                            {topSong && (
                                                <div className="mb-2">
                                                    <p className="text-[10px] text-[#FA2D48] uppercase tracking-widest font-bold">#1 Song</p>
                                                    <p className="text-white font-bold text-lg">{topSong.title}</p>
                                                    <p className="text-white/40 text-sm">{topSong.artist}</p>
                                                </div>
                                            )}
                                            {topAlbum && (
                                                <div className="mt-3">
                                                    <p className="text-[10px] text-[#FA2D48] uppercase tracking-widest font-bold">#1 Album</p>
                                                    <p className="text-white font-semibold text-sm">{topAlbum.title}</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}

                            {/* SLIDE 9: UPCOMING ARTISTS */}
                            {currentSlide === 9 && (
                                <motion.div
                                    key="upcoming"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute inset-0 z-0">
                                        <Particles
                                            particleCount={80}
                                            particleSpread={10}
                                            speed={0.03}
                                            particleColors={['#06B6D4', '#8B5CF6', '#EC4899']}
                                            alphaParticles={true}
                                            particleBaseSize={50}
                                            sizeRandomness={0.8}
                                            cameraDistance={25}
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 z-5" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
                                        <motion.div
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="mb-8"
                                        >
                                            <span className="text-sm font-bold text-[#FA2D48] uppercase tracking-widest mb-4 block">On Your Radar</span>
                                            <h2 className="text-2xl font-black text-white mb-2">New Discoveries</h2>
                                            <p className="text-white/50 text-sm">Artists entering your rotation</p>
                                        </motion.div>

                                        {radarArtists.length > 0 ? (
                                            <motion.div
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.3 }}
                                                className="grid grid-cols-3 gap-4 w-full max-w-xs"
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
                                            <div className="text-white/40">
                                                <Sparkles size={64} className="mx-auto mb-4 opacity-30" />
                                                <p>Keep exploring new music!</p>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* SLIDE 10: CLOSING */}
                            {currentSlide === 10 && (
                                <motion.div
                                    key="closing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute inset-0 z-0">
                                        <Aurora
                                            colorStops={['#FA2D48', '#7C3AED', '#06B6D4']}
                                            amplitude={1.0}
                                            blend={0.8}
                                            speed={0.4}
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 z-5" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
                                        <motion.h2
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.2, type: "spring" }}
                                            className="text-4xl sm:text-5xl font-black text-white mb-8"
                                        >
                                            Until Next Time 🎵
                                        </motion.h2>

                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                            className="grid grid-cols-2 gap-3 w-full max-w-xs mb-8"
                                        >
                                            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 text-center">
                                                <Clock className="w-5 h-5 text-[#FA2D48] mx-auto mb-2" />
                                                <span className="text-2xl font-black text-white block">{totalHours}h</span>
                                                <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Listened</span>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 text-center">
                                                <Disc className="w-5 h-5 text-[#FA2D48] mx-auto mb-2" />
                                                <span className="text-2xl font-black text-white block">{totalTracks}</span>
                                                <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Plays</span>
                                            </div>
                                        </motion.div>

                                        {topArtist && (
                                            <motion.div
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.5 }}
                                                className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 mb-4 w-full max-w-xs"
                                            >
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1C1C1E] flex-shrink-0">
                                                    <img src={topArtist.image || avatarFallback(topArtist.name)} className="w-full h-full object-cover" alt={topArtist.name} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[10px] text-[#FA2D48] font-bold uppercase tracking-widest">#1 Artist</p>
                                                    <h4 className="text-white font-bold text-sm truncate">{topArtist.name}</h4>
                                                </div>
                                            </motion.div>
                                        )}

                                        {vibeCheck && (
                                            <motion.div
                                                initial={{ y: 20, opacity: 0 }}
                                                animate={{ y: 0, opacity: 1 }}
                                                transition={{ delay: 0.6 }}
                                                className="mb-8"
                                            >
                                                <p className="text-[10px] text-[#FA2D48] uppercase tracking-widest font-bold mb-1">Your Vibe</p>
                                                <p className="text-white font-bold text-lg">{vibeCheck.title}</p>
                                                <p className="text-white/40 text-sm max-w-xs">{vibeCheck.description}</p>
                                            </motion.div>
                                        )}

                                        <motion.button
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.8 }}
                                            onClick={(e) => { e.stopPropagation(); onClose(); }}
                                            data-clickable
                                            className="flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-bold text-sm hover:scale-105 transition-transform active:scale-95"
                                        >
                                            <Share2 size={16} />
                                            Done
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}

                        </AnimatePresence>
                    </div>
                )}

                {/* Footer Navigation (only show when not loading and not on closing slide) */}
                {!loading && currentSlide < totalSlides - 1 && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 flex gap-3 z-40 bg-gradient-to-t from-black/80 to-transparent pt-12">
                        {currentSlide > 0 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                                className="px-4 py-3 rounded-2xl bg-white/10 text-white font-semibold text-xs tracking-wider uppercase hover:bg-white/15 transition-all flex items-center gap-1.5 active:scale-95 backdrop-blur-sm"
                            >
                                <ChevronLeft size={14} />
                                Back
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            className="flex-1 py-3.5 rounded-2xl bg-white text-black font-bold text-xs tracking-wider uppercase hover:bg-gray-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            Next
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
