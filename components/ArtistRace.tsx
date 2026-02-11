import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Sparkles, Music2 } from 'lucide-react';

// Constants
const AVATAR_POSITION_OFFSET = 8; // Offset percentage for avatar positioning

interface RaceCompetitor {
    name: string;
    image: string;
    score: number;
    type: 'artist' | 'song' | 'album';
}

interface ArtistRaceProps {
    competitors: RaceCompetitor[];
    title?: string;
    subtitle?: string;
}

export const ArtistRace: React.FC<ArtistRaceProps> = ({ 
    competitors, 
    title = "Top Artists Battle", 
    subtitle = "See who dominated your playlist" 
}) => {
    const [raceStarted, setRaceStarted] = useState(false);
    const [showWinner, setShowWinner] = useState(false);
    const [positions, setPositions] = useState<number[]>([]);

    // Sort competitors by score descending
    const sortedCompetitors = [...competitors].sort((a, b) => b.score - a.score);
    const winner = sortedCompetitors[0];

    useEffect(() => {
        // Initialize positions at start
        setPositions(competitors.map(() => 0));
        
        // Start race after a short delay
        const startTimer = setTimeout(() => {
            setRaceStarted(true);
            
            // Calculate final positions based on score (normalized to 100%)
            const maxScore = Math.max(...competitors.map(c => c.score));
            
            // Guard against division by zero
            if (maxScore === 0) {
                setPositions(competitors.map(() => 0));
                return;
            }
            
            const finalPositions = competitors.map(c => (c.score / maxScore) * 100);
            
            // Animate to final positions
            setPositions(finalPositions);
            
            // Show winner after race completes
            setTimeout(() => {
                setShowWinner(true);
            }, 2000);
        }, 500);

        return () => clearTimeout(startTimer);
    }, [competitors]);

    return (
        <div className="relative w-full">
            {/* Header */}
            <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                    <Trophy className="text-[#FA2D48]" size={28} />
                    {title}
                </h3>
                <p className="text-[#8E8E93] text-sm">{subtitle}</p>
            </div>

            {/* Race Track */}
            <div className="space-y-6 mb-8">
                {competitors.map((competitor, idx) => {
                    const isWinner = showWinner && competitor.name === winner.name;
                    const progress = positions[idx] || 0;
                    
                    return (
                        <div key={competitor.name} className="relative">
                            {/* Track Background */}
                            <div className="h-16 bg-white/5 rounded-full border border-white/10 overflow-hidden relative">
                                {/* Progress Bar */}
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ 
                                        duration: 1.5,
                                        delay: idx * 0.1,
                                        ease: [0.43, 0.13, 0.23, 0.96] 
                                    }}
                                    className={`h-full ${
                                        isWinner 
                                            ? 'bg-gradient-to-r from-[#FA2D48] to-[#FF6B35]' 
                                            : 'bg-gradient-to-r from-white/20 to-white/10'
                                    }`}
                                />

                                {/* Competitor Avatar - Moves Along Track */}
                                <motion.div
                                    initial={{ left: '0%' }}
                                    animate={{ left: `${Math.max(0, progress - AVATAR_POSITION_OFFSET)}%` }}
                                    transition={{ 
                                        duration: 1.5,
                                        delay: idx * 0.1,
                                        ease: [0.43, 0.13, 0.23, 0.96]
                                    }}
                                    className="absolute top-1/2 -translate-y-1/2 z-10"
                                >
                                    <motion.div
                                        animate={isWinner ? {
                                            scale: [1, 1.2, 1],
                                            rotate: [0, 10, -10, 0]
                                        } : {}}
                                        transition={{ 
                                            duration: 0.6,
                                            repeat: isWinner ? Infinity : 0,
                                            repeatDelay: 0.5
                                        }}
                                        className={`relative w-14 h-14 rounded-full overflow-hidden border-4 shadow-2xl ${
                                            isWinner 
                                                ? 'border-[#FA2D48] shadow-[#FA2D48]/50' 
                                                : 'border-white/20'
                                        }`}
                                    >
                                        {competitor.image ? (
                                            <img 
                                                src={competitor.image} 
                                                alt={competitor.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-br from-[#FA2D48] to-[#1C1C1E] flex items-center justify-center">
                                                <Music2 className="text-white" size={24} />
                                            </div>
                                        )}
                                        
                                        {/* Winner Crown */}
                                        {isWinner && (
                                            <motion.div
                                                initial={{ scale: 0, rotate: -45 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                className="absolute -top-1 -right-1 bg-[#FA2D48] rounded-full p-1 shadow-lg"
                                            >
                                                <Crown size={14} className="text-white" fill="white" />
                                            </motion.div>
                                        )}
                                    </motion.div>
                                </motion.div>

                                {/* Score Label */}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20">
                                    <motion.span 
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 1.5 + idx * 0.1 }}
                                        className={`text-sm font-bold ${
                                            isWinner ? 'text-white' : 'text-white/60'
                                        }`}
                                    >
                                        {competitor.score}
                                    </motion.span>
                                </div>
                            </div>

                            {/* Name Label */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + idx * 0.1 }}
                                className="mt-2 flex items-center gap-2"
                            >
                                <span className={`text-sm font-semibold ${
                                    isWinner ? 'text-white' : 'text-white/80'
                                }`}>
                                    {competitor.name}
                                </span>
                                {isWinner && showWinner && (
                                    <motion.span
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="text-[#FA2D48]"
                                    >
                                        <Sparkles size={16} fill="#FA2D48" />
                                    </motion.span>
                                )}
                            </motion.div>
                        </div>
                    );
                })}
            </div>

            {/* Winner Celebration */}
            <AnimatePresence>
                {showWinner && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center p-6 bg-gradient-to-br from-[#FA2D48]/20 to-[#FF6B35]/20 border border-[#FA2D48]/30 rounded-2xl backdrop-blur-md"
                    >
                        <motion.div
                            animate={{ 
                                scale: [1, 1.05, 1],
                            }}
                            transition={{ 
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                        >
                            <Trophy size={48} className="text-[#FA2D48] mx-auto mb-3" />
                        </motion.div>
                        <h4 className="text-xl font-bold text-white mb-1">
                            👑 {winner.name} Takes the Crown!
                        </h4>
                        <p className="text-[#8E8E93] text-sm">
                            With {winner.score} plays, this {winner.type} dominated your listening
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
