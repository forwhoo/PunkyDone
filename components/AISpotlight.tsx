import React, { useState, useEffect, useRef, useMemo } from "react";
import { Card } from "./UIComponents";
import { ActivityHeatmap } from "./ActivityHeatmap";
import {
  Sparkles,
  RefreshCcw,
  AlertTriangle,
  MessageSquare,
  Plus,
  Send,
  Zap,
  ChevronRight,
  BarChart3,
  ChartPie,
  Trophy,
  Music2,
  Gift,
  ChevronLeft,
  ArrowUp,
  Palette,
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
  Search,
  SlidersHorizontal,
  Image,
  Grid3x3,
  Network,
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
  Sparkles as SparklesIcon,
  LineChart,
  FastForward,
  DoorOpen,
  Users,
  Target,
  ChevronDown,
  CheckSquare,
  UserCog,
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
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { AnimatePresence, motion } from "framer-motion";
import {
  Input,
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { Loader } from "@/components/prompt-kit/loader";
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/prompt-kit/chat-container";
import { Message, MessageContent } from "@/components/prompt-kit/message";
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
import {
  ChainOfThought,
  ChainOfThoughtStep,
  ChainOfThoughtTrigger,
  ChainOfThoughtContent,
  ChainOfThoughtItem,
} from "@/components/prompt-kit/chain-of-thought";

const TOOL_LUCIDE_MAP: Record<string, LucideIcon> = {
  Music,
  Mic2,
  Disc,
  Clock,
  Orbit,
  Flame,
  BarChart3,
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
  ArrowUpDown,
  Heart,
  PieChart: PieChartIcon,
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
  vote: CheckSquare,
};

const ToolIcon = ({
  iconName,
  size = 12,
}: {
  iconName: string;
  size?: number;
}) => {
  const IconComponent = TOOL_LUCIDE_MAP[iconName];
  if (IconComponent) {
    return <IconComponent size={size} />;
  }
  return <Zap size={size} />;
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
        prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt],
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
    <div className="w-full max-w-md my-4 border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900 p-5">
      <h4 className="text-[15px] font-semibold text-zinc-100 mb-4 flex items-center gap-2">
        <CheckSquare size={16} className="text-zinc-400" />
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
                ? "bg-zinc-800 border-zinc-600 text-zinc-100"
                : "bg-zinc-800/50 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            } ${submitted && !selections.includes(opt) ? "opacity-40" : ""}`}
          >
            <span>{opt}</span>
            {selections.includes(opt) && (
              <CheckCircle size={14} className="text-zinc-300" />
            )}
          </button>
        ))}
      </div>
      {!submitted && (
        <Button
          onClick={handleSubmit}
          disabled={selections.length === 0}
          className="w-full mt-4 bg-zinc-100 text-zinc-900 hover:bg-zinc-200 font-semibold py-2.5"
        >
          Submit Vote
        </Button>
      )}
      {submitted && (
        <p className="text-[11px] text-zinc-500 text-center mt-3 font-medium italic">
          Vote submitted
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
    <div className="w-full max-w-md my-3 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/50 transition-colors text-[12px] font-medium text-zinc-500"
      >
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-amber-500" />
          <span>Tools ({tools.length} calls)</span>
        </div>
        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-zinc-800 pt-3">
              {tools.map((tool, idx) => (
                <Tool
                  key={idx}
                  toolPart={tool}
                  className="my-0 border-zinc-800 bg-transparent"
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

interface CategoryResult {
  id: string;
  title: string;
  description: string;
  stats: string;
  tracks: any[];
}

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
  const [categoryResults, setCategoryResults] = useState<CategoryResult[]>([]);
  const [viewMode, setViewMode] = useState<"standard" | "ranked">("standard");
  const [sortMode, setSortMode] = useState<"mins" | "plays" | "date" | "length">("mins");
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
  const [mode, setMode] = useState<"discover" | "chat">("chat");
  const [typing, setTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [selectedSkill, setSelectedSkill] = useState("default");
  const [skills, setSkills] = useState(DEFAULT_SKILLS);
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [toolsModalOpen, setToolsModalOpen] = useState(false);
  const [discoveryMode, setDiscoveryMode] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      handleQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, displayedText, loading, categoryResults]);

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
        if (!Array.isArray(json))
          throw new Error("Invalid format: Expected an array.");
        setChatResponse(`Processing ${json.length} items...`);
        const result = await uploadExtendedHistory(json, (percent) => {
          setUploadProgress(percent);
          setChatResponse(`Uploading: ${percent}% `);
        });
        if (result.success) {
          setChatResponse(
            "✅ Upload complete! Fetching album covers from Spotify...",
          );
          if (token) {
            const backfillResult = await backfillExtendedHistoryImages(
              token,
              (status) => {
                setChatResponse(`✅ Upload complete! ${status} `);
              },
            );
            setChatResponse(
              backfillResult.success
                ? `✅ All done! ${backfillResult.message} `
                : `✅ Upload complete, but image fetch had issues: ${backfillResult.message} `,
            );
          } else {
            setChatResponse(
              "✅ Upload complete! (Could not fetch images - no Spotify token)",
            );
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
    if (promptToUse.trim().toLowerCase() === "@json") {
      fileInputRef.current?.click();
      setUserPrompt("");
      return;
    }
    if (promptToUse.trim().toLowerCase() === "@backfill") {
      setUserPrompt("");
      setLoading(true);
      setChatResponse("Fetching images from Spotify for extended history...");
      if (!token) {
        setErrorMsg(
          "No Spotify token found. Please refresh the page and log in.",
        );
        setLoading(false);
        return;
      }
      const result = await backfillExtendedHistoryImages(token, (status) =>
        setChatResponse(status),
      );
      setChatResponse(
        result.success ? `✅ ${result.message} ` : result.message,
      );
      setLoading(false);
      return;
    }

    setChatMessages((prev) => [
      ...prev,
      { role: "user", text: promptToUse, timestamp: new Date() },
    ]);
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
      setMode("chat");
      const aiMessageId = Date.now();
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "",
          timestamp: new Date(),
          isThinking: false,
          tools: [],
          sources: null,
        },
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
            tools.push({
              type: chunk.toolCall.name,
              state: "input-available",
              input: chunk.toolCall.arguments,
            });
            isThinking = true;
          }
          if (chunk.type === "tool-result" && chunk.toolCall) {
            const ti = tools.findIndex(
              (t) =>
                t.type === chunk.toolCall!.name &&
                t.state === "input-available",
            );
            if (ti !== -1)
              tools[ti] = {
                ...tools[ti],
                state: "output-available",
                output: chunk.toolCall.result,
              };
            if (
              chunk.toolCall.name === "set_skill" &&
              chunk.toolCall.arguments?.skill
            ) {
              const newSkill = chunk.toolCall.arguments.skill;
              const matched = skills.find(
                (p) => p.label.toLowerCase() === newSkill.toLowerCase(),
              );
              if (matched) {
                setSelectedSkill(matched.id);
              }
            }
            if (
              chunk.toolCall.name === "create_skill" &&
              chunk.toolCall.arguments?.title
            ) {
              const newSkillId = chunk.toolCall.arguments.title
                .toLowerCase()
                .replace(/\s+/g, "-");
              const newSkillEntry = {
                id: newSkillId,
                label: chunk.toolCall.arguments.title,
                icon: Sparkles,
                description: chunk.toolCall.arguments.description,
                system_prompt: chunk.toolCall.arguments.system_prompt,
              };
              setSkills((prev) => {
                if (prev.find((s) => s.id === newSkillId)) return prev;
                return [...prev, newSkillEntry];
              });
              setSelectedSkill(newSkillId);
            }
          }
          if (chunk.type === "grounding" && chunk.groundingMetadata)
            sources = chunk.groundingMetadata;
          setChatMessages((prev) => {
            const next = [...prev];
            const last = next.length - 1;
            if (last < 0 || next[last].role !== "ai") return prev;
            next[last] = {
              ...next[last],
              text: currentText,
              tools: [...tools],
              sources,
              isThinking,
            };
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
    }
    setLoading(false);
  };

  return (
    <ChatContainerRoot
      id="ai-spotlight"
      ref={sectionRef}
      className="bg-[#0A0A0A] relative h-full font-body"
    >
      <ChatContainerContent className="flex-1 relative z-10 px-4 pt-6">
        <div className="max-w-2xl mx-auto space-y-1">
          {chatMessages.length === 0 &&
            !loading &&
            categoryResults.length === 0 &&
            !insightMode &&
            !wrappedMode && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                <h3 className="text-3xl font-semibold text-zinc-100 tracking-tight">
                  Ask Harvey
                </h3>
                <p className="text-zinc-500 text-base mt-2 max-w-sm">
                  Your music assistant. Ask anything about your listening history.
                </p>
              </div>
            )}
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex w-full mb-6 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${msg.role === "user" ? "ml-auto" : "mr-auto"}`}>
                {msg.role === "user" ? (
                  <div>
                    <div className="bg-zinc-800 text-zinc-100 rounded-2xl rounded-br-md px-4 py-3 text-[15px] leading-relaxed">
                      {msg.text}
                    </div>
                    <p className="text-[11px] mt-1.5 text-zinc-600 text-right">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ) : (
                  <div>
                    {msg.isThinking && !msg.text && (
                      <div className="py-2">
                        <Loader variant="text-shimmer">
                          Analyzing history...
                        </Loader>
                      </div>
                    )}
                    {msg.tools && msg.tools.length > 0 && (
                      <CollapsibleTools
                        tools={msg.tools}
                        onVote={(sels) =>
                          handleQuery(`User selected: ${sels.join(", ")}`)
                        }
                      />
                    )}
                    {msg.text && (
                      <div className="text-[15px] leading-relaxed text-zinc-200 prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-table:border prose-table:border-zinc-800 prose-th:border prose-th:border-zinc-800 prose-td:border prose-td:border-zinc-800 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-img:rounded-2xl prose-headings:text-zinc-100 prose-a:text-zinc-300 prose-strong:text-zinc-100 prose-code:text-zinc-300">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            img: ({ node, ...props }) => (
                              <img
                                {...props}
                                className="max-w-full md:max-w-md h-auto rounded-2xl shadow-xl border border-zinc-800 mx-auto"
                                loading="lazy"
                              />
                            ),
                            table: ({ node, ...props }) => (
                              <div className="overflow-x-auto my-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                                <table
                                  {...props}
                                  className="min-w-full divide-y divide-zinc-800"
                                />
                              </div>
                            ),
                          }}
                        >
                          {msg.text}
                        </ReactMarkdown>
                      </div>
                    )}
                    {msg.sources && msg.sources.groundingChunks && (
                      <div className="mt-4 pt-4 border-t border-zinc-800/50">
                        <p className="text-xs text-zinc-500 mb-2 font-medium">
                          Sources
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {msg.sources.groundingChunks.map(
                            (c: any, ci: number) =>
                              c.web?.uri ? (
                                <Source
                                  key={ci}
                                  href={c.web.uri}
                                  showFavicon={true}
                                >
                                  <SourceTrigger
                                    label={c.web.title || "Source"}
                                  />
                                  <SourceContent
                                    title={c.web.title}
                                    description={c.web.uri}
                                  />
                                </Source>
                              ) : null,
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-[11px] mt-1.5 text-zinc-600">
                      {msg.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {errorMsg && (
          <div className="max-w-2xl mx-auto mb-4 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs font-mono flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {errorMsg}
          </div>
        )}
      </ChatContainerContent>

      <div className="flex-shrink-0 bg-transparent px-4 py-4 relative z-10">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".json"
        />
        <div className="max-w-2xl mx-auto">
          <PromptInput
            value={userPrompt}
            onValueChange={setUserPrompt}
            onSubmit={() => handleQuery()}
            isLoading={loading}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm focus-within:border-zinc-700 transition-colors"
          >
            <PromptInputTextarea
              placeholder="Ask Harvey"
              className="text-zinc-100 placeholder:text-zinc-600 min-h-[48px] px-4 py-3.5 text-[15px]"
            />
            <PromptInputActions className="justify-end pt-0 pb-2 pr-2 flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                onClick={() => setToolsModalOpen(true)}
              >
                <Zap className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => handleQuery()}
                disabled={loading || !userPrompt.trim()}
                size="icon"
                className={`h-9 w-9 rounded-xl transition-all ${loading || !userPrompt.trim() ? "bg-zinc-800 text-zinc-600" : "bg-zinc-100 text-zinc-900 hover:bg-white"}`}
              >
                {loading ? (
                  <RefreshCcw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </Button>
            </PromptInputActions>
          </PromptInput>
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
