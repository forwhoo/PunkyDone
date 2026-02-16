import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface PunkyWrappedProps {
  onClose: () => void;
  albumCovers: string[];
}

const words = ['creatives', 'designers', 'curators', 'artists'];

const IMAGE_COUNT = 18;

function getOrbitItems(albumCovers: string[]) {
  if (albumCovers.length === 0) return [];
  const items: { src: string; angle: number; radius: number; size: number; rotateX: number; rotateY: number }[] = [];
  for (let i = 0; i < IMAGE_COUNT; i++) {
    const angle = (360 / IMAGE_COUNT) * i;
    const radius = 260 + (i % 3) * 60;
    const sizes = [80, 96, 112, 128];
    const size = sizes[i % sizes.length];
    items.push({
      src: albumCovers[i % albumCovers.length],
      angle,
      radius,
      size,
      rotateX: (i % 5) * 8 - 16,
      rotateY: (i % 7) * 6 - 18,
    });
  }
  return items;
}

const PunkyWrapped: React.FC<PunkyWrappedProps> = ({ onClose, albumCovers }) => {
  const [wordIndex, setWordIndex] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 30;
    const y = (e.clientY / window.innerHeight - 0.5) * 30;
    setMousePos({ x, y });
  };

  const orbitItems = getOrbitItems(albumCovers);

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
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Layer 1 – Orbital Image Cloud */}
      <div className="absolute inset-0 z-[1] flex items-center justify-center">
        <div
          style={{
            animation: 'orbit 60s linear infinite',
            transform: `translate(${mousePos.x}px, ${mousePos.y}px)`,
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          {orbitItems.map((item, i) => {
            const rad = (item.angle * Math.PI) / 180;
            const cx = Math.cos(rad) * item.radius;
            const cy = Math.sin(rad) * item.radius;
            const distRatio = item.radius / 380;
            const opacity = 1 - distRatio * 0.55;

            return (
              <div
                key={i}
                className="absolute rounded-xl overflow-hidden"
                style={{
                  width: item.size,
                  height: item.size,
                  left: '50%',
                  top: '50%',
                  transform: `translate(-50%, -50%) translate(${cx}px, ${cy}px) perspective(800px) rotateX(${item.rotateX}deg) rotateY(${item.rotateY}deg)`,
                  opacity,
                }}
              >
                <img
                  src={item.src}
                  alt={`Album cover ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Vignette Overlay */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 20%, #050505 75%)',
        }}
      />

      {/* Layer 2 – Navbar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[10]">
        <div className="flex items-center gap-4 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <button type="button" className="text-white/70 text-sm cursor-pointer hover:text-white transition-colors bg-transparent border-none p-0">Manifesto</button>
          <button type="button" className="text-white/70 text-sm cursor-pointer hover:text-white transition-colors bg-transparent border-none p-0">Careers</button>
          <button className="text-white text-sm px-3 py-1 rounded-full bg-transparent border border-white/20 hover:border-white/40 transition-colors">
            Sign In
          </button>
          <button className="bg-white text-black text-sm font-medium px-4 py-1 rounded-full hover:bg-white/90 transition-colors">
            Join Waitlist
          </button>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors ml-1"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Layer 2 – Hero Text */}
      <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center pointer-events-none select-none">
        <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tighter text-white text-center leading-none">
          PUNKY WRAPPED<sup className="text-lg align-super" aria-hidden="true">©</sup><span className="sr-only"> copyright</span>
        </h1>

        <div className="mt-4 flex items-center gap-2 text-white/70 text-base sm:text-lg">
          <span>A music journey for</span>
          <span className="inline-flex items-center rounded-full border border-white/20 px-4 py-1 overflow-hidden h-8 relative">
            <AnimatePresence mode="wait">
              <motion.span
                key={words[wordIndex]}
                className="text-white font-medium"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                {words[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
        </div>
      </div>

      {/* Bottom UI – Dark / Light Toggle */}
      <div className="fixed bottom-4 left-4 z-[10]">
        <button
          onClick={() => setDarkMode((v) => !v)}
          className="rounded-full border border-white/20 px-3 py-1.5 text-sm flex items-center gap-1 pointer-events-auto backdrop-blur-sm"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
        >
          <span className={darkMode ? 'text-white' : 'text-white/40'}>Dark</span>
          <span className="text-white/40">|</span>
          <span className={darkMode ? 'text-white/40' : 'text-white'}>Light</span>
        </button>
      </div>
    </motion.div>
  );
};

export default PunkyWrapped;
