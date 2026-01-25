import React, { useState, useEffect, useRef } from 'react';
import { Card } from './UIComponents';
import { Sparkles, RefreshCcw, AlertTriangle, MessageSquare, Send } from 'lucide-react';
import { generateDynamicCategoryQuery, answerMusicQuestion } from '../services/geminiService';
import { fetchSmartPlaylist } from '../services/dbService';
import { fetchArtistImages } from '../services/spotifyService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface TopAIProps {
    token?: string | null;
    contextData: { 
        artists: string[], 
        albums: string[], 
        songs: string[],
        globalStats?: { weeklyTime: string, weeklyTrend: string, totalTracks: number, totalMinutes?: number }
    };
}

interface CategoryResult {
    id: string;
    title: string;
    description: string;
    stats: string;
    tracks: any[];
}

export const AISpotlight: React.FC<TopAIProps> = ({ contextData, token }) => {
    const [loading, setLoading] = useState(false);
    
    // Store array of category results
    const [categoryResults, setCategoryResults] = useState<CategoryResult[]>([]);
    
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [chatResponse, setChatResponse] = useState<string | null>(null);
    const [displayedText, setDisplayedText] = useState("");
    const [userPrompt, setUserPrompt] = useState("");
    const [mode, setMode] = useState<'discover' | 'chat'>('discover');
    const [typing, setTyping] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    // Typing effect logic
    useEffect(() => {
        if (typing && chatResponse) {
            let i = 0;
            // setDisplayedText(""); // Don't reset if we are appending chunks (simple typing here)
            const timer = setInterval(() => {
                if (i < chatResponse.length) {
                    setDisplayedText((prev) => {
                         // Simple protection against double-typing if effect re-runs
                         if (prev.length >= chatResponse.length) return prev;
                         return chatResponse.slice(0, prev.length + 1);
                    });
                    i++;
                } else {
                    clearInterval(timer);
                    setTyping(false);
                }
            }, 10); // Faster typing
            return () => clearInterval(timer);
        }
    }, [typing, chatResponse]);

    const handleQuery = async () => {
        if (!userPrompt.trim()) return;
        
        setLoading(true);
        setErrorMsg(null);
        setChatResponse(null);
        setDisplayedText("");
        setCategoryResults([]); // clear previous
        
        try {
            // Determine query type
            const analysisKeywords = ['find', 'show', 'filter', 'playlist', 'query', 'sql', 'tracks', 'songs', 'analyze', 'pattern', 'discover', 'top', 'best', 'most', 'rank', 'chart', 'favorite', 'least'];
            const isAnalysisQuery = analysisKeywords.some(k => userPrompt.toLowerCase().includes(k));
            
            if (isAnalysisQuery) {
                // SQL Analysis Mode
                setMode('discover');
                const concepts = await generateDynamicCategoryQuery(contextData, userPrompt);
                
                const newResults: CategoryResult[] = [];
                
                // Process all returned categories (Promise.all for speed)
                await Promise.all(concepts.map(async (concept, idx) => {
                    if (concept && concept.filter) {
                        const data = await fetchSmartPlaylist(concept);
                        if (data.length > 0) {
                            newResults.push({
                                id: `cat-${Date.now()}-${idx}`,
                                title: concept.title,
                                description: concept.description,
                                stats: `${data.length} items · ${Math.round(data.reduce((acc: number, curr: any) => acc + (curr.totalMinutes || 0), 0))} mins`,
                                tracks: data
                            });
                        }
                    }
                }));

                // Fetch real images for artists if needed
                if (token && newResults.length > 0) {
                    const artistNames = new Set<string>();
                    newResults.forEach(cat => {
                        cat.tracks.forEach(t => {
                            if (t.type === 'artist' && !t.cover) {
                                artistNames.add(t.title);
                            }
                        });
                    });

                    if (artistNames.size > 0) {
                        try {
                            const images = await fetchArtistImages(token, Array.from(artistNames));
                            newResults.forEach(cat => {
                                cat.tracks.forEach(t => {
                                    if (t.type === 'artist' && !t.cover) {
                                        if (images[t.title]) {
                                            t.cover = images[t.title];
                                        } else {
                                            t.cover = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.title)}&background=1DB954&color=fff&length=1`;
                                        }
                                    }
                                });
                            });
                        } catch (e) {
                            console.error("Failed to load artist images", e);
                        }
                    }
                }

                // Sort by title or original order (concepts order matches index)
                // But simplified: just use pushed order or sort by idx if needed.
                // Since Promise.all runs in parallel, order might jumble slightly if not careful, 
                // but usually fine. For strict order we could map then filter.
                
                if (newResults.length === 0) {
                    setErrorMsg(`No results found for "${userPrompt}". Try a different query.`);
                } else {
                    setCategoryResults(newResults);
                }

            } else {
                // Chat Mode
                setMode('chat');
                const answer = await answerMusicQuestion(userPrompt, contextData);
                setChatResponse(answer);
                setDisplayedText(""); // Reset text for typing
                setTyping(true);
            }
        } catch (err: any) {
            setErrorMsg(`Error: ${err.message || 'Unknown'}`);
        }
        
        setLoading(false);
        setUserPrompt("");
    };

    return (
        <div className="mb-12 scroll-mt-24" id="ai-spotlight" ref={sectionRef}>
            {/* Section Header - Minimal Chat Style */}
            <div className="flex flex-col items-center justify-center mb-10 px-1 mx-1 text-center">
                <h2 className="text-[28px] font-bold text-white tracking-tight mb-8">
                    The Discovery
                </h2>
                
                {/* Chat Display Area */}
                {(displayedText || mode === 'chat' || loading) && (
                    <div className="w-full text-left mb-10 min-h-[60px] max-h-[400px] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-[#FA2D48] scrollbar-track-transparent">
                         {loading ? (
                            <div className="flex items-center gap-2 text-[#FA2D48] font-mono text-sm animate-pulse">
                                <span className="w-2 h-2 bg-[#FA2D48] rounded-full"></span>
                                Analyzing your library...
                            </div>
                         ) : (
                            <div className="text-white text-lg font-medium leading-relaxed font-mono whitespace-pre-wrap markdown-container">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {typing ? displayedText : (chatResponse || "")}
                                </ReactMarkdown>
                                {typing && <span className="inline-block w-[3px] h-6 ml-1 bg-[#FA2D48] align-middle animate-pulse"></span>}
                            </div>
                         )}

                         {/* AI Suggestion Button - Centered & Clean */}
                         {mode === 'chat' && !typing && !loading && categoryResults.length === 0 && (
                            <div className="mt-8 flex flex-col items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
                                <button 
                                    onClick={async () => {
                                        setLoading(true);
                                        const concepts = await generateDynamicCategoryQuery(contextData, `Create discovery categories based on: ${chatResponse}`);
                                        
                                        const newResults: CategoryResult[] = [];
                                        await Promise.all(concepts.map(async (concept, idx) => {
                                             if (concept.filter) {
                                                const data = await fetchSmartPlaylist(concept);
                                                if (data.length > 0) {
                                                    newResults.push({
                                                        id: `cat-${Date.now()}-${idx}`,
                                                        title: concept.title,
                                                        description: concept.description,
                                                        stats: `${data.length} items`,
                                                        tracks: data
                                                    });
                                                }
                                             }
                                        }));

                                        // Fetch real images for artists if needed
                                        if (token && newResults.length > 0) {
                                            const artistNames = new Set<string>();
                                            newResults.forEach(cat => {
                                                cat.tracks.forEach(t => {
                                                    if (t.type === 'artist' && !t.cover) {
                                                        artistNames.add(t.title);
                                                    }
                                                });
                                            });

                                            if (artistNames.size > 0) {
                                                try {
                                                    const images = await fetchArtistImages(token, Array.from(artistNames));
                                                    newResults.forEach(cat => {
                                                        cat.tracks.forEach(t => {
                                                            if (t.type === 'artist' && !t.cover) {
                                                                if (images[t.title]) t.cover = images[t.title];
                                                                else t.cover = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.title)}&background=1DB954&color=fff&length=1`;
                                                            }
                                                        });
                                                    });
                                                } catch (e) {
                                                    console.error("Failed to load artist images", e);
                                                }
                                            }
                                        }
                                        
                                        if(newResults.length > 0) {
                                            setCategoryResults(newResults);
                                            setMode('discover');
                                        }
                                        setLoading(false);
                                    }}
                                    className="px-8 py-3 rounded-full bg-[#1C1C1E] border border-white/10 text-white text-[13px] font-bold uppercase tracking-wider hover:bg-[#FA2D48] hover:border-[#FA2D48] hover:text-white transition-all flex items-center gap-2 shadow-lg active:scale-95 group"
                                >
                                    <Sparkles className="w-4 h-4 text-[#FA2D48] group-hover:text-white transition-colors" />
                                    Visualize Collection
                                </button>
                                <p className="text-[#8E8E93] text-[11px]">Turn this conversation into a high-fidelity category.</p>
                            </div>
                         )}
                    </div>
                )}
                
                {/* Minimal Search Input - Line Style */}
                <div className="w-full max-w-2xl mx-auto border-b border-white/10 focus-within:border-[#FA2D48]/50 transition-colors">
                    <div className="relative flex items-center">
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
                            placeholder="Ask me anything..."
                            className="w-full bg-transparent px-0 py-4 text-[22px] font-light text-white focus:outline-none placeholder:text-[#333]"
                        />
                        <button 
                            onClick={handleQuery}
                            disabled={loading || !userPrompt.trim()}
                            className="text-[#FA2D48] disabled:text-[#333] transition-colors p-2"
                        >
                            {loading ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
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

            {/* Discovery Results - Multiple Categories Support */}
            {mode === 'discover' && categoryResults.length > 0 && (
                <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    {categoryResults.map((category) => (
                        <div key={category.id} className="relative">
                            {/* Category Header */}
                            <div className="mb-6 mx-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Sparkles className="w-5 h-5 text-[#FA2D48]" />
                                    <h3 className="text-[24px] font-bold text-white tracking-tight">{category.title}</h3>
                                </div>
                                <p className="text-[#8E8E93] text-[15px] mb-4 max-w-xl leading-relaxed">{category.description}</p>
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 text-[11px] font-bold font-mono">
                                    {category.stats}
                                </div>
                            </div>
                            
                            {/* Tracks Carousel */}
                            <div className="flex items-end overflow-x-auto pb-10 pt-2 no-scrollbar snap-x pl-2 scroll-smooth">
                                {category.tracks.map((item, index) => (
                                    <div key={`${category.id}-${item.id || index}`} className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]">
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
                                                <p className="text-[13px] text-[#8E8E93] truncate w-32 md:w-40 mt-0.5">
                                                    {(item.type === 'artist' || item.title === item.artist) ? 'Artist' : item.artist}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Loading Overlay for Category Build */}
            {loading && mode === 'discover' && categoryResults.length === 0 && (
                <div className="relative h-[300px] flex flex-col items-center justify-center">
                     <div className="w-10 h-10 border-2 border-[#FA2D48] border-t-transparent rounded-full animate-spin mb-4"></div>
                     <p className="text-[#8E8E93] text-sm animate-pulse">Designing your collection...</p>
                </div>
            )}
        </div>
    );
};
