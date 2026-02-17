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
const LAYER_COUNT = 7;
const ITEMS_PER_LAYER = [15, 13, 11, 9, 7, 6, 4]; // outer → inner (increased density)
const LAYER_RADII_VW = [45, 38, 31, 24, 17, 11, 6]; // % of min(vw, vh) - more spacing
const LAYER_SIZES = [100, 85, 70, 55, 40, 28, 18]; // px, outer → inner - clearer size hierarchy
const LAYER_DURATIONS = [60, 50, 40, 32, 25, 19, 14]; // seconds per full rotation
const LAYER_SCALES = [1.0, 0.8, 0.6, 0.4, 0.3, 0.2, 0.1]; // scale per layer - proper hierarchy
const LAYER_OPACITY = [0.95, 0.88, 0.78, 0.65, 0.5, 0.35, 0.2]; // opacity per layer

// Vortex configuration
const VORTEX_DURATION = 7; // seconds for one full spiral from outer edge to center
const MAX_RADIUS_VW = 90; // Start at 90% of min(vw, vh)
const OPACITY_FADE_FACTOR = 0.5; // Stronger fade as items approach center
const VOID_SIZE = 150; // Size of visible void circle in pixels

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

function buildLayerItems(covers: string[], idCounter: { value: number }): SpiralItem[] {
  if (covers.length === 0) return [];
  const items: SpiralItem[] = [];
  let coverIdx = 0;
  const baseTime = Date.now();
  for (let layer = 0; layer < LAYER_COUNT; layer++) {
    const count = ITEMS_PER_LAYER[layer];
    for (let j = 0; j < count; j++) {
      items.push({
        src: covers[coverIdx % covers.length],
        angle: (360 / count) * j + layer * 18,
        layer,
        indexInLayer: j,
        id: `item-${idCounter.value++}`,
        spawnTime: baseTime,
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
  const idCounterRef = useRef({ value: 0 });
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [visibleLayers, setVisibleLayers] = useState<number[]>([]);

  const spiralItems = useMemo(() => {
    if (!shuffledRef.current || shuffledRef.current.length !== albumCovers.length) {
      shuffledRef.current = shuffleArray(albumCovers);
    }
    return buildLayerItems(shuffledRef.current, idCounterRef.current);
  }, [albumCovers]);

  // Initialize items
  useEffect(() => {
    setItems(spiralItems);
  }, [spiralItems]);

  // Staggered layer reveal on mount
  useEffect(() => {
    // Reveal layers from outer (0) to inner (4) with stagger
    const delays = [0, 200, 400, 600, 800]; // ms delay for each layer
    const timers: NodeJS.Timeout[] = [];
    
    delays.forEach((delay, layerIndex) => {
      const timer = setTimeout(() => {
        setVisibleLayers(prev => [...prev, layerIndex]);
      }, delay);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  // Animation loop for respawning items
  useEffect(() => {
    if (story !== 'intro') return;

    const animate = () => {
      const now = Date.now();
      setCurrentTime(now);
      setItems(prevItems => {
        return prevItems.map(item => {
          const elapsed = (now - item.spawnTime) / 1000; // seconds
          
          // Check if item has reached the center (completed its journey)
          if (elapsed >= VORTEX_DURATION) {
            // Respawn at outer edge with new spawn time
            const covers = shuffledRef.current || [];
            if (covers.length === 0) return item; // Safety check
            return {
              ...item,
              spawnTime: now,
              src: covers[Math.floor(Math.random() * covers.length)],
              id: `item-${idCounterRef.current.value++}`,
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
    setTransitioning(true);
    
    // Phase 1-3: Dramatic vortex collapse (2.5s total)
    // Phase 4: Transition to next screen
    setTimeout(() => {
      if (totalMinutes != null && totalMinutes > 0) {
        setStory('totalMinutes');
      } else {
        setStory('done');
      }
    }, 2500);
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
        style={{ opacity: 0.45 }}
        animate={{
          opacity: vortex ? [0.45, 0.8, 0.45] : 0.45,
          scale: vortex ? [1, 1.2, 0.8] : 1,
        }}
        transition={{
          duration: vortex ? 2.0 : 0,
          ease: [0.4, 0, 0.2, 1]
        }}
      >
        <PrismaticBurst
          intensity={vortex ? 2.0 : 1.2}
          speed={vortex ? 1.5 : 0.3}
          animationType="rotate3d"
          distort={vortex ? 6 : 3}
          mixBlendMode="lighten"
        />
      </motion.div>

      {/* Multi-layer spiral animation */}
      <div className="absolute inset-0 z-[1] flex items-center justify-center">
        {Array.from({ length: LAYER_COUNT }).map((_, layer) => {
          const layerItems = items.filter(item => item.layer === layer);
          const baseDuration = LAYER_DURATIONS[layer];
          const duration = vortex ? baseDuration / 4 : baseDuration; // 4x faster rotation in vortex mode
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
                transition: vortex ? 'animation-duration 0.5s' : undefined,
                opacity: isLayerVisible ? 1 : 0,
              }}
            >
              {layerItems.map((item) => {
                const elapsed = (currentTime - item.spawnTime) / 1000; // seconds
                const linearProgress = Math.min(elapsed / VORTEX_DURATION, 1); // 0 to 1
                
                // Exponential acceleration towards center (black hole effect)
                // Using cubic easing for dramatic speed increase near the center
                const progress = linearProgress * linearProgress * linearProgress;
                
                // Calculate radius with exponential acceleration
                const currentRadius = MAX_RADIUS_VW * (1 - progress);
                
                // Calculate scale with more dramatic shrinking near center
                const scaleProgress = Math.pow(1 - linearProgress, 1.5);
                const currentScale = LAYER_SCALES[layer] * scaleProgress;
                
                // Calculate opacity: fades out dramatically as it approaches center
                const opacityProgress = 1 - Math.pow(linearProgress, 2);
                const currentOpacity = LAYER_OPACITY[layer] * opacityProgress;
                
                const rad = (item.angle * Math.PI) / 180;
                const radiusPx = `min(${currentRadius}vw, ${currentRadius}vh)`;
                
                // Add rotation during spiral
                const spiralRotation = linearProgress * 720; // Two full rotations as it spirals in
                const normalTransform = `translate(-50%, -50%) translate(calc(${Math.cos(rad)} * ${radiusPx}), calc(${Math.sin(rad)} * ${radiusPx})) scale(${currentScale}) rotate(${spiralRotation}deg) rotate3d(1, 1, 0, ${10 + layer * 5}deg)`;
                const vortexTransform = `translate(-50%, -50%) scale(0) rotate(${1080 + layer * 360}deg) rotate3d(1,1,0,${60 + layer * 30}deg)`;
                const introScale = isLayerVisible ? 1 : 0;

                return (
                  <motion.div
                    key={item.id}
                    className="absolute rounded-lg overflow-hidden"
                    style={{
                      width: size,
                      height: size,
                      left: '50%',
                      top: '50%',
                      transform: vortex ? vortexTransform : normalTransform,
                      opacity: vortex ? 0 : (isLayerVisible ? currentOpacity : 0),
                      boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
                      willChange: 'transform, opacity',
                    }}
                    animate={{
                      filter: vortex ? ['blur(0px)', 'blur(4px)', 'blur(8px)'] : 'blur(0px)',
                    }}
                    transition={
                      vortex 
                        ? { 
                            transform: { duration: 2.0, ease: [0.6, 0.05, 0.01, 0.99] },
                            opacity: { duration: 2.0, ease: [0.4, 0, 1, 1] },
                            filter: { duration: 2.0, ease: "easeIn" }
                          }
                        : isLayerVisible 
                          ? { opacity: { duration: 0.4, ease: "easeOut" } }
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

      {/* Void / vignette overlay */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, transparent 35%, #050505 75%)',
        }}
      />

      {/* Visible Void Circle at Center - Black Hole Effect */}
      <div className="absolute inset-0 z-[3] flex items-center justify-center pointer-events-none">
        <motion.div
          className="rounded-full"
          style={{
            width: VOID_SIZE,
            height: VOID_SIZE,
            background: 'radial-gradient(circle at center, #000000 0%, #0a0a0a 30%, rgba(20,20,40,0.8) 60%, transparent 100%)',
          }}
          animate={vortex ? {
            rotate: 360,
            scale: [1, 1.3, 1.5, 0],
            boxShadow: [
              `inset 0 0 30px rgba(100, 100, 255, 0.3), inset 0 0 50px rgba(50, 50, 150, 0.2), 0 0 40px rgba(80, 80, 200, 0.2), 0 0 60px rgba(60, 60, 180, 0.1)`,
              `inset 0 0 50px rgba(150, 150, 255, 0.6), inset 0 0 80px rgba(100, 100, 220, 0.4), 0 0 80px rgba(150, 150, 255, 0.5), 0 0 120px rgba(120, 120, 230, 0.3)`,
              `inset 0 0 80px rgba(200, 200, 255, 0.9), inset 0 0 120px rgba(150, 150, 255, 0.6), 0 0 150px rgba(200, 200, 255, 0.8), 0 0 200px rgba(180, 180, 255, 0.5)`,
              `inset 0 0 100px rgba(255, 255, 255, 1.0), inset 0 0 150px rgba(200, 200, 255, 0.8), 0 0 200px rgba(255, 255, 255, 1.0), 0 0 250px rgba(220, 220, 255, 0.7)`,
            ]
          } : {
            rotate: 360,
            boxShadow: [
              `inset 0 0 30px rgba(100, 100, 255, 0.3), inset 0 0 50px rgba(50, 50, 150, 0.2), 0 0 40px rgba(80, 80, 200, 0.2), 0 0 60px rgba(60, 60, 180, 0.1)`,
              `inset 0 0 35px rgba(120, 100, 255, 0.4), inset 0 0 55px rgba(70, 50, 180, 0.25), 0 0 45px rgba(100, 80, 220, 0.25), 0 0 70px rgba(80, 60, 200, 0.15)`,
              `inset 0 0 30px rgba(100, 100, 255, 0.3), inset 0 0 50px rgba(50, 50, 150, 0.2), 0 0 40px rgba(80, 80, 200, 0.2), 0 0 60px rgba(60, 60, 180, 0.1)`,
            ]
          }}
          transition={vortex ? {
            rotate: { duration: 2.0, ease: "easeIn" },
            scale: { duration: 2.0, ease: [0.6, 0.05, 0.01, 0.99], times: [0, 0.4, 0.7, 1] },
            boxShadow: { duration: 2.0, ease: "easeIn", times: [0, 0.4, 0.7, 1] }
          } : {
            rotate: { duration: 8, repeat: Infinity, ease: "linear" },
            boxShadow: { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          {/* Inner swirl effect */}
          <motion.div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, transparent 0deg, rgba(80, 80, 200, 0.15) 90deg, transparent 180deg, rgba(100, 80, 220, 0.1) 270deg, transparent 360deg)',
            }}
            animate={{
              rotate: -360,
              opacity: vortex ? [1, 1, 0] : 1,
            }}
            transition={vortex ? {
              rotate: { duration: 2.0, ease: "easeIn" },
              opacity: { duration: 2.0, ease: "easeIn" }
            } : {
              rotate: { duration: 3, repeat: Infinity, ease: "linear" }
            }}
          />
        </motion.div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

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
              exit={{ 
                opacity: 0, 
                scale: 1.2,
                filter: 'blur(4px)'
              }}
              transition={{ 
                initial: { duration: 0.5, delay: 0.6 },
                exit: { duration: 0.5, ease: [0.6, 0.05, 0.01, 0.99] }
              }}
              whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.25)' }}
              whileTap={{ scale: 0.95 }}
            >
              Let's Go!
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      </motion.div> {/* Close content wrapper */}
    </motion.div>
  );
};

export default PunkyWrapped;
