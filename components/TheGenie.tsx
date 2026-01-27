import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, Mic2, Disc } from 'lucide-react';
import { motion } from 'framer-motion';
import { getDailyPrediction, saveDailyPrediction } from '../services/dbService';
import { generateWeeklyPrediction } from '../services/geminiService';

interface TheGenieProps {
    recentPlays: any[];
}

interface GenieItem {
    rank: number;
    name?: string;
    title?: string;
    artist?: string;
    reason: string;
}

interface PredictionData {
    artists: GenieItem[];
    songs: GenieItem[];
}

export const TheGenie: React.FC<TheGenieProps> = ({ recentPlays }) => {
    const [prediction, setPrediction] = useState<PredictionData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPrediction = async () => {
             // 1. Try to get from DB/Local
             const saved = await getDailyPrediction();
             
             // Validate Data Structure (Must be V2 Arrays)
             let validData = null;
             if (saved && saved.content) {
                 // Check if it has the new array structure
                 if (Array.isArray(saved.content.artists) && Array.isArray(saved.content.songs)) {
                     validData = saved.content;
                 }
             }

             if (validData) {
                 setPrediction(validData);
                 setLoading(false);
             } else {
                 // 2. If not found or outdated/invalid format, generate new
                 if (recentPlays.length > 0) {
                     const newPrediction = await generateWeeklyPrediction(recentPlays);
                     // Basic validation of response
                     if (newPrediction && Array.isArray(newPrediction.artists)) {
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
        <div className="animate-pulse bg-[#1C1C1E] h-64 rounded-2xl w-full border border-white/5 mb-8"></div>
    );

    if(!prediction) return null;

    const getImage = (name: string) => {
        // Simple heuristic to find image in recent plays if matches
        const match = recentPlays.find(p => p.artist_name === name || p.track_name === name || p.artist === name);
        if (match) return match.album_cover || match.cover || match.image;
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`;
    };

    const renderList = (items: GenieItem[], type: 'artist' | 'song') => {
        if (!items || !Array.isArray(items)) return null;
        
        return (
        <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-6 scroll-smooth gap-0">
            {items.map((item, idx) => {
                const name = type === 'artist' ? item.name! : item.title!;
                const sub = type === 'artist' ? 'Artist' : item.artist!;
                const img = getImage(type === 'artist' ? name : sub);

                // Matching RankedAlbum style from App.tsx/TopCharts
                return (
                    <div key={idx} className="flex-shrink-0 relative flex items-center snap-start group cursor-default w-[180px] md:w-[220px]">
                        <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40 text-white/5">
                            {item.rank}
                        </span>
                        <div className="relative z-10 ml-10 md:ml-12">
                            <div className="w-32 h-32 md:w-40 md:h-40 overflow-hidden rounded-xl bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                                <img 
                                    src={img} 
                                    alt={name} 
                                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm" 
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                                    <span className="text-white text-[10px] font-bold uppercase tracking-wider text-center px-2">
                                        {item.reason}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-3 relative z-20">
                                <h3 className="text-[15px] font-semibold text-white truncate w-32 md:w-40 leading-tight group-hover:text-white transition-colors">
                                    {name}
                                </h3>
                                <p className="text-[13px] text-[#8E8E93] truncate w-32 md:w-40 mt-0.5 font-medium">
                                    {sub}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
        );
    };

    return (
        <div className="mb-20">
            <div className="flex justify-between items-center mb-6 px-1">
                <div>
                    <h3 className="text-[20px] font-bold text-white tracking-tight flex items-center gap-2">
                         Conquerors of the Week
                    </h3>
                    <p className="text-[#8E8E93] text-xs mt-1 flex items-center gap-1">
                        <Sparkles size={10} className="text-purple-400" /> with AI Intelligence
                    </p>
                </div>
            </div>

            {/* ARTISTS SECTION */}
             <div className="mb-10">
                <div className="flex items-center gap-3 pl-1 mb-4">
                    <h4 className="text-lg font-bold text-white">Artists</h4>
                </div>
                {renderList(prediction.artists, 'artist')}
            </div>

            {/* SONGS SECTION */}
            <div>
                 <div className="flex items-center gap-3 pl-1 mb-4">
                    <h4 className="text-lg font-bold text-white">Songs</h4>
                </div>
                {renderList(prediction.songs, 'song')}
            </div>
        </div>
    );
};
