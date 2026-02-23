import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X, Sparkles, Music } from 'lucide-react';
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription
} from '@/components/ui/empty';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface OrbitNode {
  id: string;
  image?: string;
  name: string;
  sub?: string;
  plays?: number;
  time?: string;
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
  className = ''
}) => {
  const [selectedNode, setSelectedNode] = useState<OrbitNode | null>(null);

  // Split nodes into rings
  const innerRing = orbitNodes.slice(0, 8);
  const outerRing = orbitNodes.slice(8, 24);

  // Empty State
  if (!orbitNodes || orbitNodes.length === 0) {
    return (
      <div className={`w-full h-full min-h-[300px] flex items-center justify-center ${className}`}>
        <Empty>
          <EmptyHeader>
             <EmptyMedia>
                <div className="flex -space-x-2">
                   <Avatar className="ring-2 ring-background grayscale">
                      <AvatarImage src={centralNode.image} />
                      <AvatarFallback>{centralNode.name.slice(0,2)}</AvatarFallback>
                   </Avatar>
                   <Avatar className="ring-2 ring-background grayscale opacity-50">
                      <AvatarFallback>?</AvatarFallback>
                   </Avatar>
                </div>
             </EmptyMedia>
             <EmptyTitle>No Orbit Data</EmptyTitle>
             <EmptyDescription>
                Not enough listening history to generate an orbit for {centralNode.name}.
             </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className={`relative w-full aspect-square md:aspect-video flex items-center justify-center overflow-hidden bg-black/20 rounded-3xl border border-white/5 ${className}`}>

      {/* Background Gradient */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${color}15 0%, transparent 70%)`
        }}
      />

      <motion.div
        className="relative w-full max-w-[480px] aspect-square select-none scale-[0.65] sm:scale-75 md:scale-90 origin-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >

        {/* Central Node */}
        <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group"
            onClick={() => setSelectedNode(centralNode)}
        >
            <div className="relative w-28 h-28 md:w-36 md:h-36">
                <div
                  className="w-full h-full rounded-full overflow-hidden border-4 border-[#1C1C1E] shadow-2xl relative z-10 bg-[#1C1C1E] transition-transform duration-500 group-hover:scale-105"
                  style={{ borderColor: selectedNode?.id === centralNode.id ? color : '#1C1C1E' }}
                >
                    <img src={centralNode.image || `https://ui-avatars.com/api/?name=${centralNode.name}`} className="w-full h-full object-cover" alt={centralNode.name} />
                </div>
            </div>
        </div>

        {/* Inner Ring (Counter-Clockwise) */}
        <div
            className="absolute inset-0 z-20 pointer-events-none"
            style={{ animation: 'spin-slow 60s linear infinite' }}
        >
             <style>{`
                @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes spin-reverse-slow { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                .animate-spin-slow { animation: spin-slow 60s linear infinite; }
                .animate-spin-reverse-slow { animation: spin-reverse-slow 80s linear infinite; }
             `}</style>

            <div className="w-full h-full absolute inset-0 animate-spin-slow group-hover:[animation-play-state:paused]">
                {innerRing.map((item, i) => {
                    const total = innerRing.length;
                    const angle = (i / total) * 360;
                    const radius = 34; // %

                    return (
                        <div
                            key={item.id || i}
                            className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-auto"
                            style={{
                                transform: `rotate(${angle}deg) translate(${radius * 5}px) rotate(-${angle}deg)`
                            }}
                        >
                            <div className="animate-spin-reverse-slow">
                                <OrbitNodeItem
                                    item={item}
                                    size={56}
                                    isActive={selectedNode?.id === item.id}
                                    color={color}
                                    onClick={() => setSelectedNode(item)}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Outer Ring (Clockwise) */}
        <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{ animation: 'spin-reverse-slow 80s linear infinite' }}
        >
             <div className="w-full h-full absolute inset-0 animate-spin-reverse-slow">
                {outerRing.map((item, i) => {
                    const total = outerRing.length;
                    const angle = (i / total) * 360;
                    const radius = 48; // %

                    return (
                        <div
                            key={item.id || i}
                            className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-auto"
                            style={{
                                transform: `rotate(${angle}deg) translate(${radius * 5}px) rotate(-${angle}deg)`
                            }}
                        >
                            <div className="animate-spin-slow">
                                <OrbitNodeItem
                                    item={item}
                                    size={40}
                                    isActive={selectedNode?.id === item.id}
                                    color={color}
                                    onClick={() => setSelectedNode(item)}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Orbital Rings - Visible circles */}
        <div className="absolute inset-0 rounded-full border-2 border-white/5 scale-[0.68] pointer-events-none"></div>
        <div className="absolute inset-0 rounded-full border border-white/5 scale-[0.96] pointer-events-none"></div>

      </motion.div>

      {/* POPUP / SIDE PANEL */}
      {createPortal(
        <AnimatePresence>
          {selectedNode && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
                onClick={() => setSelectedNode(null)}
              />

              {/* Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm bg-[#1C1C1E] border border-white/10 rounded-3xl shadow-2xl z-[200] overflow-hidden"
              >
                 <button
                    onClick={() => setSelectedNode(null)}
                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/70 hover:text-white transition-colors z-20 backdrop-blur-md"
                 >
                    <X size={18} />
                 </button>

                 <div className="relative h-64 w-full">
                    <img src={selectedNode.image} className="w-full h-full object-cover" alt={selectedNode.name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-transparent to-transparent" />

                    <div className="absolute bottom-4 left-6 right-6">
                        <h3 className="text-2xl font-bold text-white leading-tight drop-shadow-lg line-clamp-2">{selectedNode.name}</h3>
                        {selectedNode.sub && <p className="text-white/70 font-medium text-sm mt-1">{selectedNode.sub}</p>}
                    </div>
                 </div>

                 <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                            <div className="text-2xl font-bold text-white">{selectedNode.plays || 0}</div>
                            <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Plays</div>
                        </div>
                         <div className="bg-white/5 rounded-2xl p-4 text-center border border-white/5">
                            <div className="text-xl font-bold text-white">{selectedNode.time || '—'}</div>
                            <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Time</div>
                        </div>
                    </div>

                    <button className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2">
                        <Music size={16} /> Open in Spotify
                    </button>
                 </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
};

const OrbitNodeItem = ({ item, size, isActive, color, onClick }: { item: OrbitNode, size: number, isActive: boolean, color: string, onClick: () => void }) => {
    return (
        <div
            className={`group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${isActive ? 'scale-110 z-50' : 'hover:scale-110'}`}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
            <div
                className={`relative rounded-full overflow-hidden border transition-all duration-300 bg-[#1C1C1E] shadow-lg`}
                style={{
                    width: size,
                    height: size,
                    borderColor: isActive ? color : 'rgba(255,255,255,0.1)',
                    boxShadow: isActive ? `0 0 20px ${color}60` : 'none'
                }}
            >
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
        </div>
    );
};
