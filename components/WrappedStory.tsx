import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Music, Rewind, FastForward, Play } from 'lucide-react';

interface WrappedStoryProps {
    data: {
        period: string;
        title: string;
        totalMinutes: number;
        totalTracks: number;
        topArtist?: { name: string; count: number; image: string };
        topSong?: { title: string; count: number; cover: string; artist: string };
        userImage?: string;
        userName?: string;
    };
    onClose: () => void;
}

const Slide = ({ children, isActive }: { children: React.ReactNode, isActive: boolean }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: isActive ? 1 : 0, scale: isActive ? 1 : 1.05 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center h-full w-full"
    >
        {children}
    </motion.div>
);

export const WrappedStory: React.FC<WrappedStoryProps> = ({ data, onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const totalSlides = 4; // Intro, Stats, Top Item, Outro

    // Auto-advance
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentSlide < totalSlides - 1) {
                setCurrentSlide(prev => prev + 1);
            } else {
                // End of story?
            }
        }, 5000); // 5 seconds per slide
        return () => clearTimeout(timer);
    }, [currentSlide]);

    const handleTap = (e: React.MouseEvent) => {
        const width = e.currentTarget.clientWidth;
        const x = e.nativeEvent.offsetX;
        if (x < width / 3) {
            setCurrentSlide(prev => Math.max(0, prev - 1));
        } else {
            setCurrentSlide(prev => Math.min(totalSlides - 1, prev + 1));
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="relative w-full max-w-md h-[100dvh] md:h-[85vh] md:rounded-3xl overflow-hidden bg-[#1C1C1E] shadow-2xl flex flex-col">

                {/* Progress Bars */}
                <div className="absolute top-4 left-4 right-4 flex gap-1.5 z-50">
                    {Array.from({ length: totalSlides }).map((_, i) => (
                        <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: i < currentSlide ? "100%" : i === currentSlide ? "100%" : "0%" }}
                                transition={{ duration: i === currentSlide ? 5 : 0, ease: "linear" }}
                                className="h-full bg-white"
                            />
                        </div>
                    ))}
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-8 right-6 z-50 text-white/50 hover:text-white p-2 rounded-full bg-black/20 backdrop-blur-md"
                >
                    <X size={20} />
                </button>

                {/* Main Content Area */}
                <div className="flex-1 relative cursor-pointer" onClick={handleTap}>
                    <AnimatePresence mode="wait">

                        {/* SLIDE 1: INTRO */}
                        {currentSlide === 0 && (
                            <Slide key="intro" isActive={true}>
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="relative mb-8"
                                >
                                    {data.userImage ? (
                                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-[0_0_60px_rgba(250,45,72,0.3)]">
                                            <img src={data.userImage} alt={data.userName} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-24 h-24 bg-[#FA2D48] rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(250,45,72,0.4)]">
                                            <Play size={40} className="fill-white text-white ml-2" />
                                        </div>
                                    )}
                                </motion.div>
                                <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter">
                                    {data.title}
                                </h1>
                                <p className="text-xl text-[#8E8E93] font-medium">
                                    {data.userName ? `Hey ${data.userName}, ready to see your stats?` : 'Ready to see your stats?'}
                                </p>
                            </Slide>
                        )}

                        {/* SLIDE 2: TOTAL TIME */}
                        {currentSlide === 1 && (
                            <Slide key="stats" isActive={true}>
                                <h2 className="text-sm font-bold text-[#FA2D48] uppercase tracking-widest mb-6 border border-[#FA2D48]/30 px-3 py-1 rounded-full">
                                    Total Vibe Time
                                </h2>
                                <div className="text-[120px] font-black text-white leading-none tracking-tighter mb-4 gradient-text">
                                    {data.totalMinutes}
                                </div>
                                <p className="text-2xl text-white font-bold">Minutes Listened</p>
                                <div className="mt-8 flex gap-4 text-sm text-[#8E8E93] bg-white/5 p-4 rounded-2xl">
                                    <span>Across {data.totalTracks} tracks</span>
                                </div>
                            </Slide>
                        )}

                        {/* SLIDE 3: TOP ARTIST / SONG */}
                        {currentSlide === 2 && (
                            <Slide key="top-item" isActive={true}>
                                {data.topArtist ? (
                                    <>
                                        <div className="relative mb-8">
                                            <div className="absolute inset-0 bg-white blur-3xl opacity-15 animate-pulse rounded-full"></div>
                                            <img
                                                src={data.topArtist.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.topArtist.name)}&background=1C1C1E&color=fff`}
                                                alt={data.topArtist.name}
                                                className="w-52 h-52 sm:w-64 sm:h-64 rounded-full object-cover border-4 border-white/10 shadow-2xl relative z-10"
                                            />
                                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white text-black font-black px-6 py-2 rounded-full z-20 whitespace-nowrap shadow-xl text-sm">
                                                #1 Artist
                                            </div>
                                        </div>
                                        <h2 className="text-3xl sm:text-4xl font-black text-white mb-2">{data.topArtist.name}</h2>
                                        <p className="text-white/60 mb-6">{data.topArtist.count} plays</p>
                                    </>
                                ) : (
                                    <p className="text-white/40">No Top Artist found</p>
                                )}
                            </Slide>
                        )}

                        {/* SLIDE 4: OUTRO */}
                        {currentSlide === 3 && (
                            <Slide key="outro" isActive={true}>
                                <h2 className="text-3xl font-bold text-white mb-8">See you next time!</h2>
                                <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                                    <div className="bg-[#2C2C2E] p-4 rounded-2xl">
                                        <span className="block text-2xl font-bold text-white">{data.totalMinutes}m</span>
                                        <span className="text-xs text-[#8E8E93] uppercase">Time</span>
                                    </div>
                                    <div className="bg-[#2C2C2E] p-4 rounded-2xl">
                                        <span className="block text-2xl font-bold text-white">{data.totalTracks}</span>
                                        <span className="text-xs text-[#8E8E93] uppercase">Tracks</span>
                                    </div>
                                </div>
                                <button className="mt-12 flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-transform">
                                    <Share2 size={20} />
                                    Share
                                </button>
                            </Slide>
                        )}

                    </AnimatePresence>
                </div>

            </div>
        </div>
    );
};
