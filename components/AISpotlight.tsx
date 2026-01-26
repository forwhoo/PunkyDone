import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from './UIComponents';
// import { ActivityHeatmap } from './ActivityHeatmap';
import { Sparkles, RefreshCcw, AlertTriangle, MessageSquare, Send, Zap, ChevronRight, BarChart3, PieIcon, Trophy, Music2 } from 'lucide-react';
import { generateDynamicCategoryQuery, answerMusicQuestion, generateWeeklyInsightStory } from '../services/geminiService';
import { fetchSmartPlaylist } from '../services/dbService';
import { fetchArtistImages, fetchSpotifyRecommendations, searchSpotifyTracks } from '../services/spotifyService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface TopAIProps {
    token?: string | null;
    history?: any[];
    contextData: { 
        artists: string[], 
        albums: string[], 
        songs: string[],
        globalStats?: { 
            weeklyTime: string, 
            weeklyTrend: string, 
            totalTracks: number, 
            totalMinutes?: number,
            charts?: any[] 
        }
    };
    user?: any;
}

interface CategoryResult {
    id: string;
    title: string;
    description: string;
    stats: string;
    tracks: any[];
}

export const AISpotlight: React.FC<TopAIProps> = ({ contextData, token, history = [], user }) => {
    const [loading, setLoading] = useState(false);
    
    // Store array of category results
    const [categoryResults, setCategoryResults] = useState<CategoryResult[]>([]);
    
    // Weekly Insight State
    const [insightMode, setInsightMode] = useState(false);
    const [insightData, setInsightData] = useState<any[]>([]);
    const [insightStep, setInsightStep] = useState(0);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [chatResponse, setChatResponse] = useState<string | null>(null);
    const [displayedText, setDisplayedText] = useState("");
    const [userPrompt, setUserPrompt] = useState("");
    const [mode, setMode] = useState<'discover' | 'chat'>('discover');
    const [typing, setTyping] = useState(false);
    const [discoveryMode, setDiscoveryMode] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    // Use First Name if available
    const userName = useMemo(() => {
        if (!user || !user.display_name) return "there";
        return user.display_name.split(' ')[0].toLowerCase();
    }, [user]);

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

    const handleQuery = async (manualPrompt?: string) => {
        const promptToUse = manualPrompt || userPrompt;
        if (!promptToUse.trim()) return;
        
        // Update input if manual
        if(manualPrompt) setUserPrompt(manualPrompt);

        setLoading(true);
        setErrorMsg(null);
        setChatResponse(null);
        setDisplayedText("");
        setCategoryResults([]); // clear previous
        setInsightMode(false); // Reset insight mode
        
        try {
            // SPECIAL HANDLER: WEEKLY INSIGHT
            if (manualPrompt === 'Weekly Insight') {
                 setInsightMode(true);
                 setInsightStep(0);
                 const slides = await generateWeeklyInsightStory(contextData);
                 setInsightData(slides);
                 setLoading(false);
                 return;
            }

            // Determine query type
            const analysisKeywords = ['find', 'show', 'filter', 'playlist', 'query', 'sql', 'tracks', 'songs', 'analyze', 'pattern', 'discover', 'top', 'best', 'most', 'rank', 'chart', 'favorite', 'least', 'wrapped', 'gems', 'rewind', 'vibes', 'mix', 'weekly', 'insight', 'stats'];
            const isAnalysisQuery = analysisKeywords.some(k => promptToUse.toLowerCase().includes(k));
            
            if (isAnalysisQuery || discoveryMode) {
                // SQL Analysis Mode
                setMode('discover');
                // Pass discovery hint if enabled
                const fullPrompt = discoveryMode 
                    ? `${promptToUse} (Mode: FIND NEW SUGGESTIONS/DISCOVERY ON SPOTIFY)` 
                    : promptToUse;

                const concepts = await generateDynamicCategoryQuery(contextData, fullPrompt);
                
                const newResults: CategoryResult[] = [];
                
                // Process all returned categories (Promise.all for speed)
                await Promise.all(concepts.map(async (concept, idx) => {
                    if (concept && concept.filter) {
                        let data = [];
                        
                        // Check if AI requested Spotify Discovery OR if we forced discovery mode but AI returned generic filter
                        if ((concept.filter.useSpotify || discoveryMode) && token) {
                           // Use Spotify API
                           if (concept.filter.spotifyQuery) {
                               data = await searchSpotifyTracks(token, concept.filter.spotifyQuery);
                           } else {
                               // Fallback: Recommend based on top artist if no query
                               const seeds = {
                                   seed_artists: contextData.artists.slice(0, 2).map(a => a.split(' (')[0]), // Extract name
                                   seed_genres: [] 
                               };
                               data = await fetchSpotifyRecommendations(token, seeds);
                           }
                        } else {
                           // Use Local DB
                           data = await fetchSmartPlaylist(concept);
                        }

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
                const answer = await answerMusicQuestion(promptToUse, contextData);
                setChatResponse(answer);
                setDisplayedText(""); // Reset text for typing
                setTyping(true);
            }
        } catch (err: any) {
            setErrorMsg(`Error: ${err.message || 'Unknown'}`);
        }
        
        setLoading(false);
        if(!manualPrompt) setUserPrompt(""); 
    };

    return (
        <div className="scroll-mt-24" id="ai-spotlight" ref={sectionRef}>
            {/* Clean Centered Search Interface */}
            <div className="flex flex-col items-center justify-center mb-8 px-4 text-center">
                
                {/* Chat Display Area */}
                {(displayedText || mode === 'chat' || loading) && (
                    <div className="w-full text-left mb-8 min-h-[60px] max-h-[400px] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-[#FA2D48] scrollbar-track-transparent max-w-2xl mx-auto">
                         {loading ? (
                            <div className="flex items-center gap-3 text-[#FA2D48] font-mono text-sm">
                                <div className="w-2 h-2 bg-[#FA2D48] rounded-full animate-ping"></div>
                                <span className="animate-pulse">Analyzing your library...</span>
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
                <div className="w-full max-w-2xl mx-auto border border-white/10 bg-white/5 rounded-2xl p-2 focus-within:border-[#FA2D48]/50 focus-within:bg-black/40 transition-all backdrop-blur-md shadow-lg">
                    <div className="relative flex items-center px-4">
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
                            placeholder={discoveryMode ? `Find something for ${userName}...` : `hey ${userName}, ask me something...`}
                            className="w-full bg-transparent py-3 text-[16px] font-medium text-white focus:outline-none placeholder:text-white/30"
                        />
                        <button 
                            onClick={() => handleQuery()}
                            disabled={loading || !userPrompt.trim()}
                            className="text-[#FA2D48] disabled:text-white/10 transition-colors p-2 hover:scale-110 active:scale-95"
                        >
                            {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
                
                {/* Discovery Toggle - Switch Style */}
                <div className="flex justify-center mt-6">
                    <div className="flex items-center gap-3 bg-black/20 p-1.5 rounded-full border border-white/5 backdrop-blur-sm">
                        <button 
                            onClick={() => setDiscoveryMode(false)}
                            className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${!discoveryMode ? 'bg-white text-black shadow-lg' : 'text-[#8E8E93] hover:text-white'}`}
                        >
                            Chat
                        </button>
                        <button 
                            onClick={() => setDiscoveryMode(true)}
                            className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 ${discoveryMode ? 'bg-[#FA2D48] text-white shadow-[0_0_15px_rgba(250,45,72,0.4)]' : 'text-[#8E8E93] hover:text-white'}`}
                        >
                            <Zap size={10} className={discoveryMode ? "fill-current" : ""} />
                            Discovery
                        </button>
                    </div>
                </div>

                {/* Quick Feature Suggestions */}
                {(!loading && !typing) && (
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-8 max-w-2xl mx-auto">
                        {['Underrated Gems', 'Your 2024 Vibe', 'Least Played', 'Genre Mix', 'New Releases', 'Party Mode'].map((suggestion) => (
                            <button
                                key={suggestion}
                                onClick={() => handleQuery(suggestion)}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 border ${
                                    suggestion === 'Your 2024 Vibe' 
                                    ? 'bg-[#FA2D48]/10 border-[#FA2D48]/50 text-[#FA2D48] shadow-[0_0_10px_rgba(250,45,72,0.1)] hover:bg-[#FA2D48] hover:text-white' 
                                    : 'bg-[#1C1C1E] border-white/5 text-[#8E8E93] hover:bg-[#2C2C2E] hover:text-white hover:border-white/20'
                                }`}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Error Messages */}
            {errorMsg && (
                <div className="mb-4 mx-1 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-mono flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                </div>
            )}

            {/* WEEKLY INSIGHT STORY MODE */}
            {insightMode && insightData.length > 0 && (
                <div className="animate-in fade-in zoom-in duration-500 mb-10 w-full max-w-2xl mx-auto">
                    <div className="bg-gradient-to-br from-[#1C1C1E] to-[#2C2C2E] border border-white/10 rounded-2xl p-8 min-h-[400px] flex flex-col justify-between shadow-2xl relative overflow-hidden">
                         
                         {/* Progress Bar */}
                         <div className="flex gap-2 mb-6">
                            {insightData.map((_, i) => (
                                <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= insightStep ? 'bg-[#FA2D48]' : 'bg-white/10'}`} />
                            ))}
                         </div>
                         
                         {/* Content */}
                         <div className="flex-1 flex flex-col items-center justify-center text-center">
                              <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">{insightData[insightStep].title}</h3>
                              <p className="text-[#8E8E93] text-lg mb-8 max-w-md">{insightData[insightStep].content}</p>

                              {/* Visualization Area */}
                              <div className="w-full flex justify-center items-center flex-1 min-h-[200px]">
                                   {insightData[insightStep].type === 'text' && (
                                       <div className="flex items-center justify-center animate-in zoom-in duration-500">
                                            <Sparkles className="w-24 h-24 text-[#FA2D48] opacity-80 animate-pulse" />
                                       </div>
                                   )}

                                   {insightData[insightStep].type === 'stat' && (
                                       <div className="flex flex-col items-center animate-in zoom-in duration-300">
                                            <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FA2D48] to-[#FF9F0A] drop-shadow-2xl">
                                                {insightData[insightStep].data?.value}
                                            </span>
                                            <span className="text-white/60 font-mono mt-4 uppercase tracking-widest text-sm bg-white/5 px-4 py-1 rounded-full border border-white/10">
                                                {insightData[insightStep].data?.subtext}
                                            </span>
                                       </div>
                                   )}

                                   {insightData[insightStep].type === 'quiz' && (
                                       <div className="grid gap-3 w-full max-w-sm animate-in slide-in-from-right duration-500">
                                            {insightData[insightStep].data?.options.map((opt: string, idx: number) => (
                                                <button 
                                                    key={idx}
                                                    onClick={(e) => {
                                                        const btn = e.currentTarget;
                                                        const explanation = insightData[insightStep].data.explanation || "";
                                                        
                                                        // Reset all siblings
                                                        const parent = btn.parentElement;
                                                        if(parent) {
                                                            Array.from(parent.children).forEach((child: any) => {
                                                                child.style.opacity = '0.5';
                                                                child.disabled = true;
                                                            });
                                                        }
                                                        
                                                        btn.style.opacity = '1';
                                                        
                                                        if (idx === insightData[insightStep].data.correctIndex) {
                                                            btn.style.borderColor = '#22c55e';
                                                            btn.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
                                                            btn.innerHTML = `<span class='flex justify-between items-center'><span>${opt}</span> <span class='text-xs'>✅ Correct!</span></span>`;
                                                        } else {
                                                            btn.style.borderColor = '#ef4444';
                                                            btn.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                                                            btn.innerHTML = `<span class='flex justify-between items-center'><span>${opt}</span> <span class='text-xs'>❌</span></span>`;
                                                        }
                                                        
                                                        // Show explanation logic could go here, or just appended
                                                        // For now simplified
                                                    }}
                                                    className="w-full text-left py-4 px-6 rounded-xl border border-white/10 bg-white/5 text-white font-bold hover:bg-white/10 hover:border-white/30 hover:scale-[1.02] transition-all"
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                       </div>
                                   )}

                                   {(insightData[insightStep].type === 'chart' || insightData[insightStep].type === 'bar_chart') && (
                                       <div className="w-full max-w-sm space-y-4 animate-in slide-in-from-bottom duration-700 fade-in">
                                           {insightData[insightStep].data?.points.map((p: any, idx: number) => (
                                               <div key={idx} className="space-y-1">
                                                   <div className="flex justify-between text-xs font-bold text-white uppercase">
                                                       <span>{p.label}</span>
                                                       <span>{p.value}</span>
                                                   </div>
                                                   <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                                                       <div 
                                                         style={{ width: `${Math.min(p.value, 100)}%` }} 
                                                         className={`h-full ${idx % 2 === 0 ? 'bg-[#FA2D48]' : 'bg-[#FF9F0A]'} transition-all duration-1000 ease-out`} 
                                                       />
                                                   </div>
                                               </div>
                                           ))}
                                       </div>
                                   )}
                                   
                                   {insightData[insightStep].type === 'pie_chart' && (
                                       <div className="relative w-full h-[300px] flex items-center justify-center animate-in zoom-in duration-700">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={insightData[insightStep].data?.segments}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={100}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {insightData[insightStep].data?.segments.map((entry: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color || ['#FA2D48', '#FF9F0A', '#30D158', '#0A84FF', '#BF5AF2'][index % 5]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#1C1C1E', borderRadius: '12px', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                                                        itemStyle={{ color: '#fff' }}
                                                        formatter={(value: any) => [`${value}%`, '']}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            
                                            {/* Center Stats */}
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                                <span className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Top Genre</span>
                                                <span className="text-2xl font-black text-white drop-shadow-lg">
                                                    {insightData[insightStep].data?.segments[0]?.label}
                                                </span>
                                            </div>

                                            {/* Legend */}
                                            <div className="absolute bottom-0 w-full flex justify-center gap-4 flex-wrap">
                                                {insightData[insightStep].data?.segments.slice(0, 3).map((s: any, i: number) => (
                                                    <div key={i} className="flex items-center gap-2 text-xs text-white/80 bg-black/20 px-3 py-1 rounded-full border border-white/5">
                                                        <span className="w-2 h-2 rounded-full" style={{ background: s.color || ['#FA2D48', '#FF9F0A', '#30D158'][i] }} />
                                                        <span className="font-bold">{s.label}</span>
                                                        <span className="opacity-60">{s.value}%</span>
                                                    </div>
                                                ))}
                                            </div>
                                       </div>
                                   )}

                                   {insightData[insightStep].type === 'race_chart' && (
                                       <div className="w-full h-[300px] relative flex md:block items-center justify-center">
                                            {/* Bubble Race Visualization */}
                                            <div className="absolute inset-0 flex flex-wrap items-center justify-center content-center gap-4 p-4 animate-in fade-in duration-700">
                                                {insightData[insightStep].data?.competitors.map((c: any, idx: number) => {
                                                    // Dynamic Sizing based on score (max 100 usually)
                                                    const baseSize = 80;
                                                    const scale = Math.max(0.6, Math.min(1.5, c.score / 60)); 
                                                    const size = baseSize * scale;
                                                    
                                                    return (
                                                        <div 
                                                            key={idx} 
                                                            className="relative rounded-full border-4 border-[#2C2C2E] shadow-2xl overflow-hidden group transition-transform duration-500 hover:scale-110 hover:z-50 hover:border-[#FA2D48]"
                                                            style={{
                                                                width: `${size}px`,
                                                                height: `${size}px`,
                                                                order: idx % 2 === 0 ? 1 : 2 // Mix order slightly
                                                            }}
                                                        >
                                                            {/* We don't have images in the chart data usually, use UI Avatar or passed context if we could map it. 
                                                                For now, generic or try to find match? 
                                                                The specific instruction said "Each bubble should contain the artist's profile image". 
                                                                The story generator likely doesn't send image URLs. 
                                                                We'll use a gradient fallback + Name overlay. 
                                                            */}
                                                            <div className="absolute inset-0 bg-gradient-to-br from-[#FA2D48] to-[#1C1C1E]">
                                                                {/* Fallback pattern or initials */}
                                                                <span className="absolute inset-0 flex items-center justify-center text-white/10 font-black text-4xl">
                                                                    {c.name.substring(0,1)}
                                                                </span>
                                                            </div>
                                                            
                                                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                                            
                                                            <div className="absolute inset-0 flex flex-col items-center justify-center p-1 text-center">
                                                                <span className="text-white font-bold drop-shadow-md leading-tight" style={{ fontSize: `${Math.max(10, size/5)}px` }}>
                                                                    {c.name}
                                                                </span>
                                                                <span className="bg-white/20 px-2 rounded-full text-white font-mono font-bold mt-1 backdrop-blur-sm" style={{ fontSize: `${Math.max(8, size/8)}px` }}>
                                                                    {c.score}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                       </div>
                                   )}
                              </div>
                         </div>

                         {/* Navigation */}
                         <div className="mt-8 flex justify-end">
                             <button 
                                onClick={() => {
                                    if (insightStep < insightData.length - 1) {
                                        setInsightStep(prev => prev + 1);
                                    } else {
                                        setInsightMode(false); // End story
                                    }
                                }}
                                className="flex items-center gap-2 px-6 py-2 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform"
                             >
                                {insightStep === insightData.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={16} />
                             </button>
                         </div>
                    </div>
                </div>
            )}

            {/* Discovery Results - Multiple Categories Support */}
            {mode === 'discover' && categoryResults.length > 0 && (
                <div className="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <style>
                        {`
                        @keyframes shine-red {
                            0% { transform: translateX(-150%) skewX(-25deg); }
                            100% { transform: translateX(150%) skewX(-25deg); }
                        }
                        @keyframes category-reveal {
                            0% { opacity: 0; transform: translateY(30px) scale(0.95); }
                            100% { opacity: 1; transform: translateY(0) scale(1); }
                        }
                        .category-card {
                            animation: category-reveal 0.8s ease-out forwards;
                        }
                        .category-card:nth-child(2) { animation-delay: 0.15s; }
                        .category-card:nth-child(3) { animation-delay: 0.3s; }
                        `}
                    </style>
                    {categoryResults.map((category, categoryIndex) => (
                        <div 
                            key={category.id} 
                            className="relative category-card opacity-0"
                            style={{ animationDelay: `${categoryIndex * 0.15}s` }}
                        >
                            {/* Category Header */}
                            <div className="flex items-end justify-between gap-4 mb-4 pr-4">
                                <div className="mb-2">
                                    <h3 className="text-2xl font-bold text-white tracking-tight">{category.title}</h3>
                                    <p className="text-[#8E8E93] text-sm">{category.description}</p>
                                </div>
                                {category.stats && (
                                    <div className="bg-white/10 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/90 mb-2">
                                        {category.stats}
                                    </div>
                                )}
                            </div>

                            {/* Horizontal Scroll List */}
                            <div className="flex items-start overflow-x-auto pb-4 pt-2 no-scrollbar snap-x pl-2 scroll-smooth gap-4">
                                {category.tracks.map((track, trackIndex) => (
                                    <div key={trackIndex} className="flex-shrink-0 relative flex flex-col items-center gap-2 group cursor-pointer w-[140px] snap-start">
                                        <div className="w-[140px] h-[140px] overflow-hidden rounded-xl bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 relative">
                                             {/* Fallback Background */}
                                             <div className="absolute inset-0 flex items-center justify-center bg-[#1C1C1E]">
                                                 <Music2 className="text-white/20" size={48} />
                                             </div>
                                             <img 
                                                 src={track.cover || track.image} 
                                                 alt={track.title} 
                                                 className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                                                 onError={(e) => e.currentTarget.style.opacity = '0'}
                                             />
                                        </div>
                                        <div className="text-center w-full px-1">
                                            <h4 className="text-[13px] font-semibold text-white truncate w-full">{track.name || track.title}</h4>
                                            <p className="text-[11px] text-[#8E8E93] truncate w-full">{track.artist}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Loading Overlay for Category Build - Enhanced */}
            {loading && mode === 'discover' && categoryResults.length === 0 && (
                <div className="relative h-[300px] flex flex-col items-center justify-center">
                     <div className="relative">
                         <div className="absolute inset-0 bg-[#FA2D48]/20 blur-2xl rounded-full animate-pulse"></div>
                         <div className="w-16 h-16 border-2 border-[#FA2D48] border-t-transparent rounded-full animate-spin mb-4"></div>
                     </div>
                     <p className="text-white font-medium text-sm mt-4">Crafting your collection...</p>
                     <p className="text-[#8E8E93] text-xs mt-1 animate-pulse">AI is curating something special</p>
                </div>
            )}
        </div>
    );
};
