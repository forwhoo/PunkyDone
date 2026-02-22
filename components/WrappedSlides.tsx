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
}

const fallbackImage =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFDMUMxRSIvPjxwYXRoIGQ9Ik0xMzAgNjB2NzBjMCAxMS05IDIwLTIwIDIwcy0yMC05LTIwLTIwIDktMjAgMjAtMjBjNCAwIDcgMSAxMCAzVjcwbC00MCAxMHY2MGMwIDExLTkgMjAtMjAgMjBzLTIwLTktMjAtMjAgOS0yMCAyMC0yMGM0IDAgNyAxIDEwIDNWNjBsNjAtMTV6IiBmaWxsPSIjOEU4RTkzIi8+PC9zdmc+';


const weekdayLabels = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

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
  <div style={{ position: 'absolute', bottom: 'max(44px, env(safe-area-inset-bottom, 0px) + 44px)', left: 10, right: 10, zIndex: 120, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
    <button onClick={(e) => { e.stopPropagation(); onPrev(); }} disabled={current === 0} aria-label="Go to previous slide" style={{ pointerEvents: 'auto', minWidth: 76, height: 40, background: NB.white, border: `3px solid ${NB.black}`, boxShadow: '3px 3px 0 #000', opacity: current === 0 ? 0.4 : 1, cursor: current === 0 ? 'default' : 'pointer', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14, borderRadius: 0, touchAction: 'manipulation' }}>PREV</button>
    <button onClick={(e) => { e.stopPropagation(); onNext(); }} disabled={current === total - 1} aria-label="Go to next slide" style={{ pointerEvents: 'auto', minWidth: 76, height: 40, background: NB.acidYellow, border: `3px solid ${NB.black}`, boxShadow: '3px 3px 0 #000', opacity: current === total - 1 ? 0.4 : 1, cursor: current === total - 1 ? 'default' : 'pointer', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14, borderRadius: 0, touchAction: 'manipulation' }}>NEXT ›</button>
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
const Slide0: React.FC<{ active: boolean; totalMinutes: number; albumCovers: string[]; albums: Album[]; rangeLabel?: string }> = ({ active, totalMinutes, albumCovers, albums, rangeLabel }) => {
  const [phase, setPhase] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const counted = useOdometer(phase >= 2 ? totalMinutes : 0);
  const hours = Math.round(totalMinutes / 60);
  const days = (totalMinutes / 60 / 24).toFixed(1);
  const palette = [NB.electricBlue, NB.coral, NB.magenta, NB.acidYellow, '#555555'];

  const covers = useMemo(() => {
    const arr = albumCovers.length ? albumCovers : albums.map(a => a.cover).filter(Boolean) as string[];
    // Increase covers for a denser effect
    return [...arr, ...arr, ...arr].slice(0, 90);
  }, [albumCovers, albums]);

  // Create 3 layers of orbiting items
  const orbitLayers = useMemo(() => {
    return [
      { count: 12, radius: 25, speed: 20, direction: 1, size: 40 },
      { count: 18, radius: 45, speed: 35, direction: -1, size: 56 },
      { count: 24, radius: 70, speed: 50, direction: 1, size: 32 },
    ].map((layer, layerIdx) => {
      const layerCovers = covers.slice(layerIdx * 20, (layerIdx + 1) * 20);
      return layerCovers.map((src, i) => ({
        src,
        angle: (360 / layer.count) * i,
        radius: layer.radius,
        speed: layer.speed,
        direction: layer.direction,
        size: layer.size,
        delay: i * 0.05,
        layerIndex: layerIdx
      }));
    }).flat();
  }, [covers]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (!active) { setPhase(0); return; }
    setPhase(0);
    // Faster sequence
    timers.current.push(setTimeout(() => setPhase(1), 600));
    timers.current.push(setTimeout(() => setPhase(2), 2200));
    return () => timers.current.forEach(clearTimeout);
  }, [active]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes holePulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        @keyframes holeRing { from{transform:scale(0.4);opacity:0.9} to{transform:scale(3.5);opacity:0} }
        @keyframes orbitSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes glitchText { 0%{transform:translate(0)} 20%{transform:translate(-2px,2px)} 40%{transform:translate(-2px,-2px)} 60%{transform:translate(2px,2px)} 80%{transform:translate(2px,-2px)} 100%{transform:translate(0)} }
      `}</style>

      {/* Background Gradient */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, #222 0%, #000 80%)', opacity: 0.8 }} />

      {/* Orbiting Layers */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        {orbitLayers.map((item, i) => {
          // Calculate individual rotation based on time (simulated via animation)
          const orbitAnim = `orbitSpin ${item.speed}s linear infinite`;
          const direction = item.direction === 1 ? 'normal' : 'reverse';

          // Phase 1: Suck into black hole
          // We use CSS transitions for the transform property
          const baseTransform = `translate(-50%, -50%) rotate(${item.angle}deg) translate(calc(min(${item.radius}vw, ${item.radius}vh))) rotate(${-item.angle}deg)`;
          const suckTransform = `translate(-50%, -50%) scale(0) rotate(${item.angle * 3}deg)`;

          return (
            <div key={i} style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: item.size,
              height: item.size,
              transform: phase >= 1 ? suckTransform : `rotate(${item.angle}deg) translate(calc(min(${item.radius}vw, ${item.radius}vh)))`, // Simplified for cleaner rotation
              // Actually, to make them orbit, we need a container that rotates or individual keyframes.
              // Let's use a simpler approach: Place them, and animate the container or use keyframes.
              // Reverting to the previous approach but with layers.
            }}>
               <div style={{
                 position: 'absolute',
                 inset: 0,
                 animation: phase === 0 ? orbitAnim : 'none',
                 animationDirection: direction,
                 transformOrigin: `calc(50% - min(${item.radius}vw, ${item.radius}vh) * ${Math.cos(item.angle * Math.PI / 180)}) calc(50% - min(${item.radius}vw, ${item.radius}vh) * ${Math.sin(item.angle * Math.PI / 180)})`, // This is getting complex mathematically for CSS
                 // Alternative: Just use the previous technique but with multiple layers
               }} />
            </div>
          );
        })}

        {/* Simplified Orbit Implementation */}
        {[0, 1, 2].map(layerIdx => {
           const layerItems = orbitLayers.filter(x => x.layerIndex === layerIdx);
           const direction = layerIdx % 2 === 0 ? 1 : -1;
           const speed = 40 + layerIdx * 10;

           return (
             <div key={layerIdx} style={{
               position: 'absolute', inset: 0,
               animation: phase === 0 ? `orbitSpin ${speed}s linear infinite` : 'none',
               animationDirection: direction === 1 ? 'normal' : 'reverse',
               transition: 'transform 1s ease-in',
               transform: phase >= 1 ? 'scale(0) rotate(720deg)' : 'scale(1)',
               opacity: phase >= 1 ? 0 : 1,
             }}>
               {layerItems.map((item, k) => (
                 <div key={k} style={{
                   position: 'absolute',
                   left: '50%',
                   top: '50%',
                   width: item.size,
                   height: item.size,
                   transform: `rotate(${item.angle}deg) translate(min(${item.radius}vw, ${item.radius}vh)) rotate(${-item.angle}deg)`,
                 }}>
                    <div style={{
                      width: '100%', height: '100%', borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.8)',
                      overflow: 'hidden',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                      background: item.src ? '#000' : palette[k % palette.length],
                    }}>
                      {item.src && <img src={item.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />}
                    </div>
                 </div>
               ))}
             </div>
           );
        })}
      </div>

      {/* Black Hole Transition */}
      {phase >= 1 && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', border: `2px solid ${NB.white}`, position: 'absolute', animation: 'holeRing 0.8s ease-out infinite' }} />
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${NB.white}`, position: 'absolute', animation: 'holeRing 1.2s ease-out infinite 0.3s' }} />
          <div style={{
            width: 50, height: 50, borderRadius: '50%', background: NB.black,
            border: `6px solid ${NB.white}`,
            transform: phase >= 1 ? 'scale(40)' : 'scale(0)',
            transition: 'transform 1.5s cubic-bezier(0.7, 0, 0.3, 1)', // Aggressive zoom
            boxShadow: '0 0 100px rgba(0,0,0,1)',
          }} />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '60px 24px 24px', position: 'relative', zIndex: 20 }}>
        <div style={{ overflow: 'hidden', marginBottom: 0 }}>
          <div style={{ transform: phase >= 2 ? 'translateY(0)' : 'translateY(110%)', transition: 'transform 500ms cubic-bezier(0.2, 1.2, 0.2, 1)' }}>
            <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 13, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', margin: '0 0 12px 0', textAlign: 'center', fontWeight: 700 }}>{rangeLabel || 'THE DEVOUR'}</p>
            <h1 style={{
              fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
              fontWeight: 900,
              fontSize: 'clamp(80px, 20vw, 140px)',
              color: NB.acidYellow,
              lineHeight: 0.85,
              textTransform: 'uppercase',
              margin: 0,
              textAlign: 'center',
              textShadow: '4px 4px 0px #000',
              animation: phase >= 2 ? 'glitchText 2.5s infinite' : 'none',
            }}>
              {counted.toLocaleString()}
            </h1>
            <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 700, fontSize: 'clamp(32px, 8vw, 48px)', color: NB.white, textTransform: 'uppercase', margin: '12px 0 32px 0', textAlign: 'center', letterSpacing: '0.15em', textShadow: '2px 2px 0 #000' }}>MINUTES LISTENED</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 360, transform: phase >= 2 ? 'translateY(0)' : 'translateY(40px)', opacity: phase >= 2 ? 1 : 0, transition: 'all 500ms ease 300ms' }}>
          {[{ label: 'HOURS', value: hours.toLocaleString() }, { label: 'DAYS', value: days }].map((s, i) => (
            <motion.div
              key={s.label}
              whileHover={{ scale: 1.05, rotate: i % 2 === 0 ? -2 : 2 }}
              style={{ flex: 1, background: NB.white, border: `4px solid ${NB.black}`, boxShadow: '6px 6px 0px #000', padding: '16px 20px', borderRadius: 0 }}
            >
              <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.black, margin: '0 0 6px 0', fontWeight: 700 }}>{s.label}</p>
              <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 32, color: NB.black, margin: 0, lineHeight: 1 }}>{s.value}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <Ticker text="THE DEVOUR  MINUTES  KEEP LISTENING" bg={NB.black} color={NB.acidYellow} />
    </div>
  );
};

// SLIDE 1: THE SHOWDOWN
const Slide1: React.FC<{ active: boolean; artists: Artist[]; rangeLabel?: string }> = ({ active, artists, rangeLabel }) => {
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
        @keyframes flashBg { 0% { background-color: ${NB.electricBlue}; } 50% { background-color: ${NB.white}; } 100% { background-color: ${NB.acidYellow}; } }
        @keyframes popIn { 0% { transform: scale(0.8); opacity: 0; } 60% { transform: scale(1.1); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      {guessed && <div style={{ position: 'absolute', inset: 0, animation: 'flashBg 0.5s ease forwards', zIndex: 0 }} />}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 16, position: 'relative', zIndex: 1 }}>
        <AnimatePresence>
          {!guessed && (
            <motion.div exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 7vw, 48px)', color: NB.white, textTransform: 'uppercase', margin: '0 0 8px 0', lineHeight: 1 }}>
                WHO WAS YOUR #1 ARTIST {rangeLabel ? rangeLabel.toUpperCase() : 'THIS YEAR'}?
              </h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', background: NB.acidYellow, border: `4px solid ${NB.black}`, padding: '6px 12px', animation: 'blink 1s step-end infinite', marginBottom: 8, alignSelf: 'flex-start', borderRadius: 0 }}>
                <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase', color: NB.black }}>TAP TO GUESS</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {guessed && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
            <h2 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(36px, 9vw, 56px)', color: NB.black, textTransform: 'uppercase', margin: '0 0 4px 0', textShadow: '2px 2px 0 #fff' }}>
              {firstTryWrong ? 'TOOK YOU A MOMENT\u2026' : 'YOU KNEW IT.'}
            </h2>
          </motion.div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {shuffled.map((artist, i) => {
            const isWrong = wrongIds.includes(artist.id);
            const isSelected = selectedId === artist.id;
            const isCorrect = artist.id === correctId;

            // If guessed, hide non-selected ones unless we want to show them faded out.
            // The request says "redesign slides make it har the artist/album images".
            // Let's make the winner huge.
            if (guessed && !isCorrect) return null;

            return (
              <motion.div
                key={artist.id}
                layout
                initial={{ x: 120, opacity: 0 }}
                animate={{
                  x: isWrong && !guessed ? -500 : 0,
                  opacity: isWrong && !guessed ? 0 : 1,
                  scale: guessed && isCorrect ? 1.1 : 1,
                }}
                transition={{ delay: stagger(i, 0.1, 0.1), duration: 0.4, type: 'spring' }}
                onClick={(e) => { e.stopPropagation(); handleGuess(artist.id); }}
                style={{
                  background: NB.white,
                  border: `4px solid ${isSelected && isCorrect ? NB.acidYellow : isWrong ? '#FF0000' : NB.black}`,
                  boxShadow: guessed && isCorrect ? '8px 8px 0px #000' : '5px 5px 0px #000',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  borderRadius: 0,
                  animation: shaking === artist.id ? 'shake 400ms ease' : undefined,
                  transformOrigin: 'center',
                }}
              >
                <div style={{ padding: '10px 12px', display: 'flex', flexDirection: guessed && isCorrect ? 'column' : 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: guessed && isCorrect ? '100%' : 56,
                    height: guessed && isCorrect ? 240 : 56,
                    background: palette[i % palette.length],
                    border: `3px solid ${NB.black}`,
                    overflow: 'hidden',
                    flexShrink: 0,
                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}>
                    {artist.image && (
                      <img src={artist.image} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.currentTarget.style.display = 'none'); }} />
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: guessed && isCorrect ? 32 : 22, textTransform: 'uppercase', color: NB.black, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</span>
                      {isWrong && <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 20, color: '#FF0000' }}>\u2715</span>}
                      {isSelected && isCorrect && guessed && <span style={{ background: NB.black, color: NB.acidYellow, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 14, padding: '4px 10px', letterSpacing: '0.1em' }}>#1 ARTIST</span>}
                    </div>

                    {isSelected && isCorrect && guessed && (
                       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                        <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 16, fontWeight: 700, color: NB.black, margin: 0 }}>
                          {artist.totalListens.toLocaleString()} plays this {rangeLabel ? rangeLabel.toLowerCase() : 'year'}
                        </p>
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <Ticker text={guessed ? `WINNER: ${artists[0]?.name?.toUpperCase()}  •  TOP ARTIST  •  NUMBER ONE` : "THE SHOWDOWN  WHO'S YOUR #1"} bg={guessed ? NB.acidYellow : NB.nearBlack} color={guessed ? NB.black : NB.white} />
    </div>
  );
};

// SLIDE 2: RANKING RACE (Bar Chart Race)
const Slide2: React.FC<{ active: boolean; artists: Artist[]; rangeLabel?: string }> = ({ active, artists, rangeLabel }) => {
  const topArtists = useMemo(() => artists.slice(0, 6), [artists]);
  const maxListens = useMemo(() => topArtists[0]?.totalListens || 1, [topArtists]);
  const [raceFrame, setRaceFrame] = useState(0);
  const RACE_FRAMES = 60;
  const raceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) { setRaceFrame(0); if (raceRef.current) clearInterval(raceRef.current); return; }
    setRaceFrame(0);
    let f = 0;
    raceRef.current = setInterval(() => {
      f += 1;
      setRaceFrame(f);
      if (f >= RACE_FRAMES && raceRef.current) clearInterval(raceRef.current);
    }, 40);
    return () => { if (raceRef.current) clearInterval(raceRef.current); };
  }, [active]);

  const progress = Math.min(1, raceFrame / RACE_FRAMES);
  const eased = 1 - Math.pow(1 - progress, 3);

  const getRacePositions = useCallback((easeP: number) => {
    return topArtists.map((artist, i) => {
      const finalShare = artist.totalListens / maxListens;
      const jitter = i > 0 ? Math.sin(easeP * Math.PI * (1 + i * 0.5)) * 0.12 * (1 - easeP) : 0;
      const currentShare = Math.max(0, Math.min(1, finalShare * easeP + jitter));
      return { artist, share: currentShare, finalShare };
    });
  }, [topArtists, maxListens]);

  const positions = useMemo(() => {
    const raw = getRacePositions(eased);
    return [...raw].sort((a, b) => b.share - a.share);
  }, [getRacePositions, eased]);

  const barColors = [NB.acidYellow, NB.coral, NB.electricBlue, NB.magenta, '#CCCCCC', '#888888'];
  const isDone = raceFrame >= RACE_FRAMES;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 16px', gap: 10, overflowY: 'auto' }}>
        <div>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px 0' }}>
            {rangeLabel ? rangeLabel.toUpperCase() : 'ALL TIME'} BREAKDOWN
          </p>
          <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(38px, 10vw, 64px)', color: NB.white, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>
            RANKING<br/>RACE
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          {positions.map((item, rank) => {
            const barW = `${Math.round(item.share * 100)}%`;
            const isLeader = rank === 0;
            const color = barColors[topArtists.indexOf(item.artist)] || NB.white;
            return (
              <motion.div
                key={item.artist.id}
                layout
                transition={{ type: 'spring', stiffness: 300, damping: 35 }}
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <span style={{
                  fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                  fontWeight: 900, fontSize: 18, color: isLeader ? NB.acidYellow : 'rgba(255,255,255,0.35)',
                  width: 22, flexShrink: 0, textAlign: 'right', lineHeight: 1,
                }}>
                  {rank + 1}
                </span>

                {/* Artist Avatar */}
                <div style={{ width: 42, height: 42, flexShrink: 0, borderRadius: '50%', border: `2px solid ${color}`, overflow: 'hidden', background: '#222' }}>
                  {item.artist.image ? (
                    <img src={item.artist.image} alt={item.artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
                  ) : (
                     <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: NB.white, fontWeight: 900 }}>{item.artist.name.charAt(0)}</div>
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                      fontWeight: 900, fontSize: 16, color: NB.white, textTransform: 'uppercase',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%',
                    }}>
                      {item.artist.name}
                    </span>
                    {isDone && (
                      <span style={{
                        fontFamily: "'Barlow', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.6)',
                        fontWeight: 700,
                      }}>
                        {item.artist.totalListens.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div style={{ height: 20, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
                    <div style={{
                      height: '100%',
                      width: barW,
                      background: isLeader
                        ? `linear-gradient(90deg, ${color}, ${color}dd)`
                        : `linear-gradient(90deg, ${color}99, ${color}66)`,
                      borderRadius: 2,
                      transition: 'width 40ms linear',
                      position: 'relative',
                    }}>
                      {isLeader && isDone && (
                        <span style={{
                          position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                          fontSize: 10, fontWeight: 900, color: NB.black,
                          fontFamily: "'Barlow', sans-serif",
                        }}>👑</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {isDone && positions[0] && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{ background: NB.acidYellow, border: `4px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', padding: '12px 16px', marginTop: 'auto' }}
          >
            <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 22, color: NB.black, textTransform: 'uppercase' }}>
              🏆 {positions[0].artist.name} WINS!
            </p>
            <p style={{ margin: '4px 0 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#333' }}>
              {positions[0].artist.totalListens.toLocaleString()} plays — dominated the {rangeLabel?.toLowerCase() || 'period'}
            </p>
          </motion.div>
        )}
      </div>
      <Ticker text="RANKING RACE  ARTIST BATTLE  WHO DOMINATES" bg={NB.electricBlue} color={NB.white} />
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
      <style>{`
        @keyframes sunburst { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      {revealed && (
         <div style={{ position: 'absolute', top: '50%', left: '50%', width: '200vw', height: '200vw', transform: 'translate(-50%, -50%)', zIndex: 0, opacity: 0.15 }}>
           <div style={{ width: '100%', height: '100%', background: `conic-gradient(from 0deg, ${NB.white} 0deg 20deg, transparent 20deg 40deg)`, backgroundSize: '100% 100%', animation: 'sunburst 20s linear infinite', borderRadius: '50%' }} />
           <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, background: `conic-gradient(from 180deg, ${NB.white} 0deg 20deg, transparent 20deg 40deg)`, animation: 'sunburst 20s linear infinite reverse', borderRadius: '50%' }} />
         </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 16, position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(32px, 8vw, 56px)', color: NB.white, textTransform: 'uppercase', margin: '0 0 8px 0', lineHeight: 1 }}>
          WHICH WAS YOUR #1 ALBUM?
        </h1>
        <div style={{ width: '100%', height: 32, background: NB.white, border: `4px solid ${NB.black}`, position: 'relative', overflow: 'hidden', marginBottom: 8, borderRadius: 0 }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: NB.black, width: `${(timer / ROUND_SECONDS) * 100}%`, transition: 'width 0.13s linear' }} />
          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 16, color: revealed ? NB.black : NB.white, mixBlendMode: 'difference' as const, zIndex: 1 }}>
            {revealed ? verdict : `${timer}s`}
          </span>
        </div>

        {/* Album Cards Container */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: revealed ? '1fr' : 'repeat(3, 1fr)',
          gap: 10,
          transition: 'all 0.5s ease'
        }}>
          {topThree.map((album, i) => {
            const isCorrect = i === 0;
            const isSelected = selected === i;
            const borderColor = revealed ? (isCorrect ? NB.acidYellow : isSelected ? '#FF0000' : NB.black) : NB.black;
            const borderWidth = revealed && isCorrect ? 6 : 4;
            const flip = revealed && isCorrect;

            // If revealed, hide losers to focus on winner
            if (revealed && !isCorrect) return null;

            return (
              <motion.div
                key={album.id}
                layout
                onClick={(e) => { e.stopPropagation(); handlePick(i); }}
                style={{ cursor: 'pointer', perspective: 1000, minWidth: 0, width: '100%' }}
                animate={{ scale: revealed && isCorrect ? 1.05 : 1 }}
                transition={{ duration: 0.5 }}
              >
                <div style={{ position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 800ms cubic-bezier(0.175, 0.885, 0.32, 1.275)', transform: flip ? 'rotateY(180deg)' : 'rotateY(0deg)' }}>
                  {/* Front of Card */}
                  <div style={{ border: `${borderWidth}px solid ${borderColor}`, position: 'relative', overflow: 'hidden', boxShadow: '5px 5px 0 #000', borderRadius: 0, backfaceVisibility: 'hidden', background: NB.white }}>
                    <div style={{ aspectRatio: '1 / 1', background: palette[i], position: 'relative' }}>
                      {album.cover && <img src={album.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />}
                    </div>
                    <div style={{ padding: '8px 8px', background: NB.white }}>
                      <p style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: revealed ? 24 : 14, color: NB.black, margin: '0 0 2px 0', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.title}</p>
                      {revealed && <p style={{ fontFamily: "'Barlow', sans-serif", fontSize: 14, color: '#333', margin: 0 }}>{album.artist}</p>}
                    </div>
                  </div>

                  {/* Back of Card (AI Fun Fact) */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    border: `6px solid ${NB.black}`,
                    background: NB.acidYellow,
                    padding: 16,
                    transform: 'rotateY(180deg)',
                    backfaceVisibility: 'hidden',
                    boxShadow: '5px 5px 0 #000',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                  }}>
                    <div>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                         <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontSize: 12, color: NB.black, fontWeight: 700, letterSpacing: '0.1em' }}>AI FUN FACT</p>
                         <span style={{ fontSize: 20 }}>🤖</span>
                      </div>
                      <div style={{ width: '100%', height: 2, background: NB.black, margin: '8px 0' }} />
                      <p style={{ margin: '6px 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 'clamp(18px, 4vw, 24px)', lineHeight: 1.1, color: NB.black }}>
                         {funFact || 'Analyzing audio data...'}
                      </p>
                    </div>
                    <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#333', fontWeight: 700, alignSelf: 'flex-end' }}>{album.totalListens.toLocaleString()} PLAYS</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <Ticker text={revealed ? "THE VAULT  •  UNLOCKED  •  TOP ALBUM REVEALED" : "THE VAULT GUESS  PICK YOUR TOP ALBUM"} bg={NB.nearBlack} color={NB.white} />
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
  const vec = metricsVector(metrics);

  return FRUIT_PROFILES
    .map((f) => {
      const profileVec = f.v;
      const euclidean = Math.sqrt(profileVec.reduce((sum, value, i) => sum + Math.pow(value - vec[i], 2), 0));
      const dot = profileVec.reduce((sum, value, i) => sum + value * vec[i], 0);
      const profileNorm = Math.sqrt(profileVec.reduce((sum, value) => sum + value * value, 0));
      const vecNorm = Math.sqrt(vec.reduce((sum, value) => sum + value * value, 0));
      const cosineDistance = 1 - dot / Math.max(1, profileNorm * vecNorm);
      // Penalise profiles where any single dimension differs by > 30pts —
      // prevents one dominant metric from completely deciding the fruit
      const maxDimDiff = Math.max(...profileVec.map((value, i) => Math.abs(value - vec[i])));
      const outlierPenalty = Math.max(0, (maxDimDiff - 30) * 0.5);
      const score = euclidean * 0.55 + cosineDistance * 100 * 0.3 + outlierPenalty * 0.15;
      return { ...f, score };
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

        <div style={{ height: 'clamp(140px, 22vw, 180px)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
              <BCard style={{ background: NB.white, maxHeight: '42vh', overflowY: 'auto' }}>
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

        {/* Hero Card */}
        <BCard style={{ marginTop: 2, background: 'rgba(255,255,255,0.96)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 42 }}>{timeInsights.winner.icon}</div>
            <div>
              <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#333' }}>Narrative Snapshot</p>
              <p style={{ margin: '2px 0 0 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 24, lineHeight: 1, color: NB.black }}>{timeInsights.winner.label} IS YOUR PRIME TIME</p>
            </div>
          </div>
          <div style={{ marginTop: 12, width: '100%', height: 6, background: '#eee', borderRadius: 3 }}>
             <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1 }} style={{ height: '100%', background: NB.black, borderRadius: 3 }} />
          </div>
          <p style={{ margin: '8px 0 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#444', lineHeight: 1.4 }}>
            You played {timeInsights.winnerGap}% more music during the {timeInsights.winner.label.toLowerCase()} than {timeInsights.runnerUp.label.toLowerCase()}. {timeInsights.winner.story}.
          </p>
        </BCard>

        {/* Vertical Time Blocks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, justifyContent: 'center' }}>
          {timeInsights.totals.map((bucket, i) => {
            const pct = Math.round((bucket.ms / timeInsights.totalMs) * 100);
            return (
              <motion.div
                key={bucket.label}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: active ? 1 : 0.5, x: active ? 0 : -20 }}
                transition={{ delay: i * 0.1 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '8px 12px',
                  background: 'rgba(0,0,0,0.2)',
                  borderLeft: `4px solid ${bucket.color}`,
                  borderRadius: 4
                }}
              >
                 <div style={{ width: 24, fontSize: 20, textAlign: 'center' }}>{bucket.icon}</div>
                 <div style={{ flex: 1 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                     <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 18, color: NB.white }}>{bucket.label}</p>
                     <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 18, color: NB.white }}>{pct}%</p>
                   </div>
                   <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                     <motion.div
                       initial={{ width: 0 }}
                       animate={{ width: active ? `${pct}%` : 0 }}
                       transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                       style={{ height: '100%', background: bucket.color, borderRadius: 3 }}
                     />
                   </div>
                 </div>
              </motion.div>
            );
          })}
        </div>
      </div>
      <Ticker text="TIME MACHINE  LISTENING WINDOWS  DAYPART ENERGY" bg={NB.nearBlack} color={NB.acidYellow} />
    </div>
  );
};

// SLIDE 6: THE LOYALTY TEST
const Slide6: React.FC<{ active: boolean; artists: Artist[] }> = ({ active, artists }) => {
  const top5 = artists.slice(0, 5);
  const total = top5.reduce((s, a) => s + a.totalListens, 0) || 1;
  const topShare = (top5[0]?.totalListens || 0) / total;
  const verdict = topShare > 0.35 ? 'RIDE OR DIE ENERGY' : 'WIDE TASTE ENERGY';
  const artistPalette = [NB.electricBlue, NB.coral, NB.magenta, NB.acidYellow, '#FFFFFF'];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.acidYellow, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '56px 16px 14px', gap: 12 }}>
        <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(30px, 7.4vw, 52px)', color: NB.black, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>YOUR LOYALTY MAP</h1>
        <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.black, margin: 0 }}>TOP ARTISTS • WHO OWNS YOUR PLAYS</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          {top5.map((artist, i) => {
            const pct = Math.round((artist.totalListens / total) * 100);
            return (
              <div key={artist.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Artist Avatar */}
                <div style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${NB.black}`, overflow: 'hidden', flexShrink: 0, background: '#222' }}>
                  {artist.image ? (
                    <img src={artist.image} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: NB.white, fontWeight: 900 }}>{artist.name.charAt(0)}</div>
                  )}
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 16, color: NB.black, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{artist.name}</span>
                    <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 16, color: NB.black }}>{pct}%</span>
                  </div>
                  <div style={{ height: 22, background: 'rgba(0,0,0,0.1)', border: `2px solid ${NB.black}`, overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: active ? `${pct}%` : '0%' }}
                      transition={{ duration: 0.8, delay: i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
                      style={{ height: '100%', background: artistPalette[i], borderRight: `2px solid ${NB.black}` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <BCard style={{ marginTop: 'auto' }}>
          <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 26, color: NB.black, textTransform: 'uppercase' }}>{verdict}</p>
          {top5[0] && <p style={{ margin: '4px 0 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 12, color: '#333' }}>🏆 {top5[0].name} dominates your top 5 with {Math.round(topShare * 100)}%</p>}
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
    }, 25); // Faster wave
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, dataLoaded]);

  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  const monthStartWeeks = [0,4,8,13,17,21,26,30,34,39,43,47];

  const getCellColor = (val: number, revealed: boolean, inStreak: boolean) => {
    if (!revealed) return '#111';
    if (inStreak) return NB.acidYellow; // Streak is always bright
    if (val < 0.1) return '#222';
    if (val < 0.4) return '#444';
    if (val < 0.7) return '#888';
    return '#ccc';
  };

  const isStreak = (w: number, d: number) => {
    const dayIndex = w * 7 + d;
    return dayIndex >= STREAK_START && dayIndex < STREAK_START + STREAK_LEN;
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

  const orbitScore = Math.min(250, 80 + Math.round((topArtist?.totalListens || 0) / 3));

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
          {/* Shine overlay */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)', pointerEvents: 'none' }} />
        </div>

        {/* TOTAL LOOPS counter */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(48px, 12vw, 68px)', color: NB.acidYellow, lineHeight: 1, textShadow: '4px 4px 0 rgba(0,0,0,0.2)' }}>{displayTotal.toLocaleString()}</span>
          <span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 12, color: NB.white, textTransform: 'uppercase', letterSpacing: '0.1em' }}>TOTAL LOOPS</span>
        </div>

        {/* Track rows with animated spin counts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loops.map((song, i) => (
            <ReplayTrackRow key={song.id} song={song} index={i} active={active} pulsing={pulsing} targetCount={song.listens} />
          ))}
        </div>
      </div>
      <Ticker text="REPLAY VALUE  VINYL LOOP  RUN IT BACK" bg={NB.nearBlack} color={NB.white} />
    </div>
  );
};

// SLIDE 12: FINAL SUMMARY (minimalist)
const Slide12: React.FC<{ totalMinutes: number; artists: Artist[]; songs: Song[]; albums: Album[]; onClose: () => void; winningFruit?: { name: string; emoji: string } | null }> = ({ totalMinutes, artists, songs, albums, onClose, winningFruit }) => {
  const hours = Math.round(totalMinutes / 60);
  const topArtist = artists[0];
  const topSong = songs[0];
  const topAlbum = albums[0];
  const stats = [
    { label: 'Minutes', value: totalMinutes.toLocaleString(), icon: '⏱️' },
    { label: 'Hours', value: hours.toLocaleString(), icon: '🕐' },
    { label: 'Top Artist', value: topArtist?.name || '—', icon: '🎤' },
    { label: 'Top Song', value: topSong?.title || '—', icon: '🎵' },
    { label: 'Top Album', value: topAlbum?.title || '—', icon: '💿' },
    ...(winningFruit ? [{ label: 'Music DNA', value: `${winningFruit.emoji} ${winningFruit.name}`, icon: '🧬' }] : []),
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.nearBlack, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 20px', gap: 14 }}>
        <div>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', margin: '0 0 4px 0' }}>THAT'S A WRAP</p>
          <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(42px, 11vw, 70px)', color: NB.acidYellow, textTransform: 'uppercase', margin: 0, lineHeight: 0.95 }}>
            YOUR YEAR<br/>SUMMED UP
          </h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
              style={{
                background: i === 0 ? NB.acidYellow : 'rgba(255,255,255,0.06)',
                border: `2px solid ${i === 0 ? NB.black : 'rgba(255,255,255,0.1)'}`,
                padding: '12px 14px',
                gridColumn: i === 0 ? 'span 2' : 'span 1',
              }}
            >
              <p style={{ margin: '0 0 2px 0', fontFamily: "'Barlow', sans-serif", fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: i === 0 ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                {stat.icon} {stat.label}
              </p>
              <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: i === 0 ? 'clamp(32px, 8vw, 48px)' : 'clamp(16px, 4vw, 22px)', color: i === 0 ? NB.black : NB.white, lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: i === 0 ? 'nowrap' : 'normal', WebkitLineClamp: 2, display: i === 0 ? 'block' : '-webkit-box', WebkitBoxOrient: 'vertical' }}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ marginTop: 'auto', display: 'flex', gap: 8 }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{ flex: 1, background: NB.white, border: `3px solid ${NB.black}`, boxShadow: '3px 3px 0 #000', padding: '12px 20px', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 16, color: NB.black, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            DONE ✓
          </button>
        </motion.div>
      </div>
      <Ticker text="LOTUS WRAPPED  THAT'S A WRAP  SHARE YOUR STORY" bg={NB.acidYellow} color={NB.black} />
    </div>
  );
};

// SLIDE DOMINATION: WHO RUNS YOUR CHART (redesigned)
const SlideDomination: React.FC<{ active: boolean; artists: Artist[] }> = ({ active, artists }) => {
  const top3 = artists.slice(0, 3);
  const total = artists.reduce((s, a) => s + a.totalListens, 0) || 1;

  const podiumOrder = [1, 0, 2]; // 2nd, 1st, 3rd
  const podiumHeights = [140, 180, 110];
  const podiumColors = [NB.coral, NB.acidYellow, NB.electricBlue];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: NB.black, position: 'relative', overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 16px', gap: 14 }}>
        <div>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', margin: '0 0 4px 0' }}>CHART CONTROL</p>
          <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(36px, 9vw, 56px)', color: NB.white, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>
            WHO RUNS<br/>YOUR CHART
          </h1>
        </div>

        {/* Podium Layout */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', height: 320, gap: 8, marginTop: 'auto', marginBottom: 20 }}>
          {podiumOrder.map((idx) => {
            const artist = top3[idx];
            if (!artist) return null;
            const height = podiumHeights[idx];
            const color = podiumColors[idx];
            const pct = Math.round((artist.totalListens / total) * 100);

            return (
              <motion.div
                key={artist.id}
                initial={{ y: 200, opacity: 0 }}
                animate={{ y: active ? 0 : 200, opacity: 1 }}
                transition={{ type: 'spring', damping: 15, delay: idx * 0.15 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '30%' }}
              >
                {/* Avatar */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: active ? 1 : 0 }}
                  transition={{ delay: 0.4 + idx * 0.15 }}
                  style={{ width: idx === 0 ? 80 : 60, height: idx === 0 ? 80 : 60, borderRadius: '50%', border: `4px solid ${color}`, overflow: 'hidden', background: '#222', marginBottom: -20, zIndex: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                >
                  {artist.image ? (
                    <img src={artist.image} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: NB.white, fontWeight: 900, fontSize: 20 }}>{artist.name.charAt(0)}</div>
                  )}
                </motion.div>

                {/* Bar */}
                <div style={{ width: '100%', height: height, background: color, border: `3px solid ${NB.black}`, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24, boxShadow: '6px 6px 0 #000' }}>
                   <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 32, color: NB.black }}>{idx + 1}</span>
                   <span style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 18, color: NB.black }}>{pct}%</span>
                </div>

                {/* Name */}
                <p style={{ marginTop: 8, fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, color: NB.white, textAlign: 'center', textTransform: 'uppercase', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {artist.name}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
      <Ticker text="CHART CONTROL  DOMINANCE MAP  WHO RUNS THIS" bg={NB.white} color={NB.black} />
    </div>
  );
};



const SlideLotusSignal: React.FC<{ active: boolean; historyRows: HistoryRow[] }> = ({ active, historyRows }) => {
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
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, #1a0b2e 0%, #000 70%)' }} />

      <div style={{ flex: 1, padding: '58px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', zIndex: 1 }}>
        <h1 style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(28px, 7vw, 48px)', color: NB.white, textTransform: 'uppercase', lineHeight: 1 }}>LOTUS SIGNAL</h1>
        <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>
          YOUR LISTENING CLOCK IN MOTION
        </p>

        {/* EQ Visualizer */}
        <div style={{ height: 240, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 4px', gap: 2 }}>
          {hourly.bins.map((value, i) => {
            const heightPct = Math.max(4, Math.round((value / hourly.max) * 100));
            const isPeak = i === hourly.peakHour;
            const hourLabel = i % 4 === 0 ? (i === 0 ? '12AM' : i === 12 ? '12PM' : i > 12 ? `${i-12}PM` : `${i}AM`) : '';

            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <motion.div
                  initial={{ height: '4%' }}
                  animate={{ height: `${active ? heightPct : 4}%`, boxShadow: isPeak ? `0 0 15px ${NB.acidYellow}` : 'none' }}
                  transition={{ duration: 0.6, delay: i * 0.03, type: 'spring' }}
                  style={{
                    width: '100%',
                    borderRadius: '2px 2px 0 0',
                    background: isPeak ? NB.acidYellow : `linear-gradient(to top, #333 0%, ${NB.magenta} 100%)`,
                    opacity: isPeak ? 1 : 0.7
                  }}
                />
                {hourLabel && (
                  <span style={{ position: 'absolute', bottom: -20, fontSize: 9, color: '#666', fontFamily: "'Barlow', sans-serif" }}>{hourLabel}</span>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'center' }}>
          <BCard style={{ background: 'rgba(255,255,255,0.95)', maxWidth: 320, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <p style={{ margin: '0 0 2px 0', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 32, color: NB.black }}>
                 {hourly.primeWindow}
               </p>
               <span style={{ fontSize: 24 }}>⚡</span>
            </div>
            <p style={{ margin: 0, fontFamily: "'Barlow', sans-serif", fontSize: 13, color: '#333' }}>
              Your peak listening hour. {hourly.totalSessions.toLocaleString()} sessions detected in your history.
            </p>
          </BCard>
        </div>
      </div>
      <Ticker text="LOTUS SIGNAL  •  PEAK HOUR  •  LISTENING CLOCK" bg={NB.magenta} color={NB.white} />
    </div>
  );
};


// SLIDE HIDDEN GEM
const SlideHiddenGem: React.FC<{ active: boolean; artists: Artist[]; songs: Song[] }> = ({ active, artists, songs }) => {
  const gem = artists[artists.length > 3 ? Math.floor(artists.length / 2) : 0] || artists[0];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0A1A0A', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes gemFloat { 0%{transform:translateY(0) rotate(0deg);} 50%{transform:translateY(-10px) rotate(2deg);} 100%{transform:translateY(0) rotate(0deg);} }
        @keyframes shine { 0%{background-position: -100px;} 100%{background-position: 200px;} }
      `}</style>

      {/* Gem Background */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, #003311 0%, #000 80%)' }} />
      <div style={{ position: 'absolute', inset: 0, opacity: 0.3, backgroundImage: `url(${gem?.image || ''})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(40px)' }} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '60px 20px 16px', gap: 14, position: 'relative', zIndex: 1, justifyContent: 'center' }}>
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: active ? 1 : 0, y: active ? 0 : -20 }} transition={{ duration: 0.5 }}>
          <p style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', margin: '0 0 4px 0', textAlign: 'center' }}>YOUR DISCOVERY STORY</p>
          <h1 style={{ fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 'clamp(42px, 12vw, 64px)', color: NB.white, textTransform: 'uppercase', margin: 0, lineHeight: 1, textAlign: 'center' }}>
            HIDDEN GEM
          </h1>
        </motion.div>

        {gem && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: active ? 1 : 0.8, opacity: active ? 1 : 0 }}
            transition={{ type: 'spring', delay: 0.2 }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '30px 20px',
              borderRadius: 20,
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              animation: 'gemFloat 6s ease-in-out infinite'
            }}
          >
            <div style={{ position: 'relative' }}>
              {gem.image ? (
                <img src={gem.image} alt={gem.name} style={{ width: 140, height: 140, borderRadius: '50%', objectFit: 'cover', border: '4px solid #00FF64', boxShadow: '0 0 30px rgba(0,255,100,0.3)' }} onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }} />
              ) : (
                <div style={{ width: 140, height: 140, borderRadius: '50%', background: '#00FF64', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, fontWeight: 900, color: '#000' }}>{gem.name.charAt(0)}</div>
              )}
              <div style={{ position: 'absolute', bottom: -10, right: -10, fontSize: 40, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))' }}>💎</div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 32, color: '#00FF64', textTransform: 'uppercase' }}>{gem.name}</p>
              <p style={{ margin: '8px 0 0 0', fontFamily: "'Barlow', sans-serif", fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>
                You discovered them and kept coming back. A true diamond in the rough of your year.
              </p>
            </div>
          </motion.div>
        )}
      </div>
      <Ticker text="HIDDEN GEM  DISCOVERY TIMELINE  YOUR NEW FAVORITE" bg='#001A00' color='#00FF64' />
    </div>
  );
};

// MAIN COMPONENT
export default function WrappedSlides({ onClose, totalMinutes, artists, albums, songs, albumCovers, rangeLabel, rangeStart, rangeEnd }: WrappedSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [previewMap, setPreviewMap] = useState<Record<string, string>>({});
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
    if (!spotifyToken) {
      console.warn('[WrappedSlides] ⚠️ No Spotify token found — snippets unavailable');
      return;
    }
    if (songs.length === 0) {
      console.warn('[WrappedSlides] ⚠️ No songs available to fetch previews for');
      return;
    }
    const trackIds = songs.map((song) => song.id).filter(Boolean);
    console.log(`[WrappedSlides] 🎵 Fetching preview URLs for ${trackIds.length} songs. Sample IDs:`, trackIds.slice(0, 3));
    fetchTrackPreviewUrls(spotifyToken, trackIds).then((map) => {
      if (!cancelled) {
        const count = Object.keys(map).length;
        console.log(`[WrappedSlides] ✅ Preview URL map ready — ${count} URLs found out of ${trackIds.length} requested`);
        if (count === 0) {
          console.warn('[WrappedSlides] ⚠️ No preview URLs returned. Spotify may have removed previews for these tracks.');
        }
        setPreviewMap(map);
      }
    }).catch((err) => {
      console.error('[WrappedSlides] ❌ Failed to fetch preview URLs:', err);
      if (!cancelled) setPreviewMap({});
    });
    return () => { cancelled = true; };
  }, [songs]);

  useEffect(() => {
    if (songs.length === 0) return;
    const trackForSlide = songs[currentSlide % songs.length];
    if (!trackForSlide) return;
    const previewUrl = previewMap[trackForSlide.id];
    if (!previewUrl) {
      console.log(`[WrappedSlides] ℹ️ No preview URL for "${trackForSlide.title}" (id: ${trackForSlide.id}) — skipping audio`);
      setNowPlayingSnippet(null);
      return;
    }

    console.log(`[WrappedSlides] ▶️ Playing snippet for "${trackForSlide.title}"`);
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.pause();
    audio.src = previewUrl;
    audio.currentTime = 0;
    audio.volume = snippetMuted ? 0 : 0.65;
    audio.play().catch((err) => {
      console.warn('[WrappedSlides] ⚠️ Audio play blocked (autoplay policy or browser restriction):', err.message);
    });
    setNowPlayingSnippet(trackForSlide);

    return () => {
      audio.pause();
    };
  }, [currentSlide, songs, previewMap, snippetMuted]);

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
      case 1: return <Slide1 active={currentSlide === 1} artists={artists} rangeLabel={rangeLabel} />;
      case 2: return <Slide2 active={currentSlide === 2} artists={artists} rangeLabel={rangeLabel} />;
      case 3: return <Slide3 active={currentSlide === 3} albums={albums} />;
      case 4: return <Slide4 active={currentSlide === 4} songs={songs} historyRows={filteredHistory} />;
      case 5: return <Slide5 active={currentSlide === 5} />;
      case 6: return <Slide6 active={currentSlide === 6} artists={artists} />;
      case 7: return <Slide7 active={currentSlide === 7} artists={artists} songs={songs} />;
      case 8: return <Slide8 active={currentSlide === 8} songs={songs} rangeLabel={rangeLabel} />;
      case 9: return <Slide9 active={currentSlide === 9} artists={artists} songs={songs} rangeLabel={rangeLabel} />;
      case 10: return <Slide11 active={currentSlide === 10} songs={songs} />;
      case 11: return <SlideDomination active={currentSlide === 11} artists={artists} />;
      case 12: return <SlideLotusSignal active={currentSlide === 12} historyRows={filteredHistory} />;
      case 13: return <SlideHiddenGem active={currentSlide === 13} artists={artists} songs={songs} />;
      case 14: return <Slide12 totalMinutes={totalMinutes} artists={artists} songs={songs} albums={albums} onClose={onClose} winningFruit={winningFruit} />;
      default: return <Slide0 active={currentSlide === 0} totalMinutes={totalMinutes} albumCovers={albumCovers} albums={albums} rangeLabel={rangeLabel} />;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: NB.nearBlack, touchAction: 'none' }}>
      <style>{`
        @media (max-width: 480px) {
          .wrapped-slide-content { padding-top: 54px !important; padding-left: 12px !important; padding-right: 12px !important; }
          .wrapped-ticker span { font-size: 11px !important; }
        }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <StoryProgressBar current={currentSlide} total={TOTAL_SLIDES} />
        <SlideNavButtons current={currentSlide} total={TOTAL_SLIDES} onPrev={prev} onNext={next} />
        <CloseButton onClose={onClose} />

        {/* Snippet bar: only mute toggle + song name, no "SNIPPET ON/OFF" text */}
        <div style={{ position: 'absolute', top: 36, right: 52, zIndex: 130, display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.20)', padding: '5px 8px', color: NB.white, backdropFilter: 'blur(8px)', maxWidth: 'calc(100vw - 110px)' }}>
          <button onClick={() => setSnippetMuted((prev) => !prev)} style={{ border: 'none', background: 'transparent', color: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', padding: 0, flexShrink: 0 }} aria-label="Toggle snippet mute">
            {snippetMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          {nowPlayingSnippet && <span style={{ fontSize: 11, fontFamily: "'Barlow', sans-serif", fontWeight: 700, maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.03em' }}>♪ {nowPlayingSnippet.title}</span>}
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
