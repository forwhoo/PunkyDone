import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import PrismaticBurst from './reactbits/PrismaticBurst';
import WrappedSlides from './WrappedSlides';
import { Artist, Album, Song } from '../types';

interface PunkyWrappedProps {
  onClose: () => void;
  albumCovers: string[];
  totalMinutes?: number;
  weeklyMinutes?: number;
  artists?: Artist[];
  albums?: Album[];
  songs?: Song[];
  connectionGraph?: { artistInfo: Record<string, any>; pairs: Record<string, Record<string, number>> };
}

// --- Configuration ---
const LAYER_COUNT = 7;
const ITEMS_PER_LAYER = [15, 13, 11, 9, 7, 6, 4];
const LAYER_SIZES = [100, 85, 70, 55, 40, 28, 18];
const LAYER_DURATIONS = [60, 50, 40, 32, 25, 19, 14];
const LAYER_SCALES = [1.0, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1];
const LAYER_OPACITY = [0.95, 0.88, 0.78, 0.65, 0.5, 0.35, 0.2];

// Vortex configuration
const VORTEX_DURATION = 7;
const MAX_RADIUS_VW = 90;

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

interface SpiralItem {
  src: string;
  angle: number;
  layer: number;
  indexInLayer: number;
  id: string;
}

function buildLayerItems(covers: string[], idCounter: { value: number }): SpiralItem[] {
  if (covers.length === 0) return [];
  const items: SpiralItem[] = [];
  let coverIdx = 0;
  for (let layer = 0; layer < LAYER_COUNT; layer++) {
    const count = ITEMS_PER_LAYER[layer];
    for (let j = 0; j < count; j++) {
      items.push({
        src: covers[coverIdx % covers.length],
        angle: (360 / count) * j + layer * 18,
        layer,
        indexInLayer: j,
        id: `item-${idCounter.value++}`,
      });
      coverIdx++;
    }
  }
  return items;
}

function getWeekRange(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}, ${now.getFullYear()}`;
}

const PunkyWrapped: React.FC<PunkyWrappedProps> = ({ onClose, albumCovers, totalMinutes, weeklyMinutes, artists = [], albums = [], songs = [], connectionGraph }) => {
  const [story, setStory] = useState<'intro' | 'slides' | 'done'>('intro');
  const [vortex, setVortex] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const shuffledRef = useRef<string[] | null>(null);
  const tickIntervalRef = useRef<number>();
  const idCounterRef = useRef({ value: 0 });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [visibleLayers, setVisibleLayers] = useState<number[]>([]);

  const spiralItems = useMemo(() => {
    if (!shuffledRef.current || shuffledRef.current.length !== albumCovers.length) {
      shuffledRef.current = shuffleArray(albumCovers);
    }
    return buildLayerItems(shuffledRef.current, idCounterRef.current);
  }, [albumCovers]);

  useEffect(() => {
    const delays = [0, 150, 300, 450, 600, 750, 900];
    const timers: NodeJS.Timeout[] = [];
    delays.forEach((delay, layerIndex) => {
      const timer = setTimeout(() => {
        setVisibleLayers(prev => [...prev, layerIndex]);
      }, delay);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (story !== 'intro') return;
    tickIntervalRef.current = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 33);
    return () => {
      if (tickIntervalRef.current) window.clearInterval(tickIntervalRef.current);
    };
  }, [story]);

  const handleLetsGo = useCallback(() => {
    setVortex(true);
    setTransitioning(true);
    setTimeout(() => {
      setStory('slides');
    }, 2500);
  }, []);

  const handleSlidesComplete = useCallback(() => {
    setStory('done');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (story === 'done') {
      onClose();
    }
  }, [story, onClose]);

  const cssKeyframes = useMemo(() =>
    Array.from({ length: LAYER_COUNT }).map((_, i) => `
      @keyframes layerSpin${i} {
        from { transform: rotate(0deg); }
        to   { transform: rotate(${i % 2 === 0 ? 360 : -360}deg); }
      }
    `).join(''),
  []);

  if (story === 'slides') {
    return (
      <WrappedSlides
        totalMinutes={weeklyMinutes ?? totalMinutes ?? 0}
        artists={artists}
        albums={albums}
        songs={songs}
        albumCovers={albumCovers}
        connectionGraph={connectionGraph}
        onClose={handleSlidesComplete}
      />
    );
  }

  if (story === 'done') return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{ backgroundColor: '#050505' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <style>{cssKeyframes}</style>

      {/* Content wrapper with transition effects */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: transitioning ? 0 : 1,
          scale: transitioning ? 0 : 1,
          filter: transitioning ? 'blur(20px)' : 'blur(0px)'
        }}
        transition={{
          duration: transitioning ? 2.0 : 0.4,
          ease: transitioning ? [0.6, 0.05, 0.01, 0.99] : "easeOut"
        }}
      >

        {/* PrismaticBurst Background */}
        <motion.div
          className="absolute inset-0 z-[0]"
          style={{ opacity: 0.3 }}
          animate={{
            opacity: vortex ? [0.3, 0.6, 0.3] : 0.3,
            scale: vortex ? [1, 1.2, 0.8] : 1,
          }}
          transition={{
            duration: vortex ? 2.0 : 0,
            ease: [0.4, 0, 0.2, 1]
          }}
        >
          <PrismaticBurst
            intensity={vortex ? 2.0 : 1.0}
            speed={vortex ? 1.5 : 0.2}
            animationType="rotate3d"
            distort={vortex ? 6 : 2}
            mixBlendMode="lighten"
          />
        </motion.div>

        {/* Multi-layer spiral animation */}
        <div className="absolute inset-0 z-[1] flex items-center justify-center">
          {Array.from({ length: LAYER_COUNT }).map((_, layer) => {
            const layerItems = spiralItems.filter(item => item.layer === layer);
            const baseDuration = LAYER_DURATIONS[layer];
            const duration = vortex ? baseDuration / 4 : baseDuration;
            const size = LAYER_SIZES[layer];
            const isLayerVisible = visibleLayers.includes(layer);

            return (
              <div
                key={layer}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  animation: `layerSpin${layer} ${duration}s linear infinite`,
                  zIndex: layer,
                  opacity: isLayerVisible ? 1 : 0,
                  transition: 'opacity 0.6s ease-out',
                }}
              >
                {layerItems.map((item) => {
                  const elapsed = (currentTime / 1000 + item.indexInLayer * 0.22 + layer * 0.35) % VORTEX_DURATION;
                  const linearProgress = elapsed / VORTEX_DURATION;
                  const progress = linearProgress * linearProgress * linearProgress;
                  const currentRadius = MAX_RADIUS_VW * (1 - progress);
                  const scaleProgress = Math.pow(1 - linearProgress, 1.5);
                  const currentScale = LAYER_SCALES[layer] * scaleProgress;
                  const opacityProgress = 1 - Math.pow(linearProgress, 2);
                  const currentOpacity = LAYER_OPACITY[layer] * opacityProgress;
                  const rad = (item.angle * Math.PI) / 180;
                  const radiusPx = `min(${currentRadius}vw, ${currentRadius}vh)`;
                  const spiralRotation = linearProgress * 720;

                  const normalTransform = `translate(-50%, -50%) translate(calc(${Math.cos(rad)} * ${radiusPx}), calc(${Math.sin(rad)} * ${radiusPx})) scale(${currentScale}) rotate(${spiralRotation}deg)`;
                  const vortexTransform = `translate(-50%, -50%) scale(0) rotate(${1080 + layer * 360}deg)`;

                  return (
                    <motion.div
                      key={item.id}
                      className="absolute rounded-full overflow-hidden"
                      style={{
                        width: size,
                        height: size,
                        left: '50%',
                        top: '50%',
                        transform: vortex ? vortexTransform : normalTransform,
                        opacity: vortex ? 0 : (isLayerVisible ? currentOpacity : 0),
                        boxShadow: `0 2px 12px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.12)`,
                        willChange: 'transform, opacity',
                        transition: vortex
                          ? `transform 2.0s cubic-bezier(0.6,0.05,0.01,0.99) ${(item.indexInLayer * 0.04 + layer * 0.1).toFixed(2)}s, opacity 1.5s ease ${(item.indexInLayer * 0.04 + layer * 0.08).toFixed(2)}s`
                          : undefined,
                      }}
                      animate={{
                        filter: vortex ? ['blur(0px)', 'blur(4px)', 'blur(10px)'] : 'blur(0px)',
                      }}
                      transition={
                        vortex
                          ? {
                              filter: { duration: 2.0, ease: "easeIn", delay: (item.indexInLayer * 0.04 + layer * 0.08) }
                            }
                          : undefined
                      }
                    >
                      <img
                        src={item.src}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        draggable={false}
                      />
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Dark vignette — edges + center void where items vanish */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at center, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 15%, transparent 40%),
              radial-gradient(ellipse at center, transparent 50%, rgba(5,5,5,0.6) 75%, #050505 100%)
            `,
          }}
        />

        {/* Close Button */}
        <div className="fixed top-4 right-4 z-[10]">
          <button
            onClick={onClose}
            className="rounded-full border border-white/15 p-2 backdrop-blur-md text-white/60 hover:text-white hover:border-white/30 transition-all duration-200"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Hero Text + Let's Go Button */}
        <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center select-none">
          <motion.h1
            className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white text-center leading-none pointer-events-none"
            style={{ textShadow: '0 4px 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.5)' }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: vortex ? 0 : 1, y: vortex ? -40 : 0, scale: vortex ? 0.8 : 1 }}
            transition={{ duration: vortex ? 0.8 : 0.6, delay: vortex ? 0 : 0.2 }}
          >
            PUNKY WRAPPED<sup className="text-lg align-super opacity-50" aria-hidden="true">©</sup>
            <span className="sr-only"> copyright</span>
          </motion.h1>

          <motion.div
            className="mt-4 flex items-center gap-2 text-base sm:text-lg pointer-events-none"
            style={{ color: 'rgba(255,255,255,0.5)', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: vortex ? 0 : 1 }}
            transition={{ duration: 0.5, delay: vortex ? 0 : 0.4 }}
          >
            <span>your music journey awaits</span>
          </motion.div>

          <motion.p
            className="mt-2 text-sm sm:text-base pointer-events-none"
            style={{ color: 'rgba(255,255,255,0.42)', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: vortex ? 0 : 1 }}
            transition={{ duration: 0.5, delay: vortex ? 0 : 0.5 }}
          >
            {getWeekRange()}
          </motion.p>

          {/* Let's Go Button */}
          <AnimatePresence>
            {!vortex && (
              <motion.button
                onClick={handleLetsGo}
                className="mt-10 font-semibold text-white cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 50,
                  padding: '14px 52px',
                  fontSize: '16px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase' as const,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{
                  opacity: 0,
                  scale: 1.2,
                  filter: 'blur(4px)'
                }}
                transition={{
                  duration: 0.5,
                  delay: 0.6,
                  exit: { duration: 0.5, ease: [0.6, 0.05, 0.01, 0.99] }
                }}
                whileHover={{
                  scale: 1.05,
                  background: 'rgba(255,255,255,0.18)',
                  borderColor: 'rgba(255,255,255,0.35)',
                }}
                whileTap={{ scale: 0.95 }}
              >
                Let's Go
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PunkyWrapped;
