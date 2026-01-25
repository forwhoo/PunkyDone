import React, { useState, useEffect, useRef } from 'react';
import { Card } from './UIComponents';
import { Sparkles, RefreshCcw, AlertTriangle, MessageSquare } from 'lucide-react';
import { generateDynamicCategoryQuery, answerMusicQuestion } from '../services/geminiService';
import { fetchSmartPlaylist } from '../services/dbService';

interface TopAIProps {
    contextData: { artists: string[], albums: string[], songs: string[] };
}

export const AISpotlight: React.FC<TopAIProps> = ({ contextData }) => {
    const [loading, setLoading] = useState(false);
    const [category, setCategory] = useState<any>(null);
    const [results, setResults] = useState<any[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [chatResponse, setChatResponse] = useState<string | null>(null);
    const [userPrompt, setUserPrompt] = useState("");
    const [mode, setMode] = useState<'discover' | 'chat'>('discover');
    const sectionRef = useRef<HTMLDivElement>(null);

    const handleQuery = async () => {
        if (!userPrompt.trim()) return;
        
        setLoading(true);
        setErrorMsg(null);
        setChatResponse(null);
        setResults([]);
        setCategory(null);
        
        try {
            // Determine if user wants SQL analysis or just a chat response
            const isAnalysisQuery = userPrompt.toLowerCase().match(/(playlist|tracks?|songs?|artist|album|find|show|filter|when|how many|what|analyze)/);
            
            if (isAnalysisQuery) {
                // SQL Analysis Mode
                setMode('discover');
                const concept = await generateDynamicCategoryQuery(contextData, userPrompt);
                setCategory(concept);
                
                if (concept && concept.filter) {
                    const data = await fetchSmartPlaylist(concept);
                    setResults(data);
                    
                    if (data.length === 0) {
                        setErrorMsg(`No results found for "${userPrompt}". Try a different query.`);
                    }
                } else {
                    setErrorMsg("Could not generate query. Try rephrasing.");
                }
            } else {
                // Chat Mode - Answer questions about music
                setMode('chat');
                const answer = await answerMusicQuestion(userPrompt, contextData);
                setChatResponse(answer);
            }
        } catch (err: any) {
            setErrorMsg(`Error: ${err.message || 'Unknown'}`);
        }
        
        setLoading(false);
        setUserPrompt("");
    };

    return (
        <div className="mb-12 scroll-mt-24" id="ai-spotlight" ref={sectionRef}>
            {/* Section Header - Simplified */}
            <div className="flex flex-col items-center justify-center mb-8 px-1 mx-1 gap-4 text-center">
                <div>
                    <h2 className="text-[28px] font-bold text-white tracking-tight mb-3">
                        The Discovery
                    </h2>
                </div>
                
                {/* Centered Search Input */}
                <div className="w-full max-w-2xl mx-auto">
                    <div className="relative group">
                        <input 
                            type="text"
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            onKeyDown={(e) => {
                                if(e.key === 'Enter') {
                                    e.preventDefault();
                                    handleQuery();
                                }
                            }}
                            placeholder="Ask about your music..."
                            className="w-full bg-[#1C1C1E] border border-white/10 rounded-full px-6 py-4 text-[15px] text-white focus:outline-none focus:border-[#FA2D48]/50 focus:ring-2 focus:ring-[#FA2D48]/20 transition-all placeholder:text-[#555]"
                        />
                        <button 
                            onClick={handleQuery}
                            disabled={loading || !userPrompt.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#FA2D48] text-white px-6 py-2 rounded-full text-[12px] font-bold uppercase tracking-wide hover:bg-[#D41E36] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            {loading ? 'Analyzing...' : 'Discover'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Messages */}
            {errorMsg && (
                <div className="mb-4 mx-1 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                </div>
            )}

            {/* Chat Response */}
            {mode === 'chat' && chatResponse && (
                <div className="mb-6 mx-1 bg-[#1C1C1E] border border-[#FA2D48]/20 rounded-xl p-6">
                    <div className="flex items-start gap-3 mb-3">
                        <MessageSquare className="w-5 h-5 text-[#FA2D48] flex-shrink-0 mt-1" />
                        <div className="flex-1">
                            <p className="text-white text-[15px] leading-relaxed whitespace-pre-wrap">{chatResponse}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Discovery Results */}
            {mode === 'discover' && category && (
                <div className="mb-4 mx-1">
                    <div className="flex items-center gap-3 mb-3">
                        <Sparkles className="w-5 h-5 text-[#FA2D48]" />
                        <h3 className="text-[20px] font-bold text-white">{category.title}</h3>
                    </div>
                    <p className="text-[#8E8E93] text-[14px] mb-2">{category.description}</p>
                    {results.length > 0 && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FA2D48]/10 border border-[#FA2D48]/20 text-[#FA2D48] text-[11px] font-bold">
                            <Sparkles className="w-3 h-3" />
                            {results.length} tracks · {Math.round(results.reduce((acc, curr) => acc + (curr.totalMinutes || 0), 0))} total minutes
                        </div>
                    )}
                </div>
            )}

            {/* Results - Top Albums Style Carousel */}
            <div className="relative min-h-[240px]">
                {loading && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm rounded-2xl">
                         <div className="w-10 h-10 border-2 border-[#FA2D48] border-t-transparent rounded-full animate-spin mb-4"></div>
                         <p className="text-[#8E8E93] text-sm animate-pulse">Analyzing your music...</p>
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
                                            <span className="text-white font-bold text-2xl drop-shadow-md">{item.timeStr || item.listens}</span>
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
                ) : !loading && mode === 'discover' && (
                    <div className="w-full h-[200px] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-4 bg-[#1C1C1E]/50 mx-1">
                        <Sparkles className="w-8 h-8 text-white/20" />
                        <div className="text-center">
                            <p className="text-white font-medium">Ready to discover</p>
                            <p className="text-[#8E8E93] text-xs mt-1">Ask a question or request a playlist above</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
