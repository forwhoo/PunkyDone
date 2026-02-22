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
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col overflow-hidden font-sans">
      {/* Progress Bar */}
      <div className="flex gap-1 p-2 bg-black z-50">
        {SLIDES.map((_, i) => (
          <div key={i} className="flex-1 h-1 bg-[#333] overflow-hidden">
            <motion.div
               initial={{ width: 0 }}
               animate={{ width: i <= currentSlide ? '100%' : '0%' }}
               className="h-full bg-white"
            />
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
