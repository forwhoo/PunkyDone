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
import { ToolsModal } from './ToolsModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';
import { Input, Button, Avatar, AvatarFallback, AvatarImage, Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
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
        <div className="w-full max-w-md my-4 border border-[#e8e6dc] rounded-2xl overflow-hidden bg-white p-5 ">
            <h4 className="text-[15px] font-bold text-[#141413] mb-4 flex items-center gap-2">
                <CheckSquare size={16} className="text-[#d97757]" />
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
                                ? 'bg-[#e8e6dc] border-[#d97757]/40 text-[#141413]'
                                : 'bg-[#e8e6dc]/50 border-[#e8e6dc] text-[#141413]/60 hover:border-[#b0aea5]/30'
                        } ${submitted && !selections.includes(opt) ? 'opacity-40' : ''}`}
                    >
                        <span>{opt}</span>
                        {selections.includes(opt) && <CheckCircle size={14} className="text-[#d97757]" />}
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
                <p className="text-[11px] text-[#141413]/40 text-center mt-3 font-medium italic">Vote submitted</p>
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
        <div className="w-full max-w-md my-4 border border-[#e8e6dc] rounded-xl overflow-hidden bg-white">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white transition-colors text-[12px] font-medium text-[#141413]/50"
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
                        <div className="px-3 pb-3 space-y-2 border-t border-[#e8e6dc] pt-3 bg-[#faf9f5]/20">
                            {tools.map((tool, idx) => (
                                <Tool key={idx} toolPart={tool} className="my-0 border-[#e8e6dc] bg-transparent" />
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

            setMode('chat');
            const aiMessageId = Date.now();
            setChatMessages(prev => [...prev, { role: 'ai', text: '', timestamp: new Date(), isThinking: false, tools: [], sources: null }]);
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
                    if (chunk.type === 'tool-result' && chunk.toolCall) {
                        const ti = tools.findIndex(t => t.type === chunk.toolCall!.name && t.state === 'input-available');
                        if (ti !== -1) tools[ti] = { ...tools[ti], state: 'output-available', output: chunk.toolCall.result };

                        // Intercept set_persona to update the UI
                        if (chunk.toolCall.name === 'set_persona' && chunk.toolCall.arguments?.persona) {
                            const newPersona = chunk.toolCall.arguments.persona;
                            const matched = PERSONAS.find(p => p.label.toLowerCase() === newPersona.toLowerCase());
                            if (matched) {
                                setSelectedPersona(matched.id);
                            } else {
                                // Default to Custom or the exact string if needed, but we restrict it in tool definition
                                setSelectedPersona(newPersona);
                            }
                        }
                    }
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
        <ChatContainerRoot id="ai-spotlight" ref={sectionRef} className="bg-[#faf9f5] relative h-full font-body">
            <div className="flex-shrink-0 flex items-center justify-between py-3 px-4 border-b border-[#e8e6dc] relative z-10 bg-[#faf9f5] ">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setToolsModalOpen(true)}
                        className="text-xs font-semibold text-[#b0aea5] hover:text-[#141413] hover:bg-[#e8e6dc] h-9 rounded-xl border border-[#e8e6dc] bg-white px-4"
                    >
                        <Zap size={14} className="mr-2" /> Tools
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all  text-[11px] font-semibold ${webSearchEnabled ? 'bg-[#e8e6dc] border-[#d97757]/30 text-[#d97757]' : 'bg-[#e8e6dc]/50 border-[#e8e6dc] text-[#b0aea5] hover:text-[#141413] hover:border-[#b0aea5]/30'}`}
                        title="Enable Web Search"
                    >
                        <Globe size={11} /> Search
                    </button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e8e6dc]/50 border border-[#e8e6dc] text-[11px] font-semibold text-[#b0aea5] hover:text-[#141413] hover:border-[#b0aea5]/30 transition-all  min-w-[100px] justify-between">
                                <span className="flex items-center gap-2 truncate">
                                    <UserCog size={11} />
                                    {PERSONAS.find(p => p.id === selectedPersona)?.label || 'Persona'}
                                </span>
                                <ChevronDown size={11} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-1 bg-white border-[#e8e6dc] border-[#e8e6dc] z-[10002]" align="end">
                            <div className="flex flex-col gap-0.5">
                                {PERSONAS.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedPersona(p.id)}
                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-[12px] font-medium rounded-lg transition-colors hover:bg-[#e8e6dc]/50 ${selectedPersona === p.id ? 'text-[#141413] bg-[#e8e6dc]/50' : 'text-[#b0aea5]'}`}
                                    >
                                        <span className="flex items-center gap-2">
                                            <p.icon size={12} />
                                            {p.label}
                                        </span>
                                        {selectedPersona === p.id && <CheckCircle size={12} className="text-[#d97757]" />}
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e8e6dc]/50 border border-[#e8e6dc] text-[11px] font-semibold text-[#b0aea5] hover:text-[#141413] hover:border-[#b0aea5]/30 transition-all  min-w-[140px] justify-between">
                                <span className="truncate flex items-center gap-2">
                                    <Zap size={11} className={AI_MODELS.find(m => m.id === selectedModel)?.isReasoning ? 'text-[#FF9F0A]' : 'text-[#b0aea5]'} />
                                    {AI_MODELS.find(m => m.id === selectedModel)?.label || 'Model'}
                                </span>
                                <ChevronDown size={11} />
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[240px] p-1 bg-white border-[#e8e6dc] border-[#e8e6dc] z-[10002]" align="end">
                            <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {AI_MODELS.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => setSelectedModel(m.id)}
                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-[12px] font-medium rounded-lg transition-colors hover:bg-[#e8e6dc]/50 ${selectedModel === m.id ? 'text-[#141413] bg-[#e8e6dc]/50' : 'text-[#b0aea5]'}`}
                                    >
                                        <span>{m.label}</span>
                                        <div className="flex items-center gap-2">
                                            {m.isReasoning && <span className="text-[9px] font-bold text-[#FF9F0A] bg-[#FF9F0A]/10 px-1.5 py-0.5 rounded-md">THINK</span>}
                                            {selectedModel === m.id && <CheckCircle size={12} className="text-[#141413]" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <ChatContainerContent className="flex-1 relative z-10 px-4 pt-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {chatMessages.length === 0 && !loading && categoryResults.length === 0 && !insightMode && !wrappedMode && (
                        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center bg-[#faf9f5]">
                            <h3 className="text-4xl font-heading font-medium text-[#141413] tracking-tight mb-2">Good morning, I'm Harvey.</h3>
                            <p className="text-[#b0aea5] text-lg font-body max-w-md mt-2">How can I help you analyze your music today?</p>
                        </div>
                    )}
                    {chatMessages.map((msg, idx) => (
                        <Message key={idx} role={msg.role === 'user' ? 'user' : 'ai'} className="mb-6">
                            <MessageContent className={`text-[15px] leading-relaxed ${msg.role === 'user' ? 'bg-[#e8e6dc] text-[#141413] rounded-3xl rounded-tr-sm px-6 py-4 font-body' : 'text-[#141413] font-body'}`}>
                                {msg.role === 'ai' ? (
                                    <>
                                        {msg.isThinking && !msg.text && (
                                            <div className="bg-[#e8e6dc]/50 rounded-2xl p-4 max-w-sm">
                                                <Loader variant="text-shimmer">Analyzing history...</Loader>
                                            </div>
                                        )}
                                        {msg.tools && msg.tools.length > 0 && <CollapsibleTools tools={msg.tools} onVote={(sels) => handleQuery(`User selected: ${sels.join(', ')}`)} />}
                                        {msg.text && (
                                            <div className="text-[16px] leading-relaxed markdown-container mt-2 prose prose-zinc max-w-none prose-table:border prose-table:border-[#e8e6dc] prose-th:border prose-th:border-[#e8e6dc] prose-td:border prose-td:border-[#e8e6dc] prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-img:rounded-xl">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ img: ({node, ...props}) => <img {...props} className="max-w-full md:max-w-md h-auto rounded-xl shadow-xl border border-[#e8e6dc] mx-auto" loading="lazy" />, table: ({node, ...props}) => <div className="overflow-x-auto my-4 rounded-xl border border-[#e8e6dc] bg-white"><table {...props} className="min-w-full divide-y divide-[#e8e6dc]" /></div> }}>{msg.text}</ReactMarkdown>
                                            </div>
                                        )}
                                        {msg.sources && msg.sources.groundingChunks && (
                                            <div className="mt-4 pt-4 border-t border-[#e8e6dc]"><p className="text-xs text-[#b0aea5] mb-2 font-semibold">Sources</p><div className="flex flex-wrap gap-2">{msg.sources.groundingChunks.map((c: any, ci: number) => c.web?.uri ? <Source key={ci} href={c.web.uri} showFavicon={true}><SourceTrigger label={c.web.title || "Source"} /><SourceContent title={c.web.title} description={c.web.uri} /></Source> : null)}</div></div>
                                        )}
                                        <p className="text-[11px] mt-2 text-[#141413]/30 font-medium">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </>
                                ) : (
                                    <><p className="text-[15px] leading-relaxed">{msg.text}</p><p className="text-[11px] mt-1.5 text-[#141413]/40">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></>
                                )}
                            </MessageContent>
                        </Message>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
                {errorMsg && <div className="max-w-2xl mx-auto mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-mono flex items-center gap-2"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{errorMsg}</div>}
            </ChatContainerContent>

            <div className="flex-shrink-0 bg-transparent px-4 py-6 relative z-10">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".json" />
                <div className="max-w-3xl mx-auto">
                    <PromptInput value={userPrompt} onValueChange={setUserPrompt} onSubmit={() => handleQuery()} isLoading={loading} className="bg-[#e8e6dc] border border-[#b0aea5]/30  rounded-[32px] shadow-2xl">
                        <PromptInputTextarea placeholder="How can I help you analyze your music?" className="text-[#141413] placeholder:text-[#141413]/50 min-h-[52px] px-6 py-4 text-[16px]" />
                        <PromptInputActions className="justify-end pt-0 pb-2 pr-2">
                             <Button onClick={() => handleQuery()} disabled={loading || !userPrompt.trim()} size="icon" className={`h-10 w-10 rounded-full transition-all ${loading || !userPrompt.trim() ? 'bg-[#e8e6dc] text-[#141413]/40' : 'bg-[#d97757] text-[#141413] hover:bg-[#ff4f66] shadow-lg shadow-[#FA2D48]/30'}`}>
                                {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
                            </Button>
                        </PromptInputActions>
                    </PromptInput>
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
