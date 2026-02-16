import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface PunkyWrappedProps {
  onClose: () => void;
  albumCovers: string[];
}

const SPIRAL_RINGS = 5;
const ITEMS_PER_RING = 8;

function shuffleArray(arr: string[]): string[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getSpiralItems(shuffledCovers: string[]) {
  if (shuffledCovers.length === 0) return [];

  const items: { src: string; angle: number; radius: number; size: number; ring: number; indexInRing: number }[] = [];
  const totalNeeded = SPIRAL_RINGS * ITEMS_PER_RING;
  
  // Use only unique covers, don't repeat
  const uniqueCovers = shuffledCovers.slice(0, Math.min(totalNeeded, shuffledCovers.length));

  for (let ring = 0; ring < SPIRAL_RINGS; ring++) {
    const radius = 450 - ring * 70; // Wider spacing between rings
    const baseSize = 120 - ring * 15; // More dramatic size reduction
    const size = Math.max(baseSize, 30);

    for (let j = 0; j < ITEMS_PER_RING; j++) {
      const globalIndex = ring * ITEMS_PER_RING + j;
      
      // Stop if we run out of unique covers
      if (globalIndex >= uniqueCovers.length) break;
      
      const angle = (360 / ITEMS_PER_RING) * j + ring * 25; // More spiral offset
      items.push({
        src: uniqueCovers[globalIndex],
        angle,
        radius,
        size,
        ring,
        indexInRing: j,
      });
    }
  }
  return items;
}

const PunkyWrapped: React.FC<PunkyWrappedProps> = ({ onClose, albumCovers }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const shuffledRef = useRef<string[] | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    setMousePos({ x, y });
  };

  const spiralItems = useMemo(() => {
    if (!shuffledRef.current || shuffledRef.current.length !== albumCovers.length) {
      shuffledRef.current = shuffleArray(albumCovers);
    }
    return getSpiralItems(shuffledRef.current);
  }, [albumCovers]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{ backgroundColor: '#050505' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onMouseMove={handleMouseMove}
    >
      <style>{`
        @keyframes spiralInward {
          0% { 
            transform: rotate(0deg) scale(1);
          }
          100% { 
            transform: rotate(360deg) scale(0.3);
          }
        }
      `}</style>

      {/* Spiral Inward Animation */}
      <div className="absolute inset-0 z-[1] flex items-center justify-center">
        {Array.from({ length: SPIRAL_RINGS }).map((_, ring) => {
          const ringItems = spiralItems.filter(item => item.ring === ring);
          const duration = 15 + ring * 3; // Faster animation
          const delay = ring * 0.5; // Stagger each ring
          const direction = ring % 2 === 0 ? 'normal' : 'reverse';

          return (
            <div
              key={ring}
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                animation: `spiralInward ${duration}s ease-in-out infinite ${direction}`,
                animationDelay: `${delay}s`,
                transform: `translate(${mousePos.x * (1 - ring * 0.1)}px, ${mousePos.y * (1 - ring * 0.1)}px)`,
              }}
            >
              {ringItems.map((item, j) => {
                const rad = (item.angle * Math.PI) / 180;
                const cx = Math.cos(rad) * item.radius;
                const cy = Math.sin(rad) * item.radius;
                const opacity = 1 - (item.ring / SPIRAL_RINGS) * 0.5; // Less fade for better visibility

                return (
                  <div
                    key={`${ring}-${j}`}
                    className="absolute rounded-lg overflow-hidden shadow-lg"
                    style={{
                      width: item.size,
                      height: item.size,
                      left: '50%',
                      top: '50%',
                      transform: `translate(-50%, -50%) translate(${cx}px, ${cy}px)`,
                      opacity,
                    }}
                  >
                    <img
                      src={item.src}
                      alt="Album cover"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Vignette Overlay */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 15%, #050505 70%)',
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

      {/* Hero Text */}
      <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center pointer-events-none select-none">
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white text-center leading-none">
          PUNKY WRAPPED<sup className="text-lg align-super" aria-hidden="true">©</sup><span className="sr-only"> copyright</span>
        </h1>

        <div className="mt-4 flex items-center gap-2 text-white/70 text-base sm:text-lg">
          <span>a music journey</span>
        </div>
      </div>
    </motion.div>
  );
};

export default PunkyWrapped;
