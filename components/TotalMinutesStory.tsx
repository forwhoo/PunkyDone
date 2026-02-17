import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, useAnimation } from 'framer-motion';

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
const NODE_FLY_STAGGER_MS = 120;
const NODE_JOURNEY_MS = 500;
const NODE_CONSUME_MS = 200;
const HOLD_DURATION_MS = 2500;

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
  const [phase, setPhase] = useState<'initial' | 'flying' | 'final'>('initial');
  const [showCounter, setShowCounter] = useState(false);

  const counterRef = useRef(0);
  const targetCountRef = useRef(0);
  const rafRef = useRef<number>(0);
  const counterControls = useAnimation();

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

    // Phase 1: Show nodes for 1 second
    const showTimer = setTimeout(() => {
      setShowCounter(true);
      setPhase('flying');
    }, 1000);

    return () => clearTimeout(showTimer);
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
      scale: [1, 1.1, 1],
      transition: { duration: 0.6, ease: 'easeInOut' },
    });

    const completeTimer = setTimeout(onComplete, HOLD_DURATION_MS);
    return () => clearTimeout(completeTimer);
  }, [phase, onComplete, counterControls]);

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
      {/* Album cover nodes */}
      {nodes.map((node, i) => {
        const isConsumed = consumedNodes.has(i);
        const shouldFly = phase === 'flying' || phase === 'final';
        const flyTriggered = shouldFly && isConsumed;

        return (
          <motion.div
            key={i}
            initial={{
              x: node.x,
              y: node.y,
              scale: 1,
              opacity: 1,
            }}
            animate={
              flyTriggered
                ? {
                    x: centerX,
                    y: centerY,
                    scale: 0.3,
                    opacity: 0,
                  }
                : {
                    x: node.x,
                    y: node.y,
                    scale: 1,
                    opacity: 1,
                  }
            }
            transition={
              flyTriggered
                ? {
                    x: {
                      duration: NODE_JOURNEY_MS / 1000,
                      ease: [0.4, 0, 0.2, 1],
                    },
                    y: {
                      duration: NODE_JOURNEY_MS / 1000,
                      ease: [0.1, 0.8, 0.3, 1],
                    },
                    scale: {
                      duration: NODE_CONSUME_MS / 1000,
                      delay: (NODE_JOURNEY_MS - NODE_CONSUME_MS) / 1000,
                      ease: 'easeIn',
                    },
                    opacity: {
                      duration: NODE_CONSUME_MS / 1000,
                      delay: (NODE_JOURNEY_MS - NODE_CONSUME_MS) / 1000,
                      ease: 'easeIn',
                    },
                  }
                : { duration: 0.3 }
            }
            className="absolute will-change-transform"
            style={{
              width: NODE_SIZE,
              height: NODE_SIZE,
              transform: 'translate3d(0,0,0)',
            }}
          >
            <img
              src={node.img}
              alt=""
              className="w-full h-full object-cover rounded-lg"
              style={{
                border: '2px solid rgba(255,255,255,0.1)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}
            />
          </motion.div>
        );
      })}

      {/* Counter overlay */}
      {showCounter && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
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
                  className="text-white font-bold leading-none"
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
                <span
                  className="text-white font-bold leading-none"
                  style={{
                    fontSize: 'clamp(120px, 15vw, 180px)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {hours > 0
                    ? `${hours.toLocaleString()} ${hours === 1 ? 'hour' : 'hours'}`
                    : `${totalMinutes.toLocaleString()} min`}
                </span>
                {hours > 0 && (
                  <span
                    className="mt-4"
                    style={{
                      fontSize: 'clamp(24px, 3vw, 32px)',
                      color: 'rgba(255,255,255,0.7)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {totalMinutes.toLocaleString()} minutes
                  </span>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
