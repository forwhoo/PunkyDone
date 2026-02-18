import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, TrendingUp, Headphones, Music, Disc, Repeat, Flame, Zap, Clock, Sparkles } from 'lucide-react';
import { Artist, Album, Song } from '../types';
import PrismaticBurst from './reactbits/PrismaticBurst';

// ─── Wrapped 2024 Color Tokens ──────────────────────────────────
const W = {
  bloodRed: '#C8102E',
  neonPink: '#FF3EA5',
  canaryYellow: '#FFE030',
  deepBlack: '#000000',
  cream: '#F5F0E8',
};

const TOTAL_SLIDES = 14;
const AUTO_ADVANCE_MS = 6000;
const CURRENT_YEAR = new Date().getFullYear();

// ─── Props ──────────────────────────────────────────────────────
interface WrappedSlidesProps {
  onClose: () => void;
  totalMinutes: number;
  artists: Artist[];
  albums: Album[];
  songs: Song[];
  albumCovers: string[];
  connectionGraph?: { artistInfo: Record<string, any>; pairs: Record<string, Record<string, number>> };
}

// ─── Helpers ────────────────────────────────────────────────────
const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFDMUMxRSIvPjxwYXRoIGQ9Ik0xMzAgNjB2NzBjMCAxMS05IDIwLTIwIDIwcy0yMC05LTIwLTIwIDktMjAgMjAtMjBjNCAwIDcgMSAxMCAzVjcwbC00MCAxMHY2MGMwIDExLTkgMjAtMjAgMjBzLTIwLTktMjAtMjAgOS0yMCAyMC0yMGM0IDAgNyAxIDEwIDNWNjBsNjAtMTV6IiBmaWxsPSIjOEU4RTkzIi8+PC9zdmc+';

// Gradient text helper style
const gradientText = (gradient: string): React.CSSProperties => ({
  background: gradient,
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
});

// Odometer hook: counts from 0 to target with ease-out
function useOdometer(target: number, durationMs = 1500): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs]);
  return value;
}

// ─── Slide Transition Variants (spring) ─────────────────────────
const slideVariants = {
  enter: () => ({ opacity: 0, scale: 1.08 }),
  center: { opacity: 1, scale: 1 },
  exit: () => ({ opacity: 0, scale: 0.94 }),
};

const slideTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  duration: 0.3,
};

// Stagger delay helper
const stagger = (i: number, base = 0.2, step = 0.1) => base + i * step;

// ─── Rotating Year Watermark (global, behind content) ───────────
const YearWatermark: React.FC = () => (
  <motion.div
    className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 select-none overflow-hidden"
    aria-hidden="true"
  >
    <motion.span
      className="font-black"
      style={{ fontSize: 'clamp(200px, 50vw, 500px)', opacity: 0.04, color: '#fff', lineHeight: 1 }}
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 60, ease: 'linear', repeat: Infinity }}
    >
      {CURRENT_YEAR}
    </motion.span>
  </motion.div>
);

// ─── Animated Gradient Background ───────────────────────────────
const AnimatedGradientBg: React.FC<{ colors: string[]; angle?: number }> = ({ colors, angle = 135 }) => (
  <motion.div
    className="absolute inset-0 pointer-events-none z-0"
    style={{
      background: `linear-gradient(${angle}deg, ${colors.join(', ')})`,
      backgroundSize: '400% 400%',
    }}
    animate={{ backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'] }}
    transition={{ duration: 7, ease: 'easeInOut', repeat: Infinity }}
  />
);

// ─── Floating Particles ─────────────────────────────────────────
const FloatingParticles: React.FC<{ count?: number }> = ({ count = 20 }) => {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${(i * 37 + 13) % 100}%`,
      size: 2 + (i % 3),
      delay: (i * 0.4) % 5,
      duration: 4 + (i % 4),
    })), [count]);
  return (
    <div className="absolute inset-0 pointer-events-none z-[1] overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{ left: p.left, width: p.size, height: p.size, bottom: -10, opacity: 0.15 }}
          animate={{ y: [0, -800], opacity: [0.15, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
};

// ─── Progress Bar ───────────────────────────────────────────────
const StoryProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div className="absolute top-2 left-4 right-4 z-50 flex gap-1">
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
        <motion.div
          className="h-full rounded-full bg-white"
          style={{ width: i < current ? '100%' : '0%' }}
          animate={{ width: i < current ? '100%' : i === current ? '100%' : '0%' }}
          transition={{ duration: i === current ? AUTO_ADVANCE_MS / 1000 : 0.3, ease: i === current ? 'linear' : 'easeOut' }}
        />
      </div>
    ))}
  </div>
);

// ─── Close Button ───────────────────────────────────────────────
const CloseButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="absolute top-6 right-6 z-50 p-2 rounded-full transition-colors"
    style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
    aria-label="Close"
  >
    <X size={20} color="#fff" />
  </button>
);

// ═══════════════════════════════════════════════════════════════
// SLIDE 0 — SlideTotalMinutes
// Black bg + diagonal gradient overlay (bloodRed → neonPink → black)
// Oversized minutes number, gradient-filled, bleeds off right edge
// ═══════════════════════════════════════════════════════════════
const SlideTotalMinutes: React.FC<{ totalMinutes: number; albumCovers: string[] }> = ({ totalMinutes }) => {
  const count = useOdometer(totalMinutes, 1800);

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: W.deepBlack }}>
      {/* Diagonal gradient overlay */}
      <AnimatedGradientBg colors={[W.bloodRed, W.neonPink, W.deepBlack]} angle={135} />
      <YearWatermark />
      <FloatingParticles count={24} />

      {/* Oversized number — bleeds off right edge */}
      <div className="absolute inset-0 flex items-center z-[2] overflow-hidden">
        <motion.div
          className="absolute right-[-10%] flex items-center"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.8, type: 'spring', stiffness: 200, damping: 25 }}
        >
          <span
            className="font-black leading-none select-none"
            style={{
              fontSize: 'clamp(120px, 30vw, 280px)',
              fontVariantNumeric: 'tabular-nums',
              ...gradientText(`linear-gradient(135deg, ${W.bloodRed}, ${W.neonPink}, ${W.canaryYellow})`),
            }}
          >
            {count.toLocaleString()}
          </span>
        </motion.div>
      </div>

      {/* Label — bottom left */}
      <motion.div
        className="absolute bottom-[15%] left-8 z-[3]"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <span
          className="uppercase font-bold block"
          style={{ fontSize: 11, letterSpacing: '0.15em', color: W.cream, opacity: 0.8 }}
        >
          MINUTES LISTENED
        </span>
        <span style={{ fontSize: 13, color: W.cream, opacity: 0.5 }}>this week</span>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 1 — SlideTopArtist
// Artist photo fills top 70%, massive gradient name overlaps bottom
// ═══════════════════════════════════════════════════════════════
const SlideTopArtist: React.FC<{ artists: Artist[]; songs?: Song[] }> = ({ artists, songs }) => {
  const main = artists[0];
  if (!main) return <div className="absolute inset-0 bg-black" />;

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: W.deepBlack }}>
      <YearWatermark />

      {/* Blurred duplicate behind everything */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url(${main.image || fallbackImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(40px) brightness(0.15) saturate(1.3)',
          opacity: 0.3,
          transform: 'scale(1.3)',
        }}
      />

      {/* Artist photo — top 70% edge-to-edge */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-[1] overflow-hidden"
        style={{ height: '70%' }}
        initial={{ scale: 1.15, filter: 'blur(8px)' }}
        animate={{ scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <img
          src={main.image || fallbackImage}
          alt={main.name}
          className="w-full h-full object-cover"
          style={{ filter: 'contrast(1.15) saturate(1.3)' }}
        />
        {/* Bottom gradient fade */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ height: '40%', background: `linear-gradient(to top, ${W.deepBlack}, transparent)` }}
        />
      </motion.div>

      {/* Artist name — overlaps photo/black boundary */}
      <motion.div
        className="absolute z-[2] left-8 right-8"
        style={{ top: '55%' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <h2
          className="font-black leading-none"
          style={{
            fontSize: 'clamp(40px, 10vw, 72px)',
            ...gradientText(`linear-gradient(135deg, ${W.canaryYellow}, ${W.neonPink})`),
          }}
        >
          {main.name}
        </h2>
      </motion.div>

      {/* Stats — tiny uppercase */}
      <motion.div
        className="absolute bottom-[12%] left-8 z-[3] flex gap-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <div>
          <span className="block font-bold text-white" style={{ fontSize: 22 }}>
            {main.totalListens.toLocaleString()}
          </span>
          <span className="uppercase" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)' }}>
            plays
          </span>
        </div>
        {(main.genres ?? []).length > 0 && (
          <div>
            <span className="block font-bold text-white" style={{ fontSize: 22 }}>
              {main.genres![0]}
            </span>
            <span className="uppercase" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)' }}>
              genre
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 2 — SlideConnection
// Asymmetric layout, neon pink glow on artist images
// ═══════════════════════════════════════════════════════════════
const SlideConnection: React.FC<{
  artists: Artist[];
  songs: Song[];
  connectionGraph?: { artistInfo: Record<string, any>; pairs: Record<string, Record<string, number>> };
}> = ({ artists, songs, connectionGraph }) => {
  const bestConnection = useMemo(() => {
    const pairs = connectionGraph?.pairs || {};
    const artistNames = new Set(artists.map((a) => a.name));
    let strongest: { a: string; b: string; weight: number } | null = null;
    Object.entries(pairs).forEach(([from, targets]) => {
      Object.entries(targets || {}).forEach(([to, weight]) => {
        if (from >= to) return;
        if (!artistNames.has(from) && !artistNames.has(to)) return;
        if (!strongest || weight > strongest.weight) strongest = { a: from, b: to, weight };
      });
    });
    if (strongest && (strongest as { a: string; b: string }).a !== (strongest as { a: string; b: string }).b) return strongest;
    const fb = artists[0]?.name;
    const fb2 = songs.find((s) => s.artist && s.artist !== fb)?.artist;
    if (fb && fb2) return { a: fb, b: fb2, weight: 1 };
    return null;
  }, [artists, songs, connectionGraph]);

  const artistA = artists.find((a) => a.name === bestConnection?.a) || artists[0];
  const artistB = artists.find((a) => a.name === bestConnection?.b) || artists[1] || artists[0];
  const combinedPlays = (artistA?.totalListens || 0) + (artistB?.totalListens || 0);
  const countUp = useOdometer(combinedPlays, 1500);

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: W.deepBlack }}>
      <AnimatedGradientBg colors={[W.neonPink, W.bloodRed, W.deepBlack]} angle={160} />
      <YearWatermark />

      {/* Artist images with neon pink glow — asymmetric positioning */}
      <div className="absolute z-[2] top-[18%] left-8 flex gap-4">
        {[artistA, artistB].map((artist, idx) => (
          <motion.div
            key={idx}
            className="relative"
            initial={{ opacity: 0, x: idx === 0 ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: stagger(idx, 0.3, 0.15), type: 'spring', stiffness: 200 }}
          >
            <img
              src={artist?.image || fallbackImage}
              alt={artist?.name || ''}
              className="object-cover"
              style={{
                width: 100, height: 100, borderRadius: 16,
                boxShadow: `0 0 30px ${W.neonPink}66, 0 0 60px ${W.neonPink}22`,
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Combined plays — massive gradient number, center-left, slight rotation */}
      <motion.div
        className="absolute z-[3] left-8"
        style={{ top: '45%', transform: 'rotate(-2deg)' }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.6, type: 'spring', stiffness: 180 }}
      >
        <span
          className="font-black leading-none"
          style={{
            fontSize: 'clamp(64px, 18vw, 140px)',
            ...gradientText(`linear-gradient(135deg, ${W.neonPink}, ${W.canaryYellow})`),
          }}
        >
          {countUp.toLocaleString()}
        </span>
      </motion.div>

      {/* Label — bottom right */}
      <motion.div
        className="absolute z-[3] bottom-[14%] right-8 text-right"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <p className="font-bold text-white" style={{ fontSize: 20 }}>
          {artistA?.name} × {artistB?.name}
        </p>
        <span className="uppercase" style={{ fontSize: 11, letterSpacing: '0.15em', color: W.cream, opacity: 0.6 }}>
          COMBINED PLAYS
        </span>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 3 — SlideAlbumRepeat
// Album art fills top 65% edge-to-edge, NO border-radius
// Black bar below with title + red play count
// Neon pink glow bleeding upward
// ═══════════════════════════════════════════════════════════════
const SlideAlbumRepeat: React.FC<{ albums: Album[] }> = ({ albums }) => {
  const album = albums[0];
  const listens = useOdometer(album?.totalListens || 0, 1400);

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: W.deepBlack }}>
      <YearWatermark />

      {/* Album art — top 65% edge-to-edge, no border-radius */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-[1] overflow-hidden"
        style={{ height: '65%' }}
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <img
          src={album?.cover || fallbackImage}
          alt={album?.title ?? 'Album'}
          className="w-full h-full object-cover"
        />
        {/* Neon glow bleeding upward from bottom edge */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: '50%',
            background: `linear-gradient(to top, ${W.deepBlack}, transparent)`,
            boxShadow: `0 -80px 120px ${W.neonPink}44`,
          }}
        />
      </motion.div>

      {/* Black bar below — album info */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-[2] px-8 pb-[15%] pt-8"
        style={{ background: W.deepBlack }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <h3 className="font-bold text-white" style={{ fontSize: 'clamp(24px, 6vw, 36px)', lineHeight: 1.1 }}>
          {album?.title ?? 'No Album'}
        </h3>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
          {album?.artist ?? ''}
        </p>
        <motion.p
          className="uppercase font-bold mt-3"
          style={{ fontSize: 13, letterSpacing: '0.15em', color: W.bloodRed }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {listens.toLocaleString()} PLAYS
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 4 — SlideOrbit (Top Songs)
// Asymmetric layout, wrapped gradient bg, active song large
// Song titles stacked full-width uppercase
// ═══════════════════════════════════════════════════════════════
const SlideOrbit: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const topSongs = songs.slice(0, 5);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % topSongs.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [topSongs.length]);

  const activeSong = topSongs[activeIndex];

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: W.deepBlack }}>
      <AnimatedGradientBg colors={[W.canaryYellow, W.neonPink, W.bloodRed]} angle={150} />
      <YearWatermark />

      {/* Active song cover — large, cinematic entrance */}
      <motion.div
        className="absolute z-[2] top-[12%] right-6"
        style={{ width: '55%', maxWidth: 240, aspectRatio: '1' }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={`cover-${activeIndex}`}
            src={activeSong?.cover || fallbackImage}
            alt={activeSong?.title || ''}
            className="w-full h-full object-cover"
            style={{ borderRadius: 4 }}
            initial={{ scale: 1.15, opacity: 0, filter: 'blur(6px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </AnimatePresence>
      </motion.div>

      {/* Eyebrow label */}
      <motion.span
        className="absolute z-[3] top-[12%] left-8 uppercase font-bold"
        style={{ fontSize: 11, letterSpacing: '0.15em', color: W.deepBlack }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 0.2 }}
      >
        YOUR TOP SONGS
      </motion.span>

      {/* Song titles — stacked full-width uppercase at varying sizes */}
      <motion.div className="absolute z-[3] left-8 right-8 bottom-[12%] flex flex-col gap-1">
        {topSongs.map((song, i) => {
          const isActive = i === activeIndex;
          const sizes = [28, 22, 18, 16, 14];
          return (
            <motion.div
              key={song.title || i}
              className="flex items-baseline gap-2 overflow-hidden"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: isActive ? 1 : 0.4, y: 0 }}
              transition={{ delay: stagger(i, 0.3, 0.08), duration: 0.4 }}
            >
              <span
                className="font-black uppercase truncate"
                style={{
                  fontSize: sizes[i] || 14,
                  color: isActive ? W.deepBlack : 'rgba(0,0,0,0.5)',
                  lineHeight: 1.2,
                }}
              >
                {song.title}
              </span>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 5 — SlideUpcomingArtists
// Trending list with gradient left borders, oversized numbers
// ═══════════════════════════════════════════════════════════════
const SlideUpcomingArtists: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const rising = useMemo(() => {
    const sorted = [...artists].sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0));
    return sorted.slice(0, 5);
  }, [artists]);

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: W.deepBlack }}>
      <AnimatedGradientBg colors={[W.deepBlack, W.bloodRed + '33', W.deepBlack]} angle={180} />
      <YearWatermark />

      <motion.div
        className="absolute z-[2] top-[14%] left-8"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <span className="uppercase font-bold flex items-center gap-2" style={{ fontSize: 11, letterSpacing: '0.15em', color: W.neonPink }}>
          <Flame size={14} /> TRENDING
        </span>
        <h2 className="font-bold text-white mt-1" style={{ fontSize: 28 }}>Rising This Week</h2>
      </motion.div>

      <div className="absolute z-[2] top-[28%] left-8 right-8 flex flex-col gap-3">
        {rising.map((artist, i) => (
          <motion.div
            key={artist.name}
            className="flex items-center gap-4 relative overflow-hidden py-3 px-4"
            style={{
              borderLeft: `3px solid`,
              borderImage: `linear-gradient(to bottom, ${W.neonPink}, ${W.canaryYellow}) 1`,
              backgroundColor: 'rgba(255,255,255,0.03)',
            }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: stagger(i, 0.3, 0.1), type: 'spring', stiffness: 200, damping: 20 }}
          >
            {/* Oversized rank number */}
            <span
              className="font-black select-none"
              style={{ fontSize: 48, color: W.neonPink, opacity: 0.2, lineHeight: 1, minWidth: 40 }}
            >
              {i + 1}
            </span>

            <img
              src={artist.image || fallbackImage}
              alt={artist.name}
              className="w-11 h-11 rounded-full object-cover flex-shrink-0"
            />

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate" style={{ fontSize: 14 }}>{artist.name}</p>
              <p className="truncate" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                {artist.totalListens.toLocaleString()} plays
              </p>
            </div>

            {(artist.trend ?? 0) > 0 && (
              <div className="flex items-center gap-1" style={{ color: W.neonPink }}>
                <TrendingUp size={14} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>+{artist.trend}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 6 — SlideObsession
// Full cinematic: focus-pull entrance, gradient bg, pulsing border
// ═══════════════════════════════════════════════════════════════
const SlideObsession: React.FC<{ songs: Song[]; artists: Artist[] }> = ({ songs, artists }) => {
  const obsession = useMemo(() => {
    const artistSongs: Record<string, Song[]> = {};
    songs.forEach(s => {
      if (!artistSongs[s.artist]) artistSongs[s.artist] = [];
      artistSongs[s.artist].push(s);
    });
    let best: { artist: string; song: Song; isSingleSong: boolean } | null = null;
    Object.entries(artistSongs).forEach(([name, list]) => {
      if (list.length === 1) {
        const song = list[0];
        if (!best || song.listens > best.song.listens) best = { artist: name, song, isSingleSong: true };
      }
    });
    if (!best && songs.length > 0) best = { artist: songs[0].artist, song: songs[0], isSingleSong: false };
    return best;
  }, [songs]);

  const playCount = useOdometer(obsession?.song.listens || 0, 1500);
  if (!obsession) return <div className="absolute inset-0 bg-black" />;

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: W.deepBlack }}>
      <AnimatedGradientBg colors={[W.bloodRed, W.deepBlack, W.deepBlack]} angle={145} />
      <YearWatermark />

      {/* Eyebrow */}
      <motion.span
        className="absolute z-[3] top-[14%] left-8 uppercase font-bold"
        style={{ fontSize: 11, letterSpacing: '0.15em', color: W.neonPink }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        THE OBSESSION
      </motion.span>

      {/* Album cover with focus-pull + pulsing neonPink border */}
      <motion.div
        className="absolute z-[2] left-1/2 top-[30%]"
        style={{ transform: 'translateX(-50%)' }}
        initial={{ scale: 1.15, opacity: 0, filter: 'blur(8px)' }}
        animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ delay: 0.2, duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          className="overflow-hidden"
          style={{ width: 200, height: 200, borderRadius: 8, border: `3px solid ${W.neonPink}` }}
          animate={{
            boxShadow: [
              `0 0 20px ${W.neonPink}00`, `0 0 40px ${W.neonPink}88`, `0 0 20px ${W.neonPink}00`,
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img src={obsession.song.cover || fallbackImage} alt={obsession.song.title} className="w-full h-full object-cover" />
        </motion.div>
      </motion.div>

      {/* Song title + artist */}
      <motion.div
        className="absolute z-[3] left-8 right-8 text-center"
        style={{ top: '62%' }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <p className="font-bold text-white" style={{ fontSize: 24 }}>{obsession.song.title}</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{obsession.artist}</p>
      </motion.div>

      {/* Oversized play count with gradient text */}
      <motion.div
        className="absolute z-[3] left-8 bottom-[14%]"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <span
          className="font-black leading-none"
          style={{
            fontSize: 'clamp(48px, 14vw, 80px)',
            ...gradientText(`linear-gradient(135deg, ${W.neonPink}, ${W.canaryYellow})`),
          }}
        >
          {playCount.toLocaleString()}
        </span>
        <span className="block uppercase" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)' }}>
          plays on repeat
        </span>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 7 — SlideLeapChart
// Full-bleed album art top 65%, black bar with song title
// Animated waveform bars in canaryYellow, glow effect
// ═══════════════════════════════════════════════════════════════
const SlideLeapChart: React.FC<{ artists: Artist[]; songs: Song[] }> = ({ artists, songs }) => {
  const topSong = songs[0];
  const waveformBars = useMemo(() => Array.from({ length: 16 }, (_, i) => ({
    id: i, baseHeight: 8 + Math.sin(i * 0.6) * 6,
  })), []);

  if (!topSong) return <div className="absolute inset-0 bg-black" />;

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: W.deepBlack }}>
      <YearWatermark />

      {/* Full-bleed art top 65% */}
      <motion.div
        className="absolute top-0 left-0 right-0 z-[1] overflow-hidden"
        style={{ height: '65%' }}
        initial={{ scale: 1.05, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <img
          src={topSong.cover || fallbackImage}
          alt={topSong.title}
          className="w-full h-full object-cover"
        />
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: '40%',
            background: `linear-gradient(to top, ${W.deepBlack}, transparent)`,
            boxShadow: `0 -60px 100px ${W.canaryYellow}33`,
          }}
        />
      </motion.div>

      {/* Black bar — song info */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-[2] px-8 pb-[14%] pt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <p className="font-bold text-white" style={{ fontSize: 'clamp(22px, 5vw, 32px)' }}>{topSong.title}</p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{topSong.artist}</p>

        {/* Waveform bars in canaryYellow */}
        <motion.div
          className="flex items-end gap-[3px] mt-4"
          style={{ height: 36 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          {waveformBars.map((bar, i) => (
            <motion.div
              key={bar.id}
              className="rounded-t-sm flex-1"
              style={{ backgroundColor: W.canaryYellow }}
              animate={{ height: [`${bar.baseHeight}px`, `${bar.baseHeight * 2.5}px`, `${bar.baseHeight}px`] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.06 }}
            />
          ))}
        </motion.div>

        <motion.p
          className="font-bold mt-3"
          style={{ fontSize: 28, color: W.canaryYellow }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          {topSong.listens.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>plays</span>
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 8 — SlidePeakHour
// Abstract gradient bg, massive stacked time type, hour bars
// ═══════════════════════════════════════════════════════════════
const SlidePeakHour: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const seed = songs.length;
  const peakHour = ((seed % 12) + 12) % 24;
  const activityData = useMemo(() =>
    Array.from({ length: 24 }, (_, hour) => {
      const distance = Math.min(Math.abs(hour - peakHour), 24 - Math.abs(hour - peakHour));
      const base = 100 - (distance * 8);
      const variance = ((hour * seed) % 20) - 10;
      return { hour, activity: Math.max(10, base + variance) };
    }),
  [seed, peakHour]);
  const maxActivity = Math.max(...activityData.map(d => d.activity));
  const peakData = activityData[peakHour];
  const timeStr = `${peakData.hour % 12 === 0 ? 12 : peakData.hour % 12}`;
  const ampm = peakData.hour >= 12 ? 'PM' : 'AM';

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: W.deepBlack }}>
      {/* Fully abstract gradient bg with all 3 colors */}
      <AnimatedGradientBg colors={[W.bloodRed, W.neonPink, W.canaryYellow, W.deepBlack]} angle={120} />
      <YearWatermark />

      {/* Massive stacked time — anti-design energy */}
      <div className="absolute z-[2] inset-0 flex flex-col items-center justify-center">
        <motion.div
          className="relative"
          initial={{ opacity: 0, rotate: -5 }}
          animate={{ opacity: 1, rotate: -3 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          <span
            className="font-black leading-none block"
            style={{
              fontSize: 'clamp(100px, 28vw, 200px)',
              ...gradientText(`linear-gradient(135deg, ${W.canaryYellow}, ${W.neonPink})`),
            }}
          >
            {timeStr}
          </span>
        </motion.div>
        <motion.span
          className="font-black uppercase"
          style={{ fontSize: 'clamp(40px, 10vw, 72px)', color: W.cream, opacity: 0.7, marginTop: -16 }}
          initial={{ opacity: 0, rotate: 2 }}
          animate={{ opacity: 0.7, rotate: 2 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {ampm}
        </motion.span>
      </div>

      {/* Eyebrow */}
      <motion.div
        className="absolute z-[3] top-[14%] left-8 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Clock size={14} color={W.canaryYellow} />
        <span className="uppercase font-bold" style={{ fontSize: 11, letterSpacing: '0.15em', color: W.canaryYellow }}>
          PEAK HOUR
        </span>
      </motion.div>

      {/* Hour bars — gradient colors */}
      <motion.div
        className="absolute z-[3] bottom-[10%] left-8 right-8 flex items-end gap-[2px]"
        style={{ height: 50 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {activityData.slice(6, 24).map((d, i) => {
          const isPeak = d.hour === peakHour;
          const barColor = isPeak
            ? W.canaryYellow
            : `linear-gradient(to top, ${W.bloodRed}, ${W.neonPink})`;
          return (
            <motion.div
              key={d.hour}
              className="flex-1 rounded-t-sm"
              style={{
                background: barColor,
                minHeight: 4,
                opacity: isPeak ? 1 : 0.35,
              }}
              initial={{ height: 0 }}
              animate={{ height: `${(d.activity / maxActivity) * 100}%` }}
              transition={{ delay: 0.8 + i * 0.025, duration: 0.4, ease: 'easeOut' }}
            />
          );
        })}
      </motion.div>

      {/* Descriptive text */}
      <motion.p
        className="absolute z-[3] bottom-[6%] left-8"
        style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Most listening happens in the {peakData.hour >= 18 || peakData.hour < 6 ? 'evening' : peakData.hour >= 12 ? 'afternoon' : 'morning'}
      </motion.p>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 9 — SlideLongestSession
// Horizontal color bands, oversized gradient duration numbers
// ═══════════════════════════════════════════════════════════════
const SlideLongestSession: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const totalMins = songs.reduce((sum, s) => sum + (parseInt(s.timeStr || '0') || 0), 0);
  const sessionMinutes = Math.max(30, Math.floor(totalMins * 0.18));
  const sessionHours = Math.floor(sessionMinutes / 60);
  const sessionMins = sessionMinutes % 60;
  const hoursCount = useOdometer(sessionHours, 1200);
  const minsCount = useOdometer(sessionMins, 1400);

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: W.deepBlack }}>
      <YearWatermark />

      {/* Horizontal color bands */}
      <div className="absolute inset-0 z-0 flex flex-col">
        <motion.div
          className="flex-1"
          style={{ background: W.bloodRed }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        <motion.div
          className="flex-1"
          style={{ background: W.canaryYellow }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
        />
        <motion.div
          className="flex-[1.5]"
          style={{ background: W.deepBlack }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Eyebrow */}
      <motion.div
        className="absolute z-[3] top-[14%] left-8 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Headphones size={14} color={W.cream} />
        <span className="uppercase font-bold" style={{ fontSize: 11, letterSpacing: '0.15em', color: W.cream }}>
          MARATHON SESSION
        </span>
      </motion.div>

      {/* Duration — oversized gradient text */}
      <motion.div
        className="absolute z-[3] inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.6, type: 'spring', stiffness: 180 }}
      >
        <div className="flex items-baseline gap-3">
          <span
            className="font-black leading-none"
            style={{
              fontSize: 'clamp(72px, 22vw, 160px)',
              ...gradientText(`linear-gradient(135deg, ${W.deepBlack}, ${W.bloodRed})`),
            }}
          >
            {hoursCount}
          </span>
          <span className="font-bold" style={{ fontSize: 24, color: W.deepBlack, opacity: 0.6 }}>h</span>
          <span
            className="font-black leading-none"
            style={{
              fontSize: 'clamp(72px, 22vw, 160px)',
              ...gradientText(`linear-gradient(135deg, ${W.deepBlack}, ${W.bloodRed})`),
            }}
          >
            {minsCount.toString().padStart(2, '0')}
          </span>
          <span className="font-bold" style={{ fontSize: 24, color: W.deepBlack, opacity: 0.6 }}>m</span>
        </div>
      </motion.div>

      {/* Bottom label */}
      <motion.p
        className="absolute z-[3] bottom-[14%] left-8 right-8 text-center"
        style={{ fontSize: 13, color: W.cream, opacity: 0.6 }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 0.6, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        Longest continuous listening session this week
      </motion.p>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 10 — SlideDiscoveryRate
// Oversized gradient number centered, bold color blocks
// Stats scattered asymmetrically
// ═══════════════════════════════════════════════════════════════
const SlideDiscoveryRate: React.FC<{ artists: Artist[]; albums: Album[] }> = ({ artists, albums }) => {
  const uniqueArtists = artists.length;
  const uniqueAlbums = albums.length;
  const totalDiscoveries = uniqueArtists + uniqueAlbums;
  const discoverCount = useOdometer(totalDiscoveries, 1500);

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: W.deepBlack }}>
      <AnimatedGradientBg colors={[W.deepBlack, W.canaryYellow + '22', W.deepBlack]} angle={90} />
      <YearWatermark />

      {/* Bold color block accent */}
      <motion.div
        className="absolute z-[1] top-0 right-0"
        style={{ width: '35%', height: '25%', background: W.canaryYellow }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />

      {/* Eyebrow */}
      <motion.div
        className="absolute z-[3] top-[14%] left-8 flex items-center gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Sparkles size={14} color={W.canaryYellow} />
        <span className="uppercase font-bold" style={{ fontSize: 11, letterSpacing: '0.15em', color: W.canaryYellow }}>
          MUSIC EXPLORER
        </span>
      </motion.div>

      {/* Oversized gradient number — centered */}
      <motion.div
        className="absolute z-[3] inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6, type: 'spring', stiffness: 200 }}
      >
        <span
          className="font-black leading-none"
          style={{
            fontSize: 'clamp(100px, 30vw, 220px)',
            ...gradientText(`linear-gradient(135deg, ${W.canaryYellow}, ${W.neonPink})`),
          }}
        >
          {discoverCount}
        </span>
      </motion.div>

      {/* Stats scattered asymmetrically */}
      <motion.div
        className="absolute z-[3] bottom-[22%] left-8"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <span className="block font-bold text-white" style={{ fontSize: 28 }}>{uniqueArtists}</span>
        <span className="uppercase" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>
          ARTISTS
        </span>
      </motion.div>

      <motion.div
        className="absolute z-[3] bottom-[14%] right-8 text-right"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <span className="block font-bold text-white" style={{ fontSize: 28 }}>{uniqueAlbums}</span>
        <span className="uppercase" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>
          ALBUMS
        </span>
      </motion.div>

      <motion.span
        className="absolute z-[3] bottom-[8%] left-8"
        style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        unique discoveries this week
      </motion.span>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 11 — SlideListeningStreak
// Full gradient bg, oversized streak number, bold day blocks
// ═══════════════════════════════════════════════════════════════
const SlideListeningStreak: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const streakDays = Math.min(7, Math.max(1, Math.ceil(songs.length / 15)));
  const daysOfWeek = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <motion.div className="absolute inset-0 overflow-hidden">
      {/* Full gradient bg */}
      <AnimatedGradientBg colors={[W.neonPink, W.canaryYellow, W.neonPink]} angle={135} />
      <YearWatermark />

      {/* Oversized streak number — fills screen */}
      <motion.div
        className="absolute z-[2] inset-0 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.7, type: 'spring', stiffness: 150 }}
      >
        <span
          className="font-black leading-none select-none"
          style={{
            fontSize: 'clamp(160px, 45vw, 340px)',
            color: W.deepBlack,
            opacity: 0.15,
          }}
        >
          {streakDays}
        </span>
      </motion.div>

      {/* Foreground content */}
      <div className="absolute z-[3] inset-0 flex flex-col items-center justify-center">
        <motion.div
          className="flex items-center gap-2 mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Flame size={16} color={W.deepBlack} />
          <span className="uppercase font-bold" style={{ fontSize: 11, letterSpacing: '0.15em', color: W.deepBlack }}>
            ON FIRE
          </span>
        </motion.div>

        <motion.span
          className="font-black"
          style={{ fontSize: 'clamp(72px, 20vw, 120px)', color: W.deepBlack, lineHeight: 1 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {streakDays}
        </motion.span>
        <motion.span
          className="font-bold uppercase"
          style={{ fontSize: 20, letterSpacing: '0.2em', color: W.deepBlack, opacity: 0.7 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.5 }}
        >
          DAY STREAK
        </motion.span>

        {/* Day indicator blocks */}
        <motion.div
          className="flex gap-3 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {daysOfWeek.map((day, i) => (
            <motion.div
              key={`${day}-${i}`}
              className="flex flex-col items-center gap-1"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stagger(i, 0.7, 0.06) }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 36, height: 36, borderRadius: 8,
                  backgroundColor: i < streakDays ? W.deepBlack : 'rgba(0,0,0,0.15)',
                }}
              >
                {i < streakDays && <Headphones size={16} color={W.canaryYellow} />}
              </div>
              <span style={{ fontSize: 10, fontWeight: i < streakDays ? 700 : 400, color: W.deepBlack, opacity: i < streakDays ? 1 : 0.4 }}>
                {day}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 12 — SlideListeningStats
// Compressed summary with editorial layout, color-block sections
// Stats in oversized type
// ═══════════════════════════════════════════════════════════════
const SlideListeningStats: React.FC<{ totalMinutes: number; artists: Artist[]; songs: Song[]; albums: Album[] }> = ({ totalMinutes, artists, songs, albums }) => {
  const totalPlays = songs.reduce((sum, s) => sum + s.listens, 0);
  const avgPerSong = songs.length > 0 ? Math.round(totalPlays / songs.length) : 0;
  const topGenres = useMemo(() => {
    const genreSet = new Set<string>();
    artists.forEach(a => (a.genres ?? []).forEach(g => genreSet.add(g)));
    return genreSet.size;
  }, [artists]);

  const minutesCount = useOdometer(totalMinutes, 1200);
  const playsCount = useOdometer(totalPlays, 1400);

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: W.deepBlack }}>
      <YearWatermark />

      {/* Color block accent strip */}
      <motion.div
        className="absolute z-[1] top-0 left-0 right-0 flex"
        style={{ height: 6 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex-1" style={{ background: W.bloodRed }} />
        <div className="flex-1" style={{ background: W.neonPink }} />
        <div className="flex-1" style={{ background: W.canaryYellow }} />
      </motion.div>

      {/* Eyebrow */}
      <motion.span
        className="absolute z-[3] top-[14%] left-8 uppercase font-bold"
        style={{ fontSize: 11, letterSpacing: '0.15em', color: W.neonPink }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        BY THE NUMBERS
      </motion.span>

      {/* Editorial stat layout */}
      <div className="absolute z-[3] top-[22%] left-8 right-8 flex flex-col gap-6">
        {/* Minutes */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: stagger(0) }}
        >
          <span
            className="font-black leading-none"
            style={{ fontSize: 'clamp(48px, 14vw, 80px)', ...gradientText(`linear-gradient(135deg, ${W.bloodRed}, ${W.neonPink})`) }}
          >
            {minutesCount.toLocaleString()}
          </span>
          <span className="block uppercase" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>
            MINUTES
          </span>
        </motion.div>

        {/* Plays */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: stagger(1) }}
        >
          <span className="font-black leading-none text-white" style={{ fontSize: 'clamp(36px, 10vw, 56px)' }}>
            {playsCount.toLocaleString()}
          </span>
          <span className="block uppercase" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>
            TOTAL PLAYS
          </span>
        </motion.div>

        {/* Songs / Artists / Albums row */}
        <motion.div
          className="flex gap-8 mt-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: stagger(2) }}
        >
          {[
            { value: songs.length, label: 'SONGS', icon: Music },
            { value: artists.length, label: 'ARTISTS', icon: Disc },
            { value: albums.length, label: 'ALBUMS', icon: Repeat },
          ].map((stat, i) => (
            <div key={stat.label}>
              <span className="block font-bold text-white" style={{ fontSize: 28 }}>{stat.value}</span>
              <span className="uppercase" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom stats */}
      <motion.div
        className="absolute z-[3] bottom-[14%] left-8 right-8 flex justify-between"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div>
          <span className="block font-bold" style={{ fontSize: 18, color: W.canaryYellow }}>{avgPerSong}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>AVG PER SONG</span>
        </div>
        {topGenres > 0 && (
          <div className="text-right">
            <span className="block font-bold" style={{ fontSize: 18, color: W.canaryYellow }}>{topGenres}</span>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>GENRES</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// SLIDE 13 — SlideOutro
// Screenshot-ready share card with gradient border
// "PUNKY" logo top, key stats center, SHARE button prominent
// ═══════════════════════════════════════════════════════════════
const SlideOutro: React.FC<{ totalMinutes: number; artists: Artist[]; songs: Song[]; onClose: () => void }> = ({
  totalMinutes, artists, songs, onClose,
}) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const handleShare = async () => {
    const shareText = `I listened to ${totalMinutes.toLocaleString()} minutes of music this week on Punky!`;
    if (navigator.share) {
      try { await navigator.share({ title: 'My Punky Wrapped', text: shareText }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(shareText); } catch { /* failed */ }
    }
  };

  return (
    <motion.div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: W.deepBlack }}>
      {/* Subtle PrismaticBurst background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <PrismaticBurst animationType="rotate3d" intensity={1.2} speed={0.22} colors={[W.bloodRed, W.neonPink, W.canaryYellow]} mixBlendMode="lighten" />
      </div>
      <div className="absolute inset-0 bg-black/40" />

      {/* Share card — rounded, gradient border */}
      <div className="absolute z-[3] inset-0 flex items-center justify-center px-6">
        <motion.div
          className="w-full max-w-sm p-[3px] rounded-2xl"
          style={{
            background: `linear-gradient(135deg, ${W.bloodRed}, ${W.neonPink}, ${W.canaryYellow})`,
          }}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, type: 'spring', stiffness: 200, damping: 25 }}
        >
          <div className="rounded-2xl px-8 py-10 flex flex-col items-center" style={{ backgroundColor: W.deepBlack }}>
            {/* PUNKY logo */}
            <motion.span
              className="font-black uppercase"
              style={{
                fontSize: 28, letterSpacing: '0.2em',
                ...gradientText(`linear-gradient(135deg, ${W.bloodRed}, ${W.neonPink}, ${W.canaryYellow})`),
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              PUNKY
            </motion.span>

            <motion.div
              className="w-12 h-[2px] my-4"
              style={{ background: `linear-gradient(90deg, ${W.bloodRed}, ${W.neonPink})` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            />

            {/* Key stats stacked */}
            <motion.div
              className="text-center flex flex-col gap-4 w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div>
                <span
                  className="font-black block"
                  style={{
                    fontSize: 48,
                    ...gradientText(`linear-gradient(135deg, ${W.neonPink}, ${W.canaryYellow})`),
                  }}
                >
                  {hours > 0 ? `${hours}h ${minutes}m` : `${totalMinutes}m`}
                </span>
                <span className="uppercase" style={{ fontSize: 11, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>
                  LISTENED
                </span>
              </div>

              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <span className="block font-bold text-white" style={{ fontSize: 24 }}>{songs.length}</span>
                  <span className="uppercase" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>SONGS</span>
                </div>
                <div className="text-center">
                  <span className="block font-bold text-white" style={{ fontSize: 24 }}>{artists.length}</span>
                  <span className="uppercase" style={{ fontSize: 10, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)' }}>ARTISTS</span>
                </div>
              </div>
            </motion.div>

            {/* SHARE button */}
            <motion.button
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              className="mt-6 w-full font-bold rounded-full py-3 transition-transform hover:scale-105 active:scale-95"
              style={{
                fontSize: 15,
                background: `linear-gradient(135deg, ${W.bloodRed}, ${W.neonPink})`,
                color: '#fff',
                border: 'none',
                letterSpacing: '0.1em',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.4 }}
            >
              SHARE
            </motion.button>

            {/* Done link */}
            <motion.button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="mt-3 text-white/40 transition-colors hover:text-white/60"
              style={{ fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
            >
              Done
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const WrappedSlides: React.FC<WrappedSlidesProps> = ({
  onClose, totalMinutes, artists, albums, songs, albumCovers, connectionGraph,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactedRef = useRef(false);

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDirection(1);
      setCurrentSlide((prev) => (prev < TOTAL_SLIDES - 1 ? prev + 1 : prev));
    }, AUTO_ADVANCE_MS);
  }, []);

  useEffect(() => {
    if (!interactedRef.current) resetTimer();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentSlide, resetTimer]);

  const goTo = useCallback(
    (slide: number) => {
      const clamped = Math.max(0, Math.min(TOTAL_SLIDES - 1, slide));
      interactedRef.current = true;
      setDirection(clamped > currentSlide ? 1 : -1);
      setCurrentSlide(clamped);
      resetTimer();
      interactedRef.current = false;
    },
    [currentSlide, resetTimer],
  );

  const handleTap = useCallback((e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.3) {
      goTo(currentSlide - 1);
    } else {
      goTo(currentSlide + 1);
    }
  }, [currentSlide, goTo]);

  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 50;
      if (info.offset.x < -threshold) goTo(currentSlide + 1);
      else if (info.offset.x > threshold) goTo(currentSlide - 1);
    },
    [currentSlide, goTo],
  );

  const slideContent = useMemo(() => {
    switch (currentSlide) {
      case 0: return <SlideTotalMinutes totalMinutes={totalMinutes || 0} albumCovers={albumCovers} />;
      case 1: return <SlideTopArtist artists={artists} songs={songs} />;
      case 2: return <SlideConnection artists={artists} songs={songs} connectionGraph={connectionGraph} />;
      case 3: return <SlideAlbumRepeat albums={albums} />;
      case 4: return <SlideOrbit songs={songs} />;
      case 5: return <SlideUpcomingArtists artists={artists} />;
      case 6: return <SlideObsession songs={songs} artists={artists} />;
      case 7: return <SlideLeapChart artists={artists} songs={songs} />;
      case 8: return <SlidePeakHour songs={songs} />;
      case 9: return <SlideLongestSession songs={songs} />;
      case 10: return <SlideDiscoveryRate artists={artists} albums={albums} />;
      case 11: return <SlideListeningStreak songs={songs} />;
      case 12: return <SlideListeningStats totalMinutes={totalMinutes || 0} artists={artists} songs={songs} albums={albums} />;
      case 13: return <SlideOutro totalMinutes={totalMinutes || 0} artists={artists} songs={songs} onClose={onClose} />;
      default: return null;
    }
  }, [currentSlide, totalMinutes, artists, albums, songs, albumCovers, connectionGraph, onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-black overflow-hidden select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleTap}
      onPanEnd={handleDragEnd}
      style={{ touchAction: 'pan-y' }}
    >
      <StoryProgressBar current={currentSlide} total={TOTAL_SLIDES} />
      <CloseButton onClick={onClose} />

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentSlide}
          className="absolute inset-0"
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={slideTransition}
        >
          {slideContent}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default WrappedSlides;
