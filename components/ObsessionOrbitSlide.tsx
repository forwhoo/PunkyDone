import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Artist, Song } from '../types';

interface ObsessionOrbitSlideProps {
  active: boolean;
  artists: Artist[];
  history: any[]; // History rows
}

const NB = {
  acidYellow: '#CCFF00',
  electricBlue: '#1A6BFF',
  coral: '#FF4D2E',
  magenta: '#FF0080',
  black: '#000000',
  white: '#FFFFFF',
  nearBlack: '#0D0D0D',
};

export const ObsessionOrbitSlide: React.FC<ObsessionOrbitSlideProps> = ({ active, artists, history }) => {
  const [phase, setPhase] = useState<'orbit' | 'timeline'>('orbit');

  // 1. Identify Obsession Artist (Top Artist for simplicity or highest trend score logic)
  const obsessionArtist = artists[0];
  const otherArtists = artists.slice(1, 10); // Inner ring

  // 2. Timeline Data for Obsession Artist
  const timelineData = useMemo(() => {
    if (!obsessionArtist || !history) return [];
    const artistName = obsessionArtist.name;
    // Filter history for this artist
    const artistPlays = history.filter((play: any) =>
      (play.artist_name === artistName) || (play.track_name && play.track_name.includes(artistName))
    );

    // Group by date
    const dailyCounts: Record<string, number> = {};
    artistPlays.forEach((play: any) => {
        const date = new Date(play.played_at).toLocaleDateString('en-CA');
        dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    // Create array for last 30 days or so (or full year if we want a sparkline)
    // Let's do a 14-day streak view or a sparkline of the year
    const sortedDates = Object.keys(dailyCounts).sort();
    if (sortedDates.length === 0) return [];

    // Simple sparkline data: map to 0-1 range
    const max = Math.max(...Object.values(dailyCounts));
    return sortedDates.map(date => ({ date, count: dailyCounts[date], intensity: dailyCounts[date] / max }));
  }, [obsessionArtist, history]);

  useEffect(() => {
    if (!active) {
      setPhase('orbit');
      return;
    }
    // Sequence: Orbit spins (0-3s) -> Timeline appears (3s+)
    const timer = setTimeout(() => {
      setPhase('timeline');
    }, 3000);
    return () => clearTimeout(timer);
  }, [active]);

  if (!obsessionArtist) return null;

  return (
    <div className="flex-1 flex flex-col bg-[#000] relative overflow-hidden h-full">
      {/* Background Grid */}
      <div className="absolute inset-0 z-0" style={{
          backgroundImage: `linear-gradient(${NB.nearBlack} 1px, transparent 1px), linear-gradient(90deg, ${NB.nearBlack} 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          opacity: 0.2
      }}></div>

      <div className="flex-1 flex flex-col p-6 z-10 relative">
        <div className="mb-4">
          <p className="font-barlow font-bold text-xs tracking-[0.2em] text-[#555] uppercase mb-1">Your Story</p>
          <h1 className="font-barlow-condensed font-black text-5xl text-white uppercase leading-none">
            Obsession<br/><span style={{ color: NB.acidYellow }}>Orbit</span>
          </h1>
        </div>

        {/* ORBIT VIEW */}
        <div className="flex-1 relative flex items-center justify-center min-h-[300px]">
          {/* Solar System */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{
                scale: phase === 'timeline' ? 0.6 : 1,
                opacity: 1,
                y: phase === 'timeline' ? -80 : 0
            }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="relative w-[280px] h-[280px] flex items-center justify-center"
          >
            {/* Orbital Rings */}
            <div className="absolute inset-0 rounded-full border-2 border-[#222] animate-[spin_20s_linear_infinite]" />
            <div className="absolute inset-[40px] rounded-full border-2 border-[#333] animate-[spin_15s_linear_infinite_reverse]" />

            {/* Center Node (Obsession) */}
            <div className="relative w-32 h-32 z-20">
              <div className="absolute inset-0 bg-[#000] rounded-full border-4 border-[#CCFF00] shadow-[0_0_30px_rgba(204,255,0,0.3)] overflow-hidden">
                <img src={obsessionArtist.image} alt={obsessionArtist.name} className="w-full h-full object-cover" />
              </div>
              {/* Pulse Ring */}
              <div className="absolute inset-[-10px] rounded-full border border-[#CCFF00] opacity-50 animate-ping" />
            </div>

            {/* Orbiting Nodes (Other Artists) */}
            {otherArtists.slice(0, 6).map((artist, i) => {
              const angle = (i / 6) * 360;
              const radius = 120; // px
              return (
                <motion.div
                  key={artist.id}
                  className="absolute w-12 h-12 top-1/2 left-1/2 -ml-6 -mt-6"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20 + i * 2, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: 'center center' }} // This rotates the container
                >
                    {/* Position the node at the radius */}
                   <div
                     className="absolute top-0 left-0 w-12 h-12 bg-[#111] border-2 border-[#444] rounded-full overflow-hidden"
                     style={{ transform: `translate(${Math.cos(angle * Math.PI / 180) * radius}px, ${Math.sin(angle * Math.PI / 180) * radius}px)` }}
                   >
                     {artist.image && <img src={artist.image} className="w-full h-full object-cover opacity-60 grayscale" />}
                   </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* TIMELINE OVERLAY */}
          <AnimatePresence>
            {phase === 'timeline' && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="absolute bottom-0 left-0 right-0 bg-[#111] border-t-4 border-[#CCFF00] p-6"
              >
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="font-barlow-condensed font-black text-3xl text-white uppercase">{obsessionArtist.name}</h3>
                    <p className="font-barlow text-sm text-[#888] font-bold uppercase tracking-wider">Locked In • {obsessionArtist.totalListens} Plays</p>
                  </div>
                  <div className="text-right">
                    <p className="font-barlow-condensed font-black text-4xl text-[#CCFF00]">{timelineData.length}</p>
                    <p className="font-barlow text-[10px] text-white uppercase font-bold">Active Days</p>
                  </div>
                </div>

                {/* Timeline Visualization (Sparkline / Bar Chart) */}
                <div className="flex items-end gap-[2px] h-24 w-full">
                  {timelineData.slice(-30).map((d, i) => (
                    <motion.div
                      key={d.date}
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(10, d.intensity * 100)}%` }}
                      transition={{ duration: 0.4, delay: i * 0.03 }}
                      className="flex-1 bg-[#333] hover:bg-[#CCFF00] transition-colors relative group"
                    >
                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black border border-white px-2 py-1 text-[10px] text-white opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                            {d.count} plays<br/>{d.date}
                        </div>
                    </motion.div>
                  ))}
                </div>
                <p className="font-barlow text-[10px] text-[#555] uppercase mt-2 text-center tracking-widest">Listening History Timeline</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Ticker */}
      <div className="h-9 bg-[#CCFF00] border-t-2 border-black flex items-center overflow-hidden whitespace-nowrap">
         <div className="animate-[ticker_10s_linear_infinite] font-barlow font-bold text-black text-xs uppercase tracking-widest">
            Obsession Orbit • Gravity Well • {obsessionArtist.name} • {obsessionArtist.name} • Obsession Orbit • Gravity Well • {obsessionArtist.name} •
         </div>
         <style>{`@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      </div>
    </div>
  );
};
