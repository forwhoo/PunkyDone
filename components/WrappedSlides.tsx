import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, TrendingUp, Headphones, Music, Disc, Repeat, Flame, Zap, Clock, Sparkles } from 'lucide-react';
import { Artist, Album, Song } from '../types';

// ─── BRUTALIST COLOR PALETTE ────────────────────────────────────
const W = {
  electricYellow: '#FFD700',
  electricBlue: '#2839DB',
  hotCoral: '#E63946',
  vividGreen: '#00C853',
  deepPurple: '#6C3CE1',
  hotPink: '#FF3EA5',
  offWhite: '#F5F0E8',
  trueBlack: '#000000',
  trueWhite: '#FFFFFF',
};

const TOTAL_SLIDES = 14;
const AUTO_ADVANCE_MS = 6000;
const CURRENT_YEAR = new Date().getFullYear();
const LEFT_TAP_ZONE = 0.3;

// ─── Props ──────────────────────────────────────────────────────
interface WrappedSlidesProps {
  onClose: () => void;
  totalMinutes: number;
  artists: Artist[];
  albums: Album[];
  songs: Song[];
  albumCovers: string[];
  connectionGraph?: { artistInfo: Record<string, any>; pairs: Record<string, Record<string, number>> };
}

// ─── Helpers ────────────────────────────────────────────────────
const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFDMUMxRSIvPjxwYXRoIGQ9Ik0xMzAgNjB2NzBjMCAxMS05IDIwLTIwIDIwcy0yMC05LTIwLTIwIDktMjAgMjAtMjBjNCAwIDcgMSAxMCAzVjcwbC00MCAxMHY2MGMwIDExLTkgMjAtMjAgMjBzLTIwLTktMjAtMjAgOS0yMCAyMC0yMGM0IDAgNyAxIDEwIDNWNjBsNjAtMTV6IiBmaWxsPSIjOEU4RTkzIi8+PC9zdmc+';

// Odometer hook
function useOdometer(target: number, durationMs = 1500): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
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

// Stagger delay helper
const stagger = (i: number, base = 0.2, step = 0.1) => base + i * step;

// ─── ANIMATED SHAPE COMPONENTS ──────────────────────────────────

const FloatingZigzag: React.FC<{ color: string; top: string; left: string; size?: number }> = ({ color, top, left, size = 60 }) => {
  return useMemo(() => (
    <motion.svg
      style={{ position: 'absolute', top, left, width: size, height: size }}
      animate={{ y: [-10, 10, -10], rotate: [0, 15, -15, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path d="M10 10 L30 30 L50 10" stroke={color} strokeWidth="5" fill="none" />
    </motion.svg>
  ), [color, top, left, size]);
};

const PulsingCircle: React.FC<{ color: string; top: string; left: string; size?: number }> = ({ color, top, left, size = 80 }) => {
  return useMemo(() => (
    <motion.div
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        border: `5px solid ${color}`,
        borderRadius: '50%',
      }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
  ), [color, top, left, size]);
};

const RotatingStar: React.FC<{ color: string; top: string; left: string; size?: number }> = ({ color, top, left, size = 50 }) => {
  return useMemo(() => (
    <motion.svg
      style={{ position: 'absolute', top, left, width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
    >
      <polygon points="25,5 30,20 45,20 33,30 38,45 25,35 12,45 17,30 5,20 20,20" fill={color} />
    </motion.svg>
  ), [color, top, left, size]);
};

const BouncingDiamond: React.FC<{ color: string; top: string; left: string; size?: number }> = ({ color, top, left, size = 60 }) => {
  return useMemo(() => (
    <motion.div
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        backgroundColor: color,
        transform: 'rotate(45deg)',
      }}
      animate={{ y: [-15, 15, -15] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    />
  ), [color, top, left, size]);
};

const GlitchSquare: React.FC<{ color: string; top: string; left: string; size?: number }> = ({ color, top, left, size = 70 }) => {
  return useMemo(() => (
    <motion.div
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        border: `6px solid ${color}`,
      }}
      animate={{
        x: [0, -5, 5, 0, 3, -3, 0],
        y: [0, 3, -3, 5, 0, -5, 0],
      }}
      transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
    />
  ), [color, top, left, size]);
};

const WavyLine: React.FC<{ color: string; top: string; left: string; width?: number }> = ({ color, top, left, width = 100 }) => {
  return useMemo(() => (
    <motion.svg
      style={{ position: 'absolute', top, left, width, height: 30 }}
      animate={{ x: [0, 10, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path d={`M0 15 Q${width / 4} 5, ${width / 2} 15 T${width} 15`} stroke={color} strokeWidth="4" fill="none" />
    </motion.svg>
  ), [color, top, left, width]);
};

// ─── BACKGROUND ANIMATION COMPONENTS ────────────────────────────

const AnimatedDots: React.FC<{ color: string }> = ({ color }) => {
  const dots = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    key: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
  })), []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {dots.map((dot) => (
        <motion.div
          key={dot.key}
          style={{
            position: 'absolute',
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: 6,
            height: 6,
            backgroundColor: color,
            borderRadius: '50%',
          }}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: dot.delay,
          }}
        />
      ))}
    </div>
  );
};

const MovingShapes: React.FC<{ color: string }> = ({ color }) => {
  const shapes = useMemo(() => [
    { type: 'circle', size: 40, y: 10, duration: 15 },
    { type: 'square', size: 35, y: 25, duration: 18 },
    { type: 'rounded', size: 50, y: 45, duration: 20 },
    { type: 'circle', size: 30, y: 60, duration: 16 },
    { type: 'square', size: 45, y: 75, duration: 22 },
    { type: 'rounded', size: 38, y: 15, duration: 19 },
    { type: 'circle', size: 42, y: 85, duration: 17 },
    { type: 'square', size: 33, y: 50, duration: 21 },
  ], []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {shapes.map((shape, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: -60,
            top: `${shape.y}%`,
            width: shape.size,
            height: shape.size,
            border: `4px solid ${color}`,
            borderRadius: shape.type === 'circle' ? '50%' : shape.type === 'rounded' ? '12px' : '0',
            opacity: 0.2,
          }}
          animate={{ x: ['0vw', '110vw'] }}
          transition={{ duration: shape.duration, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
};

// ─── TYPOGRAPHY EFFECT COMPONENTS ───────────────────────────────

const GlitchText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div
      className={className}
      style={{
        textShadow: '3px 3px 0 cyan, -3px -3px 0 magenta',
      }}
    >
      {children}
    </div>
  );
};

const RepeatedText: React.FC<{ children: React.ReactNode; count?: number; className?: string }> = ({ children, count = 3, className = '' }) => {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={className}
          style={{
            position: i === count - 1 ? 'relative' : 'absolute',
            top: i * 4,
            left: i * 4,
            opacity: 1 - (i * 0.3),
            zIndex: count - i,
          }}
        >
          {children}
        </div>
      ))}
    </div>
  );
};

// ─── UI COMPONENTS ──────────────────────────────────────────────

const StoryProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '12px 16px' }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: 5,
            backgroundColor: 'rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}
        >
          {i < current && (
            <motion.div
              style={{ width: '100%', height: '100%', backgroundColor: W.trueBlack }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.3 }}
            />
          )}
          {i === current && (
            <motion.div
              style={{ width: '100%', height: '100%', backgroundColor: W.trueBlack }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: 'linear' }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

const CloseButton: React.FC<{ onClick: () => void; color?: string }> = ({ onClick, color = W.trueBlack }) => {
  return (
    <motion.button
      onClick={onClick}
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: W.trueWhite,
        border: `3px solid ${color}`,
        padding: 12,
        cursor: 'pointer',
        zIndex: 50,
        boxShadow: '4px 4px 0px rgba(0,0,0,0.4)',
      }}
      whileHover={{ scale: 1.1, boxShadow: '6px 6px 0px rgba(0,0,0,0.5)' }}
      whileTap={{ scale: 0.95, boxShadow: '2px 2px 0px rgba(0,0,0,0.3)' }}
    >
      <X size={24} color={color} strokeWidth={3} />
    </motion.button>
  );
};

// ─── SLIDE COMPONENTS ───────────────────────────────────────────

const Slide0: React.FC<WrappedSlidesProps> = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.electricYellow, overflow: 'hidden' }}>
      <AnimatedDots color={W.trueBlack} />
      <MovingShapes color={W.trueBlack} />
      
      <FloatingZigzag color={W.electricBlue} top="10%" left="10%" size={80} />
      <PulsingCircle color={W.hotCoral} top="20%" left="70%" size={100} />
      <RotatingStar color={W.deepPurple} top="60%" left="15%" size={70} />
      <BouncingDiamond color={W.vividGreen} top="70%" left="75%" size={80} />
      <GlitchSquare color={W.hotPink} top="40%" left="50%" size={90} />
      <WavyLine color={W.electricBlue} top="85%" left="20%" width={150} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32 }}>
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.5 }}
          style={{
            backgroundColor: W.trueBlack,
            border: `6px solid ${W.trueWhite}`,
            padding: '24px 48px',
            boxShadow: '10px 10px 0px rgba(0,0,0,0.3)',
            transform: 'rotate(-3deg)',
          }}
        >
          <GlitchText>
            <div style={{ fontSize: 72, fontWeight: 900, color: W.electricYellow, lineHeight: 1 }}>
              {CURRENT_YEAR}
            </div>
          </GlitchText>
        </motion.div>

        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{
            marginTop: 40,
            backgroundColor: W.trueWhite,
            border: `5px solid ${W.trueBlack}`,
            padding: '16px 32px',
            boxShadow: '8px 8px 0px rgba(0,0,0,0.3)',
            transform: 'rotate(2deg)',
          }}
        >
          <RepeatedText>
            <div style={{ fontSize: 48, fontWeight: 900, color: W.trueBlack }}>
              WRAPPED
            </div>
          </RepeatedText>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          style={{
            marginTop: 32,
            fontSize: 20,
            fontWeight: 700,
            color: W.trueBlack,
            textTransform: 'uppercase',
            letterSpacing: 3,
          }}
        >
          Your Year in Music
        </motion.div>
      </div>
    </div>
  );
};

const Slide1: React.FC<{ totalMinutes: number }> = ({ totalMinutes }) => {
  const displayMinutes = useOdometer(totalMinutes);
  const hours = Math.floor(displayMinutes / 60);
  const days = Math.floor(hours / 24);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.electricBlue, overflow: 'hidden' }}>
      <AnimatedDots color={W.trueWhite} />
      <MovingShapes color={W.trueWhite} />
      
      <FloatingZigzag color={W.electricYellow} top="5%" left="80%" size={70} />
      <PulsingCircle color={W.hotCoral} top="15%" left="10%" size={90} />
      <RotatingStar color={W.vividGreen} top="75%" left="70%" size={60} />
      <BouncingDiamond color={W.hotPink} top="50%" left="85%" size={75} />
      <GlitchSquare color={W.electricYellow} top="65%" left="15%" size={85} />
      <WavyLine color={W.trueWhite} top="30%" left="40%" width={120} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32 }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          style={{
            backgroundColor: W.trueWhite,
            border: `6px solid ${W.trueBlack}`,
            padding: 48,
            boxShadow: '12px 12px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(-2deg)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 700, color: W.trueBlack, marginBottom: 16, textTransform: 'uppercase' }}>
            You Listened For
          </div>
          <GlitchText>
            <div style={{ fontSize: 96, fontWeight: 900, color: W.electricBlue, lineHeight: 1 }}>
              {displayMinutes.toLocaleString()}
            </div>
          </GlitchText>
          <div style={{ fontSize: 32, fontWeight: 700, color: W.trueBlack, marginTop: 8 }}>
            MINUTES
          </div>
        </motion.div>

        <div style={{ marginTop: 40, display: 'flex', gap: 24 }}>
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{
              backgroundColor: W.electricYellow,
              border: `5px solid ${W.trueBlack}`,
              padding: '16px 24px',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: 40, fontWeight: 900, color: W.trueBlack }}>{hours.toLocaleString()}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: W.trueBlack }}>HOURS</div>
          </motion.div>

          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              backgroundColor: W.hotCoral,
              border: `5px solid ${W.trueBlack}`,
              padding: '16px 24px',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: 40, fontWeight: 900, color: W.trueWhite }}>{days}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: W.trueWhite }}>DAYS</div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const Slide2: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const top3 = artists.slice(0, 3);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.hotCoral, overflow: 'hidden' }}>
      <AnimatedDots color={W.trueWhite} />
      <MovingShapes color={W.trueWhite} />
      
      <FloatingZigzag color={W.electricYellow} top="8%" left="5%" size={75} />
      <PulsingCircle color={W.deepPurple} top="70%" left="80%" size={95} />
      <RotatingStar color={W.vividGreen} top="50%" left="10%" size={65} />
      <BouncingDiamond color={W.electricBlue} top="15%" left="75%" size={70} />
      <GlitchSquare color={W.hotPink} top="80%" left="50%" size={80} />
      <WavyLine color={W.trueWhite} top="40%" left="30%" width={140} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          style={{
            backgroundColor: W.trueBlack,
            border: `6px solid ${W.trueWhite}`,
            padding: '16px 32px',
            marginBottom: 40,
            boxShadow: '8px 8px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(-2deg)',
            alignSelf: 'flex-start',
          }}
        >
          <RepeatedText>
            <div style={{ fontSize: 48, fontWeight: 900, color: W.hotCoral }}>
              TOP ARTISTS
            </div>
          </RepeatedText>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {top3.map((artist, i) => (
            <motion.div
              key={artist.id}
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: stagger(i, 0.3) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                backgroundColor: W.trueWhite,
                border: `5px solid ${W.trueBlack}`,
                padding: 16,
                boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
                transform: `rotate(${i % 2 === 0 ? 1 : -1}deg)`,
              }}
            >
              <div style={{ fontSize: 56, fontWeight: 900, color: W.hotCoral, minWidth: 60 }}>
                #{i + 1}
              </div>
              <div
                style={{
                  width: 80,
                  height: 80,
                  backgroundImage: `url(${artist.image || fallbackImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: `4px solid ${W.trueBlack}`,
                  clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: W.trueBlack }}>
                  {artist.name}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: W.hotCoral }}>
                  {artist.totalListens.toLocaleString()} plays
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Slide3: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const artist = artists[0];
  if (!artist) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.deepPurple, overflow: 'hidden' }}>
      <AnimatedDots color={W.trueWhite} />
      <MovingShapes color={W.trueWhite} />
      
      <FloatingZigzag color={W.electricYellow} top="10%" left="75%" size={80} />
      <PulsingCircle color={W.hotCoral} top="60%" left="10%" size={100} />
      <RotatingStar color={W.vividGreen} top="20%" left="15%" size={70} />
      <BouncingDiamond color={W.hotPink} top="75%" left="70%" size={85} />
      <GlitchSquare color={W.electricBlue} top="40%" left="80%" size={75} />
      <WavyLine color={W.trueWhite} top="50%" left="30%" width={130} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48 }}>
        <motion.div
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.7, type: 'spring' }}
          style={{
            width: 280,
            height: 280,
            backgroundImage: `url(${artist.image || fallbackImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: `8px solid ${W.electricYellow}`,
            boxShadow: '12px 12px 0px rgba(0,0,0,0.5)',
            transform: 'rotate(5deg)',
          }}
        />

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            marginTop: 40,
            backgroundColor: W.trueWhite,
            border: `6px solid ${W.trueBlack}`,
            padding: '24px 40px',
            boxShadow: '10px 10px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(-3deg)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: W.deepPurple, marginBottom: 8, textTransform: 'uppercase' }}>
            Your #1 Artist
          </div>
          <GlitchText>
            <div style={{ fontSize: 48, fontWeight: 900, color: W.trueBlack }}>
              {artist.name}
            </div>
          </GlitchText>
          <div style={{ fontSize: 20, fontWeight: 700, color: W.deepPurple, marginTop: 12 }}>
            {artist.totalListens.toLocaleString()} plays
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Slide4: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const top5 = songs.slice(0, 5);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.vividGreen, overflow: 'hidden' }}>
      <AnimatedDots color={W.trueBlack} />
      <MovingShapes color={W.trueBlack} />
      
      <FloatingZigzag color={W.electricYellow} top="5%" left="10%" size={70} />
      <PulsingCircle color={W.hotCoral} top="50%" left="85%" size={90} />
      <RotatingStar color={W.deepPurple} top="70%" left="15%" size={65} />
      <BouncingDiamond color={W.hotPink} top="20%" left="80%" size={75} />
      <GlitchSquare color={W.electricBlue} top="80%" left="45%" size={80} />
      <WavyLine color={W.trueBlack} top="35%" left="25%" width={120} />

      <div style={{ position: 'relative', zIndex: 10, padding: 40, height: '100%', overflowY: 'auto' }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            backgroundColor: W.trueBlack,
            border: `6px solid ${W.trueWhite}`,
            padding: '16px 32px',
            marginBottom: 32,
            boxShadow: '8px 8px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(2deg)',
            display: 'inline-block',
          }}
        >
          <RepeatedText>
            <div style={{ fontSize: 40, fontWeight: 900, color: W.vividGreen }}>
              TOP SONGS
            </div>
          </RepeatedText>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {top5.map((song, i) => (
            <motion.div
              key={song.id}
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: stagger(i, 0.2) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                backgroundColor: W.trueWhite,
                border: `5px solid ${W.trueBlack}`,
                padding: 12,
                boxShadow: '5px 5px 0px rgba(0,0,0,0.3)',
                transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)`,
              }}
            >
              <div style={{ fontSize: 40, fontWeight: 900, color: W.vividGreen, minWidth: 50 }}>
                {i + 1}
              </div>
              <div
                style={{
                  width: 60,
                  height: 60,
                  backgroundImage: `url(${song.cover || fallbackImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: `4px solid ${W.trueBlack}`,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: W.trueBlack, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {song.title}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: W.vividGreen }}>
                  {song.artist}
                </div>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: W.trueBlack }}>
                {song.listens}×
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Slide5: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const song = songs[0];
  if (!song) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.hotPink, overflow: 'hidden' }}>
      <AnimatedDots color={W.trueWhite} />
      <MovingShapes color={W.trueWhite} />
      
      <FloatingZigzag color={W.electricYellow} top="12%" left="70%" size={75} />
      <PulsingCircle color={W.electricBlue} top="65%" left="15%" size={95} />
      <RotatingStar color={W.vividGreen} top="25%" left="10%" size={70} />
      <BouncingDiamond color={W.deepPurple} top="75%" left="75%" size={80} />
      <GlitchSquare color={W.trueWhite} top="45%" left="85%" size={85} />
      <WavyLine color={W.trueWhite} top="55%" left="35%" width={140} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48 }}>
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: 'spring' }}
          style={{
            width: 300,
            height: 300,
            backgroundImage: `url(${song.cover || fallbackImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: `10px solid ${W.trueBlack}`,
            boxShadow: '15px 15px 0px rgba(0,0,0,0.5)',
            transform: 'rotate(-5deg)',
          }}
        />

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            marginTop: 40,
            backgroundColor: W.trueBlack,
            border: `6px solid ${W.electricYellow}`,
            padding: '24px 40px',
            boxShadow: '10px 10px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(3deg)',
            textAlign: 'center',
            maxWidth: '80%',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: W.hotPink, marginBottom: 12, textTransform: 'uppercase' }}>
            Your #1 Song
          </div>
          <GlitchText>
            <div style={{ fontSize: 36, fontWeight: 900, color: W.trueWhite, marginBottom: 8 }}>
              {song.title}
            </div>
          </GlitchText>
          <div style={{ fontSize: 20, fontWeight: 700, color: W.hotPink }}>
            {song.artist}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: W.trueWhite, marginTop: 12 }}>
            {song.listens} plays
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Slide6: React.FC<{ albums: Album[] }> = ({ albums }) => {
  const top3 = albums.slice(0, 3);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.electricBlue, overflow: 'hidden' }}>
      <AnimatedDots color={W.trueWhite} />
      <MovingShapes color={W.trueWhite} />
      
      <FloatingZigzag color={W.electricYellow} top="8%" left="80%" size={70} />
      <PulsingCircle color={W.hotCoral} top="60%" left="10%" size={100} />
      <RotatingStar color={W.vividGreen} top="25%" left="15%" size={65} />
      <BouncingDiamond color={W.hotPink} top="75%" left="80%" size={75} />
      <GlitchSquare color={W.trueWhite} top="40%" left="50%" size={80} />
      <WavyLine color={W.trueWhite} top="85%" left="30%" width={130} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          style={{
            backgroundColor: W.trueWhite,
            border: `6px solid ${W.trueBlack}`,
            padding: '16px 32px',
            marginBottom: 40,
            boxShadow: '8px 8px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(2deg)',
            alignSelf: 'flex-start',
          }}
        >
          <RepeatedText>
            <div style={{ fontSize: 48, fontWeight: 900, color: W.electricBlue }}>
              TOP ALBUMS
            </div>
          </RepeatedText>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {top3.map((album, i) => (
            <motion.div
              key={album.id}
              initial={{ scale: 0, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: stagger(i, 0.3), type: 'spring' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                backgroundColor: W.trueWhite,
                border: `5px solid ${W.trueBlack}`,
                padding: 16,
                boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
                transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)`,
              }}
            >
              <div
                style={{
                  width: 90,
                  height: 90,
                  backgroundImage: `url(${album.cover || fallbackImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: `5px solid ${W.trueBlack}`,
                  transform: 'rotate(45deg)',
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: W.electricBlue }}>
                  #{i + 1}
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: W.trueBlack }}>
                  {album.title}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: W.electricBlue }}>
                  {album.artist}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Slide7: React.FC<{ albums: Album[] }> = ({ albums }) => {
  const album = albums[0];
  if (!album) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.electricYellow, overflow: 'hidden' }}>
      <AnimatedDots color={W.trueBlack} />
      <MovingShapes color={W.trueBlack} />
      
      <FloatingZigzag color={W.electricBlue} top="10%" left="10%" size={80} />
      <PulsingCircle color={W.hotCoral} top="70%" left="75%" size={95} />
      <RotatingStar color={W.deepPurple} top="30%" left="80%" size={70} />
      <BouncingDiamond color={W.vividGreen} top="60%" left="15%" size={85} />
      <GlitchSquare color={W.hotPink} top="15%" left="50%" size={75} />
      <WavyLine color={W.trueBlack} top="85%" left="40%" width={140} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48 }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
          style={{
            width: 280,
            height: 280,
            backgroundImage: `url(${album.cover || fallbackImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: `8px solid ${W.trueBlack}`,
            boxShadow: '12px 12px 0px rgba(0,0,0,0.5)',
            clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
          }}
        />

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            marginTop: 40,
            backgroundColor: W.trueBlack,
            border: `6px solid ${W.electricBlue}`,
            padding: '24px 40px',
            boxShadow: '10px 10px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(-2deg)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: W.electricYellow, marginBottom: 8, textTransform: 'uppercase' }}>
            Your #1 Album
          </div>
          <GlitchText>
            <div style={{ fontSize: 40, fontWeight: 900, color: W.trueWhite }}>
              {album.title}
            </div>
          </GlitchText>
          <div style={{ fontSize: 20, fontWeight: 700, color: W.electricYellow, marginTop: 8 }}>
            {album.artist}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Slide8: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const genres = artists.flatMap(a => a.genres || []).slice(0, 6);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.hotCoral, overflow: 'hidden' }}>
      <AnimatedDots color={W.trueWhite} />
      <MovingShapes color={W.trueWhite} />
      
      <FloatingZigzag color={W.electricYellow} top="5%" left="75%" size={75} />
      <PulsingCircle color={W.deepPurple} top="65%" left="10%" size={90} />
      <RotatingStar color={W.vividGreen} top="20%" left="15%" size={65} />
      <BouncingDiamond color={W.electricBlue} top="75%" left="80%" size={80} />
      <GlitchSquare color={W.hotPink} top="40%" left="50%" size={85} />
      <WavyLine color={W.trueWhite} top="55%" left="25%" width={120} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            backgroundColor: W.trueBlack,
            border: `6px solid ${W.trueWhite}`,
            padding: '20px 40px',
            marginBottom: 40,
            boxShadow: '10px 10px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(-3deg)',
          }}
        >
          <RepeatedText>
            <div style={{ fontSize: 48, fontWeight: 900, color: W.hotCoral }}>
              YOUR GENRES
            </div>
          </RepeatedText>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 600 }}>
          {genres.map((genre, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: 90 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: stagger(i, 0.2), type: 'spring' }}
              style={{
                backgroundColor: W.trueWhite,
                border: `5px solid ${W.trueBlack}`,
                padding: '20px 24px',
                boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
                transform: `rotate(${i % 2 === 0 ? 2 : -2}deg)`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 900, color: W.trueBlack, textTransform: 'uppercase' }}>
                {genre}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Slide9: React.FC<{ totalMinutes: number }> = ({ totalMinutes }) => {
  const hours = Math.floor(totalMinutes / 60);
  const months = 12;
  const avgPerDay = Math.round(totalMinutes / 365);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.deepPurple, overflow: 'hidden' }}>
      <AnimatedDots color={W.trueWhite} />
      <MovingShapes color={W.trueWhite} />
      
      <FloatingZigzag color={W.electricYellow} top="12%" left="10%" size={70} />
      <PulsingCircle color={W.hotCoral} top="55%" left="80%" size={100} />
      <RotatingStar color={W.vividGreen} top="70%" left="15%" size={65} />
      <BouncingDiamond color={W.hotPink} top="25%" left="75%" size={75} />
      <GlitchSquare color={W.electricBlue} top="80%" left="50%" size={80} />
      <WavyLine color={W.trueWhite} top="40%" left="35%" width={130} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            backgroundColor: W.trueWhite,
            border: `6px solid ${W.trueBlack}`,
            padding: '20px 40px',
            marginBottom: 40,
            boxShadow: '8px 8px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(2deg)',
          }}
        >
          <GlitchText>
            <div style={{ fontSize: 48, fontWeight: 900, color: W.deepPurple }}>
              BY THE NUMBERS
            </div>
          </GlitchText>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%', maxWidth: 500 }}>
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              backgroundColor: W.electricYellow,
              border: `5px solid ${W.trueBlack}`,
              padding: '20px 32px',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: W.trueBlack }}>Total Hours</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: W.trueBlack }}>{hours.toLocaleString()}</div>
          </motion.div>

          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{
              backgroundColor: W.hotCoral,
              border: `5px solid ${W.trueBlack}`,
              padding: '20px 32px',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: W.trueWhite }}>Months Active</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: W.trueWhite }}>{months}</div>
          </motion.div>

          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              backgroundColor: W.vividGreen,
              border: `5px solid ${W.trueBlack}`,
              padding: '20px 32px',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, color: W.trueBlack }}>Avg Per Day</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: W.trueBlack }}>{avgPerDay}m</div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const Slide10: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const topArtist = artists[0];
  if (!topArtist) return null;

  const insight = topArtist.museInsight || `You spent ${topArtist.timeStr || 'countless hours'} listening to ${topArtist.name}. That's dedication!`;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.vividGreen, overflow: 'hidden' }}>
      <AnimatedDots color={W.trueBlack} />
      <MovingShapes color={W.trueBlack} />
      
      <FloatingZigzag color={W.electricYellow} top="8%" left="80%" size={75} />
      <PulsingCircle color={W.hotCoral} top="60%" left="10%" size={95} />
      <RotatingStar color={W.deepPurple} top="25%" left="15%" size={70} />
      <BouncingDiamond color={W.hotPink} top="75%" left="75%" size={80} />
      <GlitchSquare color={W.electricBlue} top="40%" left="85%" size={85} />
      <WavyLine color={W.trueBlack} top="85%" left="30%" width={140} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
          style={{
            width: 200,
            height: 200,
            backgroundImage: `url(${topArtist.image || fallbackImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: `8px solid ${W.trueBlack}`,
            boxShadow: '10px 10px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(-5deg)',
          }}
        />

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            marginTop: 40,
            backgroundColor: W.trueBlack,
            border: `6px solid ${W.trueWhite}`,
            padding: '24px 32px',
            boxShadow: '8px 8px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(2deg)',
            maxWidth: '80%',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: W.vividGreen, marginBottom: 12, textTransform: 'uppercase', textAlign: 'center' }}>
            ✨ Insight ✨
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: W.trueWhite, lineHeight: 1.4, textAlign: 'center' }}>
            {insight}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Slide11: React.FC<{ albumCovers: string[] }> = ({ albumCovers }) => {
  const covers = albumCovers.slice(0, 9);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.electricYellow, overflow: 'hidden' }}>
      <AnimatedDots color={W.trueBlack} />
      <MovingShapes color={W.trueBlack} />
      
      <FloatingZigzag color={W.electricBlue} top="5%" left="5%" size={70} />
      <PulsingCircle color={W.hotCoral} top="70%" left="85%" size={90} />
      <RotatingStar color={W.deepPurple} top="50%" left="90%" size={65} />
      <BouncingDiamond color={W.vividGreen} top="80%" left="10%" size={75} />
      <GlitchSquare color={W.hotPink} top="15%" left="85%" size={80} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          style={{
            backgroundColor: W.trueBlack,
            border: `6px solid ${W.trueWhite}`,
            padding: '20px 40px',
            marginBottom: 40,
            boxShadow: '10px 10px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(-2deg)',
          }}
        >
          <RepeatedText>
            <div style={{ fontSize: 48, fontWeight: 900, color: W.electricYellow }}>
              YOUR COLLAGE
            </div>
          </RepeatedText>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 500 }}>
          {covers.map((cover, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: 180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: stagger(i, 0.1), type: 'spring' }}
              style={{
                width: 140,
                height: 140,
                backgroundImage: `url(${cover || fallbackImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: `5px solid ${W.trueBlack}`,
                boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
                transform: `rotate(${(i % 3) * 2 - 2}deg)`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const Slide12: React.FC<{ connectionGraph?: { artistInfo: Record<string, any>; pairs: Record<string, Record<string, number>> } }> = ({ connectionGraph }) => {
  const artists = connectionGraph ? Object.keys(connectionGraph.artistInfo).slice(0, 6) : [];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.electricBlue, overflow: 'hidden' }}>
      <AnimatedDots color={W.trueWhite} />
      <MovingShapes color={W.trueWhite} />
      
      <FloatingZigzag color={W.electricYellow} top="10%" left="75%" size={80} />
      <PulsingCircle color={W.hotCoral} top="65%" left="15%" size={100} />
      <RotatingStar color={W.vividGreen} top="30%" left="10%" size={70} />
      <BouncingDiamond color={W.hotPink} top="75%" left="80%" size={85} />
      <GlitchSquare color={W.trueWhite} top="45%" left="85%" size={75} />
      <WavyLine color={W.trueWhite} top="20%" left="35%" width={130} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{
            backgroundColor: W.trueWhite,
            border: `6px solid ${W.trueBlack}`,
            padding: '20px 40px',
            marginBottom: 40,
            boxShadow: '8px 8px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(2deg)',
          }}
        >
          <GlitchText>
            <div style={{ fontSize: 48, fontWeight: 900, color: W.electricBlue }}>
              CONNECTIONS
            </div>
          </GlitchText>
        </motion.div>

        {artists.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', maxWidth: 600 }}>
            {artists.map((artist, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: stagger(i, 0.15), type: 'spring' }}
                style={{
                  backgroundColor: W.trueWhite,
                  border: `5px solid ${W.trueBlack}`,
                  padding: '16px 24px',
                  boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
                  transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)`,
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900, color: W.trueBlack }}>
                  {artist}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{
              backgroundColor: W.trueWhite,
              border: `6px solid ${W.trueBlack}`,
              padding: '32px 48px',
              boxShadow: '8px 8px 0px rgba(0,0,0,0.4)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 700, color: W.trueBlack }}>
              Your music taste is eclectic and unique!
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const Slide13: React.FC = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.trueBlack, overflow: 'hidden' }}>
      <AnimatedDots color={W.electricYellow} />
      <MovingShapes color={W.electricYellow} />
      
      <FloatingZigzag color={W.electricYellow} top="10%" left="10%" size={90} />
      <PulsingCircle color={W.hotCoral} top="60%" left="70%" size={110} />
      <RotatingStar color={W.vividGreen} top="25%" left="75%" size={80} />
      <BouncingDiamond color={W.hotPink} top="70%" left="20%" size={95} />
      <GlitchSquare color={W.electricBlue} top="15%" left="60%" size={100} />
      <WavyLine color={W.deepPurple} top="80%" left="40%" width={160} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48 }}>
        <motion.div
          initial={{ scale: 0, rotate: 360 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1, type: 'spring', bounce: 0.6 }}
          style={{
            backgroundColor: W.electricYellow,
            border: `8px solid ${W.hotCoral}`,
            padding: '32px 64px',
            boxShadow: '15px 15px 0px rgba(255, 215, 0, 0.3)',
            transform: 'rotate(-3deg)',
            textAlign: 'center',
          }}
        >
          <GlitchText>
            <div style={{ fontSize: 72, fontWeight: 900, color: W.trueBlack, lineHeight: 1 }}>
              {CURRENT_YEAR}
            </div>
          </GlitchText>
          <div style={{ fontSize: 48, fontWeight: 900, color: W.trueBlack, marginTop: 8 }}>
            WRAPPED
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            marginTop: 48,
            backgroundColor: W.trueWhite,
            border: `6px solid ${W.electricBlue}`,
            padding: '24px 48px',
            boxShadow: '10px 10px 0px rgba(255, 255, 255, 0.2)',
            transform: 'rotate(2deg)',
          }}
        >
          <RepeatedText>
            <div style={{ fontSize: 36, fontWeight: 900, color: W.trueBlack }}>
              THANKS FOR LISTENING
            </div>
          </RepeatedText>
        </motion.div>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.8, type: 'spring' }}
          style={{
            marginTop: 32,
            fontSize: 18,
            fontWeight: 700,
            color: W.electricYellow,
            textTransform: 'uppercase',
            letterSpacing: 2,
          }}
        >
          See you next year! 🎵
        </motion.div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ─────────────────────────────────────────────

export default function WrappedSlides(props: WrappedSlidesProps) {
  const { onClose } = props;
  const [currentSlide, setCurrentSlide] = useState(0);
  const timerRef = useRef<NodeJS.Timeout>();

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (currentSlide < TOTAL_SLIDES - 1) {
      timerRef.current = setTimeout(() => {
        setCurrentSlide((prev) => Math.min(prev + 1, TOTAL_SLIDES - 1));
      }, AUTO_ADVANCE_MS);
    }
  }, [currentSlide]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentSlide, resetTimer]);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const tapZone = rect.width * LEFT_TAP_ZONE;
      if (x < tapZone) {
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      } else {
        setCurrentSlide((prev) => Math.min(prev + 1, TOTAL_SLIDES - 1));
      }
    },
    []
  );

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    if (info.offset.x < -50) {
      setCurrentSlide((prev) => Math.min(prev + 1, TOTAL_SLIDES - 1));
    } else if (info.offset.x > 50) {
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
    }
  }, []);

  const renderSlide = () => {
    switch (currentSlide) {
      case 0: return <Slide0 {...props} />;
      case 1: return <Slide1 totalMinutes={props.totalMinutes} />;
      case 2: return <Slide2 artists={props.artists} />;
      case 3: return <Slide3 artists={props.artists} />;
      case 4: return <Slide4 songs={props.songs} />;
      case 5: return <Slide5 songs={props.songs} />;
      case 6: return <Slide6 albums={props.albums} />;
      case 7: return <Slide7 albums={props.albums} />;
      case 8: return <Slide8 artists={props.artists} />;
      case 9: return <Slide9 totalMinutes={props.totalMinutes} />;
      case 10: return <Slide10 artists={props.artists} />;
      case 11: return <Slide11 albumCovers={props.albumCovers} />;
      case 12: return <Slide12 connectionGraph={props.connectionGraph} />;
      case 13: return <Slide13 />;
      default: return null;
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, backgroundColor: W.trueBlack }}>
      <StoryProgressBar current={currentSlide} total={TOTAL_SLIDES} />
      <CloseButton onClick={onClose} />

      <motion.div
        onClick={handleTap}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        style={{ width: '100%', height: '100%', cursor: 'pointer' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            style={{ width: '100%', height: '100%' }}
          >
            {renderSlide()}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
