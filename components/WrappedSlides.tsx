import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import LightRays from './reactbits/LightRays';
import { GridScan } from './reactbits/GridScan';
import ColorBends from './reactbits/ColorBends';
import { Artist, Album, Song } from '../types';

// ─── Style Constants ────────────────────────────────────────────
const ACCENT_RED = '#FA2D48';
const PURPLE = '#8a5cff';
const CYAN = '#00ffd1';
const PINK = '#FF9FFC';
const GRAY_TEXT = '#8E8E93';
const CARD_BG = '#1C1C1E';

const TOTAL_SLIDES = 10;
const AUTO_ADVANCE_MS = 5000;

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

function computeGenres(artists: Artist[]): { name: string; pct: number; color: string }[] {
  const colors = ['#ff5c7a', PURPLE, CYAN, PINK, '#FFD700', '#FF6B35'];
  const counts: Record<string, number> = {};
  artists.forEach((a) =>
    (a.genres ?? []).forEach((g) => {
      counts[g] = (counts[g] || 0) + 1;
    }),
  );
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return [
      { name: 'Pop', pct: 35, color: colors[0] },
      { name: 'Hip-Hop', pct: 25, color: colors[1] },
      { name: 'R&B', pct: 20, color: colors[2] },
      { name: 'Electronic', pct: 12, color: colors[3] },
      { name: 'Other', pct: 8, color: colors[4] },
    ];
  }
  const total = entries.reduce((s, e) => s + e[1], 0);
  return entries.slice(0, 5).map((e, i) => ({
    name: e[0],
    pct: Math.round((e[1] / total) * 100),
    color: colors[i % colors.length],
  }));
}

// ─── Keyframes (injected once) ──────────────────────────────────
const KEYFRAMES_ID = 'wrapped-slides-keyframes';
function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes ws-pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
    @keyframes ws-float { 0%{transform:translateY(0) rotate(0deg);opacity:.3} 100%{transform:translateY(-120px) rotate(20deg);opacity:0} }
    @keyframes ws-spin { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    @keyframes ws-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
    @keyframes ws-orbit { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    @keyframes ws-drift { 0%{transform:translate(0,0) rotate(0deg);opacity:.5} 100%{transform:translate(var(--dx),var(--dy)) rotate(var(--dr));opacity:0} }
    @keyframes ws-typing { from{width:0} to{width:100%} }
  `;
  document.head.appendChild(style);
}

// ─── Progress Dots ──────────────────────────────────────────────
const ProgressDots: React.FC<{ current: number }> = ({ current }) => (
  <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 z-50">
    {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
      <div
        key={i}
        className="rounded-full transition-colors duration-300"
        style={{
          width: 8,
          height: 8,
          backgroundColor: i === current ? ACCENT_RED : 'rgba(255,255,255,0.1)',
        }}
      />
    ))}
  </div>
);

// ─── Close Button ───────────────────────────────────────────────
const CloseButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="absolute top-6 right-6 z-50 p-2 rounded-full bg-white/10 backdrop-blur hover:bg-white/20 transition-colors"
    aria-label="Close"
  >
    <X size={20} color="#fff" />
  </button>
);

// ─── Glassmorphism Card ─────────────────────────────────────────
const Glass: React.FC<{ children: React.ReactNode; className?: string; style?: React.CSSProperties }> = ({
  children,
  className = '',
  style,
}) => (
  <div
    className={`bg-white/5 backdrop-blur border border-white/10 rounded-2xl ${className}`}
    style={style}
  >
    {children}
  </div>
);

// ─── Slide 0 : Intro ───────────────────────────────────────────
const SlideIntro: React.FC = () => (
  <motion.div
    className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ duration: 0.8 }}
  >
    <div
      className="absolute inset-0"
      style={{
        background: `linear-gradient(135deg, ${ACCENT_RED}, ${PURPLE}, #000)`,
        animation: 'ws-pulse 3s ease-in-out infinite',
      }}
    />
    <div className="absolute inset-0 opacity-15 pointer-events-none">
      <LightRays raysColor="#ffffff" raysOrigin="top-center" />
    </div>
    <div className="relative z-10 text-center px-6">
      <h1
        className="font-bold text-white"
        style={{
          fontSize: 48,
          textShadow: `0px 4px 20px rgba(250,45,72,0.4)`,
        }}
      >
        Your Week in Music
      </h1>
      <p className="mt-3" style={{ color: GRAY_TEXT, fontSize: 16 }}>
        {getWeekRange()}
      </p>
    </div>
  </motion.div>
);

// ─── Slide 1 : Listening Time ───────────────────────────────────
const SlideListeningTime: React.FC<{ totalMinutes: number }> = ({ totalMinutes }) => {
  const [count, setCount] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 1500;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setCount(Math.round(progress * totalMinutes));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [totalMinutes]);

  const notes = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => ({
        char: i % 2 === 0 ? '♪' : '♫',
        left: 15 + Math.random() * 70,
        delay: Math.random() * 3,
        dur: 3 + Math.random() * 2,
      })),
    [],
  );

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: '#000' }}
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(250,45,72,0.2), transparent 70%)',
        }}
      />
      {notes.map((n, i) => (
        <span
          key={i}
          className="absolute text-white pointer-events-none select-none"
          style={{
            left: `${n.left}%`,
            bottom: '10%',
            fontSize: 24,
            opacity: 0.3,
            animation: `ws-float ${n.dur}s ease-out ${n.delay}s infinite`,
          }}
        >
          {n.char}
        </span>
      ))}
      <Glass className="relative z-10 text-center" style={{ padding: 40 }}>
        <p className="font-bold text-white" style={{ fontSize: 96, lineHeight: 1 }}>
          {count}
        </p>
        <p style={{ fontSize: 24, color: GRAY_TEXT }} className="mt-1">
          minutes
        </p>
        <p className="mt-4 text-white/70" style={{ fontSize: 16 }}>
          That's {Math.round(totalMinutes / 60)} hours of pure vibes
        </p>
      </Glass>
    </motion.div>
  );
};

// ─── Slide 2 : Top Artist ───────────────────────────────────────
const SlideTopArtist: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const top3 = artists.slice(0, 3);
  const main = top3[0];
  if (!main) return <div className="absolute inset-0 bg-black" />;

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* blurred bg */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${main.image || fallbackImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transform: 'scale(1.3)',
          filter: 'blur(60px)',
          opacity: 0.3,
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/90" />

      {/* spotlight */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%)',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          animation: 'ws-pulse 3s ease-in-out infinite',
        }}
      />

      {/* artist images row */}
      <div className="relative z-10 flex items-end justify-center gap-4 mb-6">
        {top3[1] && (
          <motion.img
            src={top3[1].image || fallbackImage}
            alt={top3[1].name}
            className="rounded-2xl object-cover"
            style={{ width: 120, height: 120, opacity: 0.6, marginBottom: -20 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 0.6, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          />
        )}
        <motion.img
          src={main.image || fallbackImage}
          alt={main.name}
          className="rounded-2xl object-cover ring-4 ring-white/10"
          style={{ width: 180, height: 180 }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        />
        {top3[2] && (
          <motion.img
            src={top3[2].image || fallbackImage}
            alt={top3[2].name}
            className="rounded-2xl object-cover"
            style={{ width: 120, height: 120, opacity: 0.6, marginBottom: -20 }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 0.6, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          />
        )}
      </div>

      <div className="relative z-10 text-center mt-4">
        <p className="font-bold text-white" style={{ fontSize: 36 }}>
          {main.name}
        </p>
        <p style={{ fontSize: 18, color: GRAY_TEXT }}>
          {main.totalListens} plays this week
        </p>
        {(main.genres ?? []).length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {main.genres!.slice(0, 4).map((g) => (
              <span
                key={g}
                className="bg-white/10 border border-white/5 rounded-full px-3 py-1 text-white/70"
                style={{ fontSize: 10 }}
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Slide 3 : Connection Discovery ─────────────────────────────
const SlideConnection: React.FC<{ artists: Artist[]; songs: Song[] }> = ({ artists, songs }) => {
  const artist = artists[0];
  const song = songs[0];
  const matchPct = useMemo(() => 75 + Math.floor(Math.random() * 24), []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: `linear-gradient(180deg, #000 0%, ${CARD_BG} 100%)` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="relative z-10 flex items-center gap-6">
        <motion.img
          src={artist?.image || fallbackImage}
          alt={artist?.name ?? 'Artist'}
          className="rounded-xl object-cover"
          style={{ width: 140, height: 140 }}
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        />
        {/* connecting line */}
        <motion.div
          className="flex-shrink-0"
          style={{
            width: 60,
            height: 3,
            background: ACCENT_RED,
            borderRadius: 2,
            boxShadow: `0 0 12px ${ACCENT_RED}`,
          }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        />
        <motion.img
          src={song?.cover || fallbackImage}
          alt={song?.title ?? 'Song'}
          className="rounded-xl object-cover"
          style={{ width: 140, height: 140 }}
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        />
      </div>

      <motion.p
        className="relative z-10 font-bold text-white mt-8"
        style={{ fontSize: 48 }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
      >
        {matchPct}% Match
      </motion.p>
      <p className="relative z-10 mt-2 text-center px-8" style={{ fontSize: 14, color: GRAY_TEXT }}>
        {artist?.name ?? 'Your top artist'} and {song?.title ?? 'your top song'} are your perfect combo
      </p>
    </motion.div>
  );
};

// ─── Slide 4 : Album on Repeat ──────────────────────────────────
const SlideAlbumRepeat: React.FC<{ albums: Album[] }> = ({ albums }) => {
  const album = albums[0];
  const [lines, setLines] = useState<string[]>([]);
  const terminalLines = useMemo(
    () => [
      '> analyzing listening patterns...',
      `> album: ${album?.title ?? 'Unknown'}`,
      `> artist: ${album?.artist ?? 'Unknown'}`,
      `> plays: ${album?.totalListens ?? 0}`,
      '> verdict: absolute banger 🔥',
    ],
    [album],
  );

  useEffect(() => {
    setLines([]);
    const timers: ReturnType<typeof setTimeout>[] = [];
    terminalLines.forEach((line, i) => {
      timers.push(
        setTimeout(() => setLines((prev) => [...prev, line]), 600 + i * 700),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [terminalLines]);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <GridScan sensitivity={0.6} scanColor={PINK} />
      </div>

      {/* vinyl record */}
      <div
        className="absolute z-10 rounded-full"
        style={{
          width: 200,
          height: 200,
          background: 'radial-gradient(circle, #333 30%, #111 70%)',
          border: '2px solid #444',
          opacity: 0.5,
          animation: 'ws-spin 3s linear infinite',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <motion.img
        src={album?.cover || fallbackImage}
        alt={album?.title ?? 'Album'}
        className="relative z-20 rounded-2xl shadow-2xl object-cover"
        style={{ width: 220, height: 220 }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      />

      <div className="relative z-20 text-center mt-5">
        <p className="font-bold text-white" style={{ fontSize: 32 }}>
          {album?.title ?? 'No Album'}
        </p>
        <p style={{ fontSize: 20, color: GRAY_TEXT }}>{album?.artist ?? ''}</p>
        <p style={{ fontSize: 16, color: GRAY_TEXT }} className="mt-1">
          {album?.totalListens ?? 0} plays
        </p>
      </div>

      {/* terminal overlay */}
      <div
        className="absolute bottom-8 left-6 right-6 z-30 font-mono"
        style={{ fontSize: 12, color: PINK }}
      >
        {lines.map((l, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {l}
          </motion.p>
        ))}
      </div>
    </motion.div>
  );
};

// ─── Slide 5 : Musical Orbit ────────────────────────────────────
const SlideOrbit: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayData = useMemo(
    () =>
      days.map((d, i) => ({
        day: d,
        listens: songs[i]?.listens ?? (10 + i * 3),
        size: 10 + (songs[i]?.listens ?? (10 + i * 3)) * 0.4,
      })),
    [songs],
  );

  const stars = useMemo(
    () =>
      Array.from({ length: 30 }).map(() => ({
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 1 + Math.random() * 2,
        opacity: 0.2 + Math.random() * 0.4,
      })),
    [],
  );

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ background: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* stars */}
      {stars.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, opacity: s.opacity }}
        />
      ))}

      <div
        className="relative"
        style={{ width: 280, height: 280, perspective: '1000px', marginTop: -20 }}
      >
        <div style={{ transform: 'rotateX(15deg)', width: '100%', height: '100%', position: 'relative' }}>
          {/* center sphere */}
          <div
            className="absolute rounded-full"
            style={{
              width: 40,
              height: 40,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              background: `radial-gradient(circle, ${ACCENT_RED}, #000)`,
              boxShadow: `0 0 30px ${ACCENT_RED}, 0 0 60px rgba(250,45,72,0.3)`,
            }}
          />
          {/* orbit ring */}
          <div
            className="absolute rounded-full border border-white/10"
            style={{
              width: 240,
              height: 240,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%,-50%)',
              animation: 'ws-orbit 4s linear infinite',
            }}
          >
            {dayData.map((d, i) => {
              const angle = (i / 7) * 360;
              const rad = (angle * Math.PI) / 180;
              const r = 120;
              const x = Math.cos(rad) * r;
              const y = Math.sin(rad) * r;
              const sz = Math.min(Math.max(d.size, 10), 28);
              return (
                <div
                  key={d.day}
                  className="absolute flex flex-col items-center"
                  style={{
                    top: `calc(50% + ${y}px - ${sz / 2}px)`,
                    left: `calc(50% + ${x}px - ${sz / 2}px)`,
                  }}
                >
                  <div
                    className="rounded-full bg-white"
                    style={{ width: sz, height: sz, opacity: 0.4 + (i / 7) * 0.5 }}
                  />
                  <span
                    className="text-white/60 mt-1 whitespace-nowrap"
                    style={{
                      fontSize: 8,
                      transform: `rotate(-${(i / 7) * 360}deg)`,
                    }}
                  >
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="relative z-10 font-bold text-white mt-4" style={{ fontSize: 28 }}>
        Your Musical Orbit
      </p>
    </motion.div>
  );
};

// ─── Slide 6 : Peak Listening Hour ──────────────────────────────
const SlidePeakHour: React.FC = () => {
  const peakHour = 21 as number; // 9 PM mock
  const display = peakHour === 0 ? '12:00 AM' : peakHour === 12 ? '12:00 PM' : peakHour > 12 ? `${peakHour - 12}:00 PM` : `${peakHour}:00 AM`;
  const hourAngle = ((peakHour % 12) / 12) * 360 - 90;
  const minuteAngle = -90; // pointing at 12

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <GridScan sensitivity={0.55} scanColor={CYAN} />
      </div>

      <Glass className="relative z-10 flex items-center justify-center" style={{ padding: 24 }}>
        <svg width={250} height={250} viewBox="0 0 250 250">
          {/* clock face */}
          <circle cx={125} cy={125} r={120} fill="#000" stroke="#fff" strokeWidth={2} />
          {/* hour dots */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = ((i / 12) * 360 - 90) * (Math.PI / 180);
            const r = 105;
            const cx = 125 + Math.cos(a) * r;
            const cy = 125 + Math.sin(a) * r;
            const isPeak = i === peakHour % 12;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={isPeak ? 6 : 3}
                fill={isPeak ? CYAN : '#fff'}
                opacity={isPeak ? 1 : 0.5}
              >
                {isPeak && (
                  <animate attributeName="r" values="6;8;6" dur="1.5s" repeatCount="indefinite" />
                )}
              </circle>
            );
          })}
          {/* minute hand */}
          <line
            x1={125}
            y1={125}
            x2={125 + Math.cos(minuteAngle * (Math.PI / 180)) * 80}
            y2={125 + Math.sin(minuteAngle * (Math.PI / 180)) * 80}
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* hour hand */}
          <motion.line
            x1={125}
            y1={125}
            x2={125 + Math.cos(hourAngle * (Math.PI / 180)) * 55}
            y2={125 + Math.sin(hourAngle * (Math.PI / 180)) * 55}
            stroke={CYAN}
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          />
          {/* center dot */}
          <circle cx={125} cy={125} r={4} fill={CYAN} />
          {/* time text */}
          <text x={125} y={175} textAnchor="middle" fill="#fff" fontSize={28} fontWeight="bold">
            {display}
          </text>
        </svg>
      </Glass>

      <p className="relative z-10 mt-6" style={{ fontSize: 20, color: GRAY_TEXT }}>
        Your peak hour was <span className="text-white font-bold">{display}</span>
      </p>
    </motion.div>
  );
};

// ─── Slide 7 : Top 3 Songs ─────────────────────────────────────
const SlideTrifecta: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const top3 = songs.slice(0, 3);
  const rankColors = [ACCENT_RED, PURPLE, CYAN];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{
        background: `radial-gradient(circle at center, rgba(138,92,255,0.15), #000 70%)`,
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2
        className="relative z-10 font-bold mb-6"
        style={{
          fontSize: 32,
          background: `linear-gradient(90deg, #fff, ${PURPLE}, #fff)`,
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'ws-shimmer 3s linear infinite',
        }}
      >
        Your Trifecta
      </h2>

      <div className="relative z-10 flex flex-col gap-4 w-full max-w-md">
        {top3.map((song, i) => (
          <motion.div
            key={song.id}
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 + i * 0.15, type: 'spring', stiffness: 120 }}
          >
            <Glass className="flex items-center p-4 gap-4">
              <div
                className="flex-shrink-0 rounded-full flex items-center justify-center text-white font-bold"
                style={{ width: 32, height: 32, fontSize: 14, background: rankColors[i] }}
              >
                {i + 1}
              </div>
              <img
                src={song.cover || fallbackImage}
                alt={song.title}
                className="rounded-lg object-cover flex-shrink-0"
                style={{ width: 80, height: 80 }}
              />
              <div className="min-w-0">
                <p className="font-bold text-white truncate" style={{ fontSize: 18 }}>
                  {song.title}
                </p>
                <p className="truncate" style={{ fontSize: 14, color: GRAY_TEXT }}>
                  {song.artist}
                </p>
                <p style={{ fontSize: 16, color: GRAY_TEXT }}>{song.listens} plays</p>
              </div>
            </Glass>
          </motion.div>
        ))}

        {top3.length === 0 && (
          <p className="text-center" style={{ color: GRAY_TEXT }}>
            No songs tracked yet
          </p>
        )}
      </div>
    </motion.div>
  );
};

// ─── Slide 8 : Genre Mix ────────────────────────────────────────
const SlideGenreMix: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const genres = useMemo(() => computeGenres(artists), [artists]);

  // SVG donut params
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <ColorBends colors={['#ff5c7a', PURPLE, CYAN]} speed={0.2} />
      </div>

      <h2 className="relative z-10 font-bold text-white mb-6" style={{ fontSize: 32 }}>
        Your Flavor Palette
      </h2>

      <Glass className="relative z-10 flex flex-col items-center p-8">
        <svg width={200} height={200} viewBox="0 0 200 200">
          {genres.map((g) => {
            const dashLen = (g.pct / 100) * circumference;
            const offset = -(cumulative / 100) * circumference;
            cumulative += g.pct;
            return (
              <motion.circle
                key={g.name}
                cx={100}
                cy={100}
                r={radius}
                fill="none"
                stroke={g.color}
                strokeWidth={20}
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              />
            );
          })}
        </svg>

        <div className="mt-4 flex flex-col gap-2 w-full">
          {genres.map((g) => (
            <div key={g.name} className="flex items-center gap-2">
              <div className="rounded-full" style={{ width: 10, height: 10, background: g.color }} />
              <span className="text-white/80" style={{ fontSize: 14 }}>
                {g.name}
              </span>
              <span className="ml-auto" style={{ fontSize: 14, color: GRAY_TEXT }}>
                {g.pct}%
              </span>
            </div>
          ))}
        </div>
      </Glass>

      <p className="relative z-10 mt-4 px-8 text-center" style={{ fontSize: 14, color: GRAY_TEXT }}>
        Your ears don't pick favorites — they pick vibes
      </p>
    </motion.div>
  );
};

// ─── Slide 9 : Outro ────────────────────────────────────────────
const SlideOutro: React.FC<{ totalMinutes: number; artists: Artist[]; songs: Song[] }> = ({
  totalMinutes,
  artists,
  songs,
}) => {
  const topGenre = useMemo(() => {
    const genres = computeGenres(artists);
    return genres[0]?.name ?? 'Pop';
  }, [artists]);

  const emojis = useMemo(
    () =>
      ['🎵', '🎧', '✨', '🎶', '🎵', '🎧', '✨', '🎶', '🎵', '🎧'].map((e, i) => ({
        emoji: e,
        left: 5 + Math.random() * 90,
        top: Math.random() * 100,
        dx: `${-30 + Math.random() * 60}px`,
        dy: `${-80 - Math.random() * 60}px`,
        dr: `${-40 + Math.random() * 80}deg`,
        delay: Math.random() * 4,
        dur: 4 + Math.random() * 3,
      })),
    [],
  );

  const stats = [
    { label: 'songs', value: songs.length },
    { label: 'artists', value: artists.length },
    { label: 'minutes', value: totalMinutes },
    { label: 'top genre', value: topGenre },
  ];

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: '#000' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="absolute inset-0 pointer-events-none">
        <ColorBends colors={['#ff5c7a', PURPLE, CYAN]} speed={0.2} />
      </div>

      {/* floating emojis */}
      {emojis.map((e, i) => (
        <span
          key={i}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${e.left}%`,
            top: `${e.top}%`,
            fontSize: 24,
            '--dx': e.dx,
            '--dy': e.dy,
            '--dr': e.dr,
            animation: `ws-drift ${e.dur}s ease-out ${e.delay}s infinite`,
          } as React.CSSProperties}
        >
          {e.emoji}
        </span>
      ))}

      <h1
        className="relative z-10 font-bold text-center px-6"
        style={{
          fontSize: 64,
          lineHeight: 1.1,
          background: `linear-gradient(90deg, #fff, ${ACCENT_RED}, #fff)`,
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'ws-shimmer 3s linear infinite',
        }}
      >
        See You Next Week
      </h1>

      {/* micro stats */}
      <div className="relative z-10 flex gap-3 mt-8 flex-wrap justify-center px-4">
        {stats.map((s) => (
          <Glass key={s.label} className="px-4 py-3 text-center" style={{ minWidth: 80 }}>
            <p className="font-bold text-white" style={{ fontSize: 18 }}>
              {s.value}
            </p>
            <p style={{ fontSize: 11, color: GRAY_TEXT }}>{s.label}</p>
          </Glass>
        ))}
      </div>

      {/* CTA buttons */}
      <div className="relative z-10 flex gap-4 mt-8">
        <button className="bg-white text-black font-semibold rounded-full px-6 py-3 text-sm hover:opacity-90 transition-opacity">
          Share Your Week
        </button>
        <button className="border border-white/20 text-white font-semibold rounded-full px-6 py-3 text-sm hover:bg-white/10 transition-colors">
          Explore More
        </button>
      </div>
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactedRef = useRef(false);

  useEffect(() => {
    injectKeyframes();
  }, []);

  // Auto-advance
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
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
      setCurrentSlide(clamped);
      resetTimer();
      interactedRef.current = false;
    },
    [resetTimer],
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
        return <SlideIntro />;
      case 1:
        return <SlideListeningTime totalMinutes={totalMinutes || 0} />;
      case 2:
        return <SlideTopArtist artists={artists} />;
      case 3:
        return <SlideConnection artists={artists} songs={songs} />;
      case 4:
        return <SlideAlbumRepeat albums={albums} />;
      case 5:
        return <SlideOrbit songs={songs} />;
      case 6:
        return <SlidePeakHour />;
      case 7:
        return <SlideTrifecta songs={songs} />;
      case 8:
        return <SlideGenreMix artists={artists} />;
      case 9:
        return (
          <SlideOutro totalMinutes={totalMinutes || 0} artists={artists} songs={songs} />
        );
      default:
        return null;
    }
  }, [currentSlide, totalMinutes, artists, albums, songs]);

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

      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          className="absolute inset-0"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.35 }}
        >
          {slideContent}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default WrappedSlides;
