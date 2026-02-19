import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { Artist, Album, Song } from '../types';
import { fetchHeatmapData } from '../services/dbService';

const NB = {
  electricBlue: '#1A6BFF',
  coral: '#FF4D2E',
  magenta: '#FF0080',
  acidYellow: '#CCFF00',
  nearBlack: '#0D0D0D',
  white: '#FFFFFF',
  black: '#000000',
};
const TOTAL_SLIDES = 13;
const LEFT_TAP_ZONE = 0.3;

interface WrappedSlidesProps {
  onClose: () => void;
  totalMinutes: number;
  artists: Artist[];
  albums: Album[];
  songs: Song[];
  albumCovers: string[];
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
const Slide0: React.FC<{ active: boolean; totalMinutes: number; albumCovers: string[]; albums: Album[] }> = ({ active, totalMinutes, albumCovers, albums }) => {
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
      `}</style>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {orbitItems.map((item, i) => {
          const base = `translate(-50%, -50%) rotate(${item.angle}deg) translate(calc(min(${item.radius}vw, ${item.radius}vh))) rotate(${-item.angle}deg)`;
          const suck = `translate(-50%, -50%) scale(0.05) rotate(${item.angle * 5}deg)`;
          return (
            <div key={i} style={{
              width: 46,
              height: 46,
              border: '2px solid white',
              borderRadius: '50%',
              background: item.src ? 'transparent' : palette[i % palette.length],
              overflow: 'hidden',
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: phase >= 1 ? suck : base,
              filter: phase >= 1 ? 'blur(1px)' : 'blur(0px)',
              opacity: phase >= 1 ? 0.5 : 1,
              transition: `transform 900ms cubic-bezier(0.55,0,1,0.45) ${item.delay}s, opacity 700ms ease ${item.delay}s, filter 700ms ease ${item.delay}s`,
            }}>
              {item.src && <img src={item.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />}
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
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 8px 0', textAlign: 'center' }}>THE DEVOUR</p>
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

  useEffect(() => {
    if (!active) { setAnimated(false); setExpanded(null); return; }
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.white, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(13,13,13,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(13,13,13,0.08) 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.9 }} />
      {['🎧', '🎵', '✨', '🎶', '💿'].map((emoji, i) => (
        <motion.div key={emoji + i} animate={{ y: active ? [0, -14, 0] : 0, x: active ? [0, i % 2 === 0 ? 6 : -6, 0] : 0 }} transition={{ duration: 2.8 + i * 0.3, repeat: Infinity, ease: 'easeInOut' }} style={{ position: 'absolute', top: `${14 + i * 16}%`, left: `${6 + (i * 19) % 88}%`, fontSize: 20, opacity: 0.18 }}>{emoji}</motion.div>
      ))}
      <svg viewBox="0 0 400 260" style={{ position: 'absolute', left: 0, right: 0, top: 100, width: '100%', height: 220, opacity: 0.12 }}>
        <polyline points="0,180 40,130 90,150 130,95 190,120 240,70 290,112 340,55 400,90" fill="none" stroke={NB.electricBlue} strokeWidth="6" strokeLinejoin="round" strokeLinecap="square" />
        <polyline points="0,220 50,200 90,210 150,185 200,196 250,170 310,188 360,165 400,175" fill="none" stroke={NB.magenta} strokeWidth="5" strokeLinejoin="round" strokeLinecap="square" />
      </svg>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 12 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 12vw, 80px)', color: NB.black, textTransform: 'uppercase', margin: '0 0 4px 0', lineHeight: 1 }}>
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
  const topThree = albums.slice(0, 3);
  const palette = [NB.electricBlue, NB.coral, NB.magenta];
  const ROUND_SECONDS = 7;
  const [timer, setTimer] = useState(ROUND_SECONDS);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      setTimer(ROUND_SECONDS); setRevealed(false); setSelected(null);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    const deadline = Date.now() + ROUND_SECONDS * 1000;
    setTimer(ROUND_SECONDS); setRevealed(false); setSelected(null);
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
            return (
              <div key={album.id} onClick={(e) => { e.stopPropagation(); handlePick(i); }} style={{ flex: 1, cursor: 'pointer', border: `${borderWidth}px solid ${borderColor}`, position: 'relative', overflow: 'hidden', boxShadow: '3px 3px 0 #000', borderRadius: 0, minWidth: 0 }}>
                <div style={{ aspectRatio: '1 / 1', background: palette[i], position: 'relative' }}>
                  {album.cover && <img src={album.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />}
                  {revealed && (
                    <div style={{ position: 'absolute', top: 4, right: 4, background: isCorrect ? NB.acidYellow : '#FF0000', padding: '2px 6px', border: `2px solid ${NB.black}`, borderRadius: 0 }}>
                      <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 12, color: NB.black }}>{isCorrect ? '\u2713 CORRECT' : '\u2715 WRONG'}</span>
                    </div>
                  )}
                </div>
                <div style={{ padding: '8px 8px', background: NB.white }}>
                  <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14, color: NB.black, margin: '0 0 2px 0', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.title}</p>
                  <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#555', margin: 0 }}>{revealed ? `${album.totalListens} plays` : 'Tap to lock your guess'}</p>
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

// Fruit profile data (5 DNA dimensions)
const FRUIT_PROFILES = [
  { name: 'MANGO', emoji: '🥭', v: [58, 78, 68, 62, 70], vibe: 'balanced explorer energy with steady habits' },
  { name: 'PINEAPPLE', emoji: '🍍', v: [68, 92, 55, 50, 62], vibe: 'always digging for new sounds' },
  { name: 'CHERRY', emoji: '🍒', v: [72, 52, 64, 88, 66], vibe: 'emotion-first repeats that hit every time' },
  { name: 'BANANA', emoji: '🍌', v: [45, 40, 84, 82, 86], vibe: 'comfort-loop sessions and loyal favorites' },
  { name: 'BLUEBERRY', emoji: '🫐', v: [88, 70, 52, 54, 48], vibe: 'night explorer with fresh rotations' },
  { name: 'WATERMELON', emoji: '🍉', v: [60, 64, 80, 70, 82], vibe: 'long sessions with a consistent daily pulse' },
  { name: 'KIWI', emoji: '🥝', v: [76, 86, 58, 46, 56], vibe: 'high-curiosity listener with sharp pivots' },
  { name: 'PEACH', emoji: '🍑', v: [90, 48, 60, 65, 58], vibe: 'late-night focus and smooth transitions' },
  { name: 'APPLE', emoji: '🍎', v: [52, 50, 78, 60, 92], vibe: 'structured routine with dependable taste' },
  { name: 'STRAWBERRY', emoji: '🍓', v: [66, 60, 62, 84, 72], vibe: 'hook-heavy favorites with strong replay love' },
];
const SLIDE4_BG_EMOJIS = ['🎵','✨','🎶','💿','🎧','🎤','🎼','🎹','🎸','🎺','🥁','🎻'];

// SLIDE 4: THE IDENTITY SCAN
const Slide4: React.FC<{ active: boolean; totalMinutes: number; songs: Song[]; artists: Artist[] }> = ({ active, totalMinutes, songs, artists }) => {
  const [phase, setPhase] = useState(0);
  const [history, setHistory] = useState<Array<{ played_at: string; duration_ms: number; track_name?: string }>>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchHeatmapData().then((rows) => {
      if (cancelled) return;
      setHistory((rows || []).map((row: any) => ({ played_at: row.played_at, duration_ms: row.duration_ms || 0, track_name: row.track_name })));
    }).catch(() => {
      if (!cancelled) setHistory([]);
    });
    return () => { cancelled = true; };
  }, []);

  const metrics = useMemo(() => {
    const safeHistory = history.filter((item) => !!item.played_at);
    const totalSongListens = Math.max(1, songs.reduce((sum, song) => sum + song.listens, 0));
    const sortedAsc = [...safeHistory].sort((a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime());

    const lateNightPlays = safeHistory.filter((row) => {
      const hr = new Date(row.played_at).getHours();
      return hr >= 21 || hr <= 3;
    }).length;

    const trackSeen = new Set<string>();
    let firstListenCount = 0;
    for (const row of sortedAsc) {
      const key = (row.track_name || '').toLowerCase();
      if (!key) continue;
      if (!trackSeen.has(key)) {
        firstListenCount++;
        trackSeen.add(key);
      }
    }

    let sessions = 0;
    let sessionMs = 0;
    let currentSession = 0;
    let lastEnd = 0;
    for (const row of sortedAsc) {
      const start = new Date(row.played_at).getTime();
      const dur = row.duration_ms || 0;
      if (!lastEnd || start - lastEnd > 30 * 60 * 1000) {
        if (currentSession > 0) {
          sessions++;
          sessionMs += currentSession;
        }
        currentSession = dur;
      } else {
        currentSession += dur;
      }
      lastEnd = start + dur;
    }
    if (currentSession > 0) {
      sessions++;
      sessionMs += currentSession;
    }

    const dailySet = new Set(safeHistory.map((row) => new Date(row.played_at).toDateString()));
    const topSongShare = (songs[0]?.listens || 0) / totalSongListens;

    const nightOwl = Math.min(100, Math.round((lateNightPlays / Math.max(1, safeHistory.length)) * 170));
    const freshFinds = Math.min(100, Math.round((firstListenCount / Math.max(1, safeHistory.length)) * 220));
    const deepSessions = Math.min(100, Math.round(((sessionMs / Math.max(1, sessions)) / (75 * 60 * 1000)) * 100));
    const replayLove = Math.min(100, Math.round(topSongShare * 260));
    const routine = Math.min(100, Math.round((dailySet.size / 30) * 100));

    return {
      nightOwl,
      freshFinds,
      deepSessions,
      replayLove,
      routine,
      notes: [
        `${lateNightPlays} late-night plays`,
        `${firstListenCount} first-time track moments`,
        `${Math.round((sessionMs / Math.max(1, sessions)) / 60000)}m avg session`,
      ],
    };
  }, [history, songs]);

  const winningFruit = useMemo(() => {
    const vec = [metrics.nightOwl, metrics.freshFinds, metrics.deepSessions, metrics.replayLove, metrics.routine];
    return FRUIT_PROFILES
      .map((f) => ({ ...f, score: Math.sqrt(f.v.reduce((sum, value, i) => sum + Math.pow(value - vec[i], 2), 0)) }))
      .sort((a, b) => a.score - b.score)[0];
  }, [metrics]);

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
                {phase === 1 ? 'POWERED BY REAL LISTENING HISTORY' : 'SCANNING YOUR 5-POINT MUSIC DNA'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ height: 220, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
              <BCard style={{ background: NB.white }}>
                <p style={{ margin: '0 0 2px 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 30, color: NB.black }}>
                  YOU ARE {winningFruit.emoji} {winningFruit.name}
                </p>
                <p style={{ margin: '0 0 10px 0', fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#333' }}>Your listening matches: {winningFruit.vibe}.</p>
                {[
                  { label: 'NIGHT OWL', value: metrics.nightOwl, color: NB.electricBlue },
                  { label: 'FRESH FINDS', value: metrics.freshFinds, color: NB.coral },
                  { label: 'SESSION DEPTH', value: metrics.deepSessions, color: NB.magenta },
                  { label: 'REPLAY LOVE', value: metrics.replayLove, color: NB.acidYellow },
                  { label: 'ROUTINE', value: metrics.routine, color: NB.nearBlack, textColor: NB.white },
                ].map((metric, i) => (
                  <div key={metric.label} style={{ marginBottom: i === 4 ? 0 : 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11 }}>{metric.label}</span>
                      <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900 }}>{metric.value}%</span>
                    </div>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${metric.value}%` }} transition={{ duration: 0.6, delay: i * 0.12 }} style={{ height: 10, background: metric.color, border: `2px solid ${NB.black}`, color: metric.textColor || NB.black }} />
                  </div>
                ))}
                <p style={{ margin: '10px 0 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#444' }}>{metrics.notes.join(' • ')}</p>
              </BCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Ticker text="FRUIT DNA  REAL DATA  5 METRIC PROFILE" bg={NB.acidYellow} color={NB.black} />
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
      { label: 'MORNING', start: 5, end: 11, color: NB.acidYellow },
      { label: 'AFTERNOON', start: 12, end: 16, color: NB.coral },
      { label: 'EVENING', start: 17, end: 20, color: NB.magenta },
      { label: 'LATE NIGHT', start: 21, end: 4, color: NB.white },
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
    return { totals, winner, totalMs };
  }, [history]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.electricBlue, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 12 }}>
        <h2 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 8vw, 52px)', color: NB.white, textTransform: 'uppercase', margin: 0 }}>YOUR LISTENING WINDOWS</h2>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', margin: 0 }}>REAL PLAYTIME SPLIT FROM YOUR HISTORY</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {timeInsights.totals.map((bucket, i) => {
            const pct = Math.round((bucket.ms / timeInsights.totalMs) * 100);
            return (
              <motion.div key={bucket.label} initial={{ opacity: 0, y: 24 }} animate={{ opacity: active ? 1 : 0.4, y: active ? 0 : 24 }} transition={{ delay: i * 0.08 }} style={{ background: bucket.color, border: `4px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', padding: '12px 10px' }}>
                <p style={{ margin: '0 0 6px 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 18, color: NB.black }}>{bucket.label}</p>
                <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 34, color: NB.black, lineHeight: 1 }}>{pct}%</p>
                <p style={{ margin: '4px 0 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 11, color: 'rgba(0,0,0,0.8)' }}>{bucket.plays} plays</p>
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.acidYellow, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 12 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(38px, 10vw, 64px)', color: NB.black, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>YOUR LOYALTY MAP</h1>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.black, margin: 0 }}>TOP ARTISTS AS A CREW GRID</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {topSix.map((artist, i) => {
            const pct = Math.round((artist.totalListens / total) * 100);
            return (
              <motion.div key={artist.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: active ? 1 : 0.4, y: active ? 0 : 24 }} transition={{ delay: i * 0.08 }} style={{ border: `4px solid ${NB.black}`, background: NB.white, boxShadow: '4px 4px 0 #000', overflow: 'hidden' }}>
                <div style={{ height: 96, background: '#222' }}>
                  <img src={artist.image || fallbackImage} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
                </div>
                <div style={{ padding: '8px 10px', background: i === 0 ? NB.black : NB.white }}>
                  <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14, color: i === 0 ? NB.acidYellow : NB.black, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist.name}</p>
                  <p style={{ margin: '2px 0 0 0', fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, color: i === 0 ? 'rgba(204,255,0,0.85)' : '#444' }}>{artist.totalListens} plays • {pct}%</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <BCard>
          <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 26, color: NB.black, textTransform: 'uppercase' }}>{verdict}</p>
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

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    if (!active) { setPhase(0); return; }
    setPhase(0);
    timers.current.push(setTimeout(() => setPhase(1), 100));
    timers.current.push(setTimeout(() => setPhase(2), 350));
    timers.current.push(setTimeout(() => setPhase(3), 600));
    return () => timers.current.forEach(clearTimeout);
  }, [active]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.white, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 20px 20px', gap: 16 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(36px, 9vw, 64px)', color: NB.black, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>
          YOUR FIRST PLAY OF 2024
        </h1>
        <div style={{
          width: '100%', height: 48, background: NB.black,
          transform: phase >= 1 ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 250ms cubic-bezier(0.16,1,0.3,1)',
        }} />
        {firstSong && (
          <div style={{
            background: NB.black, border: `4px solid ${NB.black}`, position: 'relative', borderRadius: 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(100%)',
            transition: 'transform 350ms cubic-bezier(0.16,1,0.3,1)',
            overflow: 'hidden',
          }}>
            {phase >= 3 && (
              <motion.div
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                style={{ position: 'absolute', top: 12, right: 12, background: NB.acidYellow, border: `4px solid ${NB.black}`, boxShadow: '3px 3px 0 #000', padding: '4px 10px', zIndex: 10, borderRadius: 0 }}
              >
                <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 13, color: NB.black }}>PLAY \u25b6</span>
              </motion.div>
            )}
            {firstSong.cover && (
              <div style={{ height: 180, background: '#222', borderBottom: `4px solid ${NB.black}` }}>
                <img src={firstSong.cover} alt={firstSong.album} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
              </div>
            )}
            <div style={{ padding: '20px 20px 16px' }}>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.coral, margin: '0 0 8px 0' }}>JAN 1, 2024</p>
              <h2 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 7vw, 44px)', color: NB.white, textTransform: 'uppercase', margin: '0 0 6px 0', lineHeight: 1, paddingRight: 80 }}>{firstSong.title}</h2>
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{firstSong.artist}</p>
            </div>
          </div>
        )}
        <div style={{ borderTop: `2px solid ${NB.black}`, paddingTop: 12 }}>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.black, margin: 0 }}>THIS IS WHERE YOUR YEAR BEGAN.</p>
        </div>
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
            You built a strong orbit around <b>{topArtist?.name || 'your top artist'}</b> and kept it spinning with repeat plays.
          </p>
        </BCard>
      </div>
      <Ticker text="OBSESSION ORBIT  DOM MODE  LOCKED IN" bg={NB.acidYellow} color={NB.black} />
    </div>
  );
};

// SLIDE 10: THE CONNECTION
const Slide10: React.FC<{ active: boolean; artists: Artist[]; connectionGraph?: { artistInfo: Record<string, any>; pairs: Record<string, Record<string, number>> } }> = ({ active, artists, connectionGraph }) => {
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

  const displayPairs = pairs.length ? pairs : fallbackPair ? [fallbackPair] : [];
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
          THIS WEEK'S CLOSE CONNECTION
        </h1>
        <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>
          BASED ON ARTISTS PLAYED CLOSE TOGETHER IN YOUR LISTENING PATTERN
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
              {winner.sharedSessions} shared listening sessions between these artists this week.
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

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.coral, overflow: 'hidden' }}>
      <style>{`
        @keyframes vinylSpin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulseRing { 0%{transform:scale(1);opacity:0.6} 100%{transform:scale(1.25);opacity:0} }
      `}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 16px', gap: 12 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(34px, 8vw, 58px)', color: NB.white, margin: 0, textTransform: 'uppercase', lineHeight: 1 }}>YOUR REPLAY VALUE</h1>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', margin: '0 0 4px 0' }}>SPIN ZONE</p>

        <div style={{ flex: 1, minHeight: 260, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 210, height: 210, borderRadius: '50%', border: `4px solid ${NB.black}`, background: '#111', position: 'relative', animation: 'vinylSpin 9s linear infinite' }}>
            <img src={loops[0]?.cover || fallbackImage} alt={loops[0]?.title || 'Top loop'} style={{ width: 136, height: 136, objectFit: 'cover', borderRadius: '50%', border: `4px solid ${NB.white}`, position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
            <div style={{ width: 16, height: 16, background: NB.acidYellow, border: `3px solid ${NB.black}`, borderRadius: '50%', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
          </div>

          <div style={{ position: 'absolute', width: 240, height: 240, borderRadius: '50%', border: `2px dashed ${NB.acidYellow}`, animation: 'pulseRing 1.8s ease-out infinite' }} />

          {loops.slice(1).map((song, i) => {
            const angle = (i * 180 + 30) * Math.PI / 180;
            const r = 145;
            return (
              <div key={song.id} style={{ position: 'absolute', left: `calc(50% + ${Math.cos(angle) * r}px - 34px)`, top: `calc(50% + ${Math.sin(angle) * r}px - 34px)`, width: 68, background: NB.white, border: `3px solid ${NB.black}`, boxShadow: '3px 3px 0 #000', padding: 4 }}>
                <img src={song.cover || fallbackImage} alt={song.title} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block', border: `2px solid ${NB.black}` }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
                <p style={{ margin: '3px 0 0 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 10, color: NB.black, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.listens}×</p>
              </div>
            );
          })}
        </div>
      </div>
      <Ticker text="REPLAY VALUE  VINYL LOOP  RUN IT BACK" bg={NB.nearBlack} color={NB.white} />
    </div>
  );
};

// SLIDE 12: FINAL SHARE
const Slide12: React.FC<{ totalMinutes: number; artists: Artist[]; songs: Song[]; albums: Album[]; onClose: () => void }> = ({ totalMinutes, artists, songs, albums, onClose }) => {
  const topArtist = artists[0]?.name ?? '\u2014';
  const topSong = songs[0]?.title ?? '\u2014';
  const secondArtist = artists[1]?.name ?? '\u2014';
  const [hovered, setHovered] = useState<number | null>(null);
  const [isAnimIn, setIsAnimIn] = useState(false);

  // Sort albums by descending totalListens (most listened first)
  const carouselAlbums = useMemo(() => [...albums].sort((a, b) => b.totalListens - a.totalListens), [albums]);
  const loopAlbums = useMemo(() => [...carouselAlbums, ...carouselAlbums, ...carouselAlbums], [carouselAlbums]);

  // Compute fruit for summary (reuse FRUIT_PROFILES constant)
  const fruitSummary = useMemo(() => {
    const totalSongListens = Math.max(1, songs.reduce((s, song) => s + song.listens, 0));
    const topSongShare = (songs[0]?.listens || 0) / totalSongListens;
    const topFiveArtistShare = (artists[0]?.totalListens || 0) / Math.max(1, artists.slice(0, 5).reduce((s, a) => s + a.totalListens, 0));
    const listenDepth = Math.min(100, Math.round((Math.min(1, totalMinutes / 6000) * 65) + (topFiveArtistShare * 35)));
    const freshFinds = Math.min(100, Math.round((Math.min(1, songs.length / 80) * 80) + ((1 - topSongShare) * 20)));
    const replayLove = Math.min(100, Math.round(topSongShare * 280));
    const routine = Math.min(100, Math.round((Math.min(1, artists.length / 20) * 40) + 45));
    const nightOwl = Math.min(100, Math.round((100 - listenDepth) * 0.35 + 45));
    const vec = [nightOwl, freshFinds, listenDepth, replayLove, routine];
    return FRUIT_PROFILES
      .map(f => ({ ...f, score: Math.sqrt(f.v.reduce((s, val, i) => s + Math.pow(val - vec[i], 2), 0)) }))
      .sort((a, b) => a.score - b.score)[0];
  }, [songs, artists, totalMinutes]);

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
            transition={{ duration: 20 * (carouselAlbums.length / 6 || 1), repeat: Infinity, ease: 'linear' }}
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
        {fruitSummary && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: isAnimIn ? 1 : 0, scale: isAnimIn ? 1 : 0.9 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            style={{ background: NB.white, border: `4px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <span style={{ fontSize: 42 }}>{fruitSummary.emoji}</span>
            <div>
              <p style={{ margin: '0 0 2px 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 18, color: NB.black }}>YOU ARE A {fruitSummary.name}</p>
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

// MAIN COMPONENT
export default function WrappedSlides({ onClose, totalMinutes, artists, albums, songs, albumCovers, connectionGraph }: WrappedSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

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
      case 0: return <Slide0 active={currentSlide === 0} totalMinutes={totalMinutes} albumCovers={albumCovers} albums={albums} />;
      case 1: return <Slide1 active={currentSlide === 1} artists={artists} />;
      case 2: return <Slide2 active={currentSlide === 2} songs={songs} />;
      case 3: return <Slide3 active={currentSlide === 3} albums={albums} />;
      case 4: return <Slide4 active={currentSlide === 4} totalMinutes={totalMinutes} songs={songs} artists={artists} />;
      case 5: return <Slide5 active={currentSlide === 5} />;
      case 6: return <Slide6 active={currentSlide === 6} artists={artists} />;
      case 7: return <Slide7 active={currentSlide === 7} artists={artists} songs={songs} />;
      case 8: return <Slide8 active={currentSlide === 8} songs={songs} />;
      case 9: return <Slide9 active={currentSlide === 9} artists={artists} songs={songs} />;
      case 10: return <Slide10 active={currentSlide === 10} artists={artists} connectionGraph={connectionGraph} />;
      case 11: return <Slide11 active={currentSlide === 11} songs={songs} />;
      case 12: return <Slide12 totalMinutes={totalMinutes} artists={artists} songs={songs} albums={albums} onClose={onClose} />;
      default: return <Slide0 active={currentSlide === 0} totalMinutes={totalMinutes} albumCovers={albumCovers} albums={albums} />;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: NB.nearBlack }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <StoryProgressBar current={currentSlide} total={TOTAL_SLIDES} />
        <SlideNavButtons current={currentSlide} total={TOTAL_SLIDES} onPrev={prev} onNext={next} />
        <CloseButton onClose={onClose} />
        <AnimatePresence initial={false} custom={direction} mode="sync">
          <motion.div key={currentSlide} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.2, ease: 'easeOut' }} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1} onDragEnd={handleDragEnd} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
            {renderSlide()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
