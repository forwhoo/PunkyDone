import React, { useState } from 'react';
import { Card } from './UIComponents';
import { Sparkles, RefreshCcw, Filter, Music2, AlertTriangle } from 'lucide-react';
import { generateDynamicCategoryQuery } from '../services/geminiService';
import { fetchSmartPlaylist } from '../services/dbService';
import { Album } from '../types';

interface TopAIProps {
    contextData: { artists: string[], albums: string[] };
}

export const AISpotlight: React.FC<TopAIProps> = ({ contextData }) => {
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState<any>(null);
    const [results, setResults] = useState<any[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setErrorMsg(null);
        setResults([]);
        
        try {
            // 1. Ask AI for a concept
            const concept = await generateDynamicCategoryQuery(contextData);
            setCategory(concept);
            
            if (concept.isError) {
                setErrorMsg(concept.description);
            }

            // 2. Fetch real data based on concept
            if (concept && concept.tool) {
                const data = await fetchSmartPlaylist(concept);
                setResults(data);
                
                if (data.length === 0 && !concept.isError) {
                    setErrorMsg(`The formula "${concept.tool}" returned 0 matches for "${concept.args.artistName || concept.args.keyword || 'Time Range'}". Try again.`);
                }
            } else {
                 setErrorMsg("AI returned invalid structure. Try again.");
            }
        } catch (err) {
            setErrorMsg("Critical Failure in AI Dispatch.");
        }
        
        setLoading(false);
    };
    
    // Component for the ranked Item (Similar to Top Albums logic but vertically stacked or horizontal)
    // We will use Horizontal list to match "Top Albums"
    
    return (
        <div className="mb-12 relative group">
             {/* Header */}
            <div className="flex justify-between items-end mb-6 px-1 mx-1">
                <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-[#FA2D48]/10 flex items-center justify-center border border-[#FA2D48]/20">
                         <Sparkles className="w-4 h-4 text-[#FA2D48]" />
                     </div>
                     <div>
                        <h2 className="text-[22px] font-bold text-white tracking-tight leading-none">
                            {category ? category.title : "AI Spotlight"}
                        </h2>
                        {category && <p className="text-xs text-[#8E8E93] mt-1 font-medium">{category.description}</p>}
                     </div>
                </div>
                
                <button 
                    onClick={handleGenerate}
                    disabled={loading}
                    className={`flex items-center gap-2 text-[#FA2D48] bg-[#FA2D48]/10 hover:bg-[#FA2D48]/20 px-3 py-1.5 rounded-full transition-all ${loading ? 'opacity-50' : ''}`}
                >
                    <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-[11px] font-bold uppercase tracking-wider">{category ? "Remix" : "Generate"}</span>
                </button>
            </div>

            {/* Content Area */}
            {errorMsg && (
                <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {errorMsg}
                </div>
            )}

            {results.length > 0 ? (
                <div className="flex items-end overflow-x-auto pb-10 pt-2 no-scrollbar snap-x pl-2 scroll-smooth">
                    {/* Render Results matching Top Album Style */}
                    {results.map((item, index) => (
                        <div key={item.id} className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]">
                            <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40">
                                {index + 1}
                            </span>
                            <div className="relative z-10 ml-10 md:ml-12">
                                <div className="w-32 h-32 md:w-40 md:h-40 overflow-hidden rounded-xl bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-purple-500/50 transition-all duration-300 group-hover:-translate-y-2 relative">
                                    <img src={item.cover} alt={item.title} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" />
                                     <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                                        <span className="text-white font-bold text-2xl drop-shadow-md">{item.listens}</span>
                                        <span className="text-white/80 text-[10px] uppercase tracking-widest font-bold">Plays</span>
                                    </div>
                                </div>
                                <div className="mt-3 relative z-20">
                                    <h3 className="text-[15px] font-semibold text-white truncate w-32 md:w-40 leading-tight group-hover:text-purple-400 transition-colors">{item.title}</h3>
                                    <p className="text-[13px] text-[#8E8E93] truncate w-32 md:w-40 mt-0.5">{item.artist}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // Empty / Initial State
                <div className="w-full h-[200px] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 bg-[#1C1C1E]/50">
                    {loading ? (
                        <>
                             <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                             <p className="text-[#8E8E93] text-sm animate-pulse">Consulting the Oracle...</p>
                        </>
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                                <Music2 className="w-6 h-6 text-white/30" />
                            </div>
                            <div className="text-center">
                                <p className="text-white font-medium">No Spotlight Yet</p>
                                <p className="text-[#8E8E93] text-xs mt-1">Generate a smart ranking based on your habits.</p>
                            </div>
                            <button 
                                onClick={handleGenerate}
                                className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                            >
                                Create Spotlight
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
