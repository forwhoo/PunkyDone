import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Disc, Music, User } from 'lucide-react';
import { Artist, Album, Song } from '../types';
import { ObsessionOrbitSlide } from './ObsessionOrbitSlide';

// --- Configuration ---
const SLIDES = [
  'INTRO',
  'MINUTES',
  'TOP_ARTIST',
  'TOP_SONGS',
  'TOP_ALBUM',
  'OBSESSION',
  'AURA',
  'NEW_ARTISTS',
  'TOP_GENRES',
  'SUMMARY'
];

interface WrappedSlidesProps {
  onClose: () => void;
  totalMinutes: number;
  artists: Artist[];
  albums: Album[];
  songs: Song[];
  albumCovers: string[];
  rangeLabel?: string;
  rangeStart?: string;
  rangeEnd?: string;
  historyRows?: any[];
}

// --- Shared Components ---

const SlideContainer = ({ children, bgImage, bgColor = '#000' }: { children: React.ReactNode, bgImage?: string, bgColor?: string }) => (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-black">
        {/* Dynamic Background */}
        <div className="absolute inset-0 z-0 transition-colors duration-1000" style={{ backgroundColor: bgColor }}>
            {bgImage && (
                <motion.img
                    src={bgImage}
                    className="absolute inset-0 w-full h-full object-cover opacity-30 blur-3xl scale-125"
                    animate={{ scale: [1.2, 1.4, 1.2], rotate: [0, 5, 0] }}
                    transition={{ duration: 20, repeat: Infinity }}
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black" />
        </div>
        <div className="relative z-10 w-full h-full flex flex-col px-6 py-8 md:px-12 md:py-12">
            {children}
        </div>
    </div>
);

const SlideTitle = ({ title, subtitle }: { title: string, subtitle?: string }) => (
    <div className="mb-6">
        {subtitle && <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-2">{subtitle}</h3>}
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight uppercase leading-none">{title}</h1>
    </div>
);

// --- Slide 1: Intro (Brutalist) ---
const IntroSlide = ({ rangeLabel }: { rangeLabel: string }) => {
    return (
        <SlideContainer bgColor="#1C1C1E">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "backOut" }}
                    className="relative z-10"
                >
                    <h2 className="text-sm font-bold text-[#FA2D48] tracking-[0.3em] uppercase mb-4">Your Year In Music</h2>
                    <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-2 leading-none">LOTUS<br/>WRAPPED</h1>
                    <div className="w-24 h-2 bg-white/10 mx-auto mt-8 overflow-hidden">
                        <motion.div
                            className="h-full bg-white"
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
                        />
                    </div>
                    <p className="text-white/60 font-bold mt-4 uppercase tracking-widest text-sm">{rangeLabel}</p>
                </motion.div>

                {/* Noise overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                    }}
                />
            </div>
        </SlideContainer>
    );
};

// --- Slide 2: Minutes (Eat the Albums) ---
const MinutesSlide = ({ minutes, albumCovers }: { minutes: number, albumCovers: string[] }) => {
    // Number counting hook
    const [count, setCount] = useState(0);
    useEffect(() => {
        let start = 0;
        const end = minutes;
        const duration = 2500;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3); // Cubic ease out

            setCount(Math.floor(start + (end - start) * easeOut));

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }, [minutes]);

    // Generate flying albums
    const flyingAlbums = useMemo(() => {
        // Use provided covers or placeholders
        const pool = albumCovers && albumCovers.length > 0 ? albumCovers : Array(10).fill('https://ui-avatars.com/api/?name=?');
        // Generate ~20 flying items
        return Array.from({ length: 20 }).map((_, i) => {
             const cover = pool[i % pool.length];
             // Random start position outside the center
             const angle = Math.random() * Math.PI * 2;
             const dist = 800 + Math.random() * 400; // Far out
             const x = Math.cos(angle) * dist;
             const y = Math.sin(angle) * dist;
             return { id: i, cover, startX: x, startY: y, delay: Math.random() * 2 };
        });
    }, [albumCovers]);

    return (
        <SlideContainer bgColor="#000">
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                <SlideTitle title="You Spent" />

                {/* Flying Albums */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     {flyingAlbums.map((item) => (
                         <motion.div
                             key={item.id}
                             className="absolute w-16 h-16 md:w-24 md:h-24 rounded shadow-2xl"
                             initial={{ x: item.startX, y: item.startY, opacity: 1, scale: 1, rotate: Math.random() * 360 }}
                             animate={{ x: 0, y: 0, opacity: 0, scale: 0.1, rotate: 0 }}
                             transition={{
                                 duration: 1.5,
                                 delay: item.delay,
                                 ease: "easeIn"
                             }}
                         >
                             <img src={item.cover} className="w-full h-full object-cover rounded opacity-80" />
                         </motion.div>
                     ))}
                </div>

                <div className="relative z-10 flex flex-col items-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: [0.8, 1.1, 1], opacity: 1 }}
                        transition={{ duration: 0.5, times: [0, 0.6, 1] }}
                        className="text-[15vw] font-black text-white leading-none tracking-tighter"
                        style={{ textShadow: '0 0 30px rgba(255,255,255,0.3)' }}
                    >
                        {count.toLocaleString()}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1 }}
                        className="mt-4 text-xl font-bold text-[#CCFF00] uppercase tracking-widest bg-white/10 px-6 py-2 rounded-full backdrop-blur-md border border-white/10"
                    >
                        Minutes Listening
                    </motion.div>
                </div>

                <p className="mt-8 text-white/50 max-w-md text-center text-sm relative z-10">
                    That's {Math.round(minutes / 60)} hours. Pure dedication.
                </p>
            </div>
        </SlideContainer>
    );
};

// --- Slide 3: Top Artist (Carousel Ticker) ---
const TopArtistSlide = ({ topArtist, allArtists }: { topArtist: Artist, allArtists: Artist[] }) => {
    const [reveal, setReveal] = useState(false);

    // Create a ticker strip
    // We want a sequence of images that slides horizontally
    const strip = useMemo(() => {
        // Exclude top artist from random shuffle if possible
        const others = allArtists.filter(a => a.id !== topArtist.id);
        const pool = others.length > 0 ? others : [topArtist];
        // Create a long strip: 30 items
        const items = Array.from({ length: 30 }).map((_, i) => pool[i % pool.length]);
        // Add top artist at the very end
        return [...items, topArtist];
    }, [topArtist, allArtists]);

    // Animation control
    const controls = useAnimation();

    useEffect(() => {
        const sequence = async () => {
            // Wait a beat
            await new Promise(r => setTimeout(r, 500));

            // Animate
            // Assuming each item is ~260px (w-[260px]) + gap
            // We'll use percentage or fixed width. Let's use % if responsive, or fixed.
            // Responsive is tricky with framer motion sequence values if we don't know width.
            // Let's use a ref or just estimate for now.
            // Better: Move by %? No, items are fixed width.
            // Let's assume mobile width 260px.
            const itemWidth = window.innerWidth < 768 ? 260 : 320;

            await controls.start({
                x: [0, -((strip.length - 1) * itemWidth)],
                transition: {
                    duration: 4,
                    ease: [0.1, 1, 0.2, 1] // Custom ease: start fast, decelerate to stop
                }
            });

            setReveal(true);
        };
        sequence();
    }, [strip, controls]);

    return (
        <SlideContainer bgImage={reveal ? topArtist.image : undefined}>
            <div className="flex-1 flex flex-col items-center justify-center overflow-hidden w-full">
                <SlideTitle title="Top Artist" subtitle="You had one clear favorite" />

                {/* Carousel Window */}
                <div className="relative w-[260px] h-[260px] md:w-[320px] md:h-[320px] mb-8 overflow-hidden rounded-2xl border-4 border-white/20 shadow-2xl bg-black">
                     {/* The sliding strip */}
                     <motion.div
                        className="flex h-full"
                        animate={controls}
                        initial={{ x: 0 }}
                     >
                        {strip.map((artist, i) => (
                            <div
                                key={i}
                                className="w-[260px] md:w-[320px] h-full flex-shrink-0"
                            >
                                <img
                                    src={artist.image}
                                    className="w-full h-full object-cover"
                                    alt="Artist"
                                />
                            </div>
                        ))}
                     </motion.div>
                </div>

                <AnimatePresence>
                    {reveal && (
                        <motion.div
                            initial={{ opacity: 0, y: 50 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20 }}
                            className="text-center"
                        >
                            <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tight">
                                {topArtist.name}
                            </h1>
                            <div className="flex items-center justify-center gap-6">
                                <div className="flex flex-col">
                                    <span className="text-3xl font-bold text-white">{topArtist.totalListens}</span>
                                    <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Plays</span>
                                </div>
                                <div className="w-px h-10 bg-white/20" />
                                <div className="flex flex-col">
                                    <span className="text-3xl font-bold text-white">{topArtist.timeStr}</span>
                                    <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Time</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </SlideContainer>
    );
};

// --- Slide 4: Top Songs (Grid) ---
const TopSongsSlide = ({ songs }: { songs: Song[] }) => {
    const [phase, setPhase] = useState<'guess' | 'reveal'>('guess');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const topSong = songs[0];

    // Take top 6 songs for grid
    const candidates = useMemo(() => songs.slice(0, 6), [songs]);

    const handleSelect = (id: string) => {
        if (phase === 'reveal') return;
        setSelectedId(id);

        setTimeout(() => {
            setPhase('reveal');
        }, 800);
    };

    return (
        <SlideContainer bgColor="#FF2D55">
            {phase === 'guess' ? (
                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-2xl mx-auto">
                    <SlideTitle title="Guess Your #1" subtitle="One song stood above the rest" />

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full px-4">
                        {candidates.map((song, i) => (
                            <motion.button
                                key={song.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent slide advance
                                    handleSelect(song.id);
                                }}
                                className={`
                                    relative aspect-square rounded-xl overflow-hidden border-4 transition-all duration-300
                                    ${selectedId === song.id ? 'border-white scale-105 shadow-xl z-10' : 'border-transparent hover:border-white/50 hover:scale-105'}
                                    ${selectedId && selectedId !== song.id ? 'opacity-50 grayscale' : 'opacity-100'}
                                `}
                            >
                                <img src={song.cover} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-2">
                                    <p className="text-white text-xs font-bold truncate w-full text-left">{song.title}</p>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-center mb-8"
                    >
                        <div className="w-48 h-48 rounded-lg overflow-hidden shadow-2xl mx-auto mb-6 border-4 border-white/20">
                            <img src={topSong.cover} className="w-full h-full object-cover" />
                        </div>
                        <h1 className="text-3xl font-black text-white uppercase leading-none mb-2">{topSong.title}</h1>
                        <p className="text-white/60 font-bold">{topSong.artist}</p>

                        {selectedId === topSong.id ? (
                            <div className="mt-4 inline-block bg-white text-[#FF2D55] font-black px-4 py-1 rounded-full uppercase tracking-widest text-sm">
                                Correct!
                            </div>
                        ) : (
                            <div className="mt-4 inline-block bg-black/20 text-white font-bold px-4 py-1 rounded-full uppercase tracking-widest text-sm">
                                Nice try! It was this one.
                            </div>
                        )}
                    </motion.div>

                    {/* Stacked List */}
                    <div className="w-full max-w-sm space-y-2">
                        {songs.slice(0, 5).map((song, i) => (
                            <motion.div
                                key={song.id}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: i * 0.1 + 0.5 }}
                                className={`flex items-center gap-4 p-3 rounded-xl ${i === 0 ? 'bg-white text-[#FF2D55]' : 'bg-black/20 text-white'}`}
                            >
                                <span className="font-black text-xl w-6 text-center">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold truncate">{song.title}</p>
                                    <p className={`text-xs truncate ${i === 0 ? 'opacity-80' : 'opacity-50'}`}>{song.artist}</p>
                                </div>
                                <span className="font-bold text-sm">{song.listens || 0}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </SlideContainer>
    );
};

// --- Slide 5: Top Album (Better Kaleidoscope) ---
const TopAlbumSlide = ({ album }: { album: Album }) => {
    // 6 segments
    const segments = [0, 60, 120, 180, 240, 300];

    return (
        <SlideContainer bgColor="#5E5CE6">
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                <SlideTitle title="Top Album" subtitle="On heavy rotation" />

                {/* Kaleidoscope Container */}
                <div className="relative w-[80vw] h-[80vw] max-w-[400px] max-h-[400px] my-8 flex items-center justify-center">
                    <motion.div
                        className="w-full h-full relative"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    >
                        {segments.map((deg, i) => (
                            <div
                                key={i}
                                className="absolute top-0 left-0 w-full h-full origin-center overflow-hidden"
                                style={{
                                    transform: `rotate(${deg}deg)`,
                                    clipPath: 'polygon(50% 50%, 100% 21.13%, 100% 78.86%)'
                                }}
                            >
                                <div
                                    className="w-full h-full absolute inset-0"
                                    style={{
                                        backgroundImage: `url(${album.cover})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        // Counter-rotate to keep image upright relative to wedge, then MIRROR odd ones
                                        transform: `rotate(${-deg}deg) ${i % 2 !== 0 ? 'scaleX(-1)' : ''} scale(1.5)`
                                    }}
                                />
                            </div>
                        ))}
                    </motion.div>

                    {/* Center Overlay */}
                    <div className="absolute w-1/3 h-1/3 rounded-full bg-black/50 backdrop-blur-md border border-white/20 z-10" />

                    {/* Reveal overlay */}
                    <motion.div
                        className="absolute inset-0 z-20 flex items-center justify-center"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 3, duration: 0.8, type: 'spring' }}
                    >
                        <img src={album.cover} className="w-2/3 h-2/3 object-cover rounded-full shadow-2xl border-4 border-white" />
                    </motion.div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 3.2 }}
                    className="text-center z-20"
                >
                    <h1 className="text-3xl font-black text-white mb-1">{album.title}</h1>
                    <p className="text-white/60 font-medium">{album.artist}</p>
                </motion.div>
            </div>
        </SlideContainer>
    );
};

// --- Slide 6: Obsession Orbit ---
// Wrapper for the complex ObsessionOrbitSlide to fit the layout
const ObsessionSlide = ({ artists, history }: { artists: Artist[], history: any[] }) => {
    // We compute the "Day Stats" here to pass down or overlay
    const obsessionArtist = artists[0];

    const stats = useMemo(() => {
        if (!history || !obsessionArtist) return null;

        // Filter plays for this artist
        const plays = history.filter((h: any) => h.artist_name === obsessionArtist.name);
        if (plays.length === 0) return null;

        const dayCounts: Record<string, number> = {};
        plays.forEach((p: any) => {
            const day = new Date(p.played_at).toDateString();
            dayCounts[day] = (dayCounts[day] || 0) + 1;
        });

        const sortedDays = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]);
        const peakDay = sortedDays[0];
        const lowDay = sortedDays[sortedDays.length - 1]; // Lowest non-zero

        return {
            peakDay: peakDay ? { date: peakDay[0], count: peakDay[1] } : null,
            totalPlays: plays.length
        };
    }, [history, obsessionArtist]);

    return (
        <div className="w-full h-full bg-black relative">
            <ObsessionOrbitSlide active={true} artists={artists} history={history} />

            {/* Overlay Stats Card */}
            {stats && stats.peakDay && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 4 }} // Wait for orbit animation
                    className="absolute bottom-24 left-6 right-6 bg-[#1C1C1E] border border-white/10 p-4 rounded-xl z-50 backdrop-blur-md"
                >
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs text-[#8E8E93] uppercase tracking-wider font-bold">Peak Obsession</p>
                            <p className="text-white font-bold text-lg">{new Date(stats.peakDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-[#CCFF00]">{stats.peakDay.count}</p>
                            <p className="text-[10px] text-white/50 uppercase">Plays that day</p>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

// --- Slide 7: Aura (Brutalist Shapes) ---
const AuraSlide = ({ history }: { history: any[] }) => {
    // Calculate 4 metrics
    const metrics = useMemo(() => {
        if (!history || history.length === 0) return { mood: 50, loyalty: 50, variety: 50, focus: 50 };
        const totalPlays = history.length;
        // 1. Mood (Night Owl vs Early Bird)
        const nightPlays = history.filter((h: any) => {
            const hr = new Date(h.played_at).getHours();
            return hr >= 22 || hr < 5;
        }).length;
        const mood = Math.round((nightPlays / totalPlays) * 100);
        // 2. Loyalty (Top Artist Share)
        const artistCounts: Record<string, number> = {};
        history.forEach((h: any) => { const a = h.artist_name; if (a) artistCounts[a] = (artistCounts[a] || 0) + 1; });
        const topArtistCount = Math.max(...Object.values(artistCounts));
        const loyalty = Math.round((topArtistCount / totalPlays) * 100);
        // 3. Variety
        const uniqueArtists = Object.keys(artistCounts).length;
        const variety = Math.min(100, Math.round((uniqueArtists / totalPlays) * 200));
        // 4. Focus
        let consecutive = 0;
        for(let i=1; i<history.length; i++) { if (history[i].artist_name === history[i-1].artist_name) consecutive++; }
        const focus = Math.round((consecutive / totalPlays) * 100);
        return { mood, loyalty, variety, focus };
    }, [history]);

    const { auraColor, auraName, AuraShape } = useMemo(() => {
        const { mood, loyalty, variety, focus } = metrics;
        if (mood > 30) return {
            auraColor: '#5E5CE6', auraName: 'The Night Owl',
            AuraShape: () => <div className="w-48 h-48 bg-[#5E5CE6] rounded-full border-4 border-white animate-pulse" /> // Circle
        };
        if (loyalty > 20) return {
            auraColor: '#FF2D55', auraName: 'The Superfan',
            AuraShape: () => <div className="w-48 h-48 bg-[#FF2D55] rotate-45 border-4 border-white animate-pulse" /> // Diamond/Square
        };
        if (variety > 40) return {
            auraColor: '#30D158', auraName: 'The Explorer',
            AuraShape: () => (
                <div className="w-0 h-0 border-l-[100px] border-l-transparent border-b-[170px] border-b-[#30D158] border-r-[100px] border-r-transparent relative">
                   <div className="absolute top-[10px] -left-[90px] w-0 h-0 border-l-[90px] border-l-transparent border-b-[150px] border-b-transparent border-r-[90px] border-r-transparent border-b-white/20" />
                </div>
            ) // Triangle
        };
        if (focus > 30) return {
            auraColor: '#FF9F0A', auraName: 'The Zone Runner',
            AuraShape: () => <div className="w-64 h-32 bg-[#FF9F0A] border-4 border-white animate-pulse" /> // Rectangle
        };
        return {
            auraColor: '#0A84FF', auraName: 'The Main Character',
            AuraShape: () => <div className="w-48 h-48 bg-[#0A84FF] rounded-3xl border-4 border-white animate-pulse" /> // Squircle
        };
    }, [metrics]);

    return (
        <SlideContainer bgColor="#000">
            <div className="flex-1 flex flex-col items-center justify-center relative">
                <SlideTitle title="Your Aura" subtitle="The vibe check" />

                <div className="relative w-80 h-80 flex items-center justify-center mb-8">
                    {/* Brutalist Shape */}
                    <motion.div
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 15 }}
                    >
                        <AuraShape />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="absolute -bottom-12 left-0 right-0 text-center"
                    >
                        <h2 className="text-4xl font-black text-white uppercase tracking-tight" style={{ textShadow: `0 0 20px ${auraColor}` }}>
                            {auraName}
                        </h2>
                    </motion.div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm mt-8">
                    {Object.entries(metrics).map(([key, value], i) => (
                        <motion.div
                            key={key}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 1 + i * 0.1 }}
                            className="bg-white/5 border border-white/20 p-3"
                        >
                            <p className="text-[10px] uppercase text-white/50 font-bold mb-2 tracking-widest">{key}</p>
                            <div className="h-2 w-full bg-black border border-white/20">
                                <motion.div
                                    className="h-full bg-white"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${value}%` }}
                                    transition={{ delay: 1.5 + i * 0.1, duration: 1 }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </SlideContainer>
    );
};

// --- Slide 8: New Artists (Horizontal Scroll) ---
const NewArtistsSlide = ({ history }: { history: any[] }) => {
    // Find "New" artists
    const artists = useMemo(() => {
        if (!history) return [];
        const map = new Map();
        history.forEach(h => {
            if (h.artist_name && h.album_cover && !map.has(h.artist_name)) {
                map.set(h.artist_name, h.album_cover);
            }
        });
        return Array.from(map.entries()).slice(0, 10).map(([name, img]) => ({ name, img }));
    }, [history]);

    return (
        <SlideContainer bgColor="#30D158">
            <div className="flex-1 flex flex-col justify-center w-full overflow-hidden">
                <div className="px-6 md:px-12">
                    <SlideTitle title="Discovery" subtitle="Fresh noise you found" />
                </div>

                {/* Horizontal Scroll Area */}
                <div className="w-full overflow-x-auto no-scrollbar pb-8 px-6 md:px-12 flex gap-4 snap-x snap-mandatory">
                    {artists.map((a, i) => (
                        <motion.div
                            key={a.name}
                            className="flex-shrink-0 w-48 md:w-64 snap-center"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <div className="aspect-square bg-black border-4 border-black mb-3 overflow-hidden shadow-xl">
                                <img src={a.img} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" />
                            </div>
                            <p className="font-black text-black text-xl leading-none uppercase truncate">{a.name}</p>
                        </motion.div>
                    ))}

                    {artists.length === 0 && (
                        <div className="w-full text-center text-black/50 font-bold">
                            No new discoveries this period.
                        </div>
                    )}
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="px-6 md:px-12 text-black font-bold text-lg mt-4"
                >
                    You explored {artists.length * 12}+ new artists.
                </motion.p>
            </div>
        </SlideContainer>
    );
};

// --- Slide 9: Peak Vibe (Analysis) ---
const AnalysisSlide = ({ history }: { history: any[] }) => {
    // Calculate Peak Time
    const peakHour = useMemo(() => {
        if (!history) return { time: '12 PM', label: 'Day' };
        const hours = new Array(24).fill(0);
        history.forEach(h => hours[new Date(h.played_at).getHours()]++);
        const max = Math.max(...hours);
        const hour = hours.indexOf(max);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const display = `${hour % 12 || 12} ${ampm}`;
        let label = 'Morning';
        if (hour >= 12) label = 'Afternoon';
        if (hour >= 17) label = 'Evening';
        if (hour >= 22 || hour < 5) label = 'Late Night';
        return { time: display, label };
    }, [history]);

    return (
        <SlideContainer bgColor="#FF9F0A">
            <div className="flex-1 flex flex-col items-center justify-center">
                <SlideTitle title="Peak Vibe" subtitle="When you tuned in" />

                <div className="relative w-64 h-64 flex items-center justify-center my-8">
                    {/* Clock Visual */}
                    <motion.div
                        className="absolute inset-0 border-4 border-white/30 rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    >
                        <div className="absolute top-0 left-1/2 -ml-1 w-2 h-4 bg-white" />
                    </motion.div>

                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" }}
                        className="text-center"
                    >
                        <h1 className="text-6xl font-black text-white">{peakHour.time}</h1>
                        <p className="text-xl font-bold text-white/60 uppercase tracking-widest mt-2">{peakHour.label}</p>
                    </motion.div>
                </div>

                <p className="text-white/80 font-medium text-center max-w-xs">
                    Your music hit different at {peakHour.time}.
                </p>
            </div>
        </SlideContainer>
    );
};

// --- Slide 10: Summary (Share Card) ---
const SummarySlide = ({ totalMinutes, topArtist, topSong }: { totalMinutes: number, topArtist: Artist, topSong: Song }) => {
    return (
        <SlideContainer bgColor="#1C1C1E" bgImage={topArtist.image}>
            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl flex flex-col gap-6 text-center transform hover:scale-105 transition-transform duration-500">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <span className="font-bold text-white/50 text-xs uppercase tracking-widest">Lotus Wrapped</span>
                        <span className="font-bold text-white text-xs">2024</span>
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs uppercase text-white/50 font-bold">Top Artist</p>
                        <h2 className="text-3xl font-black text-white leading-none">{topArtist.name}</h2>
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs uppercase text-white/50 font-bold">Top Song</p>
                        <h2 className="text-2xl font-bold text-white leading-none">{topSong.title}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                        <div>
                            <p className="text-xs uppercase text-white/50 font-bold">Minutes</p>
                            <p className="text-2xl font-black text-[#CCFF00]">{totalMinutes.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-white/50 font-bold">Vibe</p>
                            <p className="text-2xl font-black text-[#CCFF00]">Immaculate</p>
                        </div>
                    </div>

                    <div className="pt-4">
                        <img src={topArtist.image} className="w-full h-32 object-cover rounded-xl opacity-80 grayscale mix-blend-luminosity" />
                    </div>
                </div>

                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="mt-8 bg-white text-black font-bold py-3 px-8 rounded-full uppercase tracking-widest shadow-xl"
                >
                    Share
                </motion.button>
            </div>
        </SlideContainer>
    );
};

// --- Main Component ---

export default function WrappedSlides({
    onClose,
    totalMinutes,
    artists,
    albums,
    songs,
    rangeLabel,
    historyRows
}: WrappedSlidesProps) {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const [direction, setDirection] = useState(1);

    const goToNext = () => {
        if (currentSlideIndex < SLIDES.length - 1) {
            setDirection(1);
            setCurrentSlideIndex(prev => prev + 1);
        } else {
            onClose();
        }
    };

    const goToPrev = () => {
        if (currentSlideIndex > 0) {
            setDirection(-1);
            setCurrentSlideIndex(prev => prev - 1);
        }
    };

    // Auto-advance logic could go here, but usually wrapped is manual tap
    // Let's implement tap zones

    const CurrentSlideComponent = useMemo(() => {
        switch (SLIDES[currentSlideIndex]) {
            case 'INTRO': return <IntroSlide rangeLabel={rangeLabel || '2024'} />;
            case 'MINUTES': return <MinutesSlide minutes={totalMinutes} albumCovers={albumCovers} />;
            case 'TOP_ARTIST': return <TopArtistSlide topArtist={artists[0]} allArtists={artists} />;
            case 'TOP_SONGS': return <TopSongsSlide songs={songs} />;
            case 'TOP_ALBUM': return <TopAlbumSlide album={albums[0]} />;
            case 'OBSESSION': return <ObsessionSlide artists={artists} history={historyRows || []} />;
            case 'AURA': return <AuraSlide history={historyRows || []} />;
            case 'NEW_ARTISTS': return <NewArtistsSlide history={historyRows || []} />;
            case 'TOP_GENRES': return <AnalysisSlide history={historyRows || []} />;
            case 'SUMMARY': return <SummarySlide totalMinutes={totalMinutes} topArtist={artists[0]} topSong={songs[0]} />;
            default: return null;
        }
    }, [currentSlideIndex, totalMinutes, artists, albums, songs, rangeLabel, historyRows]);

    return (
        <div className="fixed inset-0 z-[100] bg-black text-white font-sans">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 z-50 flex gap-1 p-2 safe-area-top">
                {SLIDES.map((_, i) => (
                    <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-white"
                            initial={{ width: i < currentSlideIndex ? "100%" : "0%" }}
                            animate={{ width: i < currentSlideIndex ? "100%" : i === currentSlideIndex ? "100%" : "0%" }}
                            transition={{ duration: i === currentSlideIndex ? 10 : 0.3 }} // 10s auto-advance simulation
                        />
                    </div>
                ))}
            </div>

            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-4 z-50 p-2 text-white/50 hover:text-white"
            >
                <X size={24} />
            </button>

            {/* Slide Area */}
            <div className="relative w-full h-full" onClick={(e) => {
                const width = window.innerWidth;
                const x = e.clientX;
                if (x < width / 3) goToPrev();
                else goToNext();
            }}>
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentSlideIndex}
                        custom={direction}
                        initial={{ opacity: 0, x: direction > 0 ? 100 : -100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }} // Subtle scale down exit
                        transition={{ duration: 0.4, ease: "circOut" }}
                        className="w-full h-full"
                    >
                        {CurrentSlideComponent}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
