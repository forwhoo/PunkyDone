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
    FastForward, DoorOpen, Users, Target, ChevronDown, CheckSquare, UserCog, type LucideIcon
} from 'lucide-react';
import { generateDynamicCategoryQuery, answerMusicQuestionWithTools, streamMusicQuestionWithTools, generateWeeklyInsightStory, generateWrappedVibe, WrappedSlide, ToolCallInfo, AI_MODELS, DEFAULT_MODEL_ID } from '../services/mistralService';
import { fetchSmartPlaylist, uploadExtendedHistory, backfillExtendedHistoryImages, SpotifyHistoryItem, getWrappedStats } from '../services/dbService';
import { fetchArtistImages, fetchSpotifyRecommendations, searchSpotifyTracks } from '../services/spotifyService';
import { generateCanvasComponent, CanvasComponent } from '../services/canvasService';
import { CanvasRenderer } from './CanvasRenderer';
import { ToolsModal } from './ToolsModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

// ... existing interfaces ...
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

const PERSONAS = [
    { id: 'default', label: 'Default', icon: Sparkles },
    { id: 'Music Critic', label: 'Music Critic', icon: AlertTriangle },
    { id: 'Stan', label: 'Stan', icon: Heart },
    { id: 'Data Scientist', label: 'Data Scientist', icon: BarChart3 },
    { id: 'Roaster', label: 'Roaster', icon: Flame },
];

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
    const [mode, setMode] = useState<'discover' | 'chat'>('chat'); // Default to chat
    const [typing, setTyping] = useState(false);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
    const [selectedPersona, setSelectedPersona] = useState('default');
    const [toolsModalOpen, setToolsModalOpen] = useState(false);
    const [discoveryMode, setDiscoveryMode] = useState(false); // Kept for compatibility if needed, but UI removed

    const sectionRef = useRef<HTMLDivElement>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Removed manual modelDropdownOpen handling in favor of Popover

    useEffect(() => {
        if (initialQuery && initialQuery.trim()) {
            handleQuery(initialQuery);
        }
    }, [initialQuery]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, displayedText, loading, categoryResults]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        // ... (existing upload logic) ...
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
            // Simplified handling - mostly focusing on Chat now
            const lower = promptToUse.toLowerCase();

            if (canvasMode) {
                setMode('chat');
                setChatResponse("🎨 Building component...");
                const result = await generateCanvasComponent(promptToUse, contextData, chatMessages.filter(m => !m.canvas || m.role === 'user').map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })), (a, e) => setChatResponse(`🔄 Retry (${a}/5)... ${e}`));
                setChatMessages(prev => [...prev, { role: 'ai', text: result && !result.error ? `Here's your **${result.title}**` : `Sorry, I couldn't build that. ${result?.error || ''}`, timestamp: new Date(), canvas: result || undefined }]);
                setChatResponse(null);
                setLoading(false);
                return;
            }

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
                chatMessages.slice(-10), // Chat Memory
                selectedPersona !== 'default' ? selectedPersona : undefined
            );

        } catch (err: any) { setErrorMsg(`Error: ${err.message || 'Unknown'}`); }
        setLoading(false);
    };

    return (
        <ChatContainerRoot id="ai-spotlight" ref={sectionRef}>
            <div className="flex-shrink-0 flex items-center justify-between py-3 px-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0 border border-white/10 bg-white/5 rounded-xl p-1 backdrop-blur-md">
                        {([{id:'chat',label:'Chat'},{id:'canvas',label:'Canvas',icon:Palette}] as const).map(m => (
                            <button
                                key={m.id}
                                onClick={() => { if(m.id==='chat'){setCanvasMode(false);}else{setCanvasMode(true);} }}
                                className={`px-5 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1.5 ${((m.id==='chat'&&!canvasMode)||(m.id==='canvas'&&canvasMode)) ? 'bg-white text-black' : 'text-[#8E8E93] hover:text-white'}`}
                            >
                                {m.icon && <m.icon size={12} />}
                                {m.label}
                            </button>
                        ))}
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setToolsModalOpen(true)}
                        className="text-xs font-semibold text-[#8E8E93] hover:text-white hover:bg-white/10 h-9 rounded-xl border border-white/10 bg-white/5 px-4"
                    >
                        <Zap size={14} className="mr-2" /> Tools
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all backdrop-blur-md text-[11px] font-semibold ${webSearchEnabled ? 'bg-[#FA2D48]/10 border-[#FA2D48]/30 text-[#FA2D48]' : 'bg-white/5 border-white/10 text-[#8E8E93] hover:text-white hover:border-white/20'}`}
                        title="Enable Web Search"
                    >
                        <Globe size={11} /> Search
                    </button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-semibold text-[#8E8E93] hover:text-white hover:border-white/20 transition-all backdrop-blur-md min-w-[100px] justify-between">
                                <span className="flex items-center gap-2 truncate">
                                    <UserCog size={11} />
                                    {PERSONAS.find(p => p.id === selectedPersona)?.label || 'Persona'}
                                </span>
                                <ChevronDown size={11} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-1 bg-[#1a1a1a] border-white/10" align="end">
                            <div className="flex flex-col gap-0.5">
                                {PERSONAS.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedPersona(p.id)}
                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-medium rounded-lg transition-colors hover:bg-white/5 ${selectedPersona === p.id ? 'text-white bg-white/5' : 'text-[#8E8E93]'}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <p.icon size={12} />
                                            {p.label}
                                        </span>
                                        {selectedPersona === p.id && <CheckCircle size={12} className="text-[#FA2D48]" />}
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-semibold text-[#8E8E93] hover:text-white hover:border-white/20 transition-all backdrop-blur-md min-w-[140px] justify-between">
                                <span className="truncate flex items-center gap-2">
                                    <Zap size={11} className={AI_MODELS.find(m => m.id === selectedModel)?.isReasoning ? 'text-[#FF9F0A]' : 'text-[#8E8E93]'} />
                                    {AI_MODELS.find(m => m.id === selectedModel)?.label || 'Model'}
                                </span>
                                <ChevronDown size={11} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[240px] p-1 bg-[#1a1a1a] border-white/10" align="end">
                            <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {AI_MODELS.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedModel(m.id)}
                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-[12px] font-medium rounded-lg transition-colors hover:bg-white/5 ${selectedModel === m.id ? 'text-white bg-white/5' : 'text-[#8E8E93]'}`}
                                    >
                                        <span>{m.label}</span>
                                        <div className="flex items-center gap-2">
                                            {m.isReasoning && <span className="text-[9px] font-bold text-[#FF9F0A] bg-[#FF9F0A]/10 px-1.5 py-0.5 rounded-md">THINK</span>}
                                            {selectedModel === m.id && <CheckCircle size={12} className="text-white" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
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

            <ToolsModal
                isOpen={toolsModalOpen}
                onClose={() => setToolsModalOpen(false)}
                onSelectTool={(toolName) => setUserPrompt(`@tool ${toolName} `)}
            />
        </ChatContainerRoot>
    );
};
