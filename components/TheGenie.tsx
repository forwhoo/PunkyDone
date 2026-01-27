import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, Mic2, Disc } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDailyPrediction, saveDailyPrediction } from '../services/dbService';
import { generateWeeklyPrediction } from '../services/geminiService';

interface TheGenieProps {
    recentPlays: any[];
}

interface PredictionData {
    artist: {
        name: string;
        reason: string;
    };
    song: {
        title: string;
        artist: string;
        reason: string;
    };
}

export const TheGenie: React.FC<TheGenieProps> = ({ recentPlays }) => {
    const [prediction, setPrediction] = useState<PredictionData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrediction = async () => {
             // 1. Try to get from DB/Local
             const saved = await getDailyPrediction();
             
             if (saved && saved.content) {
                 setPrediction(saved.content);
                 setLoading(false);
             } else {
                 // 2. If not found or outdated, generate new
                 if (recentPlays.length > 0) {
                     const newPrediction = await generateWeeklyPrediction(recentPlays);
                     if (newPrediction) {
                         setPrediction(newPrediction);
                         await saveDailyPrediction(newPrediction);
                     }
                 }
                 setLoading(false);
             }
        };

        fetchPrediction();
    }, [recentPlays]);

    if(loading) return (
        <div className="animate-pulse bg-[#1C1C1E] h-48 rounded-2xl w-full border border-white/5 mb-8"></div>
    );

    if(!prediction) return null;

    return (
        <div className="mb-12">
            <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex items-center gap-3">
                    <h3 className="text-[20px] font-bold text-white tracking-tight flex items-center gap-2">
                        <Sparkles className="text-purple-400" /> The Genie
                    </h3>
                </div>
                <p className="text-[#8E8E93] text-xs">AI-Predicted Conquerors of the Week</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Artist Prediction */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 overflow-hidden group hover:border-[#A855F7]/30 transition-colors"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <Mic2 size={100} />
                    </div>
                    <div className="flex items-start justify-between mb-4">
                        <div className="bg-[#A855F7]/10 text-[#A855F7] text-[10px] font-bold px-2 py-1 rounded-full border border-[#A855F7]/20">
                            ARTIST TO WATCH
                        </div>
                    </div>
                    <h4 className="text-2xl font-black text-white mb-2">{prediction.artist.name}</h4>
                    <p className="text-sm text-[#8E8E93] leading-relaxed relative z-10 italic">
                        "{prediction.artist.reason}"
                    </p>
                </motion.div>

                {/* Song Prediction */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative bg-[#1C1C1E] border border-white/10 rounded-2xl p-6 overflow-hidden group hover:border-[#3B82F6]/30 transition-colors"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                         <Disc size={100} />
                    </div>
                    <div className="flex items-start justify-between mb-4">
                         <div className="bg-[#3B82F6]/10 text-[#3B82F6] text-[10px] font-bold px-2 py-1 rounded-full border border-[#3B82F6]/20">
                            SONG OF THE WEEK
                        </div>
                    </div>
                    <h4 className="text-2xl font-black text-white mb-1">{prediction.song.title}</h4>
                    <p className="text-sm text-white/60 font-medium mb-3">{prediction.song.artist}</p>
                    <p className="text-sm text-[#8E8E93] leading-relaxed relative z-10 italic">
                        "{prediction.song.reason}"
                    </p>
                </motion.div>
            </div>
        </div>
    );
};
