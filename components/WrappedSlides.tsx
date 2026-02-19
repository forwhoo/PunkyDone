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
const TOTAL_SLIDES = 11;
const AUTO_ADVANCE_MS = 6000;
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
        {i === current && (
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: 'linear' }}
            style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: NB.white }}
          />
        )}
      </div>
    ))}
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

  const tileDelays = useMemo(() => covers.map(() => Math.random() * 1.5), [covers]);

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
      <div style={{ position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 48px)', gap: 0, overflow: 'hidden' }}>
        {covers.map((src, i) => (
          <div key={i} style={{
            width: 48, height: 48,
            border: '2px solid white',
            background: src ? 'transparent' : palette[i % palette.length],
            overflow: 'hidden',
            transform: phase >= 1 ? `scale(0) rotate(${i % 2 === 0 ? -15 : 15}deg)` : 'scale(1) rotate(0deg)',
            transition: `transform 600ms cubic-bezier(0.55,0,1,0.45) ${tileDelays[i]}s`,
          }}>
            {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />}
          </div>
        ))}
      </div>
      {phase >= 1 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: NB.black,
            border: '4px solid white',
            transform: phase >= 1 ? 'scale(30)' : 'scale(0)',
            transition: 'transform 1.8s cubic-bezier(0.16,1,0.3,1)',
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
                <div style={{ height: 64, background: palette[i % palette.length], width: '100%' }} />
                <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 22, textTransform: 'uppercase', color: NB.black }}>{artist.name}</span>
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

  const pulseCSS = useMemo(() => topSongs.map((_, i) => {
    const base = (topSongs[i].listens / maxListens) * 90;
    return `@keyframes barPulse${i} { 0%,100%{width:${base}%} 50%{width:${Math.min(base+2,92)}%} }`;
  }).join('\n'), [topSongs, maxListens]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.white, position: 'relative', overflow: 'hidden' }}>
      <style>{pulseCSS}</style>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 12 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 12vw, 80px)', color: NB.black, textTransform: 'uppercase', margin: '0 0 4px 0', lineHeight: 1 }}>
          YOUR FREQUENCY
        </h1>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.black, margin: '0 0 12px 0' }}>
          TOP TRACKS THIS YEAR
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topSongs.map((song, i) => {
              const targetWidth = (song.listens / maxListens) * 90;
              const isExp = expanded === i;
              return (
                <div key={song.id} style={{ position: 'relative' }}>
                  {isExp && (
                    <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: NB.white, border: `4px solid ${NB.black}`, padding: '8px 12px', zIndex: 10, boxShadow: '4px 4px 0 #000', marginBottom: 4, borderRadius: 0 }}>
                      <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 16, color: NB.black, margin: '0 0 2px 0', textTransform: 'uppercase' }}>{song.title}</p>
                      <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: NB.black, margin: 0 }}>{song.listens.toLocaleString()} plays</p>
                    </div>
                  )}
                  <div
                    onClick={(e) => { e.stopPropagation(); setExpanded(isExp ? null : i); }}
                    style={{
                      height: 48,
                      background: barColors[i],
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
                      animation: animated && !isExp ? `barPulse${i} ${[2.1,2.4,1.9,2.7,2.2][i]}s ease-in-out infinite` : undefined,
                    }}
                  >
                    <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 13, color: NB.white, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>{song.title}</span>
                    <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 700, fontSize: 12, color: NB.white, whiteSpace: 'nowrap', flexShrink: 0 }}>{song.listens.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
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
  const [timer, setTimer] = useState(5);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      setTimer(5); setRevealed(false); setSelected(null);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    setTimer(5); setRevealed(false); setSelected(null);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) { if (timerRef.current) clearInterval(timerRef.current); setRevealed(true); return 0; }
        return prev - 1;
      });
    }, 1000);
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
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: NB.black, width: `${(timer / 5) * 100}%`, transition: 'width 1s linear' }} />
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 16, color: revealed ? NB.black : NB.white, mixBlendMode: 'difference' as const, zIndex: 1 }}>
            {revealed ? verdict : `${timer}s`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {topThree.map((album, i) => {
            const isCorrect = i === 0;
            const isSelected = selected === i;
            const borderColor = revealed ? (isCorrect ? NB.acidYellow : isSelected ? '#FF0000' : NB.black) : NB.black;
            const borderWidth = revealed && isCorrect ? 6 : 4;
            return (
              <div key={album.id} onClick={(e) => { e.stopPropagation(); handlePick(i); }} style={{ flex: 1, cursor: 'pointer', border: `${borderWidth}px solid ${borderColor}`, position: 'relative', overflow: 'hidden', boxShadow: '3px 3px 0 #000', borderRadius: 0 }}>
                <div style={{ height: 100, background: palette[i], position: 'relative' }}>
                  {album.cover && <img src={album.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />}
                  {!revealed && (
                    <div style={{ position: 'absolute', inset: 0, background: NB.white, border: `4px solid ${NB.black}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 18, transform: 'rotate(-45deg)', color: NB.black, letterSpacing: '0.1em' }}>SEALED</span>
                    </div>
                  )}
                  {revealed && (
                    <div style={{ position: 'absolute', top: 4, right: 4, background: isCorrect ? NB.acidYellow : '#FF0000', padding: '2px 6px', border: `2px solid ${NB.black}`, borderRadius: 0 }}>
                      <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 12, color: NB.black }}>{isCorrect ? '\u2713 CORRECT' : '\u2715 WRONG'}</span>
                    </div>
                  )}
                </div>
                {revealed && (
                  <div style={{ padding: '6px 8px', background: NB.white }}>
                    <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 13, color: NB.black, margin: '0 0 2px 0', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.title}</p>
                    <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#555', margin: 0 }}>{album.totalListens} plays</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <Ticker text="THE VAULT GUESS  SEALED RECORDS" bg={NB.nearBlack} color={NB.white} />
    </div>
  );
};

// SLIDE 4: THE IDENTITY SCAN
const Slide4: React.FC<{ active: boolean; totalMinutes: number }> = ({ active, totalMinutes }) => {
  const personalityType = totalMinutes > 20000 ? 'THE OBSESSIVE' : totalMinutes > 10000 ? 'THE DEDICATED LISTENER' : 'THE CASUAL FAN';
  const [phase, setPhase] = useState(0);
  const [scanY, setScanY] = useState(0);
  const rafRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    cancelAnimationFrame(rafRef.current);
    if (!active) { setPhase(0); setScanY(0); return; }
    setPhase(1); setScanY(0);
    const start = performance.now();
    const scanDuration = 1500;
    const tick = (now: number) => {
      const p = Math.min((now - start) / scanDuration, 1);
      setScanY(p * 100);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else setPhase(2);
    };
    rafRef.current = requestAnimationFrame(tick);
    timers.current.push(setTimeout(() => setPhase(3), 2000));
    return () => { cancelAnimationFrame(rafRef.current); timers.current.forEach(clearTimeout); };
  }, [active]);

  const traits = [
    { label: 'INDIE FACTOR', pct: 94, color: NB.acidYellow },
    { label: 'NIGHT OWL', pct: 87, color: NB.coral },
    { label: 'DEEP CUT RATIO', pct: 76, color: NB.electricBlue },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
      {phase === 1 && (
        <div style={{ position: 'absolute', top: `${scanY}%`, left: 0, right: 0, height: 2, background: NB.white, zIndex: 20, pointerEvents: 'none', transition: 'none' }} />
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 24px 24px', gap: 16 }}>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ transform: phase >= 1 ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 300ms ease' }}>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: 0 }}>SCANNING MUSIC DNA\u2026</p>
          </div>
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ transform: phase >= 2 ? 'translateY(0)' : 'translateY(100%)', transition: 'transform 300ms ease 200ms' }}>
            <div style={{ width: '100%', height: 12, background: 'transparent', border: `4px solid ${NB.black}`, position: 'relative', overflow: 'hidden', borderRadius: 0 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: NB.acidYellow, width: phase >= 2 ? '100%' : '0%', transition: 'width 600ms linear' }} />
            </div>
            <div style={{ display: 'inline-block', background: NB.white, border: `4px solid ${NB.black}`, padding: '4px 10px', marginTop: 8, borderRadius: 0 }}>
              <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: NB.black }}>ANALYSIS COMPLETE</span>
            </div>
          </div>
        </div>
        {phase >= 3 && (
          <div style={{ position: 'relative', marginTop: 8 }}>
            <div style={{ position: 'absolute', inset: '-8px -12px', border: '2px solid white', transform: 'rotate(1.5deg)', pointerEvents: 'none', zIndex: 0 }} />
            <motion.h1
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16,1,0.3,1] }}
              style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 12vw, 96px)', color: NB.acidYellow, textTransform: 'uppercase', lineHeight: 1, margin: 0, position: 'relative', zIndex: 1 }}
            >
              {personalityType}
            </motion.h1>
          </div>
        )}
        {phase >= 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {traits.map((t, i) => (
              <div key={t.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: NB.white }}>{t.label}</span>
                  <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 700, fontSize: 13, color: NB.white }}>{t.pct}%</span>
                </div>
                <div style={{ width: '100%', height: 16, background: 'transparent', border: `2px solid ${NB.black}`, position: 'relative', overflow: 'hidden', borderRadius: 0 }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${t.pct}%` }} transition={{ delay: i * 0.15 + 0.3, duration: 0.5, ease: 'easeOut' }} style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: t.color }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Ticker text="THE IDENTITY SCAN  MUSIC DNA ANALYSIS" bg={NB.acidYellow} color={NB.black} />
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
const Slide7: React.FC<{ active: boolean }> = ({ active }) => {
  const [waveCol, setWaveCol] = useState(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gridData = useMemo(() => {
    const data: number[] = [];
    for (let d = 0; d < 365; d++) {
      const sin = Math.sin(d / 7) * 0.5 + 0.5;
      const noise = Math.random() * 0.3;
      data.push(Math.min(1, sin + noise));
    }
    for (let d = 60; d < 83; d++) data[d] = 0.8 + Math.random() * 0.2;
    return data;
  }, []);

  const weeks = 52;
  const days = 7;
  const STREAK_START = 60;
  const STREAK_LEN = 23;

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
              <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 12vw, 72px)', color: NB.acidYellow, margin: 0, lineHeight: 1 }}>23</p>
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

// SLIDE 9: THE GENRE WARP
const Slide9: React.FC<{ active: boolean; artists: Artist[] }> = ({ active, artists }) => {
  const [expandedGenre, setExpandedGenre] = useState<string | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!active) { setAnimated(false); setExpandedGenre(null); return; }
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, [active]);

  const genres = useMemo(() => {
    const genreMap: Record<string, number> = {};
    artists.forEach(a => {
      const g = a.genres?.[0] || 'Other';
      genreMap[g] = (genreMap[g] || 0) + a.totalListens;
    });
    const entries = Object.entries(genreMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (entries.length === 0) {
      return [['Indie/Alternative',40],['Hip-Hop/Rap',25],['Electronic',20],['Pop',10],['Other',5]].map(([name, pct]) => ({ name: name as string, pct: pct as number }));
    }
    const total = entries.reduce((s, [,v]) => s + v, 0);
    return entries.map(([name, val]) => ({ name, pct: Math.round((val / total) * 100) }));
  }, [artists]);

  const getBandColor = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('indie') || n.includes('alternative')) return NB.electricBlue;
    if (n.includes('hip') || n.includes('rap')) return NB.nearBlack;
    if (n.includes('electronic')) return NB.acidYellow;
    if (n.includes('pop')) return NB.coral;
    return '#555555';
  };

  const getBandHeight = (pct: number, isExpanded: boolean, anyExpanded: boolean) => {
    if (isExpanded) return 100;
    if (anyExpanded) return 28;
    return Math.max(32, Math.round(pct / 100 * 80));
  };

  const anyExpanded = expandedGenre !== null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.magenta, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 0 0', overflow: 'hidden' }}>
        <div style={{ padding: '0 20px 12px' }}>
          <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(40px, 10vw, 64px)', color: NB.white, textTransform: 'uppercase', margin: '0 0 4px 0', lineHeight: 1 }}>YOUR GENRE WARP</h1>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', margin: 0 }}>THE DIMENSIONS YOU LIVE IN</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {genres.map((genre, i) => {
            const color = getBandColor(genre.name);
            const isExp = expandedGenre === genre.name;
            const textColor = color === NB.acidYellow ? NB.black : NB.white;
            const targetH = getBandHeight(genre.pct, isExp, anyExpanded);
            return (
              <motion.div
                key={genre.name}
                initial={{ x: 120, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.12, duration: 0.4, ease: [0.34,1.56,0.64,1] }}
                onClick={(e) => { e.stopPropagation(); setExpandedGenre(isExp ? null : genre.name); }}
                style={{
                  width: '100%',
                  height: animated ? targetH : 0,
                  background: color,
                  borderTop: `2px solid ${NB.black}`,
                  borderBottom: `2px solid ${NB.black}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 20px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'height 400ms cubic-bezier(0.34,1.56,0.64,1)',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: isExp ? 28 : 20, color: textColor, textTransform: 'uppercase' }}>{genre.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {isExp && <span style={{ fontFamily: "'Barlow', sans-serif", fontSize: 12, color: textColor, letterSpacing: '0.1em' }}>TOP TRACKS \u2192</span>}
                  <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 16, color: textColor }}>{genre.pct}%</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <Ticker text="YOUR GENRE WARP  MUSIC DIMENSIONS" bg={NB.nearBlack} color={NB.white} />
    </div>
  );
};

// SLIDE 10: FINAL SHARE
const Slide10: React.FC<{ totalMinutes: number; artists: Artist[]; songs: Song[]; onClose: () => void }> = ({ totalMinutes, artists, songs, onClose }) => {
  const topArtist = artists[0]?.name ?? '\u2014';
  const topSong = songs[0]?.title ?? '\u2014';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, background: NB.acidYellow, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: `4px solid ${NB.black}` }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(56px, 15vw, 96px)', color: NB.black, textTransform: 'uppercase', margin: 0, letterSpacing: '-0.02em' }}>
          PUNKY
        </h1>
      </div>
      <div style={{ flex: 1, background: NB.nearBlack, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px', gap: 12 }}>
        {[
          { label: 'MINUTES', value: totalMinutes.toLocaleString() },
          { label: '#1 ARTIST', value: topArtist },
          { label: '#1 SONG', value: topSong },
        ].map((s) => (
          <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{s.label}</p>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 14, color: NB.white, margin: 0, textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.value}</p>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <button style={{ width: '100%', height: 56, background: NB.black, color: NB.white, border: 'none', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: '0.05em', textTransform: 'uppercase', cursor: 'pointer', display: 'block', borderRadius: 0 }}>
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
export default function WrappedSlides({ onClose, totalMinutes, artists, albums, songs, albumCovers }: WrappedSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((index: number, dir: number) => { setDirection(dir); setCurrentSlide(index); }, []);
  const next = useCallback(() => { if (currentSlide < TOTAL_SLIDES - 1) goTo(currentSlide + 1, 1); }, [currentSlide, goTo]);
  const prev = useCallback(() => { if (currentSlide > 0) goTo(currentSlide - 1, -1); }, [currentSlide, goTo]);

  useEffect(() => {
    timerRef.current = setTimeout(next, AUTO_ADVANCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [currentSlide, next]);

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
      case 4: return <Slide4 active={currentSlide === 4} totalMinutes={totalMinutes} />;
      case 5: return <Slide5 active={currentSlide === 5} />;
      case 6: return <Slide6 active={currentSlide === 6} artists={artists} />;
      case 7: return <Slide7 active={currentSlide === 7} />;
      case 8: return <Slide8 active={currentSlide === 8} songs={songs} />;
      case 9: return <Slide9 active={currentSlide === 9} artists={artists} />;
      case 10: return <Slide10 totalMinutes={totalMinutes} artists={artists} songs={songs} onClose={onClose} />;
      default: return <Slide0 active={currentSlide === 0} totalMinutes={totalMinutes} albumCovers={albumCovers} albums={albums} />;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: NB.nearBlack }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={handleTap}>
        <StoryProgressBar current={currentSlide} total={TOTAL_SLIDES} />
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
