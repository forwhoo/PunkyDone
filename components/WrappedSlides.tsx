import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { Artist, Album, Song } from '../types';

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
      const unionApprox = Math.max(1, totalA + totalB - score);
      const closeness = Math.min(99, Math.max(1, Math.round((score / unionApprox) * 100)));
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
  <div style={{ position: 'absolute', bottom: 52, left: 12, right: 12, zIndex: 120, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
    <button onClick={(e) => { e.stopPropagation(); onPrev(); }} disabled={current === 0} style={{ pointerEvents: 'auto', minWidth: 96, height: 38, background: NB.white, border: `3px solid ${NB.black}`, boxShadow: '3px 3px 0 #000', opacity: current === 0 ? 0.5 : 1, cursor: current === 0 ? 'default' : 'pointer', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14 }}>PREV</button>
    <button onClick={(e) => { e.stopPropagation(); onNext(); }} disabled={current === total - 1} style={{ pointerEvents: 'auto', minWidth: 96, height: 38, background: NB.acidYellow, border: `3px solid ${NB.black}`, boxShadow: '3px 3px 0 #000', opacity: current === total - 1 ? 0.5 : 1, cursor: current === total - 1 ? 'default' : 'pointer', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14 }}>NEXT</button>
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
      if (remainingMs <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setRevealed(true);
      }
    }, 120);
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
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: NB.black, width: `${(timer / ROUND_SECONDS) * 100}%`, transition: 'width 1s linear' }} />
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

// SLIDE 4: THE IDENTITY SCAN
const Slide4: React.FC<{ active: boolean; totalMinutes: number; songs: Song[]; artists: Artist[] }> = ({ active, totalMinutes, songs, artists }) => {
  const [phase, setPhase] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const metrics = useMemo(() => {
    const totalSongListens = Math.max(1, songs.reduce((sum, song) => sum + song.listens, 0));
    const topSongShare = (songs[0]?.listens || 0) / totalSongListens;
    const topArtistShare = (artists[0]?.totalListens || 0) / Math.max(1, artists.slice(0, 5).reduce((sum, artist) => sum + artist.totalListens, 0));
    const adventurous = Math.min(100, Math.round((Math.min(1, songs.length / 30) * 0.55 + (1 - topSongShare) * 0.45) * 100));
    const groove = Math.min(100, Math.round((Math.min(1, totalMinutes / 9000) * 0.6 + topArtistShare * 0.4) * 100));
    const sweetness = Math.min(100, Math.round((Math.min(1, (songs[0]?.listens || 0) / 180) * 0.5 + Math.min(1, (artists[0]?.totalListens || 0) / 900) * 0.5) * 100));
    return { adventurous, groove, sweetness };
  }, [songs, artists, totalMinutes]);

  const fruitProfiles = [
    { name: 'MANGO', emoji: '🥭', v: [74, 82, 86], vibe: 'sunny and addictive hooks' },
    { name: 'PINEAPPLE', emoji: '🍍', v: [82, 69, 72], vibe: 'bright and experimental energy' },
    { name: 'CHERRY', emoji: '🍒', v: [62, 74, 90], vibe: 'high replay + emotional punch' },
    { name: 'BANANA', emoji: '🍌', v: [60, 88, 70], vibe: 'comfort songs all day long' },
    { name: 'BLUEBERRY', emoji: '🫐', v: [90, 58, 64], vibe: 'indie deep cuts and surprise picks' },
    { name: 'WATERMELON', emoji: '🍉', v: [78, 76, 78], vibe: 'wide range with steady favorites' },
    { name: 'KIWI', emoji: '🥝', v: [88, 70, 68], vibe: 'curious palate and genre jumping' },
    { name: 'PEACH', emoji: '🍑', v: [68, 73, 84], vibe: 'smooth late-night mood control' },
    { name: 'APPLE', emoji: '🍎', v: [65, 84, 65], vibe: 'classic structure and daily consistency' },
    { name: 'STRAWBERRY', emoji: '🍓', v: [75, 66, 88], vibe: 'sweet choruses with sharp edges' },
  ];

  const winningFruit = useMemo(() => {
    const vec = [metrics.adventurous, metrics.groove, metrics.sweetness];
    return fruitProfiles
      .map((f) => ({ ...f, score: Math.sqrt(f.v.reduce((sum, value, i) => sum + Math.pow(value - vec[i], 2), 0)) }))
      .sort((a, b) => a.score - b.score)[0];
  }, [metrics]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    if (!active) { setPhase(0); return; }
    setPhase(1);
    timers.current.push(setTimeout(() => setPhase(2), 1200));
    timers.current.push(setTimeout(() => setPhase(3), 2500));
    return () => timers.current.forEach(clearTimeout);
  }, [active]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '34px 34px', opacity: 0.3 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 20px 20px', gap: 10, position: 'relative', zIndex: 2 }}>
        <h1 style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(30px, 8vw, 46px)', color: NB.white, textTransform: 'uppercase', lineHeight: 1 }}>WHAT FRUIT ARE YOU?</h1>
        <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>BASED ON YOUR LISTENING DNA</p>

        <div style={{ height: 220, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {fruitProfiles.map((fruit, i) => {
            const angle = (360 / fruitProfiles.length) * i;
            return (
              <motion.div key={fruit.name} animate={{ rotate: active ? 360 : 0 }} transition={{ duration: 16, repeat: Infinity, ease: 'linear' }} style={{ position: 'absolute', transform: `rotate(${angle}deg) translate(96px) rotate(${-angle}deg)`, fontSize: 28, opacity: phase >= 3 && fruit.name !== winningFruit.name ? 0.2 : 0.95 }}>
                {fruit.emoji}
              </motion.div>
            );
          })}
          {phase < 2 && <p style={{ color: NB.white, margin: 0, textAlign: 'center', fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Based on listening data<br/>let's see…</p>}
          {phase >= 2 && (
            <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1, y: phase >= 3 ? -12 : 0 }} transition={{ duration: 0.5 }} style={{ width: 120, height: 120, borderRadius: '50%', border: `4px solid ${NB.white}`, background: NB.acidYellow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 58 }}>
              {winningFruit.emoji}
            </motion.div>
          )}
        </div>

        {phase >= 3 && (
          <BCard style={{ background: NB.white }}>
            <p style={{ margin: '0 0 4px 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 34, color: NB.black }}>{winningFruit.name}</p>
            <p style={{ margin: '0 0 10px 0', fontFamily: "'Barlow', sans-serif", fontSize: 12, color: NB.black }}>You got this because your profile is {winningFruit.vibe}.</p>
            {[{ label: 'ADVENTUROUS', value: metrics.adventurous, color: NB.electricBlue }, { label: 'GROOVE', value: metrics.groove, color: NB.coral }, { label: 'SWEETNESS', value: metrics.sweetness, color: NB.magenta }].map((metric, i) => (
              <div key={metric.label} style={{ marginBottom: i === 2 ? 0 : 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11 }}>{metric.label}</span><span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900 }}>{metric.value}%</span></div>
                <motion.div initial={{ width: 0 }} animate={{ width: `${metric.value}%` }} transition={{ duration: 0.5, delay: i * 0.15 }} style={{ height: 10, background: metric.color, border: `2px solid ${NB.black}` }} />
              </div>
            ))}
          </BCard>
        )}
      </div>
      <Ticker text="FRUIT DNA  MUSIC PERSONALITY  LIVE METRICS" bg={NB.acidYellow} color={NB.black} />
    </div>
  );
};

// SLIDE 5: THE TIME MACHINE
const Slide5: React.FC<{ active: boolean }> = ({ active }) => {
  const [time, setTime] = useState(new Date());
  const [drawn, setDrawn] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const intensities = [2,1,1,0,0,1,3,5,6,7,6,5,6,7,8,7,6,5,6,7,8,9,10,8];
  const peakHour = 22;

  useEffect(() => {
    if (!active) { setDrawn(false); if (intervalRef.current) clearInterval(intervalRef.current); return; }
    setTime(new Date());
    const t = setTimeout(() => setDrawn(true), 300);
    intervalRef.current = setInterval(() => setTime(new Date()), 1000);
    return () => { clearTimeout(t); if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active]);

  const cx = 150, cy = 150, R = 110;
  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const hourAngle = (hours / 12) * 360 + (minutes / 60) * 30 - 90;
  const minAngle = (minutes / 60) * 360 - 90;

  const arcPath = (startAngle: number, endAngle: number, radius: number) => {
    const s = startAngle * Math.PI / 180;
    const e = endAngle * Math.PI / 180;
    const x1 = cx + radius * Math.cos(s);
    const y1 = cy + radius * Math.sin(s);
    const x2 = cx + radius * Math.cos(e);
    const y2 = cy + radius * Math.sin(e);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  const maxIntensity = Math.max(...intensities);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.electricBlue, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px 20px', gap: 16 }}>
        <svg viewBox="0 0 300 300" style={{ width: 260, height: 260, overflow: 'visible' }} role="img" aria-label="24-hour listening clock visualization">
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={NB.black} strokeWidth={4} />
          {intensities.map((intensity, i) => {
            if (intensity === 0) return null;
            const segStart = (i / 24) * 360 - 90;
            const segEnd = ((i + 1) / 24) * 360 - 90 - 1;
            const arcR = R + 8 + (intensity / maxIntensity) * 20;
            const color = i === peakHour ? NB.acidYellow : NB.white;
            const totalLen = (arcR * Math.PI * 2 * ((segEnd - segStart) / 360));
            return (
              <path
                key={i}
                d={arcPath(segStart, segEnd, arcR)}
                fill="none"
                stroke={color}
                strokeWidth={i === peakHour ? 4 : 2}
                strokeDasharray={totalLen}
                strokeDashoffset={drawn ? 0 : totalLen}
                style={{ transition: `stroke-dashoffset 1.8s ease ${i * 0.05}s` }}
              />
            );
          })}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * 360 - 90;
            const rad = angle * Math.PI / 180;
            const x1 = cx + (R - 8) * Math.cos(rad);
            const y1 = cy + (R - 8) * Math.sin(rad);
            const x2 = cx + R * Math.cos(rad);
            const y2 = cy + R * Math.sin(rad);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={NB.black} strokeWidth={i % 6 === 0 ? 3 : 1.5} />;
          })}
          <line x1={cx} y1={cy} x2={cx + R * 0.35 * Math.cos(hourAngle * Math.PI / 180)} y2={cy + R * 0.35 * Math.sin(hourAngle * Math.PI / 180)} stroke={NB.black} strokeWidth={4} strokeLinecap="square" />
          <line x1={cx} y1={cy} x2={cx + R * 0.5 * Math.cos(minAngle * Math.PI / 180)} y2={cy + R * 0.5 * Math.sin(minAngle * Math.PI / 180)} stroke={NB.black} strokeWidth={2} strokeLinecap="square" />
          <circle cx={cx} cy={cy} r={4} fill={NB.black} />
        </svg>
        <div style={{ background: NB.black, border: `4px solid ${NB.acidYellow}`, padding: '6px 14px', display: 'inline-flex', alignSelf: 'center', borderRadius: 0 }}>
          <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14, color: NB.acidYellow, letterSpacing: '0.1em', textTransform: 'uppercase' }}>YOU PEAK AT 11PM</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 8vw, 48px)', color: NB.white, textTransform: 'uppercase', margin: '0 0 4px 0' }}>YOUR LISTENING CLOCK</h2>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', margin: 0 }}>WHEN YOUR MUSIC HITS HARDEST</p>
        </div>
      </div>
      <Ticker text="THE TIME MACHINE  YOUR LISTENING CLOCK" bg={NB.nearBlack} color={NB.acidYellow} />
    </div>
  );
};

// SLIDE 6: THE LOYALTY TEST
const Slide6: React.FC<{ active: boolean; artists: Artist[] }> = ({ active, artists }) => {
  const [animated, setAnimated] = useState(false);
  const topFive = artists.slice(0, 5);
  const total = topFive.reduce((s, a) => s + a.totalListens, 0) || 1;
  const barColors = [NB.nearBlack, NB.electricBlue, NB.coral, NB.magenta, '#555555'];
  const topShare = (topFive[0]?.totalListens || 0) / total;
  const verdict = topShare > 0.3 ? 'RIDE OR DIE.' : 'ECLECTIC SOUL.';

  useEffect(() => {
    if (!active) { setAnimated(false); return; }
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, [active]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.acidYellow, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 12 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(40px, 10vw, 64px)', color: NB.black, textTransform: 'uppercase', margin: '0 0 4px 0', lineHeight: 1 }}>
          YOUR LOYALTY MAP
        </h1>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.black, margin: '0 0 8px 0' }}>
          HOW DEEP DOES IT GO
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {topFive.map((artist, i) => {
            const pct = Math.round((artist.totalListens / total) * 100);
            const targetW = Math.max((artist.totalListens / (topFive[0]?.totalListens || 1)) * 88, 15);
            return (
              <div key={artist.id} style={{ position: 'relative' }}>
                {i === 0 && animated && (
                  <div style={{ position: 'absolute', top: -22, right: 0, background: NB.black, color: NB.acidYellow, border: `4px solid ${NB.black}`, boxShadow: '3px 3px 0 #000', padding: '2px 8px', display: 'inline-flex', zIndex: 2, borderRadius: 0 }}>
                    <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 11, letterSpacing: '0.1em' }}>\u2736 #1</span>
                  </div>
                )}
                <div style={{
                  height: 52, background: barColors[i], border: `2px solid ${NB.black}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0 10px', overflow: 'hidden',
                  width: animated ? `${targetW}%` : '0%',
                  minWidth: 60,
                  transition: `width 600ms cubic-bezier(0.34,1.56,0.64,1) ${i * 100}ms`,
                }}>
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 14, color: NB.white, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist.name}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 15, color: NB.black, whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 8 }}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ background: NB.white, border: `4px solid ${NB.black}`, boxShadow: '5px 5px 0px #000', padding: '14px 18px', marginTop: 8, borderRadius: 0, opacity: animated ? 1 : 0, transform: animated ? 'translateY(0)' : 'translateY(20px)', transition: 'all 400ms ease 600ms' }}>
          <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 28, color: NB.black, textTransform: 'uppercase', margin: 0 }}>{verdict}</p>
        </div>
      </div>
      <Ticker text="THE LOYALTY TEST  YOUR RIDE OR DIE" bg={NB.nearBlack} color={NB.acidYellow} />
    </div>
  );
};

// SLIDE 7: THE STREAK
const Slide7: React.FC<{ active: boolean; artists: Artist[]; songs: Song[] }> = ({ active, artists, songs }) => {
  const [waveCol, setWaveCol] = useState(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gridData = useMemo(() => {
    const energy = Math.max(1, songs.reduce((sum, song) => sum + song.listens, 0));
    const artistBias = artists.slice(0, 5).reduce((sum, artist) => sum + artist.totalListens, 0) / Math.max(1, energy);
    return Array.from({ length: 365 }, (_, d) => {
      const weeklyWave = (Math.sin(d / 6.3) + 1) / 2;
      const monthlyWave = (Math.cos(d / 17.7) + 1) / 2;
      return Math.min(1, weeklyWave * 0.55 + monthlyWave * 0.3 + artistBias * 0.45);
    });
  }, [songs, artists]);

  const weeks = 52;
  const days = 7;
  const STREAK_LEN = Math.max(3, Math.min(45, Math.max(...artists.map((artist) => artist.streak || 0), ...songs.map((song) => song.streak || 0), 0)));
  const STREAK_START = Math.max(0, Math.min(300, 340 - STREAK_LEN));

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
  }, [active]);

  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const monthStartWeeks = [0,4,8,13,17,21,26,30,34,39,43,47];

  const getCellColor = (val: number, revealed: boolean) => {
    if (!revealed) return '#1a1a1a';
    if (val < 0.2) return '#1a1a1a';
    if (val < 0.5) return NB.acidYellow + '33';
    if (val < 0.8) return NB.acidYellow + '99';
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
  const MAX_ORBIT_SCORE = 250;
  const topArtistListens = topArtist?.totalListens || 0;
  const topSongListens = songs[0]?.listens || 0;
  const frequencyBonus = Math.min(70, Math.round((topSongListens / Math.max(1, topArtistListens)) * 80));
  const dominanceBonus = Math.min(120, Math.round((topArtistListens / Math.max(1, songs.reduce((s, song) => s + song.listens, 0))) * 220));
  const consistencyBase = Math.min(60, Math.round((songs.slice(0, 5).reduce((sum, song) => sum + song.listens, 0) / Math.max(1, topArtistListens * 2)) * 80));
  const obsessionScore = Math.min(MAX_ORBIT_SCORE, 70 + frequencyBonus + dominanceBonus + consistencyBase);
  const dayCurve = weekdayLabels.map((day, i) => {
    const weight = [0.86, 0.92, 0.98, 1.04, 1.08, 1.15, 1.03][i];
    return { day, score: Math.min(MAX_ORBIT_SCORE, Math.round(obsessionScore * weight)) };
  });

  const minDay = dayCurve.reduce((acc, d) => (d.score < acc.score ? d : acc), dayCurve[0]);
  const maxDay = dayCurve.reduce((acc, d) => (d.score > acc.score ? d : acc), dayCurve[0]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 14 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(30px, 8vw, 50px)', color: NB.white, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>
          WE KNOW YOU WANT TO KNOW WHY YOUR SCORE IS THIS HIGH.
        </h1>
        <div style={{ background: NB.white, border: `4px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', padding: '12px 14px' }}>
          <p style={{ margin: '0 0 8px 0', fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: NB.black }}>
            MONDAY - SUNDAY ORBIT BUILD
          </p>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
            {dayCurve.map((day, i) => (
              <motion.div
                key={day.day}
                initial={{ height: 0 }}
                animate={{ height: active ? `${Math.max(18, Math.round((day.score / MAX_ORBIT_SCORE) * 100))}%` : 0 }}
                transition={{ duration: 0.45, delay: active ? i * 0.12 : 0 }}
                style={{ flex: 1, background: day.day === maxDay.day ? NB.acidYellow : NB.electricBlue, border: `2px solid ${NB.black}`, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4 }}
              >
                <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 10, color: NB.black }}>{day.day}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div style={{ background: NB.acidYellow, border: `4px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', padding: '12px 14px' }}>
          <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 34, color: NB.black, textTransform: 'uppercase' }}>
            {topArtist?.name || 'TOP ARTIST'} SCORED {obsessionScore}/250
          </p>
          <p style={{ margin: '6px 0 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 12, color: NB.black }}>
            Peak lift: {maxDay.day} ({maxDay.score}) • Drop: {minDay.day} ({minDay.score}). Frequency bonus {frequencyBonus}, dominance bonus {dominanceBonus}, consistency bonus {consistencyBase}.
          </p>
        </div>
      </div>
      <Ticker text="OBSESSION ORBIT  SCORE ANALYZER  WHY IT MOVED" bg={NB.acidYellow} color={NB.black} />
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
const Slide11: React.FC<{ active: boolean; songs: Song[] }> = ({ active, songs }) => {
  const loops = songs.slice(0, 3);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.coral, overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 12 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(34px, 8vw, 58px)', color: NB.white, margin: 0, textTransform: 'uppercase', lineHeight: 1 }}>YOUR REPLAY VALUE</h1>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', margin: '0 0 8px 0' }}>MOST REPEATED TRACKS</p>
        {loops.map((song, i) => (
          <motion.div key={song.id} initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: active ? i * 0.12 : 0, duration: 0.35 }} style={{ display: 'flex', gap: 10, alignItems: 'center', background: NB.white, border: `4px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', padding: 10 }}>
            <img src={song.cover || fallbackImage} alt={song.title} style={{ width: 64, height: 64, objectFit: 'cover', border: `3px solid ${NB.black}` }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 22, fontWeight: 900, textTransform: 'uppercase', color: NB.black, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</p>
              <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontSize: 12 }}>{song.artist}</p>
            </div>
            <motion.div animate={{ scale: active ? [1, 1.07, 1] : 1 }} transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.15 }} style={{ background: NB.black, color: NB.acidYellow, padding: '8px 10px', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 16, fontWeight: 900 }}>{song.listens}x</motion.div>
          </motion.div>
        ))}
      </div>
      <Ticker text="REPLAY VALUE  SONGS ON LOOP" bg={NB.nearBlack} color={NB.white} />
    </div>
  );
};

// SLIDE 12: FINAL SHARE
const Slide12: React.FC<{ totalMinutes: number; artists: Artist[]; songs: Song[]; albums: Album[]; onClose: () => void }> = ({ totalMinutes, artists, songs, albums, onClose }) => {
  const topArtist = artists[0]?.name ?? '\u2014';
  const topSong = songs[0]?.title ?? '\u2014';
  const secondArtist = artists[1]?.name ?? '\u2014';
  const [hovered, setHovered] = useState<number | null>(null);
  const carouselAlbums = [...albums].sort((a, b) => a.totalListens - b.totalListens);
  const loopAlbums = [...carouselAlbums, ...carouselAlbums];
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, background: NB.acidYellow, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `4px solid ${NB.black}`, position: 'relative' }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(56px, 15vw, 96px)', color: NB.black, textTransform: 'uppercase', margin: 0, letterSpacing: '-0.02em', zIndex: 2 }}>
          PUNKY WRAPPED
        </h1>
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(135deg, transparent 0 14px, rgba(0,0,0,0.08) 14px 22px)' }} />
      </div>
      <div style={{ flex: 1, background: NB.nearBlack, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', gap: 12 }}>
        <div style={{ border: `3px solid ${NB.white}`, overflow: 'hidden', background: '#111', padding: '8px 0' }}>
          <motion.div animate={{ x: hovered !== null ? undefined : ['0%', '-50%'] }} transition={{ duration: 24, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex', width: 'fit-content' }}>
            {loopAlbums.map((album, idx) => (
              <div key={`${album.id}-${idx}`} onMouseEnter={() => setHovered(idx)} onMouseLeave={() => setHovered(null)} style={{ margin: '0 6px', position: 'relative' }}>
                <img src={album.cover || fallbackImage} alt={album.title} style={{ width: 72, height: 72, border: `3px solid ${NB.white}`, objectFit: 'cover' }} />
                {hovered === idx && <div style={{ position: 'absolute', bottom: '100%', left: 0, background: NB.white, color: NB.black, fontFamily: "'Barlow', sans-serif", fontSize: 10, padding: '4px 6px', border: `2px solid ${NB.black}`, marginBottom: 4, whiteSpace: 'nowrap' }}>{album.title} • {album.totalListens} plays</div>}
              </div>
            ))}
          </motion.div>
        </div>
        {[
          { label: 'MINUTES', value: totalMinutes.toLocaleString() },
          { label: '#1 ARTIST', value: topArtist },
          { label: '#1 SONG', value: topSong },
          { label: 'NEXT UP', value: secondArtist },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{s.label}</p>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 14, color: NB.white, margin: 0, textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</p>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <button style={{ width: '100%', height: 56, background: NB.coral, color: NB.white, border: `3px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', display: 'block', borderRadius: 0 }}>
            SHARE YOUR WRAPPED \u2192
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ width: '100%', background: 'transparent', color: 'rgba(255,255,255,0.4)', border: 'none', fontFamily: "'Barlow', sans-serif", fontSize: 12, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', marginTop: 12, padding: '4px 0', borderRadius: 0 }}>
            VIEW FULL STATS
          </button>
        </div>
      </div>
      <Ticker text="PUNKY WRAPPED 2024  YOUR YEAR IN MUSIC" bg={NB.acidYellow} color={NB.black} />
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
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={handleTap}>
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
