import React, { useState } from 'react';
import { Card } from './UIComponents';
import { Sparkles, RefreshCcw, AlertTriangle, Play } from 'lucide-react';
import { generateDynamicCategoryQuery } from '../services/geminiService';
import { fetchSmartPlaylist } from '../services/dbService';
import { ChevronRight } from 'lucide-react';

interface TopAIProps {
    contextData: { artists: string[], albums: string[], songs: string[] };
}

import React, { useState, useEffect, useRef } from 'react';
import { Card } from './UIComponents';
import { Sparkles, RefreshCcw, AlertTriangle, Play, Search, ArrowRight } from 'lucide-react';
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
    const [userPrompt, setUserPrompt] = useState("");
    const sectionRef = useRef<HTMLDivElement>(null);

    const handleGenerate = async (explicitPrompt?: string) => {
        setLoading(true);
        setErrorMsg(null);
        setDebugInfo(null);
        
        try {
            const concept = await generateDynamicCategoryQuery(contextData, explicitPrompt || userPrompt);
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
        setUserPrompt(""); // Clear after use
    };

    // Auto-generate on first load
    useEffect(() => {
        if (results.length === 0 && !loading && !category) {
            handleGenerate();
        }
    }, []);
    
    const scrollToSpotlight = () => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="mb-12 scroll-mt-24" id="ai-spotlight" ref={sectionRef}>
            {/* Section Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 px-1 mx-1 gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-5 h-5 text-[#FA2D48]" />
                        <h2 className="text-[22px] font-bold text-white tracking-tight">
                            {category ? category.title : "Music Intelligence"}
                        </h2>
                    </div>
                    {category && <p className="text-[#8E8E93] text-[13px] leading-relaxed max-w-xl">{category.description}</p>}
                </div>
                
                {/* Search / Ask Box */}
                <div className="relative group min-w-[300px]">
                    <input 
                        type="text" 
                        value={userPrompt}
                        onChange={(e) => setUserPrompt(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                        placeholder="Ask for anything... (e.g. 'Only Harry Styles')"
                        className="w-full bg-[#1C1C1E] border border-white/10 rounded-full py-2.5 pl-10 pr-12 text-sm text-white focus:outline-none focus:border-[#FA2D48]/50 focus:ring-1 focus:ring-[#FA2D48]/20 transition-all placeholder:text-[#444]"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                    <button 
                        onClick={() => handleGenerate()}
                        disabled={loading || !userPrompt}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#FA2D48] text-white p-1.5 rounded-full hover:scale-110 transition-transform disabled:opacity-0"
                    >
                        <ArrowRight className="w-4 h-4" />
                    </button>
                    
                    {!userPrompt && (
                        <button 
                            onClick={() => handleGenerate()}
                            disabled={loading}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8E8E93] hover:text-[#FA2D48] transition-colors p-1"
                        >
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>
            </div>

            {/* Jump Button (Shown when user asks something) */}
            {category && results.length > 0 && (
                <div className="mb-4 mx-1 animate-in fade-in slide-in-from-left-4 duration-500">
                    <button 
                        onClick={scrollToSpotlight}
                        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-[#FA2D48] hover:opacity-80 transition-opacity"
                    >
                        <span>Jump to Section</span>
                        <ChevronRight className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Debug/Error stuff remains... */}
            {errorMsg && (
                <div className="mb-4 mx-1 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                </div>
            )}

            {/* Results - Top Albums Style Carousel */}
            <div className="relative min-h-[240px]">
                {loading && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm rounded-2xl">
                         <div className="w-10 h-10 border-2 border-[#FA2D48] border-t-transparent rounded-full animate-spin mb-4"></div>
                         <p className="text-[#8E8E93] text-sm animate-pulse">Consulting your music DNA...</p>
                    </div>
                )}
                
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
                ) : !loading && (
                    <div className="w-full h-[200px] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 bg-[#1C1C1E]/50 mx-1">
                        <Sparkles className="w-8 h-8 text-white/20" />
                        <div className="text-center">
                            <p className="text-white font-medium">Something went wrong</p>
                            <p className="text-[#8E8E93] text-xs mt-1">Try a different prompt or remix.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
