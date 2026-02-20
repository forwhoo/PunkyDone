import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Volume2, VolumeX } from 'lucide-react';
import { Artist, Album, Song } from '../types';
import { fetchHeatmapData } from '../services/dbService';
import { generateTopAlbumFunFact } from '../services/geminiService';
import { fetchTrackPreviewUrls } from '../services/spotifyService';

const NB = {
  electricBlue: '#1A6BFF',
  coral: '#FF4D2E',
  magenta: '#FF0080',
  acidYellow: '#CCFF00',
  nearBlack: '#0D0D0D',
  white: '#FFFFFF',
  black: '#000000',
};
const TOTAL_SLIDES = 15;
const LEFT_TAP_ZONE = 0.3;

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
  connectionGraph?: { artistInfo: Record<string, any>; pairs: Record<string, Record<string, number>> };
}

const fallbackImage =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFDMUMxRSIvPjxwYXRoIGQ9Ik0xMzAgNjB2NzBjMCAxMS05IDIwLTIwIDIwcy0yMC05LTIwLTIwIDktMjAgMjAtMjBjNCAwIDcgMSAxMCAzVjcwbC00MCAxMHY2MGMwIDExLTkgMjAtMjAgMjBzLTIwLTktMjAtMjAgOS0yMCAyMC0yMGM0IDAgNyAxIDEwIDNWNjBsNjAtMTV6IiBmaWxsPSIjOEU4RTkzIi8+PC9zdmc+';

type ConnectionPair = {
  a: { id: string; name: string; image: string };
  b: { id: string; name: string; image: string };
  closeness: number;
  sharedSessions: number;
};

const weekdayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function buildConnectionPairs(connectionGraph?: { artistInfo: Record<string, any>; pairs: Record<string, Record<string, number>> }): ConnectionPair[] {
  if (!connectionGraph) return [];
  const pairRows: ConnectionPair[] = [];
  const seen = new Set<string>();
  const pairMap = connectionGraph.pairs || {};
  const artists = connectionGraph.artistInfo || {};
  Object.entries(pairMap).forEach(([artistA, edges]) => {
    Object.entries(edges || {}).forEach(([artistB, score]) => {
      const key = [artistA, artistB].sort().join('::');
      if (seen.has(key)) return;
      seen.add(key);
      const infoA = artists[artistA];
      const infoB = artists[artistB];
      if (!infoA || !infoB) return;
      const totalA = Math.max(1, infoA.count || 1);
      const totalB = Math.max(1, infoB.count || 1);
      // Overlap similarity: what fraction of the more popular artist's plays are shared
      // Max 97% so it never claims 100%, min 5% for any artists that co-occur at all
      const overlapRatio = score / Math.max(totalA, totalB);
      const closeness = Math.min(97, Math.max(5, Math.round(overlapRatio * 85 + Math.min(score, 5))));
      pairRows.push({
        a: { id: infoA.id || artistA, name: infoA.name || artistA, image: infoA.image || fallbackImage },
        b: { id: infoB.id || artistB, name: infoB.name || artistB, image: infoB.image || fallbackImage },
        closeness,
        sharedSessions: score,
      });
    });
  });
  return pairRows.sort((x, y) => y.closeness - x.closeness || y.sharedSessions - x.sharedSessions).slice(0, 8);
}

function useOdometer(target: number, durationMs = 1200): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    setValue(0);
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
const stagger = (i: number, base = 0.15, step = 0.06) => base + i * step;

const tickerCSS = `@keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`;
const Ticker: React.FC<{ text: string; bg?: string; color?: string }> = ({ text, bg = NB.acidYellow, color = NB.black }) => {
  const repeated = Array(12).fill(text + '  \u2736  ').join('');
  return (
    <>
      <style>{tickerCSS}</style>
      <div style={{ width: '100%', height: 36, background: bg, overflow: 'hidden', display: 'flex', alignItems: 'center', borderTop: `2px solid ${NB.black}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'tickerScroll 20s linear infinite', fontFamily: "'Barlow', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color }}>
          {repeated}
        </div>
      </div>
    </>
  );
};

const StoryProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div
    style={{
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      display: 'flex',
      gap: 4,
      zIndex: 100,
    }}
  >
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          flex: 1,
          height: 3,
          background: i < current ? NB.white : 'rgba(255,255,255,0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {i === current && <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '25%', background: NB.white }} />}
      </div>
    ))}
  </div>
);

const SlideNavButtons: React.FC<{ current: number; total: number; onPrev: () => void; onNext: () => void }> = ({ current, total, onPrev, onNext }) => (
  <div style={{ position: 'absolute', bottom: 'max(52px, env(safe-area-inset-bottom, 0px) + 52px)', left: 12, right: 12, zIndex: 120, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
    <button onClick={(e) => { e.stopPropagation(); onPrev(); }} disabled={current === 0} aria-label="Go to previous slide" style={{ pointerEvents: 'auto', minWidth: 88, height: 44, background: NB.white, border: `3px solid ${NB.black}`, boxShadow: '3px 3px 0 #000', opacity: current === 0 ? 0.45 : 1, cursor: current === 0 ? 'default' : 'pointer', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 15, borderRadius: 0 }}>PREV</button>
    <button onClick={(e) => { e.stopPropagation(); onNext(); }} disabled={current === total - 1} aria-label="Go to next slide" style={{ pointerEvents: 'auto', minWidth: 88, height: 44, background: NB.acidYellow, border: `3px solid ${NB.black}`, boxShadow: '3px 3px 0 #000', opacity: current === total - 1 ? 0.45 : 1, cursor: current === total - 1 ? 'default' : 'pointer', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 15, borderRadius: 0 }}>NEXT ›</button>
  </div>
);

const CloseButton: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClose(); }}
    style={{
      position: 'absolute',
      top: 36,
      right: 12,
      zIndex: 100,
      width: 36,
      height: 36,
      background: NB.white,
      border: `3px solid ${NB.black}`,
      boxShadow: '3px 3px 0px #000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      padding: 0,
      borderRadius: 0,
    }}
  >
    <X size={18} color={NB.black} />
  </button>
);

const BCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: NB.white,
      border: `4px solid ${NB.black}`,
      boxShadow: '4px 4px 0px #000',
      padding: '16px 20px',
      borderRadius: 0,
      ...style,
    }}
  >
    {children}
  </div>
);

const FrequencyBarRow: React.FC<{
  song: Song;
  i: number;
  active: boolean;
  animated: boolean;
  expanded: number | null;
  maxListens: number;
  barColor: string;
  onToggle: (i: number) => void;
}> = ({ song, i, active, animated, expanded, maxListens, barColor, onToggle }) => {
  const isExp = expanded === i;
  const targetWidth = (song.listens / maxListens) * 90;
  const animatedCount = useOdometer(active && animated ? song.listens : 0, 500 + i * 220);

  return (
    <div style={{ position: 'relative' }}>
      {isExp && (
        <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: NB.white, border: `4px solid ${NB.black}`, padding: '8px 12px', zIndex: 10, boxShadow: '4px 4px 0 #000', marginBottom: 4, borderRadius: 0 }}>
          <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 16, color: NB.black, margin: '0 0 2px 0', textTransform: 'uppercase' }}>{song.title}</p>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: NB.black, margin: 0 }}>{song.listens.toLocaleString()} plays</p>
        </div>
      )}
      <div
        onClick={(e) => { e.stopPropagation(); onToggle(i); }}
        style={{
          height: 48,
          background: barColor,
          border: `2px solid ${NB.black}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 10px',
          cursor: 'pointer',
          overflow: 'hidden',
          width: animated ? (isExp ? '95%' : `${targetWidth}%`) : '0%',
          minWidth: 60,
          transition: `width 600ms cubic-bezier(0.34,1.56,0.64,1) ${i * 100}ms`,
        }}
      >
        <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 13, color: NB.white, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{song.title}</span>
        <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 700, fontSize: 12, color: NB.white, whiteSpace: 'nowrap', flexShrink: 0 }}>{animatedCount.toLocaleString()}</span>
      </div>
    </div>
  );
};

// SLIDE 0: THE DEVOUR
const Slide0: React.FC<{ active: boolean; totalMinutes: number; albumCovers: string[]; albums: Album[]; rangeLabel?: string }> = ({ active, totalMinutes, albumCovers, albums, rangeLabel }) => {
  const [phase, setPhase] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const counted = useOdometer(phase >= 2 ? totalMinutes : 0);
  const hours = Math.round(totalMinutes / 60);
  const days = (totalMinutes / 60 / 24).toFixed(1);
  const palette = [NB.electricBlue, NB.coral, NB.magenta, NB.acidYellow, '#555555'];

  const covers = useMemo(() => {
    const arr = albumCovers.length ? albumCovers : albums.map(a => a.cover).filter(Boolean) as string[];
    return arr.slice(0, 60);
  }, [albumCovers, albums]);

  const orbitItems = useMemo(() => covers.slice(0, 42).map((src, i, arr) => {
    const angle = (360 / arr.length) * i;
    const radius = 38 + ((i % 5) * 5);
    return { src, angle, radius, delay: (i % 10) * 0.08 };
  }), [covers]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!active) { setPhase(0); return; }
    setPhase(0);
    timers.current.push(setTimeout(() => setPhase(1), 800));
    timers.current.push(setTimeout(() => setPhase(2), 2500));
    return () => timers.current.forEach(clearTimeout);
  }, [active]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes holePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @keyframes holeRing { from{transform:scale(0.4);opacity:0.9} to{transform:scale(3.2);opacity:0} }
        @keyframes floatOrbit { 0%,100%{transform:translate(0,0)} 25%{transform:translate(5px,-8px)} 50%{transform:translate(-4px,3px)} 75%{transform:translate(3px,7px)} }
      `}</style>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {orbitItems.map((item, i) => {
          const base = `translate(-50%, -50%) rotate(${item.angle}deg) translate(calc(min(${item.radius}vw, ${item.radius}vh))) rotate(${-item.angle}deg)`;
          const suck = `translate(-50%, -50%) scale(0.05) rotate(${item.angle * 5}deg)`;
          return (
            <div key={i} style={{
              width: 46,
              height: 46,
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: phase >= 1 ? suck : base,
              filter: phase >= 1 ? 'blur(1px)' : 'blur(0px)',
              opacity: phase >= 1 ? 0.5 : 1,
              transition: `transform 900ms cubic-bezier(0.55,0,1,0.45) ${item.delay}s, opacity 700ms ease ${item.delay}s, filter 700ms ease ${item.delay}s`,
            }}>
              <div style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                border: '2px solid white',
                background: item.src ? 'transparent' : palette[i % palette.length],
                overflow: 'hidden',
                animation: phase === 0 ? `floatOrbit ${2.5 + (i % 4) * 0.6}s ease-in-out ${(i * 0.18) % 1.8}s infinite` : 'none',
              }}>
                {item.src && <img src={item.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />}
              </div>
            </div>
          );
        })}
      </div>
      {phase >= 1 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${NB.white}`, position: 'absolute', animation: 'holeRing 1s ease-out infinite' }} />
          <div style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${NB.white}`, position: 'absolute', animation: 'holeRing 1.2s ease-out infinite 0.25s' }} />
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: NB.black,
            border: '4px solid white',
            transform: phase >= 1 ? 'scale(30)' : 'scale(0)',
            transition: 'transform 1.8s cubic-bezier(0.16,1,0.3,1)',
            animation: 'holePulse 1.4s ease-in-out infinite',
          }} />
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 24px 24px', position: 'relative', zIndex: 20 }}>
        <div style={{ overflow: 'hidden', marginBottom: 0 }}>
          <div style={{ transform: phase >= 2 ? 'translateY(0)' : 'translateY(110%)', transition: 'transform 400ms cubic-bezier(0.16,1,0.3,1)' }}>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 8px 0', textAlign: 'center' }}>{rangeLabel || 'THE DEVOUR'}</p>
            <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(80px, 22vw, 120px)', color: NB.acidYellow, lineHeight: 0.9, textTransform: 'uppercase', margin: 0, textAlign: 'center' }}>
              {counted.toLocaleString()}
            </h1>
            <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 700, fontSize: 'clamp(32px, 8vw, 48px)', color: NB.white, textTransform: 'uppercase', margin: '8px 0 24px 0', textAlign: 'center', letterSpacing: '0.1em' }}>MINUTES</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 320, transform: phase >= 2 ? 'translateY(0)' : 'translateY(30px)', opacity: phase >= 2 ? 1 : 0, transition: 'all 400ms ease 200ms' }}>
          {[{ label: 'HOURS', value: hours.toLocaleString() }, { label: 'DAYS', value: days }].map(s => (
            <div key={s.label} style={{ flex: 1, background: NB.white, border: `4px solid ${NB.black}`, boxShadow: '5px 5px 0px #000', padding: '12px 16px', borderRadius: 0 }}>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.black, margin: '0 0 4px 0' }}>{s.label}</p>
              <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 28, color: NB.black, margin: 0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
      <Ticker text="THE DEVOUR  MINUTES  KEEP LISTENING" bg={NB.black} color={NB.acidYellow} />
    </div>
  );
};

// SLIDE 1: THE SHOWDOWN
const Slide1: React.FC<{ active: boolean; artists: Artist[] }> = ({ active, artists }) => {
  const palette = [NB.electricBlue, NB.coral, NB.magenta, NB.acidYellow, '#555555'];
  const topThree = useMemo(() => artists.slice(0, 3), [artists]);
  const shuffled = useMemo(() => {
    const arr = [...topThree];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [topThree]);

  const [guessed, setGuessed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wrongIds, setWrongIds] = useState<string[]>([]);
  const [firstTryWrong, setFirstTryWrong] = useState(false);
  const [shaking, setShaking] = useState<string | null>(null);

  useEffect(() => {
    if (!active) { setGuessed(false); setSelectedId(null); setWrongIds([]); setFirstTryWrong(false); setShaking(null); }
  }, [active]);

  const handleGuess = (id: string) => {
    if (guessed) return;
    const correct = artists[0]?.id;
    if (id === correct) {
      setSelectedId(id);
      setGuessed(true);
    } else {
      if (wrongIds.length === 0) setFirstTryWrong(true);
      setShaking(id);
      setTimeout(() => { setShaking(null); setWrongIds(prev => [...prev, id]); }, 400);
    }
  };

  const correctId = artists[0]?.id;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.electricBlue, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-10px)} 80%{transform:translateX(10px)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 16 }}>
        {!guessed && (
          <>
            <h2 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 7vw, 48px)', color: NB.white, textTransform: 'uppercase', margin: '0 0 8px 0', lineHeight: 1 }}>
              WHO WAS YOUR #1 ARTIST THIS YEAR?
            </h2>
            <div style={{ display: 'inline-flex', alignItems: 'center', background: NB.acidYellow, border: `4px solid ${NB.black}`, padding: '6px 12px', animation: 'blink 1s step-end infinite', marginBottom: 8, alignSelf: 'flex-start', borderRadius: 0 }}>
              <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: NB.black }}>TAP TO GUESS</span>
            </div>
          </>
        )}
        {guessed && (
          <div>
            <h2 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 7vw, 48px)', color: NB.white, textTransform: 'uppercase', margin: '0 0 4px 0' }}>
              {firstTryWrong ? 'TOOK YOU A MOMENT\u2026' : 'YOU KNEW.'}
            </h2>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shuffled.map((artist, i) => {
            const isWrong = wrongIds.includes(artist.id);
            const isSelected = selectedId === artist.id;
            const isCorrect = artist.id === correctId;
            if (isWrong && guessed) return null;
            return (
              <motion.div
                key={artist.id}
                initial={{ x: 120, opacity: 0 }}
                animate={{ x: isWrong && !guessed ? -500 : 0, opacity: isWrong && !guessed ? 0 : 1 }}
                transition={{ delay: stagger(i, 0.1, 0.1), duration: 0.3, ease: 'easeOut' }}
                onClick={(e) => { e.stopPropagation(); handleGuess(artist.id); }}
                style={{
                  background: NB.white,
                  border: `4px solid ${isSelected && isCorrect ? NB.acidYellow : isWrong ? '#FF0000' : NB.black}`,
                  boxShadow: '5px 5px 0px #000',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  borderRadius: 0,
                  animation: shaking === artist.id ? 'shake 400ms ease' : undefined,
                  transform: isSelected && isCorrect && guessed ? 'scale(1.04)' : 'scale(1)',
                  transition: 'transform 300ms ease',
                }}
              >
                <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 56, height: 56, background: palette[i % palette.length], border: `3px solid ${NB.black}`, overflow: 'hidden', flexShrink: 0 }}>
                    {artist.image && (
                      <img src={artist.image} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.currentTarget.style.display = 'none'); }} />
                    )}
                  </div>
                  <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.black, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</span>
                  {isWrong && <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 20, color: '#FF0000' }}>\u2715</span>}
                  {isSelected && isCorrect && guessed && <span style={{ background: NB.black, color: NB.acidYellow, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 12, padding: '4px 8px', letterSpacing: '0.1em' }}>\u2736 LEGEND STATUS</span>}
                </div>
                {isSelected && isCorrect && guessed && (
                  <div style={{ padding: '0 14px 10px' }}>
                    <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: NB.black, margin: 0 }}>{artist.totalListens.toLocaleString()} plays this year</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
      <Ticker text="THE SHOWDOWN  WHO'S YOUR #1" bg={NB.nearBlack} color={NB.white} />
    </div>
  );
};

// SLIDE 2: THE FREQUENCY
const Slide2: React.FC<{ active: boolean; songs: Song[] }> = ({ active, songs }) => {
  const topSongs = songs.slice(0, 5);
  const maxListens = topSongs[0]?.listens || 1;
  const barColors = [NB.nearBlack, NB.electricBlue, NB.coral, NB.magenta, '#555555'];
  const [expanded, setExpanded] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);
  const eqHeights = useMemo(() => Array.from({ length: 20 }, (_, i) => 20 + ((i * 31 + 17) % 55) + ((i * 13 + 5) % 25)), []);

  useEffect(() => {
    if (!active) { setAnimated(false); setExpanded(null); return; }
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.white, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes eqBounce { 0%,100%{transform:scaleY(0.3)} 50%{transform:scaleY(1)} }
        @keyframes nowBlink { 0%,100%{opacity:1} 50%{opacity:0.2} }
      `}</style>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(13,13,13,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(13,13,13,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.9 }} />
      {['🎧', '🎵', '✨', '🎶', '💿'].map((emoji, i) => (
        <motion.div key={emoji + i} animate={{ y: active ? [0, -14, 0] : 0, x: active ? [0, i % 2 === 0 ? 6 : -6, 0] : 0 }} transition={{ duration: 2.8 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', top: `${14 + i * 16}%`, left: `${6 + (i * 19) % 88}%`, fontSize: 20, opacity: 0.18 }}>{emoji}</motion.div>
      ))}
      <svg viewBox="0 0 400 260" style={{ position: 'absolute', left: 0, right: 0, top: 100, width: '100%', height: 220, opacity: 0.12 }}>
        <polyline points="0,180 40,130 90,150 130,95 190,120 240,70 290,112 340,55 400,90" fill="none" stroke={NB.electricBlue} strokeWidth="6" strokeLinejoin="round" strokeLinecap="square" />
        <polyline points="0,220 50,200 90,210 150,185 200,196 250,170 310,188 360,165 400,175" fill="none" stroke={NB.magenta} strokeWidth="5" strokeLinejoin="round" strokeLinecap="square" />
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 12 }}>
        {/* Equalizer waveform */}
        <div style={{ display: 'flex', gap: 2, height: 48, alignItems: 'flex-end' }}>
          {eqHeights.map((h, i) => (
            <div key={i} style={{
              flex: 1,
              height: `${h}px`,
              background: i % 2 === 0 ? NB.electricBlue : NB.coral,
              transformOrigin: 'bottom',
              animation: animated ? `eqBounce ${0.35 + (i % 5) * 0.08}s ease-in-out ${i * 0.02}s infinite` : 'none',
            }} />
          ))}
        </div>
        {/* NOW PLAYING indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: -4 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: NB.electricBlue, animation: animated ? 'nowBlink 1s step-end infinite' : 'none' }} />
          <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.black, animation: animated ? 'nowBlink 1s step-end infinite' : 'none' }}>NOW PLAYING</span>
        </div>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(40px, 10vw, 70px)', color: NB.black, textTransform: 'uppercase', margin: '0 0 4px 0', lineHeight: 1 }}>
          YOUR FREQUENCY
        </h1>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.black, margin: '0 0 12px 0' }}>
          TOP TRACKS THIS YEAR
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topSongs.map((song, i) => (
              <FrequencyBarRow
                key={song.id}
                song={song}
                i={i}
                active={active}
                animated={animated}
                expanded={expanded}
                maxListens={maxListens}
                barColor={barColors[i]}
                onToggle={(index) => setExpanded(expanded === index ? null : index)}
              />
            ))}
          </div>
          <div style={{ width: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
            {[0,-6,-12,-18,-24,-30].map(db => (
              <div key={db} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 6, height: 1, background: NB.black }} />
                <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 8, color: NB.black }}>{db}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Ticker text="YOUR FREQUENCY  TOP TRACKS" bg={NB.black} color={NB.acidYellow} />
    </div>
  );
};

// SLIDE 3: THE VAULT GUESS
const Slide3: React.FC<{ active: boolean; albums: Album[] }> = ({ active, albums }) => {
  const topThree = useMemo(() => albums.slice(0, 3), [albums]);
  const palette = [NB.electricBlue, NB.coral, NB.magenta];
  const ROUND_SECONDS = 7;
  const [timer, setTimer] = useState(ROUND_SECONDS);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [funFact, setFunFact] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const funFactRequestedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) {
      setTimer(ROUND_SECONDS); setRevealed(false); setSelected(null); setFunFact(''); funFactRequestedRef.current = null;
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const deadline = Date.now() + ROUND_SECONDS * 1000;
    setTimer(ROUND_SECONDS); setRevealed(false); setSelected(null); setFunFact(''); funFactRequestedRef.current = null;
    timerRef.current = setInterval(() => {
      const remainingMs = deadline - Date.now();
      const nextValue = Math.max(0, Math.ceil(remainingMs / 1000));
      setTimer(nextValue);
      if (remainingMs <= 50) {
        if (timerRef.current) clearInterval(timerRef.current);
        setRevealed(true);
      }
    }, 50);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active]);

  useEffect(() => {
    let canceled = false;
    const album = topThree[0];
    if (!revealed || !album) return;
    const albumKey = `${album.id}-${album.totalListens}`;
    if (funFactRequestedRef.current === albumKey) return;
    funFactRequestedRef.current = albumKey;
    generateTopAlbumFunFact({ title: album.title, artist: album.artist, plays: album.totalListens }).then((fact) => {
      if (!canceled) setFunFact(fact);
    });
    return () => { canceled = true; };
  }, [revealed, topThree]);

  const handlePick = (i: number) => {
    if (revealed) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelected(i);
    setRevealed(true);
  };

  const verdict = selected === null ? "TIME'S UP." : selected === 0 ? 'YOUR EARS KNOW BEST.' : 'BETTER LUCK NEXT TIME.';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.coral, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 16 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 8vw, 56px)', color: NB.white, textTransform: 'uppercase', margin: '0 0 8px 0', lineHeight: 1 }}>
          WHICH WAS YOUR #1 ALBUM?
        </h1>
        <div style={{ width: '100%', height: 32, background: NB.white, border: `4px solid ${NB.black}`, position: 'relative', overflow: 'hidden', marginBottom: 8, borderRadius: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: NB.black, width: `${(timer / ROUND_SECONDS) * 100}%`, transition: 'width 0.13s linear' }} />
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 16, color: revealed ? NB.black : NB.white, mixBlendMode: 'difference' as const, zIndex: 1 }}>
            {revealed ? verdict : `${timer}s`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {topThree.map((album, i) => {
            const isCorrect = i === 0;
            const isSelected = selected === i;
            const borderColor = revealed ? (isCorrect ? NB.acidYellow : isSelected ? '#FF0000' : NB.black) : NB.black;
            const borderWidth = revealed && isCorrect ? 6 : 4;
            const flip = revealed && isCorrect;
            return (
              <div key={album.id} onClick={(e) => { e.stopPropagation(); handlePick(i); }} style={{ flex: 1, cursor: 'pointer', perspective: 900, minWidth: 0 }}>
                <div style={{ position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 650ms ease', transform: flip ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                  <div style={{ border: `${borderWidth}px solid ${borderColor}`, position: 'relative', overflow: 'hidden', boxShadow: '3px 3px 0 #000', borderRadius: 0, backfaceVisibility: 'hidden' }}>
                    <div style={{ aspectRatio: '1 / 1', background: palette[i], position: 'relative' }}>
                      {album.cover && <img src={album.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />}
                    </div>
                    <div style={{ padding: '8px 8px', background: NB.white }}>
                      <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14, color: NB.black, margin: '0 0 2px 0', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.title}</p>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', inset: 0, border: `4px solid ${NB.black}`, background: NB.acidYellow, padding: 10, transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', boxShadow: '3px 3px 0 #000', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontSize: 11, color: NB.black, fontWeight: 700 }}>AI FUN FACT</p>
                    <p style={{ margin: '6px 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 16, lineHeight: 1.1, color: NB.black }}>{funFact || 'Generating your fun fact...'}</p>
                    <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#333' }}>{album.totalListens} plays</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Ticker text="THE VAULT GUESS  PICK YOUR TOP ALBUM" bg={NB.nearBlack} color={NB.white} />
    </div>
  );
};

// Fruit profile data (8 DNA dimensions)
const FRUIT_PROFILES = [
  { name: 'MANGO', emoji: '🥭', v: [58, 74, 66, 61, 72, 64, 68, 63], vibe: 'balanced explorer energy with steady habits' },
  { name: 'PINEAPPLE', emoji: '🍍', v: [64, 94, 54, 46, 58, 88, 42, 72], vibe: 'always digging for new sounds' },
  { name: 'CHERRY', emoji: '🍒', v: [71, 48, 63, 91, 66, 52, 86, 57], vibe: 'emotion-first repeats that hit every time' },
  { name: 'BANANA', emoji: '🍌', v: [44, 38, 86, 89, 88, 40, 64, 92], vibe: 'comfort-loop sessions and loyal favorites' },
  { name: 'BLUEBERRY', emoji: '🫐', v: [92, 69, 50, 52, 46, 76, 60, 38], vibe: 'night explorer with fresh rotations' },
  { name: 'WATERMELON', emoji: '🍉', v: [57, 62, 82, 66, 83, 70, 74, 78], vibe: 'long sessions with a consistent daily pulse' },
  { name: 'KIWI', emoji: '🥝', v: [74, 88, 57, 44, 54, 96, 48, 64], vibe: 'high-curiosity listener with sharp pivots' },
  { name: 'PEACH', emoji: '🍑', v: [90, 44, 58, 68, 57, 60, 92, 50], vibe: 'late-night focus and smooth transitions' },
  { name: 'APPLE', emoji: '🍎', v: [50, 46, 79, 59, 95, 42, 58, 96], vibe: 'structured routine with dependable taste' },
  { name: 'STRAWBERRY', emoji: '🍓', v: [65, 56, 64, 86, 74, 58, 82, 70], vibe: 'hook-heavy favorites with strong replay love' },
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
  const freshFinds = normalizeToPercent((firstListenCount / totalPlays) * 240);
  const deepSessions = normalizeToPercent((avgSessionMins / 85) * 100);
  const replayLove = normalizeToPercent(Math.pow(topSongShare, 0.82) * 230);
  const routine = normalizeToPercent((dailySet.size / Math.max(7, Math.min(31, dailySet.size || 1))) * 100);
  const artistVariety = normalizeToPercent(Math.log1p(varietyRatio * 16) / Math.log(17) * 100);
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
  const vec = metricsVector(metrics);
  const mean = vec.reduce((sum, value) => sum + value, 0) / vec.length;
  const variance = vec.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / vec.length;
  const sigma = Math.sqrt(Math.max(variance, 1));

  return FRUIT_PROFILES
    .map((f) => {
      const profileVec = f.v;
      const euclidean = Math.sqrt(profileVec.reduce((sum, value, i) => sum + Math.pow(value - vec[i], 2), 0));
      const covarianceAdjusted = Math.sqrt(profileVec.reduce((sum, value, i) => sum + Math.pow((value - vec[i]) / sigma, 2), 0));
      const dot = profileVec.reduce((sum, value, i) => sum + value * vec[i], 0);
      const profileNorm = Math.sqrt(profileVec.reduce((sum, value) => sum + value * value, 0));
      const vecNorm = Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0));
      const cosineDistance = 1 - dot / Math.max(1, profileNorm * vecNorm);
      const blendedScore = euclidean * 0.45 + covarianceAdjusted * 0.35 + cosineDistance * 100 * 0.2;
      return { ...f, score: blendedScore };
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

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    if (!active) { setPhase(0); return; }
    setPhase(1);
    timers.current.push(setTimeout(() => setPhase(2), 2000));
    timers.current.push(setTimeout(() => setPhase(3), 3500));
    timers.current.push(setTimeout(() => setPhase(4), 5000));
    return () => timers.current.forEach(clearTimeout);
  }, [active]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      <style>{`@keyframes floatUp { 0% { transform: translateY(110vh) rotate(0deg); opacity:0; } 10% { opacity:0.18; } 90% { opacity:0.12; } 100% { transform: translateY(-20vh) rotate(360deg); opacity:0; } }`}</style>
      {SLIDE4_BG_EMOJIS.map((e, i) => (
        <div key={e + i} style={{ position: 'absolute', left: `${(i * 8.5) % 100}%`, bottom: '-10%', fontSize: 22 + (i % 4) * 6, animation: `floatUp ${7 + (i % 5) * 1.8}s linear ${(i * 0.9) % 6}s infinite`, pointerEvents: 'none', zIndex: 1 }}>{e}</div>
      ))}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 20px 20px', gap: 8, position: 'relative', zIndex: 2 }}>
        <AnimatePresence>
          {(phase === 1 || phase === 2) && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.4 }}>
              <h1 style={{ margin: '0 0 4px 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(30px, 8vw, 46px)', color: NB.white, textTransform: 'uppercase', lineHeight: 1 }}>WHAT FRUIT ARE YOU?</h1>
              <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>
                {phase === 1 ? 'POWERED BY REAL LISTENING HISTORY' : 'SCANNING YOUR 8-POINT MUSIC DNA'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ height: 180, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div animate={{ rotate: phase >= 1 ? (phase >= 2 ? 3600 : 360) : 0 }} transition={{ duration: phase >= 2 ? 2 : 12, repeat: phase <= 2 ? Infinity : 0, ease: phase >= 2 ? [0.4, 0, 0.2, 1] : 'linear' }} style={{ position: 'absolute', width: '100%', height: '100%' }}>
            {FRUIT_PROFILES.map((fruit, i) => {
              const angle = (360 / FRUIT_PROFILES.length) * i;
              const rad = (angle * Math.PI) / 180;
              const isWinner = fruit.name === winningFruit?.name;
              return (
                <motion.div
                  key={fruit.name}
                  animate={{ opacity: phase >= 3 ? 0 : 0.9, scale: phase >= 3 ? 0 : 1 }}
                  transition={{ duration: 0.6, delay: isWinner ? 0.2 : 0 }}
                  style={{ position: 'absolute', left: `calc(50% + ${Math.cos(rad) * 92}px - 16px)`, top: `calc(50% + ${Math.sin(rad) * 92}px - 16px)`, fontSize: 28, userSelect: 'none' }}
                >
                  {fruit.emoji}
                </motion.div>
              );
            })}
          </motion.div>

          <AnimatePresence>
            {phase >= 3 && winningFruit && (
              <motion.div initial={{ scale: 0, y: 30 }} animate={{ scale: 1, y: phase >= 4 ? -10 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, zIndex: 5 }}>
                <div style={{ width: 100, height: 100, borderRadius: '50%', border: `4px solid ${NB.acidYellow}`, background: 'rgba(204,255,0,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 58 }}>
                  {winningFruit.emoji}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {phase >= 4 && winningFruit && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <BCard style={{ background: NB.white, maxHeight: '54vh', overflowY: 'auto' }}>
                <p style={{ margin: '0 0 2px 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 30, color: NB.black }}>
                  YOU ARE {winningFruit.emoji} {winningFruit.name}
                </p>
                <p style={{ margin: '0 0 8px 0', fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#333' }}>Your listening matches: {winningFruit.vibe}.</p>
                <p style={{ margin: '0 0 8px 0', fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#444' }}>Unique DNA sequence: <b>{dnaSequence}</b></p>
                {/* DNA double helix visualization (derived from the generated sequence) */}
                <svg width="100%" height="52" viewBox="0 0 310 52" style={{ marginBottom: 10, display: 'block' }}>
                  {Array.from({ length: Math.min(24, Math.floor(dnaSequence.length / 2)) }, (_, i) => {
                    const pair = dnaSequence.slice(i * 2, i * 2 + 2);
                    const baseA = pair[0] || 'A';
                    const baseB = pair[1] || 'T';
                    const colorMap: Record<string, string> = { A: NB.electricBlue, T: NB.coral, C: NB.magenta, G: NB.acidYellow };
                    const x = 8 + i * 12;
                    const wave = Math.sin((i / 8) * Math.PI);
                    const y1 = 26 + wave * 16;
                    const y2 = 26 - wave * 16;
                    const nextX = 8 + (i + 1) * 12;
                    const nextWave = Math.sin(((i + 1) / 8) * Math.PI);
                    const nextY1 = 26 + nextWave * 16;
                    const nextY2 = 26 - nextWave * 16;
                    return (
                      <g key={`${pair}-${i}`}>
                        {i < 23 && <line x1={x} y1={y1} x2={nextX} y2={nextY1} stroke={colorMap[baseA]} strokeWidth={1.5} opacity={0.55} />}
                        {i < 23 && <line x1={x} y1={y2} x2={nextX} y2={nextY2} stroke={colorMap[baseB]} strokeWidth={1.5} opacity={0.55} />}
                        <line x1={x} y1={y1} x2={x} y2={y2} stroke="#989898" strokeWidth={0.9} opacity={0.75} />
                        <circle cx={x} cy={y1} r={2.6} fill={colorMap[baseA]} />
                        <circle cx={x} cy={y2} r={2.6} fill={colorMap[baseB]} />
                      </g>
                    );
                  })}
                </svg>
                {DNA_METRIC_CONFIG.map((metric, i) => {
                  const metricValue = metrics[metric.key] as number;
                  return (
                  <div key={metric.label} style={{ marginBottom: i === DNA_METRIC_CONFIG.length - 1 ? 0 : 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11 }}>{metric.label}</span>
                      <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900 }}>{metricValue}%</span>
                    </div>
                    <p style={{ margin: '0 0 4px 0', fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#666' }}>{metric.hint}</p>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${metricValue}%` }} transition={{ duration: 0.6, delay: i * 0.12 }} style={{ height: 10, background: metric.color, border: `2px solid ${NB.black}`, color: metric.textColor || NB.black }} />
                  </div>
                  );
                })}
                <p style={{ margin: '10px 0 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#444' }}>{metrics.reasonSummary}</p>
                <p style={{ margin: '6px 0 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#444' }}>{metrics.notes.join(' • ')}</p>
              </BCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Ticker text="FRUIT DNA  REAL DATA  8 METRIC PROFILE" bg={NB.acidYellow} color={NB.black} />
    </div>
  );
};

// SLIDE 5: THE TIME MACHINE
const Slide5: React.FC<{ active: boolean }> = ({ active }) => {
  const [history, setHistory] = useState<Array<{ played_at: string; duration_ms: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    fetchHeatmapData().then((rows) => {
      if (cancelled) return;
      setHistory((rows || []).map((row: any) => ({ played_at: row.played_at, duration_ms: row.duration_ms || 0 })));
    }).catch(() => {
      if (!cancelled) setHistory([]);
    });
    return () => { cancelled = true; };
  }, []);

  const timeInsights = useMemo(() => {
    const buckets = [
      { label: 'MORNING', start: 5, end: 11, color: NB.acidYellow, story: 'Coffee + commute soundtrack', icon: '🌅' },
      { label: 'AFTERNOON', start: 12, end: 16, color: NB.coral, story: 'Momentum while the day peaks', icon: '☀️' },
      { label: 'EVENING', start: 17, end: 20, color: NB.magenta, story: 'Decompress and reset zone', icon: '🌆' },
      { label: 'LATE NIGHT', start: 21, end: 4, color: NB.white, story: 'After-hours deep listening', icon: '🌙' },
    ];

    const totals = buckets.map((b) => ({ ...b, ms: 0, plays: 0 }));
    for (const row of history) {
      const hour = new Date(row.played_at).getHours();
      totals.forEach((bucket) => {
        const inRange = bucket.start <= bucket.end ? hour >= bucket.start && hour <= bucket.end : hour >= bucket.start || hour <= bucket.end;
        if (inRange) {
          bucket.ms += row.duration_ms || 0;
          bucket.plays += 1;
        }
      });
    }
    const winner = [...totals].sort((a, b) => b.ms - a.ms)[0] || totals[0];
    const totalMs = totals.reduce((sum, b) => sum + b.ms, 0) || 1;
    const ranked = [...totals].sort((a, b) => b.ms - a.ms);
    const runnerUp = ranked[1] || ranked[0];
    const winnerGap = Math.max(0, Math.round(((winner.ms - (runnerUp?.ms || 0)) / totalMs) * 100));
    return { totals, winner, totalMs, runnerUp, winnerGap };
  }, [history]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.electricBlue, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 12, overflowY: 'auto' }}>
        <h2 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 8vw, 52px)', color: NB.white, textTransform: 'uppercase', margin: 0 }}>YOUR LISTENING STORY</h2>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', margin: 0 }}>REAL PLAYTIME SPLIT FROM YOUR HISTORY</p>

        <BCard style={{ marginTop: 2, background: 'rgba(255,255,255,0.96)' }}>
          <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#333' }}>Narrative Snapshot</p>
          <p style={{ margin: '4px 0 2px 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 28, lineHeight: 1, color: NB.black }}>{timeInsights.winner.icon} {timeInsights.winner.label} owns your week</p>
          <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#444' }}>{timeInsights.winnerGap}% more playtime than {timeInsights.runnerUp.label.toLowerCase()} — {timeInsights.winner.story.toLowerCase()}.</p>
        </BCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {timeInsights.totals.map((bucket, i) => {
            const pct = Math.round((bucket.ms / timeInsights.totalMs) * 100);
            return (
              <motion.div key={bucket.label} initial={{ opacity: 0, x: -18 }} animate={{ opacity: active ? 1 : 0.5, x: active ? 0 : -18 }} transition={{ delay: i * 0.1 }} style={{ background: 'rgba(255,255,255,0.96)', border: `4px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', padding: '10px 10px 12px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 18, color: NB.black }}>{bucket.icon} {bucket.label}</p>
                  <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 30, color: NB.black, lineHeight: 1 }}>{pct}%</p>
                </div>
                <div style={{ height: 16, background: '#d9d9d9', border: `2px solid ${NB.black}`, overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: active ? `${pct}%` : 0 }} transition={{ duration: 0.65, delay: 0.1 + i * 0.1, ease: [0.34, 1.56, 0.64, 1] }} style={{ height: '100%', background: bucket.color }} />
                </div>
                <p style={{ margin: '6px 0 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 11, color: 'rgba(0,0,0,0.8)' }}>{bucket.plays} plays • {bucket.story}</p>
              </motion.div>
            );
          })}
        </div>

        <BCard style={{ marginTop: 4 }}>
          <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#333' }}>PEAK WINDOW</p>
          <p style={{ margin: '2px 0 0 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 30, color: NB.black }}>{timeInsights.winner.label}</p>
        </BCard>
      </div>
      <Ticker text="TIME MACHINE  LISTENING WINDOWS  DAYPART ENERGY" bg={NB.nearBlack} color={NB.acidYellow} />
    </div>
  );
};

// SLIDE 6: THE LOYALTY TEST
const Slide6: React.FC<{ active: boolean; artists: Artist[] }> = ({ active, artists }) => {
  const topSix = artists.slice(0, 6);
  const total = topSix.reduce((s, a) => s + a.totalListens, 0) || 1;
  const topShare = (topSix[0]?.totalListens || 0) / total;
  const verdict = topShare > 0.35 ? 'RIDE OR DIE ENERGY' : 'WIDE TASTE ENERGY';
  const winner = topSix[0];

  const DOT_COUNT = 60;
  const artistPalette = [NB.electricBlue, NB.coral, NB.magenta, '#555555', NB.acidYellow, '#888888'];
  const [filledDots, setFilledDots] = useState(0);
  const dotIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dotColors = useMemo(() => {
    const colors: string[] = [];
    let offset = 0;
    topSix.forEach((artist, i) => {
      const count = Math.round((artist.totalListens / total) * DOT_COUNT);
      for (let j = 0; j < count && offset < DOT_COUNT; j++, offset++) {
        colors.push(artistPalette[i]);
      }
    });
    while (colors.length < DOT_COUNT) colors.push('rgba(0,0,0,0.15)');
    return colors;
  }, [topSix, total]);

  useEffect(() => {
    if (!active || topSix.length === 0) { setFilledDots(0); if (dotIntervalRef.current) clearInterval(dotIntervalRef.current); return; }
    setFilledDots(0);
    let count = 0;
    dotIntervalRef.current = setInterval(() => {
      count++;
      setFilledDots(count);
      if (count >= DOT_COUNT && dotIntervalRef.current) clearInterval(dotIntervalRef.current);
    }, 20);
    return () => { if (dotIntervalRef.current) clearInterval(dotIntervalRef.current); };
  }, [active, topSix.length]);

  const showLegend = filledDots >= DOT_COUNT;
  const loyaltyDotSize = 'clamp(10px, 2.8vw, 18px)';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.acidYellow, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 16px 14px', gap: 10 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(30px, 7.4vw, 52px)', color: NB.black, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>YOUR LOYALTY MAP</h1>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.black, margin: 0 }}>TOP ARTISTS • 60 DOTS • WHO OWNS YOUR PLAYS</p>

        {/* Dot grid: 6 cols × 10 rows */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(6, ${loyaltyDotSize})`, gap: 'clamp(4px, 1vw, 6px)', marginTop: 4, justifyContent: 'center' }}>
          {Array.from({ length: DOT_COUNT }, (_, i) => (
            <div key={i} style={{
              width: loyaltyDotSize,
              height: loyaltyDotSize,
              borderRadius: '50%',
              background: i < filledDots ? dotColors[i] : 'transparent',
              border: `1.5px solid ${i < filledDots ? dotColors[i] : 'rgba(0,0,0,0.25)'}`,
              transition: 'background 80ms ease, border-color 80ms ease',
            }} />
          ))}
        </div>

        {/* Legend after dots fill */}
        {showLegend && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {topSix.map((artist, i) => {
              const dotCount = dotColors.filter(c => c === artistPalette[i]).length;
              return (
                <div key={artist.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: artistPalette[i], flexShrink: 0, border: `2px solid ${NB.black}` }} />
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 12, color: NB.black, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 13, color: NB.black }}>{dotCount} dots</span>
                </div>
              );
            })}
          </motion.div>
        )}

        <BCard>
          <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 26, color: NB.black, textTransform: 'uppercase' }}>{verdict}</p>
          {winner && <p style={{ margin: '4px 0 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#333' }}>🏆 {winner.name} dominates your chart</p>}
          <p style={{ margin: '6px 0 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#222' }}>
            Loyalty means your top artist owns <b>{Math.round(topShare * 100)}%</b> of your top-6 listens. High % = focused super-fan mode, lower % = a wider artist mix.
          </p>
        </BCard>
      </div>
      <Ticker text="LOYALTY MAP  ARTIST CREW  TOP ROTATION" bg={NB.nearBlack} color={NB.acidYellow} />
    </div>
  );
};

// SLIDE 7: THE STREAK
const Slide7: React.FC<{ active: boolean; artists: Artist[]; songs: Song[] }> = ({ active }) => {
  const [waveCol, setWaveCol] = useState(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [heatmapData, setHeatmapData] = useState<Array<{ played_at: string; duration_ms: number }>>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Fetch real heatmap data
  useEffect(() => {
    let cancelled = false;
    fetchHeatmapData().then((data) => {
      if (!cancelled) {
        setHeatmapData(data || []);
        setDataLoaded(true);
      }
    }).catch(() => {
      if (!cancelled) setDataLoaded(true); // proceed with empty data on error
    });
    return () => { cancelled = true; };
  }, []);

  // Build real 365-day grid from heatmap data
  const { gridData, STREAK_LEN, STREAK_START } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const jan1 = new Date(year, 0, 1);
    const dailyCounts: Record<string, number> = {};

    for (const item of heatmapData) {
      if (!item.played_at) continue;
      const d = new Date(item.played_at);
      if (d.getFullYear() !== year) continue;
      const key = d.toLocaleDateString('en-CA');
      dailyCounts[key] = (dailyCounts[key] || 0) + 1;
    }

    const maxCount = Math.max(1, ...Object.values(dailyCounts));
    const gd = Array.from({ length: 365 }, (_, i) => {
      const date = new Date(jan1);
      date.setDate(jan1.getDate() + i);
      const key = date.toLocaleDateString('en-CA');
      return Math.min(1, (dailyCounts[key] || 0) / maxCount);
    });

    // Find longest streak of days with listens
    let bestStart = 0, bestLen = 0, cur = 0, curStart = 0;
    for (let i = 0; i < gd.length; i++) {
      if (gd[i] > 0) {
        if (cur === 0) curStart = i;
        cur++;
        if (cur > bestLen) { bestLen = cur; bestStart = curStart; }
      } else {
        cur = 0;
      }
    }
    const finalLen = Math.max(1, bestLen);
    const finalStart = bestLen > 0 ? bestStart : Math.max(0, 340 - finalLen);
    return { gridData: gd, STREAK_LEN: finalLen, STREAK_START: finalStart };
  }, [heatmapData]);

  const weeks = 52;
  const days = 7;

  useEffect(() => {
    if (!active) { setWaveCol(-1); if (intervalRef.current) clearInterval(intervalRef.current); return; }
    setWaveCol(-1);
    let col = -1;
    intervalRef.current = setInterval(() => {
      col++;
      setWaveCol(col);
      if (col >= weeks && intervalRef.current) clearInterval(intervalRef.current);
    }, 35);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, dataLoaded]);

  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const monthStartWeeks = [0,4,8,13,17,21,26,30,34,39,43,47];

  const getCellColor = (val: number, revealed: boolean) => {
    if (!revealed) return '#1a1a1a';
    if (val < 0.15) return '#1a1a1a';
    if (val < 0.4) return NB.acidYellow + '33';
    if (val < 0.7) return NB.acidYellow + '99';
    return NB.acidYellow;
  };

  const isStreak = (w: number, d: number) => {
    const dayIndex = w * 7 + d;
    return dayIndex >= STREAK_START && dayIndex < STREAK_START + STREAK_LEN;
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
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
                    background: getCellColor(val, revealed),
                    border: inStreak && revealed ? `1px solid ${NB.white}` : '1px solid #333',
                    transition: 'background 80ms ease',
                  }} />
                );
              })}
            </div>
          ))}
        </div>
        {waveCol >= weeks - 1 && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 8 }}>
            <div>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px 0' }}>YOUR LONGEST STREAK</p>
              <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 12vw, 72px)', color: NB.acidYellow, margin: 0, lineHeight: 1 }}>{STREAK_LEN}</p>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>DAYS</p>
            </div>
            <div style={{ background: NB.white, border: `4px solid ${NB.black}`, boxShadow: '5px 5px 0 #000', padding: '10px 14px', flex: 1, borderRadius: 0 }}>
              <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 16, color: NB.black, textTransform: 'uppercase', margin: 0 }}>CONSISTENCY IS YOUR SUPERPOWER</p>
            </div>
          </div>
        )}
      </div>
      <Ticker text="THE STREAK  DAYS OF LISTENING" bg={NB.acidYellow} color={NB.black} />
    </div>
  );
};

// SLIDE 8: THE FIRST PLAY
const Slide8: React.FC<{ active: boolean; songs: Song[] }> = ({ active, songs }) => {
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
      `}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 20px 20px', gap: 14 }}>
        <div>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', margin: '0 0 8px 0' }}>YOUR YEAR STARTED WITH...</p>
          <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(36px, 9vw, 60px)', color: NB.white, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>YOUR FIRST PLAY</h1>
        </div>

        {/* Phase 1: Vinyl / record player */}
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} style={{ display: 'flex', justifyContent: 'center', position: 'relative', height: 160 }}>
            <div style={{ width: 160, height: 160, borderRadius: '50%', background: '#111', border: `4px solid ${NB.black}`, position: 'relative', animation: phase >= 2 ? 'vinylSpin8 5s linear infinite' : 'none' }}>
              <img src={firstSong?.cover || fallbackImage} alt="" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', border: `3px solid ${NB.white}` }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
              <div style={{ width: 12, height: 12, background: NB.acidYellow, border: `2px solid ${NB.black}`, borderRadius: '50%', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }} />
            </div>
            {/* Needle */}
            <div style={{ position: 'absolute', right: 'calc(50% - 100px)', top: 0, width: 4, height: 72, background: NB.white, transformOrigin: 'top right', animationName: 'needleDrop', animationDuration: '0.6s', animationTimingFunction: 'ease-out', animationFillMode: 'forwards', borderRadius: 2 }} />
          </motion.div>
        )}

        {/* Phase 2: Song card flies in from bottom */}
        {firstSong && (
          <div style={{
            background: NB.black, border: `4px solid ${NB.black}`, position: 'relative', borderRadius: 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(120%)',
            opacity: phase >= 2 ? 1 : 0,
            transition: 'transform 400ms cubic-bezier(0.16,1,0.3,1), opacity 300ms ease',
            overflow: 'hidden',
          }}>
            {firstSong.cover && (
              <div style={{ height: 130, background: '#222', borderBottom: `4px solid ${NB.black}` }}>
                <img src={firstSong.cover} alt={firstSong.album} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
              </div>
            )}
            <div style={{ padding: '14px 20px 12px' }}>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.coral, margin: '0 0 6px 0' }}>JAN 1, 2024</p>
              <h2 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(24px, 6vw, 38px)', color: NB.white, textTransform: 'uppercase', margin: '0 0 4px 0', lineHeight: 1 }}>{firstSong.title}</h2>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{firstSong.artist}</p>
            </div>
          </div>
        )}

        {/* Phase 3: REWIND button */}
        {phase >= 3 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <button
              onClick={(e) => { e.stopPropagation(); triggerAnimation(); }}
              style={{ background: NB.acidYellow, border: `3px solid ${NB.black}`, boxShadow: '3px 3px 0 #000', padding: '10px 24px', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 16, cursor: 'pointer', textTransform: 'uppercase', borderRadius: 0 }}
            >
              ↺ REWIND
            </button>
          </motion.div>
        )}

        {/* Phase 4: "THIS IS WHERE IT ALL BEGAN" */}
        {phase >= 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div style={{ borderTop: `2px solid rgba(255,255,255,0.2)`, paddingTop: 12 }}>
              <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 20, color: NB.acidYellow, textTransform: 'uppercase', margin: '0 0 4px 0' }}>THIS IS WHERE IT ALL BEGAN</p>
              {firstSong && <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{firstSong.listens.toLocaleString()} plays this year</p>}
            </div>
          </motion.div>
        )}
      </div>
      <Ticker text="THE FIRST PLAY  WHERE IT ALL STARTED" bg={NB.black} color={NB.white} />
    </div>
  );
};

// SLIDE 9: THE ORBIT LOCK-IN
const Slide9: React.FC<{ active: boolean; artists: Artist[]; songs: Song[] }> = ({ active, artists, songs }) => {
  const topArtist = artists[0];
  const topTracks = songs.slice(0, 5);
  const orbitScore = Math.min(250, 80 + Math.round((topArtist?.totalListens || 0) / 3) + Math.round((songs[0]?.listens || 0) / 2));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
      <style>{`@keyframes orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 16px', gap: 12 }}>
        <h2 style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(34px, 8vw, 56px)', color: NB.white, textTransform: 'uppercase', lineHeight: 1 }}>OBSESSION ORBIT</h2>
        <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' }}>NO BARS. JUST YOUR LOCK-IN GRAVITY.</p>

        <div style={{ flex: 1, minHeight: 260, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 250, height: 250, borderRadius: '50%', border: `2px dashed ${NB.electricBlue}`, position: 'absolute' }} />
          <div style={{ width: 190, height: 190, borderRadius: '50%', border: `2px dashed ${NB.coral}`, position: 'absolute' }} />
          <div style={{ width: 130, height: 130, borderRadius: '50%', border: `2px dashed ${NB.magenta}`, position: 'absolute' }} />

          <div style={{ width: 110, height: 110, borderRadius: '50%', background: NB.acidYellow, border: `4px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 8 }}>
            <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 15, color: NB.black, textTransform: 'uppercase', lineHeight: 1 }}>{topArtist?.name || 'TOP ARTIST'}</p>
            <p style={{ margin: '4px 0 0 0', fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 10, color: '#222' }}>Orbit {orbitScore}/250</p>
          </div>

          {[120, 90, 65].map((radius, ring) => (
            <div key={radius} style={{ position: 'absolute', width: radius * 2, height: radius * 2, animation: `orbitSpin ${16 - ring * 3}s linear infinite` }}>
              {topTracks.slice(ring, ring + 2).map((song, idx) => {
                const angle = ((idx * 180) + ring * 55) * (Math.PI / 180);
                return (
                  <motion.div key={`${song.id}-${ring}`} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: active ? 1 : 0.6, scale: 1 }} style={{ position: 'absolute', left: `calc(50% + ${Math.cos(angle) * radius}px - 24px)`, top: `calc(50% + ${Math.sin(angle) * radius}px - 24px)`, width: 48, height: 48, borderRadius: '50%', border: `3px solid ${NB.black}`, overflow: 'hidden', background: '#111' }}>
                    <img src={song.cover || fallbackImage} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
                  </motion.div>
                );
              })}
            </div>
          ))}
        </div>

        <BCard style={{ background: NB.white }}>
          <p style={{ margin: '0 0 4px 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 20, color: NB.black, textTransform: 'uppercase' }}>Compliment:</p>
          <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 13, color: '#222' }}>
            Chapter 1: you discovered <b>{topArtist?.name || 'your top artist'}</b>. Chapter 2: you replayed favorites until they became comfort tracks. Chapter 3: orbit locked.
          </p>
        </BCard>
      </div>
      <Ticker text="OBSESSION ORBIT  DOM MODE  LOCKED IN" bg={NB.acidYellow} color={NB.black} />
    </div>
  );
};

// SLIDE 10: THE CONNECTION
const Slide10: React.FC<{ active: boolean; artists: Artist[]; rangeLabel?: string; connectionGraph?: { artistInfo: Record<string, any>; pairs: Record<string, Record<string, number>> } }> = ({ active, artists, rangeLabel, connectionGraph }) => {
  const pairs = useMemo(() => buildConnectionPairs(connectionGraph), [connectionGraph]);
  const [slotIndex, setSlotIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const fallbackPair = useMemo(() => {
    const first = artists[0];
    const second = artists[1];
    if (!first || !second) return null;
    return {
      a: { id: first.id, name: first.name, image: first.image || fallbackImage },
      b: { id: second.id, name: second.name, image: second.image || fallbackImage },
      closeness: 68,
      sharedSessions: 12,
    } satisfies ConnectionPair;
  }, [artists]);

  const displayPairs = useMemo(() => {
    const extraPairs = artists.slice(0, 4).flatMap((a, i) => artists.slice(i + 1, 5).map((b, j) => ({
      a: { id: a.id, name: a.name, image: a.image || fallbackImage },
      b: { id: b.id, name: b.name, image: b.image || fallbackImage },
      closeness: Math.min(96, 52 + (i * 8) + (j * 6)),
      sharedSessions: Math.max(3, Math.round((a.totalListens + b.totalListens) / 22)),
    } as ConnectionPair)));
    const mergedPairs = [...pairs, ...extraPairs].filter((pair, idx, arr) => idx === arr.findIndex((x) => [x.a.id, x.b.id].sort().join(':') === [pair.a.id, pair.b.id].sort().join(':')));
    return mergedPairs.length ? mergedPairs : fallbackPair ? [fallbackPair] : [];
  }, [artists, pairs, fallbackPair]);
  const winner = displayPairs[0];

  useEffect(() => {
    if (!active || displayPairs.length <= 1) {
      setRevealed(true);
      return;
    }
    setRevealed(false);
    let tick = 0;
    const id = window.setInterval(() => {
      tick += 1;
      setSlotIndex((prev) => (prev + 1) % displayPairs.length);
      if (tick > 10) {
        window.clearInterval(id);
        setSlotIndex(0);
        setRevealed(true);
      }
    }, 170);
    return () => window.clearInterval(id);
  }, [active, displayPairs]);

  const roller = displayPairs.length ? displayPairs[slotIndex] : undefined;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.magenta, overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 14 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(34px, 8vw, 56px)', color: NB.white, margin: 0, textTransform: 'uppercase', lineHeight: 1 }}>
          CLOSE CONNECTION HIGHLIGHT
        </h1>
        <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>
          BASED ON ARTISTS PLAYED CLOSE TOGETHER IN THIS WRAPPED RANGE
        </p>

        <div style={{ background: NB.white, border: `4px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', padding: '14px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
            {[roller?.a, roller?.b].map((artist, idx) => (
              <div key={artist?.id || idx} style={{ width: 94, textAlign: 'center' }}>
                <div style={{ width: 84, height: 84, borderRadius: '50%', border: `4px solid ${NB.black}`, overflow: 'hidden', margin: '0 auto 6px auto', background: '#ddd' }}>
                  <img src={artist?.image || fallbackImage} alt={artist?.name || 'artist'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
                </div>
                <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14, color: NB.black, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist?.name || '---'}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, height: 34, background: NB.black, border: `3px solid ${NB.black}`, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            <motion.div
              key={`${slotIndex}-${revealed}`}
              initial={{ y: -18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.18 }}
              style={{ color: NB.acidYellow, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', width: '100%', textAlign: 'center', fontSize: 14 }}
            >
              {revealed && winner ? `${winner.a.name} × ${winner.b.name}` : 'SCANNING CONNECTIONS...'}
            </motion.div>
          </div>
        </div>

        {winner && (
          <div style={{ background: NB.acidYellow, border: `4px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', padding: '12px 14px' }}>
            <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 32, color: NB.black, textTransform: 'uppercase' }}>
              {winner.closeness}% CLOSE
            </p>
            <p style={{ margin: '4px 0 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 12, color: NB.black }}>
              {winner.sharedSessions} shared listening sessions between these artists in {rangeLabel || 'this wrapped range'}.
            </p>
          </div>
        )}
      </div>
      <Ticker text="CONNECTION MODE  SPIN  MATCH  LOCK-IN" bg={NB.nearBlack} color={NB.white} />
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
        boxShadow: '4px 4px 0 #000', padding: 10,
        animation: pulsing === index ? 'replayPulse 0.8s ease' : undefined,
      }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img
          src={song.cover || fallbackImage}
          alt={song.title}
          style={{ width: 64, height: 64, objectFit: 'cover', border: `3px solid ${NB.black}`, borderRadius: '50%', display: 'block', animation: active ? 'vinylSpin 4s linear infinite' : 'none' }}
          onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }}
        />
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(0,0,0,0.2)', pointerEvents: 'none' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 20, fontWeight: 900, textTransform: 'uppercase', color: NB.black, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
        <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#555' }}>{song.artist}</p>
      </div>
      <motion.div
        animate={{ scale: pulsing === index ? [1, 1.2, 1] : 1 }}
        transition={{ duration: 0.4 }}
        style={{ background: NB.black, color: NB.acidYellow, padding: '8px 10px', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 18, fontWeight: 900, flexShrink: 0, minWidth: 52, textAlign: 'center' }}
      >
        {displayCount}×
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
      `}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 16px', gap: 10 }}>
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

        {/* Vinyl showing current song */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative', height: 170, flexShrink: 0 }}>
          <div style={{ width: 170, height: 170, borderRadius: '50%', border: `4px solid ${NB.black}`, background: '#111', position: 'relative', animation: 'vinylSpin 6s linear infinite' }}>
            <img src={currentSong?.cover || fallbackImage} alt={currentSong?.title || ''} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: '50%', border: `4px solid ${NB.white}`, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
            <div style={{ width: 14, height: 14, background: NB.acidYellow, border: `3px solid ${NB.black}`, borderRadius: '50%', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2 }} />
          </div>
          <div style={{ position: 'absolute', width: 200, height: 200, top: -15, borderRadius: '50%', border: `2px dashed ${NB.acidYellow}`, animation: 'pulseRing 1.8s ease-out infinite' }} />
        </div>

        {/* TOTAL LOOPS counter */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(36px, 9vw, 58px)', color: NB.acidYellow, lineHeight: 1 }}>{displayTotal.toLocaleString()}</span>
          <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 12, color: NB.white, textTransform: 'uppercase', letterSpacing: '0.1em' }}>TOTAL LOOPS</span>
        </div>

        {/* Track rows with animated spin counts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {loops.map((song, i) => (
            <ReplayTrackRow key={song.id} song={song} index={i} active={active} pulsing={pulsing} targetCount={song.listens} />
          ))}
        </div>
      </div>
      <Ticker text="REPLAY VALUE  VINYL LOOP  RUN IT BACK" bg={NB.nearBlack} color={NB.white} />
    </div>
  );
};

// SLIDE 12: FINAL SHARE
const Slide12: React.FC<{ totalMinutes: number; artists: Artist[]; songs: Song[]; albums: Album[]; onClose: () => void; winningFruit?: { name: string; emoji: string } | null }> = ({ totalMinutes, artists, songs, albums, onClose, winningFruit }) => {
  const topArtist = artists[0]?.name ?? '\u2014';
  const topSong = songs[0]?.title ?? '\u2014';
  const secondArtist = artists[1]?.name ?? '\u2014';
  const [hovered, setHovered] = useState<number | null>(null);
  const [isAnimIn, setIsAnimIn] = useState(false);

  // Sort albums by descending totalListens (most listened first)
  const carouselAlbums = useMemo(() => [...albums].sort((a, b) => b.totalListens - a.totalListens), [albums]);
  const loopAlbums = useMemo(() => [...carouselAlbums, ...carouselAlbums, ...carouselAlbums], [carouselAlbums]);

  useEffect(() => {
    const t = setTimeout(() => setIsAnimIn(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ background: NB.acidYellow, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `4px solid ${NB.black}`, position: 'relative', padding: '20px 16px', flexShrink: 0 }}>
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(36px, 10vw, 72px)', color: NB.black, textTransform: 'uppercase', margin: 0, letterSpacing: '-0.02em', zIndex: 2, textAlign: 'center' }}
        >
          PUNKY WRAPPED
        </motion.h1>
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(135deg, transparent 0 14px, rgba(0,0,0,0.08) 14px 22px)' }} />
      </div>

      {/* Album carousel */}
      <div style={{ background: NB.nearBlack, padding: '12px 0', borderBottom: `3px solid ${NB.black}`, flexShrink: 0, overflow: 'hidden' }}>
        <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', textAlign: 'center', margin: '0 0 8px 0' }}>YOUR TOP ALBUMS</p>
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <motion.div
            animate={{ x: hovered !== null ? 0 : [0, `-${100 / 3}%`] }}
            transition={{ duration: Math.min(8 * (carouselAlbums.length / 6 || 1), 30), repeat: Infinity, ease: 'linear' }}
            style={{ display: 'flex', width: 'fit-content', gap: 8, paddingLeft: 8 }}
          >
            {loopAlbums.map((album, idx) => (
              <div
                key={`${album.id}-${idx}`}
                onMouseEnter={() => setHovered(idx)}
                onMouseLeave={() => setHovered(null)}
                onTouchStart={() => setHovered(idx)}
                onTouchEnd={() => setTimeout(() => setHovered(null), 1500)}
                style={{ position: 'relative', flexShrink: 0 }}
              >
                <img
                  src={album.cover || fallbackImage}
                  alt={album.title}
                  style={{ width: 80, height: 80, border: `3px solid ${hovered === idx ? NB.acidYellow : NB.white}`, objectFit: 'cover', display: 'block', transition: 'border-color 0.2s' }}
                  onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }}
                />
                {hovered === idx && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ position: 'absolute', bottom: '100%', left: 0, background: NB.acidYellow, color: NB.black, fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 10, padding: '4px 8px', border: `2px solid ${NB.black}`, marginBottom: 4, whiteSpace: 'nowrap', zIndex: 10, maxWidth: 160 }}
                  >
                    {album.title}<br/>{Math.round((album.totalListens || 0) * 3.5 / 60)} mins
                  </motion.div>
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ background: NB.nearBlack, flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: isAnimIn ? 1 : 0, y: isAnimIn ? 0 : 20 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
        >
          {[
            { label: 'TOTAL MINUTES', value: totalMinutes.toLocaleString(), color: NB.electricBlue },
            { label: '#1 ARTIST', value: topArtist, color: NB.coral },
            { label: '#1 SONG', value: topSong, color: NB.magenta },
            { label: 'ALSO LOVED', value: secondArtist, color: '#555' },
          ].map((s) => (
            <div key={s.label} style={{ background: s.color, border: `3px solid ${NB.black}`, boxShadow: '3px 3px 0 #000', padding: '10px 12px' }}>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', margin: '0 0 4px 0' }}>{s.label}</p>
              <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 16, color: NB.white, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Fruit summary */}
        {winningFruit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: isAnimIn ? 1 : 0, scale: isAnimIn ? 1 : 0.9 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{ background: NB.white, border: `4px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <span style={{ fontSize: 42 }}>{winningFruit.emoji}</span>
            <div>
              <p style={{ margin: '0 0 2px 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 18, color: NB.black }}>YOU ARE A {winningFruit.name}</p>
              <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontSize: 11, color: '#555' }}>Based on your listening DNA</p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isAnimIn ? 1 : 0, y: isAnimIn ? 0 : 10 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          style={{ marginTop: 4 }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{ width: '100%', height: 50, background: NB.coral, color: NB.white, border: `3px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', display: 'block', borderRadius: 0 }}
          >
            VIEW FULL STATS →
          </button>
        </motion.div>
      </div>
      <Ticker text="PUNKY WRAPPED  YOUR YEAR IN MUSIC  KEEP LISTENING" bg={NB.acidYellow} color={NB.black} />
    </div>
  );
};

// SLIDE DOMINATION: WHO RUNS YOUR CHART
const SlideDomination: React.FC<{ active: boolean; artists: Artist[] }> = ({ active, artists }) => {
  const TOTAL_DOTS = 100;
  const top5 = artists.slice(0, 5);
  const total = top5.reduce((s, a) => s + a.totalListens, 0) || 1;
  const [filledCount, setFilledCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const domArtistColors = [NB.electricBlue, NB.coral, NB.magenta, NB.acidYellow, '#888888'];

  const dotColors = useMemo(() => {
    const colors: string[] = [];
    let offset = 0;
    top5.forEach((artist, i) => {
      const count = Math.round((artist.totalListens / total) * TOTAL_DOTS);
      for (let j = 0; j < count && offset < TOTAL_DOTS; j++, offset++) {
        colors.push(domArtistColors[i]);
      }
    });
    while (colors.length < TOTAL_DOTS) colors.push('rgba(255,255,255,0.1)');
    return colors;
  }, [top5, total]);

  useEffect(() => {
    if (!active) { setFilledCount(0); if (intervalRef.current) clearInterval(intervalRef.current); return; }
    setFilledCount(0);
    let count = 0;
    intervalRef.current = setInterval(() => {
      count++;
      setFilledCount(count);
      if (count >= TOTAL_DOTS && intervalRef.current) clearInterval(intervalRef.current);
    }, 15);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active]);

  const showLegend = filledCount >= TOTAL_DOTS;
  const dominationDotSize = 'clamp(8px, 2.2vw, 14px)';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 16px 12px', gap: 10 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 6.8vw, 48px)', color: NB.white, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>WHO RUNS YOUR CHART?</h1>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: 0 }}>DOMINATION MODE</p>

        {/* 10×10 dot grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(10, ${dominationDotSize})`, gap: 'clamp(3px, 0.8vw, 5px)', marginTop: 4, justifyContent: 'center' }}>
          {Array.from({ length: TOTAL_DOTS }, (_, i) => (
            <div key={i} style={{
              width: dominationDotSize,
              height: dominationDotSize,
              borderRadius: '50%',
              background: i < filledCount ? dotColors[i] : 'transparent',
              border: `1.5px solid ${i < filledCount ? dotColors[i] : 'rgba(255,255,255,0.15)'}`,
              transition: 'background 80ms ease, border-color 80ms ease',
            }} />
          ))}
        </div>

        {/* Legend after all dots filled */}
        {showLegend && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {top5.map((artist, i) => {
              const dotCount = dotColors.filter(c => c === domArtistColors[i]).length;
              const pct = Math.round((artist.totalListens / total) * 100);
              return (
                <div key={artist.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: domArtistColors[i], flexShrink: 0 }} />
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 12, color: NB.white, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14, color: domArtistColors[i] }}>{dotCount} dots • {pct}%</span>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>
      <Ticker text="DOMINATION MODE  •  WHO RULES YOUR PLAY COUNT" bg={NB.electricBlue} color={NB.white} />
    </div>
  );
};



const SlidePunkySignal: React.FC<{ active: boolean; historyRows: HistoryRow[] }> = ({ active, historyRows }) => {
  const hourly = useMemo(() => {
    const bins = Array(24).fill(0);
    historyRows.forEach((row) => {
      const hr = new Date(row.played_at).getHours();
      bins[hr] += Math.max(1, Math.round((row.duration_ms || 0) / 60000));
    });
    const max = Math.max(1, ...bins);
    const peakHour = bins.indexOf(max);
    const primeWindow = `${String(peakHour).padStart(2, '0')}:00`;
    return { bins, max, peakHour, primeWindow, totalSessions: historyRows.length };
  }, [historyRows]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#050507', position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, padding: '58px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 7vw, 48px)', color: NB.white, textTransform: 'uppercase', lineHeight: 1 }}>PUNKY SIGNAL</h1>
        <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
          YOUR LISTENING CLOCK IN MOTION
        </p>

        <div style={{ height: 210, border: `3px solid ${NB.black}`, background: 'linear-gradient(180deg, #0F1020 0%, #07070d 100%)', boxShadow: '4px 4px 0 #000', display: 'flex', alignItems: 'flex-end', padding: '10px 8px', gap: 3 }}>
          {hourly.bins.map((value, i) => {
            const heightPct = Math.max(6, Math.round((value / hourly.max) * 100));
            const isPeak = i === hourly.peakHour;
            return (
              <motion.div
                key={i}
                initial={{ height: '6%' }}
                animate={{ height: `${active ? heightPct : 6}%`, opacity: isPeak ? 1 : 0.7 }}
                transition={{ duration: 0.45, delay: i * 0.02 }}
                style={{ flex: 1, border: `2px solid ${NB.black}`, background: isPeak ? NB.acidYellow : 'linear-gradient(180deg, #1A6BFF, #FF0080)' }}
              />
            );
          })}
        </div>

        <BCard style={{ background: NB.white }}>
          <p style={{ margin: '0 0 6px 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 24, color: NB.black }}>
            PRIME TIME: {hourly.primeWindow}
          </p>
          <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#333' }}>
            {hourly.totalSessions.toLocaleString()} plays scanned. This is your strongest hour in this wrapped range.
          </p>
        </BCard>
      </div>
      <Ticker text="PUNKY SIGNAL  •  PEAK HOUR  •  LISTENING CLOCK" bg={NB.magenta} color={NB.white} />
    </div>
  );
};

// MAIN COMPONENT
export default function WrappedSlides({ onClose, totalMinutes, artists, albums, songs, albumCovers, rangeLabel, rangeStart, rangeEnd, connectionGraph }: WrappedSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [previewMap, setPreviewMap] = useState<Record<string, string>>({});
  const [snippetEnabled, setSnippetEnabled] = useState(true);
  const [snippetMuted, setSnippetMuted] = useState(false);
  const [nowPlayingSnippet, setNowPlayingSnippet] = useState<Song | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHeatmapData().then((rows) => {
      if (cancelled) return;
      setHistoryRows((rows || []).map((row: any) => ({ played_at: row.played_at, duration_ms: row.duration_ms || 0, track_name: row.track_name })));
    }).catch(() => {
      if (!cancelled) setHistoryRows([]);
    });
    return () => { cancelled = true; };
  }, []);

  const filteredHistory = useMemo(() => {
    const startMs = rangeStart ? new Date(rangeStart).getTime() : Number.NEGATIVE_INFINITY;
    const endMs = rangeEnd ? new Date(rangeEnd).getTime() : Number.POSITIVE_INFINITY;
    return historyRows.filter((row) => {
      const t = new Date(row.played_at).getTime();
      return t >= startMs && t <= endMs;
    });
  }, [historyRows, rangeStart, rangeEnd]);


  useEffect(() => {
    let cancelled = false;
    const spotifyToken = localStorage.getItem('spotify_token');
    if (!spotifyToken || songs.length === 0) return;
    const trackIds = songs.map((song) => song.id).filter(Boolean);
    fetchTrackPreviewUrls(spotifyToken, trackIds).then((map) => {
      if (!cancelled) setPreviewMap(map);
    }).catch(() => {
      if (!cancelled) setPreviewMap({});
    });
    return () => { cancelled = true; };
  }, [songs]);

  useEffect(() => {
    if (!snippetEnabled || songs.length === 0) return;
    const trackForSlide = songs[currentSlide % songs.length];
    if (!trackForSlide) return;
    const previewUrl = previewMap[trackForSlide.id];
    if (!previewUrl) {
      setNowPlayingSnippet(trackForSlide);
      return;
    }

    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.pause();
    audio.src = previewUrl;
    audio.currentTime = 0;
    audio.volume = snippetMuted ? 0 : 0.65;
    audio.play().catch(() => {
      // Browser autoplay restrictions can block this until a user interaction.
    });
    setNowPlayingSnippet(trackForSlide);

    return () => {
      audio.pause();
    };
  }, [currentSlide, songs, previewMap, snippetEnabled, snippetMuted]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = snippetMuted ? 0 : 0.65;
  }, [snippetMuted]);
  const dnaMetrics = useMemo(() => computeDnaMetrics(filteredHistory, songs), [filteredHistory, songs]);
  const winningFruit = useMemo(() => pickFruitFromMetrics(dnaMetrics), [dnaMetrics]);

  const goTo = useCallback((index: number, dir: number) => { setDirection(dir); setCurrentSlide(index); }, []);
  const next = useCallback(() => { if (currentSlide < TOTAL_SLIDES - 1) goTo(currentSlide + 1, 1); }, [currentSlide, goTo]);
  const prev = useCallback(() => { if (currentSlide > 0) goTo(currentSlide - 1, -1); }, [currentSlide, goTo]);

  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    if (x / rect.width < LEFT_TAP_ZONE) prev(); else next();
  }, [prev, next]);

  const handleDragEnd = useCallback((_: never, info: PanInfo) => {
    if (info.offset.x < -50) next(); else if (info.offset.x > 50) prev();
  }, [prev, next]);

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 1 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 1 }),
  };

  const renderSlide = () => {
    switch (currentSlide) {
      case 0: return <Slide0 active={currentSlide === 0} totalMinutes={totalMinutes} albumCovers={albumCovers} albums={albums} rangeLabel={rangeLabel} />;
      case 1: return <Slide1 active={currentSlide === 1} artists={artists} />;
      case 2: return <Slide2 active={currentSlide === 2} songs={songs} />;
      case 3: return <Slide3 active={currentSlide === 3} albums={albums} />;
      case 4: return <Slide4 active={currentSlide === 4} songs={songs} historyRows={filteredHistory} />;
      case 5: return <Slide5 active={currentSlide === 5} />;
      case 6: return <Slide6 active={currentSlide === 6} artists={artists} />;
      case 7: return <Slide7 active={currentSlide === 7} artists={artists} songs={songs} />;
      case 8: return <Slide8 active={currentSlide === 8} songs={songs} />;
      case 9: return <Slide9 active={currentSlide === 9} artists={artists} songs={songs} />;
      case 10: return <Slide10 active={currentSlide === 10} artists={artists} rangeLabel={rangeLabel} connectionGraph={connectionGraph} />;
      case 11: return <Slide11 active={currentSlide === 11} songs={songs} />;
      case 12: return <SlideDomination active={currentSlide === 12} artists={artists} />;
      case 13: return <SlidePunkySignal active={currentSlide === 13} historyRows={filteredHistory} />;
      case 14: return <Slide12 totalMinutes={totalMinutes} artists={artists} songs={songs} albums={albums} onClose={onClose} winningFruit={winningFruit} />;
      default: return <Slide0 active={currentSlide === 0} totalMinutes={totalMinutes} albumCovers={albumCovers} albums={albums} rangeLabel={rangeLabel} />;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: NB.nearBlack }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <StoryProgressBar current={currentSlide} total={TOTAL_SLIDES} />
        <SlideNavButtons current={currentSlide} total={TOTAL_SLIDES} onPrev={prev} onNext={next} />
        <CloseButton onClose={onClose} />

        <div style={{ position: 'absolute', top: 28, right: 56, zIndex: 130, display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.24)', padding: '6px 10px', color: NB.white }}>
          <button onClick={() => setSnippetEnabled((prev) => !prev)} style={{ border: 'none', background: 'transparent', color: 'inherit', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {snippetEnabled ? 'SNIPPET ON' : 'SNIPPET OFF'}
          </button>
          <button onClick={() => setSnippetMuted((prev) => !prev)} style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} aria-label="Toggle snippet mute">
            {snippetMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          {nowPlayingSnippet && <span style={{ fontSize: 10, maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>♪ {nowPlayingSnippet.title}</span>}
        </div>
        <AnimatePresence initial={false} custom={direction} mode="sync">
          <motion.div key={currentSlide} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2, ease: 'easeOut' }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1} onDragEnd={handleDragEnd} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
            {renderSlide()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
