import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import PrismaticBurst from './reactbits/PrismaticBurst';
import { TotalMinutesStory } from './TotalMinutesStory';

interface PunkyWrappedProps {
  onClose: () => void;
  albumCovers: string[];
  totalMinutes?: number;
}

// --- Configuration ---
const LAYER_COUNT = 5;
const ITEMS_PER_LAYER = [12, 10, 8, 8, 6]; // outer → inner
const LAYER_RADII_VW = [42, 33, 24, 16, 9]; // % of min(vw, vh)
const LAYER_SIZES = [90, 75, 58, 42, 28]; // px, outer → inner
const LAYER_DURATIONS = [55, 45, 35, 28, 20]; // seconds per full rotation
const LAYER_SCALES = [1.0, 0.8, 0.6, 0.4, 0.15]; // scale per layer
const LAYER_OPACITY = [0.95, 0.85, 0.7, 0.5, 0.25]; // opacity per layer

// Vortex configuration
const VORTEX_DURATION = 8; // seconds for one full spiral from outer edge to center
const MAX_RADIUS_VW = 90; // Start at 90% of min(vw, vh)

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
  id: string; // unique identifier for tracking respawns
  spawnTime: number; // timestamp when item was spawned
}

function buildLayerItems(covers: string[]): SpiralItem[] {
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
        id: `${layer}-${j}-${Date.now()}-${Math.random()}`,
        spawnTime: Date.now(),
      });
      coverIdx++;
    }
  }
  return items;
}

const PunkyWrapped: React.FC<PunkyWrappedProps> = ({ onClose, albumCovers, totalMinutes }) => {
  const [story, setStory] = useState<'intro' | 'totalMinutes' | 'done'>('intro');
  const [vortex, setVortex] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const shuffledRef = useRef<string[] | null>(null);
  const [items, setItems] = useState<SpiralItem[]>([]);
  const animationFrameRef = useRef<number>();

  const spiralItems = useMemo(() => {
    if (!shuffledRef.current || shuffledRef.current.length !== albumCovers.length) {
      shuffledRef.current = shuffleArray(albumCovers);
    }
    return buildLayerItems(shuffledRef.current);
  }, [albumCovers]);

  // Initialize items
  useEffect(() => {
    setItems(spiralItems);
  }, [spiralItems]);

  // Animation loop for respawning items
  useEffect(() => {
    if (story !== 'intro') return;

    const animate = () => {
      setItems(prevItems => {
        const now = Date.now();
        return prevItems.map(item => {
          const elapsed = (now - item.spawnTime) / 1000; // seconds
          
          // Check if item has reached the center (completed its journey)
          if (elapsed >= VORTEX_DURATION) {
            // Respawn at outer edge with new spawn time
            return {
              ...item,
              spawnTime: now,
              src: shuffledRef.current![Math.floor(Math.random() * shuffledRef.current!.length)],
            };
          }
          
          return item;
        });
      });
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [story]);

  const handleLetsGo = useCallback(() => {
    setVortex(true);
    setTimeout(() => {
      setTransitioning(true);
      setTimeout(() => {
        if (totalMinutes != null && totalMinutes > 0) {
          setStory('totalMinutes');
        } else {
          setStory('done');
        }
      }, 600);
    }, 1500);
  }, [totalMinutes]);

  const handleTotalMinutesComplete = useCallback(() => {
    setStory('done');
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (story === 'done' && !(totalMinutes != null && totalMinutes > 0)) {
      onClose();
    }
  }, [story, totalMinutes, onClose]);

  // CSS keyframes for continuous layer rotation (static, only computed once)
  const cssKeyframes = useMemo(() =>
    Array.from({ length: LAYER_COUNT }).map((_, i) => `
      @keyframes layerSpin${i} {
        from { transform: rotate(0deg); }
        to   { transform: rotate(${i % 2 === 0 ? 360 : -360}deg); }
      }
    `).join(''),
  []);

  if (story === 'totalMinutes') {
    return (
      <TotalMinutesStory
        totalMinutes={totalMinutes ?? 0}
        albumCovers={albumCovers}
        onComplete={handleTotalMinutesComplete}
      />
    );
  }

  if (story === 'done') return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{ backgroundColor: '#050505' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: transitioning ? 0 : 1, scale: transitioning ? 0.8 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: transitioning ? 0.6 : 0.4 }}
    >
      <style>{cssKeyframes}</style>

      {/* PrismaticBurst Background */}
      <div className="absolute inset-0 z-[0]" style={{ opacity: 0.45 }}>
        <PrismaticBurst
          intensity={1.2}
          speed={0.3}
          animationType="rotate3d"
          distort={3}
          mixBlendMode="lighten"
        />
      </div>

      {/* Multi-layer spiral animation */}
      <div className="absolute inset-0 z-[1] flex items-center justify-center">
        {Array.from({ length: LAYER_COUNT }).map((_, layer) => {
          const layerItems = items.filter(item => item.layer === layer);
          const duration = vortex
            ? LAYER_DURATIONS[layer] / 5
            : LAYER_DURATIONS[layer];
          const size = LAYER_SIZES[layer];

          return (
            <div
              key={layer}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                animation: `layerSpin${layer} ${duration}s linear infinite`,
                zIndex: layer,
                transition: vortex ? 'animation-duration 0.5s' : undefined,
              }}
            >
              {layerItems.map((item) => {
                const now = Date.now();
                const elapsed = (now - item.spawnTime) / 1000; // seconds
                const progress = Math.min(elapsed / VORTEX_DURATION, 1); // 0 to 1
                
                // Calculate radius: starts at MAX_RADIUS_VW, decreases to 0
                const currentRadius = MAX_RADIUS_VW * (1 - progress);
                
                // Calculate scale: starts at 1, decreases to 0
                const currentScale = LAYER_SCALES[layer] * (1 - progress);
                
                // Calculate opacity: fades out as it approaches center
                const currentOpacity = LAYER_OPACITY[layer] * (1 - progress * 0.3);
                
                const rad = (item.angle * Math.PI) / 180;
                const radiusPx = `min(${currentRadius}vw, ${currentRadius}vh)`;
                
                const normalTransform = `translate(-50%, -50%) translate(calc(${Math.cos(rad)} * ${radiusPx}), calc(${Math.sin(rad)} * ${radiusPx})) scale(${currentScale}) rotate3d(1, 1, 0, ${10 + layer * 5}deg)`;
                const vortexTransform = `translate(-50%, -50%) scale(0) rotate3d(1,1,0,${60 + layer * 30}deg)`;

                return (
                  <div
                    key={item.id}
                    className="absolute rounded-lg overflow-hidden"
                    style={{
                      width: size,
                      height: size,
                      left: '50%',
                      top: '50%',
                      transform: vortex ? vortexTransform : normalTransform,
                      opacity: vortex ? 0 : currentOpacity,
                      transition: vortex ? 'transform 1.5s cubic-bezier(0.4,0,0.2,1), opacity 1.5s ease' : undefined,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                    }}
                  >
                    <img
                      src={item.src}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Void / vignette overlay */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, transparent 35%, #050505 75%)',
        }}
      />

      {/* Close Button */}
      <div className="fixed top-4 right-4 z-[10]">
        <button
          onClick={onClose}
          className="rounded-full border border-white/20 p-2 backdrop-blur-md text-white/70 hover:text-white transition-colors"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Hero Text + Let's Go Button */}
      <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center select-none">
        <motion.h1
          className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white text-center leading-none pointer-events-none"
          style={{ textShadow: '0 4px 20px rgba(0,0,0,0.8)' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: vortex ? 0 : 1, y: vortex ? -40 : 0, scale: vortex ? 0.8 : 1 }}
          transition={{ duration: vortex ? 0.8 : 0.6, delay: vortex ? 0 : 0.2 }}
        >
          PUNKY WRAPPED<sup className="text-lg align-super" aria-hidden="true">©</sup>
          <span className="sr-only"> copyright</span>
        </motion.h1>

        <motion.div
          className="mt-4 flex items-center gap-2 text-base sm:text-lg pointer-events-none"
          style={{ color: 'rgba(255,255,255,0.7)', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: vortex ? 0 : 1 }}
          transition={{ duration: 0.5, delay: vortex ? 0 : 0.4 }}
        >
          <span>a music journey</span>
        </motion.div>

        {/* Let's Go Button */}
        <AnimatePresence>
          {!vortex && (
            <motion.button
              onClick={handleLetsGo}
              className="mt-8 font-bold text-white cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: 30,
                padding: '16px 48px',
                fontSize: '18px',
                textShadow: '0 1px 4px rgba(0,0,0,0.4)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.3 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.25)' }}
              whileTap={{ scale: 0.95 }}
            >
              Let's Go!
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default PunkyWrapped;
