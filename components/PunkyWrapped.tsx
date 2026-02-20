import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import WrappedSlides from './WrappedSlides';
import { Artist, Album, Song } from '../types';

interface PunkyWrappedProps {
  onClose: () => void;
  albumCovers: string[];
  totalMinutes?: number;
  weeklyMinutes?: number;
  rangeLabel?: string;
  rangeStart?: string;
  rangeEnd?: string;
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

const PunkyWrapped: React.FC<PunkyWrappedProps> = ({ onClose, albumCovers, totalMinutes, weeklyMinutes, rangeLabel, rangeStart, rangeEnd, artists = [], albums = [], songs = [], connectionGraph }) => {
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
        rangeLabel={rangeLabel}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
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
      style={{ backgroundColor: '#0D0D0D' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <style>{cssKeyframes + `
        @keyframes tickerIntro { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes introGlitch { 0%,97%,100%{transform:translate(0)} 98%{transform:translate(-4px,2px)} 99%{transform:translate(4px,-2px)} }
      `}</style>

      {/* Content wrapper with transition effects */}
      <motion.div
        className="absolute inset-0"
        animate={{
          opacity: transitioning ? 0 : 1,
          scale: transitioning ? 0.05 : 1,
          filter: transitioning ? 'blur(24px)' : 'blur(0px)'
        }}
        transition={{
          duration: transitioning ? 1.8 : 0.4,
          ease: transitioning ? [0.6, 0.05, 0.01, 0.99] : "easeOut"
        }}
      >
        {/* Album cover mosaic rows in background */}
        <div className="absolute inset-0 z-[0] overflow-hidden" style={{ opacity: 0.18 }}>
          {[0, 1, 2].map((row) => {
            const rowCovers = shuffledRef.current
              ? shuffledRef.current.slice(row * 12, row * 12 + 24)
              : albumCovers.slice(row * 12, row * 12 + 24);
            const repeated = [...rowCovers, ...rowCovers, ...rowCovers];
            const duration = 18 + row * 5;
            const direction = row % 2 === 0 ? 1 : -1;
            return (
              <div key={row} style={{ display: 'flex', gap: 4, marginBottom: 4, animation: `tickerIntro ${duration}s linear infinite`, animationDirection: direction > 0 ? 'normal' : 'reverse' }}>
                {repeated.map((src, i) => (
                  <img key={i} src={src} alt="" role="presentation" style={{ width: 80, height: 80, objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.06)' }} loading="lazy" draggable={false} />
                ))}
              </div>
            );
          })}
        </div>

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
                      style={{
                        position: 'absolute',
                        width: size,
                        height: size,
                        left: '50%',
                        top: '50%',
                        transform: vortex ? vortexTransform : normalTransform,
                        opacity: vortex ? 0 : (isLayerVisible ? currentOpacity : 0),
                        boxShadow: `0 2px 12px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.12)`,
                        willChange: 'transform, opacity',
                        transition: vortex
                          ? `transform 1.8s cubic-bezier(0.6,0.05,0.01,0.99) ${(item.indexInLayer * 0.04 + layer * 0.1).toFixed(2)}s, opacity 1.4s ease ${(item.indexInLayer * 0.04 + layer * 0.08).toFixed(2)}s`
                          : undefined,
                        overflow: 'hidden',
                        borderRadius: 2,
                      }}
                      animate={{
                        filter: vortex ? ['blur(0px)', 'blur(4px)', 'blur(10px)'] : 'blur(0px)',
                      }}
                      transition={
                        vortex
                          ? { filter: { duration: 1.8, ease: "easeIn", delay: (item.indexInLayer * 0.04 + layer * 0.08) } }
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

        {/* Dark vignette */}
        <div
          className="absolute inset-0 z-[2] pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse at center, rgba(13,13,13,0.85) 0%, rgba(13,13,13,0.5) 20%, transparent 50%),
              radial-gradient(ellipse at center, transparent 45%, rgba(13,13,13,0.7) 78%, #0D0D0D 100%)
            `,
          }}
        />

        {/* Bottom ticker belt */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, height: 36, background: '#CCFF00', overflow: 'hidden', display: 'flex', alignItems: 'center', borderTop: '3px solid #000' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'tickerIntro 16s linear infinite', fontFamily: "'Barlow Condensed', Impact, sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#000' }}>
            {Array(16).fill('PUNKY WRAPPED  ✶  YOUR MUSIC YEAR  ✶  ').join('')}
          </div>
        </div>

        {/* Close Button */}
        <div className="fixed top-4 right-4 z-[10]">
          <button
            onClick={onClose}
            style={{ width: 36, height: 36, background: '#fff', border: '3px solid #000', boxShadow: '3px 3px 0 #000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
            aria-label="Close"
          >
            <X size={18} color="#000" />
          </button>
        </div>

        {/* Hero Text + Let's Go Button */}
        <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center select-none" style={{ paddingBottom: 44 }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: vortex ? 0 : 1, y: vortex ? -40 : 0, scale: vortex ? 0.8 : 1 }}
            transition={{ duration: vortex ? 0.8 : 0.6, delay: vortex ? 0 : 0.2 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{ display: 'inline-block', background: '#CCFF00', border: '4px solid #000', boxShadow: '6px 6px 0 #000', padding: '4px 20px 2px', marginBottom: 12 }}>
              <span style={{ fontFamily: "'Barlow Condensed', Impact, sans-serif", fontWeight: 900, fontSize: 'clamp(10px, 2.2vw, 14px)', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#000' }}>{getWeekRange()}</span>
            </div>
            <h1
              style={{
                fontFamily: "'Barlow Condensed', Impact, sans-serif",
                fontWeight: 900,
                fontSize: 'clamp(64px, 18vw, 130px)',
                color: '#fff',
                textTransform: 'uppercase',
                lineHeight: 0.88,
                margin: 0,
                letterSpacing: '-0.02em',
                textShadow: '6px 6px 0 #000, -2px -2px 0 #000',
                animation: 'introGlitch 6s ease infinite',
              }}
            >
              PUNKY<br />
              <span style={{ color: '#CCFF00', textShadow: '6px 6px 0 #000, -2px -2px 0 #000' }}>WRAPPED</span>
            </h1>
          </motion.div>

          <AnimatePresence>
            {!vortex && (
              <motion.button
                onClick={handleLetsGo}
                style={{
                  marginTop: 32,
                  background: '#CCFF00',
                  border: '4px solid #000',
                  boxShadow: '5px 5px 0 #000',
                  padding: '14px 52px',
                  fontFamily: "'Barlow Condensed', Impact, sans-serif",
                  fontWeight: 900,
                  fontSize: 18,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase' as const,
                  color: '#000',
                  cursor: 'pointer',
                  borderRadius: 0,
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.2, filter: 'blur(4px)' }}
                transition={{ duration: 0.5, delay: 0.5 }}
                whileHover={{ scale: 1.04, boxShadow: '7px 7px 0 #000' }}
                whileTap={{ scale: 0.95, boxShadow: '2px 2px 0 #000' }}
              >
                LET'S GO →
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PunkyWrapped;
