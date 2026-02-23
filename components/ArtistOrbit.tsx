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
  const [hoveredNode, setHoveredNode] = useState<OrbitNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (node: OrbitNode, e: React.MouseEvent) => {
    setHoveredNode(node);
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredNode(null);
  };

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
        className="relative w-full max-w-[480px] aspect-square select-none scale-[0.55] sm:scale-75 md:scale-90 origin-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >

        {/* Central Node */}
        <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group"
            onMouseEnter={(e) => handleMouseEnter(centralNode, e)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div className="relative w-28 h-28 md:w-36 md:h-36">
                <div
                  className="w-full h-full rounded-full overflow-hidden border-4 border-[#1C1C1E] shadow-2xl relative z-10 bg-[#1C1C1E] transition-transform duration-500 group-hover:scale-105"
                  style={{ borderColor: '#1C1C1E' }}
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
                                    color={color}
                                    onMouseEnter={(e) => handleMouseEnter(item, e)}
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={handleMouseLeave}
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
                                    color={color}
                                    onMouseEnter={(e) => handleMouseEnter(item, e)}
                                    onMouseMove={handleMouseMove}
                                    onMouseLeave={handleMouseLeave}
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

      {hoveredNode && createPortal(
        <div
            className="fixed z-[9999] pointer-events-none"
            style={{
                left: mousePos.x,
                top: mousePos.y,
                transform: 'translate(16px, 16px)'
            }}
        >
            <TooltipCard node={hoveredNode} />
        </div>,
        document.body
      )}

    </div>
  );
};

const TooltipCard = ({ node }: { node: OrbitNode }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: 5 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9, y: 5 }}
    transition={{ duration: 0.1 }}
    className="bg-[#1C1C1E]/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl flex items-center gap-3 w-max max-w-[240px]"
  >
    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 border border-white/5">
      <img src={node.image || `https://ui-avatars.com/api/?name=${node.name}`} alt={node.name} className="w-full h-full object-cover" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-bold text-white truncate leading-tight">{node.name}</h4>
      <div className="flex items-center gap-2 mt-0.5">
          {node.plays !== undefined && <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider">{node.plays} plays</span>}
          {node.time && <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider">• {node.time.replace('m', ' min')}</span>}
      </div>
    </div>
  </motion.div>
);

const OrbitNodeItem = ({
    item,
    size,
    color,
    onMouseEnter,
    onMouseMove,
    onMouseLeave
}: {
    item: OrbitNode,
    size: number,
    color: string,
    onMouseEnter: (e: React.MouseEvent) => void,
    onMouseMove: (e: React.MouseEvent) => void,
    onMouseLeave: () => void
}) => {
    return (
        <div
            className={`group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 hover:scale-110`}
            onMouseEnter={onMouseEnter}
            onMouseMove={onMouseMove}
            onMouseLeave={onMouseLeave}
        >
            <div
                className={`relative rounded-full overflow-hidden border transition-all duration-300 bg-[#1C1C1E] shadow-lg`}
                style={{
                    width: size,
                    height: size,
                    borderColor: 'rgba(255,255,255,0.1)',
                    boxShadow: 'none'
                }}
            >
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            </div>
        </div>
    );
};
