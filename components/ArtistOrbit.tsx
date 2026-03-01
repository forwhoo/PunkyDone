import React from 'react';
import { motion } from 'framer-motion';
import { Disc, Clock } from 'lucide-react';

interface OrbitNode {
    id: string;
    name: string;
    image: string;
    plays: number;
    time: string;
}

interface ArtistOrbitProps {
    centralNode: {
        id: string;
        name: string;
        image: string;
    };
    orbitNodes: OrbitNode[];
    color: string;
    history: any[];
}

export const ArtistOrbit: React.FC<ArtistOrbitProps> = ({ centralNode, orbitNodes, color }) => {
    // Limit to max 12 nodes for visual clarity in this layout
    const nodes = orbitNodes.slice(0, 12);

    return (
        <div className="relative w-full aspect-square max-w-[500px] mx-auto flex items-center justify-center p-4">
            {/* Background Orbits */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[80%] h-[80%] border border-[#e8e6dc] rounded-full" />
                <div className="w-[60%] h-[60%] border border-[#e8e6dc] rounded-full" />
                <div className="w-[40%] h-[40%] border border-[#e8e6dc] rounded-full" />
            </div>

            {/* Central Node */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="relative z-10 w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-[#e8e6dc] shadow-2xl"
                style={{ boxShadow: `0 0 50px ${color}33` }}
            >
                <img src={centralNode.image} alt={centralNode.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end justify-center pb-2">
                    <span className="text-[10px] font-bold text-[#141413] uppercase tracking-tighter truncate px-2">{centralNode.name}</span>
                </div>
            </motion.div>

            {/* Orbiting Nodes */}
            {nodes.map((node, idx) => {
                const angle = (idx / nodes.length) * 2 * Math.PI;
                const radius = 35 + (idx % 2 === 0 ? 5 : 0); // Alternate radius slightly for depth

                return (
                    <motion.div
                        key={node.id}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            x: [
                                `${Math.cos(angle) * radius}%`,
                                `${Math.cos(angle + 0.1) * radius}%`,
                                `${Math.cos(angle) * radius}%`
                            ],
                            y: [
                                `${Math.sin(angle) * radius}%`,
                                `${Math.sin(angle + 0.1) * radius}%`,
                                `${Math.sin(angle) * radius}%`
                            ]
                        }}
                        transition={{
                            delay: idx * 0.05,
                            duration: 10 + Math.random() * 5,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                        className="absolute w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden border border-[#e8e6dc] shadow-xl group cursor-pointer"
                    >
                        <img src={node.image} alt={node.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-[#faf9f5]/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-center p-1">
                            <span className="text-[8px] font-bold text-[#141413] truncate w-full">{node.name}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                                <Disc size={8} className="text-[#141413]/70" />
                                <span className="text-[8px] text-[#141413]/90">{node.plays}</span>
                            </div>
                        </div>
                    </motion.div>
                );
            })}

            {/* Aura Effect */}
            <div
                className="absolute inset-0 rounded-full opacity-20 blur-[100px] pointer-events-none"
                style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)` }}
            />
        </div>
    );
};
