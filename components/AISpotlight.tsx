import React, { useState } from 'react';
import { Card } from './UIComponents';
import { Sparkles, RefreshCcw, AlertTriangle, Play } from 'lucide-react';
import { generateDynamicCategoryQuery } from '../services/geminiService';
import { fetchSmartPlaylist } from '../services/dbService';
import { ChevronRight } from 'lucide-react';

interface TopAIProps {
    contextData: { artists: string[], albums: string[], songs: string[] };
}

export const AISpotlight: React.FC<TopAIProps> = ({ contextData }) => {
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState<any>(null);
    const [results, setResults] = useState<any[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setErrorMsg(null);
        setDebugInfo(null);
        setResults([]);
        
        try {
            const concept = await generateDynamicCategoryQuery(contextData);
            setCategory(concept);
            
            if (concept.filter) {
                setDebugInfo(JSON.stringify(concept.filter, null, 0));
            }
            
            if (concept.isError) {
                setErrorMsg(concept.description);
            }

            if (concept && concept.filter) {
                const data = await fetchSmartPlaylist(concept);
                setResults(data);
                
                if (data.length === 0 && !concept.isError) {
                    const filterDesc = concept.filter.value || concept.filter.contains || concept.filter.timeOfDay || 'filter';
                    setErrorMsg(`No results for: ${filterDesc}. Try again for a different mix.`);
                }
            } else {
                 setErrorMsg("AI returned invalid structure. Try again.");
            }
        } catch (err: any) {
            setErrorMsg(`Error: ${err.message || 'Unknown'}`);
        }
        
        setLoading(false);
    };
    
    return (
        <div className="mb-12">
            {/* Section Header - Matches Top Albums */}
            <div className="flex justify-between items-end mb-6 px-1 mx-1">
                <div>
                    <h2 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#FA2D48]" />
                        {category ? category.title : "AI Spotlight"}
                    </h2>
                    {category && <p className="text-[#8E8E93] text-[13px] mt-0.5">{category.description}</p>}
                </div>
                <button 
                    onClick={handleGenerate}
                    disabled={loading}
                    className="flex items-center gap-1 text-[#FA2D48] cursor-pointer hover:opacity-80 transition-opacity"
                >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span className="text-[13px] font-medium">{category ? "Remix" : "Generate"}</span>
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* Debug/Error */}
            {debugInfo && (
                <div className="mb-2 mx-1 bg-white/5 border border-white/10 text-[#8E8E93] p-2 rounded-lg text-[10px] font-mono overflow-x-auto">
                    <span className="text-white/40">Filter:</span> {debugInfo}
                </div>
            )}
            
            {errorMsg && (
                <div className="mb-4 mx-1 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                </div>
            )}

            {/* Results - Top Albums Style Carousel */}
            {results.length > 0 ? (
                <div className="flex items-end overflow-x-auto pb-10 pt-2 no-scrollbar snap-x pl-2 scroll-smooth">
                    {results.map((item, index) => (
                        <div key={item.id || index} className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]">
                            <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40">
                                {index + 1}
                            </span>
                            <div className="relative z-10 ml-10 md:ml-12">
                                <div className="w-32 h-32 md:w-40 md:h-40 overflow-hidden rounded-xl bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                                    <img src={item.cover} alt={item.title} className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm" />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                                        <span className="text-white font-bold text-2xl drop-shadow-md">{item.listens}</span>
                                        <span className="text-white/80 text-[10px] uppercase tracking-widest font-bold">Plays</span>
                                    </div>
                                </div>
                                <div className="mt-3 relative z-20">
                                    <h3 className="text-[15px] font-semibold text-white truncate w-32 md:w-40 leading-tight group-hover:text-[#FA2D48] transition-colors">{item.title}</h3>
                                    <p className="text-[13px] text-[#8E8E93] truncate w-32 md:w-40 mt-0.5">{item.artist}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Empty State */
                <div className="w-full h-[200px] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 bg-[#1C1C1E]/50 mx-1">
                    {loading ? (
                        <>
                             <div className="w-10 h-10 border-2 border-[#FA2D48] border-t-transparent rounded-full animate-spin"></div>
                             <p className="text-[#8E8E93] text-sm animate-pulse">Crafting your mix...</p>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-8 h-8 text-white/20" />
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
