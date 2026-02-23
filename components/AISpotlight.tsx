import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card } from './UIComponents';
// import { ActivityHeatmap } from './ActivityHeatmap';
import {
    Sparkles, RefreshCcw, AlertTriangle, MessageSquare, Send, Zap, ChevronRight,
    BarChart3, ChartPie, Trophy, Music2, Gift, ChevronLeft, ArrowUp, Palette,
    Music, Mic2, Disc, Clock, Orbit, Flame, Radio, TrendingUp, Moon,
    SkipForward, BarChart2, Search, SlidersHorizontal, Image, Grid3x3,
    Network, History, ArrowLeftRight, ImageIcon, Timer, Globe,
    ArrowUpDown, Heart, PieChart as PieChartIcon, Calendar, Play, Star, CheckCircle, Repeat,
    Briefcase, CloudSun, CalendarClock, Car, Sparkles as SparklesIcon, LineChart,
    FastForward, DoorOpen, Users, Target, ChevronDown, CheckSquare, type LucideIcon
} from 'lucide-react';
import { generateDynamicCategoryQuery, answerMusicQuestionWithTools, streamMusicQuestionWithTools, generateWeeklyInsightStory, generateWrappedVibe, WrappedSlide, ToolCallInfo, AI_MODELS, DEFAULT_MODEL_ID } from '../services/mistralService';
import { fetchSmartPlaylist, uploadExtendedHistory, backfillExtendedHistoryImages, SpotifyHistoryItem, getWrappedStats } from '../services/dbService';
import { fetchArtistImages, fetchSpotifyRecommendations, searchSpotifyTracks } from '../services/spotifyService';
import { generateCanvasComponent, CanvasComponent } from '../services/canvasService';
import { CanvasRenderer } from './CanvasRenderer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader } from '@/components/prompt-kit/loader';
import { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor } from '@/components/prompt-kit/chat-container';
import { Message, MessageContent } from '@/components/prompt-kit/message';
import { PromptInput, PromptInputTextarea, PromptInputActions } from '@/components/prompt-kit/prompt-input';
import { Source, SourceContent, SourceTrigger } from '@/components/prompt-kit/source';
import { Tool, ToolPart } from '@/components/prompt-kit/tool';
import { ChainOfThought, ChainOfThoughtStep, ChainOfThoughtTrigger, ChainOfThoughtContent, ChainOfThoughtItem } from '@/components/prompt-kit/chain-of-thought';

// ─── Lucide Icon Map for Tool Call Pills ────────────────────────
const TOOL_LUCIDE_MAP: Record<string, LucideIcon> = {
    Music, Mic2, Disc, Clock, Orbit, Flame, BarChart3, Radio, TrendingUp, Moon,
    SkipForward, BarChart2, Gift, Search, SlidersHorizontal, Image, Grid3x3,
    Network, ChartPie, History, ArrowLeftRight, ImageIcon, Timer,
    ArrowUpDown, Heart, PieChart: PieChartIcon, Calendar, Play, Star, CheckCircle, Repeat,
    Briefcase, CloudSun, CalendarClock, Car, LineChart,
    FastForward, DoorOpen, Users, Target,
    vote: CheckSquare
};

const ToolIcon = ({ iconName, size = 12 }: { iconName: string; size?: number }) => {
    const IconComponent = TOOL_LUCIDE_MAP[iconName];
    if (IconComponent) {
        return <IconComponent size={size} />;
    }
    // Fallback to Zap for unknown icon names
    return <Zap size={size} />;
};

const VoteTool = ({ tool, onVote }: { tool: ToolPart, onVote: (selections: string[]) => void }) => {
    const [selections, setSelections] = useState<string[]>([]);
    const [submitted, setSubmitted] = useState(false);
    const options = tool.input?.options || [];
    const multiSelect = !!tool.input?.multi_select;
    const title = tool.input?.title || "Quick Poll";

    if (tool.state !== 'output-available') return null;

    const toggleOption = (opt: string) => {
        if (submitted) return;
        if (multiSelect) {
            setSelections(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]);
        } else {
            setSelections([opt]);
        }
    };

    const handleSubmit = () => {
        if (selections.length === 0) return;
        setSubmitted(true);
        onVote(selections);
    };

    return (
        <div className="w-full max-w-md my-4 border border-white/10 rounded-2xl overflow-hidden bg-white/[0.03] p-5 backdrop-blur-md">
            <h4 className="text-[15px] font-bold text-white mb-4 flex items-center gap-2">
                <CheckSquare size={16} className="text-[#FA2D48]" />
                {title}
            </h4>
            <div className="space-y-2">
                {options.map((opt: string, idx: number) => (
                    <button
                        key={idx}
                        disabled={submitted}
                        onClick={() => toggleOption(opt)}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium flex items-center justify-between ${
                            selections.includes(opt)
                                ? 'bg-[#FA2D48]/10 border-[#FA2D48]/40 text-white'
                                : 'bg-white/5 border-white/5 text-white/60 hover:border-white/20'
                        } ${submitted && !selections.includes(opt) ? 'opacity-40' : ''}`}
                    >
                        <span>{opt}</span>
                        {selections.includes(opt) && <CheckCircle size={14} className="text-[#FA2D48]" />}
                    </button>
                ))}
            </div>
            {!submitted && (
                <Button
                    onClick={handleSubmit}
                    disabled={selections.length === 0}
                    className="w-full mt-4 bg-white text-black hover:bg-zinc-200 font-bold py-2.5"
                >
                    Submit Vote
                </Button>
            )}
            {submitted && (
                <p className="text-[11px] text-white/40 text-center mt-3 font-medium italic">Vote submitted</p>
            )}
        </div>
    );
};

const CollapsibleTools = ({ tools, onVote }: { tools: ToolPart[], onVote: (selections: string[]) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    if (!tools || tools.length === 0) return null;

    // Check if there is a vote tool
    const voteTool = tools.find(t => t.type === 'vote');

    return (
        <div className="w-full max-w-md my-4 border border-white/5 rounded-xl overflow-hidden bg-white/[0.02]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.03] transition-colors text-[12px] font-medium text-white/50"
            >
                <div className="flex items-center gap-2">
                    <Zap size={12} className="text-[#FF9F0A]" />
                    <span>Tools ({tools.length} calls)</span>
                </div>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-3 bg-black/20">
                            {tools.map((tool, idx) => (
                                <Tool key={idx} toolPart={tool} className="my-0 border-white/5 bg-transparent" />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {voteTool && <VoteTool tool={voteTool} onVote={onVote} />}
        </div>
    );
};

interface TopAIProps {
    token?: string | null;
    history?: any[];
    contextData: {
        artists: string[],
        albums: string[],
        songs: string[],
        userName?: string,
        globalStats?: {
            weeklyTime: string,
            weeklyTrend: string,
            totalTracks: number,
            totalMinutes?: number,
            charts?: any[]
        }
    };
    user?: any;
    initialQuery?: string;
}

// Reusable Ranked Item Component (Internal)
const formatDuration = (durationMs?: number) => {
    if (!durationMs || Number.isNaN(durationMs)) return null;
    const totalSeconds = Math.round(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')} `;
};

const AI_RankedItem = ({ item, rank, displayMode = 'mins' }: { item: any, rank: number, displayMode?: 'mins' | 'plays' | 'date' | 'length' }) => {
    const getDisplayValue = () => {
        if (displayMode === 'mins') {
            const val = item.mins ?? item.totalMinutes ?? (item.timeStr ? parseInt(item.timeStr.replace(/[^0-9]/g, ''), 10) : null);
            return val != null ? `${val} m` : null;
        }
        if (displayMode === 'plays') {
            const val = item.plays ?? item.listens ?? item.totalListens ?? null;
            return val != null ? `${val} p` : null;
        }
        if (displayMode === 'date') {
            const dateValue = item.date || item.played_at || item.lastPlayed;
            if (dateValue) {
                const d = new Date(dateValue);
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }
            if (item.year) return item.year;
        }
        if (displayMode === 'length') {
            const durationValue = item.avgDurationMs ?? item.duration_ms ?? item.durationMs ?? null;
            return formatDuration(durationValue);
        }

        // Smart Fallback hierarchy
        const mins = item.mins ?? item.totalMinutes ?? (item.timeStr ? parseInt(item.timeStr.replace(/[^0-9]/g, ''), 10) : null);
        if (mins) return `${mins} m`;
        const plays = item.plays ?? item.listens ?? item.totalListens ?? null;
        if (plays) return `${plays} p`;
        return `#${rank} `;
    };

    return (
        <div className="flex-shrink-0 relative flex items-center snap-start group cursor-pointer w-[180px] md:w-[220px]">
            {/* Big Number Ranking */}
            <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40">
                {rank}
            </span>

            <div className="relative z-10 ml-10 md:ml-12">
                {/* Image Container */}
                <div className={`w-32 h-32 md:w-40 md:h-40 overflow-hidden bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative ${item.type === 'artist' ? 'rounded-full' : 'rounded-xl'}`}>
                    {/* Fallback & Image */}
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1C1C1E]">
                        <Music2 className="text-white/20" size={48} />
                    </div>
                    <img
                        src={item.cover || item.image || item.album_cover}
                        alt={item.title || item.name}
                        className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm"
                        onError={(e) => e.currentTarget.style.opacity = '0'}
                    />

                    {/* Hover Overlay with Stats - Now Dynamic */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40 backdrop-blur-sm">
                        <span className="text-white font-bold text-xl drop-shadow-md">
                            {getDisplayValue() || `#${rank} `}
                        </span>
                    </div>
                </div>

                {/* Text Details */}
                <div className="mt-3 relative z-20">
                    <h3 className="text-[15px] font-semibold text-white truncate w-32 md:w-40 leading-tight group-hover:text-white transition-colors">{item.name || item.title}</h3>
                    {(item.artist || item.desc) && (
                        <p className="text-[13px] text-[#8E8E93] truncate w-32 md:w-40 mt-0.5 font-medium">
                            {item.artist || item.desc}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

interface CategoryResult {
    id: string;
    title: string;
    description: string;
    stats: string;
    tracks: any[];
    // View preference
    viewMode?: 'standard' | 'ranked';
}

interface ChatMessage {
    role: 'user' | 'ai';
    text: string;
    timestamp: Date;
    canvas?: CanvasComponent;
    toolCalls?: ToolCallInfo[];
    tools?: ToolPart[];
    sources?: any;
    isThinking?: boolean;
}

export const AISpotlight: React.FC<TopAIProps> = ({ contextData, token, history = [], user, initialQuery }) => {
    const [loading, setLoading] = useState(false);
    const [categoryResults, setCategoryResults] = useState<CategoryResult[]>([]);
    const [viewMode, setViewMode] = useState<'standard' | 'ranked'>('standard');
    const [sortMode, setSortMode] = useState<'mins' | 'plays' | 'date' | 'length'>('mins');
    const [insightMode, setInsightMode] = useState(false);
    const [insightData, setInsightData] = useState<any[]>([]);
    const [insightStep, setInsightStep] = useState(0);
    const [wrappedMode, setWrappedMode] = useState(false);
    const [wrappedSlides, setWrappedSlides] = useState<WrappedSlide[]>([]);
    const [wrappedStep, setWrappedStep] = useState(0);
    const [canvasMode, setCanvasMode] = useState(false);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [chatResponse, setChatResponse] = useState<string | null>(null);
    const [displayedText, setDisplayedText] = useState("");
    const [userPrompt, setUserPrompt] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mode, setMode] = useState<'discover' | 'chat'>('discover');
    const [typing, setTyping] = useState(false);
    const [discoveryMode, setDiscoveryMode] = useState(false);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!modelDropdownOpen) return;
        const handler = () => setModelDropdownOpen(false);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [modelDropdownOpen]);

    useEffect(() => {
        if (initialQuery && initialQuery.trim()) {
            handleQuery(initialQuery);
        }
    }, [initialQuery]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, displayedText, loading, categoryResults]);

    const sortTracks = (tracks: any[]) => {
        const sorted = [...tracks];
        const getPlays = (track: any) => track.listens ?? track.plays ?? track.totalListens ?? 0;
        const getMinutes = (track: any) => {
            if (track.totalMinutes !== undefined) return Number(track.totalMinutes) || 0;
            if (track.timeStr) return parseInt(track.timeStr.replace(/[^0-9]/g, ''), 10) || 0;
            return 0;
        };
        const getDate = (track: any) => {
            const dateValue = track.lastPlayed || track.played_at || track.date;
            const time = dateValue ? new Date(dateValue).getTime() : 0;
            return Number.isNaN(time) ? 0 : time;
        };
        const getLength = (track: any) => track.avgDurationMs ?? track.duration_ms ?? track.durationMs ?? 0;

        sorted.sort((a, b) => {
            if (sortMode === 'plays') return getPlays(b) - getPlays(a);
            if (sortMode === 'date') return getDate(b) - getDate(a);
            if (sortMode === 'length') return getLength(b) - getLength(a);
            return getMinutes(b) - getMinutes(a);
        });

        return sorted;
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadProgress(0);
        setErrorMsg(null);
        setChatResponse("Reading file...");
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const json = JSON.parse(text) as SpotifyHistoryItem[];
                if (!Array.isArray(json)) throw new Error("Invalid format: Expected an array.");
                setChatResponse(`Processing ${json.length} items...`);
                const result = await uploadExtendedHistory(json, (percent) => {
                    setUploadProgress(percent);
                    setChatResponse(`Uploading: ${percent}% `);
                });
                if (result.success) {
                    setChatResponse("✅ Upload complete! Fetching album covers from Spotify...");
                    if (token) {
                        const backfillResult = await backfillExtendedHistoryImages(token, (status) => {
                            setChatResponse(`✅ Upload complete! ${status} `);
                        });
                        setChatResponse(backfillResult.success ? `✅ All done! ${backfillResult.message} ` : `✅ Upload complete, but image fetch had issues: ${backfillResult.message} `);
                    } else {
                        setChatResponse("✅ Upload complete! (Could not fetch images - no Spotify token)");
                    }
                    setUserPrompt("");
                } else {
                    setErrorMsg("Upload failed: " + result.message);
                    setChatResponse(null);
                }
            } catch (err: any) {
                setErrorMsg("Failed to parse JSON: " + err.message);
                setChatResponse(null);
            } finally {
                setUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
    };

    const handleQuery = async (manualPrompt?: string) => {
        const promptToUse = manualPrompt || userPrompt;
        if (!promptToUse.trim()) return;
        if (promptToUse.trim().toLowerCase() === '@json') {
            fileInputRef.current?.click();
            setUserPrompt("");
            return;
        }
        if (promptToUse.trim().toLowerCase() === '@backfill') {
            setUserPrompt("");
            setLoading(true);
            setChatResponse("Fetching images from Spotify for extended history...");
            if (!token) {
                setErrorMsg("No Spotify token found. Please refresh the page and log in.");
                setLoading(false);
                return;
            }
            const result = await backfillExtendedHistoryImages(token, (status) => setChatResponse(status));
            setChatResponse(result.success ? `✅ ${result.message} ` : result.message);
            setLoading(false);
            return;
        }

        setChatMessages(prev => [...prev, { role: 'user', text: promptToUse, timestamp: new Date() }]);
        setLoading(true);
        setErrorMsg(null);
        setChatResponse(null);
        setDisplayedText("");
        setCategoryResults([]);
        setInsightMode(false);
        setWrappedMode(false);
        setUserPrompt("");

        try {
            const lower = promptToUse.toLowerCase();
            if (lower.includes('wrapped') || lower.includes('recap')) {
                let period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'weekly';
                if (lower.includes('day') || lower.includes('today')) period = 'daily';
                if (lower.includes('month')) period = 'monthly';
                if (lower.includes('year')) period = 'yearly';
                setChatResponse("✨ Generating your Wrapped experience...");
                setMode('discover');
                const stats = await getWrappedStats(period === 'yearly' ? 'monthly' : period);
                if (!stats || !stats.topTracks || stats.topTracks.length === 0) {
                    setErrorMsg(`No ${period} stats found.`);
                    setLoading(false);
                    return;
                }
                const concepts = await generateDynamicCategoryQuery(contextData, `Create themed music categories for ${period} wrapped.`);
                const newResults: CategoryResult[] = [];
                await Promise.all(concepts.map(async (concept, idx) => {
                    if (concept && concept.filter) {
                        const data = await fetchSmartPlaylist(concept);
                        if (data.length > 0) {
                            const vibe = await generateWrappedVibe(data.slice(0, 10));
                            newResults.push({ id: `wrapped-${Date.now()}-${idx}`, title: vibe.title || concept.title, description: vibe.description || concept.description, stats: `${data.length} tracks`, tracks: data });
                        }
                    }
                }));
                if (token && newResults.length > 0) {
                    const names = new Set<string>();
                    newResults.forEach(c => c.tracks.forEach(t => { if (!(t.cover || t.image || t.album_cover)) names.add(t.type === 'artist' ? t.title : (t.artist || t.artist_name || '')); }));
                    if (names.size > 0) {
                        const images = await fetchArtistImages(token, Array.from(names).filter(Boolean));
                        newResults.forEach(c => c.tracks.forEach(t => { if (!(t.cover || t.image || t.album_cover)) { const k = t.type === 'artist' ? t.title : (t.artist || t.artist_name || ''); if (images[k]) { t.cover = images[k]; t.image = images[k]; } } }));
                    }
                }
                if (newResults.length > 0) { setCategoryResults(newResults); setViewMode('ranked'); setSortMode('plays'); }
                else setErrorMsg("Could not generate wrapped categories.");
                setLoading(false);
                return;
            }

            if (lower.includes('weekly insight') || lower.includes('insight story')) {
                setInsightMode(true);
                setInsightStep(0);
                const slides = await generateWeeklyInsightStory(contextData);
                setInsightData(slides);
                setLoading(false);
                return;
            }

            if (canvasMode) {
                setMode('chat');
                setChatResponse("🎨 Building component...");
                const result = await generateCanvasComponent(promptToUse, contextData, chatMessages.filter(m => !m.canvas || m.role === 'user').map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })), (a, e) => setChatResponse(`🔄 Retry (${a}/5)... ${e}`));
                setChatMessages(prev => [...prev, { role: 'ai', text: result && !result.error ? `Here's your **${result.title}**` : `Sorry, I couldn't build that. ${result?.error || ''}`, timestamp: new Date(), canvas: result || undefined }]);
                setChatResponse(null);
                setLoading(false);
                return;
            }

            const analysisKeywords = ['find', 'show', 'filter', 'playlist', 'query', 'sql', 'tracks', 'songs', 'analyze', 'pattern', 'discover', 'top', 'best', 'most', 'rank', 'chart', 'favorite', 'least', 'wrapped', 'gems', 'rewind', 'vibes', 'mix', 'weekly', 'insight', 'stats'];
            const isAnalysisQuery = discoveryMode && analysisKeywords.some(k => promptToUse.toLowerCase().includes(k));

            if (isAnalysisQuery || discoveryMode) {
                setMode('discover');
                const concepts = await generateDynamicCategoryQuery(contextData, discoveryMode ? `${promptToUse} (Mode: DISCOVERY)` : promptToUse);
                const newResults: CategoryResult[] = [];
                await Promise.all(concepts.map(async (concept, idx) => {
                    if (concept && concept.filter) {
                        let data = [];
                        if ((concept.filter.useSpotify || discoveryMode) && token) {
                            if (concept.filter.spotifyQuery) data = await searchSpotifyTracks(token, concept.filter.spotifyQuery);
                            else data = await fetchSpotifyRecommendations(token, { seed_artists: contextData.artists.slice(0, 2).map(a => a.split(' (')[0]), seed_genres: [] });
                        } else data = await fetchSmartPlaylist(concept);
                        if (data.length > 0) newResults.push({ id: `cat-${Date.now()}-${idx}`, title: concept.title, description: concept.description, stats: `${data.length} items`, tracks: data });
                    }
                }));
                if (token && newResults.length > 0) {
                    const names = new Set<string>();
                    newResults.forEach(c => c.tracks.forEach(t => { if (!(t.cover || t.image || t.album_cover)) names.add(t.type === 'artist' ? t.title : (t.artist || t.artist_name || '')); }));
                    if (names.size > 0) {
                        const images = await fetchArtistImages(token, Array.from(names).filter(Boolean));
                        newResults.forEach(c => c.tracks.forEach(t => { if (!(t.cover || t.image || t.album_cover)) { const k = t.type === 'artist' ? t.title : (t.artist || t.artist_name || ''); if (images[k]) { t.cover = images[k]; t.image = images[k]; } else t.cover = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.title || t.name || k)}&background=1C1C1E&color=fff&length=1`; } }));
                    }
                }
                if (newResults.length > 0) { setCategoryResults(newResults); setViewMode('ranked'); const first = concepts.find(c => c && c.filter); if (first) { const s = first.filter.sortBy; if (s === 'minutes') setSortMode('mins'); else if (s === 'plays') setSortMode('plays'); else if (s === 'recency') setSortMode('date'); else if (s === 'duration') setSortMode('length'); } }
                else setErrorMsg(`No results for "${userPrompt}".`);
            } else {
                setMode('chat');
                const aiMessageId = Date.now();
                setChatMessages(prev => [...prev, { role: 'ai', text: '', timestamp: new Date(), isThinking: false, thoughts: [], tools: [], sources: null }]);
                let currentText = "";
                let tools: any[] = [];
                let sources: any = null;
                let isThinking = false;

                await streamMusicQuestionWithTools(
                    promptToUse,
                    contextData,
                    (chunk) => {
                        if (chunk.type === 'thinking') isThinking = true;
                        if (chunk.type === 'text' && chunk.content) { currentText += chunk.content; isThinking = false; }
                        if (chunk.type === 'tool-call' && chunk.toolCall) { tools.push({ type: chunk.toolCall.name, state: 'input-available', input: chunk.toolCall.arguments }); isThinking = true; }
                        if (chunk.type === 'tool-result' && chunk.toolCall) { const ti = tools.findIndex(t => t.type === chunk.toolCall!.name && t.state === 'input-available'); if (ti !== -1) tools[ti] = { ...tools[ti], state: 'output-available', output: chunk.toolCall.result }; }
                        if (chunk.type === 'grounding' && chunk.groundingMetadata) sources = chunk.groundingMetadata;
                        setChatMessages(prev => {
                            const next = [...prev];
                            const last = next.length - 1;
                            if (last < 0 || next[last].role !== 'ai') return prev;
                            next[last] = { ...next[last], text: currentText, tools: [...tools], sources, isThinking };
                            return next;
                        });
                    },
                    token,
                    selectedModel,
                    webSearchEnabled,
                    chatMessages.slice(-10) // Chat Memory: pass last 10 messages
                );
            }
        } catch (err: any) { setErrorMsg(`Error: ${err.message || 'Unknown'}`); }
        setLoading(false);
    };

    return (
        <ChatContainerRoot id="ai-spotlight" ref={sectionRef}>
            <div className="flex-shrink-0 flex items-center justify-between py-3 px-4 border-b border-white/5">
                <div className="flex items-center gap-0 border border-white/10 bg-white/5 rounded-xl p-1 backdrop-blur-md">
                    {([{id:'chat',label:'Chat'},{id:'discover',label:'Discovery',icon:Zap},{id:'canvas',label:'Canvas',icon:Palette}] as const).map(m => (
                        <button
                            key={m.id}
                            onClick={() => { if(m.id==='chat'){setDiscoveryMode(false);setCanvasMode(false);}else if(m.id==='discover'){setDiscoveryMode(true);setCanvasMode(false);}else{setCanvasMode(true);setDiscoveryMode(false);} }}
                            className={`px-5 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1.5 ${((m.id==='chat'&&!discoveryMode&&!canvasMode)||(m.id==='discover'&&discoveryMode&&!canvasMode)||(m.id==='canvas'&&canvasMode)) ? 'bg-white text-black' : 'text-[#8E8E93] hover:text-white'}`}
                        >
                            {m.icon && <m.icon size={12} />}
                            {m.label}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all backdrop-blur-md text-[11px] font-semibold ${webSearchEnabled ? 'bg-[#FA2D48]/10 border-[#FA2D48]/30 text-[#FA2D48]' : 'bg-white/5 border-white/10 text-[#8E8E93] hover:text-white hover:border-white/20'}`}
                        title="Enable Web Search"
                    >
                        <Globe size={11} /> Search
                    </button>
                    <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setModelDropdownOpen(prev => !prev); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-semibold text-[#8E8E93] hover:text-white hover:border-white/20 transition-all backdrop-blur-md">
                            <Zap size={11} className={AI_MODELS.find(m => m.id === selectedModel)?.isReasoning ? 'text-[#FF9F0A]' : 'text-[#8E8E93]'} />
                            <span className="max-w-[90px] truncate">{AI_MODELS.find(m => m.id === selectedModel)?.label || 'Model'}</span>
                            <ChevronDown size={11} />
                        </button>
                        {modelDropdownOpen && (
                            <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[200px] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
                                {AI_MODELS.map(m => (
                                    <button key={m.id} onClick={(e) => { e.stopPropagation(); setSelectedModel(m.id); setModelDropdownOpen(false); }} className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-[12px] font-medium transition-colors hover:bg-white/5 ${selectedModel === m.id ? 'text-white bg-white/5' : 'text-[#8E8E93]'}`}>
                                        <span>{m.label}</span>
                                        {m.isReasoning && <span className="text-[10px] font-semibold text-[#FF9F0A] bg-[#FF9F0A]/10 px-1.5 py-0.5 rounded-md">Reasoning</span>}
                                        {selectedModel === m.id && <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ChatContainerContent className="flex-1">
                <div className="max-w-4xl mx-auto space-y-6">
                    {chatMessages.length === 0 && !loading && categoryResults.length === 0 && !insightMode && !wrappedMode && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                            {canvasMode ? <><Palette className="w-8 h-8 text-white/20 mb-3" /><p className="text-[#8E8E93] text-sm">Describe a component to build...</p></> : <><Sparkles className="w-8 h-8 text-white/20 mb-3" /><p className="text-[#8E8E93] text-sm">Ask about your music...</p></>}
                        </div>
                    )}
                    {chatMessages.map((msg, idx) => (
                        <Message key={idx} role={msg.role === 'user' ? 'user' : 'ai'}>
                            <MessageContent className="text-sm">
                                {msg.role === 'ai' && msg.canvas && msg.canvas.html ? (
                                    <div className="space-y-3">
                                        <div className="bg-[#27272a] text-white rounded-2xl rounded-tl-sm px-5 py-3 border border-white/10 inline-block"><div className="text-[15px] leading-relaxed whitespace-pre-wrap markdown-container"><ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown></div></div>
                                        <CanvasRenderer html={msg.canvas.html} title={msg.canvas.title} description={msg.canvas.description} retryCount={msg.canvas.retryCount} error={msg.canvas.error} onRetry={async () => { setLoading(true); setChatResponse("🔄 Regenerating..."); const result = await generateCanvasComponent(chatMessages.filter(m => m.role === 'user').slice(-1)[0]?.text || 'Retry', contextData, [], (a, e) => setChatResponse(`🔄 Retry ${a}/5... ${e}`)); if (result && !result.error) setChatMessages(prev => { const upd = [...prev]; upd[idx] = { ...upd[idx], canvas: result, text: `Here's your **${result.title}**` }; return upd; }); setChatResponse(null); setLoading(false); }} />
                                    </div>
                                ) : msg.role === 'ai' ? (
                                    <>
                                        {msg.isThinking && !msg.text && <Loader variant="text-shimmer">Thinking...</Loader>}
                                        {msg.tools && msg.tools.length > 0 && <CollapsibleTools tools={msg.tools} onVote={(sels) => handleQuery(`User selected: ${sels.join(', ')}`)} />}
                                        {msg.text && (
                                            <div className="text-[15px] leading-relaxed markdown-container mt-2 prose prose-invert prose-zinc max-w-none prose-table:border prose-table:border-white/10 prose-th:border prose-th:border-white/10 prose-td:border prose-td:border-white/10 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-img:rounded-xl">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ({node, ...props}) => <img {...props} className="max-w-full md:max-w-md h-auto rounded-xl border border-white/10 mx-auto" loading="lazy" />, table: ({node, ...props}) => <div className="overflow-x-auto my-4 rounded-xl border border-white/10"><table {...props} className="min-w-full divide-y divide-white/10" /></div> }}>{msg.text}</ReactMarkdown>
                                            </div>
                                        )}
                                        {msg.sources && msg.sources.groundingChunks && (
                                            <div className="mt-4 pt-4 border-t border-white/10"><p className="text-xs text-white/40 mb-2 font-semibold">Sources</p><div className="flex flex-wrap gap-2">{msg.sources.groundingChunks.map((c: any, ci: number) => c.web?.uri ? <Source key={ci} href={c.web.uri} showFavicon={true}><SourceTrigger label={c.web.title || "Source"} /><SourceContent title={c.web.title} description={c.web.uri} /></Source> : null)}</div></div>
                                        )}
                                        <p className="text-[11px] mt-2 text-white/30 font-medium">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </>
                                ) : (
                                    <><p className="text-[15px] leading-relaxed">{msg.text}</p><p className="text-[11px] mt-1.5 text-white/40">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></>
                                )}
                            </MessageContent>
                        </Message>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                {errorMsg && <div className="max-w-2xl mx-auto mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-mono flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{errorMsg}</div>}
            </ChatContainerContent>

            <div className="flex-shrink-0 border-t border-white/5 bg-[#09090b] px-4 py-4">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".json" />
                <div className="max-w-4xl mx-auto">
                    <PromptInput value={userPrompt} onValueChange={setUserPrompt} onSubmit={() => handleQuery()} isLoading={loading} className="bg-[#1a1a1a] border-white/10">
                        <PromptInputTextarea placeholder={canvasMode ? "Describe component..." : "Ask about music..."} className="text-white placeholder:text-white/30 min-h-[44px]" />
                        <PromptInputActions className="justify-end pt-0 pb-2 pr-2">
                             <Button onClick={() => handleQuery()} disabled={loading || !userPrompt.trim()} size="icon" className={`h-8 w-8 rounded-lg transition-all ${loading || !userPrompt.trim() ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black hover:bg-zinc-200'}`}>
                                {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                            </Button>
                        </PromptInputActions>
                    </PromptInput>
                    <p className="text-[10px] text-white/20 text-center mt-2 font-medium tracking-wide">Press Enter to send</p>
                </div>
            </div>
        </ChatContainerRoot>
    );
};
