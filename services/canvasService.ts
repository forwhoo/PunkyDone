import OpenAI from "openai";

// Initialize Groq (via OpenAI SDK) lazily - same pattern as geminiService
const getAiClient = () => {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_GROQ_API_KEY || '';
    if (!apiKey) return null;

    return new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.groq.com/openai/v1",
        dangerouslyAllowBrowser: true
    });
};

// ─── Types ──────────────────────────────────────────────────────────────

export interface CanvasComponent {
    id: string;
    html: string;
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

const CANVAS_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "get_top_artists",
            description: "Get the user's top artists with names, play counts, and image URLs. Use this to build artist-related components like tables, charts, or cards.",
            parameters: {
                type: "object",
                properties: {
                    limit: {
                        type: "number",
                        description: "Number of top artists to return (default 10, max 50)"
                    },
                    sort_by: {
                        type: "string",
                        enum: ["plays", "minutes"],
                        description: "Sort artists by play count or total minutes listened"
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_top_songs",
            description: "Get the user's top songs with title, artist, album, play count, and cover art URL. Use this for song-related visualizations.",
            parameters: {
                type: "object",
                properties: {
                    limit: {
                        type: "number",
                        description: "Number of top songs to return (default 10, max 50)"
                    },
                    sort_by: {
                        type: "string",
                        enum: ["plays", "minutes", "recency"],
                        description: "Sort songs by play count, minutes, or most recent"
                    },
                    artist_filter: {
                        type: "string",
                        description: "Filter songs by a specific artist name"
                    }
                },
                required: []
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
                    limit: {
                        type: "number",
                        description: "Number of top albums to return (default 10, max 50)"
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_listening_stats",
            description: "Get overall listening statistics: total minutes, total tracks, weekly time, weekly trend, longest session, longest gap. Use this for stat dashboards or summary cards.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_charts",
            description: "Get the user's current chart rankings - songs ranked by recent popularity with rank changes and trends.",
            parameters: {
                type: "object",
                properties: {
                    limit: {
                        type: "number",
                        description: "Number of chart entries to return (default 10, max 20)"
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_genre_breakdown",
            description: "Get an estimated genre breakdown based on the user's top artists. Returns genre names with percentages for pie charts.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "render_canvas_component",
            description: "Render a complete HTML/CSS/JS component for the user. This is the FINAL output tool. The HTML must be a self-contained component with inline CSS and JS. Use modern design with dark theme matching the app (bg: #0a0a0a, text: white, accent: #FA2D48).",
            parameters: {
                type: "object",
                properties: {
                    title: {
                        type: "string",
                        description: "Short title for the component (e.g. 'Top Artists Table', 'Genre Breakdown')"
                    },
                    description: {
                        type: "string",
                        description: "One-line description of what this component shows"
                    },
                    html: {
                        type: "string",
                        description: "Complete self-contained HTML document with inline <style> and <script> tags. Must include <!DOCTYPE html>. Use dark theme (bg: #0a0a0a, cards: #1C1C1E, borders: rgba(255,255,255,0.1), text: white, accent: #FA2D48). Make it visually stunning with animations, gradients, and modern design."
                    }
                },
                required: ["title", "description", "html"]
            }
        }
    }
];

// ─── System Prompt ──────────────────────────────────────────────────────

const CANVAS_SYSTEM_PROMPT = `You are Punky Canvas, an advanced AI component builder for a music analytics dashboard.
Your job is to create beautiful, interactive HTML/CSS/JS components based on the user's request.

## YOUR CAPABILITIES:
You have tools to fetch the user's real music data (artists, songs, albums, stats, charts, genres).
You MUST call data tools first, then use the fetched data to build your component.
Always call render_canvas_component as your FINAL tool call with the complete HTML.

## WORKFLOW:
1. Analyze the user's request
2. Call the appropriate data tools to get the information you need
3. Use the real data to build a stunning HTML/CSS/JS component
4. Call render_canvas_component with the final HTML

## DESIGN SYSTEM:
- Background: #0a0a0a (main), #1C1C1E (cards), #2C2C2E (elevated)
- Text: #FFFFFF (primary), #8E8E93 (secondary), #666666 (muted)
- Accent: #FA2D48 (primary red), #FF6B35 (orange), #FF9F0A (amber)
- Success: #30D158, Info: #0A84FF, Purple: #BF5AF2
- Border: rgba(255, 255, 255, 0.1)
- Border Radius: 12px (cards), 8px (buttons), 16px (large cards)
- Font: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif
- Shadows: Use subtle box-shadows with colored glows for accents

## HTML RULES:
- Output must be a complete HTML document starting with <!DOCTYPE html>
- All CSS must be in a <style> tag in <head>
- All JS must be in a <script> tag before </body>
- Use CSS Grid or Flexbox for layouts
- Add smooth animations (CSS transitions, keyframes)
- Make components responsive
- Use real data from tool calls - NEVER use placeholder/dummy data
- Include hover effects and micro-interactions
- For images, use the actual URLs from the data. Add onerror fallbacks
- For charts/graphs, use pure CSS/JS or SVG (no external libraries)
- Keep it self-contained - no external dependencies

## COMPONENT IDEAS (be creative, anything is possible):
- Tables with sorting, filtering, search
- Pie charts, bar charts, line graphs, radar charts
- Artist cards with images and stats
- Music quizzes and trivia games
- Listening dashboards with multiple stat cards
- Timeline visualizations
- Comparison tools
- Leaderboards and rankings
- Interactive music maps
- Stat counters with animations

## IMPORTANT:
- ALWAYS fetch data first, then render
- Use the user's REAL data, not made-up examples
- Make it visually impressive - this is a premium music app
- Components should feel like native parts of the app`;

// ─── Tool Handlers ──────────────────────────────────────────────────────

function handleGetTopArtists(args: any, context: CanvasToolContext): any {
    const limit = Math.min(args.limit || 10, 50);
    const artists = context.artists.slice(0, limit).map((artistStr, i) => {
        // Artists come as "Name (Xm)" or just "Name"
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
        // Songs come as "Title - Artist (Xm)" or similar
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

function handleGetTopAlbums(args: any, context: CanvasToolContext): any {
    const limit = Math.min(args.limit || 10, 50);
    const albums = context.albums.slice(0, limit).map((albumStr, i) => {
        const match = albumStr.match(/^(.+?)\s*-\s*(.+?)\s*\((\d+)m?\)$/);
        return {
            rank: i + 1,
            title: match ? match[1].trim() : albumStr.trim(),
            artist: match ? match[2].trim() : 'Unknown',
            minutes: match ? parseInt(match[3]) : 0,
        };
    });
    return { albums, total: context.albums.length };
}

function handleGetListeningStats(context: CanvasToolContext): any {
    return {
        userName: context.userName || 'Music Lover',
        weeklyTime: context.globalStats?.weeklyTime || 'Unknown',
        weeklyTrend: context.globalStats?.weeklyTrend || 'Unknown',
        totalTracks: context.globalStats?.totalTracks || 0,
        totalMinutes: context.globalStats?.totalMinutes || 0,
        longestSession: context.globalStats?.extraStats?.longestSessionHours || 'Unknown',
        longestGap: context.globalStats?.extraStats?.longestGapHours || 'Unknown',
        totalHours: Math.round((context.globalStats?.totalMinutes || 0) / 60),
    };
}

function handleGetCharts(args: any, context: CanvasToolContext): any {
    const limit = Math.min(args.limit || 10, 20);
    const charts = (context.globalStats?.charts || []).slice(0, limit).map((c: any, i: number) => ({
        rank: c.rank || i + 1,
        title: c.title,
        artist: c.artist,
        cover: c.cover || '',
        lastWeekRank: c.last_week_rank || null,
        trend: c.trend || 'NEW',
        listens: c.listens || 0,
    }));
    return { charts, total: context.globalStats?.charts?.length || 0 };
}

function handleGetGenreBreakdown(context: CanvasToolContext): any {
    // Estimate genres from artist names (the AI will interpret these)
    const topArtists = context.artists.slice(0, 20);
    return {
        note: "Genre breakdown estimated from top artists. Use these artist names to infer genres for the visualization.",
        topArtists: topArtists,
        totalArtists: context.artists.length,
    };
}

// ─── Main Canvas Generation Function ────────────────────────────────────

const MAX_RETRIES = 5;
const MAX_TOOL_ITERATIONS = 8;

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

            const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
                { role: "system", content: CANVAS_SYSTEM_PROMPT },
            ];

            // Add conversation history for memory
            for (const msg of messageHistory.slice(-10)) {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                });
            }

            // Add current request with retry context
            const retryNote = retry > 0
                ? `\n\n[RETRY ${retry}/${MAX_RETRIES}] Previous attempt failed with error: "${lastError}". Fix the issue and try again. Make sure the HTML is valid and self-contained.`
                : '';
            messages.push({ role: "user", content: userPrompt + retryNote });

            let canvasResult: CanvasComponent | null = null;
            let iterations = 0;

            // Tool execution loop
            while (iterations < MAX_TOOL_ITERATIONS) {
                iterations++;

                const response = await client.chat.completions.create({
                    model: "moonshotai/kimi-k2-instruct-0905",
                    messages,
                    tools: CANVAS_TOOLS,
                    tool_choice: "auto",
                    temperature: 0.7,
                    max_tokens: 8000
                });

                const assistantMessage = response.choices[0]?.message;
                if (!assistantMessage) break;

                messages.push(assistantMessage as any);

                if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                    for (const toolCall of assistantMessage.tool_calls) {
                        // @ts-ignore - Groq SDK types
                        const funcName = toolCall.function?.name || (toolCall as any).name;
                        // @ts-ignore
                        const funcArgs = JSON.parse(toolCall.function?.arguments || (toolCall as any).arguments || "{}");
                        let toolResult: any = {};

                        switch (funcName) {
                            case "get_top_artists":
                                toolResult = handleGetTopArtists(funcArgs, context);
                                break;
                            case "get_top_songs":
                                toolResult = handleGetTopSongs(funcArgs, context);
                                break;
                            case "get_top_albums":
                                toolResult = handleGetTopAlbums(funcArgs, context);
                                break;
                            case "get_listening_stats":
                                toolResult = handleGetListeningStats(context);
                                break;
                            case "get_charts":
                                toolResult = handleGetCharts(funcArgs, context);
                                break;
                            case "get_genre_breakdown":
                                toolResult = handleGetGenreBreakdown(context);
                                break;
                            case "render_canvas_component":
                                canvasResult = {
                                    id: `canvas-${Date.now()}`,
                                    html: funcArgs.html || '',
                                    title: funcArgs.title || 'Canvas Component',
                                    description: funcArgs.description || '',
                                    retryCount: retry,
                                };
                                toolResult = { success: true, rendered: true };
                                break;
                            default:
                                toolResult = { error: `Unknown tool: ${funcName}` };
                        }

                        messages.push({
                            role: "tool",
                            tool_call_id: toolCall.id,
                            content: JSON.stringify(toolResult)
                        } as any);
                    }

                    // If we got a canvas result, we're done
                    if (canvasResult) {
                        return canvasResult;
                    }
                } else {
                    // No tool calls - AI might have responded with text. Check if it contains HTML
                    const content = assistantMessage.content || '';
                    if (content.includes('<!DOCTYPE html>') || content.includes('<html')) {
                        return {
                            id: `canvas-${Date.now()}`,
                            html: content,
                            title: 'Canvas Component',
                            description: '',
                            retryCount: retry,
                        };
                    }
                    break;
                }
            }

            // If we got here without a result, set error for retry
            lastError = 'AI did not produce a component. No render_canvas_component call was made.';

        } catch (err: any) {
            lastError = err.message || 'Unknown error during generation';
            console.error(`[canvasService] Attempt ${retry + 1} failed:`, lastError);
        }
    }

    // All retries exhausted
    return {
        id: `canvas-error-${Date.now()}`,
        html: '',
        title: 'Generation Failed',
        description: `Failed after ${MAX_RETRIES} attempts. Last error: ${lastError}`,
        retryCount: MAX_RETRIES,
        error: lastError,
    };
};
