import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft } from 'lucide-react';
import { Artist, Album, Song } from '../types';
import { ObsessionOrbitSlide } from './ObsessionOrbitSlide';
import { fetchHeatmapData } from '../services/dbService';

// --- Configuration ---
const NB = {
  acidYellow: '#CCFF00',
  electricBlue: '#1A6BFF',
  coral: '#FF4D2E',
  magenta: '#FF0080',
  black: '#000000',
  white: '#FFFFFF',
  nearBlack: '#0D0D0D',
};

const SLIDES = [
  'INTRO',
  'MINUTES',
  'TOP_ARTIST',
  'TOP_SONGS',
  'OBSESSION',
  'FRUIT',
  'SUMMARY'
];

const fallbackImage = 'https://ui-avatars.com/api/?background=0D0D0D&color=fff&size=128&bold=true';

const FRUIT_PROFILES = [
  { name: 'MANGO', emoji: '🥭', v: [60, 40, 30], vibe: 'warm, steady vibes with loyal favorites' },
  { name: 'PINEAPPLE', emoji: '🍍', v: [80, 70, 90], vibe: 'high energy explorer always finding new hits' },
  { name: 'CHERRY', emoji: '🍒', v: [70, 20, 40], vibe: 'intense replay love for a few obsessions' },
  { name: 'BANANA', emoji: '🍌', v: [30, 20, 10], vibe: 'comfort listening on a cozy loop' },
  { name: 'BLUEBERRY', emoji: '🫐', v: [40, 80, 70], vibe: 'chill night explorer with deep cuts' },
  { name: 'WATERMELON', emoji: '🍉', v: [50, 50, 50], vibe: 'perfectly balanced and refreshing sessions' },
  { name: 'KIWI', emoji: '🥝', v: [90, 80, 80], vibe: 'sharp, tangy taste with wild variety' },
  { name: 'PEACH', emoji: '🍑', v: [40, 30, 60], vibe: 'soft, sweet discovery in the late hours' },
  { name: 'APPLE', emoji: '🍎', v: [50, 30, 20], vibe: 'crisp, structured routine with trusted classics' },
  { name: 'STRAWBERRY', emoji: '🍓', v: [70, 40, 30], vibe: 'sweet, energetic favorites on repeat' },
  { name: 'DRAGON FRUIT', emoji: '🐉', v: [85, 90, 85], vibe: 'rare, exotic taste with unpredictable shifts' },
  { name: 'LEMON', emoji: '🍋', v: [95, 60, 50], vibe: 'zesty, high-intensity sessions that wake you up' },
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

type HistoryRow = { played_at: string; duration_ms: number; track_name?: string; id?: string; title?: string };
type DnaMetrics = {
  nightOwl: number;
  freshFinds: number;
  deepSessions: number;
  replayLove: number;
  routine: number;
  artistVariety: number;
  moodSwing: number;
  skipResistance: number;
  notes: string[];
  reasonSummary: string;
};

// --- Hooks ---
function useOdometer(value: number, duration: number = 1000) {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = displayValue;
    let end = value;
    if (start === end) return;
    let startTime = performance.now();
    let frame: number;
    const animate = (now: number) => {
      let progress = Math.min(1, (now - startTime) / duration);
      setDisplayValue(Math.floor(start + (end - start) * progress));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return displayValue;
}

// --- DNA Logic ---

function normalizeToPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeDnaMetrics(historyRows: HistoryRow[], songs: Song[]): DnaMetrics {
  const safeHistory = historyRows.filter((item) => !!item.played_at);
  const totalSongListens = Math.max(1, songs.reduce((sum, song) => sum + (song.listens || (song as any).plays || 0), 0));
  const sortedAsc = [...safeHistory].sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());

  const lateNightPlays = safeHistory.filter((row) => {
    const hr = new Date(row.played_at).getHours();
    return hr >= 21 || hr <= 3;
  }).length;

  const trackSeen = new Set<string>();
  const artistSeen = new Set<string>();
  const trackTimeline: string[] = [];
  let firstListenCount = 0;
  for (const row of sortedAsc) {
    const key = (row.track_name || row.title || '').toLowerCase();
    if (!key) continue;
    if (!trackSeen.has(key)) {
      firstListenCount++;
      trackSeen.add(key);
    }
    trackTimeline.push(key);
    const guessedArtist = key.split(' - ')[0];
    if (guessedArtist) artistSeen.add(guessedArtist);
  }

  let sessions = 0;
  let sessionMs = 0;
  let currentSession = 0;
  let lastEnd = 0;
  const sessionTracks: number[] = [];
  for (const row of sortedAsc) {
    const start = new Date(row.played_at).getTime();
    const dur = row.duration_ms || 0;
    if (!lastEnd || start - lastEnd > 25 * 60 * 1000) {
      if (currentSession > 0) {
        sessions++;
        sessionMs += currentSession;
      }
      if (sessionTracks.length < sessions + 1) sessionTracks.push(0);
      currentSession = dur;
    } else {
      currentSession += dur;
    }
    sessionTracks[sessionTracks.length - 1] = (sessionTracks[sessionTracks.length - 1] || 0) + 1;
    lastEnd = start + dur;
  }
  if (currentSession > 0) {
    sessions++;
    sessionMs += currentSession;
  }

  const totalPlays = Math.max(1, safeHistory.length);
  const dailySet = new Set(safeHistory.map((row) => new Date(row.played_at).toDateString()));
  const topSongShare = ((songs[0]?.listens || (songs[0] as any)?.plays || 0)) / totalSongListens;
  const avgSessionMins = (sessionMs / Math.max(1, sessions)) / 60000;

  const hourBins = Array.from({ length: 24 }, () => 0);
  for (const row of safeHistory) {
    hourBins[new Date(row.played_at).getHours()] += 1;
  }
  const totalHours = hourBins.reduce((sum, n) => sum + n, 0) || 1;
  const meanHour = hourBins.reduce((sum, count, hour) => sum + hour * count, 0) / totalHours;
  const hourVariance = hourBins.reduce((sum, count, hour) => sum + count * Math.pow(hour - meanHour, 2), 0) / totalHours;

  let consecutiveRepeats = 0;
  for (let i = 1; i < trackTimeline.length; i++) {
    if (trackTimeline[i] === trackTimeline[i - 1]) consecutiveRepeats++;
  }

  const nightOwl = normalizeToPercent((lateNightPlays / totalPlays) * 180);
  const freshFinds = normalizeToPercent((firstListenCount / totalPlays) * 140);
  const deepSessions = normalizeToPercent((avgSessionMins / 85) * 100);
  const replayLove = normalizeToPercent(Math.pow(topSongShare, 0.82) * 230);
  const routine = normalizeToPercent((dailySet.size / Math.max(dailySet.size + 15, 30)) * 100);
  const artistVariety = normalizeToPercent((artistSeen.size / Math.max(1, totalPlays)) * 300);
  const moodSwing = normalizeToPercent(Math.min(1, hourVariance / 45) * 100);
  const skipResistance = normalizeToPercent(Math.max(0, 100 - (consecutiveRepeats / Math.max(1, totalPlays)) * 120 + (sessionTracks.length > 0 ? (sessionTracks[0] * 4) : 0)));

  return {
    nightOwl,
    freshFinds,
    deepSessions,
    replayLove,
    routine,
    artistVariety,
    moodSwing,
    skipResistance,
    notes: [
      `${lateNightPlays} late-night plays`,
      `${firstListenCount} first-time track moments`,
      `${Math.round(avgSessionMins)}m avg session`,
    ],
    reasonSummary: `High ${nightOwl >= 70 ? 'night-owl' : 'daytime'} energy, ${artistVariety >= 65 ? 'broad variety' : 'focused favorites'}, and ${replayLove >= 70 ? 'strong replay love' : 'balanced replay behavior'}.`,
  };
}

function pickFruitFromMetrics(metrics: DnaMetrics) {
  const energy = (metrics.nightOwl + metrics.deepSessions) / 2;
  const variety = metrics.artistVariety;
  const discovery = metrics.freshFinds;
  const userVec = [energy, variety, discovery];

  return FRUIT_PROFILES
    .map((f) => {
      const distance = Math.sqrt(
        Math.pow(userVec[0] - f.v[0], 2) +
        Math.pow(userVec[1] - f.v[1], 2) +
        Math.pow(userVec[2] - f.v[2], 2)
      );
      return { ...f, score: distance };
    })
    .sort((a, b) => a.score - b.score)[0];
}

function buildFruitDnaSequence(metrics: DnaMetrics, songs: Song[], historyRows: HistoryRow[], fruitName: string): string {
  const vectorPart = [metrics.nightOwl, metrics.freshFinds, metrics.deepSessions, metrics.replayLove, metrics.routine, metrics.artistVariety, metrics.moodSwing, metrics.skipResistance].map((v) => Math.round(v / 2)).join('-');
  const stableSongPart = songs.slice(0, 6).map((s) => `${s.id || s.title}:${s.listens || (s as any).plays || 0}`).join('|');
  const stableHistoryPart = historyRows.slice(0, 50).map((row) => `${row.track_name || row.title || 'x'}@${row.played_at.slice(0, 10)}`).join('|');
  const seedBase = `${fruitName}|${vectorPart}|${stableSongPart}|${historyRows.length}|${stableHistoryPart}`;
  let seed = 2166136261;
  for (let i = 0; i < seedBase.length; i++) {
    seed ^= seedBase.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }

  const nucleotides = ['A', 'T', 'C', 'G'] as const;
  const complements: Record<string, string> = { A: 'T', T: 'A', C: 'G', G: 'C' };
  let strand = '';
  for (let i = 0; i < 24; i++) {
    seed = Math.imul(seed ^ (seed >>> 13), 1103515245) + 12345;
    strand += nucleotides[Math.abs(seed) % 4];
  }
  const paired = strand.split('').map((base) => `${base}${complements[base]}`).join('');
  return paired;
}

// --- Reusable Components ---

const BrutalistButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string; color?: string }> = ({ onClick, children, className, color = NB.white }) => (
  <button
    onClick={onClick}
    className={`border-4 border-black shadow-[4px_4px_0_#000] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all font-barlow-condensed font-black uppercase tracking-wider px-6 py-3 text-lg cursor-pointer ${className}`}
    style={{ backgroundColor: color, color: NB.black }}
  >
    {children}
  </button>
);

const SlideHeader: React.FC<{ title: string; subtitle?: string; color?: string }> = ({ title, subtitle, color = NB.white }) => (
  <div className="mb-6 relative z-10">
    {subtitle && <p className="font-barlow font-bold text-xs tracking-[0.2em] text-[#888] uppercase mb-1">{subtitle}</p>}
    <h1 className="font-barlow-condensed font-black text-5xl sm:text-6xl uppercase leading-[0.85]" style={{ color }}>
      {title}
    </h1>
  </div>
);

const Ticker: React.FC<{ text: string; bg?: string; color?: string }> = ({ text, bg = NB.acidYellow, color = NB.black }) => (
  <div className="h-10 border-t-4 border-black flex items-center overflow-hidden whitespace-nowrap shrink-0" style={{ backgroundColor: bg }}>
    <div className="flex animate-[ticker_20s_linear_infinite]">
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i} className="font-barlow-condensed font-black text-xl uppercase tracking-widest px-4" style={{ color }}>
          {text} •
        </span>
      ))}
    </div>
    <style>{`
      @keyframes ticker {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
    `}</style>
  </div>
);

// --- Slides ---

const IntroSlide: React.FC<{ rangeLabel: string }> = ({ rangeLabel }) => (
  <div className="flex-1 flex flex-col justify-center items-center bg-[#CCFF00] p-6 text-center border-t-4 border-b-4 border-black">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: 'spring' }}
    >
      <div className="inline-block bg-black text-white px-4 py-1 mb-4 font-barlow font-bold tracking-widest text-sm uppercase">
        {rangeLabel || 'YOUR YEAR'}
      </div>
      <h1 className="font-barlow-condensed font-black text-[clamp(60px,18vw,120px)] leading-[0.8] text-black uppercase drop-shadow-[4px_4px_0_rgba(255,255,255,0.5)]">
        LOTUS<br/>WRAPPED
      </h1>
      <p className="font-barlow font-bold text-black mt-6 text-lg tracking-widest uppercase">
        READY TO SEE YOUR STATS?
      </p>
    </motion.div>
  </div>
);

const MinutesSlide: React.FC<{ totalMinutes: number }> = ({ totalMinutes }) => (
  <div className="flex-1 flex flex-col justify-center p-6 bg-[#0D0D0D] relative overflow-hidden">
    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(${NB.white} 1px, transparent 1px)`, backgroundSize: '20px 20px' }} />

    <SlideHeader title="THE DEVOUR" subtitle="TIME SPENT LISTENING" color={NB.acidYellow} />

    <div className="relative z-10 border-4 border-white p-8 bg-black shadow-[8px_8px_0_#333]">
      <p className="font-barlow font-bold text-[#888] text-sm tracking-widest uppercase mb-2">TOTAL MINUTES</p>
      <h2 className="font-barlow-condensed font-black text-[clamp(60px,15vw,100px)] leading-[0.85] text-white">
        {totalMinutes.toLocaleString()}
      </h2>
      <div className="w-full h-1 bg-[#333] my-6 relative overflow-hidden">
        <motion.div
           initial={{ width: 0 }}
           animate={{ width: '100%' }}
           transition={{ duration: 1.5, delay: 0.5 }}
           className="h-full bg-[#CCFF00]"
        />
      </div>
      <p className="font-barlow font-bold text-white text-lg">
        THAT'S <span style={{ color: NB.acidYellow }}>{Math.round(totalMinutes / 60)} HOURS</span> OF PURE VIBES.
      </p>
    </div>
  </div>
);

const TopArtistSlide: React.FC<{ artist: Artist }> = ({ artist }) => (
  <div className="flex-1 flex flex-col p-6 bg-[#1A6BFF] relative overflow-hidden">
    <div className="absolute inset-0 bg-black/10 z-0" style={{ backgroundImage: `linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)`, backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px', opacity: 0.1 }} />

    <SlideHeader title="TOP ARTIST" subtitle="WHO CONTROLLED THE AUX" color={NB.white} />

    <div className="flex-1 flex flex-col items-center justify-center relative z-10">
      <motion.div
        initial={{ rotate: -5, scale: 0.9, opacity: 0 }}
        animate={{ rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="relative w-full max-w-[320px] aspect-[3/4] bg-white border-[6px] border-black shadow-[12px_12px_0_rgba(0,0,0,0.5)] flex flex-col"
      >
        <div className="flex-1 relative overflow-hidden bg-black border-b-[6px] border-black">
          <img src={artist.image || fallbackImage} alt={artist.name} className="w-full h-full object-cover grayscale contrast-125" />
          <div className="absolute top-4 right-4 bg-[#CCFF00] border-2 border-black px-3 py-1 font-barlow-condensed font-black text-xl text-black -rotate-6 shadow-[4px_4px_0_#000]">
            #1
          </div>
        </div>
        <div className="h-[100px] bg-white p-4 flex flex-col justify-center">
          <h2 className="font-barlow-condensed font-black text-4xl text-black leading-[0.9] uppercase truncate">{artist.name}</h2>
          <div className="flex justify-between items-end mt-2">
            <p className="font-barlow font-bold text-sm text-[#555] uppercase tracking-wider">TOTAL PLAYS</p>
            <p className="font-barlow-condensed font-black text-3xl text-black">{(artist.totalListens || (artist as any).totalPlays || 0).toLocaleString()}</p>
          </div>
        </div>
      </motion.div>
    </div>
  </div>
);

const TopSongsSlide: React.FC<{ songs: Song[] }> = ({ songs }) => (
  <div className="flex-1 flex flex-col p-6 bg-[#FF4D2E] relative overflow-hidden">
    <SlideHeader title="TOP SONGS" subtitle="YOUR REPEAT OFFENDERS" color={NB.white} />

    <div className="flex-1 flex flex-col gap-3 relative z-10 overflow-y-auto no-scrollbar">
      {songs.slice(0, 5).map((song, i) => (
        <motion.div
          key={song.id}
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center bg-black border-[3px] border-white p-3 shadow-[6px_6px_0_rgba(0,0,0,0.3)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0_rgba(0,0,0,0.3)] transition-all"
        >
          <div className="w-10 h-10 flex items-center justify-center font-barlow-condensed font-black text-3xl text-[#CCFF00] border-r-[3px] border-[#333] mr-4 pr-4">
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-barlow-condensed font-bold text-xl text-white uppercase truncate">{song.title}</p>
            <p className="font-barlow text-xs text-[#888] uppercase truncate">{song.artist}</p>
          </div>
          <div className="text-right pl-2">
            <p className="font-barlow-condensed font-bold text-lg text-white">{song.listens || (song as any).plays || 0}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const FruitSlide: React.FC<{ songs: Song[]; historyRows: HistoryRow[] }> = ({ songs, historyRows }) => {
  const metrics = useMemo(() => computeDnaMetrics(historyRows, songs), [historyRows, songs]);
  const winningFruit = useMemo(() => pickFruitFromMetrics(metrics), [metrics]);
  const dnaSequence = useMemo(() => buildFruitDnaSequence(metrics, songs, historyRows, winningFruit?.name || 'MANGO'), [metrics, songs, historyRows, winningFruit]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#FF0080] text-center relative overflow-hidden">
       <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/noise-lines.png')] opacity-20" />

       <motion.div
         initial={{ scale: 0.5, opacity: 0 }}
         animate={{ scale: 1, opacity: 1 }}
         transition={{ type: 'spring' }}
         className="relative z-10 bg-white border-[6px] border-black p-8 shadow-[12px_12px_0_#000] max-w-sm w-full"
       >
         <p className="font-barlow font-bold text-sm tracking-[0.2em] text-[#888] uppercase mb-4">IDENTITY SCAN</p>
         <div className="w-32 h-32 mx-auto bg-black rounded-full border-4 border-black flex items-center justify-center text-6xl mb-6 shadow-[4px_4px_0_#888]">
            {winningFruit?.emoji || '🥭'}
         </div>
         <h2 className="font-barlow-condensed font-black text-5xl text-black uppercase leading-none mb-2">{winningFruit?.name || 'MANGO'}</h2>
         <p className="font-barlow font-bold text-black text-sm uppercase leading-tight">
            {winningFruit?.vibe || 'BALANCED EXPLORER ENERGY WITH STEADY HABITS.'}
         </p>
         <div className="mt-6 flex flex-wrap justify-center gap-1">
            {dnaSequence.split('').map((l, i) => (
                <span key={i} className="w-6 h-6 flex items-center justify-center bg-black text-white font-mono text-[10px] font-bold border border-black">{l}</span>
            ))}
         </div>
       </motion.div>
    </div>
  );
};

const SummarySlide: React.FC<{ totalMinutes: number; topArtist: Artist; topSong: Song; onClose: () => void }> = ({ totalMinutes, topArtist, topSong, onClose }) => (
  <div className="flex-1 flex flex-col p-6 bg-[#0D0D0D] relative overflow-hidden">
    <SlideHeader title="THE RECEIPT" subtitle="YOUR YEAR IN REVIEW" color={NB.white} />

    <div className="flex-1 bg-white border-x-[6px] border-t-[6px] border-b-[6px] border-dashed border-b-transparent border-black relative mb-8 p-6 font-mono text-sm uppercase">
       <div className="border-b-2 border-black border-dashed pb-4 mb-4 flex justify-between">
          <span>LOTUS WRAPPED</span>
          <span>2026</span>
       </div>

       <div className="space-y-4">
          <div className="flex justify-between">
             <span className="text-[#555]">TOTAL TIME</span>
             <span className="font-bold">{totalMinutes.toLocaleString()} MIN</span>
          </div>
          <div className="flex justify-between">
             <span className="text-[#555]">TOP ARTIST</span>
             <span className="font-bold text-right max-w-[60%]">{topArtist?.name}</span>
          </div>
          <div className="flex justify-between">
             <span className="text-[#555]">TOP SONG</span>
             <span className="font-bold text-right max-w-[60%]">{topSong?.title}</span>
          </div>
          <div className="flex justify-between">
             <span className="text-[#555]">OBSESSION</span>
             <span className="font-bold text-right max-w-[60%]">{topArtist?.name}</span>
          </div>
       </div>

       <div className="border-t-2 border-black border-dashed pt-4 mt-8 text-center">
          <p className="font-bold text-2xl">THANKS FOR LISTENING</p>
          <p className="text-xs mt-1">LOTUS STATS • GENERATED 2026</p>
       </div>

       {/* Jagged bottom edge simulation */}
       <div className="absolute -bottom-[12px] left-0 right-0 h-[12px] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAxMCIgcHJlc2VydmVBc3BlY3RSYXRpbz0ibm9uZSI+PHBhdGggZD0iTTAgMGwxMCAxMCAxMC0xMFoiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')] bg-repeat-x bg-[length:20px_10px]" />
    </div>

    <BrutalistButton onClick={onClose} color={NB.acidYellow} className="w-full">
      CLOSE WRAPPED
    </BrutalistButton>
  </div>
);

// --- Main Container ---

export default function WrappedSlides({ onClose, totalMinutes, artists, songs, rangeLabel, historyRows }: WrappedSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [internalHistory, setInternalHistory] = useState<any[]>([]);

  useEffect(() => {
    if (historyRows && historyRows.length > 0) return;

    let cancelled = false;
    fetchHeatmapData().then((data) => {
      if (!cancelled && data) {
        setInternalHistory(data);
      }
    });
    return () => { cancelled = true; };
  }, [historyRows]);

  const effectiveHistory = historyRows || internalHistory;

  const next = () => {
    if (currentSlide < SLIDES.length - 1) {
      setDirection(1);
      setCurrentSlide(c => c + 1);
    } else {
        onClose();
    }
  };

  const prev = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(c => c - 1);
    }
  };

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0 }),
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black overflow-hidden">
      {/* Header with Close */}
      <div className="absolute top-0 left-0 right-0 z-[110] flex justify-end p-4">
        <button
          onClick={onClose}
          className="bg-white border-[3px] border-black p-1 shadow-[3px_3px_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
        >
          <X size={20} className="text-black" />
        </button>
      </div>

      {/* Navigation Areas */}
      <div className="absolute inset-y-0 left-0 w-1/4 z-40" onClick={prev} />
      <div className="absolute inset-y-0 right-0 w-1/4 z-40" onClick={next} />

      {/* Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-black z-[110] flex gap-1 px-4 pt-10">
        {SLIDES.map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-white/20 overflow-hidden">
            <motion.div
              initial={false}
              animate={{ width: i < currentSlide ? '100%' : i === currentSlide ? '100%' : '0%' }}
              transition={{ duration: i === currentSlide ? 5 : 0.3 }}
              className="h-full bg-white"
            />
          </div>
        ))}
      </div>

      {/* Slide Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden mt-12 mb-10">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex-1 flex flex-col relative w-full h-full"
          >
            {currentSlide === 0 && <IntroSlide rangeLabel={rangeLabel || 'YEAR'} />}
            {currentSlide === 1 && <MinutesSlide totalMinutes={totalMinutes} />}
            {currentSlide === 2 && <TopArtistSlide artist={artists[0]} />}
            {currentSlide === 3 && <TopSongsSlide songs={songs} />}
            {currentSlide === 4 && <ObsessionOrbitSlide active={currentSlide === 4} artists={artists} history={effectiveHistory} />}
            {currentSlide === 5 && <FruitSlide songs={songs} historyRows={effectiveHistory} />}
            {currentSlide === 6 && <SummarySlide totalMinutes={totalMinutes} topArtist={artists[0]} topSong={songs[0]} onClose={onClose} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Ticker at Bottom */}
      <Ticker text="LOTUS WRAPPED 2026 • YOUR YEAR IN MUSIC • LOTUS STATS" />
    </div>
  );
}
