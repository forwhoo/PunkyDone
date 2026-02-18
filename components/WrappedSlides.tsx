import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, TrendingUp, Headphones, Music, Disc, Repeat, Flame, Zap, Clock, Sparkles } from 'lucide-react';
import { Artist, Album, Song } from '../types';

// ─── ENHANCED BRUTALIST COLOR PALETTE ────────────────────────────────────
const W = {
  // Core brutalist colors
  electricYellow: '#FFE500',
  electricBlue: '#0047FF',
  hotCoral: '#FF3366',
  vividGreen: '#00FF85',
  deepPurple: '#9D00FF',
  hotPink: '#FF0090',
  neonOrange: '#FF6B00',
  cyberCyan: '#00FFFF',
  acidGreen: '#CCFF00',
  
  // Base colors
  offWhite: '#F5F0E8',
  trueBlack: '#000000',
  trueWhite: '#FFFFFF',
  darkGray: '#1A1A1A',
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

// ─── ENHANCED ANIMATED SHAPE COMPONENTS ──────────────────────────────────

const FloatingZigzag: React.FC<{ color: string; top: string; left: string; size?: number }> = ({ color, top, left, size = 60 }) => {
  return useMemo(() => (
    <motion.svg
      style={{ position: 'absolute', top, left, width: size, height: size }}
      animate={{ 
        y: [-20, 20, -20], 
        rotate: [0, 25, -25, 0],
        x: [-10, 10, -10]
      }}
      transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path d="M10 10 L30 30 L50 10 L70 30 L90 10" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
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
        border: `8px solid ${color}`,
        borderRadius: '50%',
      }}
      animate={{ 
        scale: [1, 1.4, 1], 
        opacity: [0.5, 1, 0.5],
        rotate: [0, 180, 360]
      }}
      transition={{ duration: 3, repeat: Infinity }}
    />
  ), [color, top, left, size]);
};

const RotatingStar: React.FC<{ color: string; top: string; left: string; size?: number }> = ({ color, top, left, size = 50 }) => {
  return useMemo(() => (
    <motion.svg
      style={{ position: 'absolute', top, left, width: size, height: size }}
      animate={{ 
        rotate: 360,
        scale: [1, 1.2, 1]
      }}
      transition={{ 
        rotate: { duration: 10, repeat: Infinity, ease: 'linear' },
        scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
      }}
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
      animate={{ 
        y: [-25, 25, -25],
        rotate: [45, 225, 45]
      }}
      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
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
        border: `8px solid ${color}`,
      }}
      animate={{
        x: [0, -8, 8, 0, 5, -5, 0],
        y: [0, 5, -5, 8, 0, -8, 0],
        rotate: [0, 5, -5, 0]
      }}
      transition={{ duration: 2, repeat: Infinity, repeatDelay: 0.5 }}
    />
  ), [color, top, left, size]);
};

const WavyLine: React.FC<{ color: string; top: string; left: string; width?: number }> = ({ color, top, left, width = 100 }) => {
  return useMemo(() => (
    <motion.svg
      style={{ position: 'absolute', top, left, width, height: 40 }}
      animate={{ 
        x: [0, 15, 0],
        y: [0, -5, 0]
      }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <path d={`M0 20 Q${width / 4} 5, ${width / 2} 20 T${width} 20`} stroke={color} strokeWidth="6" fill="none" strokeLinecap="round" />
    </motion.svg>
  ), [color, top, left, width]);
};

// New enhanced shape components
const CrossShape: React.FC<{ color: string; top: string; left: string; size?: number }> = ({ color, top, left, size = 80 }) => {
  return useMemo(() => (
    <motion.div
      style={{
        position: 'absolute',
        top,
        left,
      }}
      animate={{ 
        rotate: [0, 90, 180, 270, 360],
        scale: [1, 1.1, 1]
      }}
      transition={{ 
        rotate: { duration: 8, repeat: Infinity, ease: 'linear' },
        scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' }
      }}
    >
      <svg width={size} height={size}>
        <rect x={size * 0.35} y={0} width={size * 0.3} height={size} fill={color} />
        <rect x={0} y={size * 0.35} width={size} height={size * 0.3} fill={color} />
      </svg>
    </motion.div>
  ), [color, top, left, size]);
};

const PixelatedSquare: React.FC<{ color: string; top: string; left: string; size?: number }> = ({ color, top, left, size = 60 }) => {
  return useMemo(() => (
    <motion.div
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        backgroundColor: color,
        imageRendering: 'pixelated',
      }}
      animate={{
        scale: [1, 1.3, 1],
        rotate: [0, 90, 180, 270, 360]
      }}
      transition={{ 
        scale: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
        rotate: { duration: 6, repeat: Infinity, ease: 'linear' }
      }}
    />
  ), [color, top, left, size]);
};

const StripePattern: React.FC<{ color: string; top: string; left: string; size?: number }> = ({ color, top, left, size = 100 }) => {
  return useMemo(() => (
    <motion.div
      style={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        background: `repeating-linear-gradient(45deg, ${color}, ${color} 10px, transparent 10px, transparent 20px)`,
      }}
      animate={{
        rotate: [0, 360],
        scale: [1, 1.2, 1]
      }}
      transition={{ 
        rotate: { duration: 10, repeat: Infinity, ease: 'linear' },
        scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
      }}
    />
  ), [color, top, left, size]);
};

// ─── ENHANCED BACKGROUND ANIMATION COMPONENTS ────────────────────────────

const AnimatedDots: React.FC<{ color: string; density?: number }> = ({ color, density = 50 }) => {
  const dots = useMemo(() => Array.from({ length: density }, (_, i) => ({
    key: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
    size: 4 + Math.random() * 8,
  })), [density]);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {dots.map((dot) => (
        <motion.div
          key={dot.key}
          style={{
            position: 'absolute',
            left: `${dot.x}%`,
            top: `${dot.y}%`,
            width: dot.size,
            height: dot.size,
            backgroundColor: color,
            borderRadius: '50%',
          }}
          animate={{
            scale: [1, 2, 1],
            opacity: [0.2, 0.9, 0.2],
            y: [0, -20, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: dot.delay,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
};

const GridPattern: React.FC<{ color: string }> = ({ color }) => {
  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(${color} 2px, transparent 2px),
          linear-gradient(90deg, ${color} 2px, transparent 2px)
        `,
        backgroundSize: '60px 60px',
        opacity: 0.15,
      }}
      animate={{
        x: [0, 60, 0],
        y: [0, 60, 0]
      }}
      transition={{
        duration: 10,
        repeat: Infinity,
        ease: 'linear'
      }}
    />
  );
};

const MovingShapes: React.FC<{ color: string }> = ({ color }) => {
  const shapes = useMemo(() => [
    { type: 'circle', size: 60, y: 10, duration: 20 },
    { type: 'square', size: 50, y: 25, duration: 22 },
    { type: 'rounded', size: 70, y: 45, duration: 25 },
    { type: 'circle', size: 45, y: 60, duration: 18 },
    { type: 'square', size: 65, y: 75, duration: 28 },
    { type: 'rounded', size: 55, y: 15, duration: 23 },
    { type: 'circle', size: 58, y: 85, duration: 21 },
    { type: 'square', size: 48, y: 50, duration: 26 },
    { type: 'rounded', size: 62, y: 35, duration: 24 },
    { type: 'circle', size: 52, y: 5, duration: 19 },
  ], []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {shapes.map((shape, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: -80,
            top: `${shape.y}%`,
            width: shape.size,
            height: shape.size,
            border: `5px solid ${color}`,
            borderRadius: shape.type === 'circle' ? '50%' : shape.type === 'rounded' ? '16px' : '0',
            opacity: 0.3,
          }}
          animate={{ x: ['0vw', '110vw'] }}
          transition={{ duration: shape.duration, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
};

const DiagonalStripes: React.FC<{ color: string; direction?: 'left' | 'right' }> = ({ color, direction = 'right' }) => {
  const angle = direction === 'right' ? '45deg' : '-45deg';
  return (
    <motion.div
      style={{
        position: 'absolute',
        inset: 0,
        background: `repeating-linear-gradient(
          ${angle},
          transparent,
          transparent 30px,
          ${color} 30px,
          ${color} 35px
        )`,
        opacity: 0.1,
      }}
      animate={{
        x: direction === 'right' ? [0, 50, 0] : [0, -50, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'linear'
      }}
    />
  );
};

const FloatingBlobs: React.FC<{ color: string }> = ({ color }) => {
  const blobs = useMemo(() => [
    { x: 10, y: 20, scale: 1.5, duration: 15 },
    { x: 70, y: 60, scale: 1.2, duration: 18 },
    { x: 30, y: 80, scale: 1.8, duration: 20 },
    { x: 85, y: 15, scale: 1.3, duration: 16 },
  ], []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: `${blob.x}%`,
            top: `${blob.y}%`,
            width: 150 * blob.scale,
            height: 150 * blob.scale,
            backgroundColor: color,
            borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%',
            opacity: 0.15,
            filter: 'blur(40px)',
          }}
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -40, 30, 0],
            scale: [1, 1.1, 0.9, 1],
            rotate: [0, 90, 180, 270, 360]
          }}
          transition={{
            duration: blob.duration,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
      ))}
    </div>
  );
};

// ─── ENHANCED TYPOGRAPHY EFFECT COMPONENTS ───────────────────────────────

const GlitchText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <motion.div
      className={className}
      style={{
        textShadow: '4px 4px 0 cyan, -4px -4px 0 magenta, 2px -2px 0 yellow',
      }}
      animate={{
        textShadow: [
          '4px 4px 0 cyan, -4px -4px 0 magenta, 2px -2px 0 yellow',
          '5px 3px 0 cyan, -3px -5px 0 magenta, 3px -3px 0 yellow',
          '3px 5px 0 cyan, -5px -3px 0 magenta, 2px -4px 0 yellow',
          '4px 4px 0 cyan, -4px -4px 0 magenta, 2px -2px 0 yellow',
        ]
      }}
      transition={{ duration: 0.3, repeat: Infinity, repeatType: 'mirror' }}
    >
      {children}
    </motion.div>
  );
};

const StretchText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <motion.div
      className={className}
      animate={{
        scaleX: [1, 1.1, 1],
        scaleY: [1, 0.95, 1]
      }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
};

const WarpText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <motion.div
      className={className}
      animate={{
        rotateX: [0, 5, -5, 0],
        rotateY: [0, -5, 5, 0]
      }}
      style={{ perspective: '1000px' }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
};

const RepeatedText: React.FC<{ children: React.ReactNode; count?: number; className?: string }> = ({ children, count = 4, className = '' }) => {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={className}
          style={{
            position: i === count - 1 ? 'relative' : 'absolute',
            top: i * 5,
            left: i * 5,
            opacity: 1 - (i * 0.25),
            zIndex: count - i,
          }}
          animate={{
            x: [0, 2, 0],
            y: [0, -2, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut'
          }}
        >
          {children}
        </motion.div>
      ))}
    </div>
  );
};

const PixelText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <motion.div
      className={className}
      style={{
        imageRendering: 'pixelated',
        filter: 'contrast(1.2)',
      }}
      animate={{
        filter: ['contrast(1.2)', 'contrast(1.5)', 'contrast(1.2)']
      }}
      transition={{ duration: 1.5, repeat: Infinity }}
    >
      {children}
    </motion.div>
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
      {/* Enhanced layered backgrounds */}
      <GridPattern color={W.trueWhite} />
      <AnimatedDots color={W.trueWhite} density={60} />
      <MovingShapes color={W.trueWhite} />
      <DiagonalStripes color={W.trueWhite} direction="right" />
      
      {/* More dynamic shapes - at least 8 animated elements */}
      <FloatingZigzag color={W.electricYellow} top="5%" left="80%" size={90} />
      <PulsingCircle color={W.hotCoral} top="15%" left="10%" size={110} />
      <RotatingStar color={W.vividGreen} top="75%" left="70%" size={75} />
      <BouncingDiamond color={W.hotPink} top="50%" left="85%" size={85} />
      <GlitchSquare color={W.electricYellow} top="65%" left="15%" size={95} />
      <WavyLine color={W.trueWhite} top="30%" left="40%" width={140} />
      <CrossShape color={W.neonOrange} top="10%" left="45%" size={90} />
      <PixelatedSquare color={W.cyberCyan} top="80%" left="50%" size={70} />
      <StripePattern color={W.acidGreen} top="35%" left="5%" size={120} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32 }}>
        {/* Main stat card with enhanced effects */}
        <motion.div
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.7, type: 'spring', bounce: 0.4 }}
          style={{
            backgroundColor: W.trueWhite,
            border: `8px solid ${W.trueBlack}`,
            padding: 56,
            boxShadow: '16px 16px 0px rgba(0,0,0,0.5)',
            transform: 'rotate(-3deg)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* Decorative corner elements */}
          <motion.div 
            style={{
              position: 'absolute',
              top: -10,
              left: -10,
              width: 30,
              height: 30,
              backgroundColor: W.hotCoral,
              border: `3px solid ${W.trueBlack}`,
            }}
            animate={{ rotate: [0, 90, 180, 270, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              bottom: -10,
              right: -10,
              width: 30,
              height: 30,
              backgroundColor: W.vividGreen,
              border: `3px solid ${W.trueBlack}`,
              borderRadius: '50%',
            }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />

          <StretchText>
            <div style={{ fontSize: 28, fontWeight: 800, color: W.trueBlack, marginBottom: 20, textTransform: 'uppercase', letterSpacing: '2px' }}>
              You Listened For
            </div>
          </StretchText>
          <GlitchText>
            <div style={{ fontSize: 110, fontWeight: 900, color: W.electricBlue, lineHeight: 0.9, textShadow: '6px 6px 0px rgba(0,0,0,0.1)' }}>
              {displayMinutes.toLocaleString()}
            </div>
          </GlitchText>
          <WarpText>
            <div style={{ fontSize: 38, fontWeight: 900, color: W.trueBlack, marginTop: 12, letterSpacing: '4px' }}>
              MINUTES
            </div>
          </WarpText>
        </motion.div>

        {/* Enhanced stat cards with more visual interest */}
        <div style={{ marginTop: 48, display: 'flex', gap: 28 }}>
          <motion.div
            initial={{ y: 80, opacity: 0, rotate: -10 }}
            animate={{ y: 0, opacity: 1, rotate: 2 }}
            transition={{ delay: 0.3, type: 'spring' }}
            style={{
              backgroundColor: W.electricYellow,
              border: `6px solid ${W.trueBlack}`,
              padding: '20px 32px',
              boxShadow: '8px 8px 0px rgba(0,0,0,0.4)',
              position: 'relative',
            }}
          >
            <motion.div 
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                width: 20,
                height: 20,
                backgroundColor: W.hotPink,
                border: `2px solid ${W.trueBlack}`,
                transform: 'rotate(45deg)',
              }}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <PixelText>
              <div style={{ fontSize: 48, fontWeight: 900, color: W.trueBlack, textShadow: '3px 3px 0px rgba(255,255,255,0.3)' }}>
                {hours.toLocaleString()}
              </div>
            </PixelText>
            <div style={{ fontSize: 16, fontWeight: 800, color: W.trueBlack, letterSpacing: '2px' }}>HOURS</div>
          </motion.div>

          <motion.div
            initial={{ y: 80, opacity: 0, rotate: 10 }}
            animate={{ y: 0, opacity: 1, rotate: -2 }}
            transition={{ delay: 0.5, type: 'spring' }}
            style={{
              backgroundColor: W.hotCoral,
              border: `6px solid ${W.trueBlack}`,
              padding: '20px 32px',
              boxShadow: '8px 8px 0px rgba(0,0,0,0.4)',
              position: 'relative',
            }}
          >
            <motion.div 
              style={{
                position: 'absolute',
                top: -8,
                left: -8,
                width: 20,
                height: 20,
                backgroundColor: W.cyberCyan,
                border: `2px solid ${W.trueBlack}`,
                borderRadius: '50%',
              }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
            <StretchText>
              <div style={{ fontSize: 48, fontWeight: 900, color: W.trueWhite, textShadow: '3px 3px 0px rgba(0,0,0,0.3)' }}>
                {days}
              </div>
            </StretchText>
            <div style={{ fontSize: 16, fontWeight: 800, color: W.trueWhite, letterSpacing: '2px' }}>DAYS</div>
          </motion.div>
        </div>

        {/* Additional decorative element */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          style={{
            marginTop: 32,
            backgroundColor: W.deepPurple,
            border: `4px solid ${W.trueBlack}`,
            padding: '10px 24px',
            boxShadow: '5px 5px 0px rgba(0,0,0,0.3)',
            transform: 'rotate(1deg)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: W.trueWhite, letterSpacing: '1px' }}>
            🎵 YOUR MUSIC STATS
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Slide2: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const top3 = artists.slice(0, 3);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.hotCoral, overflow: 'hidden' }}>
      {/* Enhanced backgrounds */}
      <FloatingBlobs color={W.trueBlack} />
      <AnimatedDots color={W.trueWhite} density={55} />
      <MovingShapes color={W.trueWhite} />
      <GridPattern color={W.trueBlack} />
      
      {/* More dynamic shapes */}
      <FloatingZigzag color={W.electricYellow} top="8%" left="5%" size={85} />
      <PulsingCircle color={W.deepPurple} top="70%" left="80%" size={105} />
      <RotatingStar color={W.vividGreen} top="50%" left="10%" size={75} />
      <BouncingDiamond color={W.electricBlue} top="15%" left="75%" size={80} />
      <GlitchSquare color={W.hotPink} top="80%" left="50%" size={90} />
      <WavyLine color={W.trueWhite} top="40%" left="30%" width={160} />
      <CrossShape color={W.cyberCyan} top="25%" left="85%" size={85} />
      <PixelatedSquare color={W.neonOrange} top="5%" left="40%" size={65} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <motion.div
          initial={{ x: -150, opacity: 0, rotate: -20 }}
          animate={{ x: 0, opacity: 1, rotate: -3 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          style={{
            backgroundColor: W.trueBlack,
            border: `8px solid ${W.trueWhite}`,
            padding: '20px 40px',
            marginBottom: 48,
            boxShadow: '12px 12px 0px rgba(0,0,0,0.5)',
            alignSelf: 'flex-start',
            position: 'relative',
          }}
        >
          {/* Decorative elements on header */}
          <motion.div
            style={{
              position: 'absolute',
              top: -12,
              right: -12,
              width: 25,
              height: 25,
              backgroundColor: W.electricYellow,
              border: `3px solid ${W.trueBlack}`,
              transform: 'rotate(45deg)',
            }}
            animate={{ rotate: [45, 225, 45] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <RepeatedText count={5}>
            <div style={{ fontSize: 56, fontWeight: 900, color: W.hotCoral, letterSpacing: '3px' }}>
              TOP ARTISTS
            </div>
          </RepeatedText>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {top3.map((artist, i) => (
            <motion.div
              key={artist.id}
              initial={{ x: 150, opacity: 0, rotate: 20 }}
              animate={{ x: 0, opacity: 1, rotate: i % 2 === 0 ? 2 : -2 }}
              transition={{ delay: stagger(i, 0.3), type: 'spring', bounce: 0.4 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 28,
                backgroundColor: W.trueWhite,
                border: `7px solid ${W.trueBlack}`,
                padding: 20,
                boxShadow: '10px 10px 0px rgba(0,0,0,0.4)',
                position: 'relative',
                overflow: 'visible',
              }}
            >
              {/* Rank badge with animation */}
              <motion.div
                style={{
                  position: 'relative',
                  minWidth: 70,
                }}
                animate={{
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              >
                <GlitchText>
                  <div style={{ fontSize: 64, fontWeight: 900, color: W.hotCoral, textShadow: '4px 4px 0px rgba(0,0,0,0.2)' }}>
                    #{i + 1}
                  </div>
                </GlitchText>
              </motion.div>

              {/* Artist image with enhanced styling */}
              <motion.div
                style={{
                  width: 90,
                  height: 90,
                  backgroundImage: `url(${artist.image || fallbackImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: `5px solid ${W.trueBlack}`,
                  clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
                  position: 'relative',
                }}
                animate={{
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              >
                {/* Decorative corner element */}
                <motion.div
                  style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    width: 18,
                    height: 18,
                    backgroundColor: i === 0 ? W.electricYellow : i === 1 ? W.vividGreen : W.deepPurple,
                    border: `2px solid ${W.trueBlack}`,
                    borderRadius: '50%',
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                />
              </motion.div>

              {/* Artist info */}
              <div style={{ flex: 1 }}>
                <StretchText>
                  <div style={{ fontSize: 32, fontWeight: 900, color: W.trueBlack, marginBottom: 4 }}>
                    {artist.name}
                  </div>
                </StretchText>
                <div style={{ 
                  fontSize: 18, 
                  fontWeight: 800, 
                  color: W.hotCoral, 
                  backgroundColor: W.electricYellow,
                  padding: '4px 12px',
                  display: 'inline-block',
                  border: `2px solid ${W.trueBlack}`,
                  boxShadow: '3px 3px 0px rgba(0,0,0,0.2)'
                }}>
                  {artist.totalListens.toLocaleString()} plays
                </div>
              </div>

              {/* Decorative shape on card */}
              <motion.div
                style={{
                  position: 'absolute',
                  bottom: -10,
                  right: -10,
                  width: 30,
                  height: 30,
                  backgroundColor: i === 0 ? W.deepPurple : i === 1 ? W.hotPink : W.electricBlue,
                  border: `3px solid ${W.trueBlack}`,
                  transform: 'rotate(45deg)',
                }}
                animate={{
                  rotate: [45, 135, 225, 315, 45],
                }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Additional decorative element */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          style={{
            marginTop: 40,
            backgroundColor: W.electricYellow,
            border: `5px solid ${W.trueBlack}`,
            padding: '12px 24px',
            boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
            alignSelf: 'center',
            transform: 'rotate(-1deg)',
          }}
        >
          <PixelText>
            <div style={{ fontSize: 16, fontWeight: 800, color: W.trueBlack, letterSpacing: '2px' }}>
              ⭐ YOUR MUSIC HEROES
            </div>
          </PixelText>
        </motion.div>
      </div>
    </div>
  );
};

const Slide3: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const artist = artists[0];
  if (!artist) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.deepPurple, overflow: 'hidden' }}>
      {/* Enhanced backgrounds */}
      <DiagonalStripes color={W.trueWhite} direction="left" />
      <AnimatedDots color={W.trueWhite} density={50} />
      <MovingShapes color={W.trueWhite} />
      <FloatingBlobs color={W.hotPink} />
      
      {/* More dynamic shapes */}
      <FloatingZigzag color={W.electricYellow} top="10%" left="75%" size={90} />
      <PulsingCircle color={W.hotCoral} top="60%" left="10%" size={110} />
      <RotatingStar color={W.vividGreen} top="20%" left="15%" size={80} />
      <BouncingDiamond color={W.hotPink} top="75%" left="70%" size={95} />
      <GlitchSquare color={W.electricBlue} top="40%" left="80%" size={85} />
      <WavyLine color={W.trueWhite} top="50%" left="30%" width={150} />
      <CrossShape color={W.cyberCyan} top="5%" left="45%" size={85} />
      <StripePattern color={W.neonOrange} top="85%" left="50%" size={110} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48 }}>
        {/* Artist image with enhanced styling */}
        <motion.div
          initial={{ scale: 0, rotate: 360 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, type: 'spring', bounce: 0.5 }}
          style={{
            position: 'relative',
            width: 300,
            height: 300,
          }}
        >
          <motion.div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url(${artist.image || fallbackImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: `10px solid ${W.electricYellow}`,
              boxShadow: '16px 16px 0px rgba(0,0,0,0.6)',
              transform: 'rotate(5deg)',
            }}
            animate={{
              rotate: [5, 8, 2, 5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          {/* Decorative corner elements */}
          <motion.div
            style={{
              position: 'absolute',
              top: -15,
              left: -15,
              width: 40,
              height: 40,
              backgroundColor: W.hotCoral,
              border: `5px solid ${W.trueBlack}`,
              borderRadius: '50%',
            }}
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 360],
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity },
              rotate: { duration: 6, repeat: Infinity, ease: 'linear' },
            }}
          />
          <motion.div
            style={{
              position: 'absolute',
              top: -15,
              right: -15,
              width: 40,
              height: 40,
              backgroundColor: W.vividGreen,
              border: `5px solid ${W.trueBlack}`,
              transform: 'rotate(45deg)',
            }}
            animate={{
              rotate: [45, 135, 225, 315, 45],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          <motion.div
            style={{
              position: 'absolute',
              bottom: -15,
              left: -15,
              width: 40,
              height: 40,
              backgroundColor: W.cyberCyan,
              border: `5px solid ${W.trueBlack}`,
              transform: 'rotate(45deg)',
            }}
            animate={{
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
            }}
          />
          <motion.div
            style={{
              position: 'absolute',
              bottom: -15,
              right: -15,
              width: 40,
              height: 40,
              backgroundColor: W.hotPink,
              border: `5px solid ${W.trueBlack}`,
            }}
            animate={{
              rotate: [0, 90, 180, 270, 360],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </motion.div>

        {/* Artist name card */}
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', bounce: 0.6 }}
          style={{
            marginTop: 48,
            backgroundColor: W.trueWhite,
            border: `8px solid ${W.trueBlack}`,
            padding: '28px 48px',
            boxShadow: '12px 12px 0px rgba(0,0,0,0.5)',
            transform: 'rotate(-3deg)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* Badge */}
          <motion.div
            style={{
              position: 'absolute',
              top: -20,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: W.electricYellow,
              border: `4px solid ${W.trueBlack}`,
              padding: '8px 20px',
              boxShadow: '4px 4px 0px rgba(0,0,0,0.3)',
            }}
            animate={{
              y: [0, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 900, color: W.trueBlack, textTransform: 'uppercase', letterSpacing: '2px' }}>
              👑 Your #1 Artist
            </div>
          </motion.div>

          <div style={{ marginTop: 16 }}>
            <GlitchText>
              <div style={{ fontSize: 52, fontWeight: 900, color: W.trueBlack, lineHeight: 1.1 }}>
                {artist.name}
              </div>
            </GlitchText>
          </div>
          
          <motion.div
            style={{
              marginTop: 16,
              backgroundColor: W.deepPurple,
              border: `3px solid ${W.trueBlack}`,
              padding: '10px 24px',
              display: 'inline-block',
              boxShadow: '4px 4px 0px rgba(0,0,0,0.3)',
            }}
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            <StretchText>
              <div style={{ fontSize: 24, fontWeight: 900, color: W.trueWhite }}>
                {artist.totalListens.toLocaleString()} plays
              </div>
            </StretchText>
          </motion.div>
        </motion.div>

        {/* Additional decorative element */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          style={{
            marginTop: 28,
            backgroundColor: W.hotCoral,
            border: `4px solid ${W.trueBlack}`,
            padding: '8px 20px',
            boxShadow: '5px 5px 0px rgba(0,0,0,0.3)',
            transform: 'rotate(2deg)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: W.trueWhite, letterSpacing: '1px' }}>
            🎸 LEGEND STATUS
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
      {/* Enhanced backgrounds */}
      <GridPattern color={W.trueBlack} />
      <AnimatedDots color={W.trueBlack} density={55} />
      <MovingShapes color={W.trueBlack} />
      <DiagonalStripes color={W.trueBlack} direction="right" />
      
      {/* More dynamic shapes */}
      <FloatingZigzag color={W.electricYellow} top="5%" left="10%" size={80} />
      <PulsingCircle color={W.hotCoral} top="50%" left="85%" size={100} />
      <RotatingStar color={W.deepPurple} top="70%" left="15%" size={75} />
      <BouncingDiamond color={W.hotPink} top="20%" left="80%" size={85} />
      <GlitchSquare color={W.electricBlue} top="80%" left="45%" size={90} />
      <WavyLine color={W.trueBlack} top="35%" left="25%" width={140} />
      <CrossShape color={W.neonOrange} top="10%" left="50%" size={90} />
      <PixelatedSquare color={W.cyberCyan} top="60%" left="5%" size={70} />

      <div style={{ position: 'relative', zIndex: 10, padding: 44, height: '100%', overflowY: 'auto' }}>
        {/* Header */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 2 }}
          transition={{ type: 'spring', bounce: 0.6 }}
          style={{
            backgroundColor: W.trueBlack,
            border: `7px solid ${W.trueWhite}`,
            padding: '20px 40px',
            marginBottom: 40,
            boxShadow: '10px 10px 0px rgba(0,0,0,0.5)',
            display: 'inline-block',
            position: 'relative',
          }}
        >
          {/* Decorative element on header */}
          <motion.div
            style={{
              position: 'absolute',
              top: -12,
              right: -12,
              width: 28,
              height: 28,
              backgroundColor: W.hotCoral,
              border: `3px solid ${W.trueBlack}`,
              borderRadius: '50%',
            }}
            animate={{
              scale: [1, 1.5, 1],
              rotate: [0, 360],
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity },
              rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
            }}
          />
          <RepeatedText count={5}>
            <div style={{ fontSize: 48, fontWeight: 900, color: W.vividGreen, letterSpacing: '2px' }}>
              TOP SONGS
            </div>
          </RepeatedText>
        </motion.div>

        {/* Songs list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {top5.map((song, i) => (
            <motion.div
              key={song.id}
              initial={{ x: -150, opacity: 0, rotate: -15 }}
              animate={{ x: 0, opacity: 1, rotate: i % 2 === 0 ? -1 : 1 }}
              transition={{ delay: stagger(i, 0.15), type: 'spring', bounce: 0.4 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                backgroundColor: W.trueWhite,
                border: `6px solid ${W.trueBlack}`,
                padding: 16,
                boxShadow: '7px 7px 0px rgba(0,0,0,0.4)',
                position: 'relative',
                overflow: 'visible',
              }}
            >
              {/* Rank badge */}
              <motion.div
                style={{
                  minWidth: 65,
                  height: 65,
                  backgroundColor: i === 0 ? W.electricYellow : i === 1 ? W.hotCoral : i === 2 ? W.deepPurple : W.hotPink,
                  border: `4px solid ${W.trueBlack}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '4px 4px 0px rgba(0,0,0,0.3)',
                  transform: 'rotate(-5deg)',
                }}
                animate={{
                  rotate: [-5, 0, -5],
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              >
                <GlitchText>
                  <div style={{ fontSize: 36, fontWeight: 900, color: W.trueBlack }}>
                    {i + 1}
                  </div>
                </GlitchText>
              </motion.div>

              {/* Album cover */}
              <motion.div
                style={{
                  width: 70,
                  height: 70,
                  backgroundImage: `url(${song.cover || fallbackImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: `5px solid ${W.trueBlack}`,
                  position: 'relative',
                }}
                animate={{
                  rotate: [0, 3, -3, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              >
                {/* Corner decoration */}
                <motion.div
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    width: 15,
                    height: 15,
                    backgroundColor: i < 3 ? W.electricYellow : W.cyberCyan,
                    border: `2px solid ${W.trueBlack}`,
                    transform: 'rotate(45deg)',
                  }}
                  animate={{
                    scale: [1, 1.3, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                  }}
                />
              </motion.div>

              {/* Song info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <StretchText>
                  <div style={{ 
                    fontSize: 24, 
                    fontWeight: 900, 
                    color: W.trueBlack, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    marginBottom: 4
                  }}>
                    {song.title}
                  </div>
                </StretchText>
                <div style={{ 
                  fontSize: 16, 
                  fontWeight: 800, 
                  color: W.vividGreen,
                  backgroundColor: W.trueBlack,
                  padding: '4px 12px',
                  display: 'inline-block',
                  border: `2px solid ${W.trueBlack}`,
                  boxShadow: '2px 2px 0px rgba(0,0,0,0.2)'
                }}>
                  {song.artist}
                </div>
              </div>

              {/* Play count badge */}
              <motion.div
                style={{
                  backgroundColor: W.trueBlack,
                  border: `3px solid ${W.trueBlack}`,
                  padding: '8px 16px',
                  boxShadow: '3px 3px 0px rgba(0,0,0,0.3)',
                  transform: 'rotate(3deg)',
                }}
                animate={{
                  y: [0, -3, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.15,
                }}
              >
                <PixelText>
                  <div style={{ fontSize: 14, fontWeight: 800, color: W.vividGreen, whiteSpace: 'nowrap' }}>
                    {song.plays?.toLocaleString() || 0} 🎵
                  </div>
                </PixelText>
              </motion.div>

              {/* Decorative corner element */}
              <motion.div
                style={{
                  position: 'absolute',
                  bottom: -8,
                  right: -8,
                  width: 25,
                  height: 25,
                  backgroundColor: i % 2 === 0 ? W.hotPink : W.electricBlue,
                  border: `3px solid ${W.trueBlack}`,
                  borderRadius: '50%',
                }}
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* Bottom decorative element */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          style={{
            marginTop: 32,
            backgroundColor: W.electricYellow,
            border: `5px solid ${W.trueBlack}`,
            padding: '12px 28px',
            boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
            display: 'inline-block',
            transform: 'rotate(-2deg)',
          }}
        >
          <WarpText>
            <div style={{ fontSize: 16, fontWeight: 800, color: W.trueBlack, letterSpacing: '2px' }}>
              🎧 YOUR SOUNDTRACK
            </div>
          </WarpText>
        </motion.div>
      </div>
    </div>
  );
};

const Slide5: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const song = songs[0];
  if (!song) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.hotPink, overflow: 'hidden' }}>
      {/* Enhanced backgrounds */}
      <FloatingBlobs color={W.deepPurple} />
      <AnimatedDots color={W.trueWhite} density={60} />
      <MovingShapes color={W.trueWhite} />
      <DiagonalStripes color={W.trueWhite} direction="left" />
      
      {/* More dynamic shapes */}
      <FloatingZigzag color={W.electricYellow} top="12%" left="70%" size={85} />
      <PulsingCircle color={W.electricBlue} top="65%" left="15%" size={105} />
      <RotatingStar color={W.vividGreen} top="25%" left="10%" size={80} />
      <BouncingDiamond color={W.deepPurple} top="75%" left="75%" size={90} />
      <GlitchSquare color={W.trueWhite} top="45%" left="85%" size={95} />
      <WavyLine color={W.trueWhite} top="55%" left="35%" width={160} />
      <CrossShape color={W.cyberCyan} top="5%" left="40%" size={90} />
      <StripePattern color={W.neonOrange} top="80%" left="45%" size={120} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48 }}>
        {/* Album cover with enhanced styling */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, type: 'spring', bounce: 0.5 }}
          style={{
            position: 'relative',
            width: 320,
            height: 320,
          }}
        >
          <motion.div
            style={{
              width: '100%',
              height: '100%',
              backgroundImage: `url(${song.cover || fallbackImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: `12px solid ${W.trueBlack}`,
              boxShadow: '18px 18px 0px rgba(0,0,0,0.6)',
              transform: 'rotate(-5deg)',
            }}
            animate={{
              rotate: [-5, -2, -8, -5],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          
          {/* Enhanced corner decorations */}
          <motion.div
            style={{
              position: 'absolute',
              top: -18,
              left: -18,
              width: 45,
              height: 45,
              backgroundColor: W.electricYellow,
              border: `5px solid ${W.trueBlack}`,
              transform: 'rotate(45deg)',
            }}
            animate={{
              rotate: [45, 225, 45],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
            }}
          />
          <motion.div
            style={{
              position: 'absolute',
              top: -18,
              right: -18,
              width: 45,
              height: 45,
              backgroundColor: W.vividGreen,
              border: `5px solid ${W.trueBlack}`,
              borderRadius: '50%',
            }}
            animate={{
              scale: [1, 1.4, 1],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
            }}
          />
          <motion.div
            style={{
              position: 'absolute',
              bottom: -18,
              left: -18,
              width: 45,
              height: 45,
              backgroundColor: W.cyberCyan,
              border: `5px solid ${W.trueBlack}`,
            }}
            animate={{
              rotate: [0, 90, 180, 270, 360],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
          <motion.div
            style={{
              position: 'absolute',
              bottom: -18,
              right: -18,
              width: 45,
              height: 45,
              backgroundColor: W.electricBlue,
              border: `5px solid ${W.trueBlack}`,
              borderRadius: '50%',
            }}
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 360],
            }}
            transition={{
              scale: { duration: 2, repeat: Infinity },
              rotate: { duration: 4, repeat: Infinity, ease: 'linear' },
            }}
          />
        </motion.div>

        {/* Song info card */}
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.5 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', bounce: 0.5 }}
          style={{
            marginTop: 48,
            backgroundColor: W.trueBlack,
            border: `8px solid ${W.electricYellow}`,
            padding: '32px 48px',
            boxShadow: '14px 14px 0px rgba(0,0,0,0.5)',
            transform: 'rotate(3deg)',
            textAlign: 'center',
            maxWidth: '85%',
            position: 'relative',
          }}
        >
          {/* Badge */}
          <motion.div
            style={{
              position: 'absolute',
              top: -22,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: W.hotPink,
              border: `5px solid ${W.trueBlack}`,
              padding: '10px 24px',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.4)',
            }}
            animate={{
              y: [0, -6, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900, color: W.trueWhite, textTransform: 'uppercase', letterSpacing: '2px' }}>
              🎵 Your #1 Song
            </div>
          </motion.div>

          <div style={{ marginTop: 18 }}>
            <GlitchText>
              <div style={{ fontSize: 42, fontWeight: 900, color: W.trueWhite, marginBottom: 12, lineHeight: 1.1 }}>
                {song.title}
              </div>
            </GlitchText>
          </div>
          
          <StretchText>
            <div style={{ fontSize: 24, fontWeight: 800, color: W.hotPink, marginBottom: 16 }}>
              {song.artist}
            </div>
          </StretchText>

          <motion.div
            style={{
              backgroundColor: W.electricYellow,
              border: `3px solid ${W.trueBlack}`,
              padding: '10px 24px',
              display: 'inline-block',
              boxShadow: '4px 4px 0px rgba(0,0,0,0.3)',
            }}
            animate={{
              scale: [1, 1.08, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
            }}
          >
            <WarpText>
              <div style={{ fontSize: 22, fontWeight: 900, color: W.trueBlack }}>
                {song.listens} plays
              </div>
            </WarpText>
          </motion.div>
        </motion.div>

        {/* Additional decoration */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
          style={{
            marginTop: 32,
            backgroundColor: W.deepPurple,
            border: `4px solid ${W.trueBlack}`,
            padding: '10px 24px',
            boxShadow: '5px 5px 0px rgba(0,0,0,0.3)',
            transform: 'rotate(-2deg)',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 800, color: W.trueWhite, letterSpacing: '1px' }}>
            🔥 ON REPEAT
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Slide6: React.FC<{ albums: Album[] }> = ({ albums }) => {
  const top3 = albums.slice(0, 3);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.hotPink, overflow: 'hidden' }}>
      {/* Enhanced layered backgrounds */}
      <GridPattern color={W.trueWhite} />
      <AnimatedDots color={W.trueWhite} density={65} />
      <MovingShapes color={W.trueWhite} />
      <DiagonalStripes color={W.trueWhite} direction="left" />
      <FloatingBlobs color={W.trueWhite} />
      
      {/* 8+ animated shape components */}
      <FloatingZigzag color={W.electricYellow} top="8%" left="85%" size={85} />
      <PulsingCircle color={W.cyberCyan} top="60%" left="8%" size={105} />
      <RotatingStar color={W.vividGreen} top="25%" left="12%" size={70} />
      <BouncingDiamond color={W.neonOrange} top="78%" left="82%" size={80} />
      <GlitchSquare color={W.trueWhite} top="42%" left="88%" size={90} />
      <WavyLine color={W.trueWhite} top="88%" left="25%" width={150} />
      <CrossShape color={W.electricBlue} top="15%" left="5%" size={95} />
      <PixelatedSquare color={W.acidGreen} top="70%" left="10%" size={75} />
      <StripePattern color={W.deepPurple} top="5%" left="45%" size={100} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Title card with enhanced effects */}
        <motion.div
          initial={{ x: 100, opacity: 0, rotate: 15 }}
          animate={{ x: 0, opacity: 1, rotate: -2 }}
          transition={{ duration: 0.7, type: 'spring', bounce: 0.5 }}
          style={{
            backgroundColor: W.trueWhite,
            border: `8px solid ${W.trueBlack}`,
            padding: '20px 40px',
            marginBottom: 40,
            boxShadow: '12px 12px 0px rgba(0,0,0,0.5)',
            transform: 'rotate(-2deg)',
            alignSelf: 'flex-start',
            position: 'relative',
          }}
        >
          {/* Decorative corner badges */}
          <motion.div 
            style={{
              position: 'absolute',
              top: -12,
              right: -12,
              width: 35,
              height: 35,
              backgroundColor: W.electricYellow,
              border: `4px solid ${W.trueBlack}`,
              borderRadius: '50%',
            }}
            animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              bottom: -10,
              left: -10,
              width: 28,
              height: 28,
              backgroundColor: W.cyberCyan,
              border: `3px solid ${W.trueBlack}`,
              transform: 'rotate(45deg)',
            }}
            animate={{ rotate: [45, 405], scale: [1, 1.3, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
          <GlitchText>
            <div style={{ fontSize: 52, fontWeight: 900, color: W.hotPink, textShadow: '5px 5px 0px rgba(0,0,0,0.15)' }}>
              TOP ALBUMS
            </div>
          </GlitchText>
        </motion.div>

        {/* Album cards with enhanced design */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {top3.map((album, i) => (
            <motion.div
              key={album.id}
              initial={{ scale: 0, rotate: 180, x: -200 }}
              animate={{ scale: 1, rotate: 0, x: 0 }}
              transition={{ delay: stagger(i, 0.3, 0.15), type: 'spring', bounce: 0.5 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                backgroundColor: W.trueWhite,
                border: `7px solid ${W.trueBlack}`,
                padding: 20,
                boxShadow: '10px 10px 0px rgba(0,0,0,0.4)',
                transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)`,
                position: 'relative',
              }}
            >
              {/* Rank badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: stagger(i, 0.3, 0.15) + 0.2, type: 'spring', bounce: 0.6 }}
                style={{
                  position: 'absolute',
                  top: -15,
                  left: 15,
                  width: 45,
                  height: 45,
                  backgroundColor: [W.electricYellow, W.cyberCyan, W.vividGreen][i],
                  border: `4px solid ${W.trueBlack}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 24,
                  color: W.trueBlack,
                  transform: 'rotate(-10deg)',
                  boxShadow: '4px 4px 0px rgba(0,0,0,0.3)',
                }}
              >
                {i + 1}
              </motion.div>

              {/* Album cover with enhanced styling */}
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: 100,
                  height: 100,
                  backgroundImage: `url(${album.cover || fallbackImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: `6px solid ${W.trueBlack}`,
                  boxShadow: '6px 6px 0px rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}
              />
              
              {/* Album info */}
              <div style={{ flex: 1 }}>
                <StretchText>
                  <div style={{ fontSize: 32, fontWeight: 900, color: W.trueBlack, lineHeight: 1.1, marginBottom: 8 }}>
                    {album.title}
                  </div>
                </StretchText>
                <div style={{ fontSize: 20, fontWeight: 700, color: W.hotPink, letterSpacing: '1px' }}>
                  {album.artist}
                </div>
              </div>

              {/* Decorative element */}
              <motion.div
                style={{
                  width: 25,
                  height: 25,
                  backgroundColor: W.neonOrange,
                  border: `3px solid ${W.trueBlack}`,
                  transform: 'rotate(45deg)',
                }}
                animate={{ rotate: [45, 405] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
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
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.neonOrange, overflow: 'hidden' }}>
      {/* Enhanced layered backgrounds */}
      <GridPattern color={W.trueBlack} />
      <AnimatedDots color={W.trueBlack} density={70} />
      <MovingShapes color={W.trueBlack} />
      <DiagonalStripes color={W.trueBlack} direction="right" />
      <FloatingBlobs color={W.trueBlack} />
      
      {/* 8+ animated shape components */}
      <FloatingZigzag color={W.electricBlue} top="8%" left="8%" size={90} />
      <PulsingCircle color={W.hotCoral} top="72%" left="78%" size={110} />
      <RotatingStar color={W.deepPurple} top="28%" left="85%" size={75} />
      <BouncingDiamond color={W.vividGreen} top="65%" left="10%" size={90} />
      <GlitchSquare color={W.hotPink} top="12%" left="48%" size={85} />
      <WavyLine color={W.trueBlack} top="88%" left="35%" width={160} />
      <CrossShape color={W.cyberCyan} top="35%" left="5%" size={100} />
      <PixelatedSquare color={W.electricYellow} top="80%" left="85%" size={70} />
      <StripePattern color={W.acidGreen} top="5%" left="75%" size={110} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48 }}>
        {/* Enhanced album cover with multiple decorative elements */}
        <motion.div
          initial={{ scale: 0, rotate: 360 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.5 }}
          style={{
            position: 'relative',
          }}
        >
          {/* Main album cover */}
          <motion.div
            animate={{ y: [-8, 8, -8] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 300,
              height: 300,
              backgroundImage: `url(${album.cover || fallbackImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: `10px solid ${W.trueBlack}`,
              boxShadow: '16px 16px 0px rgba(0,0,0,0.6)',
              transform: 'rotate(-4deg)',
            }}
          />

          {/* Decorative corner elements */}
          <motion.div 
            style={{
              position: 'absolute',
              top: -20,
              left: -20,
              width: 50,
              height: 50,
              backgroundColor: W.electricYellow,
              border: `5px solid ${W.trueBlack}`,
              boxShadow: '6px 6px 0px rgba(0,0,0,0.4)',
            }}
            animate={{ rotate: [0, 90, 180, 270, 360], scale: [1, 1.2, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 50,
              height: 50,
              backgroundColor: W.cyberCyan,
              border: `5px solid ${W.trueBlack}`,
              borderRadius: '50%',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.4)',
            }}
            animate={{ scale: [1, 1.4, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              bottom: -20,
              left: -20,
              width: 50,
              height: 50,
              backgroundColor: W.hotPink,
              border: `5px solid ${W.trueBlack}`,
              transform: 'rotate(45deg)',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.4)',
            }}
            animate={{ rotate: [45, 405], scale: [1, 1.3, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              bottom: -20,
              right: -20,
              width: 50,
              height: 50,
              backgroundColor: W.vividGreen,
              border: `5px solid ${W.trueBlack}`,
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.4)',
            }}
            animate={{ rotate: [0, -360], scale: [1, 1.25, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>

        {/* Enhanced info card */}
        <motion.div
          initial={{ y: 80, opacity: 0, rotate: 15 }}
          animate={{ y: 0, opacity: 1, rotate: 3 }}
          transition={{ delay: 0.4, type: 'spring', bounce: 0.5 }}
          style={{
            marginTop: 50,
            backgroundColor: W.trueBlack,
            border: `8px solid ${W.electricYellow}`,
            padding: '28px 48px',
            boxShadow: '14px 14px 0px rgba(0,0,0,0.5)',
            transform: 'rotate(3deg)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* Badge decorations */}
          <motion.div
            style={{
              position: 'absolute',
              top: -15,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: W.hotCoral,
              border: `4px solid ${W.trueBlack}`,
              padding: '8px 20px',
              boxShadow: '4px 4px 0px rgba(0,0,0,0.4)',
            }}
            animate={{ y: [-5, 5, -5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div style={{ fontSize: 16, fontWeight: 900, color: W.trueWhite, letterSpacing: '2px' }}>
              #1 ALBUM
            </div>
          </motion.div>

          <WarpText>
            <div style={{ fontSize: 44, fontWeight: 900, color: W.trueWhite, lineHeight: 1.2, marginTop: 10 }}>
              {album.title}
            </div>
          </WarpText>
          <StretchText>
            <div style={{ fontSize: 24, fontWeight: 700, color: W.electricYellow, marginTop: 12, letterSpacing: '1px' }}>
              {album.artist}
            </div>
          </StretchText>
        </motion.div>
      </div>
    </div>
  );
};

const Slide8: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const genres = artists.flatMap(a => a.genres || []).slice(0, 6);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.cyberCyan, overflow: 'hidden' }}>
      {/* Enhanced layered backgrounds */}
      <GridPattern color={W.trueBlack} />
      <AnimatedDots color={W.trueBlack} density={75} />
      <MovingShapes color={W.trueBlack} />
      <DiagonalStripes color={W.trueBlack} direction="left" />
      <FloatingBlobs color={W.trueBlack} />
      
      {/* 8+ animated shape components */}
      <FloatingZigzag color={W.electricYellow} top="6%" left="78%" size={80} />
      <PulsingCircle color={W.deepPurple} top="68%" left="8%" size={100} />
      <RotatingStar color={W.vividGreen} top="18%" left="10%" size={70} />
      <BouncingDiamond color={W.hotCoral} top="78%" left="85%" size={85} />
      <GlitchSquare color={W.hotPink} top="38%" left="52%" size={95} />
      <WavyLine color={W.trueBlack} top="52%" left="20%" width={140} />
      <CrossShape color={W.neonOrange} top="10%" left="40%" size={85} />
      <PixelatedSquare color={W.electricBlue} top="85%" left="45%" size={65} />
      <StripePattern color={W.acidGreen} top="25%" left="85%" size={105} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        {/* Enhanced title card */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.6 }}
          style={{
            backgroundColor: W.trueBlack,
            border: `8px solid ${W.trueWhite}`,
            padding: '24px 48px',
            marginBottom: 48,
            boxShadow: '14px 14px 0px rgba(0,0,0,0.5)',
            transform: 'rotate(-3deg)',
            position: 'relative',
          }}
        >
          {/* Corner decorations */}
          <motion.div 
            style={{
              position: 'absolute',
              top: -12,
              left: -12,
              width: 38,
              height: 38,
              backgroundColor: W.hotCoral,
              border: `4px solid ${W.trueWhite}`,
              transform: 'rotate(45deg)',
            }}
            animate={{ rotate: [45, 405], scale: [1, 1.3, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              top: -12,
              right: -12,
              width: 38,
              height: 38,
              backgroundColor: W.electricYellow,
              border: `4px solid ${W.trueWhite}`,
              borderRadius: '50%',
            }}
            animate={{ scale: [1, 1.4, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />

          <WarpText>
            <div style={{ fontSize: 54, fontWeight: 900, color: W.cyberCyan, textShadow: '4px 4px 0px rgba(0,0,0,0.2)' }}>
              YOUR GENRES
            </div>
          </WarpText>
        </motion.div>

        {/* Genre grid with enhanced styling */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 650 }}>
          {genres.map((genre, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: 90, y: 100 }}
              animate={{ scale: 1, rotate: 0, y: 0 }}
              transition={{ delay: stagger(i, 0.2, 0.12), type: 'spring', bounce: 0.6 }}
              style={{
                backgroundColor: W.trueWhite,
                border: `7px solid ${W.trueBlack}`,
                padding: '24px 28px',
                boxShadow: '10px 10px 0px rgba(0,0,0,0.4)',
                transform: `rotate(${i % 2 === 0 ? 2 : -2}deg)`,
                textAlign: 'center',
                position: 'relative',
              }}
            >
              {/* Genre badge decoration */}
              <motion.div
                style={{
                  position: 'absolute',
                  top: -12,
                  right: -12,
                  width: 32,
                  height: 32,
                  backgroundColor: [W.hotPink, W.electricYellow, W.vividGreen, W.neonOrange, W.deepPurple, W.hotCoral][i % 6],
                  border: `3px solid ${W.trueBlack}`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 16,
                  color: W.trueBlack,
                  boxShadow: '3px 3px 0px rgba(0,0,0,0.3)',
                }}
                animate={{ rotate: [0, 360], scale: [1, 1.2, 1] }}
                transition={{ duration: 4, repeat: Infinity, delay: i * 0.2 }}
              >
                {i + 1}
              </motion.div>

              <StretchText>
                <div style={{ fontSize: 26, fontWeight: 900, color: W.trueBlack, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {genre}
                </div>
              </StretchText>

              {/* Bottom accent */}
              <motion.div
                style={{
                  marginTop: 12,
                  height: 6,
                  backgroundColor: [W.hotPink, W.electricYellow, W.vividGreen, W.neonOrange, W.deepPurple, W.hotCoral][i % 6],
                  border: `2px solid ${W.trueBlack}`,
                }}
                animate={{ scaleX: [1, 0.8, 1] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
              />
            </motion.div>
          ))}
        </div>

        {/* Additional decorative badge */}
        <motion.div
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 1, type: 'spring', bounce: 0.5 }}
          style={{
            marginTop: 40,
            backgroundColor: W.trueBlack,
            border: `5px solid ${W.trueWhite}`,
            padding: '12px 32px',
            boxShadow: '6px 6px 0px rgba(0,0,0,0.4)',
            transform: 'rotate(2deg)',
          }}
        >
          <PixelText>
            <div style={{ fontSize: 18, fontWeight: 800, color: W.cyberCyan, letterSpacing: '2px' }}>
              🎧 YOUR SONIC UNIVERSE
            </div>
          </PixelText>
        </motion.div>
      </div>
    </div>
  );
};

const Slide9: React.FC<{ totalMinutes: number }> = ({ totalMinutes }) => {
  const hours = Math.floor(totalMinutes / 60);
  const months = 12;
  const avgPerDay = Math.round(totalMinutes / 365);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.vividGreen, overflow: 'hidden' }}>
      {/* Enhanced layered backgrounds */}
      <GridPattern color={W.trueBlack} />
      <AnimatedDots color={W.trueBlack} density={80} />
      <MovingShapes color={W.trueBlack} />
      <DiagonalStripes color={W.trueBlack} direction="right" />
      <FloatingBlobs color={W.trueBlack} />
      
      {/* 8+ animated shape components */}
      <FloatingZigzag color={W.electricYellow} top="10%" left="8%" size={75} />
      <PulsingCircle color={W.hotCoral} top="58%" left="85%" size={115} />
      <RotatingStar color={W.deepPurple} top="72%" left="12%" size={68} />
      <BouncingDiamond color={W.hotPink} top="22%" left="78%" size={82} />
      <GlitchSquare color={W.electricBlue} top="82%" left="48%" size={88} />
      <WavyLine color={W.trueBlack} top="38%" left="32%" width={145} />
      <CrossShape color={W.cyberCyan} top="5%" left="50%" size={92} />
      <PixelatedSquare color={W.neonOrange} top="68%" left="5%" size={72} />
      <StripePattern color={W.acidGreen} top="18%" left="85%" size={115} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        {/* Enhanced title card */}
        <motion.div
          initial={{ y: -100, opacity: 0, rotate: 20 }}
          animate={{ y: 0, opacity: 1, rotate: 2 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.6 }}
          style={{
            backgroundColor: W.trueWhite,
            border: `10px solid ${W.trueBlack}`,
            padding: '24px 52px',
            marginBottom: 48,
            boxShadow: '16px 16px 0px rgba(0,0,0,0.6)',
            transform: 'rotate(2deg)',
            position: 'relative',
          }}
        >
          {/* Decorative corner elements */}
          <motion.div 
            style={{
              position: 'absolute',
              top: -15,
              left: -15,
              width: 45,
              height: 45,
              backgroundColor: W.electricYellow,
              border: `5px solid ${W.trueBlack}`,
              boxShadow: '5px 5px 0px rgba(0,0,0,0.4)',
            }}
            animate={{ rotate: [0, 90, 180, 270, 360], scale: [1, 1.25, 1] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              top: -15,
              right: -15,
              width: 45,
              height: 45,
              backgroundColor: W.hotPink,
              border: `5px solid ${W.trueBlack}`,
              borderRadius: '50%',
              boxShadow: '5px 5px 0px rgba(0,0,0,0.4)',
            }}
            animate={{ scale: [1, 1.4, 1], rotate: [0, -360] }}
            transition={{ duration: 4, repeat: Infinity }}
          />

          <GlitchText>
            <div style={{ fontSize: 56, fontWeight: 900, color: W.vividGreen, textShadow: '6px 6px 0px rgba(0,0,0,0.15)' }}>
              BY THE NUMBERS
            </div>
          </GlitchText>
        </motion.div>

        {/* Stat cards with enhanced design */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%', maxWidth: 550 }}>
          {/* Hours stat */}
          <motion.div
            initial={{ x: -150, opacity: 0, rotate: -20 }}
            animate={{ x: 0, opacity: 1, rotate: -2 }}
            transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
            style={{
              backgroundColor: W.electricYellow,
              border: `8px solid ${W.trueBlack}`,
              padding: '24px 36px',
              boxShadow: '12px 12px 0px rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transform: 'rotate(-2deg)',
              position: 'relative',
            }}
          >
            {/* Icon decoration */}
            <motion.div
              style={{
                position: 'absolute',
                top: -18,
                left: 20,
                backgroundColor: W.hotCoral,
                border: `4px solid ${W.trueBlack}`,
                padding: '8px 16px',
                boxShadow: '4px 4px 0px rgba(0,0,0,0.4)',
              }}
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Clock size={24} color={W.trueWhite} strokeWidth={3} />
            </motion.div>

            <StretchText>
              <div style={{ fontSize: 24, fontWeight: 800, color: W.trueBlack, letterSpacing: '1px' }}>Total Hours</div>
            </StretchText>
            <PixelText>
              <div style={{ fontSize: 52, fontWeight: 900, color: W.trueBlack, textShadow: '4px 4px 0px rgba(255,255,255,0.4)' }}>
                {hours.toLocaleString()}
              </div>
            </PixelText>
          </motion.div>

          {/* Months stat */}
          <motion.div
            initial={{ x: 150, opacity: 0, rotate: 20 }}
            animate={{ x: 0, opacity: 1, rotate: 2 }}
            transition={{ delay: 0.4, type: 'spring', bounce: 0.5 }}
            style={{
              backgroundColor: W.hotCoral,
              border: `8px solid ${W.trueBlack}`,
              padding: '24px 36px',
              boxShadow: '12px 12px 0px rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transform: 'rotate(2deg)',
              position: 'relative',
            }}
          >
            {/* Icon decoration */}
            <motion.div
              style={{
                position: 'absolute',
                top: -18,
                left: 20,
                backgroundColor: W.cyberCyan,
                border: `4px solid ${W.trueBlack}`,
                padding: '8px 16px',
                boxShadow: '4px 4px 0px rgba(0,0,0,0.4)',
              }}
              animate={{ y: [-3, 3, -3], rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Sparkles size={24} color={W.trueBlack} strokeWidth={3} />
            </motion.div>

            <WarpText>
              <div style={{ fontSize: 24, fontWeight: 800, color: W.trueWhite, letterSpacing: '1px' }}>Months Active</div>
            </WarpText>
            <StretchText>
              <div style={{ fontSize: 52, fontWeight: 900, color: W.trueWhite, textShadow: '4px 4px 0px rgba(0,0,0,0.3)' }}>
                {months}
              </div>
            </StretchText>
          </motion.div>

          {/* Average stat */}
          <motion.div
            initial={{ x: -150, opacity: 0, rotate: -20 }}
            animate={{ x: 0, opacity: 1, rotate: -2 }}
            transition={{ delay: 0.6, type: 'spring', bounce: 0.5 }}
            style={{
              backgroundColor: W.deepPurple,
              border: `8px solid ${W.trueBlack}`,
              padding: '24px 36px',
              boxShadow: '12px 12px 0px rgba(0,0,0,0.5)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transform: 'rotate(-2deg)',
              position: 'relative',
            }}
          >
            {/* Icon decoration */}
            <motion.div
              style={{
                position: 'absolute',
                top: -18,
                left: 20,
                backgroundColor: W.acidGreen,
                border: `4px solid ${W.trueBlack}`,
                padding: '8px 16px',
                boxShadow: '4px 4px 0px rgba(0,0,0,0.4)',
              }}
              animate={{ y: [-3, 3, -3], scale: [1, 1.1, 1] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            >
              <TrendingUp size={24} color={W.trueBlack} strokeWidth={3} />
            </motion.div>

            <StretchText>
              <div style={{ fontSize: 24, fontWeight: 800, color: W.trueWhite, letterSpacing: '1px' }}>Avg Per Day</div>
            </StretchText>
            <GlitchText>
              <div style={{ fontSize: 52, fontWeight: 900, color: W.acidGreen }}>
                {avgPerDay}m
              </div>
            </GlitchText>
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
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.deepPurple, overflow: 'hidden' }}>
      {/* Enhanced layered backgrounds */}
      <GridPattern color={W.trueWhite} />
      <AnimatedDots color={W.trueWhite} density={70} />
      <MovingShapes color={W.trueWhite} />
      <DiagonalStripes color={W.trueWhite} direction="left" />
      <FloatingBlobs color={W.trueWhite} />
      
      {/* 8+ animated shape components */}
      <FloatingZigzag color={W.electricYellow} top="7%" left="82%" size={88} />
      <PulsingCircle color={W.hotCoral} top="62%" left="9%" size={108} />
      <RotatingStar color={W.acidGreen} top="23%" left="13%" size={73} />
      <BouncingDiamond color={W.hotPink} top="77%" left="79%" size={87} />
      <GlitchSquare color={W.electricBlue} top="38%" left="88%" size={93} />
      <WavyLine color={W.trueWhite} top="87%" left="27%" width={155} />
      <CrossShape color={W.cyberCyan} top="12%" left="45%" size={97} />
      <PixelatedSquare color={W.neonOrange} top="73%" left="15%" size={68} />
      <StripePattern color={W.vividGreen} top="6%" left="5%" size={108} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        {/* Enhanced artist image with decorations */}
        <motion.div
          initial={{ scale: 0, rotate: 360 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.9, type: 'spring', bounce: 0.5 }}
          style={{
            position: 'relative',
          }}
        >
          {/* Main artist image */}
          <motion.div
            animate={{ rotate: [-5, 5, -5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 240,
              height: 240,
              backgroundImage: `url(${topArtist.image || fallbackImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: `10px solid ${W.trueBlack}`,
              boxShadow: '16px 16px 0px rgba(0,0,0,0.6)',
              transform: 'rotate(-5deg)',
              position: 'relative',
            }}
          />

          {/* Corner decorations */}
          <motion.div 
            style={{
              position: 'absolute',
              top: -18,
              left: -18,
              width: 50,
              height: 50,
              backgroundColor: W.electricYellow,
              border: `5px solid ${W.trueBlack}`,
              boxShadow: '6px 6px 0px rgba(0,0,0,0.5)',
            }}
            animate={{ rotate: [0, 90, 180, 270, 360], scale: [1, 1.3, 1] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              top: -18,
              right: -18,
              width: 50,
              height: 50,
              backgroundColor: W.cyberCyan,
              border: `5px solid ${W.trueBlack}`,
              borderRadius: '50%',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.5)',
            }}
            animate={{ scale: [1, 1.5, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 4.5, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              bottom: -18,
              left: -18,
              width: 50,
              height: 50,
              backgroundColor: W.hotPink,
              border: `5px solid ${W.trueBlack}`,
              transform: 'rotate(45deg)',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.5)',
            }}
            animate={{ rotate: [45, 405], scale: [1, 1.35, 1] }}
            transition={{ duration: 5.5, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              bottom: -18,
              right: -18,
              width: 50,
              height: 50,
              backgroundColor: W.vividGreen,
              border: `5px solid ${W.trueBlack}`,
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.5)',
            }}
            animate={{ rotate: [0, -360], scale: [1, 1.4, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          />

          {/* Artist badge */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', bounce: 0.6 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: W.trueWhite,
              border: `5px solid ${W.trueBlack}`,
              padding: '8px 20px',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, color: W.deepPurple, letterSpacing: '2px' }}>
              TOP ARTIST
            </div>
          </motion.div>
        </motion.div>

        {/* Enhanced insight card */}
        <motion.div
          initial={{ y: 80, opacity: 0, rotate: 20 }}
          animate={{ y: 0, opacity: 1, rotate: -2 }}
          transition={{ delay: 0.4, type: 'spring', bounce: 0.5 }}
          style={{
            marginTop: 50,
            backgroundColor: W.trueBlack,
            border: `8px solid ${W.trueWhite}`,
            padding: '32px 40px',
            boxShadow: '14px 14px 0px rgba(0,0,0,0.6)',
            transform: 'rotate(-2deg)',
            maxWidth: '85%',
            position: 'relative',
          }}
        >
          {/* Top badge decoration */}
          <motion.div
            style={{
              position: 'absolute',
              top: -18,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: W.acidGreen,
              border: `5px solid ${W.trueBlack}`,
              padding: '10px 28px',
              boxShadow: '5px 5px 0px rgba(0,0,0,0.5)',
            }}
            animate={{ y: [-4, 4, -4], rotate: [-2, 2, -2] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Sparkles size={24} color={W.trueBlack} strokeWidth={3} />
          </motion.div>

          {/* Corner accents */}
          <motion.div 
            style={{
              position: 'absolute',
              top: -12,
              right: -12,
              width: 35,
              height: 35,
              backgroundColor: W.hotCoral,
              border: `4px solid ${W.trueWhite}`,
              transform: 'rotate(45deg)',
            }}
            animate={{ rotate: [45, 405], scale: [1, 1.3, 1] }}
            transition={{ duration: 3.5, repeat: Infinity }}
          />

          <div style={{ fontSize: 16, fontWeight: 800, color: W.acidGreen, marginBottom: 16, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '3px' }}>
            ✨ AI Insight ✨
          </div>
          <WarpText>
            <div style={{ fontSize: 24, fontWeight: 700, color: W.trueWhite, lineHeight: 1.5, textAlign: 'center' }}>
              {insight}
            </div>
          </WarpText>

          {/* Bottom decoration bar */}
          <motion.div
            style={{
              marginTop: 20,
              height: 8,
              backgroundColor: W.deepPurple,
              border: `3px solid ${W.trueWhite}`,
            }}
            animate={{ scaleX: [1, 0.9, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        </motion.div>

        {/* Additional artist name badge */}
        <motion.div
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.7, type: 'spring', bounce: 0.6 }}
          style={{
            marginTop: 32,
            backgroundColor: W.electricYellow,
            border: `6px solid ${W.trueBlack}`,
            padding: '16px 40px',
            boxShadow: '8px 8px 0px rgba(0,0,0,0.5)',
            transform: 'rotate(2deg)',
          }}
        >
          <GlitchText>
            <div style={{ fontSize: 28, fontWeight: 900, color: W.trueBlack, letterSpacing: '1px' }}>
              {topArtist.name}
            </div>
          </GlitchText>
        </motion.div>
      </div>
    </div>
  );
};

const Slide11: React.FC<{ albumCovers: string[] }> = ({ albumCovers }) => {
  const covers = albumCovers.slice(0, 9);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.acidGreen, overflow: 'hidden' }}>
      {/* Enhanced layered backgrounds */}
      <GridPattern color={W.trueBlack} />
      <AnimatedDots color={W.trueBlack} density={65} />
      <MovingShapes color={W.trueBlack} />
      <DiagonalStripes color={W.trueBlack} direction="right" />
      <FloatingBlobs color={W.trueBlack} />
      
      {/* 8+ animated shape components */}
      <FloatingZigzag color={W.electricBlue} top="4%" left="4%" size={78} />
      <PulsingCircle color={W.hotCoral} top="72%" left="88%" size={102} />
      <RotatingStar color={W.deepPurple} top="52%" left="92%" size={68} />
      <BouncingDiamond color={W.hotPink} top="82%" left="8%" size={83} />
      <GlitchSquare color={W.neonOrange} top="13%" left="88%" size={88} />
      <WavyLine color={W.trueBlack} top="90%" left="30%" width={135} />
      <CrossShape color={W.cyberCyan} top="35%" left="3%" size={95} />
      <PixelatedSquare color={W.electricYellow} top="8%" left="45%" size={70} />
      <StripePattern color={W.vividGreen} top="60%" left="5%" size={100} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        {/* Enhanced title card */}
        <motion.div
          initial={{ scale: 0, rotate: 180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.6 }}
          style={{
            backgroundColor: W.trueBlack,
            border: `8px solid ${W.trueWhite}`,
            padding: '24px 52px',
            marginBottom: 48,
            boxShadow: '14px 14px 0px rgba(0,0,0,0.6)',
            transform: 'rotate(-2deg)',
            position: 'relative',
          }}
        >
          {/* Decorative badges */}
          <motion.div 
            style={{
              position: 'absolute',
              top: -15,
              left: -15,
              width: 42,
              height: 42,
              backgroundColor: W.hotPink,
              border: `5px solid ${W.trueWhite}`,
              borderRadius: '50%',
            }}
            animate={{ scale: [1, 1.4, 1], rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              top: -15,
              right: -15,
              width: 42,
              height: 42,
              backgroundColor: W.electricYellow,
              border: `5px solid ${W.trueWhite}`,
              transform: 'rotate(45deg)',
            }}
            animate={{ rotate: [45, 405], scale: [1, 1.35, 1] }}
            transition={{ duration: 3.5, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              bottom: -15,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: W.cyberCyan,
              border: `5px solid ${W.trueWhite}`,
              padding: '6px 18px',
            }}
            animate={{ y: [-4, 4, -4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Music size={20} color={W.trueBlack} strokeWidth={3} />
          </motion.div>

          <GlitchText>
            <div style={{ fontSize: 52, fontWeight: 900, color: W.acidGreen, textShadow: '5px 5px 0px rgba(0,0,0,0.2)' }}>
              YOUR COLLAGE
            </div>
          </GlitchText>
        </motion.div>

        {/* Enhanced album grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 550 }}>
          {covers.map((cover, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: 180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ delay: stagger(i, 0.1, 0.08), type: 'spring', bounce: 0.5 }}
              style={{
                position: 'relative',
              }}
            >
              {/* Album cover */}
              <motion.div
                animate={{ 
                  rotate: [(i % 3) * 2 - 2, (i % 3) * 2 + 2, (i % 3) * 2 - 2],
                  y: [0, -5, 0]
                }}
                transition={{ 
                  duration: 3 + i * 0.3, 
                  repeat: Infinity, 
                  ease: 'easeInOut' 
                }}
                style={{
                  width: 155,
                  height: 155,
                  backgroundImage: `url(${cover || fallbackImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: `6px solid ${W.trueBlack}`,
                  boxShadow: '8px 8px 0px rgba(0,0,0,0.4)',
                  transform: `rotate(${(i % 3) * 2 - 2}deg)`,
                }}
              />

              {/* Number badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ 
                  scale: 1,
                  rotate: [0, 360]
                }}
                transition={{ 
                  scale: { delay: stagger(i, 0.1, 0.08) + 0.2, type: 'spring', bounce: 0.7 },
                  rotate: { duration: 5, repeat: Infinity, delay: i * 0.3, ease: 'linear' }
                }}
                style={{
                  position: 'absolute',
                  top: -12,
                  right: -12,
                  width: 38,
                  height: 38,
                  backgroundColor: [
                    W.electricYellow, W.hotPink, W.cyberCyan,
                    W.neonOrange, W.deepPurple, W.electricBlue,
                    W.hotCoral, W.vividGreen, W.acidGreen
                  ][i],
                  border: `4px solid ${W.trueBlack}`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 18,
                  color: i === 1 || i === 4 ? W.trueWhite : W.trueBlack,
                  boxShadow: '4px 4px 0px rgba(0,0,0,0.4)',
                }}
              >
                {i + 1}
              </motion.div>

              {/* Corner accent */}
              <motion.div
                style={{
                  position: 'absolute',
                  bottom: -8,
                  left: -8,
                  width: 24,
                  height: 24,
                  backgroundColor: W.trueBlack,
                  border: `3px solid ${W.trueWhite}`,
                  transform: 'rotate(45deg)',
                }}
                animate={{ rotate: [45, 405] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
          ))}
        </div>

        {/* Bottom decorative badge */}
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 1, type: 'spring', bounce: 0.5 }}
          style={{
            marginTop: 40,
            backgroundColor: W.trueBlack,
            border: `6px solid ${W.trueWhite}`,
            padding: '14px 36px',
            boxShadow: '8px 8px 0px rgba(0,0,0,0.5)',
            transform: 'rotate(2deg)',
            position: 'relative',
          }}
        >
          <motion.div
            style={{
              position: 'absolute',
              top: -10,
              left: -10,
              width: 28,
              height: 28,
              backgroundColor: W.hotCoral,
              border: `3px solid ${W.trueWhite}`,
              borderRadius: '50%',
            }}
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <PixelText>
            <div style={{ fontSize: 20, fontWeight: 900, color: W.acidGreen, letterSpacing: '2px' }}>
              💿 YOUR TOP ALBUMS
            </div>
          </PixelText>
        </motion.div>
      </div>
    </div>
  );
};

const Slide12: React.FC<{ connectionGraph?: { artistInfo: Record<string, any>; pairs: Record<string, Record<string, number>> } }> = ({ connectionGraph }) => {
  const artists = connectionGraph ? Object.keys(connectionGraph.artistInfo).slice(0, 6) : [];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.hotCoral, overflow: 'hidden' }}>
      {/* Enhanced layered backgrounds */}
      <GridPattern color={W.trueWhite} />
      <AnimatedDots color={W.trueWhite} density={75} />
      <MovingShapes color={W.trueWhite} />
      <DiagonalStripes color={W.trueWhite} direction="left" />
      <FloatingBlobs color={W.trueWhite} />
      
      {/* 8+ animated shape components */}
      <FloatingZigzag color={W.electricYellow} top="9%" left="77%" size={85} />
      <PulsingCircle color={W.cyberCyan} top="67%" left="13%" size={112} />
      <RotatingStar color={W.vividGreen} top="28%" left="8%" size={72} />
      <BouncingDiamond color={W.deepPurple} top="77%" left="82%" size={90} />
      <GlitchSquare color={W.trueWhite} top="43%" left="88%" size={85} />
      <WavyLine color={W.trueWhite} top="18%" left="32%" width={145} />
      <CrossShape color={W.neonOrange} top="55%" left="5%" size={98} />
      <PixelatedSquare color={W.acidGreen} top="10%" left="45%" size={68} />
      <StripePattern color={W.electricBlue} top="85%" left="60%" size={105} />

      <div style={{ position: 'relative', zIndex: 10, padding: 48, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        {/* Enhanced title card */}
        <motion.div
          initial={{ y: -80, opacity: 0, rotate: -20 }}
          animate={{ y: 0, opacity: 1, rotate: 2 }}
          transition={{ duration: 0.8, type: 'spring', bounce: 0.6 }}
          style={{
            backgroundColor: W.trueWhite,
            border: `10px solid ${W.trueBlack}`,
            padding: '24px 56px',
            marginBottom: 48,
            boxShadow: '16px 16px 0px rgba(0,0,0,0.6)',
            transform: 'rotate(2deg)',
            position: 'relative',
          }}
        >
          {/* Decorative elements */}
          <motion.div 
            style={{
              position: 'absolute',
              top: -18,
              left: -18,
              width: 48,
              height: 48,
              backgroundColor: W.electricYellow,
              border: `5px solid ${W.trueBlack}`,
              boxShadow: '6px 6px 0px rgba(0,0,0,0.5)',
            }}
            animate={{ rotate: [0, 90, 180, 270, 360], scale: [1, 1.3, 1] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              top: -18,
              right: -18,
              width: 48,
              height: 48,
              backgroundColor: W.cyberCyan,
              border: `5px solid ${W.trueBlack}`,
              borderRadius: '50%',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.5)',
            }}
            animate={{ scale: [1, 1.5, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              bottom: -18,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: W.hotPink,
              border: `5px solid ${W.trueBlack}`,
              padding: '8px 22px',
              boxShadow: '5px 5px 0px rgba(0,0,0,0.5)',
            }}
            animate={{ y: [-4, 4, -4], scale: [1, 1.1, 1] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          >
            <Zap size={24} color={W.trueWhite} strokeWidth={3} />
          </motion.div>

          <WarpText>
            <div style={{ fontSize: 56, fontWeight: 900, color: W.hotCoral, textShadow: '6px 6px 0px rgba(0,0,0,0.12)' }}>
              CONNECTIONS
            </div>
          </WarpText>
        </motion.div>

        {artists.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'center', maxWidth: 650 }}>
            {artists.map((artist, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: 90, y: 80 }}
                animate={{ scale: 1, rotate: 0, y: 0 }}
                transition={{ delay: stagger(i, 0.15, 0.1), type: 'spring', bounce: 0.6 }}
                style={{
                  backgroundColor: W.trueWhite,
                  border: `7px solid ${W.trueBlack}`,
                  padding: '20px 32px',
                  boxShadow: '10px 10px 0px rgba(0,0,0,0.5)',
                  transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)`,
                  position: 'relative',
                }}
              >
                {/* Badge decoration */}
                <motion.div
                  style={{
                    position: 'absolute',
                    top: -14,
                    left: -14,
                    width: 36,
                    height: 36,
                    backgroundColor: [W.electricYellow, W.cyberCyan, W.vividGreen, W.deepPurple, W.neonOrange, W.hotPink][i % 6],
                    border: `4px solid ${W.trueBlack}`,
                    borderRadius: '50%',
                    boxShadow: '4px 4px 0px rgba(0,0,0,0.4)',
                  }}
                  animate={{ rotate: [0, 360], scale: [1, 1.3, 1] }}
                  transition={{ duration: 4 + i * 0.5, repeat: Infinity }}
                />

                {/* Connection lines decoration */}
                <motion.div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: -8,
                    width: 20,
                    height: 4,
                    backgroundColor: W.trueBlack,
                  }}
                  animate={{ scaleX: [1, 1.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                />

                <StretchText>
                  <div style={{ fontSize: 22, fontWeight: 900, color: W.trueBlack, letterSpacing: '0.5px' }}>
                    {artist}
                  </div>
                </StretchText>

                {/* Bottom accent bar */}
                <motion.div
                  style={{
                    marginTop: 10,
                    height: 5,
                    backgroundColor: [W.electricYellow, W.cyberCyan, W.vividGreen, W.deepPurple, W.neonOrange, W.hotPink][i % 6],
                    border: `2px solid ${W.trueBlack}`,
                  }}
                  animate={{ scaleX: [1, 0.85, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.15 }}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0, rotate: 180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', bounce: 0.6 }}
            style={{
              backgroundColor: W.trueWhite,
              border: `8px solid ${W.trueBlack}`,
              padding: '40px 56px',
              boxShadow: '14px 14px 0px rgba(0,0,0,0.6)',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {/* Corner decorations */}
            <motion.div 
              style={{
                position: 'absolute',
                top: -12,
                left: -12,
                width: 40,
                height: 40,
                backgroundColor: W.electricYellow,
                border: `4px solid ${W.trueBlack}`,
                transform: 'rotate(45deg)',
              }}
              animate={{ rotate: [45, 405], scale: [1, 1.3, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            <motion.div 
              style={{
                position: 'absolute',
                bottom: -12,
                right: -12,
                width: 40,
                height: 40,
                backgroundColor: W.cyberCyan,
                border: `4px solid ${W.trueBlack}`,
                borderRadius: '50%',
              }}
              animate={{ scale: [1, 1.4, 1], rotate: [0, 360] }}
              transition={{ duration: 3.5, repeat: Infinity }}
            />

            <GlitchText>
              <div style={{ fontSize: 28, fontWeight: 800, color: W.trueBlack, lineHeight: 1.4 }}>
                Your music taste is eclectic and unique!
              </div>
            </GlitchText>
          </motion.div>
        )}

        {/* Additional decorative badge */}
        <motion.div
          initial={{ scale: 0, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ delay: 1, type: 'spring', bounce: 0.5 }}
          style={{
            marginTop: 40,
            backgroundColor: W.trueBlack,
            border: `6px solid ${W.trueWhite}`,
            padding: '14px 38px',
            boxShadow: '8px 8px 0px rgba(0,0,0,0.5)',
            transform: 'rotate(-2deg)',
            position: 'relative',
          }}
        >
          <motion.div
            style={{
              position: 'absolute',
              top: -10,
              right: -10,
              width: 28,
              height: 28,
              backgroundColor: W.vividGreen,
              border: `3px solid ${W.trueWhite}`,
              transform: 'rotate(45deg)',
            }}
            animate={{ rotate: [45, 405] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />
          <PixelText>
            <div style={{ fontSize: 18, fontWeight: 900, color: W.trueWhite, letterSpacing: '2px' }}>
              🎵 YOUR MUSICAL WEB
            </div>
          </PixelText>
        </motion.div>
      </div>
    </div>
  );
};

const Slide13: React.FC = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: W.trueBlack, overflow: 'hidden' }}>
      {/* Enhanced layered backgrounds */}
      <GridPattern color={W.electricYellow} />
      <AnimatedDots color={W.electricYellow} density={85} />
      <MovingShapes color={W.electricYellow} />
      <DiagonalStripes color={W.electricYellow} direction="right" />
      <FloatingBlobs color={W.electricYellow} />
      
      {/* 8+ animated shape components */}
      <FloatingZigzag color={W.electricYellow} top="8%" left="8%" size={95} />
      <PulsingCircle color={W.hotCoral} top="62%" left="72%" size={120} />
      <RotatingStar color={W.vividGreen} top="23%" left="78%" size={85} />
      <BouncingDiamond color={W.hotPink} top="72%" left="18%" size={100} />
      <GlitchSquare color={W.electricBlue} top="13%" left="62%" size={105} />
      <WavyLine color={W.deepPurple} top="82%" left="38%" width={170} />
      <CrossShape color={W.cyberCyan} top="45%" left="5%" size={110} />
      <PixelatedSquare color={W.neonOrange} top="35%" left="88%" size={75} />
      <StripePattern color={W.acidGreen} top="55%" left="50%" size={120} />

      <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48 }}>
        {/* Main year card with enhanced effects */}
        <motion.div
          initial={{ scale: 0, rotate: 360 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, type: 'spring', bounce: 0.7 }}
          style={{
            backgroundColor: W.electricYellow,
            border: `12px solid ${W.hotCoral}`,
            padding: '40px 80px',
            boxShadow: '20px 20px 0px rgba(255, 215, 0, 0.4)',
            transform: 'rotate(-3deg)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* Corner decorations */}
          <motion.div 
            style={{
              position: 'absolute',
              top: -20,
              left: -20,
              width: 55,
              height: 55,
              backgroundColor: W.cyberCyan,
              border: `6px solid ${W.trueBlack}`,
              boxShadow: '8px 8px 0px rgba(0,0,0,0.5)',
            }}
            animate={{ rotate: [0, 90, 180, 270, 360], scale: [1, 1.3, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 55,
              height: 55,
              backgroundColor: W.hotPink,
              border: `6px solid ${W.trueBlack}`,
              borderRadius: '50%',
              boxShadow: '8px 8px 0px rgba(0,0,0,0.5)',
            }}
            animate={{ scale: [1, 1.5, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              bottom: -20,
              left: -20,
              width: 55,
              height: 55,
              backgroundColor: W.vividGreen,
              border: `6px solid ${W.trueBlack}`,
              transform: 'rotate(45deg)',
              boxShadow: '8px 8px 0px rgba(0,0,0,0.5)',
            }}
            animate={{ rotate: [45, 405], scale: [1, 1.4, 1] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <motion.div 
            style={{
              position: 'absolute',
              bottom: -20,
              right: -20,
              width: 55,
              height: 55,
              backgroundColor: W.deepPurple,
              border: `6px solid ${W.trueBlack}`,
              clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              boxShadow: '8px 8px 0px rgba(0,0,0,0.5)',
            }}
            animate={{ rotate: [0, -360], scale: [1, 1.45, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          />

          {/* Year badge */}
          <motion.div
            style={{
              position: 'absolute',
              top: -25,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: W.neonOrange,
              border: `6px solid ${W.trueBlack}`,
              padding: '10px 28px',
              boxShadow: '6px 6px 0px rgba(0,0,0,0.5)',
            }}
            animate={{ y: [-5, 5, -5], rotate: [-3, 3, -3] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Flame size={28} color={W.trueWhite} strokeWidth={3} />
          </motion.div>

          <WarpText>
            <div style={{ fontSize: 86, fontWeight: 900, color: W.trueBlack, lineHeight: 0.9, textShadow: '8px 8px 0px rgba(0,0,0,0.1)' }}>
              {CURRENT_YEAR}
            </div>
          </WarpText>
          <GlitchText>
            <div style={{ fontSize: 58, fontWeight: 900, color: W.trueBlack, marginTop: 12, letterSpacing: '4px' }}>
              WRAPPED
            </div>
          </GlitchText>
        </motion.div>

        {/* Thanks message with enhanced styling */}
        <motion.div
          initial={{ y: 80, opacity: 0, rotate: 20 }}
          animate={{ y: 0, opacity: 1, rotate: -2 }}
          transition={{ delay: 0.6, type: 'spring', bounce: 0.6 }}
          style={{
            marginTop: 56,
            backgroundColor: W.trueWhite,
            border: `10px solid ${W.electricBlue}`,
            padding: '28px 56px',
            boxShadow: '16px 16px 0px rgba(255, 255, 255, 0.2)',
            transform: 'rotate(-2deg)',
            position: 'relative',
          }}
        >
          {/* Decorative accents */}
          <motion.div
            style={{
              position: 'absolute',
              top: -15,
              left: -15,
              width: 42,
              height: 42,
              backgroundColor: W.hotPink,
              border: `5px solid ${W.trueBlack}`,
              borderRadius: '50%',
            }}
            animate={{ scale: [1, 1.4, 1], rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            style={{
              position: 'absolute',
              top: -15,
              right: -15,
              width: 42,
              height: 42,
              backgroundColor: W.acidGreen,
              border: `5px solid ${W.trueBlack}`,
              transform: 'rotate(45deg)',
            }}
            animate={{ rotate: [45, 405], scale: [1, 1.35, 1] }}
            transition={{ duration: 3.5, repeat: Infinity }}
          />

          <RepeatedText count={3}>
            <div style={{ fontSize: 42, fontWeight: 900, color: W.trueBlack, letterSpacing: '2px' }}>
              THANKS FOR LISTENING
            </div>
          </RepeatedText>
        </motion.div>

        {/* Final message */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.9, type: 'spring', bounce: 0.6 }}
          style={{
            marginTop: 40,
            backgroundColor: W.deepPurple,
            border: `6px solid ${W.electricYellow}`,
            padding: '16px 44px',
            boxShadow: '10px 10px 0px rgba(157, 0, 255, 0.4)',
            transform: 'rotate(2deg)',
            position: 'relative',
          }}
        >
          {/* Corner badge */}
          <motion.div
            style={{
              position: 'absolute',
              top: -12,
              right: -12,
              width: 35,
              height: 35,
              backgroundColor: W.cyberCyan,
              border: `4px solid ${W.trueBlack}`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            animate={{ rotate: [0, 360], scale: [1, 1.3, 1] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Headphones size={20} color={W.trueBlack} strokeWidth={3} />
          </motion.div>

          <StretchText>
            <div style={{ fontSize: 20, fontWeight: 800, color: W.electricYellow, textTransform: 'uppercase', letterSpacing: '3px' }}>
              See you next year! 🎵
            </div>
          </StretchText>
        </motion.div>

        {/* Additional floating decorations */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ delay: 1.5, duration: 2, repeat: Infinity }}
          style={{
            position: 'absolute',
            bottom: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 16,
            fontWeight: 700,
            color: W.electricYellow,
            letterSpacing: '2px',
          }}
        >
          ⭐ ⭐ ⭐
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
