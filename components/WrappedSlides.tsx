import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, TrendingUp, ChevronUp } from 'lucide-react';
import { Artist, Album, Song } from '../types';

// ─── Style Constants (matching app UI) ──────────────────────────
const ACCENT_RED = '#FA2D48';
const GRAY_TEXT = '#8E8E93';
const CARD_BG = '#1C1C1E';
const CARD_BORDER = 'rgba(255,255,255,0.05)';

const TOTAL_SLIDES = 9;
const AUTO_ADVANCE_MS = 6000;

// ─── Props ──────────────────────────────────────────────────────
interface WrappedSlidesProps {
  onClose: () => void;
  totalMinutes: number;
  artists: Artist[];
  albums: Album[];
  songs: Song[];
  albumCovers: string[];
}

// ─── Helpers ────────────────────────────────────────────────────
const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFDMUMxRSIvPjx0ZXh0IHg9IjEwMCIgeT0iMTA1IiBmb250LXNpemU9IjQwIiBmaWxsPSIjOEU4RTkzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7wn461PC90ZXh0Pjwvc3ZnPg==';

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

// ─── Keyframes (injected once) ──────────────────────────────────
const KEYFRAMES_ID = 'wrapped-slides-keyframes';
function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes ws-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    @keyframes ws-orbit { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    @keyframes ws-counter-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(-360deg)} }
    @keyframes ws-scroll-up {
      0% { transform: translateY(0); }
      100% { transform: translateY(-50%); }
    }
    @keyframes ws-chart-rise {
      0% { height: 0; opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes ws-glow-pulse {
      0%, 100% { box-shadow: 0 0 20px rgba(250,45,72,0.0); }
      50% { box-shadow: 0 0 40px rgba(250,45,72,0.3); }
    }
    @keyframes ws-slide-in-stagger {
      0% { transform: translateX(100%); opacity: 0; }
      100% { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

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

// ─── Slide Transition Variants ──────────────────────────────────
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95,
    rotateY: direction > 0 ? 8 : -8,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    rotateY: 0,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? '-100%' : '100%',
    opacity: 0,
    scale: 0.95,
    rotateY: direction > 0 ? -8 : 8,
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
      const radius = 120 + Math.random() * 80;
      return {
        src,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        delay: i * 0.08,
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

      {/* Album cover burst */}
      {nodes.map((node, i) => (
        <motion.div
          key={i}
          className="absolute rounded-lg overflow-hidden"
          style={{ width: 50, height: 50, zIndex: 5 }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
          animate={
            phase === 'burst'
              ? { x: node.x, y: node.y, scale: 1, opacity: 0.6, rotate: Math.random() * 30 - 15 }
              : { x: 0, y: 0, scale: 0, opacity: 0, rotate: 360 }
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

      {/* Counter */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.span
          className="text-white font-bold leading-none"
          style={{
            fontSize: 'clamp(80px, 12vw, 140px)',
            fontVariantNumeric: 'tabular-nums',
          }}
          animate={phase === 'final' ? { scale: [1, 1.08, 1] } : {}}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {phase === 'final'
            ? (hours > 0 ? hours.toLocaleString() : totalMinutes.toLocaleString())
            : count.toLocaleString()}
        </motion.span>

        <motion.span
          style={{ fontSize: 22, color: 'rgba(255,255,255,0.7)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          {phase === 'final' && hours > 0
            ? `${hours === 1 ? 'hour' : 'hours'} listened`
            : 'minutes listened'}
        </motion.span>

        {phase === 'final' && hours > 0 && (
          <motion.span
            className="mt-2"
            style={{ fontSize: 16, color: GRAY_TEXT }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.4 }}
          >
            ({totalMinutes.toLocaleString()} minutes)
          </motion.span>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── Slide 2 : Top Artist (enhanced animations) ─────────────────
const SlideTopArtist: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const top3 = artists.slice(0, 3);
  const main = top3[0];
  if (!main) return <div className="absolute inset-0 bg-black" />;

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Subtle image bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${main.image || fallbackImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: 'scale(1.3)',
          filter: 'blur(80px) brightness(0.2)',
          opacity: 0.3,
        }}
      />

      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-6"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        Top Artist
      </motion.span>

      {/* Artist images with stagger entrance */}
      <div className="relative z-10 flex items-end justify-center gap-4 mb-6">
        {top3[1] && (
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: -60, rotate: -12 }}
            animate={{ opacity: 1, x: 0, rotate: -6 }}
            transition={{ delay: 0.3, duration: 0.7, type: 'spring', stiffness: 200 }}
          >
            <img
              src={top3[1].image || fallbackImage}
              alt={top3[1].name}
              className="rounded-2xl object-cover"
              style={{ width: 110, height: 110, border: `1px solid ${CARD_BORDER}` }}
            />
            <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white font-bold"
              style={{ fontSize: 12, backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
              2
            </div>
          </motion.div>
        )}

        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 40, scale: 0.7 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.7, type: 'spring', stiffness: 180 }}
        >
          <img
            src={main.image || fallbackImage}
            alt={main.name}
            className="rounded-2xl object-cover"
            style={{
              width: 160, height: 160,
              border: `2px solid ${ACCENT_RED}`,
              animation: 'ws-glow-pulse 3s ease-in-out infinite',
            }}
          />
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
            style={{ fontSize: 14, backgroundColor: ACCENT_RED }}>
            1
          </div>
        </motion.div>

        {top3[2] && (
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 60, rotate: 12 }}
            animate={{ opacity: 1, x: 0, rotate: 6 }}
            transition={{ delay: 0.3, duration: 0.7, type: 'spring', stiffness: 200 }}
          >
            <img
              src={top3[2].image || fallbackImage}
              alt={top3[2].name}
              className="rounded-2xl object-cover"
              style={{ width: 110, height: 110, border: `1px solid ${CARD_BORDER}` }}
            />
            <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center text-white font-bold"
              style={{ fontSize: 12, backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}>
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
          {main.totalListens} plays this week
        </p>
        {(main.genres ?? []).length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {main.genres!.slice(0, 3).map((g, i) => (
              <motion.span
                key={g}
                className="rounded-full px-3 py-1 text-white/70"
                style={{ fontSize: 11, backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.1, duration: 0.3 }}
              >
                {g}
              </motion.span>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── Slide 3 : Connection Match (scrolling images + real match) ─
const SlideConnection: React.FC<{ artists: Artist[]; songs: Song[] }> = ({ artists, songs }) => {
  // Find closest connection: artist with most songs by them
  const artistSongCounts = useMemo(() => {
    const counts: Record<string, { artist: Artist; songCount: number; songs: Song[] }> = {};
    artists.forEach(a => {
      const matched = songs.filter(s => s.artist === a.name);
      if (matched.length > 0) {
        counts[a.name] = { artist: a, songCount: matched.length, songs: matched };
      }
    });
    return Object.values(counts).sort((a, b) => b.songCount - a.songCount);
  }, [artists, songs]);

  const closest = artistSongCounts[0];
  const artist = closest?.artist || artists[0];
  const matchedSongs = closest?.songs || songs.slice(0, 3);
  const connectionPct = closest
    ? Math.min(99, Math.round(60 + (closest.songCount / Math.max(songs.length, 1)) * 39))
    : 78;

  const [phase, setPhase] = useState<'scroll' | 'reveal'>('scroll');
  const [showPct, setShowPct] = useState(false);

  useEffect(() => {
    const scrollTimer = setTimeout(() => setPhase('reveal'), 3000);
    const pctTimer = setTimeout(() => setShowPct(true), 3500);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(pctTimer);
    };
  }, []);

  // Build a scrolling strip of images (both artist & their songs)
  const scrollImages = useMemo(() => {
    const imgs: string[] = [];
    if (artist?.image) imgs.push(artist.image);
    matchedSongs.forEach(s => { if (s.cover) imgs.push(s.cover); });
    // Duplicate for seamless loop
    while (imgs.length < 8) imgs.push(...imgs);
    return imgs;
  }, [artist, matchedSongs]);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-6"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Your Connection
      </motion.span>

      {/* Scrolling image strip */}
      <div className="relative z-10 w-full overflow-hidden mb-6" style={{ height: 100 }}>
        <motion.div
          className="flex gap-3 absolute"
          style={{ width: 'max-content' }}
          animate={
            phase === 'scroll'
              ? { x: [0, -400] }
              : { x: -200, opacity: 0.3 }
          }
          transition={
            phase === 'scroll'
              ? { x: { duration: 3, ease: 'linear', repeat: Infinity } }
              : { duration: 0.8 }
          }
        >
          {[...scrollImages, ...scrollImages].map((img, i) => (
            <div
              key={i}
              className="flex-shrink-0 rounded-xl overflow-hidden"
              style={{ width: 90, height: 90, border: `1px solid ${CARD_BORDER}` }}
            >
              <img src={img || fallbackImage} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Connection reveal */}
      <AnimatePresence>
        {phase === 'reveal' && (
          <motion.div
            className="relative z-10 flex items-center gap-5"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, type: 'spring', stiffness: 200 }}
          >
            <motion.img
              src={artist?.image || fallbackImage}
              alt={artist?.name ?? 'Artist'}
              className="rounded-xl object-cover"
              style={{ width: 120, height: 120, border: `1px solid ${CARD_BORDER}` }}
              initial={{ x: -30 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            />
            <motion.div
              style={{
                width: 50,
                height: 2,
                background: ACCENT_RED,
                borderRadius: 2,
              }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            />
            <motion.img
              src={matchedSongs[0]?.cover || fallbackImage}
              alt={matchedSongs[0]?.title ?? 'Song'}
              className="rounded-xl object-cover"
              style={{ width: 120, height: 120, border: `1px solid ${CARD_BORDER}` }}
              initial={{ x: 30 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Percentage reveal */}
      {showPct && (
        <motion.div
          className="relative z-10 mt-6 text-center"
          initial={{ opacity: 0, y: 20, scale: 0.5 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <span className="font-bold text-white" style={{ fontSize: 56 }}>
            {connectionPct}%
          </span>
          <span className="text-white/70 ml-2" style={{ fontSize: 20 }}>Match</span>
          <p className="mt-2" style={{ fontSize: 14, color: GRAY_TEXT }}>
            {artist?.name ?? 'Your top artist'} × {matchedSongs[0]?.title ?? 'your top song'}
          </p>
        </motion.div>
      )}
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
      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-6"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
      >
        Album on Repeat
      </motion.span>

      {/* Vinyl + cover animation */}
      <div className="relative z-10" style={{ width: 220, height: 220 }}>
        {/* Vinyl disc */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 200,
            height: 200,
            top: 10,
            left: 30,
            background: 'radial-gradient(circle, #333 30%, #111 70%)',
            border: `1px solid ${CARD_BORDER}`,
            animation: 'ws-spin 3s linear infinite',
          }}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 0.5 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        />

        {/* Album cover */}
        <motion.img
          src={album?.cover || fallbackImage}
          alt={album?.title ?? 'Album'}
          className="relative z-10 rounded-2xl shadow-2xl object-cover"
          style={{ width: 200, height: 200, border: `1px solid ${CARD_BORDER}` }}
          initial={{ scale: 0.6, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ delay: 0.2, duration: 0.7, type: 'spring', stiffness: 200 }}
        />
      </div>

      <motion.div
        className="relative z-10 text-center mt-6"
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
      </motion.div>

      <motion.div
        className="relative z-10 mt-4 px-5 py-2 rounded-full"
        style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <span className="text-white font-semibold" style={{ fontSize: 14 }}>
          {album?.totalListens ?? 0} plays
        </span>
      </motion.div>
    </motion.div>
  );
};

// ─── Slide 5 : Obsession Orbit (day-by-day spin) ────────────────
const SlideOrbit: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [activeDay, setActiveDay] = useState(0);

  const dayData = useMemo(
    () =>
      days.map((d, i) => ({
        day: d,
        listens: songs[i]?.listens ?? (10 + i * 3),
        song: songs[i]?.title ?? 'No data',
        cover: songs[i]?.cover || fallbackImage,
      })),
    [songs],
  );

  // Spin through days
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDay(prev => (prev + 1) % 7);
    }, 700);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-4"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        Your Musical Orbit
      </motion.span>

      {/* Orbit visualization */}
      <div className="relative" style={{ width: 280, height: 280 }}>
        {/* Orbit ring */}
        <div
          className="absolute rounded-full"
          style={{
            width: 260,
            height: 260,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            border: `1px solid rgba(255,255,255,0.08)`,
          }}
        />

        {/* Center - current day info */}
        <motion.div
          className="absolute flex flex-col items-center justify-center text-center"
          style={{
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 100,
            height: 100,
          }}
          key={activeDay}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <span className="text-white font-bold" style={{ fontSize: 20 }}>
            {dayData[activeDay].day}
          </span>
          <span style={{ fontSize: 12, color: GRAY_TEXT }} className="mt-1">
            {dayData[activeDay].listens} plays
          </span>
        </motion.div>

        {/* Day nodes on orbit */}
        {dayData.map((d, i) => {
          const angle = (i / 7) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const r = 125;
          const x = Math.cos(rad) * r;
          const y = Math.sin(rad) * r;
          const isActive = i === activeDay;
          const sz = isActive ? 50 : 36;

          return (
            <motion.div
              key={d.day}
              className="absolute flex flex-col items-center"
              style={{
                top: `calc(50% + ${y}px - ${sz / 2}px)`,
                left: `calc(50% + ${x}px - ${sz / 2}px)`,
              }}
              animate={{
                scale: isActive ? 1.15 : 0.9,
                opacity: isActive ? 1 : 0.5,
              }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 300 }}
            >
              <div
                className="rounded-full overflow-hidden"
                style={{
                  width: sz,
                  height: sz,
                  border: isActive ? `2px solid ${ACCENT_RED}` : `1px solid ${CARD_BORDER}`,
                  animation: isActive ? 'ws-glow-pulse 2s ease-in-out infinite' : 'none',
                }}
              >
                <img src={d.cover} alt={d.day} className="w-full h-full object-cover" />
              </div>
              <span
                className="text-white/60 mt-1 whitespace-nowrap"
                style={{ fontSize: 9, fontWeight: isActive ? 700 : 400, color: isActive ? '#fff' : GRAY_TEXT }}
              >
                {d.day}
              </span>
            </motion.div>
          );
        })}
      </div>

      <motion.p
        className="relative z-10 font-bold text-white mt-4"
        style={{ fontSize: 24 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        7 Days of Vibes
      </motion.p>
    </motion.div>
  );
};

// ─── Slide 6 : Upcoming Artists (replaces Trifecta) ─────────────
const SlideUpcomingArtists: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  // Find artists with lower rank (newer/upcoming feel)
  const upcoming = useMemo(() => {
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
      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-2"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        Trending This Week
      </motion.span>

      <motion.h2
        className="relative z-10 font-bold text-white mb-6"
        style={{ fontSize: 28 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Upcoming Artists
      </motion.h2>

      <div className="relative z-10 flex flex-col gap-3 w-full max-w-md">
        {upcoming.map((artist, i) => (
          <motion.div
            key={artist.id}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{
              delay: 0.3 + i * 0.12,
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
          >
            <SolidCard className="flex items-center p-3 gap-3 relative overflow-hidden">
              {/* Background rank number */}
              <div
                className="absolute left-1 top-0 font-black italic select-none pointer-events-none"
                style={{ fontSize: 40, color: 'rgba(255,255,255,0.03)' }}
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
                  {artist.totalListens} plays
                </p>
              </div>

              {(artist.trend ?? 0) > 0 && (
                <div className="flex items-center gap-1" style={{ color: ACCENT_RED }}>
                  <TrendingUp size={14} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    +{artist.trend}
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
  // Find an artist where you only played ONE song
  const obsession = useMemo(() => {
    const artistSongs: Record<string, Song[]> = {};
    songs.forEach(s => {
      if (!artistSongs[s.artist]) artistSongs[s.artist] = [];
      artistSongs[s.artist].push(s);
    });

    // Find artist with exactly 1 song but high listens
    let best: { artist: string; song: Song } | null = null;
    Object.entries(artistSongs).forEach(([artistName, artistSongList]) => {
      if (artistSongList.length === 1) {
        const song = artistSongList[0];
        if (!best || song.listens > best.song.listens) {
          best = { artist: artistName, song };
        }
      }
    });

    // Fallback to top song if no single-song artist
    if (!best && songs.length > 0) {
      best = { artist: songs[0].artist, song: songs[0] };
    }

    return best;
  }, [songs]);

  const artistData = artists.find(a => a.name === obsession?.artist);

  if (!obsession) return <div className="absolute inset-0 bg-black" />;

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.span
        className="relative z-10 uppercase tracking-widest font-bold mb-6"
        style={{ fontSize: 11, color: ACCENT_RED }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        The Obsession
      </motion.span>

      {/* Pulsing album cover */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.3, duration: 0.8, type: 'spring', stiffness: 150 }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            width: 200,
            height: 200,
            border: `2px solid ${ACCENT_RED}`,
            animation: 'ws-glow-pulse 2s ease-in-out infinite',
          }}
        >
          <img
            src={obsession.song.cover || fallbackImage}
            alt={obsession.song.title}
            className="w-full h-full object-cover"
          />
        </div>
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
        <p style={{ fontSize: 16, color: GRAY_TEXT }} className="mt-1">
          {obsession.artist}
        </p>
      </motion.div>

      <motion.div
        className="relative z-10 mt-4 px-5 py-2 rounded-full"
        style={{ backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <span className="text-white/70" style={{ fontSize: 13 }}>
          The only song you played by this artist
        </span>
      </motion.div>

      <motion.p
        className="relative z-10 mt-3 font-bold"
        style={{ fontSize: 18, color: ACCENT_RED }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.7, 1] }}
        transition={{ delay: 1, duration: 1 }}
      >
        {obsession.song.listens} plays on repeat
      </motion.p>
    </motion.div>
  );
};

// ─── Slide 8 : Leap Chart (artist with highest chart growth) ────
const SlideLeapChart: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const leapArtist = useMemo(() => {
    const sorted = [...artists].sort((a, b) => (b.trend ?? 0) - (a.trend ?? 0));
    return sorted[0] || null;
  }, [artists]);

  const [barHeights, setBarHeights] = useState<number[]>([]);

  // Animate chart bars showing growth trajectory based on trend
  useEffect(() => {
    if (!leapArtist) return;
    const trend = leapArtist.trend ?? 1;
    const heights = Array.from({ length: 7 }, (_, i) => {
      // Simulate growth from low to high, scaled by actual trend
      const progress = i / 6;
      return 15 + progress * progress * 85 * Math.min(trend / 10, 1);
    });
    const max = Math.max(...heights, 1);
    setBarHeights(heights.map(h => (h / max) * 100));
  }, [leapArtist]);

  if (!leapArtist) return <div className="absolute inset-0 bg-black" />;

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
        Leap Chart
      </motion.span>

      <motion.h2
        className="relative z-10 font-bold text-white mb-6 text-center"
        style={{ fontSize: 24 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        Biggest Growth
      </motion.h2>

      {/* Artist card */}
      <motion.div
        className="relative z-10 flex items-center gap-4 mb-8"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div
          className="rounded-full overflow-hidden flex-shrink-0"
          style={{ width: 60, height: 60, border: `2px solid ${ACCENT_RED}` }}
        >
          <img
            src={leapArtist.image || fallbackImage}
            alt={leapArtist.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <p className="font-bold text-white" style={{ fontSize: 20 }}>
            {leapArtist.name}
          </p>
          <div className="flex items-center gap-1 mt-1" style={{ color: ACCENT_RED }}>
            <ChevronUp size={16} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>
              +{leapArtist.trend ?? 0} this week
            </span>
          </div>
        </div>
      </motion.div>

      {/* Animated bar chart */}
      <div className="relative z-10 flex items-end gap-2 w-full max-w-xs" style={{ height: 120 }}>
        {barHeights.map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t-md"
            style={{
              backgroundColor: i === barHeights.length - 1 ? ACCENT_RED : CARD_BG,
              border: `1px solid ${i === barHeights.length - 1 ? ACCENT_RED : CARD_BORDER}`,
            }}
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{
              delay: 0.5 + i * 0.1,
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        ))}
      </div>

      {/* Day labels */}
      <div className="relative z-10 flex gap-2 w-full max-w-xs mt-2">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="flex-1 text-center" style={{ fontSize: 10, color: GRAY_TEXT }}>
            {d}
          </span>
        ))}
      </div>

      <motion.p
        className="relative z-10 mt-6 text-center"
        style={{ fontSize: 14, color: GRAY_TEXT }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        {leapArtist.totalListens} total plays this week
      </motion.p>
    </motion.div>
  );
};

// ─── Slide 9 : Outro (clean, no emojis, no gradient text) ───────
const SlideOutro: React.FC<{ totalMinutes: number; artists: Artist[]; songs: Song[] }> = ({
  totalMinutes,
  artists,
  songs,
}) => {
  const stats = [
    { label: 'songs', value: songs.length },
    { label: 'artists', value: artists.length },
    { label: 'minutes', value: totalMinutes },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Subtle accent */}
      <div
        className="absolute pointer-events-none"
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
        See You Next Week
      </motion.h1>

      <motion.div
        className="mt-3 mx-auto"
        style={{ width: 40, height: 2, backgroundColor: ACCENT_RED, borderRadius: 2 }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      />

      {/* Stats row */}
      <motion.div
        className="relative z-10 flex gap-3 mt-8 flex-wrap justify-center px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
      >
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 + i * 0.15, duration: 0.4 }}
          >
            <SolidCard className="px-5 py-3 text-center" style={{ minWidth: 80 }}>
              <p className="font-bold text-white" style={{ fontSize: 20 }}>
                {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
              </p>
              <p style={{ fontSize: 11, color: GRAY_TEXT }}>{s.label}</p>
            </SolidCard>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.div
        className="relative z-10 flex gap-4 mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.5 }}
      >
        <button
          className="font-semibold rounded-full px-6 py-3 transition-opacity"
          style={{ fontSize: 14, backgroundColor: ACCENT_RED, color: '#fff' }}
        >
          Share Your Week
        </button>
        <button
          className="font-semibold rounded-full px-6 py-3 text-white transition-colors"
          style={{ fontSize: 14, backgroundColor: CARD_BG, border: `1px solid ${CARD_BORDER}` }}
        >
          Explore More
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
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactedRef = useRef(false);

  useEffect(() => {
    injectKeyframes();
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
        return <SlideTopArtist artists={artists} />;
      case 2:
        return <SlideConnection artists={artists} songs={songs} />;
      case 3:
        return <SlideAlbumRepeat albums={albums} />;
      case 4:
        return <SlideOrbit songs={songs} />;
      case 5:
        return <SlideUpcomingArtists artists={artists} />;
      case 6:
        return <SlideObsession songs={songs} artists={artists} />;
      case 7:
        return <SlideLeapChart artists={artists} />;
      case 8:
        return (
          <SlideOutro totalMinutes={totalMinutes || 0} artists={artists} songs={songs} />
        );
      default:
        return null;
    }
  }, [currentSlide, totalMinutes, artists, albums, songs, albumCovers]);

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
