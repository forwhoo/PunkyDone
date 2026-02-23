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
    FastForward, DoorOpen, Users, Target, ChevronDown, type LucideIcon
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
};

const ToolIcon = ({ iconName, size = 12 }: { iconName: string; size?: number }) => {
    const IconComponent = TOOL_LUCIDE_MAP[iconName];
    if (IconComponent) {
        return <IconComponent size={size} />;
    }
    // Fallback to Zap for unknown icon names
    return <Zap size={size} />;
};

const CollapsibleTools = ({ tools }: { tools: ToolPart[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    if (!tools || tools.length === 0) return null;

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
}

export const AISpotlight: React.FC<TopAIProps> = ({ contextData, token, history = [], user, initialQuery }) => {
    console.log('[AISpotlight] Component mounted', { hasToken: !!token, hasUser: !!user, initialQuery, contextDataKeys: Object.keys(contextData) });
    const [loading, setLoading] = useState(false);

    // Store array of category results
    const [categoryResults, setCategoryResults] = useState<CategoryResult[]>([]);

    // Global View Config for newly generated results
    const [viewMode, setViewMode] = useState<'standard' | 'ranked'>('standard');
    const [sortMode, setSortMode] = useState<'mins' | 'plays' | 'date' | 'length'>('mins');

    const [insightMode, setInsightMode] = useState(false);
    const [insightData, setInsightData] = useState<any[]>([]);
    const [insightStep, setInsightStep] = useState(0);
    
    // Wrapped Mode State
    const [wrappedMode, setWrappedMode] = useState(false);
    const [wrappedSlides, setWrappedSlides] = useState<WrappedSlide[]>([]);
    const [wrappedStep, setWrappedStep] = useState(0);
    const [wrappedStats, setWrappedStats] = useState<any>(null);

    // Canvas Mode State
    const [canvasMode, setCanvasMode] = useState(false);

    // Web Search State
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [chatResponse, setChatResponse] = useState<string | null>(null);
    const [displayedText, setDisplayedText] = useState("");
    const [userPrompt, setUserPrompt] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                // Basic cleanup if it's wrapped in a weird structure, but usually it's array
                // We'll trust basic JSON.parse first
                const json = JSON.parse(text) as SpotifyHistoryItem[];

                if (!Array.isArray(json)) {
                    throw new Error("Invalid format: Expected an array.");
                }

                setChatResponse(`Processing ${json.length} items...`);

                const result = await uploadExtendedHistory(json, (percent) => {
                    setUploadProgress(percent);
                    setChatResponse(`Uploading: ${percent}% `);
                });

                if (result.success) {
                    // Start image backfill
                    setChatResponse("✅ Upload complete! Fetching album covers from Spotify...");

                    if (token) {
                        const backfillResult = await backfillExtendedHistoryImages(token, (status) => {
                            setChatResponse(`✅ Upload complete! ${status} `);
                        });

                        if (backfillResult.success) {
                            setChatResponse(`✅ All done! ${backfillResult.message} `);
                        } else {
                            setChatResponse(`✅ Upload complete, but image fetch had issues: ${backfillResult.message} `);
                        }
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
    const [mode, setMode] = useState<'discover' | 'chat'>('discover');
    const [typing, setTyping] = useState(false);
    const [discoveryMode, setDiscoveryMode] = useState(false);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
    const sectionRef = useRef<HTMLDivElement>(null);

    // Close model dropdown when clicking outside
    useEffect(() => {
        if (!modelDropdownOpen) return;
        const handler = () => setModelDropdownOpen(false);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [modelDropdownOpen]);

    // Handle initial query from parent
    useEffect(() => {
        if (initialQuery && initialQuery.trim()) {
            handleQuery(initialQuery);
        }
    }, [initialQuery]);

    // Chat message history
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, displayedText, loading, categoryResults]);

    // Use First Name if available
    const userName = useMemo(() => {
        if (!user || !user.display_name) return "there";
        return user.display_name.split(' ')[0].toLowerCase();
    }, [user]);

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

    // Typing effect logic
    useEffect(() => {
        if (typing && chatResponse) {
            let i = 0;
            const timer = setInterval(() => {
                if (i < chatResponse.length) {
                    setDisplayedText((prev) => {
                        if (prev.length >= chatResponse.length) return prev;
                        return chatResponse.slice(0, prev.length + 1);
                    });
                    i++;
                } else {
                    clearInterval(timer);
                    setTyping(false);
                }
            }, 10);
            return () => clearInterval(timer);
        }
    }, [typing, chatResponse]);

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

            const result = await backfillExtendedHistoryImages(token, (status) => {
                setChatResponse(status);
            });

            if (result.success) {
                setChatResponse(`✅ ${result.message} `);
            } else {
                setErrorMsg(result.message);
                setChatResponse(null);
            }

            setLoading(false);
            return;
        }

        // Add user message
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

            // SPECIAL HANDLER: WRAPPED (Daily, Weekly, Monthly) -> MULTIPLE AI CATEGORIES
            if (lower.includes('wrapped') || lower.includes('recap')) {
                let period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'weekly';
                if (lower.includes('day') || lower.includes('today')) period = 'daily';
                if (lower.includes('month')) period = 'monthly';
                if (lower.includes('year')) period = 'yearly';

                setChatResponse("✨ Generating your Wrapped experience with multiple categories...");
                setMode('discover');

                // Get stats first
                const stats = await getWrappedStats(period === 'yearly' ? 'monthly' : period);
                if (!stats || !stats.topTracks || stats.topTracks.length === 0) {
                    setErrorMsg(`No ${period} stats found. Start listening!`);
                    setLoading(false);
                    return;
                }

                // Generate multiple themed categories using AI
                const wrappedPrompt = `Create 4-5 creative music categories for a ${period} wrapped based on the user's listening data. 
                Make them diverse: mood-based, time-based, genre-based, energy-based, etc. 
                Examples: "Morning Coffee", "Late Night Drives", "Workout Bangers", "Sad Boi Hours", "Main Character Energy"`;

                const concepts = await generateDynamicCategoryQuery(contextData, wrappedPrompt);
                const newResults: CategoryResult[] = [];

                // Process all categories
                await Promise.all(concepts.map(async (concept, idx) => {
                    if (concept && concept.filter) {
                        const data = await fetchSmartPlaylist(concept);
                        if (data.length > 0) {
                            // Get vibe check for this category
                            const vibe = await generateWrappedVibe(data.slice(0, 10));
                            newResults.push({
                                id: `wrapped-cat-${Date.now()}-${idx}`,
                                title: vibe.title || concept.title,
                                description: vibe.description || concept.description,
                                stats: `${data.length} tracks`,
                                tracks: data
                            });
                        }
                    }
                }));

                // Fetch real images for tracks if needed
                if (token && newResults.length > 0) {
                    const artistNames = new Set<string>();
                    newResults.forEach(cat => {
                        cat.tracks.forEach(t => {
                            const hasCover = t.cover || t.image || t.album_cover;
                            if (!hasCover && (t.artist || t.artist_name || t.title)) {
                                artistNames.add(t.type === 'artist' ? t.title : (t.artist || t.artist_name || ''));
                            }
                        });
                    });

                    if (artistNames.size > 0) {
                        try {
                            const images = await fetchArtistImages(token, Array.from(artistNames).filter(Boolean));
                            newResults.forEach(cat => {
                                cat.tracks.forEach(t => {
                                    const hasCover = t.cover || t.image || t.album_cover;
                                    if (!hasCover) {
                                        const artistKey = t.type === 'artist' ? t.title : (t.artist || t.artist_name || '');
                                        if (images[artistKey]) {
                                            t.cover = images[artistKey];
                                            t.image = images[artistKey];
                                        }
                                    }
                                });
                            });
                        } catch (e) {
                            console.error("Failed to load artist images", e);
                        }
                    }
                }

                if (newResults.length > 0) {
                    setCategoryResults(newResults);
                    setViewMode('ranked');
                    setSortMode('plays');
                } else {
                    setErrorMsg("Could not generate wrapped categories. Try again!");
                }

                setLoading(false);
                setUserPrompt("");
                return;
            }

            // SPECIAL HANDLER: WEEKLY INSIGHT (The AI Story Version)
            if (lower.includes('weekly insight') || lower.includes('insight story')) {
                setInsightMode(true);
                setInsightStep(0);
                const slides = await generateWeeklyInsightStory(contextData);
                setInsightData(slides);
                setLoading(false);
                return;
            }

            // CANVAS MODE: AI generates interactive HTML/CSS/JS components
            if (canvasMode) {
                setMode('chat');
                setChatResponse("🎨 Building your component...");

                const canvasHistory = chatMessages
                    .filter(m => !m.canvas || m.role === 'user')
                    .map(m => ({ role: m.role === 'user' ? 'user' as const : 'assistant' as const, content: m.text }));

                const result = await generateCanvasComponent(
                    promptToUse,
                    contextData,
                    canvasHistory,
                    (attempt, err) => {
                        setChatResponse(`🔄 Retrying (${attempt}/5)... ${err}`);
                    }
                );

                if (result && !result.error) {
                    setChatMessages(prev => [...prev, {
                        role: 'ai',
                        text: `Here's your **${result.title}** — ${result.description}`,
                        timestamp: new Date(),
                        canvas: result
                    }]);
                    setChatResponse(null);
                } else {
                    const errMsg = result?.error || 'Failed to generate component';
                    setChatMessages(prev => [...prev, {
                        role: 'ai',
                        text: `Sorry, I couldn't build that component. ${errMsg}`,
                        timestamp: new Date(),
                        canvas: result || undefined
                    }]);
                    setChatResponse(null);
                }
                setLoading(false);
                setUserPrompt("");
                return;
            }

            // Determine query type - only auto-detect analysis queries when in Discovery mode
            const analysisKeywords = ['find', 'show', 'filter', 'playlist', 'query', 'sql', 'tracks', 'songs', 'analyze', 'pattern', 'discover', 'top', 'best', 'most', 'rank', 'chart', 'favorite', 'least', 'wrapped', 'gems', 'rewind', 'vibes', 'mix', 'weekly', 'insight', 'stats'];
            const isAnalysisQuery = discoveryMode && analysisKeywords.some(k => promptToUse.toLowerCase().includes(k));

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

                // Fetch real images for tracks/artists if needed
                if (token && newResults.length > 0) {
                    const artistNames = new Set<string>();
                    newResults.forEach(cat => {
                        cat.tracks.forEach(t => {
                            // Collect artist names for items that don't have covers
                            const hasCover = t.cover || t.image || t.album_cover;
                            if (!hasCover && (t.artist || t.artist_name || t.title)) {
                                artistNames.add(t.type === 'artist' ? t.title : (t.artist || t.artist_name || ''));
                            }
                        });
                    });

                    if (artistNames.size > 0) {
                        try {
                            const images = await fetchArtistImages(token, Array.from(artistNames).filter(Boolean));
                            newResults.forEach(cat => {
                                cat.tracks.forEach(t => {
                                    const hasCover = t.cover || t.image || t.album_cover;
                                    if (!hasCover) {
                                        const artistKey = t.type === 'artist' ? t.title : (t.artist || t.artist_name || '');
                                        if (images[artistKey]) {
                                            t.cover = images[artistKey];
                                            t.image = images[artistKey];
                                        } else {
                                            t.cover = `https://ui-avatars.com/api/?name=${encodeURIComponent(t.title || t.name || artistKey)}&background=1C1C1E&color=fff&length=1`;
                                        }
                                    }
                                });
                            });
                        } catch (e) {
                            console.error("Failed to load artist images", e);
                        }
                    }
                }

                if (newResults.length > 0) {
                    setCategoryResults(newResults);
                    setViewMode('ranked'); // Default to ranked view for discover results
                    // Update sorting/view mode based on first concept to show relevant stats
                    const firstConcept = concepts.find(c => c && c.filter);
                    if (firstConcept) {
                        const sortBy = firstConcept.filter.sortBy;
                        if (sortBy === 'minutes') setSortMode('mins');
                        else if (sortBy === 'plays') setSortMode('plays');
                        else if (sortBy === 'recency') setSortMode('date');
                        else if (sortBy === 'duration') setSortMode('length');
                    }
                } else {
                    setErrorMsg(`No results found for "${userPrompt}". Try a different query.`);
                }

            } else {
                // CHAT MODE with Streaming & Tools
                setMode('chat');

                // Create a placeholder message for the AI response
                const aiMessageId = Date.now();
                setChatMessages(prev => [...prev, {
                    role: 'ai',
                    text: '',
                    timestamp: new Date(),
                    isThinking: false,
                    thoughts: [],
                    tools: [],
                    sources: null
                }]);

                // Parsing State - Managed locally in closure
                let currentText = "";

                // Local accumulators
                let tools: any[] = [];
                let sources: any = null;

                await streamMusicQuestionWithTools(
                    promptToUse,
                    contextData,
                    (chunk) => {
                        // 1. UPDATE LOCAL STATE (Side effects on closure vars ONLY)

                        if (chunk.type === 'text' && chunk.content) {
                            currentText += chunk.content;
                        }

                        if (chunk.type === 'tool-call' && chunk.toolCall) {
                            tools.push({
                                type: chunk.toolCall.name,
                                state: 'input-available',
                                input: chunk.toolCall.arguments
                            });
                            isThinking = true;
                        }

                        if (chunk.type === 'tool-result' && chunk.toolCall) {
                            const toolIndex = tools.findIndex(t => t.type === chunk.toolCall!.name && t.state === 'input-available');
                            if (toolIndex !== -1) {
                                tools[toolIndex] = {
                                    ...tools[toolIndex],
                                    state: 'output-available',
                                    output: chunk.toolCall.result
                                };
                            }
                        }

                        if (chunk.type === 'grounding' && chunk.groundingMetadata) {
                            sources = chunk.groundingMetadata;
                        }

                        // 2. UPDATE REACT STATE (Pure update)
                        setChatMessages(prev => {
                            const newMessages = [...prev];
                            const lastMsgIndex = newMessages.length - 1;
                            if (lastMsgIndex < 0 || newMessages[lastMsgIndex].role !== 'ai') return prev;

                            // Create a NEW object for the last message
                            newMessages[lastMsgIndex] = {
                                ...newMessages[lastMsgIndex],
                                text: currentText,
                                tools: [...tools],       // Shallow copy array
                                sources: sources
                            };

                            return newMessages;
                        });
                    },
                    token,
                    selectedModel,
                    webSearchEnabled
                );
            }
        } catch (err: any) {
            setErrorMsg(`Error: ${err.message || 'Unknown'}`);
        }

        setLoading(false);
    };

    return (
        <ChatContainerRoot id="ai-spotlight" ref={sectionRef}>
            {/* Header with Discovery Toggle */}
            <div className="flex-shrink-0 flex items-center justify-between py-3 px-4 border-b border-white/5">
                <div className="flex items-center gap-0 border border-white/10 bg-white/5 rounded-xl p-1 backdrop-blur-md">
                    <button
                        onClick={() => { setDiscoveryMode(false); setCanvasMode(false); }}
                        className={`px-5 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${!discoveryMode && !canvasMode ? 'bg-white text-black' : 'text-[#8E8E93] hover:text-white'}`}
                    >
                        Chat
                    </button>
                    <button
                        onClick={() => { setDiscoveryMode(true); setCanvasMode(false); }}
                        className={`px-5 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1.5 ${discoveryMode && !canvasMode ? 'bg-white text-black' : 'text-[#8E8E93] hover:text-white'}`}
                    >
                        <Zap size={12} />
                        Discovery
                    </button>
                    <button
                        onClick={() => { setCanvasMode(true); setDiscoveryMode(false); }}
                        className={`px-5 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1.5 ${canvasMode ? 'bg-white text-black' : 'text-[#8E8E93] hover:text-white'}`}
                    >
                        <Palette size={12} />
                        Canvas
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    {/* Web Search Toggle */}
                    <button
                        onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all backdrop-blur-md text-[11px] font-semibold ${webSearchEnabled ? 'bg-[#FA2D48]/10 border-[#FA2D48]/30 text-[#FA2D48]' : 'bg-white/5 border-white/10 text-[#8E8E93] hover:text-white hover:border-white/20'}`}
                        title="Enable Web Search"
                    >
                        <Globe size={11} />
                        Search
                    </button>

                    {/* Model Selector */}
                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setModelDropdownOpen(prev => !prev); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-semibold text-[#8E8E93] hover:text-white hover:border-white/20 transition-all backdrop-blur-md"
                    >
                        <Zap size={11} className={AI_MODELS.find(m => m.id === selectedModel)?.isReasoning ? 'text-[#FF9F0A]' : 'text-[#8E8E93]'} />
                        <span className="max-w-[90px] truncate">{AI_MODELS.find(m => m.id === selectedModel)?.label || 'Model'}</span>
                        <ChevronDown size={11} />
                    </button>
                    {modelDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[200px] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
                            {AI_MODELS.map(model => (
                                <button
                                    key={model.id}
                                    onClick={(e) => { e.stopPropagation(); setSelectedModel(model.id); setModelDropdownOpen(false); }}
                                    className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left text-[12px] font-medium transition-colors hover:bg-white/5 ${selectedModel === model.id ? 'text-white bg-white/5' : 'text-[#8E8E93]'}`}
                                >
                                    <span>{model.label}</span>
                                    {model.isReasoning && (
                                        <span className="text-[10px] font-semibold text-[#FF9F0A] bg-[#FF9F0A]/10 px-1.5 py-0.5 rounded-md">Reasoning</span>
                                    )}
                                    {selectedModel === model.id && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                    </div>
                </div>
            </div>

            {/* Scrollable Messages Area */}
            <ChatContainerContent className="flex-1">
                {/* Chat Messages */}
                <div className="max-w-4xl mx-auto space-y-6">
                    {chatMessages.length === 0 && !loading && categoryResults.length === 0 && !insightMode && !wrappedMode && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                            {canvasMode ? (
                                <>
                                    <Palette className="w-8 h-8 text-white/20 mb-3" />
                                    <p className="text-[#8E8E93] text-sm">Describe a component to build...</p>
                                    <p className="text-[#666] text-xs mt-1">e.g. "Make a table of my top 10 artists" or "Build a pie chart of my genres"</p>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-8 h-8 text-white/20 mb-3" />
                                    <p className="text-[#8E8E93] text-sm">Ask about your music...</p>
                                </>
                            )}
                        </div>
                    )}

                    {chatMessages.map((msg, idx) => (
                        <Message key={idx} role={msg.role === 'user' ? 'user' : 'ai'}>
                            <MessageContent className="text-sm">
                                {msg.role === 'ai' && msg.canvas && msg.canvas.code ? (
                                    <div className="space-y-3">
                                        <div className="bg-[#27272a] text-white rounded-2xl rounded-tl-sm px-5 py-3 border border-white/10 inline-block">
                                            <div className="text-[15px] leading-relaxed whitespace-pre-wrap markdown-container">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                                            </div>
                                        </div>
                                        <CanvasRenderer
                                            code={msg.canvas.code}
                                            title={msg.canvas.title}
                                            description={msg.canvas.description}
                                            retryCount={msg.canvas.retryCount}
                                            error={msg.canvas.error}
                                            onRetry={async () => {
                                                setLoading(true);
                                                setChatResponse("🔄 Regenerating component...");
                                                const result = await generateCanvasComponent(
                                                    chatMessages.filter(m => m.role === 'user').slice(-1)[0]?.text || 'Retry the last component',
                                                    contextData,
                                                    [],
                                                    (attempt, err) => setChatResponse(`🔄 Retry ${attempt}/5... ${err}`)
                                                );
                                                if (result && !result.error) {
                                                    setChatMessages(prev => {
                                                        const updated = [...prev];
                                                        updated[idx] = { ...updated[idx], canvas: result, text: `Here's your **${result.title}** — ${result.description}` };
                                                        return updated;
                                                    });
                                                }
                                                setChatResponse(null);
                                                setLoading(false);
                                            }}
                                        />
                                        <p className="text-[11px] text-[#666666] px-1">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                ) : msg.role === 'ai' ? (
                                    <>
                                        {/* Tool Logs */}
                                        {msg.tools && msg.tools.length > 0 && (
                                            <CollapsibleTools tools={msg.tools} />
                                        )}

                                        {/* Main Content */}
                                        {msg.text && (
                                            <div className="text-[15px] leading-relaxed markdown-container mt-2 prose prose-invert prose-zinc max-w-none prose-table:border prose-table:border-white/10 prose-th:border prose-th:border-white/10 prose-td:border prose-td:border-white/10 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-img:rounded-xl">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                        img: ({node, ...props}) => (
                                                            <img
                                                                {...props}
                                                                className="max-w-full md:max-w-md h-auto rounded-xl border border-white/10 mx-auto"
                                                                loading="lazy"
                                                            />
                                                        ),
                                                        table: ({node, ...props}) => (
                                                            <div className="overflow-x-auto my-4 rounded-xl border border-white/10">
                                                                <table {...props} className="min-w-full divide-y divide-white/10" />
                                                            </div>
                                                        )
                                                    }}
                                                >
                                                    {msg.text}
                                                </ReactMarkdown>
                                            </div>
                                        )}

                                        {/* Grounding Sources */}
                                        {msg.sources && msg.sources.groundingChunks && (
                                            <div className="mt-4 pt-4 border-t border-white/10">
                                                <p className="text-xs text-white/40 mb-2 font-semibold">Sources</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {msg.sources.groundingChunks.map((chunk: any, cIdx: number) =>
                                                        chunk.web?.uri ? (
                                                            <Source key={cIdx} href={chunk.web.uri} showFavicon={true}>
                                                                <SourceTrigger label={chunk.web.title || "Source"} />
                                                                <SourceContent title={chunk.web.title} description={chunk.web.uri} />
                                                            </Source>
                                                        ) : null
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        <p className="text-[11px] mt-2 text-white/30 font-medium">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-[15px] leading-relaxed">{msg.text}</p>
                                        <p className="text-[11px] mt-1.5 text-white/40">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </>
                                )}
                            </MessageContent>
                        </Message>
                    ))}

                    <div ref={messagesEndRef} />
                </div>

                {/* Error Messages */}
                {errorMsg && (
                    <div className="max-w-2xl mx-auto mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-mono flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        {errorMsg}
                    </div>
                )}

            {/* WEEKLY INSIGHT STORY MODE - Apple Wrapped Style */}
            {insightMode && insightData.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-10 w-full max-w-3xl mx-auto"
                >
                    <div className="bg-gradient-to-br from-[#1C1C1E] via-[#2C2C2E] to-[#1C1C1E] border border-white/10 rounded-3xl p-10 min-h-[500px] flex flex-col justify-between shadow-2xl relative overflow-hidden backdrop-blur-xl">
                        
                        {/* Animated Background Gradient */}
                        <motion.div 
                            className="absolute inset-0 opacity-20"
                            animate={{
                                background: [
                                    'radial-gradient(circle at 20% 50%, #FA2D48 0%, transparent 50%)',
                                    'radial-gradient(circle at 80% 50%, #FF9F0A 0%, transparent 50%)',
                                    'radial-gradient(circle at 50% 80%, #FA2D48 0%, transparent 50%)',
                                    'radial-gradient(circle at 20% 50%, #FA2D48 0%, transparent 50%)',
                                ]
                            }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        />

                        {/* Progress Bar - Larger and More Prominent */}
                        <div className="flex gap-3 mb-8 relative z-10">
                            {insightData.map((_, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ delay: i * 0.1 }}
                                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                        i <= insightStep ? 'bg-[#FA2D48] shadow-lg shadow-[#FA2D48]/50' : 'bg-white/10'
                                    }`} 
                                />
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
                            <motion.h3 
                                key={`title-${insightStep}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-3xl md:text-4xl font-black text-white mb-6 tracking-tight leading-tight max-w-xl"
                            >
                                {insightData[insightStep].title}
                            </motion.h3>
                            <motion.p 
                                key={`content-${insightStep}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="text-white/70 text-lg md:text-xl mb-10 max-w-lg font-medium leading-relaxed"
                            >
                                {insightData[insightStep].content}
                            </motion.p>

                            {/* Visualization Area - Enhanced */}
                            <div className="w-full flex justify-center items-center flex-1 min-h-[250px]">
                                {insightData[insightStep].type === 'text' && (
                                    <motion.div 
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: "spring", duration: 0.8 }}
                                        className="flex items-center justify-center"
                                    >
                                        <Sparkles className="w-32 h-32 text-[#FA2D48] opacity-80 animate-pulse drop-shadow-2xl" />
                                    </motion.div>
                                )}

                                {insightData[insightStep].type === 'stat' && (
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", duration: 0.6 }}
                                        className="flex flex-col items-center"
                                    >
                                        <motion.span 
                                            animate={{ 
                                                scale: [1, 1.05, 1],
                                            }}
                                            transition={{ 
                                                duration: 2,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                            className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FA2D48] via-[#FF6B35] to-[#FF9F0A] drop-shadow-2xl"
                                        >
                                            {insightData[insightStep].data?.value}
                                        </motion.span>
                                        <span className="text-white/70 font-semibold mt-6 uppercase tracking-[0.3em] text-base bg-white/5 px-6 py-2 rounded-full border border-white/10 backdrop-blur-md">
                                            {insightData[insightStep].data?.subtext}
                                        </span>
                                    </motion.div>
                                )}

                                {insightData[insightStep].type === 'quiz' && (
                                    <div className="grid gap-4 w-full max-w-md animate-in slide-in-from-right duration-500">
                                        {insightData[insightStep].data?.options.map((opt: string, idx: number) => (
                                            <motion.button
                                                key={idx}
                                                initial={{ opacity: 0, x: 50 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                onClick={(e) => {
                                                    const btn = e.currentTarget;
                                                    const explanation = insightData[insightStep].data.explanation || "";

                                                    // Reset all siblings
                                                    const parent = btn.parentElement;
                                                    if (parent) {
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
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                className="w-full text-left py-5 px-7 rounded-2xl border border-white/10 bg-white/5 text-white text-lg font-bold hover:bg-white/10 hover:border-white/30 transition-all backdrop-blur-sm"
                                            >
                                                {opt}
                                            </motion.button>
                                        ))}
                                    </div>
                                )}

                                {(insightData[insightStep].type === 'chart' || insightData[insightStep].type === 'bar_chart') && (
                                    <div className="w-full max-w-md space-y-5 animate-in slide-in-from-bottom duration-700 fade-in">
                                        {insightData[insightStep].data?.points.map((p: any, idx: number) => (
                                            <motion.div 
                                                key={idx} 
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="space-y-2"
                                            >
                                                <div className="flex justify-between text-sm font-bold text-white">
                                                    <span className="text-base">{p.label}</span>
                                                    <span className="text-[#FA2D48]">{p.value}</span>
                                                </div>
                                                <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(p.value, 100)}%` }}
                                                        transition={{ duration: 1, delay: 0.5 + idx * 0.1, ease: "easeOut" }}
                                                        className={`h-full rounded-full ${idx % 2 === 0 ? 'bg-gradient-to-r from-[#FA2D48] to-[#FF6B35]' : 'bg-gradient-to-r from-[#FF9F0A] to-[#FFD60A]'}`}
                                                    />
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {insightData[insightStep].type === 'pie_chart' && (
                                    <div className="relative w-full h-[350px] flex items-center justify-center animate-in zoom-in duration-700">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={insightData[insightStep].data?.segments}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={80}
                                                    outerRadius={120}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {insightData[insightStep].data?.segments.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color || ['#FA2D48', '#FF9F0A', '#30D158', '#0A84FF', '#BF5AF2'][index % 5]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#1C1C1E', borderRadius: '16px', borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: '12px' }}
                                                    itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
                                                    formatter={(value: any) => [`${value}%`, '']}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>

                                        {/* Center Stats */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-xs uppercase font-bold text-white/50 tracking-widest mb-2">Top Genre</span>
                                            <span className="text-3xl font-black text-white drop-shadow-lg">
                                                {insightData[insightStep].data?.segments[0]?.label}
                                            </span>
                                        </div>

                                        {/* Legend */}
                                        <div className="absolute bottom-0 w-full flex justify-center gap-4 flex-wrap">
                                            {insightData[insightStep].data?.segments.slice(0, 3).map((s: any, i: number) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-white/90 bg-black/30 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                                                    <span className="w-3 h-3 rounded-full" style={{ background: s.color || ['#FA2D48', '#FF9F0A', '#30D158'][i] }} />
                                                    <span className="font-bold">{s.label}</span>
                                                    <span className="opacity-70">{s.value}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {insightData[insightStep].type === 'race_chart' && (
                                    <div className="w-full h-[350px] relative flex md:block items-center justify-center">
                                        {/* Bubble Race Visualization - Enhanced */}
                                        <div className="absolute inset-0 flex flex-wrap items-center justify-center content-center gap-6 p-4 animate-in fade-in duration-700">
                                            {insightData[insightStep].data?.competitors.map((c: any, idx: number) => {
                                                // Dynamic Sizing based on score (max 100 usually)
                                                const baseSize = 90;
                                                const scale = Math.max(0.6, Math.min(1.5, c.score / 60));
                                                const size = baseSize * scale;

                                                return (
                                                    <motion.div
                                                        key={idx}
                                                        initial={{ scale: 0, rotate: -180 }}
                                                        animate={{ scale: 1, rotate: 0 }}
                                                        transition={{ 
                                                            delay: idx * 0.15,
                                                            type: "spring",
                                                            duration: 0.8
                                                        }}
                                                        whileHover={{ scale: 1.15, zIndex: 50 }}
                                                        className={`relative rounded-full border-4 border-[#2C2C2E] shadow-2xl overflow-hidden cursor-pointer transition-all ${
                                                            idx === 0 ? 'border-[#FA2D48] shadow-[#FA2D48]/50' : ''
                                                        }`}
                                                        style={{
                                                            width: `${size}px`,
                                                            height: `${size}px`,
                                                        }}
                                                    >
                                                        {/* Gradient Background */}
                                                        <div className={`absolute inset-0 ${
                                                            idx === 0 
                                                                ? 'bg-gradient-to-br from-[#FA2D48] to-[#FF6B35]'
                                                                : 'bg-gradient-to-br from-[#2C2C2E] to-[#1C1C1E]'
                                                        }`}>
                                                            {/* Fallback initials */}
                                                            <span className="absolute inset-0 flex items-center justify-center text-white/10 font-black text-5xl">
                                                                {c.name.substring(0, 1)}
                                                            </span>
                                                        </div>

                                                        {/* Winner Crown */}
                                                        {idx === 0 && (
                                                            <motion.div
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                                                                transition={{ delay: 0.5, repeat: Infinity, repeatDelay: 1 }}
                                                                className="absolute -top-2 -right-2 bg-[#FFD60A] rounded-full p-2 shadow-lg z-20"
                                                            >
                                                                <Sparkles size={16} className="text-black" fill="black" />
                                                            </motion.div>
                                                        )}

                                                        {/* Content */}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
                                                            <span className="text-white font-bold drop-shadow-md leading-tight" style={{ fontSize: `${Math.max(11, size / 5)}px` }}>
                                                                {c.name}
                                                            </span>
                                                            <span className="bg-white/20 px-3 py-1 rounded-full text-white font-mono font-bold mt-2 backdrop-blur-sm" style={{ fontSize: `${Math.max(9, size / 8)}px` }}>
                                                                {c.score}
                                                            </span>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Navigation - Apple Style */}
                        <div className="mt-10 flex justify-between items-center relative z-10">
                            {/* Back Button */}
                            {insightStep > 0 && (
                                <motion.button
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    onClick={() => setInsightStep(prev => Math.max(0, prev - 1))}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold transition-all backdrop-blur-md border border-white/10"
                                >
                                    <ChevronLeft size={18} />
                                    Back
                                </motion.button>
                            )}
                            
                            {/* Step indicator */}
                            <span className="text-white/50 text-sm font-medium">
                                {insightStep + 1} of {insightData.length}
                            </span>
                            
                            {/* Next/Finish Button */}
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    if (insightStep < insightData.length - 1) {
                                        setInsightStep(prev => prev + 1);
                                    } else {
                                        setInsightMode(false); // End story
                                    }
                                }}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#FA2D48] to-[#FF6B35] text-white rounded-full font-bold shadow-lg shadow-[#FA2D48]/30 hover:shadow-xl hover:shadow-[#FA2D48]/50 transition-all"
                            >
                                {insightStep === insightData.length - 1 ? 'Finish' : 'Next'} 
                                {insightStep === insightData.length - 1 ? <Sparkles size={18} /> : <ChevronRight size={18} />}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* WRAPPED IMMERSIVE MODE */}
            <AnimatePresence>
                {wrappedMode && wrappedSlides.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black"
                    >
                        {/* Background Gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${wrappedSlides[wrappedStep]?.gradient || 'from-purple-900 to-black'} opacity-80 transition-all duration-700`} />
                        
                        {/* Close Button */}
                        <button
                            onClick={() => setWrappedMode(false)}
                            className="absolute top-4 right-4 z-50 p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all border border-white/10"
                        >
                            <ChevronLeft size={18} />
                        </button>

                        {/* Progress Dots */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex gap-1.5">
                            {wrappedSlides.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setWrappedStep(i)}
                                    className={`h-1 rounded-full transition-all ${i === wrappedStep ? 'w-6 bg-white' : 'w-1.5 bg-white/30'}`}
                                />
                            ))}
                        </div>

                        {/* Slide Content */}
                        <motion.div
                            key={wrappedStep}
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            transition={{ duration: 0.4 }}
                            className="relative h-full flex flex-col items-center justify-center px-6 text-center"
                        >
                            {/* Image if available */}
                            {wrappedSlides[wrappedStep]?.image && (
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1, type: "spring" }}
                                    className="mb-6"
                                >
                                    <div className={`w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 overflow-hidden shadow-2xl ${wrappedSlides[wrappedStep]?.type === 'top_artist' ? 'rounded-full' : 'rounded-2xl'}`}>
                                        <img
                                            src={wrappedSlides[wrappedStep].image}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </motion.div>
                            )}

                            {/* Title */}
                            <motion.h2
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.15 }}
                                className="text-sm sm:text-base uppercase tracking-[0.2em] text-white/60 font-semibold mb-2"
                            >
                                {wrappedSlides[wrappedStep]?.title}
                            </motion.h2>

                            {/* Value */}
                            {wrappedSlides[wrappedStep]?.value && (
                                <motion.div
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                                    className="text-4xl sm:text-5xl md:text-6xl font-black text-white mb-4 leading-tight"
                                >
                                    {wrappedSlides[wrappedStep].value}
                                </motion.div>
                            )}

                            {/* Subtitle */}
                            {wrappedSlides[wrappedStep]?.subtitle && (
                                <motion.p
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.25 }}
                                    className="text-base sm:text-lg text-white/80 max-w-md"
                                >
                                    {wrappedSlides[wrappedStep].subtitle}
                                </motion.p>
                            )}
                        </motion.div>

                        {/* Navigation */}
                        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 px-6">
                            {wrappedStep > 0 && (
                                <button
                                    onClick={() => setWrappedStep(prev => prev - 1)}
                                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-semibold transition-all border border-white/10 flex items-center gap-2"
                                >
                                    <ChevronLeft size={16} /> Back
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (wrappedStep < wrappedSlides.length - 1) {
                                        setWrappedStep(prev => prev + 1);
                                    } else {
                                        setWrappedMode(false);
                                    }
                                }}
                                className="px-8 py-3 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform flex items-center gap-2"
                            >
                                {wrappedStep === wrappedSlides.length - 1 ? 'Done' : 'Next'} <ChevronRight size={16} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Discovery Results - Multiple Categories Support */}
            {mode === 'discover' && categoryResults.length > 0 && (
                <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
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
                            {/* Category Header with Toggles */}
                            <div className="flex items-end justify-between gap-4 mb-4 pr-4">
                                <div className="mb-2">
                                    <h3 className="text-2xl font-bold text-white tracking-tight">{category.title}</h3>
                                    <p className="text-[#8E8E93] text-sm">{category.description}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {/* Sort Toggles */}
                                    <div className="flex bg-[#1C1C1E] rounded-lg p-0.5 border border-white/5">
                                        {(['mins', 'plays', 'date', 'length'] as const).map(m => (
                                            <button
                                                key={m}
                                                onClick={() => {
                                                    setSortMode(m);
                                                }}
                                                className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md transition-all ${sortMode === m ? 'bg-white/10 text-white' : 'text-[#8E8E93] hover:text-white'}`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>

                                    {/* View Mode Toggle */}
                                    <button
                                        onClick={() => setViewMode(prev => prev === 'standard' ? 'ranked' : 'standard')}
                                        className="bg-[#1C1C1E] border border-white/5 p-1.5 rounded-lg text-white/50 hover:text-white transition-colors"
                                        title="Toggle View"
                                    >
                                        {viewMode === 'standard' ? <Trophy size={14} /> : <BarChart3 size={14} />}
                                    </button>

                                    {category.stats && (
                                        <div className="bg-white/10 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/90 mb-2">
                                            {category.stats}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Horizontal Scroll List */}
                            <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-2 scroll-smooth gap-4 min-h-[280px]">
                                {sortTracks(category.tracks).map((track, trackIndex) => (
                                    viewMode === 'ranked' ? (
                                        <AI_RankedItem key={trackIndex} item={{ ...track }} rank={trackIndex + 1} displayMode={sortMode} />
                                    ) : (
                                        <div key={trackIndex} className="flex-shrink-0 relative flex flex-col items-center gap-2 group cursor-pointer w-[140px] snap-start">
                                            <div className="w-[140px] h-[140px] overflow-hidden rounded-xl bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 relative">
                                                {/* Fallback Background */}
                                                <div className="absolute inset-0 flex items-center justify-center bg-[#1C1C1E]">
                                                    <Music2 className="text-white/20" size={48} />
                                                </div>
                                                <img
                                                    src={track.cover || track.image || track.album_cover}
                                                    alt={track.title || track.name}
                                                    className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-110"
                                                    onError={(e) => e.currentTarget.style.opacity = '0'}
                                                />
                                            </div>
                                            <div className="text-center w-full px-1">
                                                <h4 className="text-[13px] font-semibold text-white truncate w-full">{track.name || track.title}</h4>
                                                <p className="text-[11px] text-[#8E8E93] truncate w-full">{track.artist}</p>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            </ChatContainerContent>

            {/* Input Box - Fixed at Bottom */}
            <div className="flex-shrink-0 border-t border-white/5 bg-[#09090b] px-4 py-4">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".json"
                />
                <div className="max-w-4xl mx-auto">
                    <PromptInput
                        value={userPrompt}
                        onValueChange={setUserPrompt}
                        onSubmit={() => handleQuery()}
                        isLoading={loading}
                        className="bg-[#1a1a1a] border-white/10"
                    >
                        <PromptInputTextarea
                            placeholder={canvasMode ? "Describe a component to build..." : "Ask about your music..."}
                            className="text-white placeholder:text-white/30 min-h-[44px]"
                        />
                        <PromptInputActions className="justify-end pt-0 pb-2 pr-2">
                             <Button
                                onClick={() => handleQuery()}
                                disabled={loading || !userPrompt.trim()}
                                size="icon"
                                className={`h-8 w-8 rounded-lg transition-all ${loading || !userPrompt.trim() ? 'bg-zinc-800 text-zinc-500' : 'bg-white text-black hover:bg-zinc-200'}`}
                            >
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
