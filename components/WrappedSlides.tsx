import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Volume2, VolumeX, ChevronRight, ChevronLeft } from 'lucide-react';
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
          <img src={artist.image} alt={artist.name} className="w-full h-full object-cover grayscale contrast-125" />
          <div className="absolute top-4 right-4 bg-[#CCFF00] border-2 border-black px-3 py-1 font-barlow-condensed font-black text-xl text-black -rotate-6 shadow-[4px_4px_0_#000]">
            #1
          </div>
        </div>
        <div className="h-[100px] bg-white p-4 flex flex-col justify-center">
          <h2 className="font-barlow-condensed font-black text-4xl text-black leading-[0.9] uppercase truncate">{artist.name}</h2>
          <div className="flex justify-between items-end mt-2">
            <p className="font-barlow font-bold text-sm text-[#555] uppercase tracking-wider">TOTAL PLAYS</p>
            <p className="font-barlow-condensed font-black text-3xl text-black">{artist.totalListens.toLocaleString()}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Fruit profile data (Simplified 3-Axis "Flavor Cube": [Energy, Variety, Discovery])
// Energy: 0 (Chill) -> 100 (Intense)
// Variety: 0 (Loyalist) -> 100 (Explorer)
// Discovery: 0 (Nostalgic) -> 100 (Fresh)
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
const SLIDE4_BG_EMOJIS = ['🎵','✨','🎶','💿','🎧','🎤','🎼','🎹','🎸','🎺','🥁','🎻'];

type HistoryRow = { played_at: string; duration_ms: number; track_name?: string };
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

const DNA_METRIC_CONFIG: Array<{ key: keyof Omit<DnaMetrics, 'notes' | 'reasonSummary'>; label: string; hint: string; color: string; textColor?: string }> = [
  { key: 'nightOwl', label: 'NIGHT OWL', hint: 'Late-night play ratio', color: NB.electricBlue },
  { key: 'freshFinds', label: 'FRESH FINDS', hint: 'How often you discover new tracks', color: NB.coral },
  { key: 'deepSessions', label: 'SESSION DEPTH', hint: 'Average session intensity', color: NB.magenta },
  { key: 'replayLove', label: 'REPLAY LOVE', hint: 'Repeat loyalty to favorites', color: NB.acidYellow },
  { key: 'routine', label: 'ROUTINE', hint: 'Consistency across days', color: NB.nearBlack, textColor: NB.white },
  { key: 'artistVariety', label: 'VARIETY', hint: 'How many artists are in your active rotation', color: '#14B8A6' },
  { key: 'moodSwing', label: 'MOOD SWING', hint: 'How sharply your sessions change vibe', color: '#7C3AED' },
  { key: 'skipResistance', label: 'SKIP RESISTANCE', hint: 'How often tracks finish before switching', color: '#0EA5E9' },
];

function normalizeToPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeDnaMetrics(historyRows: HistoryRow[], songs: Song[]): DnaMetrics {
  const safeHistory = historyRows.filter((item) => !!item.played_at);
  const totalSongListens = Math.max(1, songs.reduce((sum, song) => sum + song.listens, 0));
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
    const key = (row.track_name || '').toLowerCase();
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
  const topSongShare = (songs[0]?.listens || 0) / totalSongListens;
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

  const varietyRatio = artistSeen.size / Math.max(1, Math.sqrt(totalPlays));
  const medianSessionTracks = [...sessionTracks].sort((a, b) => a - b)[Math.floor(sessionTracks.length / 2)] || 1;

  const nightOwl = normalizeToPercent((lateNightPlays / totalPlays) * 180);
  // freshFinds: reduce multiplier so typical data (most tracks appear once) doesn't always hit 100
  const freshFinds = normalizeToPercent((firstListenCount / totalPlays) * 140);
  const deepSessions = normalizeToPercent((avgSessionMins / 85) * 100);
  const replayLove = normalizeToPercent(Math.pow(topSongShare, 0.82) * 230);
  // routine: use fixed+dynamic denominator that gives a meaningful spread across the full range
  const routine = normalizeToPercent((dailySet.size / Math.max(dailySet.size + 15, 30)) * 100);
  // artistVariety: direct ratio avoids log-scale saturation at 100 for most users
  const artistVariety = normalizeToPercent((artistSeen.size / Math.max(1, totalPlays)) * 300);
  const moodSwing = normalizeToPercent(Math.min(1, hourVariance / 45) * 100);
  const skipResistance = normalizeToPercent(Math.max(0, 100 - (consecutiveRepeats / Math.max(1, totalPlays)) * 120 + medianSessionTracks * 4));

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

function metricsVector(metrics: DnaMetrics): number[] {
  return [
    metrics.nightOwl,
    metrics.freshFinds,
    metrics.deepSessions,
    metrics.replayLove,
    metrics.routine,
    metrics.artistVariety,
    metrics.moodSwing,
    metrics.skipResistance,
  ];
}

function pickFruitFromMetrics(metrics: DnaMetrics) {
  // Map 8-dim metrics to 3-Axis Flavor Cube
  // Energy: Avg of Night Owl (time) + Session Depth (intensity)
  const energy = (metrics.nightOwl + metrics.deepSessions) / 2;

  // Variety: Directly map artistVariety
  const variety = metrics.artistVariety;

  // Discovery: Directly map freshFinds
  const discovery = metrics.freshFinds;

  const userVec = [energy, variety, discovery];

  return FRUIT_PROFILES
    .map((f) => {
      // Simple 3D Euclidean Distance (The Flavor Cube)
      // d = sqrt((x2-x1)^2 + (y2-y1)^2 + (z2-z1)^2)
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
  const vectorPart = metricsVector(metrics).map((v) => Math.round(v / 2)).join('-');
  const stableSongPart = songs.slice(0, 6).map((s) => `${s.id || s.title}:${s.listens}`).join('|');
  const stableHistoryPart = historyRows.slice(0, 50).map((row) => `${row.track_name || 'x'}@${row.played_at.slice(0, 10)}`).join('|');
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

// SLIDE 4: THE IDENTITY SCAN
const Slide4: React.FC<{ active: boolean; songs: Song[]; historyRows: HistoryRow[] }> = ({ active, songs, historyRows }) => {
  const [phase, setPhase] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const metrics = useMemo(() => computeDnaMetrics(historyRows, songs), [historyRows, songs]);

  const winningFruit = useMemo(() => pickFruitFromMetrics(metrics), [metrics]);
  const dnaSequence = useMemo(() => buildFruitDnaSequence(metrics, songs, historyRows, winningFruit?.name || 'MANGO'), [metrics, songs, historyRows, winningFruit]);

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
            <p className="font-barlow-condensed font-bold text-lg text-white">{song.listens}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const FruitSlide: React.FC = () => (
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
          🥭
       </div>
       <h2 className="font-barlow-condensed font-black text-5xl text-black uppercase leading-none mb-2">MANGO</h2>
       <p className="font-barlow font-bold text-black text-sm uppercase leading-tight">
          BALANCED EXPLORER ENERGY WITH STEADY HABITS.
       </p>
       <div className="mt-6 flex justify-center gap-2">
          {['A','T','C','G'].map(l => (
              <span key={l} className="w-8 h-8 flex items-center justify-center bg-black text-white font-mono font-bold border-2 border-black">{l}</span>
          ))}
       </div>
     </motion.div>
  </div>
);

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

export default function WrappedSlides({ onClose, totalMinutes, artists, songs, albums, rangeLabel, historyRows }: WrappedSlidesProps & { historyRows?: any[] }) {
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes firePulse { 0%,100%{box-shadow: 0 0 5px ${NB.acidYellow}; transform: scale(1);} 50%{box-shadow: 0 0 15px orange; transform: scale(1.1);} }
      `}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 12px 12px', gap: 8 }}>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px 0' }}>THE STREAK</p>
        <div style={{ display: 'flex', gap: 0, marginBottom: 2 }}>
          {Array.from({ length: weeks }).map((_, w) => {
            const mIdx = monthStartWeeks.indexOf(w);
            return (
              <div key={w} style={{ width: 'calc((100% - 24px) / 52)', minWidth: 0, height: 14, flexShrink: 0 }}>
                {mIdx >= 0 && <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 8, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{months[mIdx]}</span>}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 1, overflowX: 'hidden' }}>
          {Array.from({ length: weeks }).map((_, w) => (
            <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1 }}>
              {Array.from({ length: days }).map((_, d) => {
                const idx = w * 7 + d;
                const val = gridData[idx] ?? 0;
                const revealed = w <= waveCol;
                const inStreak = isStreak(w, d);
                return (
                  <div key={d} style={{
                    aspectRatio: '1',
                    background: getCellColor(val, revealed, inStreak),
                    borderRadius: 1,
                    transition: 'background 80ms ease',
                    boxShadow: inStreak && revealed ? `0 0 4px ${NB.acidYellow}` : 'none',
                    zIndex: inStreak ? 1 : 0
                  }} />
                );
              })}
            </div>
          ))}
        </div>

        {waveCol >= weeks - 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 'auto', marginBottom: 20, gap: 10 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <motion.div
                style={{ fontSize: 60 }}
                animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                🔥
              </motion.div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', margin: 0 }}>LONGEST STREAK</p>
                <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 96, color: NB.acidYellow, margin: 0, lineHeight: 0.85, textShadow: `4px 4px 0 ${NB.black}` }}>{STREAK_LEN}</p>
                <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 14, color: NB.white, margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>CONSECUTIVE DAYS</p>
              </div>
            </div>

            <div style={{ background: NB.white, border: `4px solid ${NB.black}`, boxShadow: '5px 5px 0 #000', padding: '12px 20px', borderRadius: 0, marginTop: 12 }}>
              <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 20, color: NB.black, textTransform: 'uppercase', margin: 0 }}>CONSISTENCY IS YOUR SUPERPOWER</p>
            </div>
          </motion.div>
        )}
      </div>
      <Ticker text="THE STREAK  DAYS OF LISTENING" bg={NB.acidYellow} color={NB.black} />
    </div>
  );
};

// SLIDE 8: THE FIRST PLAY
const Slide8: React.FC<{ active: boolean; songs: Song[]; rangeLabel?: string }> = ({ active, songs, rangeLabel }) => {
  const [phase, setPhase] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const firstSong = songs[0];

  const triggerAnimation = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase(0);
    timers.current.push(setTimeout(() => setPhase(1), 400));
    timers.current.push(setTimeout(() => setPhase(2), 1200));
    timers.current.push(setTimeout(() => setPhase(3), 2200));
    timers.current.push(setTimeout(() => setPhase(4), 3200));
  }, []);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    if (!active) { setPhase(0); return; }
    triggerAnimation();
    return () => timers.current.forEach(clearTimeout);
  }, [active, triggerAnimation]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes needleDrop { 0%{transform:rotate(-35deg) translateY(-10px);opacity:0.5} 100%{transform:rotate(0deg) translateY(0);opacity:1} }
        @keyframes vinylSpin8 { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes albumPop { 0% { transform: translateY(100px) scale(0.8); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
      `}</style>

      {/* Background Ambience */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.2, backgroundImage: `url(${firstSong?.cover || ''})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(30px)' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 20px 20px', gap: 14, position: 'relative', zIndex: 1 }}>
        <div>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', margin: '0 0 8px 0' }}>YOUR {(rangeLabel || 'YEAR').toUpperCase()} STARTED WITH...</p>
          <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(36px, 9vw, 60px)', color: NB.white, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>YOUR FIRST PLAY</h1>
        </div>

        {/* Phase 1: Vinyl / record player */}
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} style={{ display: 'flex', justifyContent: 'center', position: 'relative', height: 220 }}>
            <div style={{ width: 220, height: 220, borderRadius: '50%', background: '#111', border: `6px solid ${NB.black}`, position: 'relative', animation: phase >= 2 ? 'vinylSpin8 5s linear infinite' : 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
              {/* Vinyl grooves */}
              <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'absolute', inset: 25, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} />
              <div style={{ position: 'absolute', inset: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} />

              <img src={firstSong?.cover || fallbackImage} alt="" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: `3px solid ${NB.white}` }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
              <div style={{ width: 16, height: 16, background: NB.acidYellow, border: `2px solid ${NB.black}`, borderRadius: '50%', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }} />
            </div>
            {/* Needle */}
            <div style={{ position: 'absolute', right: 'calc(50% - 130px)', top: -20, width: 6, height: 120, background: '#ccc', transformOrigin: 'top center', animationName: 'needleDrop', animationDuration: '0.8s', animationTimingFunction: 'ease-out', animationFillMode: 'forwards', borderRadius: 3, border: `1px solid ${NB.black}` }} />
          </motion.div>
        )}

        {/* Phase 2: Song card flies in from bottom */}
        {firstSong && phase >= 2 && (
          <motion.div
            initial={{ y: 100, opacity: 0, rotateX: 20 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            transition={{ type: 'spring', damping: 15 }}
            style={{
              background: NB.white, border: `4px solid ${NB.black}`,
              boxShadow: '8px 8px 0 #000',
              padding: '16px 20px',
              display: 'flex', flexDirection: 'column', gap: 6
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.coral, margin: 0 }}>JAN 1, 2024</p>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.black, margin: 0 }}>00:01 AM</p>
            </div>
            <h2 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(24px, 6vw, 38px)', color: NB.black, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>{firstSong.title}</h2>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#444', margin: 0, fontWeight: 700 }}>{firstSong.artist}</p>
          </motion.div>
        )}

        {/* Phase 3: REWIND button */}
        {phase >= 3 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ alignSelf: 'center', marginTop: 12 }}>
            <button
              onClick={(e) => { e.stopPropagation(); triggerAnimation(); }}
              style={{ background: NB.acidYellow, border: `3px solid ${NB.black}`, boxShadow: '3px 3px 0 #000', padding: '10px 24px', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 16, cursor: 'pointer', textTransform: 'uppercase', borderRadius: 0 }}
            >
              ↺ REWIND
            </button>
          </motion.div>
        )}
      </div>
      <Ticker text="THE FIRST PLAY  WHERE IT ALL STARTED" bg={NB.black} color={NB.white} />
    </div>
  );
};

// SLIDE 9: OBSESSION ORBIT (Story Mode)
const Slide9: React.FC<{ active: boolean; artists: Artist[]; songs: Song[]; rangeLabel?: string }> = ({ active, artists, rangeLabel }) => {
  const topArtist = artists[0];
  const [chapter, setChapter] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
    if (!active) { setChapter(0); return; }
    setChapter(0);
    timerRef.current.push(setTimeout(() => setChapter(1), 600));
    timerRef.current.push(setTimeout(() => setChapter(2), 2000));
    timerRef.current.push(setTimeout(() => setChapter(3), 3500));
    return () => timerRef.current.forEach(clearTimeout);
  }, [active]);

  // "Gravitational Pull" Formula
  // Rewards single-song dominance over pure volume
  // Score = (TopSongPlays / TotalArtistPlays)^2 * log10(TotalArtistPlays) * 100
  const orbitScore = useMemo(() => {
    if (!topArtist || !songs.length) return 0;

    // Find plays of the most played song by this artist
    const artistSongs = songs.filter(s => s.artist === topArtist.name);
    if (artistSongs.length === 0) return Math.min(250, 80 + Math.round(topArtist.totalListens / 3)); // Fallback

    const topSongPlays = Math.max(...artistSongs.map(s => s.listens));
    const totalPlays = topArtist.totalListens || 1;

    // Dominance ratio (0.0 to 1.0)
    const dominance = topSongPlays / totalPlays;

    // The Formula
    // 1. Square the dominance to punish "casual" listening (0.5^2 = 0.25 vs 0.9^2 = 0.81)
    // 2. Log10 the total volume so 1000 plays isn't 10x better than 100 plays
    const rawScore = Math.pow(dominance, 2) * Math.log10(totalPlays) * 100;

    // Scale and cap (Aiming for 0-250 range)
    // A super fan (90% dominance, 1000 plays) -> 0.81 * 3 * 100 = 243
    // A casual fan (10% dominance, 1000 plays) -> 0.01 * 3 * 100 = 3
    return Math.min(250, Math.round(Math.max(10, rawScore)));
  }, [topArtist, songs]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes orbitPulse { 0%,100%{box-shadow:0 0 0 0 rgba(204,255,0,0)} 50%{box-shadow:0 0 0 20px rgba(204,255,0,0.12)} }
        @keyframes planetOrbit { from { transform: rotate(0deg) translateX(120px) rotate(0deg); } to { transform: rotate(360deg) translateX(120px) rotate(-360deg); } }
      `}</style>

      {/* Background Starfield */}
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: Math.random() * 3 + 1,
          height: Math.random() * 3 + 1,
          borderRadius: '50%',
          background: 'white',
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          opacity: Math.random() * 0.5 + 0.2,
        }} />
      ))}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 16px', gap: 14, alignItems: 'center', zIndex: 1, position: 'relative' }}>
        <div style={{ width: '100%', textAlign: 'center' }}>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px 0' }}>
            {rangeLabel ? rangeLabel.toUpperCase() : 'YOUR'} STORY
          </p>
          <h2 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(36px, 9vw, 56px)', color: NB.white, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>
            OBSESSION ORBIT
          </h2>
        </div>

        {/* Orbit Visual */}
        <div style={{ position: 'relative', width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '20px 0' }}>
           {/* Orbital Rings */}
           <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '50%' }} />
           <div style={{ position: 'absolute', inset: 40, border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%' }} />
           <div style={{ position: 'absolute', inset: 80, border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%' }} />

           {/* Central Sun (Top Artist) */}
           <motion.div
             initial={{ scale: 0 }}
             animate={{ scale: 1 }}
             transition={{ type: 'spring', delay: 0.2 }}
             style={{
               width: 100, height: 100, borderRadius: '50%',
               border: `4px solid ${NB.acidYellow}`,
               overflow: 'hidden', zIndex: 10,
               boxShadow: `0 0 40px ${NB.acidYellow}66`,
               animation: 'orbitPulse 3s ease-in-out infinite'
             }}
           >
             {topArtist?.image ? (
               <img src={topArtist.image} alt={topArtist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
             ) : (
               <div style={{ width: '100%', height: '100%', background: NB.acidYellow }} />
             )}
           </motion.div>

           {/* Orbiting Planet */}
           <div style={{ position: 'absolute', width: 20, height: 20, background: NB.electricBlue, borderRadius: '50%', animation: 'planetOrbit 4s linear infinite', top: 'calc(50% - 10px)', left: 'calc(50% - 10px)' }} />
        </div>

        {/* Story Text */}
        <div style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 16, border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <AnimatePresence mode='wait'>
            {chapter === 1 && (
              <motion.div key="c1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 24, fontWeight: 900, color: NB.electricBlue, textTransform: 'uppercase' }}>THE DISCOVERY</p>
                <p style={{ margin: '8px 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#ccc' }}>You found {topArtist?.name} and couldn't stop listening.</p>
              </motion.div>
            )}
            {chapter === 2 && (
              <motion.div key="c2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 24, fontWeight: 900, color: NB.coral, textTransform: 'uppercase' }}>THE OBSESSION</p>
                <p style={{ margin: '8px 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#ccc' }}>{topArtist?.totalListens} plays later, they became your soundtrack.</p>
              </motion.div>
            )}
            {chapter >= 3 && (
              <motion.div key="c3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 24, fontWeight: 900, color: NB.acidYellow, textTransform: 'uppercase' }}>LOCKED IN ORBIT</p>
                <p style={{ margin: '8px 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#ccc' }}>Orbit Score: {orbitScore}/250. You're officially a super fan.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <Ticker text="OBSESSION ORBIT  GRAVITATIONAL LOCK  STORY MODE" bg={NB.acidYellow} color={NB.black} />
    </div>
  );
};

// SLIDE 11: THE REPLAY VALUE
const ReplayTrackRow: React.FC<{ song: Song; index: number; active: boolean; pulsing: number | null; targetCount: number }> = ({ song, index, active, pulsing, targetCount }) => {
  const displayCount = useOdometer(targetCount, 600);
  return (
    <motion.div
      initial={{ x: 120, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: active ? index * 0.15 : 0, duration: 0.35 }}
      style={{
        display: 'flex', gap: 10, alignItems: 'center',
        background: NB.white, border: `4px solid ${NB.black}`,
        boxShadow: '6px 6px 0 #000', padding: '12px 14px',
        animation: pulsing === index ? 'replayPulse 0.8s ease' : undefined,
        transform: pulsing === index ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.2s ease',
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img
          src={song.cover || fallbackImage}
          alt={song.title}
          style={{ width: 56, height: 56, objectFit: 'cover', border: `3px solid ${NB.black}`, borderRadius: '50%', display: 'block', animation: active ? 'vinylSpin 3s linear infinite' : 'none' }}
          onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }}
        />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.1)', pointerEvents: 'none' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 22, fontWeight: 900, textTransform: 'uppercase', color: NB.black, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
        <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#555' }}>{song.artist}</p>
      </div>
      <motion.div
        style={{ background: NB.black, color: NB.acidYellow, padding: '6px 12px', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 20, fontWeight: 900, flexShrink: 0, minWidth: 60, textAlign: 'center' }}
      >
        {displayCount}
      </motion.div>
    </motion.div>
  );
};

const Slide11: React.FC<{ active: boolean; songs: Song[] }> = ({ active, songs }) => {
  const loops = songs.slice(0, 3);
  const [loopIndex, setLoopIndex] = useState(0);
  const [pulsing, setPulsing] = useState<number | null>(null);
  const slotRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalLoops = loops.reduce((s, song) => s + song.listens, 0);
  const displayTotal = useOdometer(active ? totalLoops : 0, 1500);

  useEffect(() => {
    if (!active || loops.length === 0) { setLoopIndex(0); setPulsing(null); if (slotRef.current) clearInterval(slotRef.current); return; }
    let idx = 0;
    slotRef.current = setInterval(() => {
      idx = (idx + 1) % Math.max(1, loops.length);
      setLoopIndex(idx);
      setPulsing(idx);
      setTimeout(() => setPulsing(null), 400);
    }, 1800);
    return () => { if (slotRef.current) clearInterval(slotRef.current); };
  }, [active, loops.length]);

  const currentSong = loops[loopIndex];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.coral, overflow: 'hidden' }}>
      <style>{`
        @keyframes vinylSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes replayPulse { 0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)} }
        @keyframes pulseRing { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.25);opacity:0} }
        @keyframes loopDot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes float3D { 0% { transform: rotateX(10deg) rotateY(0deg); } 50% { transform: rotateX(15deg) rotateY(5deg); } 100% { transform: rotateX(10deg) rotateY(0deg); } }
      `}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 16px', gap: 10, perspective: 1000 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(30px, 7vw, 50px)', color: NB.white, margin: 0, textTransform: 'uppercase', lineHeight: 1 }}>YOUR REPLAY VALUE</h1>

        {/* CURRENTLY LOOPING indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: NB.acidYellow, animation: 'loopDot 0.8s ease-in-out infinite' }} />
          <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>CURRENTLY LOOPING</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={loopIndex}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 12, color: NB.acidYellow, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}
            >
              {currentSong?.title || '—'}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Vinyl showing current song (3D Tilted) */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', height: 190, flexShrink: 0, animation: 'float3D 6s ease-in-out infinite' }}>
          <div style={{ width: 190, height: 190, borderRadius: '50%', border: `6px solid ${NB.black}`, background: '#111', position: 'relative', animation: 'vinylSpin 6s linear infinite', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <img src={currentSong?.cover || fallbackImage} alt={currentSong?.title || ''} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: '50%', border: `4px solid ${NB.white}`, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
            <div style={{ width: 16, height: 16, background: NB.acidYellow, border: `3px solid ${NB.black}`, borderRadius: '50%', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }} />
          </div>
        ))}
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[100] bg-white border-[3px] border-black p-1 shadow-[3px_3px_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
      >
        <X size={20} className="text-black" />
      </button>

      {/* Navigation Areas */}
      <div className="absolute inset-y-0 left-0 w-1/4 z-40" onClick={prev} />
      <div className="absolute inset-y-0 right-0 w-1/4 z-40" onClick={next} />

      {/* Slide Content */}
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
          {currentSlide === 5 && <FruitSlide />}
          {currentSlide === 6 && <SummarySlide totalMinutes={totalMinutes} topArtist={artists[0]} topSong={songs[0]} onClose={onClose} />}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Hints (Desktop) */}
      <div className="hidden md:flex justify-between px-6 py-4 bg-black text-white z-50 border-t border-[#333]">
         <button onClick={prev} disabled={currentSlide === 0} className="flex items-center gap-2 opacity-50 hover:opacity-100 disabled:opacity-20">
            <ChevronLeft size={16} /> PREV
         </button>
         <button onClick={next} className="flex items-center gap-2 opacity-50 hover:opacity-100">
            {currentSlide === SLIDES.length - 1 ? 'FINISH' : 'NEXT'} <ChevronRight size={16} />
         </button>
      </div>
    </div>
  );
}
