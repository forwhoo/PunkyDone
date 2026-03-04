import React, { useState, useEffect, useRef } from "react";
import { AIFace, FaceExpression } from "./AIFace";
import {
  Sparkles,
  RefreshCcw,
  AlertTriangle,
  Zap,
  ChevronRight,
  BarChart3,
  ArrowUp,
  Music,
  Mic2,
  Disc,
  Clock,
  Orbit,
  Flame,
  Radio,
  TrendingUp,
  Moon,
  SkipForward,
  BarChart2,
  Gift,
  Search,
  SlidersHorizontal,
  Image,
  Grid3x3,
  Network,
  ChartPie,
  History,
  ArrowLeftRight,
  ImageIcon,
  Timer,
  Globe,
  ArrowUpDown,
  Heart,
  PieChart as PieChartIcon,
  Calendar,
  Play,
  Star,
  CheckCircle,
  Repeat,
  Briefcase,
  CloudSun,
  CalendarClock,
  Car,
  LineChart,
  FastForward,
  DoorOpen,
  Users,
  Target,
  ChevronDown,
  CheckSquare,
  type LucideIcon,
} from "lucide-react";
import {
  streamMusicQuestionWithTools,
  WrappedSlide,
  ToolCallInfo,
  AI_MODELS,
  DEFAULT_MODEL_ID,
} from "../services/mistralService";
import {
  fetchSmartPlaylist,
  uploadExtendedHistory,
  backfillExtendedHistoryImages,
  SpotifyHistoryItem,
  getWrappedStats,
} from "../services/dbService";
import {
  fetchArtistImages,
  fetchSpotifyRecommendations,
  searchSpotifyTracks,
} from "../services/spotifyService";
import { ToolsModal } from "./ToolsModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui";
import { Loader } from "@/components/prompt-kit/loader";
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/prompt-kit/chat-container";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
} from "@/components/prompt-kit/prompt-input";
import {
  Source,
  SourceContent,
  SourceTrigger,
} from "@/components/prompt-kit/source";
import { Tool, ToolPart } from "@/components/prompt-kit/tool";

const TOOL_LUCIDE_MAP: Record<string, LucideIcon> = {
  Music, Mic2, Disc, Clock, Orbit, Flame, BarChart3, Radio, TrendingUp, Moon,
  SkipForward, BarChart2, Gift, Search, SlidersHorizontal, Image, Grid3x3,
  Network, ChartPie, History, ArrowLeftRight, ImageIcon, Timer, ArrowUpDown,
  Heart, PieChart: PieChartIcon, Calendar, Play, Star, CheckCircle, Repeat,
  Briefcase, CloudSun, CalendarClock, Car, LineChart, FastForward, DoorOpen,
  Users, Target, vote: CheckSquare,
};

const VoteTool = ({
  tool,
  onVote,
}: {
  tool: ToolPart;
  onVote: (selections: string[]) => void;
}) => {
  const [selections, setSelections] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const options = tool.input?.options || [];
  const multiSelect = !!tool.input?.multi_select;
  const title = tool.input?.title || "Quick Poll";
  if (tool.state !== "output-available") return null;
  const toggleOption = (opt: string) => {
    if (submitted) return;
    if (multiSelect) {
      setSelections((prev) =>
        prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
      );
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
    <div className="w-full my-3 border border-white/[0.07] rounded-2xl overflow-hidden bg-white/[0.03] p-4">
      <h4 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2">
        <CheckSquare size={14} className="text-foreground/40" />
        {title}
      </h4>
      <div className="space-y-1.5">
        {options.map((opt: string, idx: number) => (
          <button
            key={idx}
            disabled={submitted}
            onClick={() => toggleOption(opt)}
            className={`w-full text-left px-3 py-2.5 rounded-xl border transition-all text-[13px] font-medium flex items-center justify-between ${
              selections.includes(opt)
                ? "bg-foreground/10 border-foreground/20 text-foreground"
                : "bg-transparent border-white/[0.06] text-foreground/50 hover:border-white/20 hover:text-foreground/80"
            } ${submitted && !selections.includes(opt) ? "opacity-30" : ""}`}
          >
            <span>{opt}</span>
            {selections.includes(opt) && (
              <CheckCircle size={13} className="text-foreground/60" />
            )}
          </button>
        ))}
      </div>
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={selections.length === 0}
          className="w-full mt-3 bg-foreground text-background rounded-xl py-2 text-[13px] font-semibold disabled:opacity-30 transition-opacity hover:opacity-90"
        >
          Submit
        </button>
      )}
      {submitted && (
        <p className="text-[11px] text-foreground/30 text-center mt-2 font-medium">
          Submitted ✓
        </p>
      )}
    </div>
  );
};

const CollapsibleTools = ({
  tools,
  onVote,
}: {
  tools: ToolPart[];
  onVote: (selections: string[]) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  if (!tools || tools.length === 0) return null;
  const voteTool = tools.find((t) => t.type === "vote");
  return (
    <div className="w-full my-2 border border-white/[0.06] rounded-xl overflow-hidden bg-white/[0.02]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-white/[0.04] transition-colors text-[11px] font-medium text-foreground/30"
      >
        <div className="flex items-center gap-1.5">
          <Zap size={10} className="text-foreground/40" />
          <span>{tools.length} tool{tools.length > 1 ? "s" : ""} used</span>
        </div>
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5 border-t border-white/[0.04] pt-2">
              {tools.map((tool, idx) => (
                <Tool
                  key={idx}
                  toolPart={tool}
                  className="my-0 border-white/[0.06] bg-transparent text-[12px]"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {voteTool && <VoteTool tool={voteTool} onVote={onVote} />}
    </div>
  );
};

const SUGGESTIONS = [
  "What's my most played song this week?",
  "Which artist did I obsess over most?",
  "What time of day do I listen most?",
  "Roast my music taste",
];

interface TopAIProps {
  token?: string | null;
  history?: any[];
  contextData: {
    artists: string[];
    albums: string[];
    songs: string[];
    userName?: string;
    globalStats?: {
      weeklyTime: string;
      weeklyTrend: string;
      totalTracks: number;
      totalMinutes?: number;
      charts?: any[];
    };
  };
  user?: any;
  initialQuery?: string;
}

interface Skill {
  id: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  system_prompt?: string;
}

const DEFAULT_SKILLS: Skill[] = [
  { id: "default", label: "Default", icon: Sparkles },
  { id: "Music Critic", label: "Music Critic", icon: AlertTriangle },
  { id: "Stan", label: "Stan", icon: Heart },
  { id: "Data Scientist", label: "Data Scientist", icon: BarChart3 },
  { id: "Roaster", label: "Roaster", icon: Flame },
];

interface ChatMessage {
  role: "user" | "ai";
  text: string;
  timestamp: Date;
  toolCalls?: ToolCallInfo[];
  tools?: ToolPart[];
  sources?: any;
  isThinking?: boolean;
}

export const AISpotlight: React.FC<TopAIProps> = ({
  contextData,
  token,
  history = [],
  user,
  initialQuery,
}) => {
  const [loading, setLoading] = useState(false);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [selectedSkill, setSelectedSkill] = useState("default");
  const [skills, setSkills] = useState(DEFAULT_SKILLS);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [faceExpression, setFaceExpression] = useState<FaceExpression>("neutral");

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, loading]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text) as SpotifyHistoryItem[];
        if (!Array.isArray(json)) throw new Error("Invalid format: Expected an array.");
        const result = await uploadExtendedHistory(json, () => {});
        if (!result.success) setErrorMsg("Upload failed: " + result.message);
      } catch (err: any) {
        setErrorMsg("Failed to parse JSON: " + err.message);
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
    if (promptToUse.trim().toLowerCase() === "@json") {
      fileInputRef.current?.click();
      setUserPrompt("");
      return;
    }
    if (promptToUse.trim().toLowerCase() === "@backfill") {
      setUserPrompt("");
      setLoading(true);
      if (!token) { setErrorMsg("No Spotify token."); setLoading(false); return; }
      const result = await backfillExtendedHistoryImages(token, () => {});
      setLoading(false);
      return;
    }

    setChatMessages((prev) => [
      ...prev,
      { role: "user", text: promptToUse, timestamp: new Date() },
    ]);
    setLoading(true);
    setErrorMsg(null);
    setUserPrompt("");
    setFaceExpression("thinking");

    try {
      setChatMessages((prev) => [
        ...prev,
        { role: "ai", text: "", timestamp: new Date(), isThinking: true, tools: [], sources: null },
      ]);
      let currentText = "";
      let tools: any[] = [];
      let sources: any = null;
      let isThinking = false;

      await streamMusicQuestionWithTools(
        promptToUse,
        contextData,
        (chunk) => {
          if (chunk.type === "thinking") isThinking = true;
          if (chunk.type === "text" && chunk.content) {
            currentText += chunk.content;
            isThinking = false;
          }
          if (chunk.type === "tool-call" && chunk.toolCall) {
            tools.push({ type: chunk.toolCall.name, state: "input-available", input: chunk.toolCall.arguments });
            isThinking = true;
          }
          if (chunk.type === "tool-result" && chunk.toolCall) {
            const ti = tools.findIndex((t) => t.type === chunk.toolCall!.name && t.state === "input-available");
            if (ti !== -1) tools[ti] = { ...tools[ti], state: "output-available", output: chunk.toolCall.result };
            if (chunk.toolCall.name === "set_skill" && chunk.toolCall.arguments?.skill) {
              const matched = skills.find((p) => p.label.toLowerCase() === chunk.toolCall!.arguments.skill.toLowerCase());
              if (matched) setSelectedSkill(matched.id);
            }
            if (chunk.toolCall.name === "create_skill" && chunk.toolCall.arguments?.title) {
              const newSkillId = chunk.toolCall.arguments.title.toLowerCase().replace(/\s+/g, "-");
              const newSkillEntry = { id: newSkillId, label: chunk.toolCall.arguments.title, icon: Sparkles, description: chunk.toolCall.arguments.description, system_prompt: chunk.toolCall.arguments.system_prompt };
              setSkills((prev) => { if (prev.find((s) => s.id === newSkillId)) return prev; return [...prev, newSkillEntry]; });
              setSelectedSkill(newSkillId);
            }
          }
          if (chunk.type === "grounding" && chunk.groundingMetadata) sources = chunk.groundingMetadata;
          setChatMessages((prev) => {
            const next = [...prev];
            const last = next.length - 1;
            if (last < 0 || next[last].role !== "ai") return prev;
            next[last] = { ...next[last], text: currentText, tools: [...tools], sources, isThinking };
            return next;
          });
        },
        token,
        selectedModel,
        webSearchEnabled,
        chatMessages.slice(-10),
      );
    } catch (err: any) {
      setErrorMsg(`Error: ${err.message || "Unknown"}`);
      setFaceExpression("upset");
    }
    setLoading(false);
    setFaceExpression((prev) => prev === "thinking" || prev === "upset" ? "happy" : prev);
  };

  const isEmpty = chatMessages.length === 0 && !loading;

  return (
    <ChatContainerRoot
      id="ai-spotlight"
      ref={sectionRef}
      className="bg-[#0A0A0A] relative h-full font-body flex flex-col"
    >
      <ChatContainerContent className="flex-1 relative z-10 px-4 pt-5 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {isEmpty && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[360px] text-center pb-6"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="mb-5"
              >
                <AIFace expression="neutral" size={80} />
              </motion.div>
              <h3 className="text-[22px] font-bold text-foreground tracking-tight mb-1">
                Ask Harvey
              </h3>
              <p className="text-foreground/40 text-[14px] max-w-[260px] leading-relaxed mb-8">
                Your personal music analyst. Ask anything.
              </p>
              <div className="w-full max-w-sm space-y-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuery(s)}
                    className="w-full text-left px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[13px] text-foreground/50 hover:text-foreground/80 hover:bg-white/[0.06] hover:border-white/[0.12] transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <div className="space-y-5 pb-4">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`${msg.role === "user" ? "max-w-[78%]" : "max-w-[92%] w-full"}`}>
                  {msg.role === "user" ? (
                    <div>
                      <div className="bg-white/[0.07] text-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-[14px] leading-relaxed border border-white/[0.06]">
                        {msg.text}
                      </div>
                      <p className="text-[10px] mt-1 text-foreground/20 text-right">
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-3 items-start">
                      <div className="flex-shrink-0 mt-1">
                        <AIFace
                          expression={
                            msg.isThinking && !msg.text ? "thinking" :
                            idx === chatMessages.length - 1 && !loading ? faceExpression :
                            "neutral"
                          }
                          size={32}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                      {msg.isThinking && !msg.text && (
                        <div className="py-1.5 px-1">
                          <Loader variant="text-shimmer" className="text-foreground/30 text-[13px]">
                            Thinking...
                          </Loader>
                        </div>
                      )}
                      {msg.tools && msg.tools.length > 0 && (
                        <CollapsibleTools
                          tools={msg.tools}
                          onVote={(sels) => handleQuery(`User selected: ${sels.join(", ")}`)}
                        />
                      )}
                      {msg.text && (
                        <div className="text-[14px] leading-relaxed text-foreground/80 prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:text-foreground/80 prose-p:my-1.5 prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-1.5 prose-li:text-foreground/70 prose-li:my-0.5 prose-strong:text-foreground prose-code:text-foreground/70 prose-code:bg-white/[0.06] prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-[12px] prose-a:text-foreground/60 prose-a:underline prose-a:underline-offset-2 prose-table:text-[13px] prose-th:font-semibold prose-th:text-foreground/60 prose-td:text-foreground/70">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              img: ({ node, ...props }) => (
                                <img
                                  {...props}
                                  className="max-w-full md:max-w-sm h-auto rounded-xl shadow-lg border border-white/[0.06] mx-auto my-3"
                                  loading="lazy"
                                />
                              ),
                              table: ({ node, ...props }) => (
                                <div className="overflow-x-auto my-3 rounded-xl border border-white/[0.07] bg-white/[0.02]">
                                  <table {...props} className="min-w-full divide-y divide-white/[0.06]" />
                                </div>
                              ),
                              th: ({ node, ...props }) => (
                                <th {...props} className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-foreground/40 font-semibold" />
                              ),
                              td: ({ node, ...props }) => (
                                <td {...props} className="px-3 py-2 border-t border-white/[0.04]" />
                              ),
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      )}
                      {msg.sources && msg.sources.groundingChunks && (
                        <div className="mt-3 pt-3 border-t border-white/[0.05]">
                          <p className="text-[10px] text-foreground/25 mb-2 uppercase tracking-widest font-semibold">Sources</p>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.sources.groundingChunks.map((c: any, ci: number) =>
                              c.web?.uri ? (
                                <Source key={ci} href={c.web.uri} showFavicon={true}>
                                  <SourceTrigger label={c.web.title || "Source"} />
                                  <SourceContent title={c.web.title} description={c.web.uri} />
                                </Source>
                              ) : null
                            )}
                          </div>
                        </div>
                      )}
                      {msg.text && (
                        <p className="text-[10px] mt-1.5 text-foreground/20">
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div ref={messagesEndRef} />
        </div>

        {errorMsg && (
          <div className="max-w-2xl mx-auto mb-4 bg-red-500/[0.08] border border-red-500/[0.15] text-red-400/80 p-3 rounded-xl text-[12px] flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            {errorMsg}
          </div>
        )}
      </ChatContainerContent>

      <div className="flex-shrink-0 px-4 pb-4 pt-2 relative z-10">
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".json" />
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-3">
            <div className="flex-shrink-0 pb-2">
              <AIFace expression={loading ? "thinking" : errorMsg ? "upset" : faceExpression} size={36} />
            </div>
          <PromptInput
            value={userPrompt}
            onValueChange={setUserPrompt}
            onSubmit={() => handleQuery()}
            isLoading={loading}
            className="bg-white/[0.04] border border-white/[0.08] rounded-2xl shadow-none focus-within:border-white/[0.15] transition-colors"
          >
            <PromptInputTextarea
              placeholder="Ask Harvey..."
              className="text-foreground placeholder:text-foreground/25 min-h-[44px] max-h-[120px] px-4 py-3 text-[14px] bg-transparent resize-none"
            />
            <PromptInputActions className="justify-end pt-0 pb-2 pr-2 flex items-center gap-1">
              <button
                className="h-8 w-8 rounded-xl hover:bg-white/[0.06] text-foreground/30 hover:text-foreground/60 transition-colors flex items-center justify-center"
                onClick={() => setToolsModalOpen(true)}
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleQuery()}
                disabled={loading || !userPrompt.trim()}
                className={`h-8 w-8 rounded-xl flex items-center justify-center transition-all ${
                  loading || !userPrompt.trim()
                    ? "bg-white/[0.06] text-foreground/20 cursor-not-allowed"
                    : "bg-foreground text-background hover:opacity-90"
                }`}
              >
                {loading ? (
                  <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowUp className="w-3.5 h-3.5" />
                )}
              </button>
            </PromptInputActions>
          </PromptInput>
          </div>
        </div>
      </div>

      <ToolsModal
        customTools={[]}
        isOpen={toolsModalOpen}
        onClose={() => setToolsModalOpen(false)}
        onSelectTool={(toolName) => setUserPrompt(`@tool ${toolName} `)}
      />
    </ChatContainerRoot>
  );
};
