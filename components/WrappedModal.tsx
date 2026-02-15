import React, { useEffect, useState } from 'react';
import { X, Share2, Sparkles, Music2, Headphones, Clock, Mic2, Disc, ChevronRight, ChevronLeft, Sun, Moon, Sunset, Sunrise, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateWrappedStory, generateWrappedVibe, generateWrappedQuiz, QuizQuestion } from '../services/geminiService';
import { getWrappedStats, getPeakListeningHour, getRadarArtists } from '../services/dbService';
import Aurora from './reactbits/Aurora';
import Particles from './reactbits/Particles';
import GridMotion from './reactbits/GridMotion';
import CountUp from './reactbits/CountUp';
import PixelBlast from './reactbits/PixelBlast';
import PrismaticBurst from './reactbits/PrismaticBurst';
import FaultyTerminal from './reactbits/FaultyTerminal';
import LightRays from './reactbits/LightRays';
import GridScan from './reactbits/GridScan';

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
    const [orbitDuration, setOrbitDuration] = useState(20);
    const [artistRevealed, setArtistRevealed] = useState(false);
    const [albumRevealed, setAlbumRevealed] = useState(false);
    const [spotlightIndex, setSpotlightIndex] = useState(0);

    // Always use weekly data for Punky Wrapped
    const mapPeriod = (_p: string): 'daily' | 'weekly' | 'monthly' => {
        return 'weekly';
    };

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setCurrentSlide(0);
            setQuizAnswer(null);
            setOrbitDuration(20);
            setArtistRevealed(false);
            setAlbumRevealed(false);
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

    // Orbit animation for slide 7 - starts fast then slows down and converges
    useEffect(() => {
        if (currentSlide === 7) {
            setOrbitDuration(1);
            const t1 = setTimeout(() => setOrbitDuration(0.5), 1000);
            const t2 = setTimeout(() => setOrbitDuration(20), 2000);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
    }, [currentSlide]);

    // Artist reveal animation for slide 4
    useEffect(() => {
        if (currentSlide === 4) {
            setArtistRevealed(false);
            setSpotlightIndex(0);
            
            // Cycle through spotlight on each artist (0, 1, 2)
            const timer1 = setTimeout(() => setSpotlightIndex(1), 800);
            const timer2 = setTimeout(() => setSpotlightIndex(2), 1600);
            const timer3 = setTimeout(() => setArtistRevealed(true), 2400);
            
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
            };
        }
    }, [currentSlide]);

    // Album reveal animation for slide 5
    useEffect(() => {
        if (currentSlide === 5) {
            setAlbumRevealed(false);
            const timer = setTimeout(() => setAlbumRevealed(true), 4500);
            return () => clearTimeout(timer);
        }
    }, [currentSlide]);

    if (!isOpen) return null;

    const ORBIT_CONVERGENCE_THRESHOLD = 5;
    const CONVERGED_RADIUS = 30;
    const EXPANDED_RADIUS = 120;

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

    const totalSlides = 10;

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

    const peakSongs = topTracks.slice(0, 3);

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
                    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 z-0">
                            <Aurora />
                        </div>
                        <h1 className="text-6xl font-bold tracking-tight text-white z-10 relative">
                            Punky Wrapped
                        </h1>
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
                                        <div className="animate-[perspective-tilt_8s_ease-in-out_infinite] w-full h-full">
                                            <GridMotion
                                                items={albumCovers.length > 0 ? albumCovers : undefined}
                                                gradientColor="rgba(0,0,0,0.8)"
                                            />
                                        </div>
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
                                                    <Sparkles size={40} className="text-white" />
                                                </div>
                                            )}
                                        </motion.div>
                                        <motion.h1
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.5 }}
                                            className="text-5xl sm:text-6xl font-black text-white mb-4 tracking-tight"
                                        >
                                            Punky <span className="text-[#FA2D48]">Wrapped</span>
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
                                        <PixelBlast
                                            variant="square"
                                            pixelSize={4}
                                            color="#FA2D48"
                                            patternScale={2}
                                            patternDensity={1}
                                            speed={0.5}
                                            edgeFade={0.25}
                                            transparent
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

                            {/* SLIDE 2: TOTAL MINUTES + TOTAL PLAYS (merged) */}
                            {currentSlide === 2 && (
                                <motion.div
                                    key="minutes-plays"
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
                                            className="text-2xl text-white/60 font-semibold mb-8"
                                        >
                                            minutes listened
                                        </motion.p>
                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.8 }}
                                            className="flex items-center gap-4"
                                        >
                                            <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl text-center">
                                                <span className="text-2xl font-black text-white block">{totalTracks.toLocaleString()}</span>
                                                <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">tracks</span>
                                            </div>
                                            <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-2xl text-center">
                                                <span className="text-2xl font-black text-white block">{totalHours}</span>
                                                <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">hours</span>
                                            </div>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}

                            {/* SLIDE 3: DAYS CONVERSION */}
                            {currentSlide === 3 && (
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

                            {/* SLIDE 4: TOP ARTIST with LightRays spotlight reveal */}
                            {currentSlide === 4 && (
                                <motion.div
                                    key="artist"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute inset-0 z-0">
                                        <LightRays
                                            raysOrigin="top-center"
                                            raysColor="#FA2D48"
                                            raysSpeed={1.5}
                                            lightSpread={0.8}
                                            rayLength={2.5}
                                            pulsating={true}
                                            fadeDistance={1.2}
                                            followMouse={false}
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 z-5" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
                                        <motion.span
                                            initial={{ y: -10, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.1 }}
                                            className="text-sm font-bold text-white uppercase tracking-widest mb-8"
                                        >
                                            Your Top Artists
                                        </motion.span>

                                        {topArtist && topTracks.length >= 3 ? (
                                            <>
                                                {/* Three artist images in triangular layout before reveal */}
                                                <AnimatePresence>
                                                    {!artistRevealed && (
                                                        <motion.div
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0, scale: 0.8 }}
                                                            transition={{ duration: 0.4 }}
                                                            className="relative w-full max-w-md h-64 mb-8"
                                                        >
                                                            {/* Get unique artists from top 3 tracks */}
                                                            {(() => {
                                                                const AVERAGE_TRACK_DURATION_MINUTES = 3.5; // Average song length assumption
                                                                const ARTIST_POSITIONS = [
                                                                    { top: '0%', left: '50%', translate: '-50%, 0%' },     // Top center
                                                                    { top: '50%', left: '15%', translate: '0%, -50%' },    // Bottom left
                                                                    { top: '50%', right: '15%', translate: '0%, -50%' }    // Bottom right
                                                                ];
                                                                
                                                                const uniqueArtists: any[] = [];
                                                                const artistNames = new Set();
                                                                
                                                                for (const track of topTracks) {
                                                                    if (!artistNames.has(track.artist) && uniqueArtists.length < 3) {
                                                                        uniqueArtists.push({
                                                                            name: track.artist,
                                                                            image: track.artistImage || track.image,
                                                                            minutes: Math.round(track.playCount * AVERAGE_TRACK_DURATION_MINUTES)
                                                                        });
                                                                        artistNames.add(track.artist);
                                                                    }
                                                                }
                                                                
                                                                return uniqueArtists.map((artist, idx) => {
                                                                    const isSpotlit = spotlightIndex === idx;
                                                                    const pos = ARTIST_POSITIONS[idx];
                                                                    
                                                                    return (
                                                                        <motion.div
                                                                            key={idx}
                                                                            initial={{ opacity: 0, scale: 0.5 }}
                                                                            animate={{ 
                                                                                opacity: 1, 
                                                                                scale: isSpotlit ? 1.1 : 1,
                                                                            }}
                                                                            transition={{ 
                                                                                delay: 0.2 + idx * 0.15,
                                                                                scale: { duration: 0.3 }
                                                                            }}
                                                                            className="absolute"
                                                                            style={{
                                                                                top: pos.top,
                                                                                left: pos.left,
                                                                                right: pos.right,
                                                                                transform: `translate(${pos.translate})`
                                                                            }}
                                                                        >
                                                                            <div className="relative">
                                                                                {/* Spotlight glow effect */}
                                                                                {isSpotlit && (
                                                                                    <motion.div
                                                                                        initial={{ opacity: 0 }}
                                                                                        animate={{ opacity: 1 }}
                                                                                        className="absolute inset-0 bg-white/30 blur-2xl rounded-full scale-150"
                                                                                    />
                                                                                )}
                                                                                
                                                                                <img
                                                                                    src={artist.image || avatarFallback(artist.name)}
                                                                                    alt={artist.name}
                                                                                    className={`w-24 h-24 rounded-full object-cover border-4 shadow-2xl relative z-10 transition-all duration-300 ${
                                                                                        isSpotlit 
                                                                                            ? 'border-white/80 shadow-white/40' 
                                                                                            : 'border-white/20 opacity-60'
                                                                                    }`}
                                                                                />
                                                                                
                                                                                {/* Show name and minutes when spotlit */}
                                                                                <AnimatePresence>
                                                                                    {isSpotlit && (
                                                                                        <motion.div
                                                                                            initial={{ opacity: 0, y: 10 }}
                                                                                            animate={{ opacity: 1, y: 0 }}
                                                                                            exit={{ opacity: 0, y: 10 }}
                                                                                            className="absolute top-full mt-3 left-1/2 -translate-x-1/2 text-center whitespace-nowrap"
                                                                                        >
                                                                                            <p className="text-white font-bold text-base mb-1">{artist.name}</p>
                                                                                            <p className="text-white/60 text-xs">{artist.minutes} min</p>
                                                                                        </motion.div>
                                                                                    )}
                                                                                </AnimatePresence>
                                                                            </div>
                                                                        </motion.div>
                                                                    );
                                                                });
                                                            })()}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                {/* Final reveal - #1 artist enlarged in center */}
                                                <AnimatePresence>
                                                    {artistRevealed && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.5 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            transition={{ type: "spring", stiffness: 150, damping: 15 }}
                                                        >
                                                            <div className="relative mb-6">
                                                                <motion.div
                                                                    initial={{ opacity: 0 }}
                                                                    animate={{ opacity: 1 }}
                                                                    transition={{ duration: 0.5 }}
                                                                    className="absolute inset-0 bg-white/20 blur-3xl rounded-full animate-pulse scale-125"
                                                                />
                                                                <motion.div
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                                                    className="absolute inset-0 z-20 rounded-full pointer-events-none"
                                                                    style={{
                                                                        background: 'radial-gradient(circle at 50% 50%, rgba(250,45,72,0.5) 0%, transparent 70%)',
                                                                        mixBlendMode: 'overlay',
                                                                    }}
                                                                />
                                                                <img
                                                                    src={topArtist.image || avatarFallback(topArtist.name)}
                                                                    alt={topArtist.name}
                                                                    className="w-52 h-52 sm:w-60 sm:h-60 rounded-full object-cover border-4 border-white/20 shadow-2xl relative z-10"
                                                                />
                                                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white text-black font-black px-6 py-2 rounded-full z-20 whitespace-nowrap shadow-xl text-sm">
                                                                    #1 Artist
                                                                </div>
                                                            </div>
                                                            <motion.h2
                                                                initial={{ y: 20, opacity: 0 }}
                                                                animate={{ y: 0, opacity: 1 }}
                                                                transition={{ delay: 0.3 }}
                                                                className="text-4xl sm:text-5xl font-black text-white mb-2"
                                                            >
                                                                {topArtist.name}
                                                            </motion.h2>
                                                            <motion.p
                                                                initial={{ y: 20, opacity: 0 }}
                                                                animate={{ y: 0, opacity: 1 }}
                                                                transition={{ delay: 0.4 }}
                                                                className="text-white/60 text-lg"
                                                            >
                                                                {topArtist.count} plays
                                                            </motion.p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
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

                            {/* SLIDE 5: TOP ALBUM with GridScan + AI typewriter */}
                            {currentSlide === 5 && (
                                <motion.div
                                    key="album"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute inset-0 z-0">
                                        <GridScan
                                            sensitivity={0.55}
                                            lineThickness={1}
                                            linesColor="#392e4e"
                                            scanColor="#FF9FFC"
                                            bloomIntensity={0.6}
                                            chromaticAberration={0.002}
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
                                                {/* AI terminal typewriter effect */}
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    transition={{ delay: 0.3 }}
                                                    className="mb-6 font-mono text-left max-w-xs w-full"
                                                >
                                                    {[
                                                        '> System: Initializing audio analysis...',
                                                        '> AI: Scanning listening patterns...',
                                                        `> AI: I see you listened to ${topAlbum.count} tracks...`,
                                                        '> AI: Cross-referencing album data...',
                                                        `> Result: Top album identified`,
                                                        `> Title: ${topAlbum.title}`,
                                                        `> Artist: ${topAlbum.artist}`,
                                                        `> Total plays: ${topAlbum.count}`
                                                    ].map((line, idx) => (
                                                        <motion.p
                                                            key={idx}
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: 0.5 + idx * 0.45 }}
                                                            className="text-[#FF9FFC] text-sm mb-1"
                                                        >
                                                            {line}
                                                        </motion.p>
                                                    ))}
                                                </motion.div>

                                                {/* Album image reveal */}
                                                <AnimatePresence>
                                                    {albumRevealed && (
                                                        <motion.div
                                                            initial={{ scale: 0.6, opacity: 0, rotate: -5 }}
                                                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                                            transition={{ type: "spring", stiffness: 200 }}
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
                                                    )}
                                                </AnimatePresence>

                                                {albumRevealed && (
                                                    <>
                                                        <motion.h2
                                                            initial={{ y: 20, opacity: 0 }}
                                                            animate={{ y: 0, opacity: 1 }}
                                                            transition={{ delay: 0.2 }}
                                                            className="text-3xl sm:text-4xl font-black text-white mb-1"
                                                        >
                                                            {topAlbum.title}
                                                        </motion.h2>
                                                        <motion.p
                                                            initial={{ y: 20, opacity: 0 }}
                                                            animate={{ y: 0, opacity: 1 }}
                                                            transition={{ delay: 0.3 }}
                                                            className="text-white/60 text-base mb-1"
                                                        >
                                                            {topAlbum.artist}
                                                        </motion.p>
                                                        <motion.p
                                                            initial={{ y: 20, opacity: 0 }}
                                                            animate={{ y: 0, opacity: 1 }}
                                                            transition={{ delay: 0.4 }}
                                                            className="text-white/40 text-sm"
                                                        >
                                                            {topAlbum.count} plays
                                                        </motion.p>
                                                    </>
                                                )}
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

                            {/* SLIDE 6: PEAK LISTENING TIME with PixelBlast */}
                            {currentSlide === 6 && (
                                <motion.div
                                    key="peak"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0 bg-[#0A0A0A]"
                                >
                                    <div className="absolute inset-0 z-0">
                                        <PixelBlast
                                            variant="diamond"
                                            pixelSize={3}
                                            color="#FA2D48"
                                            patternScale={2}
                                            speed={0.3}
                                            edgeFade={0.3}
                                            transparent
                                        />
                                    </div>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
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

                            {/* SLIDE 7: OBSESSION ORBIT with fast-spin-then-converge */}
                            {currentSlide === 7 && (
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

                                            {/* Center - Top Song (grows when items converge) */}
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: orbitDuration > ORBIT_CONVERGENCE_THRESHOLD ? 1.2 : 0.5 }}
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

                                            {/* Orbiting items - converge to center after 2s */}
                                            {topTracks.slice(0, 6).map((track: any, idx: number) => {
                                                const angle = (idx / 6) * Math.PI * 2;
                                                const radius = orbitDuration > ORBIT_CONVERGENCE_THRESHOLD ? CONVERGED_RADIUS : EXPANDED_RADIUS;
                                                return (
                                                    <motion.div
                                                        key={idx}
                                                        className="absolute w-8 h-8"
                                                        style={{
                                                            left: '50%',
                                                            top: '50%',
                                                            transform: 'translate(-50%, -50%)',
                                                        }}
                                                        initial={{ opacity: 0, scale: 0 }}
                                                        animate={{
                                                            opacity: orbitDuration > ORBIT_CONVERGENCE_THRESHOLD ? 0.3 : 1,
                                                            scale: 1,
                                                            x: Math.cos(angle) * radius,
                                                            y: Math.sin(angle) * radius,
                                                            rotate: 360,
                                                        }}
                                                        transition={{
                                                            opacity: { delay: 0.3 + idx * 0.05, duration: 0.5 },
                                                            scale: { delay: 0.3 + idx * 0.05, type: "spring" },
                                                            x: { delay: 0.3 + idx * 0.05, duration: orbitDuration > ORBIT_CONVERGENCE_THRESHOLD ? 1 : 0.3 },
                                                            y: { delay: 0.3 + idx * 0.05, duration: orbitDuration > ORBIT_CONVERGENCE_THRESHOLD ? 1 : 0.3 },
                                                            rotate: {
                                                                duration: orbitDuration,
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

                            {/* SLIDE 8: NEW DISCOVERIES with PixelBlast + shimmer */}
                            {currentSlide === 8 && (
                                <motion.div
                                    key="upcoming"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute inset-0 z-0">
                                        <PixelBlast
                                            variant="circle"
                                            pixelSize={3}
                                            color="#8B5CF6"
                                            patternScale={2}
                                            speed={0.3}
                                            edgeFade={0.3}
                                            transparent
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
                                                        <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/10 mb-2 bg-[#1C1C1E] relative">
                                                            <img
                                                                src={artist.image || avatarFallback(artist.name)}
                                                                alt={artist.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                            {/* Shimmer overlay */}
                                                            <div
                                                                className="absolute inset-0 rounded-full pointer-events-none animate-[shimmer_2s_linear_infinite]"
                                                                style={{
                                                                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
                                                                    backgroundSize: '200% 100%',
                                                                }}
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

                            {/* SLIDE 9: CLOSING with PrismaticBurst + glass-morph */}
                            {currentSlide === 9 && (
                                <motion.div
                                    key="closing"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0"
                                >
                                    <div className="absolute inset-0 z-0">
                                        <PrismaticBurst
                                            animationType="rotate3d"
                                            intensity={1.5}
                                            speed={0.4}
                                            colors={['#FA2D48', '#7C3AED', '#06B6D4']}
                                            mixBlendMode="lighten"
                                        />
                                    </div>
                                    <div className="absolute inset-0 bg-black/40 z-5" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center z-10">
                                        <motion.h2
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            transition={{ delay: 0.2, type: "spring" }}
                                            className="text-4xl sm:text-5xl font-black text-white mb-2"
                                        >
                                            Punky <span className="text-[#FA2D48]">Wrapped</span>
                                        </motion.h2>
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.3 }}
                                            className="text-white/40 text-sm mb-8"
                                        >
                                            Until next time 🎵
                                        </motion.p>

                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                            className="grid grid-cols-2 gap-3 w-full max-w-xs mb-6"
                                        >
                                            <div className="glass-morph p-4 rounded-2xl text-center">
                                                <Clock className="w-5 h-5 text-[#FA2D48] mx-auto mb-2" />
                                                <span className="text-2xl font-black text-white block">{totalHours}h</span>
                                                <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">Listened</span>
                                            </div>
                                            <div className="glass-morph p-4 rounded-2xl text-center">
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
                                                className="flex items-center gap-3 p-3 rounded-2xl glass-morph mb-4 w-full max-w-xs"
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
