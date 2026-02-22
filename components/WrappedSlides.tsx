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

// --- Slide 1: Intro (Wave) ---
const IntroSlide = ({ rangeLabel }: { rangeLabel: string }) => {
    return (
        <SlideContainer bgColor="#1C1C1E">
            <div className="flex-1 flex flex-col items-center justify-center text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "backOut" }}
                >
                    <h2 className="text-sm font-bold text-[#FA2D48] tracking-[0.3em] uppercase mb-4">Your Year In Music</h2>
                    <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-2">LOTUS<br/>WRAPPED</h1>
                    <div className="w-24 h-1 bg-white/20 mx-auto rounded-full my-6 overflow-hidden">
                        <motion.div
                            className="h-full bg-[#FA2D48]"
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 1.5, delay: 0.5 }}
                        />
                    </div>
                    <p className="text-white/60 font-medium">{rangeLabel}</p>
                </motion.div>

                {/* Wave Animation */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 overflow-hidden pointer-events-none">
                    <svg className="absolute bottom-0 w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
                        <motion.path
                            fill="rgba(250, 45, 72, 0.2)"
                            d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                            animate={{
                                d: [
                                    "M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                                    "M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,106.7C672,117,768,171,864,197.3C960,224,1056,224,1152,197.3C1248,171,1344,117,1392,90.7L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                                    "M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                                ]
                            }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        />
                    </svg>
                </div>
            </div>
        </SlideContainer>
    );
};

// --- Slide 2: Minutes (Suction) ---
const MinutesSlide = ({ minutes }: { minutes: number }) => {
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

    return (
        <SlideContainer bgColor="#000">
            <div className="flex-1 flex flex-col items-center justify-center relative">
                {/* Suction Particles */}
                {Array.from({ length: 20 }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute rounded-full bg-white/20 blur-sm"
                        style={{
                            width: Math.random() * 10 + 2,
                            height: Math.random() * 10 + 2,
                            left: '50%',
                            top: '50%'
                        }}
                        initial={{ x: (Math.random() - 0.5) * 800, y: (Math.random() - 0.5) * 800, opacity: 0 }}
                        animate={{ x: 0, y: 0, opacity: [0, 1, 0] }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                            ease: "easeIn"
                        }}
                    />
                ))}

                <SlideTitle title="You Spent" />

                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-[12vw] font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-gray-500 leading-none tracking-tighter"
                >
                    {count.toLocaleString()}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="mt-4 text-xl font-bold text-[#FA2D48] uppercase tracking-widest"
                >
                    Minutes Listening
                </motion.div>

                <p className="mt-8 text-white/50 max-w-md text-center text-sm">
                    That's {Math.round(minutes / 60)} hours of your life you'll never get back. (Worth it).
                </p>
            </div>
        </SlideContainer>
    );
};

// --- Slide 3: Top Artist (Carousel) ---
const TopArtistSlide = ({ topArtist, allArtists }: { topArtist: Artist, allArtists: Artist[] }) => {
    const [reveal, setReveal] = useState(false);
    const [spinIndex, setSpinIndex] = useState(0);
    const carouselArtists = useMemo(() => {
        // Create a pool of artists to spin through, ending with topArtist
        const others = allArtists.filter(a => a.id !== topArtist.id).slice(0, 10);
        return [...others, ...others, topArtist];
    }, [topArtist, allArtists]);

    useEffect(() => {
        // Spin animation logic
        let interval: number;
        let counter = 0;
        const maxSpins = 15; // Number of spins before stop

        const spin = () => {
            setSpinIndex(prev => (prev + 1) % carouselArtists.length);
            counter++;

            if (counter < maxSpins) {
                // Speed up then slow down? Or just linear fast then stop.
                // Let's do easing speed.
                const speed = 50 + (counter * 10); // Slower as it goes? No, usually faster then stop.
                // Actually, simple fixed interval is fine for "slot machine" feel.
                interval = window.setTimeout(spin, 80);
            } else {
                // Stop on the last item (which is topArtist)
                setSpinIndex(carouselArtists.length - 1);
                setReveal(true);
            }
        };

        interval = window.setTimeout(spin, 500); // Start delay
        return () => window.clearTimeout(interval);
    }, [carouselArtists]);

    const currentArtist = carouselArtists[spinIndex];

    return (
        <SlideContainer bgImage={reveal ? topArtist.image : undefined}>
            <div className="flex-1 flex flex-col items-center justify-center">
                <SlideTitle title="Top Artist" subtitle="You had one clear favorite" />

                <div className="relative w-64 h-64 md:w-80 md:h-80 mb-8 perspective-1000">
                    <motion.div
                        animate={reveal ? { scale: 1.1, rotateY: 0 } : { scale: 1, rotateY: spinIndex * 10 }} // Subtle shake while spinning
                        className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border-4 border-white/10"
                    >
                        <img
                            src={currentArtist?.image || 'https://ui-avatars.com/api/?name=?'}
                            className="w-full h-full object-cover"
                            alt="Artist"
                        />

                        {!reveal && (
                            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
                        )}
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

// --- Slide 4: Top Songs (Floating Bubbles) ---
const TopSongsSlide = ({ songs }: { songs: Song[] }) => {
    const [phase, setPhase] = useState<'guess' | 'reveal'>('guess');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const topSong = songs[0];

    // Create random positions for bubbles
    const bubbles = useMemo(() => {
        return songs.slice(0, 6).map((song, i) => ({
            ...song,
            x: Math.random() * 60 + 20, // 20-80%
            y: Math.random() * 60 + 20, // 20-80%
            scale: Math.random() * 0.3 + 0.8,
            delay: Math.random() * 2
        }));
    }, [songs]);

    const handleSelect = (id: string) => {
        if (phase === 'reveal') return;
        setSelectedId(id);

        // Wait a beat then reveal
        setTimeout(() => {
            setPhase('reveal');
        }, 800);
    };

    return (
        <SlideContainer bgColor="#FF2D55">
            {phase === 'guess' ? (
                <div className="flex-1 relative">
                    <SlideTitle title="Guess Your #1" subtitle="One song stood above the rest" />

                    {bubbles.map((song) => (
                        <motion.button
                            key={song.id}
                            className="absolute rounded-full overflow-hidden border-4 border-white/20 shadow-xl"
                            style={{
                                left: `${song.x}%`,
                                top: `${song.y}%`,
                                width: '25vw',
                                height: '25vw',
                                maxWidth: 140,
                                maxHeight: 140,
                                marginLeft: '-12.5vw', // Center anchor
                                marginTop: '-12.5vw'
                            }}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{
                                scale: selectedId === song.id ? 1.2 : (selectedId ? 0 : 1),
                                opacity: selectedId === song.id ? 1 : (selectedId ? 0 : 1),
                                y: [0, -20, 0]
                            }}
                            transition={{
                                y: { duration: 4, repeat: Infinity, delay: song.delay, ease: "easeInOut" },
                                default: { duration: 0.5 }
                            }}
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent slide advance
                                handleSelect(song.id);
                            }}
                        >
                            <img src={song.cover} className="w-full h-full object-cover" />
                        </motion.button>
                    ))}
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

// --- Slide 5: Top Album (Kaleidoscope) ---
const TopAlbumSlide = ({ album }: { album: Album }) => {
    // 6 segments for kaleidoscope
    const segments = [0, 60, 120, 180, 240, 300];

    return (
        <SlideContainer bgColor="#5E5CE6">
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                <SlideTitle title="Top Album" subtitle="On heavy rotation" />

                {/* Kaleidoscope Container */}
                <div className="relative w-[80vw] h-[80vw] max-w-[400px] max-h-[400px] my-8">
                    <motion.div
                        className="w-full h-full relative"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                        {segments.map((deg, i) => (
                            <motion.div
                                key={i}
                                className="absolute w-full h-full origin-center overflow-hidden"
                                style={{
                                    rotate: deg,
                                    // Clip path to make a wedge
                                    clipPath: 'polygon(50% 50%, 100% 21.1%, 100% 78.9%)' // Hexagonal wedges roughly
                                }}
                            >
                                <div
                                    className="w-full h-full absolute inset-0"
                                    style={{
                                        backgroundImage: `url(${album.cover})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        transform: `rotate(-${deg}deg)` // Counter-rotate image to create pattern
                                    }}
                                />
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Reveal overlay */}
                    <motion.div
                        className="absolute inset-0 z-10"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 3, duration: 0.8, type: 'spring' }}
                    >
                        <img src={album.cover} className="w-full h-full object-cover rounded-full shadow-2xl border-4 border-white" />
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

// --- Slide 7: Aura (Personality) ---
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
        history.forEach((h: any) => {
            const a = h.artist_name;
            if (a) artistCounts[a] = (artistCounts[a] || 0) + 1;
        });
        const topArtistCount = Math.max(...Object.values(artistCounts));
        const loyalty = Math.round((topArtistCount / totalPlays) * 100);

        // 3. Variety (Unique Artists / Total)
        const uniqueArtists = Object.keys(artistCounts).length;
        const variety = Math.min(100, Math.round((uniqueArtists / totalPlays) * 200)); // Boosted

        // 4. Focus (Avg Session Length - Estimated)
        // Simple proxy: Consecutive plays of same artist
        let consecutive = 0;
        for(let i=1; i<history.length; i++) {
            if (history[i].artist_name === history[i-1].artist_name) consecutive++;
        }
        const focus = Math.round((consecutive / totalPlays) * 100);

        return { mood, loyalty, variety, focus };
    }, [history]);

    // Determine Aura Color based on dominant metric
    const auraColor = useMemo(() => {
        const { mood, loyalty, variety, focus } = metrics;
        if (mood > 30) return '#5E5CE6'; // Indigo (Night)
        if (loyalty > 20) return '#FF2D55'; // Pink (Love)
        if (variety > 40) return '#30D158'; // Green (Discovery)
        if (focus > 30) return '#FF9F0A'; // Orange (Focus)
        return '#0A84FF'; // Blue (Default)
    }, [metrics]);

    const auraName = useMemo(() => {
        const { mood, loyalty, variety, focus } = metrics;
        if (mood > 30) return 'The Night Owl';
        if (loyalty > 20) return 'The Superfan';
        if (variety > 40) return 'The Explorer';
        if (focus > 30) return 'The Zone Runner';
        return 'The Main Character';
    }, [metrics]);

    return (
        <SlideContainer bgColor="#000">
            <div className="flex-1 flex flex-col items-center justify-center relative">
                <SlideTitle title="Your Aura" subtitle="The vibe check" />

                <div className="relative w-64 h-64 flex items-center justify-center mb-8">
                    {/* Pulsing Aura Orb */}
                    <motion.div
                        className="absolute w-full h-full rounded-full blur-[60px] opacity-60 mix-blend-screen"
                        style={{ backgroundColor: auraColor }}
                        animate={{ scale: [1, 1.5, 1], rotate: [0, 90, 0] }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                        className="absolute w-3/4 h-3/4 rounded-full blur-[40px] opacity-80 mix-blend-screen"
                        style={{ backgroundColor: '#fff' }}
                        animate={{ scale: [0.8, 1.2, 0.8] }}
                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 1 }}
                        className="relative z-10 text-center"
                    >
                        <h2 className="text-3xl font-black text-white uppercase tracking-tight shadow-xl">{auraName}</h2>
                    </motion.div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                    {Object.entries(metrics).map(([key, value], i) => (
                        <motion.div
                            key={key}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 2 + i * 0.2 }}
                            className="bg-white/10 p-4 rounded-xl border border-white/10"
                        >
                            <p className="text-xs uppercase text-white/50 font-bold mb-1">{key}</p>
                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-white"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${value}%` }}
                                    transition={{ delay: 2.5 + i * 0.2, duration: 1 }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </SlideContainer>
    );
};

// --- Slide 8: New Artists (Grid) ---
const NewArtistsSlide = ({ history }: { history: any[] }) => {
    // Find "New" artists (first played in last 20% of history?)
    // Or just random selection of artists for visual grid if we lack strict discovery data
    const artists = useMemo(() => {
        if (!history) return [];
        // Extract unique artist/covers
        const map = new Map();
        history.forEach(h => {
            if (h.artist_name && h.album_cover && !map.has(h.artist_name)) {
                map.set(h.artist_name, h.album_cover);
            }
        });
        return Array.from(map.entries()).slice(0, 9).map(([name, img]) => ({ name, img }));
    }, [history]);

    return (
        <SlideContainer bgColor="#30D158">
            <div className="flex-1 flex flex-col items-center justify-center">
                <SlideTitle title="Discovery" subtitle="Fresh noise you found" />

                <div className="grid grid-cols-3 gap-3 w-full max-w-sm aspect-square my-6">
                    {artists.map((a, i) => (
                        <motion.div
                            key={a.name}
                            className="relative rounded-lg overflow-hidden bg-black/20"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1, type: "spring" }}
                        >
                            <img src={a.img} className="w-full h-full object-cover" />
                        </motion.div>
                    ))}
                </div>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5 }}
                    className="text-white text-xl font-bold text-center max-w-xs"
                >
                    You explored {artists.length * 12}+ new artists this year.
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
            case 'MINUTES': return <MinutesSlide minutes={totalMinutes} />;
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
