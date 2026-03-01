import { Mistral } from "@mistralai/mistralai";
import {
    getObsessionArtist,
    getPeakListeningHour,
    getRisingStar,
    getLateNightAnthem,
    getMostSkippedSong,
    getWrappedStats,
    fetchDashboardStats,
} from './dbService';

// Initialize Mistral lazily
const getAiClient = () => {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_MISTRAL_API_KEY || import.meta.env.VITE_GROQ_API_KEY || '';
    if (!apiKey) return null;

    return new Mistral({ apiKey });
};

// ─── MCP CONFIGURATION ───────────────────────────────────────────
const MCP_SERVERS = [
    { name: 'shoogle', url: 'https://mcp.shoogle.dev/mcp', icon: 'Search', label: 'Shoogle' }
];

async function fetchMcpTools() {
    const allTools: any[] = [];
    for (const server of MCP_SERVERS) {
        try {
            const response = await fetch(server.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 'list', method: 'tools/list' })
            });
            const data = await response.json();
            if (data.result?.tools) {
                data.result.tools.forEach((tool: any) => {
                    allTools.push({
                        serverName: server.name,
                        type: "function",
                        function: {
                            name: `mcp_${server.name}_${tool.name}`,
                            description: `[MCP: ${server.label}] ${tool.description}`,
                            parameters: tool.inputSchema
                        },
                        originalName: tool.name
                    });
                });
            }
        } catch (e) {
            console.error(`Failed to fetch tools from MCP server ${server.name}:`, e);
        }
    }
    return allTools;
}

async function executeMcpTool(funcName: string, args: any) {
    const match = funcName.match(/^mcp_([^_]+)_(.+)$/);
    if (!match) return { error: "Invalid MCP tool name" };
    const [, serverName, originalName] = match;
    const server = MCP_SERVERS.find(s => s.name === serverName);
    if (!server) return { error: `MCP server ${serverName} not found` };

    try {
        const response = await fetch(server.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: { name: originalName, arguments: args }
            })
        });
        const data = await response.json();
        return data.result || data.error || { error: "Failed to execute MCP tool" };
    } catch (e: any) {
        return { error: `MCP execution failed: ${e.message}` };
    }
}

// ─── Types ──────────────────────────────────────────────────────────────

export interface CanvasComponent {
    id: string;
    code: string; // Changed from html
    title: string;
    description: string;
    retryCount: number;
    error?: string;
}

export interface CanvasToolContext {
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
        extraStats?: { longestGapHours: string; longestSessionHours: string };
    };
}

// ─── Tool Definitions ───────────────────────────────────────────────────

const CANVAS_TOOLS: any[] = [
    {
        type: "function",
        function: {
            name: "get_top_artists",
            description: "Get the user's top artists with names, play counts, and image URLs.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number" },
                    sort_by: { type: "string", enum: ["plays", "minutes"] }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_top_songs",
            description: "Get the user's top songs with title, artist, album, and play counts.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number" },
                    sort_by: { type: "string", enum: ["plays", "minutes", "recency"] },
                    artist_filter: { type: "string" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_top_albums",
            description: "Get the user's top albums with title, artist, cover art, and play counts.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_listening_stats",
            description: "Get overall listening statistics (minutes, tracks, trends, sessions).",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "render_canvas_component",
            description: "Render a complete React TSX component. Use this for the FINAL output. The code must be a valid React functional component using available Shadcn UI components.",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    code: {
                        type: "string",
                        description: "Self-contained TSX code. Import components directly as if they were in scope (e.g. <Button>). Do not include import statements. Define one main component (e.g. function App() { ... }) and return it."
                    }
                },
                required: ["title", "description", "code"]
            }
        }
    }
];

// ─── System Prompt ──────────────────────────────────────────────────────

const CANVAS_SYSTEM_PROMPT = `You are Harvey Canvas, a world-class UI engineer.
Your job is to build interactive, beautiful React components using TypeScript and Shadcn UI.

## AVAILABLE COMPONENTS (In Scope):
- **Shadcn UI**: Button, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, Avatar, AvatarImage, AvatarFallback, Input, Popover, PopoverTrigger, PopoverContent, Calendar (Shadcn version), Empty.
- **Charts (Shadcn/Recharts)**: ChartContainer, ChartTooltip, ChartTooltipContent, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer.
- **Visuals**: motion, AnimatePresence (from framer-motion).
- **Icons**: Any icon from lucide-react (e.g., <Music />, <Mic2 />, <TrendingUp />).
- **Utilities**: cn (for tailwind merging).

## GUIDELINES:
1.  **TypeScript ONLY**: Write clean TSX code.
2.  **No Imports**: All components listed above are ALREADY in the global scope. Do NOT add import statements.
3.  **App Component**: Define a function named 'App' and ensure it's returned or exported.
4.  **Premium Vibe**: Use the app's dark theme (#0a0a0a bg, #1C1C1E cards, #FA2D48 accent).
5.  **Interactive**: Add hover effects, animations with framer-motion, and micro-interactions.
6.  **Real Data**: Call the data tools (get_top_artists, etc.) FIRST to get the user's actual history. NEVER use placeholder names or counts.
7.  **External Content**: Use MCP tools (e.g., Shoogle search) to fetch external content or inspiration if requested.

## EXAMPLE STRUCTURE:
\`\`\`tsx
function App() {
  const [activeTab, setActiveTab] = useState('artists');
  // ... your component logic
  return (
    <div className="space-y-6">
      <Card className="bg-[#1C1C1E] border-white/10">
        <CardHeader>
           <CardTitle className="text-[#FA2D48]">My Stats</CardTitle>
        </CardHeader>
        <CardContent>
           <Button variant="outline" className="gap-2">
             <Music size={14} /> Refresh
           </Button>
        </CardContent>
      </Card>
    </div>
  );
}
\`\`\``;

// ─── Tool Handlers ──────────────────────────────────────────────────────

function handleGetTopArtists(args: any, context: CanvasToolContext): any {
    const limit = Math.min(args.limit || 10, 50);
    const artists = context.artists.slice(0, limit).map((artistStr, i) => {
        const match = artistStr.match(/^(.+?)\s*\((\d+)m?\)$/);
        return {
            rank: i + 1,
            name: match ? match[1].trim() : artistStr.trim(),
            minutes: match ? parseInt(match[2]) : 0,
        };
    });
    return { artists, total: context.artists.length };
}

function handleGetTopSongs(args: any, context: CanvasToolContext): any {
    const limit = Math.min(args.limit || 10, 50);
    let songs = context.songs.slice(0, limit).map((songStr, i) => {
        const match = songStr.match(/^(.+?)\s*-\s*(.+?)\s*\((\d+)m?\)$/);
        return {
            rank: i + 1,
            title: match ? match[1].trim() : songStr.trim(),
            artist: match ? match[2].trim() : 'Unknown',
            minutes: match ? parseInt(match[3]) : 0,
        };
    });
    if (args.artist_filter) {
        const filter = args.artist_filter.toLowerCase();
        songs = songs.filter(s => s.artist.toLowerCase().includes(filter));
    }
    return { songs, total: context.songs.length };
}

function handleGetListeningStats(context: CanvasToolContext): any {
    return {
        userName: context.userName || 'Music Lover',
        weeklyTime: context.globalStats?.weeklyTime || 'Unknown',
        totalTracks: context.globalStats?.totalTracks || 0,
        totalMinutes: context.globalStats?.totalMinutes || 0,
    };
}

// ─── Main Canvas Generation Function ────────────────────────────────────

const MAX_RETRIES = 3;
const MAX_TOOL_ITERATIONS = 6;

export const generateCanvasComponent = async (
    userPrompt: string,
    context: CanvasToolContext,
    messageHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    onRetry?: (attempt: number, error: string) => void
): Promise<CanvasComponent | null> => {
    const client = getAiClient();
    if (!client) return null;

    let lastError = '';

    for (let retry = 0; retry < MAX_RETRIES; retry++) {
        try {
            if (retry > 0 && onRetry) {
                onRetry(retry, lastError);
            }

            const messages: any[] = [
                { role: "system", content: CANVAS_SYSTEM_PROMPT },
            ];

            for (const msg of messageHistory.slice(-5)) {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            }

            const retryNote = retry > 0 ? `\n\n[RETRY ${retry}] Previous failed: "${lastError}". Fix and try again.` : '';
            messages.push({ role: "user", content: userPrompt + retryNote });

            let canvasResult: CanvasComponent | null = null;
            let iterations = 0;

            const mcpTools = await fetchMcpTools();
            const tools = [...CANVAS_TOOLS, ...mcpTools.map(t => ({ type: t.type, function: t.function }))];

            while (iterations < MAX_TOOL_ITERATIONS) {
                iterations++;

                const response = await client.chat.complete({
                    model: "mistral-large-latest",
                    messages,
                    // @ts-ignore
                    tools: tools,
                    toolChoice: "auto",
                });

                const assistantMessage = response.choices?.[0]?.message;
                if (!assistantMessage) break;

                messages.push(assistantMessage);

                if (assistantMessage.toolCalls && assistantMessage.toolCalls.length > 0) {
                    for (const toolCall of assistantMessage.toolCalls) {
                        const funcName = toolCall.function?.name;
                        const funcArgs = typeof toolCall.function?.arguments === 'string'
                            ? JSON.parse(toolCall.function.arguments)
                            : toolCall.function?.arguments || {};
                        let toolResult: any = {};

                        if (funcName?.startsWith('mcp_')) {
                            toolResult = await executeMcpTool(funcName, funcArgs);
                        } else {
                            switch (funcName) {
                                case "get_top_artists": toolResult = handleGetTopArtists(funcArgs, context); break;
                                case "get_top_songs": toolResult = handleGetTopSongs(funcArgs, context); break;
                                case "get_listening_stats": toolResult = handleGetListeningStats(context); break;
                                case "render_canvas_component":
                                    canvasResult = {
                                        id: `canvas-${Date.now()}`,
                                        code: funcArgs.code || '',
                                        title: funcArgs.title || 'Component',
                                        description: funcArgs.description || '',
                                        retryCount: retry,
                                    };
                                    toolResult = { success: true };
                                    break;
                                default: toolResult = { error: `Unknown tool` };
                            }
                        }

                        messages.push({
                            role: "tool",
                            toolCallId: toolCall.id,
                            name: funcName,
                            content: JSON.stringify(toolResult)
                        });
                    }
                    if (canvasResult) return canvasResult;
                } else {
                    break;
                }
            }
            lastError = 'No render_canvas_component call made.';
        } catch (err: any) {
            lastError = err.message || 'Error';
        }
    }

    return {
        id: `error-${Date.now()}`,
        code: '',
        title: 'Generation Failed',
        description: lastError,
        retryCount: MAX_RETRIES,
        error: lastError,
    };
};
