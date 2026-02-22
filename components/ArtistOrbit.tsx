import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OrbitNode {
  id: string;
  image?: string;
  name: string;
  sub?: string;
}

interface ArtistOrbitProps {
  centralNode: OrbitNode;
  orbitNodes: OrbitNode[];
  color?: string;
  history?: any[];
  className?: string;
}

export const ArtistOrbit: React.FC<ArtistOrbitProps> = ({
  centralNode,
  orbitNodes,
  color = '#CCFF00',
  history,
  className = ''
}) => {
  const [phase, setPhase] = useState<'orbit' | 'timeline'>('orbit');

  // Calculate timeline data from history if available
  const timelineData = useMemo(() => {
    if (!history || history.length === 0) return [];

    // Group by date
    const dailyCounts: Record<string, number> = {};
    history.forEach((play: any) => {
        if (!play.played_at) return;
        const date = new Date(play.played_at).toLocaleDateString('en-CA');
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    const sortedDates = Object.keys(dailyCounts).sort();
    if (sortedDates.length === 0) return [];

    const max = Math.max(...Object.values(dailyCounts));
    // Show last 30 active days
    return sortedDates.slice(-30).map(date => ({
      date,
      count: dailyCounts[date],
      intensity: max > 0 ? dailyCounts[date] / max : 0
    }));
  }, [history]);

  useEffect(() => {
    // Switch to timeline after delay
    const timer = setTimeout(() => setPhase('timeline'), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`relative w-full aspect-square md:aspect-video bg-black/20 rounded-3xl overflow-hidden border border-white/5 ${className}`}>

      {/* Background Gradient */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at center, ${color}20 0%, transparent 70%)`
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        {/* Orbit System */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
              scale: phase === 'timeline' ? 0.7 : 1,
              y: phase === 'timeline' ? -40 : 0,
              opacity: 1
          }}
          transition={{ duration: 0.8, ease: "circOut" }}
          className="relative w-[280px] h-[280px] flex items-center justify-center"
        >
          {/* Orbital Rings - Clean */}
          <div className="absolute inset-0 rounded-full border border-white/10 animate-[spin_20s_linear_infinite]" />
          <div className="absolute inset-[40px] rounded-full border border-white/5 animate-[spin_15s_linear_infinite_reverse]" />

          {/* Central Node */}
          <div className="relative w-32 h-32 z-20">
            <div
              className="absolute inset-0 rounded-full overflow-hidden shadow-2xl ring-2 ring-offset-2 ring-offset-black transition-shadow duration-500"
              style={{ boxShadow: `0 0 30px ${color}40`, '--tw-ring-color': color } as React.CSSProperties}
            >
              <img src={centralNode.image || 'https://ui-avatars.com/api/?background=0D0D0D&color=fff'} alt={centralNode.name} className="w-full h-full object-cover" />
            </div>
            {/* Subtle Pulse */}
            <div className="absolute inset-[-4px] rounded-full border opacity-50 animate-ping" style={{ borderColor: color }} />
          </div>

          {/* Orbiting Nodes */}
          {orbitNodes.slice(0, 6).map((node, i) => {
            const angle = (i / Math.min(6, orbitNodes.length)) * 360;
            const radius = 120;
            return (
              <motion.div
                key={node.id || i}
                className="absolute w-10 h-10 top-1/2 left-1/2 -ml-5 -mt-5"
                animate={{ rotate: 360 }}
                transition={{ duration: 25 + i * 2, repeat: Infinity, ease: "linear" }}
              >
                 <div
                   className="absolute top-0 left-0 w-10 h-10 rounded-full overflow-hidden border border-white/20 shadow-lg bg-black"
                   style={{ transform: `translate(${Math.cos(angle * Math.PI / 180) * radius}px, ${Math.sin(angle * Math.PI / 180) * radius}px)` }}
                 >
                   {node.image && <img src={node.image} className="w-full h-full object-cover opacity-80" />}
                 </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Timeline Overlay */}
      <AnimatePresence>
        {phase === 'timeline' && timelineData.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent"
          >
            <div className="flex items-end gap-1 h-16 w-full">
              {timelineData.map((d, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(10, d.intensity * 100)}%` }}
                  transition={{ duration: 0.4, delay: i * 0.03 }}
                  className="flex-1 rounded-t-sm transition-colors hover:bg-white relative group"
                  style={{ backgroundColor: `${color}80` }}
                >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 border border-white/10 px-2 py-1 text-[10px] text-white rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-50">
                        {d.count} plays • {d.date}
                    </div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between items-center mt-2">
                 <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">Activity Streak</span>
                 <span className="text-[10px] font-bold text-white/80">{timelineData.length} Active Days</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
