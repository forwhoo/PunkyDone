import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, useAnimation } from 'framer-motion';
import ColorBends from './reactbits/ColorBends';
import './TotalMinutesStory.css';

interface TotalMinutesStoryProps {
  totalMinutes: number;
  albumCovers: string[];
  onComplete: () => void;
}

interface NodePosition {
  x: number;
  y: number;
  delay: number;
  img: string;
}

const MAX_NODES = 25;
const NODE_SIZE = 80;
const NODE_FLY_STAGGER_MS = 140; // Slightly longer for better rhythm
const NODE_JOURNEY_MS = 600; // Longer journey for more dramatic effect
const NODE_CONSUME_MS = 250;
const HOLD_DURATION_MS = 2500;
const OPENING_DURATION_MS = 2000; // Duration for firework opening

function generateScatteredPositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  const radiusX = cx * 0.7;
  const radiusY = cy * 0.7;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const r = 0.5 + Math.random() * 0.5;
    positions.push({
      x: cx + Math.cos(angle) * radiusX * r - NODE_SIZE / 2,
      y: cy + Math.sin(angle) * radiusY * r - NODE_SIZE / 2,
    });
  }
  return positions;
}

export const TotalMinutesStory: React.FC<TotalMinutesStoryProps> = ({
  totalMinutes,
  albumCovers,
  onComplete,
}) => {
  const nodeCount = Math.min(albumCovers.length, MAX_NODES);
  const covers = useMemo(() => albumCovers.slice(0, nodeCount), [albumCovers, nodeCount]);
  const minutesPerNode = totalMinutes / nodeCount;

  const [nodes, setNodes] = useState<NodePosition[]>([]);
  const [consumedNodes, setConsumedNodes] = useState<Set<number>>(new Set());
  const [displayCount, setDisplayCount] = useState(0);
  const [phase, setPhase] = useState<'opening' | 'initial' | 'flying' | 'final'>('opening');
  const [showCounter, setShowCounter] = useState(false);
  const [showNodes, setShowNodes] = useState(false);

  const counterRef = useRef(0);
  const targetCountRef = useRef(0);
  const rafRef = useRef<number>(0);
  const counterControls = useAnimation();
  const [counterPulse, setCounterPulse] = useState(0);

  // Generate initial node positions
  useEffect(() => {
    const positions = generateScatteredPositions(nodeCount);
    setNodes(
      covers.map((img, i) => ({
        x: positions[i].x,
        y: positions[i].y,
        delay: i * NODE_FLY_STAGGER_MS,
        img,
      }))
    );
  }, [covers, nodeCount]);

  // Smooth counter animation via requestAnimationFrame
  const animateCounter = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const step = () => {
      const target = targetCountRef.current;
      const current = counterRef.current;
      if (current < target) {
        const diff = target - current;
        const increment = Math.max(1, Math.ceil(diff * 0.15));
        counterRef.current = Math.min(current + increment, target);
        setDisplayCount(Math.round(counterRef.current));
        rafRef.current = requestAnimationFrame(step);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  // Main animation sequence
  useEffect(() => {
    if (nodes.length === 0) return;

    // Phase 0: Opening firework burst (0-2s)
    const openingTimer = setTimeout(() => {
      setShowNodes(true);
      setPhase('initial');
    }, OPENING_DURATION_MS);

    // Phase 1: Show nodes and counter (2-3s)
    const showTimer = setTimeout(() => {
      setShowCounter(true);
      setPhase('flying');
    }, OPENING_DURATION_MS + 1000);

    return () => {
      clearTimeout(openingTimer);
      clearTimeout(showTimer);
    };
  }, [nodes]);

  // Flying phase: consume nodes one at a time
  useEffect(() => {
    if (phase !== 'flying' || nodes.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    nodes.forEach((_, i) => {
      const timer = setTimeout(() => {
        setConsumedNodes((prev) => {
          const next = new Set(prev);
          next.add(i);
          return next;
        });
        targetCountRef.current = Math.round(minutesPerNode * (i + 1));
        animateCounter();
        
        // Trigger counter pulse effect
        setCounterPulse(prev => prev + 1);

        // After last node consumed, enter final phase
        if (i === nodes.length - 1) {
          const finalTimer = setTimeout(() => {
            targetCountRef.current = totalMinutes;
            animateCounter();
            setPhase('final');
          }, NODE_JOURNEY_MS + NODE_CONSUME_MS);
          timers.push(finalTimer);
        }
      }, i * NODE_FLY_STAGGER_MS);
      timers.push(timer);
    });

    return () => timers.forEach(clearTimeout);
  }, [phase, nodes, minutesPerNode, totalMinutes, animateCounter]);

  // Final phase: pulse and call onComplete
  useEffect(() => {
    if (phase !== 'final') return;

    counterControls.start({
      scale: [1, 1.15, 1],
      transition: { duration: 0.8, ease: 'easeInOut', times: [0, 0.4, 1] },
    });

    const completeTimer = setTimeout(onComplete, HOLD_DURATION_MS);
    return () => clearTimeout(completeTimer);
  }, [phase, onComplete, counterControls]);
  
  // Pulse effect when nodes are consumed
  useEffect(() => {
    if (counterPulse === 0) return;
    
    counterControls.start({
      scale: [1, 1.05, 1],
      transition: { duration: 0.2, ease: [0.68, -0.55, 0.265, 1.55] }
    });
  }, [counterPulse, counterControls]);

  // Cleanup raf on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const [centerX, setCenterX] = useState(0);
  const [centerY, setCenterY] = useState(0);

  useEffect(() => {
    const updateCenter = () => {
      setCenterX(window.innerWidth / 2 - NODE_SIZE / 2);
      setCenterY(window.innerHeight / 2 - NODE_SIZE / 2);
    };
    updateCenter();
    window.addEventListener('resize', updateCenter);
    return () => window.removeEventListener('resize', updateCenter);
  }, []);

  const hours = Math.floor(totalMinutes / 60);

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden" style={{ backgroundColor: '#000000' }}>
      {/* Animated Grid Background */}
      <div className="absolute inset-0 z-[0]" style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        animation: 'gridPulse 4s ease-in-out infinite',
      }} />
      
      {/* Radial Gradient Overlay for Depth */}
      <div className="absolute inset-0 z-[0]" style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%)',
      }} />

      {/* ColorBends Background - More Subtle */}
      <div className="absolute inset-0 z-[0]" style={{ opacity: 0.15 }}>
        <ColorBends
          rotation={45}
          speed={0.2}
          colors={['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F']}
          transparent={true}
          autoRotate={0.3}
          scale={1.2}
          frequency={1.2}
          warpStrength={0.5}
          mouseInfluence={0.2}
          parallax={0.1}
          noise={0.03}
        />
      </div>
      
      <style>{`
        @keyframes gridPulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.8;
          }
        }
      `}</style>
      
      {/* Opening Firework Burst Effect */}
      {phase === 'opening' && (
        <motion.div
          className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Center explosion flash */}
          <motion.div
            className="absolute"
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(200,200,255,0.8) 40%, transparent 70%)',
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ 
              scale: [0, 30, 50],
              opacity: [1, 0.6, 0]
            }}
            transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
          />
          
          {/* Radial shockwave rings */}
          {[0, 0.2, 0.4].map((delay, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.4)',
              }}
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ 
                scale: [0, 15],
                opacity: [0.8, 0]
              }}
              transition={{ 
                duration: 1.8, 
                delay,
                ease: "easeOut"
              }}
            />
          ))}
          
          {/* Particle burst */}
          {Array.from({ length: 40 }).map((_, i) => {
            const angle = (i / 40) * Math.PI * 2;
            const distance = 200 + Math.random() * 300;
            const colors = [
              'rgba(255, 80, 80, 0.8)',
              'rgba(255, 160, 80, 0.8)',
              'rgba(255, 220, 100, 0.8)',
              'rgba(80, 255, 160, 0.8)',
              'rgba(80, 200, 255, 0.8)',
              'rgba(150, 100, 255, 0.8)',
              'rgba(255, 100, 200, 0.8)',
            ];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            return (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  width: 4 + Math.random() * 6,
                  height: 4 + Math.random() * 6,
                  borderRadius: '50%',
                  background: color,
                  boxShadow: `0 0 10px ${color}`,
                }}
                initial={{ 
                  x: 0, 
                  y: 0,
                  opacity: 0,
                  scale: 0
                }}
                animate={{ 
                  x: Math.cos(angle) * distance,
                  y: Math.sin(angle) * distance,
                  opacity: [0, 1, 1, 0],
                  scale: [0, 1, 1, 0.5]
                }}
                transition={{ 
                  duration: 1.2 + Math.random() * 0.6,
                  delay: 0.3,
                  ease: [0, 0.55, 0.45, 1],
                  times: [0, 0.2, 0.7, 1]
                }}
              />
            );
          })}
        </motion.div>
      )}
      {/* Album cover nodes */}
      {showNodes && nodes.map((node, i) => {
        const isConsumed = consumedNodes.has(i);
        const shouldFly = phase === 'flying' || phase === 'final';
        const flyTriggered = shouldFly && isConsumed;

        return (
          <motion.div
            key={i}
            initial={{
              x: node.x,
              y: node.y,
              scale: 0,
              opacity: 0,
              rotate: 0,
            }}
            animate={
              flyTriggered
                ? {
                    x: centerX,
                    y: centerY,
                    scale: [1, 1.15, 0.3, 0],
                    opacity: [1, 1, 1, 0],
                    rotate: [0, 0, 360],
                  }
                : {
                    x: node.x,
                    y: node.y,
                    scale: 1,
                    opacity: 1,
                    rotate: 0,
                  }
            }
            transition={
              flyTriggered
                ? {
                    x: {
                      duration: NODE_JOURNEY_MS / 1000,
                      ease: [0.6, 0.05, 0.01, 0.99], // Exponential easing
                    },
                    y: {
                      duration: NODE_JOURNEY_MS / 1000,
                      ease: [0.6, 0.05, 0.01, 0.99],
                    },
                    scale: {
                      duration: NODE_JOURNEY_MS / 1000,
                      ease: [0.43, 0.13, 0.23, 0.96],
                      times: [0, 0.1, 0.85, 1],
                    },
                    opacity: {
                      duration: NODE_CONSUME_MS / 1000,
                      delay: (NODE_JOURNEY_MS - NODE_CONSUME_MS) / 1000,
                      ease: 'easeIn',
                    },
                    rotate: {
                      duration: NODE_JOURNEY_MS / 1000,
                      ease: 'easeIn',
                    }
                  }
                : { 
                    duration: 0.5,
                    delay: i * 0.03,
                    ease: [0.68, -0.55, 0.265, 1.55] // Elastic bounce
                  }
            }
            className="absolute will-change-transform"
            style={{
              width: NODE_SIZE,
              height: NODE_SIZE,
              transform: 'translate3d(0,0,0)',
              zIndex: 10,
            }}
          >
            {/* Motion trail effect */}
            {flyTriggered && (
              <motion.div
                className="absolute inset-0 rounded-lg"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
                  filter: 'blur(8px)',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: NODE_JOURNEY_MS / 1000, ease: 'easeOut' }}
              />
            )}
            
            <img
              src={node.img}
              alt=""
              className="w-full h-full object-cover rounded-lg"
              style={{
                border: '2px solid rgba(255,255,255,0.1)',
                boxShadow: flyTriggered 
                  ? '0 0 20px rgba(255,255,255,0.5), 0 4px 12px rgba(0,0,0,0.5)' 
                  : '0 4px 12px rgba(0,0,0,0.5)',
                transition: 'box-shadow 0.3s ease',
              }}
            />
            
            {/* Consumption particle burst */}
            {flyTriggered && (
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: 8 }).map((_, pi) => {
                  const pAngle = (pi / 8) * Math.PI * 2;
                  const pDist = 30 + Math.random() * 20;
                  return (
                    <motion.div
                      key={pi}
                      className="absolute"
                      style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.8)',
                        left: '50%',
                        top: '50%',
                        boxShadow: '0 0 6px rgba(255,255,255,0.6)',
                      }}
                      initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                      animate={{ 
                        x: Math.cos(pAngle) * pDist,
                        y: Math.sin(pAngle) * pDist,
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0.5]
                      }}
                      transition={{ 
                        duration: 0.4,
                        delay: (NODE_JOURNEY_MS - NODE_CONSUME_MS) / 1000,
                        ease: "easeOut"
                      }}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Counter overlay */}
      {showCounter && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
          style={{ zIndex: 20 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            animate={counterControls}
            className="flex flex-col items-center"
          >
            {phase !== 'final' ? (
              <>
                <span
                  className="text-white font-bold leading-none rainbow-glow pulse-glow"
                  style={{
                    fontSize: 'clamp(120px, 15vw, 180px)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {displayCount.toLocaleString()}
                </span>
                <span
                  className="mt-2"
                  style={{
                    fontSize: 'clamp(24px, 3vw, 32px)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  minutes listened
                </span>
              </>
            ) : (
              <>
                <motion.span
                  className="text-white font-bold leading-none rainbow-glow pulse-glow"
                  style={{
                    fontSize: 'clamp(120px, 15vw, 180px)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                  initial={{ scale: 1 }}
                  animate={{ 
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ 
                    duration: 0.8, 
                    times: [0, 0.6, 1],
                    ease: [0.43, 0.13, 0.23, 0.96]
                  }}
                >
                  {hours > 0
                    ? `${hours.toLocaleString()}`
                    : `${totalMinutes.toLocaleString()}`}
                </motion.span>
                <motion.span
                  className="mt-2"
                  style={{
                    fontSize: 'clamp(28px, 3.5vw, 36px)',
                    color: 'rgba(255,255,255,0.85)',
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  {hours > 0
                    ? `${hours === 1 ? 'hour' : 'hours'}`
                    : 'minutes'} listened
                </motion.span>
                {hours > 0 && (
                  <motion.span
                    className="mt-2"
                    style={{
                      fontSize: 'clamp(18px, 2vw, 24px)',
                      color: 'rgba(255,255,255,0.5)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    ({totalMinutes.toLocaleString()} minutes)
                  </motion.span>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
