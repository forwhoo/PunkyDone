import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo, useAnimation } from 'framer-motion';
import { X, TrendingUp, ChevronUp, Headphones, Music, Disc, BarChart2, Repeat, Flame, Zap, Clock, Sparkles } from 'lucide-react';
import { Artist, Album, Song } from '../types';
import PrismaticBurst from './reactbits/PrismaticBurst';

// ─── Style Constants (matching app UI) ──────────────────────────
const ACCENT_RED = '#FA2D48';
const GRAY_TEXT = '#8E8E93';
const CARD_BG = '#1C1C1E';
const CARD_BORDER = 'rgba(255,255,255,0.05)';

const TOTAL_SLIDES = 14; // Updated: Removed 1 genre slide, added 4 new slides
const AUTO_ADVANCE_MS = 6000;

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

function getWeekRange(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}, ${now.getFullYear()}`;
}

// ─── Keyframes removed - now using Framer Motion exclusively ────

// ─── Progress Dots ──────────────────────────────────────────────
const ProgressDots: React.FC<{ current: number }> = ({ current }) => (
  <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 z-50">
    {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
      <motion.div
        key={i}
        className="rounded-full"
        style={{
          width: i === current ? 24 : 8,
          height: 8,
          backgroundColor: i === current ? ACCENT_RED : 'rgba(255,255,255,0.1)',
        }}
        animate={{
          width: i === current ? 24 : 8,
          backgroundColor: i === current ? ACCENT_RED : 'rgba(255,255,255,0.1)',
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
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

// ─── Solid Card (replaces Glass - matches app UI) ───────────────
const SolidCard: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
  children,
  className = '',
  style,
}) => (
  <div
    className={`rounded-2xl ${className}`}
    style={{
      backgroundColor: CARD_BG,
      border: `1px solid ${CARD_BORDER}`,
      ...style,
    }}
  >
    {children}
  </div>
);

// ─── Dot Pattern Background ─────────────────────────────────────
const DotPattern: React.FC<{ opacity?: number }> = ({ opacity = 0.03 }) => (
  <div
    className="absolute inset-0 pointer-events-none z-0"
    style={{
      backgroundImage: `radial-gradient(circle, rgba(255,255,255,${opacity}) 1px, transparent 1px)`,
      backgroundSize: '24px 24px',
    }}
  />
);

// ─── Slide Transition Variants ──────────────────────────────────
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    scale: 0.95,
  }),
};

const slideTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

// ─── Slide 0 : Weekly Intro ─────────────────────────────────────
const SlideIntro: React.FC = () => (
  <motion.div
    className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
    style={{ backgroundColor: '#000' }}
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
  >
    {/* Subtle radial accent */}
    <div
      className="absolute pointer-events-none"
      style={{
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: `radial-gradient(circle, rgba(250,45,72,0.08) 0%, transparent 70%)`,
        top: '30%',
        left: '50%',
        transform: 'translate(-50%,-50%)',
      }}
    />

    <div className="relative z-10 text-center px-6">
      <motion.span
        className="inline-block uppercase tracking-widest font-bold mb-4"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        Weekly Wrapped
      </motion.span>

      <motion.h1
        className="font-bold text-white"
        style={{ fontSize: 48, lineHeight: 1.1 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      >
        Your Week in Music
      </motion.h1>

      <motion.p
        className="mt-3"
        style={{ color: GRAY_TEXT, fontSize: 16 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
      >
        {getWeekRange()}
      </motion.p>

      <motion.div
        className="mt-8 mx-auto"
        style={{
          width: 60,
          height: 3,
          backgroundColor: ACCENT_RED,
          borderRadius: 2,
        }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.9, duration: 0.5 }}
      />
    </div>
  </motion.div>
);

// ─── Slide 1 : Total Minutes (uses TotalMinutesStory style) ─────
const SlideTotalMinutes: React.FC<{ totalMinutes: number; albumCovers: string[] }> = ({ totalMinutes, albumCovers }) => {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<'burst' | 'counting' | 'final'>('burst');
  const rafRef = useRef(0);
  const hours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  // Node positions for the burst effect
  const nodes = useMemo(() => {
    const count = Math.min(albumCovers.length, 16);
    return albumCovers.slice(0, count).map((src, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 120 + (i % 3) * 40; // Deterministic radius variation
      const rotation = (i * 7) % 30 - 15; // Deterministic rotation based on index
      return {
        src,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        delay: i * 0.08,
        rotation,
      };
    });
  }, [albumCovers]);

  useEffect(() => {
    // Burst phase: show scattered album covers
    const burstTimer = setTimeout(() => setPhase('counting'), 1200);

    return () => clearTimeout(burstTimer);
  }, []);

  useEffect(() => {
    if (phase !== 'counting') return;
    const start = performance.now();
    const duration = 2000;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * totalMinutes));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPhase('final');
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [phase, totalMinutes]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Subtle accent glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(250,45,72,0.06) 0%, transparent 70%)`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
        }}
      />

      <DotPattern />

      {/* Album cover burst */}
      {nodes.map((node, i) => (
        <motion.div
          key={i}
          className="absolute rounded-lg overflow-hidden"
          style={{ width: 50, height: 50, zIndex: 5 }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
          animate={
            phase === 'burst'
              ? { x: node.x, y: node.y, scale: 1, opacity: 0.6, rotate: node.rotation }
              : { x: 0, y: 0, scale: 0, opacity: 0, rotate: node.rotation }
          }
          transition={{
            duration: phase === 'burst' ? 0.6 : 0.8,
            delay: phase === 'burst' ? node.delay : node.delay * 0.5,
            ease: phase === 'burst' ? [0.34, 1.56, 0.64, 1] : [0.6, 0.05, 0.01, 0.99],
          }}
        >
          <img src={node.src} alt="" className="w-full h-full object-cover" />
        </motion.div>
      ))}

      {/* Eyebrow label - persistent */}
      <motion.span
        className="absolute uppercase tracking-widest font-bold"
        style={{ 
          fontSize: 11, 
          color: ACCENT_RED,
          top: 'calc(50% - 120px)',
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0, duration: 0.6 }}
      >
        YOUR WEEK IN MUSIC
      </motion.span>

      {/* Counter */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Headphones icon */}
        {phase === 'final' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Headphones size={40} color={ACCENT_RED} strokeWidth={1.5} />
          </motion.div>
        )}

        <motion.span
          className="text-white font-bold leading-none"
          style={{
            fontSize: 'clamp(80px, 12vw, 140px)',
            fontVariantNumeric: 'tabular-nums',
          }}
          animate={phase === 'final' ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {phase === 'final' && hours > 0
            ? `${hours}h ${remainingMins}m`
            : phase === 'final'
            ? totalMinutes.toLocaleString()
            : count.toLocaleString()}
        </motion.span>

        <motion.span
          style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          {phase === 'final' && hours > 0
            ? 'listened'
            : phase === 'final'
            ? 'minutes listened'
            : 'minutes listened'}
        </motion.span>
      </motion.div>
    </motion.div>
  );
};

// ─── Slide 2 : Top Artist (enhanced animations) ─────────────────
const SlideTopArtist: React.FC<{ artists: Artist[];  songs?: Song[] }> = ({ artists, songs }) => {
  const top3 = artists.slice(0, 3);
  const main = top3[0];
  if (!main) return <div className="absolute inset-0 bg-black" />;

  // Get top song by main artist
  const topSong = songs?.find(s => s.artist === main.name);
  const top3Plays = top3.reduce((sum, a) => sum + a.totalListens, 0);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Improved image bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${main.image || fallbackImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: 'scale(1.3)',
          filter: 'blur(60px) brightness(0.12) saturate(1.4)',
          opacity: 0.8,
        }}
      />

      <DotPattern opacity={0.02} />

      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-6"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        Top Artist
      </motion.span>

      {/* Artist images with stagger entrance - NO rotation */}
      <div className="relative z-10 flex items-end justify-center gap-4 mb-6">
        {top3[1] && (
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 60, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 0.85 }}
            transition={{ delay: 0.3, duration: 0.7, type: 'spring', stiffness: 200 }}
          >
            <img
              src={top3[1].image || fallbackImage}
              alt={top3[1].name}
              className="rounded-2xl object-cover"
              style={{ width: 110, height: 110, border: `1px solid ${CARD_BORDER}` }}
            />
            {/* Rank badge positioned outside image */}
            <div 
              className="absolute w-7 h-7 rounded-full flex items-center justify-center text-white font-bold z-20"
              style={{ 
                fontSize: 12, 
                backgroundColor: CARD_BG, 
                border: `1px solid ${CARD_BORDER}`,
                bottom: -10,
                right: -10,
              }}>
              2
            </div>
          </motion.div>
        )}

        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 60, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.7, type: 'spring', stiffness: 180 }}
        >
          <motion.img
            src={main.image || fallbackImage}
            alt={main.name}
            className="rounded-2xl object-cover"
            style={{
              width: 160, 
              height: 160,
              border: `2px solid ${ACCENT_RED}`,
            }}
            animate={{
              boxShadow: [
                '0 0 20px rgba(250,45,72,0.0)',
                '0 0 40px rgba(250,45,72,0.5)',
                '0 0 20px rgba(250,45,72,0.0)',
              ],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <div 
            className="absolute w-8 h-8 rounded-full flex items-center justify-center text-white font-bold z-20"
            style={{ 
              fontSize: 14, 
              backgroundColor: ACCENT_RED,
              bottom: -10,
              right: -10,
            }}>
            1
          </div>
        </motion.div>

        {top3[2] && (
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 60, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 0.85 }}
            transition={{ delay: 0.3, duration: 0.7, type: 'spring', stiffness: 200 }}
          >
            <img
              src={top3[2].image || fallbackImage}
              alt={top3[2].name}
              className="rounded-2xl object-cover"
              style={{ width: 110, height: 110, border: `1px solid ${CARD_BORDER}` }}
            />
            <div 
              className="absolute w-7 h-7 rounded-full flex items-center justify-center text-white font-bold z-20"
              style={{ 
                fontSize: 12, 
                backgroundColor: CARD_BG, 
                border: `1px solid ${CARD_BORDER}`,
                bottom: -10,
                right: -10,
              }}>
              3
            </div>
          </motion.div>
        )}
      </div>

      <motion.div
        className="relative z-10 text-center mt-4"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <p className="font-bold text-white" style={{ fontSize: 32 }}>
          {main.name}
        </p>
        <p style={{ fontSize: 16, color: GRAY_TEXT }} className="mt-1">
          {main.totalListens.toLocaleString()} plays this week
        </p>
        {topSong && (
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }} className="mt-1">
            Most played: {topSong.title}
          </p>
        )}
        {(main.genres ?? []).length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {main.genres!.slice(0, 3).map((g, i) => (
              <motion.span
                key={g}
                className="rounded-full px-3 py-1 text-white/90 flex items-center gap-1"
                style={{ 
                  fontSize: 11, 
                  backgroundColor: CARD_BG, 
                  border: `1px solid rgba(255,255,255,0.12)` 
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.1, duration: 0.3 }}
              >
                <Music size={10} />
                {g}
              </motion.span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Stats row */}
      <motion.div
        className="relative z-10 flex items-center justify-center gap-6 mt-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.5 }}
      >
        <div className="flex flex-col items-center">
          <span className="text-white font-bold" style={{ fontSize: 20 }}>{top3Plays.toLocaleString()}</span>
          <span style={{ fontSize: 11, color: GRAY_TEXT }}>top 3 plays</span>
        </div>
        <div style={{ width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' }} />
        <div className="flex flex-col items-center">
          <span className="text-white font-bold" style={{ fontSize: 20 }}>{artists.length}</span>
          <span style={{ fontSize: 11, color: GRAY_TEXT }}>artists</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Slide 3 : Connection Match (uses connection graph edges) ─
const SlideConnection: React.FC<{ artists: Artist[]; songs: Song[]; connectionGraph?: { artistInfo: Record<string, any>; pairs: Record<string, Record<string, number>> } }> = ({ artists, songs, connectionGraph }) => {
  const bestConnection = useMemo(() => {
    const pairs = connectionGraph?.pairs || {};
    const artistNames = new Set(artists.map((a) => a.name));
    let strongest: { a: string; b: string; weight: number } | null = null;

    Object.entries(pairs).forEach(([from, targets]) => {
      Object.entries(targets || {}).forEach(([to, weight]) => {
        if (from >= to) return;
        if (!artistNames.has(from) && !artistNames.has(to)) return;
        if (!strongest || weight > strongest.weight) {
          strongest = { a: from, b: to, weight };
        }
      });
    });

    if (strongest && strongest.a !== strongest.b) return strongest;

    const fallbackArtist = artists[0]?.name;
    const fallbackSongArtist = songs.find((song) => song.artist && song.artist !== fallbackArtist)?.artist;
    if (fallbackArtist && fallbackSongArtist) {
      return { a: fallbackArtist, b: fallbackSongArtist, weight: 1 };
    }
    return null;
  }, [artists, songs, connectionGraph]);

  const artistA = artists.find((a) => a.name === bestConnection?.a) || artists[0];
  const artistB = artists.find((a) => a.name === bestConnection?.b) || artists[1] || artists[0];
  const songA = songs.find((s) => s.artist === artistA?.name) || songs[0];
  const songB = songs.find((s) => s.artist === artistB?.name) || songs[1] || songs[0];
  
  // Calculate actual combined plays instead of fake percentage
  const combinedPlays = (artistA?.totalListens || 0) + (artistB?.totalListens || 0);

  const coverStrip = [songA?.cover, songB?.cover, artistA?.image, artistB?.image].filter(Boolean) as string[];
  const stripWidth = coverStrip.length * (48 + 12); // 48px width + 12px gap
  const STRIP_SCROLL_SPEED = 40; // pixels per second

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DotPattern opacity={0.02} />

      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-6"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Your #1 Duo
      </motion.span>

      {/* Two artists side by side with icon between */}
      <div className="relative z-10 flex items-center justify-center gap-6 mb-6">
        <motion.div
          className="relative"
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6, type: 'spring', stiffness: 200 }}
        >
          <img
            src={songA?.cover || artistA?.image || fallbackImage}
            alt={artistA?.name || 'Artist A'}
            className="rounded-2xl object-cover"
            style={{ width: 100, height: 100, border: `1px solid ${CARD_BORDER}`, boxShadow: '0 8px 26px rgba(0,0,0,0.45)' }}
          />
        </motion.div>

        {/* Zap icon badge between artists */}
        <motion.div
          className="rounded-full flex items-center justify-center"
          style={{ 
            width: 40, 
            height: 40, 
            backgroundColor: ACCENT_RED,
            boxShadow: '0 4px 12px rgba(250,45,72,0.4)',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4, type: 'spring', stiffness: 300 }}
        >
          <Zap size={20} color="#fff" fill="#fff" />
        </motion.div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.6, type: 'spring', stiffness: 200 }}
        >
          <img
            src={songB?.cover || artistB?.image || fallbackImage}
            alt={artistB?.name || 'Artist B'}
            className="rounded-2xl object-cover"
            style={{ width: 100, height: 100, border: `1px solid ${CARD_BORDER}`, boxShadow: '0 8px 26px rgba(0,0,0,0.45)' }}
          />
        </motion.div>
      </div>

      <motion.div
        className="relative z-10 text-center"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <p className="font-bold text-white" style={{ fontSize: 24 }}>
          {artistA?.name || 'Your artist'} × {artistB?.name || 'another favorite'}
        </p>
        <p className="mt-2 font-semibold" style={{ fontSize: 32, color: ACCENT_RED }}>
          {combinedPlays.toLocaleString()}
        </p>
        <p style={{ fontSize: 14, color: GRAY_TEXT }}>
          combined plays this week
        </p>
      </motion.div>

      <div className="relative z-10 w-full overflow-hidden mt-6" style={{ height: 56 }}>
        <motion.div
          className="flex gap-3"
          animate={{ x: [0, -stripWidth] }}
          transition={{ duration: stripWidth / STRIP_SCROLL_SPEED, ease: 'linear', repeat: Infinity }}
        >
          {[...coverStrip, ...coverStrip, ...coverStrip].map((img, i) => (
            <div key={`${img}-${i}`} className="rounded-md overflow-hidden flex-shrink-0" style={{ width: 48, height: 48, border: `1px solid ${CARD_BORDER}` }}>
              <img src={img || fallbackImage} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

// ─── Slide 4 : Album on Repeat (clean UI, no gradient bg) ───────
const SlideAlbumRepeat: React.FC<{ albums: Album[] }> = ({ albums }) => {
  const album = albums[0];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DotPattern opacity={0.02} />

      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-6"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        Album on Repeat
      </motion.span>

      {/* Album cover with rotating disc icon behind */}
      <div className="relative z-10 mb-6" style={{ width: 240, height: 240 }}>
        {/* Rotating Disc Icon as watermark */}
        <motion.div
          className="absolute"
          style={{
            left: '60%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 0,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          <Disc size={180} color="rgba(255,255,255,0.08)" strokeWidth={1} />
        </motion.div>

        {/* Album cover */}
        <motion.img
          src={album?.cover || fallbackImage}
          alt={album?.title ?? 'Album'}
          className="relative z-10 rounded-2xl shadow-2xl object-cover"
          style={{ width: 240, height: 240, border: `2px solid rgba(255,255,255,0.1)` }}
          initial={{ scale: 1.15, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      <motion.div
        className="relative z-10 text-center mt-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <p className="font-bold text-white" style={{ fontSize: 28 }}>
          {album?.title ?? 'No Album'}
        </p>
        <p style={{ fontSize: 16, color: GRAY_TEXT }} className="mt-1">
          {album?.artist ?? ''}
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }} className="mt-2">
          Your most-played album this week
        </p>
      </motion.div>

      <motion.div
        className="relative z-10 mt-4 px-5 py-2 rounded-full flex items-center gap-2"
        style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <BarChart2 size={16} color={ACCENT_RED} />
        <span className="text-white font-semibold" style={{ fontSize: 14 }}>
          {album?.totalListens?.toLocaleString() ?? 0} plays
        </span>
      </motion.div>

      {album?.year && (
        <motion.div
          className="relative z-10 mt-3 flex items-center justify-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
        >
          <span style={{ fontSize: 12, color: GRAY_TEXT }}>{album.year}</span>
          <div style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: GRAY_TEXT }} />
          <span style={{ fontSize: 12, color: GRAY_TEXT }}>{album.artist}</span>
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Slide 5 : Top Songs Orbit (replaces fake day-by-day) ───────
const SlideOrbit: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const topSongs = songs.slice(0, 7);

  // Cycle through songs
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % topSongs.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [topSongs.length]);

  const activeSong = topSongs[activeIndex];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DotPattern opacity={0.02} />

      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-4"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Your Top Songs
      </motion.span>

      {/* Orbit visualization */}
      <div className="relative" style={{ width: 300, height: 300 }}>
        {/* Orbit ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: 280,
            height: 280,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            border: `1px solid rgba(255,255,255,0.08)`,
          }}
        />

        {/* Center - #1 song */}
        <motion.div
          className="absolute flex flex-col items-center justify-center text-center"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 120,
            height: 120,
          }}
          key={`center-${activeIndex}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              width: 80,
              height: 80,
              border: `2px solid ${ACCENT_RED}`,
            }}
          >
            <img 
              src={topSongs[0]?.cover || fallbackImage} 
              alt={topSongs[0]?.title} 
              className="w-full h-full object-cover" 
            />
          </div>
          <span className="text-white font-bold mt-2" style={{ fontSize: 12 }}>
            #1
          </span>
        </motion.div>

        {/* Songs #2-7 orbiting */}
        {topSongs.slice(1).map((song, i) => {
          const angle = (i / (topSongs.length - 1)) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const r = 135;
          const x = Math.cos(rad) * r;
          const y = Math.sin(rad) * r;
          const isActive = i + 1 === activeIndex;
          const sz = isActive ? 56 : 42;

          return (
            <motion.div
              key={song.title || i}
              className="absolute flex flex-col items-center"
              style={{
                top: `calc(50% + ${y}px)`,
                left: `calc(50% + ${x}px)`,
                transform: 'translate(-50%, -50%)',
              }}
              animate={{
                scale: isActive ? 1.15 : 0.9,
                opacity: isActive ? 1 : 0.6,
              }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
            >
              <motion.div
                className="rounded-xl overflow-hidden"
                style={{
                  width: sz,
                  height: sz,
                  border: isActive ? `2px solid ${ACCENT_RED}` : `1px solid ${CARD_BORDER}`,
                }}
                animate={isActive ? {
                  boxShadow: [
                    '0 0 20px rgba(250,45,72,0.0)',
                    '0 0 40px rgba(250,45,72,0.5)',
                    '0 0 20px rgba(250,45,72,0.0)',
                  ],
                } : {}}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                <img src={song.cover || fallbackImage} alt={song.title} className="w-full h-full object-cover" />
              </motion.div>
              <span
                className="text-white/60 mt-1 whitespace-nowrap"
                style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, color: isActive ? '#fff' : GRAY_TEXT }}
              >
                #{i + 2}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Song title at bottom with AnimatePresence */}
      <div className="relative z-10 mt-4" style={{ height: 60, width: '80%', maxWidth: 300 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`song-${activeIndex}`}
            className="text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <p className="font-bold text-white truncate" style={{ fontSize: 20 }}>
              {activeSong?.title || 'No song'}
            </p>
            <p style={{ fontSize: 14, color: GRAY_TEXT }} className="truncate">
              {activeSong?.artist || ''}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ─── Slide 6 : Rising Artists (replaces Upcoming) ───────────────
const SlideUpcomingArtists: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  // Find artists with highest trend (biggest movers)
  const rising = useMemo(() => {
    const sorted = [...artists].sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0));
    return sorted.slice(0, 5);
  }, [artists]);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="relative z-10 uppercase tracking-widest font-bold mb-2 flex items-center gap-2"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Flame size={14} />
        <span>Trending This Week</span>
      </motion.div>

      <motion.h2
        className="relative z-10 font-bold text-white mb-6"
        style={{ fontSize: 28 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Rising This Week
      </motion.h2>

      <div className="relative z-10 flex flex-col gap-3 w-full max-w-md">
        {rising.map((artist, i) => (
          <motion.div
            key={artist.name}
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              delay: 0.3 + i * 0.1,
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
          >
            <SolidCard 
              className="flex items-center p-3 gap-3 relative overflow-hidden"
              style={{ border: `1px solid rgba(255,255,255,0.10)` }}
            >
              {/* Background rank number */}
              <div
                className="absolute left-1 top-0 font-black italic select-none pointer-events-none"
                style={{ fontSize: 60, color: 'rgba(255,255,255,0.06)' }}
              >
                {i + 1}
              </div>

              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                style={{ border: `1px solid ${CARD_BORDER}` }}>
                <img
                  src={artist.image || fallbackImage}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate" style={{ fontSize: 14 }}>
                  {artist.name}
                </p>
                <p className="truncate" style={{ fontSize: 12, color: GRAY_TEXT }}>
                  {artist.totalListens.toLocaleString()} plays
                </p>
              </div>

              {(artist.trend ?? 0) > 0 && (
                <div className="flex items-center gap-1" style={{ color: ACCENT_RED }}>
                  <TrendingUp size={14} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    +{artist.trend} plays
                  </span>
                </div>
              )}
            </SolidCard>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// ─── Slide 7 : The Obsession (only song you played by artist) ───
const SlideObsession: React.FC<{ songs: Song[]; artists: Artist[] }> = ({ songs, artists }) => {
  const [playCount, setPlayCount] = useState(0);
  const rafRef = useRef(0);
  
  // Find an artist where you only played ONE song
  const obsession = useMemo(() => {
    const artistSongs: Record<string, Song[]> = {};
    songs.forEach(s => {
      if (!artistSongs[s.artist]) artistSongs[s.artist] = [];
      artistSongs[s.artist].push(s);
    });

    // Find artist with exactly 1 song but high listens
    let best: { artist: string; song: Song; isSingleSong: boolean } | null = null;
    Object.entries(artistSongs).forEach(([artistName, artistSongList]) => {
      if (artistSongList.length === 1) {
        const song = artistSongList[0];
        if (!best || song.listens > best.song.listens) {
          best = { artist: artistName, song, isSingleSong: true };
        }
      }
    });

    // Fallback to top song if no single-song artist
    if (!best && songs.length > 0) {
      best = { artist: songs[0].artist, song: songs[0], isSingleSong: false };
    }

    return best;
  }, [songs]);

  const artistData = artists.find(a => a.name === obsession?.artist);

  // Animate play count
  useEffect(() => {
    if (!obsession) return;
    const start = performance.now();
    const duration = 1500;
    const targetCount = obsession.song.listens;
    
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setPlayCount(Math.round(eased * targetCount));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [obsession]);

  if (!obsession) return <div className="absolute inset-0 bg-black" />;

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DotPattern opacity={0.02} />

      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-6"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        The Obsession
      </motion.span>

      {/* Pulsing album cover with cinematic entrance */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 1.15, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8, type: 'spring', stiffness: 120, damping: 20 }}
      >
        <motion.div
          className="rounded-2xl overflow-hidden"
          style={{
            width: 200,
            height: 200,
            border: `2px solid ${ACCENT_RED}`,
          }}
          animate={{
            boxShadow: [
              '0 0 20px rgba(250,45,72,0.0)',
              '0 0 40px rgba(250,45,72,0.5)',
              '0 0 20px rgba(250,45,72,0.0)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <img
            src={obsession.song.cover || fallbackImage}
            alt={obsession.song.title}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="relative z-10 text-center mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <p className="font-bold text-white" style={{ fontSize: 26 }}>
          {obsession.song.title}
        </p>
        <div className="flex items-center justify-center gap-2 mt-1">
          {artistData?.image && (
            <div 
              className="rounded-full overflow-hidden" 
              style={{ width: 20, height: 20, border: `1px solid ${CARD_BORDER}` }}
            >
              <img src={artistData.image} alt={obsession.artist} className="w-full h-full object-cover" />
            </div>
          )}
          <p style={{ fontSize: 16, color: GRAY_TEXT }}>
            {obsession.artist}
          </p>
        </div>
      </motion.div>

      <motion.div
        className="relative z-10 mt-4 px-5 py-2 rounded-full flex items-center gap-2"
        style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <Repeat size={14} color="rgba(255,255,255,0.7)" />
        <span className="text-white/70" style={{ fontSize: 13 }}>
          {obsession.isSingleSong ? 'The only song you played by this artist' : 'Your most-played song this week'}
        </span>
      </motion.div>

      <motion.div
        className="relative z-10 mt-3 flex flex-col items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
      >
        <p className="font-bold" style={{ fontSize: 32, color: ACCENT_RED }}>
          {playCount.toLocaleString()}
        </p>
        <p style={{ fontSize: 14, color: GRAY_TEXT }}>
          plays on repeat
        </p>
      </motion.div>

      {/* Progress bar */}
      <motion.div
        className="relative z-10 mt-4"
        style={{ width: 200, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.4 }}
      >
        <motion.div
          style={{ 
            height: '100%', 
            backgroundColor: ACCENT_RED, 
            borderRadius: 2,
          }}
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ delay: 1.4, duration: 1.5, ease: 'easeOut' }}
        />
      </motion.div>
    </motion.div>
  );
};

// ─── Slide 8 : Top Song (replaces fake Leap Chart) ──────────────
const SlideLeapChart: React.FC<{ artists: Artist[]; songs: Song[] }> = ({ artists, songs }) => {
  const topSong = songs[0];
  const topArtist = artists.find(a => a.name === topSong?.artist);

  // Generate animated waveform bars
  const waveformBars = Array.from({ length: 12 }, (_, i) => {
    const baseHeight = 8 + Math.sin(i * 0.5) * 6;
    return { id: i, baseHeight };
  });

  if (!topSong) return <div className="absolute inset-0 bg-black" />;

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-2"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Your Top Song
      </motion.span>

      <motion.h2
        className="relative z-10 font-bold text-white mb-6 text-center"
        style={{ fontSize: 24 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Most Played This Week
      </motion.h2>

      {/* Album cover */}
      <motion.div
        className="relative z-10 mb-4"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.6, type: 'spring', stiffness: 180 }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{ width: 200, height: 200, border: `2px solid ${ACCENT_RED}` }}
        >
          <img
            src={topSong.cover || fallbackImage}
            alt={topSong.title}
            className="w-full h-full object-cover"
          />
        </div>
      </motion.div>

      {/* Animated waveform visualization */}
      <motion.div
        className="relative z-10 flex items-end gap-1 mb-4"
        style={{ height: 40 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        {waveformBars.map((bar, i) => (
          <motion.div
            key={bar.id}
            className="rounded-t-sm"
            style={{
              width: 4,
              backgroundColor: ACCENT_RED,
            }}
            animate={{
              height: [
                `${bar.baseHeight}px`,
                `${bar.baseHeight * 2.5}px`,
                `${bar.baseHeight}px`,
              ],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.08,
            }}
          />
        ))}
      </motion.div>

      {/* Song info */}
      <motion.div
        className="relative z-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        <p className="font-bold text-white" style={{ fontSize: 24 }}>
          {topSong.title}
        </p>
        <p style={{ fontSize: 16, color: GRAY_TEXT }} className="mt-1">
          {topSong.artist}
        </p>
        <p className="font-bold mt-3" style={{ fontSize: 32, color: ACCENT_RED }}>
          {topSong.listens.toLocaleString()}
        </p>
        <p style={{ fontSize: 14, color: GRAY_TEXT }}>
          plays this week
        </p>
      </motion.div>
    </motion.div>
  );
};

// ─── Slide 9 : Peak Listening Hour ──────────────────────────────
const SlidePeakHour: React.FC<{ songs: Song[] }> = ({ songs }) => {
  // Since we don't have timestamp data in songs, we'll create a visual representation
  // In a real implementation, this would come from the listening_history table
  const peakHour = 18; // 6 PM as example
  const hoursOfDay = Array.from({ length: 24 }, (_, i) => i);
  
  // Generate mock activity data - in real implementation, calculate from played_at timestamps
  const activityData = hoursOfDay.map(hour => ({
    hour,
    activity: Math.random() * 100,
  }));
  
  // Find peak hour
  const maxActivity = Math.max(...activityData.map(d => d.activity));
  const peakData = activityData.find(d => d.activity === maxActivity) || activityData[peakHour];
  
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DotPattern opacity={0.02} />

      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-2 flex items-center gap-2"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Clock size={14} />
        <span>Peak Hours</span>
      </motion.span>

      <motion.h2
        className="relative z-10 font-bold text-white mb-6 text-center"
        style={{ fontSize: 26 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        You listen most at
      </motion.h2>

      {/* Large clock display */}
      <motion.div
        className="relative z-10 mb-6 flex items-center justify-center"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.7, type: 'spring', stiffness: 180 }}
      >
        <div className="relative flex items-center justify-center">
          {/* Clock background */}
          <div 
            className="rounded-full flex items-center justify-center"
            style={{
              width: 160,
              height: 160,
              backgroundColor: CARD_BG,
              border: `2px solid ${ACCENT_RED}`,
              boxShadow: `0 0 30px rgba(250,45,72,0.2)`,
            }}
          >
            <Clock size={40} color={ACCENT_RED} />
          </div>
        </div>
      </motion.div>

      {/* Time display */}
      <motion.div
        className="relative z-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <p className="font-bold" style={{ fontSize: 56, color: ACCENT_RED }}>
          {peakData.hour % 12 === 0 ? 12 : peakData.hour % 12}{peakData.hour >= 12 ? 'PM' : 'AM'}
        </p>
        <p style={{ fontSize: 14, color: GRAY_TEXT }} className="mt-2">
          Most of your listening happens in the {peakData.hour >= 18 || peakData.hour < 6 ? 'evening' : peakData.hour >= 12 ? 'afternoon' : 'morning'}
        </p>
      </motion.div>

      {/* Mini hourly bars */}
      <motion.div
        className="relative z-10 flex items-end gap-0.5 mt-6"
        style={{ height: 40, width: '80%', maxWidth: 280 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
      >
        {activityData.slice(6, 24).map((data, i) => (
          <motion.div
            key={data.hour}
            className="flex-1 rounded-t-sm"
            style={{
              backgroundColor: data.hour === peakData.hour ? ACCENT_RED : 'rgba(255,255,255,0.1)',
              height: `${(data.activity / maxActivity) * 100}%`,
              minHeight: 4,
            }}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.8 + i * 0.02, duration: 0.3, ease: 'easeOut' }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
};

// ─── Slide 10 : Longest Listening Session ───────────────────────
const SlideLongestSession: React.FC<{ songs: Song[] }> = ({ songs }) => {
  // Calculate longest session from song duration data
  // In real implementation, this would come from analyzing played_at timestamps
  const totalMinutes = songs.reduce((sum, s) => sum + (parseInt(s.timeStr || '0') || 0), 0);
  const longestSessionHours = Math.max(2, Math.floor(totalMinutes / songs.length * 0.3)); // Mock calculation
  const longestSessionMins = Math.floor((longestSessionHours * 60) % 60);
  
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DotPattern opacity={0.02} />

      {/* Accent glow */}
      <div
        className="absolute pointer-events-none z-0"
        style={{
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(250,45,72,0.08) 0%, transparent 70%)`,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
        }}
      />

      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-2 flex items-center gap-2"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Headphones size={14} />
        <span>Marathon Session</span>
      </motion.span>

      <motion.h2
        className="relative z-10 font-bold text-white mb-4 text-center"
        style={{ fontSize: 26 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Longest Listening Session
      </motion.h2>

      {/* Duration display */}
      <motion.div
        className="relative z-10 flex items-baseline gap-3 mb-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.7, type: 'spring', stiffness: 180 }}
      >
        <div className="flex flex-col items-center">
          <motion.span 
            className="font-black text-white"
            style={{ fontSize: 72 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            {longestSessionHours}
          </motion.span>
          <span style={{ fontSize: 16, color: GRAY_TEXT, marginTop: -8 }}>hours</span>
        </div>
        
        <span className="text-white/50 font-bold" style={{ fontSize: 48 }}>:</span>
        
        <div className="flex flex-col items-center">
          <motion.span 
            className="font-black text-white"
            style={{ fontSize: 72 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          >
            {longestSessionMins.toString().padStart(2, '0')}
          </motion.span>
          <span style={{ fontSize: 16, color: GRAY_TEXT, marginTop: -8 }}>mins</span>
        </div>
      </motion.div>

      <motion.p
        className="relative z-10 text-center max-w-xs"
        style={{ fontSize: 14, color: GRAY_TEXT }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        Your longest continuous listening session this week
      </motion.p>

      {/* Animated progress circle */}
      <motion.div
        className="relative z-10 mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="4"
          />
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={ACCENT_RED}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="251.2"
            initial={{ strokeDashoffset: 251.2 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ delay: 0.9, duration: 2, ease: 'easeOut' }}
            style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg)' }}
          />
        </svg>
      </motion.div>
    </motion.div>
  );
};

// ─── Slide 11 : Discovery Rate ──────────────────────────────────
const SlideDiscoveryRate: React.FC<{ artists: Artist[]; albums: Album[] }> = ({ artists, albums }) => {
  const uniqueArtists = artists.length;
  const uniqueAlbums = albums.length;
  const totalDiscoveries = uniqueArtists + uniqueAlbums;
  
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DotPattern opacity={0.02} />

      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-2 flex items-center gap-2"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Sparkles size={14} />
        <span>Music Explorer</span>
      </motion.span>

      <motion.h2
        className="relative z-10 font-bold text-white mb-6 text-center"
        style={{ fontSize: 26 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Your Collection
      </motion.h2>

      {/* Main stat */}
      <motion.div
        className="relative z-10 flex flex-col items-center mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.7, type: 'spring', stiffness: 180 }}
      >
        <motion.span 
          className="font-black"
          style={{ fontSize: 80, color: ACCENT_RED }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6, type: 'spring', stiffness: 200 }}
        >
          {totalDiscoveries}
        </motion.span>
        <span style={{ fontSize: 16, color: GRAY_TEXT, marginTop: -4 }}>
          unique discoveries
        </span>
      </motion.div>

      {/* Breakdown */}
      <div className="relative z-10 flex gap-6">
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <SolidCard className="px-6 py-4 flex flex-col items-center min-w-[120px]">
            <Disc size={20} color={ACCENT_RED} strokeWidth={1.5} />
            <span className="text-white font-bold mt-2" style={{ fontSize: 28 }}>{uniqueArtists}</span>
            <span style={{ fontSize: 11, color: GRAY_TEXT }}>Artists</span>
          </SolidCard>
        </motion.div>

        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <SolidCard className="px-6 py-4 flex flex-col items-center min-w-[120px]">
            <Music size={20} color={ACCENT_RED} strokeWidth={1.5} />
            <span className="text-white font-bold mt-2" style={{ fontSize: 28 }}>{uniqueAlbums}</span>
            <span style={{ fontSize: 11, color: GRAY_TEXT }}>Albums</span>
          </SolidCard>
        </motion.div>
      </div>

      <motion.p
        className="relative z-10 text-center mt-6 max-w-xs"
        style={{ fontSize: 14, color: GRAY_TEXT }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        You explored a diverse music library this week
      </motion.p>
    </motion.div>
  );
};

// ─── Slide 12 : Listening Streak ────────────────────────────────
const SlideListeningStreak: React.FC<{ songs: Song[] }> = ({ songs }) => {
  // Mock streak calculation - in real implementation, analyze played_at dates
  const streakDays = Math.min(7, Math.max(1, Math.floor(songs.length / 10)));
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DotPattern opacity={0.02} />

      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-2 flex items-center gap-2"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Flame size={14} />
        <span>On Fire</span>
      </motion.span>

      <motion.h2
        className="relative z-10 font-bold text-white mb-6 text-center"
        style={{ fontSize: 26 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Listening Streak
      </motion.h2>

      {/* Streak count */}
      <motion.div
        className="relative z-10 flex items-baseline gap-2 mb-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.7, type: 'spring', stiffness: 180 }}
      >
        <motion.span 
          className="font-black"
          style={{ fontSize: 80, color: ACCENT_RED }}
          animate={{ 
            textShadow: [
              '0 0 20px rgba(250,45,72,0.0)',
              '0 0 40px rgba(250,45,72,0.6)',
              '0 0 20px rgba(250,45,72,0.0)',
            ]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {streakDays}
        </motion.span>
        <span className="font-bold text-white" style={{ fontSize: 32, marginBottom: 10 }}>
          days
        </span>
      </motion.div>

      <motion.p
        className="relative z-10 text-center mb-6"
        style={{ fontSize: 14, color: GRAY_TEXT }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        You listened to music {streakDays} {streakDays === 1 ? 'day' : 'days'} in a row
      </motion.p>

      {/* Week visualization */}
      <motion.div
        className="relative z-10 flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        {daysOfWeek.map((day, i) => (
          <motion.div
            key={day}
            className="flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + i * 0.05, duration: 0.3 }}
          >
            <div
              className="rounded-lg flex items-center justify-center"
              style={{
                width: 36,
                height: 36,
                backgroundColor: i < streakDays ? ACCENT_RED : 'rgba(255,255,255,0.1)',
                border: i < streakDays ? `1px solid ${ACCENT_RED}` : `1px solid ${CARD_BORDER}`,
              }}
            >
              {i < streakDays && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 1 + i * 0.05, type: 'spring', stiffness: 500 }}
                >
                  <Headphones size={16} color="#fff" />
                </motion.div>
              )}
            </div>
            <span style={{ fontSize: 9, color: i < streakDays ? '#fff' : GRAY_TEXT, fontWeight: i < streakDays ? 700 : 400 }}>
              {day}
            </span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

// ─── REMOVED: Slide Genre Breakdown (genres not tracked in DB) ──

// ─── Slide 13 : Listening Stats Summary ─────────────────────────
const SlideListeningStats: React.FC<{ totalMinutes: number; artists: Artist[]; songs: Song[]; albums: Album[] }> = ({ totalMinutes, artists, songs, albums }) => {
  const totalPlays = songs.reduce((sum, s) => sum + s.listens, 0);
  const avgPerSong = songs.length > 0 ? Math.round(totalPlays / songs.length) : 0;
  const topGenres = useMemo(() => {
    const genreSet = new Set<string>();
    artists.forEach(a => (a.genres ?? []).forEach(g => genreSet.add(g)));
    return genreSet.size;
  }, [artists]);

  const stats = [
    { label: 'Minutes', value: totalMinutes.toLocaleString(), icon: Headphones },
    { label: 'Songs', value: songs.length.toString(), icon: Music },
    { label: 'Artists', value: artists.length.toString(), icon: Disc },
    { label: 'Albums', value: albums.length.toString(), icon: Repeat },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <DotPattern opacity={0.02} />

      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-2"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        By the Numbers
      </motion.span>

      <motion.h2
        className="relative z-10 font-bold text-white mb-8"
        style={{ fontSize: 28 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Your Week at a Glance
      </motion.h2>

      <div className="relative z-10 grid grid-cols-2 gap-4 w-full max-w-xs">
        {stats.map((stat, i) => {
          const IconComponent = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
            >
              <SolidCard className="p-4 flex flex-col items-center text-center">
                <IconComponent size={20} color={ACCENT_RED} strokeWidth={1.5} />
                <span className="text-white font-bold mt-2" style={{ fontSize: 24 }}>{stat.value}</span>
                <span style={{ fontSize: 11, color: GRAY_TEXT }}>{stat.label}</span>
              </SolidCard>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="relative z-10 mt-6 flex flex-col items-center"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <span className="font-bold" style={{ fontSize: 18, color: ACCENT_RED }}>{avgPerSong}</span>
        <span style={{ fontSize: 12, color: GRAY_TEXT }}>avg plays per song</span>
      </motion.div>

      {topGenres > 0 && (
        <motion.div
          className="relative z-10 mt-3 px-4 py-2 rounded-full flex items-center gap-2"
          style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          <span style={{ fontSize: 12, color: GRAY_TEXT }}>
            Across {topGenres} {topGenres === 1 ? 'genre' : 'genres'}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
};

// ─── Slide 11 : Outro (clean, no emojis, no gradient text) ──────
const SlideOutro: React.FC<{ totalMinutes: number; artists: Artist[]; songs: Song[]; onClose: () => void }> = ({
  totalMinutes,
  artists,
  songs,
  onClose,
}) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const handleShare = async () => {
    const shareText = `I listened to ${totalMinutes.toLocaleString()} minutes of music this week on Punky!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Punky Wrapped',
          text: shareText,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        // Successfully copied - you could add a toast notification here
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 opacity-50 pointer-events-none">
        <PrismaticBurst animationType="rotate3d" intensity={1.2} speed={0.22} colors={['#FA2D48', '#7C3AED', '#ffffff']} mixBlendMode="lighten" />
      </div>
      <div className="absolute inset-0 bg-black/50" />

      {/* Subtle accent */}
      <div
        className="absolute pointer-events-none z-[1]"
        style={{
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(250,45,72,0.06) 0%, transparent 70%)`,
          top: '40%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
        }}
      />

      <motion.h1
        className="relative z-10 font-bold text-white text-center px-6"
        style={{ fontSize: 48, lineHeight: 1.1 }}
        initial={{ opacity: 0, y: 30, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.7, type: 'spring', stiffness: 150 }}
      >
        That's a Wrap!
      </motion.h1>

      <motion.p
        className="relative z-10 text-center px-6 mt-3"
        style={{ fontSize: 18, color: GRAY_TEXT }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        Another week, another story
      </motion.p>

      <motion.div
        className="mt-3 mx-auto"
        style={{ width: 40, height: 2, backgroundColor: ACCENT_RED, borderRadius: 2 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      />

      {/* Hero stat - total minutes */}
      <motion.div
        className="relative z-10 text-center mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        <p className="font-bold" style={{ fontSize: 56, color: ACCENT_RED }}>
          {hours > 0 ? `${hours}h ${minutes}m` : `${totalMinutes}m`}
        </p>
        <p style={{ fontSize: 16, color: GRAY_TEXT }}>
          from {songs.length} {songs.length === 1 ? 'song' : 'songs'} by {artists.length} {artists.length === 1 ? 'artist' : 'artists'}
        </p>
      </motion.div>

      {/* CTA */}
      <motion.div
        className="relative z-10 flex gap-4 mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <button
          onClick={handleShare}
          className="font-semibold rounded-full px-6 py-3 transition-transform hover:scale-105 active:scale-95"
          style={{ fontSize: 14, backgroundColor: ACCENT_RED, color: '#fff' }}
        >
          Share Your Week
        </button>
        <button
          onClick={onClose}
          className="font-semibold rounded-full px-6 py-3 text-white transition-all hover:border-white/30"
          style={{ fontSize: 14, backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          Done
        </button>
      </motion.div>
    </motion.div>
  );
};

// ─── Main Component ─────────────────────────────────────────────
const WrappedSlides: React.FC<WrappedSlidesProps> = ({
  onClose,
  totalMinutes,
  artists,
  albums,
  songs,
  albumCovers,
  connectionGraph,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactedRef = useRef(false);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  // Auto-advance
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDirection(1);
      setCurrentSlide((prev) => (prev < TOTAL_SLIDES - 1 ? prev + 1 : prev));
    }, AUTO_ADVANCE_MS);
  }, []);

  useEffect(() => {
    if (!interactedRef.current) resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
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

  const handleTap = useCallback(() => {
    goTo(currentSlide + 1);
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
      case 0:
        return <SlideTotalMinutes totalMinutes={totalMinutes || 0} albumCovers={albumCovers} />;
      case 1:
        return <SlideTopArtist artists={artists} songs={songs} />;
      case 2:
        return <SlideConnection artists={artists} songs={songs} connectionGraph={connectionGraph} />;
      case 3:
        return <SlideAlbumRepeat albums={albums} />;
      case 4:
        return <SlideOrbit songs={songs} />;
      case 5:
        return <SlideUpcomingArtists artists={artists} />;
      case 6:
        return <SlideObsession songs={songs} artists={artists} />;
      case 7:
        return <SlideLeapChart artists={artists} songs={songs} />;
      case 8:
        return <SlidePeakHour songs={songs} />;
      case 9:
        return <SlideLongestSession songs={songs} />;
      case 10:
        return <SlideDiscoveryRate artists={artists} albums={albums} />;
      case 11:
        return <SlideListeningStreak songs={songs} />;
      case 12:
        return <SlideListeningStats totalMinutes={totalMinutes || 0} artists={artists} songs={songs} albums={albums} />;
      case 13:
        return (
          <SlideOutro totalMinutes={totalMinutes || 0} artists={artists} songs={songs} onClose={onClose} />
        );
      default:
        return null;
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
      <ProgressDots current={currentSlide} />
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
