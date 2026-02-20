import OpenAI from "openai";
import {
    fetchDashboardStats,
    fetchSmartPlaylist,
    fetchListeningStats,
    getWrappedStats,
    getPeakListeningHour,
    getRadarArtists,
    getMostSkippedSong,
    getLateNightAnthem,
    getRisingStar,
    getObsessionArtist,
    fetchCharts,
    fetchHeatmapData,
    fetchArtistNetwork,
    compareArtistPerformance,
    getRankShift,
    getLoyaltyScore,
    getMarketShare,
    getDiscoveryDate,
    getBingeSessions,
    getOneHitWonders,
    getAlbumCompletionist,
    getEarwormReport,
    getWorkVsPlayStats,
    getSeasonalVibe,
    getAnniversaryFlashback,
    getCommuteSoundtrack,
    getSleepPattern,
    getDiversityIndex,
    getGenreEvolution,
    getSkipRateByArtist,
    getGatewayTracks,
    getTopCollaborations,
    getMilestoneTracker,
    getObsessionScore,
} from './dbService';
import { fetchArtistImages, searchSpotifyTracks } from './spotifyService';

// Initialize Groq (via OpenAI SDK) lazily
const getAiClient = () => {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_GROQ_API_KEY || '';
    if (!apiKey) return null;

    return new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.groq.com/openai/v1",
        dangerouslyAllowBrowser: true // Required for client-side usage
    });
};

// ─── AI MODEL DEFINITIONS ────────────────────────────────────────
export interface AIModel {
    id: string;
    label: string;
    isReasoning: boolean;
}

export const AI_MODELS: AIModel[] = [
    { id: "moonshotai/kimi-k2-instruct-0905", label: "Kimi K2", isReasoning: false },
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", isReasoning: false },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B", isReasoning: false },
    { id: "groq/compound", label: "Groq Compound", isReasoning: false },
    { id: "groq/compound-mini", label: "Groq Compound Mini", isReasoning: false },
    { id: "openai/gpt-oss-20b", label: "GPT-OSS 20B", isReasoning: true },
    { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", isReasoning: true },
    { id: "qwen/qwen3-32b", label: "Qwen3 32B", isReasoning: true },
];

export const DEFAULT_MODEL_ID = "llama-3.1-8b-instant";

const trimToolPayload = (payload: any): any => {
    if (!payload || typeof payload !== 'object') return payload;

    const clone: any = { ...payload };
    const trimArray = (arr: any[], max = 6) => arr.slice(0, max);

    ['songs', 'artists', 'albums', 'plays', 'tracks', 'results', 'items', 'connections', 'edges', 'nodes'].forEach((key) => {
        if (Array.isArray(clone[key])) clone[key] = trimArray(clone[key]);
    });

    Object.keys(clone).forEach((key) => {
        const val = clone[key];
        if (typeof val === 'string' && val.length > 280) {
            clone[key] = `${val.slice(0, 277)}...`;
        }
    });

    return clone;
};

// ─── TOOL CALL TYPES ──────────────────────────────────────────────
export interface ToolCallInfo {
    id: string;
    name: string;
    arguments: Record<string, any>;
    result?: any;
    icon: string;
    label: string;
}

// ─── AGENT TOOL DEFINITIONS ──────────────────────────────────────
const AGENT_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: "function",
        function: {
            name: "get_top_songs",
            description: "Get the user's top songs/tracks. Use when user asks about their most played songs, top tracks, favorite songs, what they listen to most, etc.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"], description: "Time period to query" },
                    limit: { type: "number", description: "Max results to return (default 10, max 50)" },
                    artist_filter: { type: "string", description: "Optional: filter songs by a specific artist name" }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_top_artists",
            description: "Get the user's top artists. Use when user asks about their most listened artists, favorite artists, who they listen to most, artist rankings, etc.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"], description: "Time period to query" },
                    limit: { type: "number", description: "Max results to return (default 10, max 50)" }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_top_albums",
            description: "Get the user's top albums. Use when user asks about their most played albums, favorite albums, album rankings, etc.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"], description: "Time period to query" },
                    limit: { type: "number", description: "Max results to return (default 10, max 50)" }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_listening_time",
            description: "Get the user's total listening time and stats. Use when user asks about how long they listened, total time, weekly time, minutes listened, hours listened, listening stats, etc.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"], description: "Time period to query" }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_obsession_orbit",
            description: "Get the user's Obsession Orbit - their most obsessed-over artists where one song dominates their plays. Use when user asks about obsession, obsession orbit, obsession score, most obsessed artist, or how obsessed they are with someone.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Time period" },
                    artist_name: { type: "string", description: "Optional: specific artist to check obsession for" }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_artist_streak",
            description: "Get streak information for an artist - how consistently the user has been listening. Use when user asks about streaks, consistency, how long they've been listening to an artist, etc.",
            parameters: {
                type: "object",
                properties: {
                    artist_name: { type: "string", description: "The artist name to check streak for" },
                    period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"], description: "Time period" }
                },
                required: ["artist_name", "period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_listening_percentage",
            description: "Calculate what percentage of listening time a specific artist, song, or album takes up. Use when user asks about percentage, share, proportion of listening, how much of their time goes to something.",
            parameters: {
                type: "object",
                properties: {
                    entity_type: { type: "string", enum: ["artist", "song", "album"], description: "What to calculate percentage for" },
                    entity_name: { type: "string", description: "Name of the artist/song/album" },
                    period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"], description: "Time period" }
                },
                required: ["entity_type", "entity_name", "period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_upcoming_artists",
            description: "Get radar/upcoming/new artists the user recently discovered. Use when user asks about new artists, recently discovered, radar artists, new finds, upcoming artists in their library.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Time period" }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_peak_listening_hour",
            description: "Get the hour of day when the user listens to music the most. Use when user asks about peak hour, when they listen most, what time they listen, listening schedule, etc.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Time period" }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_rising_star",
            description: "Get the artist with the biggest increase in plays compared to previous period. Use when user asks about rising stars, trending artists, who's climbing, breakout artists.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Time period" }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_late_night_anthem",
            description: "Get the song the user plays most during late night hours (1AM-5AM). Use when user asks about late night listening, what they play at night, night owl tracks, etc.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Time period" }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_most_skipped",
            description: "Get the song the user skips the most (lowest average listen duration). Use when user asks about skipped songs, songs they skip, least finished tracks.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Time period" }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_charts",
            description: "Get the current music charts showing trending songs with rank changes. Use when user asks about charts, what's trending, charting songs, rank movements, hot tracks.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["daily", "weekly", "monthly", "all time"], description: "Chart period" }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_wrapped_overview",
            description: "Get a wrapped-style summary for daily/weekly/monthly listening with top artist/song/album and total minutes. Use when user asks for wrapped, recap, summary, overview, or highlights.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Time period" }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "search_spotify_tracks",
            description: "Search Spotify tracks by keyword when user asks to find tracks, discover songs by name, or look up songs outside their listening history.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Search query for tracks" },
                    limit: { type: "number", description: "Max results (default 5, max 20)" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "filter_songs",
            description: "Filter songs by various criteria like time of day, day of week, duration, recency, specific artist/album. Use for complex queries like 'songs I listen to in the morning', 'short songs I played this week', 'what did I listen to last weekend', etc.",
            parameters: {
                type: "object",
                properties: {
                    type: { type: "string", enum: ["song", "artist", "album"], description: "Type of items to return" },
                    field: { type: "string", enum: ["artist_name", "album_name", "track_name"], description: "Field to match on" },
                    value: { type: "string", description: "Exact value to match" },
                    contains: { type: "string", description: "Partial text match (broader)" },
                    time_of_day: { type: "string", enum: ["morning", "afternoon", "evening", "night", "latenight"], description: "Filter by time of day played" },
                    day_of_week: { type: "string", enum: ["weekday", "weekend"], description: "Filter by weekday/weekend" },
                    recent_days: { type: "number", description: "Only last N days (7=week, 30=month, 90=3months, 180=6months)" },
                    sort_by: { type: "string", enum: ["plays", "minutes", "recency", "duration"], description: "Sort results by" },
                    sort_order: { type: "string", enum: ["highest", "lowest"], description: "Sort direction" },
                    limit: { type: "number", description: "Max results (default 20)" }
                },
                required: ["type"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "fetch_image",
            description: "Fetch the image/artwork URL for an artist or album. Use when you want to show an image in your response or when building visual content.",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string", description: "Artist or album name to fetch image for" },
                    type: { type: "string", enum: ["artist", "album"], description: "Type of image to fetch" }
                },
                required: ["name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_heatmap_data",
            description: "Get the user's listening activity heatmap data showing when they listen most (by hour and day). Use when user asks about their listening schedule, activity heatmap, when they're most active, listening patterns by time/day, activity calendar, or daily routine.",
            parameters: {
                type: "object",
                properties: {
                    days: { type: "number", description: "Number of recent days to analyze (default 30, max 90)" }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_artist_network",
            description: "Get artist connection/network data showing which artists the user listens to together (within 10 minutes of each other). Use when user asks about artist connections, who they pair together, related artists in their library, artist combinations, listening flow, or session patterns.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number", description: "Max listening entries to analyze (default 500)" }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_genre_breakdown",
            description: "Get an estimated genre breakdown of the user's listening. Use when user asks about genres, what type of music they listen to, genre distribution, music taste profile, genre percentages, or style breakdown.",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"], description: "Time period to analyze" }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_recent_plays",
            description: "Get the user's most recently played tracks in chronological order. Use when user asks about recent plays, what they just listened to, last played, listening history, or what's been playing.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number", description: "Number of recent plays to return (default 20, max 50)" }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "compare_periods",
            description: "Compare listening stats between two time periods (e.g. this week vs last month). Use when user asks to compare periods, changes over time, how their taste evolved, differences between time frames, progress, or trends.",
            parameters: {
                type: "object",
                properties: {
                    period_a: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"], description: "First period to compare" },
                    period_b: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"], description: "Second period to compare" }
                },
                required: ["period_a", "period_b"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_album_covers",
            description: "Fetch album cover artwork URLs for multiple artists or albums at once. Use when building visual responses, showing cover art grids, or when the user asks to see album art, cover art, artwork, or visuals for their music.",
            parameters: {
                type: "object",
                properties: {
                    names: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of artist or album names to fetch covers for"
                    }
                },
                required: ["names"]
            }
        }
    },
    // ─── COMPARATIVE & GROWTH TOOLS ─────────────────────────────────────
    {
        type: "function",
        function: {
            name: "compare_artist_performance",
            description: "Compare an artist's stats across two periods (e.g., this week vs last week) to see growth. Use when user asks about artist growth, performance changes, listening trends for an artist, or how their listening to an artist has changed.",
            parameters: {
                type: "object",
                properties: {
                    artist_name: { type: "string", description: "The artist name to compare" },
                    period_a: { type: "string", description: "The baseline period (e.g., 'Last Week', 'Last Month')" },
                    period_b: { type: "string", description: "The comparison period (e.g., 'This Week', 'This Month')" }
                },
                required: ["artist_name", "period_a", "period_b"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_rank_shift",
            description: "Shows how many spots an artist/song climbed or fell in the user's charts. Use when user asks about rank changes, chart movements, what's rising or falling, position changes, or trending direction.",
            parameters: {
                type: "object",
                properties: {
                    entity_name: { type: "string", description: "The artist or song name" },
                    entity_type: { type: "string", enum: ["artist", "song"], description: "Whether to check artist or song rankings" },
                    time_range: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Time range for comparison (default: weekly)" }
                },
                required: ["entity_name", "entity_type"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_loyalty_score",
            description: "Returns the ratio of this artist's plays vs. all other artists. Use when user asks about loyalty, how much they love an artist, dedication level, or their commitment to an artist.",
            parameters: {
                type: "object",
                properties: {
                    artist_name: { type: "string", description: "The artist name to check loyalty for" }
                },
                required: ["artist_name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_market_share",
            description: "Returns a breakdown of what percentage of the 'total pie' an entity owns. Use when user asks about distribution, what takes up most of their listening, percentage breakdown, or share of their music time.",
            parameters: {
                type: "object",
                properties: {
                    entity_type: { type: "string", enum: ["artist", "genre"], description: "Whether to show artist or genre distribution" }
                },
                required: ["entity_type"]
            }
        }
    },
    // ─── BEHAVIORAL & DISCOVERY TOOLS ─────────────────────────────────────
    {
        type: "function",
        function: {
            name: "get_discovery_date",
            description: "Finds the exact timestamp and track of the user's very first interaction with an artist. Use when user asks when they discovered an artist, first time listening, when they started with an artist, or discovery date.",
            parameters: {
                type: "object",
                properties: {
                    artist_name: { type: "string", description: "The artist name to find discovery date for" }
                },
                required: ["artist_name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_binge_sessions",
            description: "Identifies 'binge' events where the user listened to one artist for a long continuous block. Use when user asks about binge sessions, marathon listening, long sessions, or extended plays of an artist.",
            parameters: {
                type: "object",
                properties: {
                    threshold_minutes: { type: "number", description: "Minimum duration in minutes to count as binge (default: 60)" }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_one_hit_wonders",
            description: "Finds artists where the user loves exactly ONE song but never listens to the rest of the discography. Use when user asks about one-hit wonders, artists with one favorite song, or single-song favorites.",
            parameters: {
                type: "object",
                properties: {
                    min_plays: { type: "number", description: "Minimum total plays to consider (default: 5)" }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_album_completionist",
            description: "Checks if the user listens to full albums or just cherry-picks singles. Use when user asks about album completion, if they listen to full albums, album listening habits, or completion rates.",
            parameters: {
                type: "object",
                properties: {
                    album_name: { type: "string", description: "The album name to check completion for" }
                },
                required: ["album_name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_earworm_report",
            description: "Finds the song the user has 'looped' the most in a short window. Use when user asks about earworms, songs on repeat, most repeated, stuck in their head, or loop behavior.",
            parameters: {
                type: "object",
                properties: {
                    days_back: { type: "number", description: "Number of days to look back (default: 7)" }
                },
                required: []
            }
        }
    },
    // ─── TIME & CONTEXTUAL TOOLS ─────────────────────────────────────
    {
        type: "function",
        function: {
            name: "get_work_vs_play_stats",
            description: "Compares top genres/artists during weekdays (Mon-Fri) vs. weekends. Use when user asks about work music, weekend listening, weekday vs weekend, or context-based listening.",
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
            name: "get_seasonal_vibe",
            description: "Analyzes if the user's music taste changes based on the season. Use when user asks about seasonal listening, summer music, winter vibes, or seasonal changes.",
            parameters: {
                type: "object",
                properties: {
                    season: { type: "string", enum: ["Summer", "Winter", "Spring", "Fall"], description: "The season to analyze" }
                },
                required: ["season"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_anniversary_flashback",
            description: "Returns what the user was listening to exactly one year ago today. Use when user asks about this day last year, anniversary, flashback, or year-ago listening.",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string", description: "Optional specific date (YYYY-MM-DD format). Defaults to today." }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_commute_soundtrack",
            description: "Analyzes specific activity during common commute hours (7-9am, 5-7pm). Use when user asks about commute music, drive time, morning/evening listening, or travel soundtrack.",
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
            name: "get_sleep_pattern",
            description: "Detects when the user stops listening at night and what 'sleep' music they use. Use when user asks about sleep music, night listening, bedtime patterns, or late-night habits.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    // ─── DIVERSITY & TECHNICAL TOOLS ─────────────────────────────────────
    {
        type: "function",
        function: {
            name: "get_diversity_index",
            description: "Measures how 'adventurous' the user is (many unique artists vs. few repeats). Use when user asks about diversity, variety, how adventurous their taste is, or listening breadth.",
            parameters: {
                type: "object",
                properties: {
                    time_range: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Time range to analyze (default: monthly)" }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_genre_evolution",
            description: "Shows how the user's favorite genre has changed month-over-month. Use when user asks about genre changes, taste evolution, how their music evolved, or genre timeline.",
            parameters: {
                type: "object",
                properties: {
                    months: { type: "number", description: "Number of months to analyze (default: 6)" }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_skip_rate_by_artist",
            description: "Specifically checks if a user skips an artist's songs more than others. Use when user asks about skip rate, how much they skip, if they finish songs, or listening completion.",
            parameters: {
                type: "object",
                properties: {
                    artist_name: { type: "string", description: "The artist name to check skip rate for" }
                },
                required: ["artist_name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_gateway_tracks",
            description: "Identifies the specific song that 'hooked' the user and led them to listen to the rest of the artist. Use when user asks about gateway songs, what got them into an artist, or discovery tracks.",
            parameters: {
                type: "object",
                properties: {
                    artist_name: { type: "string", description: "The artist name to find gateway track for" }
                },
                required: ["artist_name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_top_collaborations",
            description: "Finds which artists are most frequently played in the same listening session. Use when user asks about artist pairings, what artists go together, session combos, or listening pairs.",
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
            name: "get_milestone_tracker",
            description: "Tracks progress toward a milestone (e.g., reaching 1,000 plays for a favorite artist). Use when user asks about milestones, progress to a goal, how close to X plays, or achievement tracking.",
            parameters: {
                type: "object",
                properties: {
                    target_plays: { type: "number", description: "Target number of plays for the milestone" },
                    artist_name: { type: "string", description: "Optional: specific artist to track. If omitted, tracks top artist." }
                },
                required: ["target_plays"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_obsession_score",
            description: "Get obsession score for an artist based on single-song dominance and total plays, with optional date filtering. Different from obsession_orbit - this returns a calculated score. Use when user asks about obsession score, obsession level with date range, or artist obsession metrics.",
            parameters: {
                type: "object",
                properties: {
                    artist_name: { type: "string", description: "Optional: specific artist to check obsession for" },
                    start_date: { type: "string", description: "Optional: start date for filtering (YYYY-MM-DD)" },
                    end_date: { type: "string", description: "Optional: end date for filtering (YYYY-MM-DD)" }
                },
                required: []
            }
        }
    }
];

// ─── TOOL ICON MAP (using Lucide icon names) ────────────────────
const TOOL_ICON_MAP: Record<string, { icon: string; label: string }> = {
    get_top_songs: { icon: 'Music', label: 'Top Songs' },
    get_top_artists: { icon: 'Mic2', label: 'Top Artists' },
    get_top_albums: { icon: 'Disc', label: 'Top Albums' },
    get_listening_time: { icon: 'Clock', label: 'Listening Time' },
    get_obsession_orbit: { icon: 'Orbit', label: 'Obsession Orbit' },
    get_artist_streak: { icon: 'Flame', label: 'Artist Streak' },
    get_listening_percentage: { icon: 'BarChart3', label: 'Listening %' },
    get_upcoming_artists: { icon: 'Radio', label: 'Radar Artists' },
    get_peak_listening_hour: { icon: 'Timer', label: 'Peak Hour' },
    get_rising_star: { icon: 'TrendingUp', label: 'Rising Star' },
    get_late_night_anthem: { icon: 'Moon', label: 'Late Night' },
    get_most_skipped: { icon: 'SkipForward', label: 'Most Skipped' },
    get_charts: { icon: 'BarChart2', label: 'Charts' },
    get_wrapped_overview: { icon: 'Gift', label: 'Wrapped' },
    search_spotify_tracks: { icon: 'Search', label: 'Track Search' },
    filter_songs: { icon: 'SlidersHorizontal', label: 'Filter' },
    fetch_image: { icon: 'Image', label: 'Fetch Image' },
    get_heatmap_data: { icon: 'Grid3x3', label: 'Heatmap' },
    get_artist_network: { icon: 'Network', label: 'Artist Network' },
    get_genre_breakdown: { icon: 'ChartPie', label: 'Genres' },
    get_recent_plays: { icon: 'History', label: 'Recent Plays' },
    compare_periods: { icon: 'ArrowLeftRight', label: 'Compare' },
    get_album_covers: { icon: 'ImageIcon', label: 'Album Covers' },
    // New tools
    compare_artist_performance: { icon: 'TrendingUp', label: 'Artist Growth' },
    get_rank_shift: { icon: 'ArrowUpDown', label: 'Rank Movement' },
    get_loyalty_score: { icon: 'Heart', label: 'Loyalty Score' },
    get_market_share: { icon: 'PieChart', label: 'Market Share' },
    get_discovery_date: { icon: 'Calendar', label: 'Discovery Date' },
    get_binge_sessions: { icon: 'Play', label: 'Binge Sessions' },
    get_one_hit_wonders: { icon: 'Star', label: 'One-Hit Wonders' },
    get_album_completionist: { icon: 'CheckCircle', label: 'Album Complete' },
    get_earworm_report: { icon: 'Repeat', label: 'Earworm' },
    get_work_vs_play_stats: { icon: 'Briefcase', label: 'Work vs Play' },
    get_seasonal_vibe: { icon: 'CloudSun', label: 'Seasonal Vibe' },
    get_anniversary_flashback: { icon: 'CalendarClock', label: 'Anniversary' },
    get_commute_soundtrack: { icon: 'Car', label: 'Commute' },
    get_sleep_pattern: { icon: 'Moon', label: 'Sleep Pattern' },
    get_diversity_index: { icon: 'Sparkles', label: 'Diversity' },
    get_genre_evolution: { icon: 'LineChart', label: 'Genre Evolution' },
    get_skip_rate_by_artist: { icon: 'FastForward', label: 'Skip Rate' },
    get_gateway_tracks: { icon: 'DoorOpen', label: 'Gateway Tracks' },
    get_top_collaborations: { icon: 'Users', label: 'Collaborations' },
    get_milestone_tracker: { icon: 'Target', label: 'Milestones' },
    get_obsession_score: { icon: 'Flame', label: 'Obsession Score' },
};

// ─── TOOL EXECUTION HANDLER ─────────────────────────────────────
async function executeAgentTool(
    funcName: string,
    funcArgs: Record<string, any>,
    token?: string | null
): Promise<any> {
    console.log(`[agentTools] Executing: ${funcName}`, funcArgs);

    try {
        switch (funcName) {
            case 'get_top_songs': {
                const period = funcArgs.period || 'Weekly';
                const limit = Math.min(funcArgs.limit || 10, 50);
                const stats = await fetchDashboardStats(period as any);
                let songs = (stats.songs || []).slice(0, limit);
                if (funcArgs.artist_filter) {
                    const filter = funcArgs.artist_filter.toLowerCase();
                    songs = songs.filter((s: any) => (s.artist || '').toLowerCase().includes(filter));
                }
                return {
                    period,
                    count: songs.length,
                    songs: songs.map((s: any, i: number) => ({
                        rank: i + 1,
                        title: s.title || s.name,
                        artist: s.artist,
                        plays: s.listens || s.totalListens || 0,
                        minutes: s.timeStr || null,
                        cover: s.cover || s.image || null
                    }))
                };
            }

            case 'get_top_artists': {
                const period = funcArgs.period || 'Weekly';
                const limit = Math.min(funcArgs.limit || 10, 50);
                const stats = await fetchDashboardStats(period as any);
                const artists = (stats.artists || []).slice(0, limit);
                return {
                    period,
                    count: artists.length,
                    artists: artists.map((a: any, i: number) => ({
                        rank: i + 1,
                        name: a.name,
                        plays: a.totalListens || 0,
                        time: a.timeStr || null,
                        image: a.image || null,
                        genres: a.genres || []
                    }))
                };
            }

            case 'get_top_albums': {
                const period = funcArgs.period || 'Weekly';
                const limit = Math.min(funcArgs.limit || 10, 50);
                const stats = await fetchDashboardStats(period as any);
                const albums = (stats.albums || []).slice(0, limit);
                return {
                    period,
                    count: albums.length,
                    albums: albums.map((a: any, i: number) => ({
                        rank: i + 1,
                        title: a.title,
                        artist: a.artist,
                        plays: a.totalListens || 0,
                        time: a.timeStr || null,
                        cover: a.cover || null
                    }))
                };
            }

            case 'get_listening_time': {
                const period = funcArgs.period || 'Weekly';
                const listeningStats = await fetchListeningStats();
                const dashboard = await fetchDashboardStats(period as any);
                const totalMinutes = (dashboard.songs || []).reduce((acc: number, s: any) => {
                    const mins = s.timeStr ? parseInt(s.timeStr.replace(/[^0-9]/g, ''), 10) : 0;
                    return acc + mins;
                }, 0);
                return {
                    period,
                    weeklyTime: listeningStats.weeklyTime,
                    weeklyTrend: listeningStats.weeklyTrend,
                    totalTracks: listeningStats.totalTracks,
                    totalMinutesThisPeriod: totalMinutes,
                    totalHoursThisPeriod: Math.round(totalMinutes / 60 * 10) / 10,
                    longestGap: listeningStats.extraStats?.longestGapHours || 'Unknown',
                    longestSession: listeningStats.extraStats?.longestSessionHours || 'Unknown'
                };
            }

            case 'get_obsession_orbit': {
                const period = funcArgs.period || 'weekly';
                const obsession = await getObsessionArtist(period as any);
                if (funcArgs.artist_name) {
                    const stats = await fetchDashboardStats(period === 'daily' ? 'Daily' : period === 'monthly' ? 'Monthly' : 'Weekly');
                    const artists = stats.artists || [];
                    const target = funcArgs.artist_name.toLowerCase();
                    const found = artists.find((a: any) => (a.name || '').toLowerCase().includes(target));
                    const rank = found ? artists.indexOf(found) + 1 : -1;
                    return {
                        queried_artist: funcArgs.artist_name,
                        found: !!found,
                        rank: rank > 0 ? rank : null,
                        total_artists: artists.length,
                        plays: found?.totalListens || 0,
                        time: found?.timeStr || null,
                        is_obsession: obsession?.artist?.toLowerCase().includes(target) || false,
                        obsession_artist: obsession || null,
                        obsession_score: obsession?.percentage ?? null
                    };
                }
                return {
                    obsession_artist: obsession || null,
                    obsession_score: obsession?.percentage ?? null,
                    period
                };
            }

            case 'get_artist_streak': {
                const period = funcArgs.period || 'Weekly';
                const stats = await fetchDashboardStats(period as any);
                const artists = stats.artists || [];
                const target = (funcArgs.artist_name || '').toLowerCase();
                const found = artists.find((a: any) => (a.name || '').toLowerCase().includes(target));
                const rank = found ? artists.indexOf(found) + 1 : -1;
                // Check songs by that artist for streak info
                const artistSongs = (stats.songs || []).filter((s: any) => (s.artist || '').toLowerCase().includes(target));
                return {
                    artist: funcArgs.artist_name,
                    found: !!found,
                    rank: rank > 0 ? rank : null,
                    plays: found?.totalListens || 0,
                    time: found?.timeStr || null,
                    song_count: artistSongs.length,
                    top_song: artistSongs[0] ? { title: artistSongs[0].title, plays: artistSongs[0].listens || 0 } : null
                };
            }

            case 'get_listening_percentage': {
                const period = funcArgs.period || 'Weekly';
                const stats = await fetchDashboardStats(period as any);
                const entityType = funcArgs.entity_type || 'artist';
                const entityName = (funcArgs.entity_name || '').toLowerCase();

                let totalMinutes = 0;
                let entityMinutes = 0;

                if (entityType === 'artist') {
                    const artists = stats.artists || [];
                    artists.forEach((a: any) => {
                        const mins = a.timeStr ? parseInt(a.timeStr.replace(/[^0-9]/g, ''), 10) : 0;
                        totalMinutes += mins;
                        if ((a.name || '').toLowerCase().includes(entityName)) entityMinutes += mins;
                    });
                } else if (entityType === 'song') {
                    const songs = stats.songs || [];
                    songs.forEach((s: any) => {
                        const mins = s.timeStr ? parseInt(s.timeStr.replace(/[^0-9]/g, ''), 10) : 0;
                        totalMinutes += mins;
                        if ((s.title || '').toLowerCase().includes(entityName)) entityMinutes += mins;
                    });
                } else {
                    const albums = stats.albums || [];
                    albums.forEach((a: any) => {
                        const mins = a.timeStr ? parseInt(a.timeStr.replace(/[^0-9]/g, ''), 10) : 0;
                        totalMinutes += mins;
                        if ((a.title || '').toLowerCase().includes(entityName)) entityMinutes += mins;
                    });
                }

                const percentage = totalMinutes > 0 ? Math.round((entityMinutes / totalMinutes) * 1000) / 10 : 0;
                return {
                    entity: funcArgs.entity_name,
                    entity_type: entityType,
                    period,
                    percentage,
                    entity_minutes: entityMinutes,
                    total_minutes: totalMinutes
                };
            }

            case 'get_upcoming_artists': {
                const period = funcArgs.period || 'weekly';
                const radar = await getRadarArtists(period as any);
                return {
                    period,
                    new_artists: radar || []
                };
            }

            case 'get_peak_listening_hour': {
                const period = funcArgs.period || 'weekly';
                const peak = await getPeakListeningHour(period as any);
                return peak || { hour: null, label: 'Unknown', plays: 0 };
            }

            case 'get_rising_star': {
                const period = funcArgs.period || 'weekly';
                const rising = await getRisingStar(period as any);
                return rising || { name: 'No data', increase: 0 };
            }

            case 'get_late_night_anthem': {
                const period = funcArgs.period || 'weekly';
                const anthem = await getLateNightAnthem(period as any);
                return anthem || { title: 'No late night plays found', artist: '', plays: 0 };
            }

            case 'get_most_skipped': {
                const period = funcArgs.period || 'weekly';
                const skipped = await getMostSkippedSong(period as any);
                return skipped || { title: 'No data', artist: '', avgDuration: 0 };
            }

            case 'get_charts': {
                const period = funcArgs.period || 'weekly';
                const charts = await fetchCharts(period as any);
                return {
                    period,
                    charts: (charts || []).slice(0, 20).map((c: any) => ({
                        rank: c.rank,
                        title: c.title,
                        artist: c.artist,
                        plays: c.listens,
                        trend: c.trend,
                        prev_rank: c.prev
                    }))
                };
            }

            case 'get_wrapped_overview': {
                const period = funcArgs.period || 'weekly';
                const wrappedPeriod: 'daily' | 'weekly' | 'monthly' =
                    period === 'daily' || period === 'monthly' ? period : 'weekly';
                const wrapped = await getWrappedStats(wrappedPeriod);
                if (!wrapped) return { period, found: false };
                return {
                    period,
                    found: true,
                    title: wrapped.title,
                    total_minutes: wrapped.totalMinutes || 0,
                    total_streams: wrapped.totalStreams || 0,
                    top_artist: wrapped.topArtist || null,
                    top_song: wrapped.topSong || null,
                    top_album: wrapped.topAlbum || null
                };
            }

            case 'search_spotify_tracks': {
                if (!token) return { query: funcArgs.query || '', tracks: [], error: 'No Spotify token available' };
                const query = (funcArgs.query || '').trim();
                const limit = Math.min(funcArgs.limit || 5, 20);
                const tracks = await searchSpotifyTracks(token, query, limit);
                type SpotifySearchTrack = { title: string; artist: string; album: string; uri: string; cover?: string };
                return {
                    query,
                    count: tracks.length,
                    tracks: tracks.map((t: SpotifySearchTrack, i: number) => ({
                        rank: i + 1,
                        title: t.title,
                        artist: t.artist,
                        album: t.album,
                        uri: t.uri,
                        cover: t.cover || null
                    }))
                };
            }

            case 'filter_songs': {
                const concept = {
                    title: 'Filtered Results',
                    description: 'Custom filter',
                    filter: {
                        type: funcArgs.type || 'song',
                        field: funcArgs.field,
                        value: funcArgs.value,
                        contains: funcArgs.contains,
                        timeOfDay: funcArgs.time_of_day,
                        dayOfWeek: funcArgs.day_of_week,
                        recentDays: funcArgs.recent_days,
                        sortBy: funcArgs.sort_by || 'plays',
                        sortOrder: funcArgs.sort_order || 'highest',
                        limit: Math.min(funcArgs.limit || 20, 50)
                    }
                };
                const data = await fetchSmartPlaylist(concept as any);
                return {
                    count: data.length,
                    items: data.slice(0, 30).map((d: any, i: number) => ({
                        rank: i + 1,
                        title: d.title || d.name,
                        artist: d.artist || d.artist_name,
                        plays: d.plays || d.listens || d.totalListens || 0,
                        time: d.timeStr || d.totalMinutes || null,
                        cover: d.cover || d.image || null
                    }))
                };
            }

            case 'fetch_image': {
                if (!token) return { image_url: null, error: 'No Spotify token available' };
                const name = funcArgs.name || '';
                try {
                    const images = await fetchArtistImages(token, [name]);
                    return { name, image_url: images[name] || null };
                } catch {
                    return { name, image_url: null, error: 'Failed to fetch image' };
                }
            }

            case 'get_heatmap_data': {
                const rawData = await fetchHeatmapData();
                const days = Math.min(funcArgs.days || 30, 90);
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - days);
                const filtered = rawData.filter((d: any) => new Date(d.played_at) >= cutoff);

                // Aggregate by hour and day of week
                const hourCounts: Record<number, number> = {};
                const dayCounts: Record<number, number> = {};
                filtered.forEach((d: any) => {
                    const dt = new Date(d.played_at);
                    const hour = dt.getHours();
                    const day = dt.getDay();
                    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
                    dayCounts[day] = (dayCounts[day] || 0) + 1;
                });

                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
                const peakDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

                return {
                    days_analyzed: days,
                    total_plays: filtered.length,
                    hourly_distribution: Object.fromEntries(
                        Object.entries(hourCounts).sort((a, b) => Number(a[0]) - Number(b[0]))
                    ),
                    daily_distribution: Object.fromEntries(
                        Object.entries(dayCounts).map(([d, c]) => [dayNames[Number(d)], c]).sort((a, b) => (b[1] as number) - (a[1] as number))
                    ),
                    peak_hour: peakHour ? { hour: Number(peakHour[0]), label: `${Number(peakHour[0]) % 12 || 12}${Number(peakHour[0]) < 12 ? 'AM' : 'PM'}`, plays: peakHour[1] } : null,
                    peak_day: peakDay ? { day: dayNames[Number(peakDay[0])], plays: peakDay[1] } : null,
                };
            }

            case 'get_artist_network': {
                const limit = Math.min(funcArgs.limit || 500, 1000);
                const network = await fetchArtistNetwork(limit);
                const artistList = Object.values(network.artistInfo)
                    .sort((a: any, b: any) => b.count - a.count)
                    .slice(0, 20);

                // Find top pairs
                const pairList: { artist_a: string; artist_b: string; strength: number }[] = [];
                for (const [a, connections] of Object.entries(network.pairs)) {
                    for (const [b, count] of Object.entries(connections as Record<string, number>)) {
                        if (a < b) { // avoid duplicates
                            pairList.push({ artist_a: a, artist_b: b, strength: count });
                        }
                    }
                }
                pairList.sort((a, b) => b.strength - a.strength);

                return {
                    top_artists: artistList.map((a: any) => ({ name: a.name, plays: a.count })),
                    top_connections: pairList.slice(0, 15),
                    total_artists: Object.keys(network.artistInfo).length,
                };
            }

            case 'get_genre_breakdown': {
                const period = funcArgs.period || 'Weekly';
                const stats = await fetchDashboardStats(period as any);
                const artists = (stats.artists || []).slice(0, 30);

                // Aggregate genres from artist data
                const genreCounts: Record<string, number> = {};
                artists.forEach((a: any) => {
                    const genres = a.genres || [];
                    const weight = a.totalListens || 1;
                    if (genres.length === 0) {
                        genreCounts['Unknown'] = (genreCounts['Unknown'] || 0) + weight;
                    }
                    genres.forEach((g: string) => {
                        genreCounts[g] = (genreCounts[g] || 0) + weight;
                    });
                });

                const totalWeight = Object.values(genreCounts).reduce((a, b) => a + b, 0);
                const genreList = Object.entries(genreCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 15)
                    .map(([genre, count]) => ({
                        genre,
                        count,
                        percentage: totalWeight > 0 ? Math.round((count / totalWeight) * 1000) / 10 : 0
                    }));

                return {
                    period,
                    genres: genreList,
                    total_artists_analyzed: artists.length,
                };
            }

            case 'get_recent_plays': {
                const limit = Math.min(funcArgs.limit || 20, 50);
                const stats = await fetchDashboardStats('Daily');
                const recentPlays = (stats.recentPlays || stats.songs || []).slice(0, limit);
                return {
                    count: recentPlays.length,
                    plays: recentPlays.map((p: any, i: number) => ({
                        rank: i + 1,
                        title: p.title || p.track_name || p.name,
                        artist: p.artist || p.artist_name,
                        album: p.album || p.album_name || null,
                        cover: p.cover || p.album_cover || p.image || null,
                        played_at: p.played_at || p.lastPlayed || null,
                    }))
                };
            }

            case 'compare_periods': {
                const periodA = funcArgs.period_a || 'Weekly';
                const periodB = funcArgs.period_b || 'Monthly';
                const [statsA, statsB] = await Promise.all([
                    fetchDashboardStats(periodA as any),
                    fetchDashboardStats(periodB as any),
                ]);

                const totalMinsA = (statsA.songs || []).reduce((acc: number, s: any) => {
                    return acc + (s.timeStr ? parseInt(s.timeStr.replace(/[^0-9]/g, ''), 10) : 0);
                }, 0);
                const totalMinsB = (statsB.songs || []).reduce((acc: number, s: any) => {
                    return acc + (s.timeStr ? parseInt(s.timeStr.replace(/[^0-9]/g, ''), 10) : 0);
                }, 0);

                return {
                    period_a: {
                        label: periodA,
                        total_songs: (statsA.songs || []).length,
                        total_artists: (statsA.artists || []).length,
                        total_albums: (statsA.albums || []).length,
                        total_minutes: totalMinsA,
                        top_artist: statsA.artists?.[0]?.name || null,
                        top_song: statsA.songs?.[0]?.title || null,
                    },
                    period_b: {
                        label: periodB,
                        total_songs: (statsB.songs || []).length,
                        total_artists: (statsB.artists || []).length,
                        total_albums: (statsB.albums || []).length,
                        total_minutes: totalMinsB,
                        top_artist: statsB.artists?.[0]?.name || null,
                        top_song: statsB.songs?.[0]?.title || null,
                    },
                    comparison: {
                        minutes_diff: totalMinsA - totalMinsB,
                        songs_diff: (statsA.songs || []).length - (statsB.songs || []).length,
                        artists_diff: (statsA.artists || []).length - (statsB.artists || []).length,
                    }
                };
            }

            case 'get_album_covers': {
                if (!token) return { covers: [], error: 'No Spotify token available' };
                const names = funcArgs.names || [];
                try {
                    const images = await fetchArtistImages(token, names);
                    return {
                        count: Object.keys(images).length,
                        covers: Object.entries(images).map(([name, url]) => ({ name, image_url: url }))
                    };
                } catch {
                    return { covers: [], error: 'Failed to fetch album covers' };
                }
            }

            // ─── COMPARATIVE & GROWTH TOOLS ─────────────────────────────────────
            case 'compare_artist_performance': {
                const result = await compareArtistPerformance(
                    funcArgs.artist_name,
                    funcArgs.period_a,
                    funcArgs.period_b
                );
                return result || { error: 'No data found for this artist comparison' };
            }

            case 'get_rank_shift': {
                const result = await getRankShift(
                    funcArgs.entity_name,
                    funcArgs.entity_type,
                    funcArgs.time_range || 'weekly'
                );
                return result || { error: 'No ranking data found for this entity' };
            }

            case 'get_loyalty_score': {
                const result = await getLoyaltyScore(funcArgs.artist_name);
                return result || { error: 'No loyalty data found for this artist' };
            }

            case 'get_market_share': {
                const result = await getMarketShare(funcArgs.entity_type);
                return result || { error: 'No market share data available' };
            }

            // ─── BEHAVIORAL & DISCOVERY TOOLS ─────────────────────────────────────
            case 'get_discovery_date': {
                const result = await getDiscoveryDate(funcArgs.artist_name);
                return result || { error: 'No discovery date found for this artist' };
            }

            case 'get_binge_sessions': {
                const result = await getBingeSessions(funcArgs.threshold_minutes || 60);
                return result || { error: 'No binge sessions found' };
            }

            case 'get_one_hit_wonders': {
                const result = await getOneHitWonders(funcArgs.min_plays || 5);
                return result || { error: 'No one-hit wonders found' };
            }

            case 'get_album_completionist': {
                const result = await getAlbumCompletionist(funcArgs.album_name);
                return result || { error: 'No album completion data found' };
            }

            case 'get_earworm_report': {
                const result = await getEarwormReport(funcArgs.days_back || 7);
                return result || { error: 'No earworm data found' };
            }

            // ─── TIME & CONTEXTUAL TOOLS ─────────────────────────────────────
            case 'get_work_vs_play_stats': {
                const result = await getWorkVsPlayStats();
                return result || { error: 'No work vs play data available' };
            }

            case 'get_seasonal_vibe': {
                const result = await getSeasonalVibe(funcArgs.season);
                return result || { error: 'No seasonal data available' };
            }

            case 'get_anniversary_flashback': {
                const result = await getAnniversaryFlashback(funcArgs.date);
                return result || { error: 'No anniversary data found' };
            }

            case 'get_commute_soundtrack': {
                const result = await getCommuteSoundtrack();
                return result || { error: 'No commute data available' };
            }

            case 'get_sleep_pattern': {
                const result = await getSleepPattern();
                return result || { error: 'No sleep pattern data found' };
            }

            // ─── DIVERSITY & TECHNICAL TOOLS ─────────────────────────────────────
            case 'get_diversity_index': {
                const result = await getDiversityIndex(funcArgs.time_range || 'monthly');
                return result || { error: 'No diversity data available' };
            }

            case 'get_genre_evolution': {
                const result = await getGenreEvolution(funcArgs.months || 6);
                return result || { error: 'No genre evolution data found' };
            }

            case 'get_skip_rate_by_artist': {
                const result = await getSkipRateByArtist(funcArgs.artist_name);
                return result || { error: 'No skip rate data found for this artist' };
            }

            case 'get_gateway_tracks': {
                const result = await getGatewayTracks(funcArgs.artist_name);
                return result || { error: 'No gateway tracks found for this artist' };
            }

            case 'get_top_collaborations': {
                const result = await getTopCollaborations();
                return result || { error: 'No collaboration data available' };
            }

            case 'get_milestone_tracker': {
                const result = await getMilestoneTracker(funcArgs.target_plays, funcArgs.artist_name);
                return result || { error: 'No milestone tracking data available' };
            }

            case 'get_obsession_score': {
                const result = await getObsessionScore(
                    funcArgs.artist_name,
                    funcArgs.start_date,
                    funcArgs.end_date
                );
                return result || { error: 'No obsession score data found' };
            }

            default:
                return { error: `Unknown tool: ${funcName}` };
        }
    } catch (error: any) {
        console.error(`[agentTools] Error executing ${funcName}:`, error);
        return { error: error.message || 'Tool execution failed' };
    }
}

// ─── AGENT SYSTEM PROMPT ─────────────────────────────────────────
const AGENT_SYSTEM_PROMPT = `You are **Punky**, the AI music analytics agent for PunkyStats — a premium Spotify analytics dashboard.
You are NOT a generic chatbot. You are a specialized music data agent with access to real-time tools that query the user's actual listening history database.

## CORE IDENTITY
- You are Punky: sharp, music-savvy, data-driven, concise
- You speak like a friend who deeply understands their music taste
- You never hallucinate data — you ALWAYS use tool calls to fetch real numbers
- You are an agent: you think, decide which tools to call, call them, then respond with real data

## TOOL CALLING RULES (CRITICAL)
1. **ALWAYS call tools** before answering data questions. NEVER guess or make up numbers.
2. You can call **multiple tools in parallel** when needed (e.g., user asks "what's my obsession score for Kanye and also my top song" → call get_obsession_orbit AND get_top_songs simultaneously).
3. Match the user's time intent to the correct period parameter:
   - "this week" / "weekly" → "Weekly" or "weekly"
   - "today" / "daily" → "Daily" or "daily"  
   - "this month" / "monthly" → "Monthly" or "monthly"
   - "all time" / "ever" / "overall" → "All Time"
   - "last week" → "Weekly" (it covers recent data)
   - "last 6 months" → use filter_songs with recent_days: 180
   - "last 3 months" → use filter_songs with recent_days: 90
4. If user asks about a SPECIFIC artist/song/album, use the appropriate tool with the entity name.
5. For percentage/share questions, use get_listening_percentage.
6. For "obsession orbit" or obsession-related questions, ALWAYS use get_obsession_orbit.
7. For streak questions, use get_artist_streak.
8. For "what did I listen to [time]", use filter_songs with the right recent_days or time_of_day.
9. When user mentions "kanye" you know they mean "Kanye West". Apply this for well-known artists.

## TOOL SELECTION GUIDE
| User Intent | Tool to Call | Key Args |
|---|---|---|
| "top songs this month" | get_top_songs | period: "Monthly" |
| "kanye listening last 6 months" | filter_songs | field: "artist_name", value: "Kanye West", recent_days: 180 |
| "top album" | get_top_albums | period: "Weekly" |
| "obsession orbit" / "obsession score" | get_obsession_orbit | period, artist_name? |
| "total time this week" | get_listening_time | period: "Weekly" |
| "what % is drake" | get_listening_percentage | entity_type: "artist", entity_name: "Drake" |
| "drake streak" | get_artist_streak | artist_name: "Drake" |
| "what song at night" | get_late_night_anthem | period |
| "trending/charts" | get_charts | period |
| "new artists" / "upcoming" | get_upcoming_artists | period |
| "peak hour" | get_peak_listening_hour | period |
| "rising star" | get_rising_star | period |
| "most skipped" | get_most_skipped | period |
| "weekly wrapped recap" | get_wrapped_overview | period: "weekly" |
| "find track [name]" | search_spotify_tracks | query, limit? |
| "songs this morning" | filter_songs | type: "song", time_of_day: "morning" |
| "least played album" | filter_songs | type: "album", sort_by: "plays", sort_order: "lowest" |
| "songs I played last weekend" | filter_songs | type: "song", day_of_week: "weekend", recent_days: 7 |
| "when do I listen most" / "activity" | get_heatmap_data | days: 30 |
| "artists I listen together" / "pairs" | get_artist_network | limit: 500 |
| "what genres do I listen to" | get_genre_breakdown | period: "Weekly" |
| "what did I just play" / "recent" | get_recent_plays | limit: 20 |
| "compare this week vs month" | compare_periods | period_a: "Weekly", period_b: "Monthly" |
| "show album covers" / "artwork" | get_album_covers | names: [...] |
| "show me [artist] image" | fetch_image | name, type: "artist" |
| "how obsessed am I with [artist]" | get_obsession_orbit | period, artist_name |
| "my listening routine" | get_heatmap_data + get_peak_listening_hour | — |
| "has my taste changed" | compare_periods | period_a, period_b |

## RESPONSE FORMAT RULES
1. **BE EXTREMELY CONCISE.** No yapping. Get to the point.
2. Use the data from tool results to give precise answers with real numbers.
3. Use bullet points for lists. NO markdown tables.
4. When showing ranked items, format like: **1.** Song Name — Artist (X plays)
5. Include relevant stats: plays, minutes, percentage, rank.
6. For images: if you fetched an image URL, reference it with ![name](url).
7. Use bold for emphasis on key numbers and names.
8. End with a brief insight or fun observation about the data when appropriate.
9. If data is empty/null, say "No data found for that query" — never make up results.

## VOCABULARY (PunkyStats Terms)
- **Obsession Orbit**: The user's most obsessed-over artist (where one song dominates plays)
- **Rising Star**: Artist with biggest play increase vs previous period
- **Late Night Anthem**: Most played song between 1-5 AM
- **Radar Artists**: Newly discovered artists (not in previous period)
- **Deep Cut**: Rarely played or low-popularity tracks
- **Heavy Rotation**: Songs/artists with high consistent plays

## CANVAS COMPONENT GUIDELINES (for UI references)
When the user or context references visual components, keep in mind:
- Colors: Pure black (#000000) bg, dark cards (#1C1C1E), elevated cards (#2C2C2E), accent red (#FA2D48), white text (#FFFFFF), muted text (#8E8E93), dimmed text (#666666)
- Font: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', sans-serif
- Font sizes: headings 24-32px bold, subheadings 16-18px semibold, body 14-15px regular, captions 11-12px medium
- Borders: 1px solid rgba(255,255,255,0.1), rounded-xl (12px) for cards, rounded-lg (8px) for buttons
- Shadows: subtle, use colored accent glows sparingly
- Buttons: bg-white text-black for primary, bg-white/5 text-white/60 for secondary, always rounded-lg with font-semibold text-[13px]
- No heavy gradients — flat, modern, Apple-style aesthetic
- Glassmorphism: backdrop-blur effects where appropriate
- Spacing: consistent padding (p-4 to p-6 for cards), gap-2 to gap-4 for flex layouts`;

// ─── MAIN AGENT FUNCTION (with tool calling) ─────────────────────
export interface AgentResponse {
    text: string;
    toolCalls: ToolCallInfo[];
}

export const answerMusicQuestionWithTools = async (
    question: string,
    context: {
        artists: string[],
        albums: string[],
        songs: string[],
        userName?: string,
        globalStats?: {
            weeklyTime: string,
            weeklyTrend: string,
            totalTracks: number,
            totalMinutes?: number,
            charts?: any[],
            extraStats?: { longestGapHours: string, longestSessionHours: string }
        }
    },
    token?: string | null,
    modelId?: string
): Promise<AgentResponse> => {
    console.log('[agentTools] answerMusicQuestionWithTools called', { question, modelId });

    const fallbackResponse: AgentResponse = { text: "Unable to answer right now. Try again!", toolCalls: [] };

    try {
        const client = getAiClient();
        if (!client) {
            return { text: "Configure VITE_GROQ_API_KEY to use chat features.", toolCalls: [] };
        }

        const selectedModelId = modelId || DEFAULT_MODEL_ID;
        const modelInfo = AI_MODELS.find(m => m.id === selectedModelId);

        const messages: any[] = [
            { role: "system", content: AGENT_SYSTEM_PROMPT },
            {
                role: "system",
                content: `User: ${context.userName || 'Unknown'} | Date: ${new Date().toLocaleString()} | Quick context: Top artists include ${context.artists.slice(0, 5).join(', ')}. Weekly time: ${context.globalStats?.weeklyTime || '?'}.`
            },
            { role: "user", content: question }
        ];

        const collectedToolCalls: ToolCallInfo[] = [];
        let iterations = 0;
        const MAX_ITERATIONS = 6;

        while (iterations < MAX_ITERATIONS) {
            iterations++;

            const requestParams: any = {
                model: selectedModelId,
                messages,
                tools: AGENT_TOOLS,
                tool_choice: "auto",
                temperature: 0.5,
                max_tokens: 800
            };
            if (modelInfo?.isReasoning) {
                // Groq currently accepts only: "none" | "default"
                requestParams.reasoning_effort = "default";
            }

            const response = await client.chat.completions.create(requestParams);

            const assistantMessage = response.choices[0]?.message;
            if (!assistantMessage) break;

            messages.push(assistantMessage);

            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                // Execute all tool calls in parallel
                const toolResults = await Promise.all(
                    assistantMessage.tool_calls.map(async (toolCall) => {
                        const funcName = toolCall.function.name;
                        const funcArgs = JSON.parse(toolCall.function.arguments || "{}");
                        const iconInfo = TOOL_ICON_MAP[funcName] || { icon: 'Zap', label: funcName };

                        const rawResult = await executeAgentTool(funcName, funcArgs, token);
                        const result = trimToolPayload(rawResult);

                        collectedToolCalls.push({
                            id: toolCall.id,
                            name: funcName,
                            arguments: funcArgs,
                            result,
                            icon: iconInfo.icon,
                            label: iconInfo.label
                        });

                        return {
                            role: "tool" as const,
                            tool_call_id: toolCall.id,
                            content: JSON.stringify(result)
                        };
                    })
                );

                messages.push(...toolResults);
            } else {
                // No more tool calls — return final response
                const finalText = assistantMessage.content || "I processed your request but couldn't generate a response.";
                return {
                    text: finalText,
                    toolCalls: collectedToolCalls
                };
            }
        }

        // If we hit max iterations, return what we have
        const lastAssistant = messages.filter(m => m.role === 'assistant').pop();
        return {
            text: lastAssistant?.content || "I ran out of processing steps. Try a simpler question!",
            toolCalls: collectedToolCalls
        };

    } catch (error: any) {
        console.error("[agentTools] Agent Error:", error);
        return fallbackResponse;
    }
};

export const generateMusicInsights = async (contextData: string): Promise<string> => {
    try {
        const client = getAiClient();
        if (!client) return "Configure VITE_GROQ_API_KEY to see insights.";

        const prompt = `
      You are a music analytics expert. Analyze the following data summary and provide a concise, 
      Apple Music-style "Editor's Note" or strategic insight about the listening trends.
      Keep it short, encouraging, and professional (max 2 sentences).
      Current Date: ${new Date().toLocaleDateString()}
      
      Data: ${contextData}
    `;

        const response = await client.chat.completions.create({
            model: "moonshotai/kimi-k2-instruct-0905",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7
        });

        return response.choices[0]?.message?.content || "No insights available via Groq.";
    } catch (error) {
        console.error("Groq API Error:", error);
        return "Unable to generate insights right now.";
    }
};

export const answerMusicQuestion = async (question: string, context: {
    artists: string[],
    albums: string[],
    songs: string[],
    userName?: string,
    globalStats?: {
        weeklyTime: string,
        weeklyTrend: string,
        totalTracks: number,
        totalMinutes?: number,
        charts?: any[],
        extraStats?: { longestGapHours: string, longestSessionHours: string }
    }
}): Promise<string> => {
    console.log('[geminiService] answerMusicQuestion called', { question, hasContext: !!context, artistCount: context.artists?.length });
    try {
        const client = getAiClient();
        if (!client) {
            console.warn('[geminiService] No AI client available - missing VITE_GROQ_API_KEY');
            return "Configure VITE_GROQ_API_KEY to use chat features.";
        }

        const statsInfo = context.globalStats ? `
- This Week's Listening Time: ${context.globalStats.weeklyTime}
- Weekly Trend: ${context.globalStats.weeklyTrend}
- Total History Tracks: ${context.globalStats.totalTracks}
- Total Minutes Listened (Overall): ${context.globalStats.totalMinutes || 'Unknown'} min
- Current Charts Top 5: ${context.globalStats.charts?.slice(0, 5).map(c => `${c.title} (#${c.rank}, LW: ${c.last_week_rank})`).join(', ') || 'N/A'}
- Longest Gap Between Tracks (Last 14 days): ${context.globalStats.extraStats?.longestGapHours || '?'} hours
- Longest Continuous Session (Last 14 days): ${context.globalStats.extraStats?.longestSessionHours || '?'} hours
    ` : '';

        const prompt = `
You are Punky, a music analytics assistant who understands the user's music taste deeply.
You're friendly, knowledgeable, and passionate about music.

User name: ${context.userName || 'Unknown'}
Current Date and Time: ${new Date().toLocaleString()}

USER'S LIBRARY CONTEXT:
${statsInfo}
- Top Artists: [${context.artists.slice(0, 30).join(' | ')}]
- Top Albums: [${context.albums.slice(0, 15).join(' | ')}]
- Top Songs: [${context.songs.slice(0, 15).join(' | ')}]

USER QUESTION: "${question}"

## GUIDELINES:
1. **BE EXTREMELY CONCISE**: Do not "yap". Get straight to the point. No fluff.
2. Answer the question directly. If they ask for a stat, give the stat.
3. If they ask for a list/collection ("top songs", "playlist"):
   - Briefly mention the items.
   - **STRONGLY** suggest clicking "Visualize Category" below to see the full interactive view.
4. **NO MARKDOWN TABLES**.
5. Use bullet points for lists.
6. Tone: Friendly, insightful, music-savvy - like a friend who really gets their taste..
7. **VOCABULARY**:
   - "Obsession Orbit" refers to the user's TOP RANKED ARTISTS.
   - If they ask "Is Kanye my obsession?", check if Kanye is Rank #1 or in the Top 5.
   - "Deep Cut" usually means songs with encoded popularity < 30 (if available) or rarely played tracks.
`;

        console.log('[geminiService] Sending request to AI model...');
        const response = await client.chat.completions.create({
            model: "moonshotai/kimi-k2-instruct-0905",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 600
        });

        const result = response.choices[0]?.message?.content || "I couldn't process that question. Try rephrasing!";
        console.log('[geminiService] Response received, length:', result.length);
        return result;
    } catch (error) {
        console.error("[geminiService] Chat Error:", error);
        return "Unable to answer right now. Try again!";
    }
};

export const generateMusicInsight = async (query: string, stats: any): Promise<string> => {
    try {
        const client = getAiClient();
        if (!client) return "Configure VITE_GROQ_API_KEY.";

        const context = {
            topArtist: stats?.artists?.[0] || null,
            topSong: stats?.songs?.[0] || null,
            topGenre: stats?.artists?.[0]?.genres?.[0] || "Unknown",
            totalListeningTime: stats?.weeklyTime || "Unknown",
            recentTracks: stats?.songs?.slice(0, 5).map((s: any) => s.title) || [],
            allArtists: stats?.artists?.slice(0, 5).map((a: any) => ({ name: a.name, image: a.image })) || []
        };

        const systemPrompt = `
You are Punky, a music analytics assistant.
Answer questions about listening habits using this data:
${JSON.stringify(context)}

RULES:
- Display images using Markdown: ![Alt](url)
- Be extremely concise (Max 2 sentences).
- If answer isn't in data, say so.
        `;

        const response = await client.chat.completions.create({
            model: "moonshotai/kimi-k2-instruct-0905",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: query }],
            temperature: 0.7,
            max_tokens: 300
        });

        return response.choices[0]?.message?.content || "";
    } catch (e) {
        return "Insight error.";
    }
};

export const generateRankingInsights = async (items: string[]): Promise<Record<string, string>> => {
    try {
        const client = getAiClient();
        if (!client) return {};

        const prompt = `
            You are a music critic. For each item in the list below, write ONE very short, witty, and punchy insight (max 8 words) why this is a top-tier choice or what it says about the listener.
            Return ONLY a JSON object where keys are item names and values are the insights.

            ITEMS:
            ${items.join('\n')}
        `;

        const response = await client.chat.completions.create({
            model: "openai/gpt-oss-20b",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.8
        });

        return JSON.parse(response.choices[0]?.message?.content || "{}");
    } catch (e) {
        return {};
    }
}

// AI Graph Navigation Tool - finds edges and paths in the connections graph
export interface GraphNavigationParams {
    action: 'find_connections' | 'find_path' | 'strongest_edges' | 'clusters' | 'isolated_nodes';
    sourceNode?: string; // Name of source node
    targetNode?: string; // Name of target node (for path finding)
    minSimilarity?: number; // Minimum similarity threshold (0-1)
    maxResults?: number; // Limit number of results
    filterType?: 'artist' | 'album' | 'all'; // Filter by node type
}

export interface GraphNavigationResult {
    action: string;
    results: Array<{
        from: string;
        to: string;
        similarity: number;
        details?: string;
    }>;
    summary: string;
}

export const navigateConnectionGraph = async (
    params: GraphNavigationParams,
    graphContext: { nodes: string[]; edges: Array<{ from: string; to: string; similarity: number }> }
): Promise<GraphNavigationResult> => {
    console.log('[geminiService] navigateConnectionGraph called', params);
    try {
        const client = getAiClient();
        if (!client) return { action: params.action, results: [], summary: 'Configure VITE_GROQ_API_KEY to use graph navigation.' };

        const prompt = `
You are a graph analysis assistant. Analyze the following music listening connections graph and respond to the user's request.

GRAPH DATA:
- Nodes: ${graphContext.nodes.slice(0, 50).join(', ')}
- Total edges: ${graphContext.edges.length}
- Top 20 strongest edges: ${JSON.stringify(graphContext.edges.slice(0, 20).map(e => `${e.from} ↔ ${e.to} (${Math.round(e.similarity * 100)}%)`))}

USER REQUEST:
- Action: ${params.action}
${params.sourceNode ? `- Source: ${params.sourceNode}` : ''}
${params.targetNode ? `- Target: ${params.targetNode}` : ''}
${params.minSimilarity ? `- Min Similarity: ${params.minSimilarity * 100}%` : ''}
${params.maxResults ? `- Max Results: ${params.maxResults}` : ''}
${params.filterType ? `- Filter: ${params.filterType}` : ''}

Return a JSON object with:
- "summary": A brief 1-2 sentence description of findings
- "results": Array of { "from": string, "to": string, "similarity": number (0-1), "details": string }

Only return valid JSON.`;

        const response = await client.chat.completions.create({
            model: "moonshotai/kimi-k2-instruct-0905",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 800
        });

        const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
        console.log('[geminiService] Graph navigation result:', parsed);
        return {
            action: params.action,
            results: parsed.results || [],
            summary: parsed.summary || 'No results found.'
        };
    } catch (error) {
        console.error('[geminiService] Graph navigation error:', error);
        return { action: params.action, results: [], summary: 'Unable to navigate graph right now.' };
    }
};

export interface AIFilterArgs {
    // Result Type
    type?: 'song' | 'album' | 'artist';

    // Field matching
    field?: 'artist_name' | 'album_name' | 'track_name';
    value?: string; // Exact match
    contains?: string; // Partial match (broader results)

    // Time filters
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'latenight';
    dayOfWeek?: 'weekday' | 'weekend';
    recentDays?: number; // Last N days (e.g., 7, 30)

    // Duration filters
    minDurationMs?: number; // Songs longer than X
    maxDurationMs?: number; // Songs shorter than X

    // Aggregation
    sortBy?: 'plays' | 'minutes' | 'recency' | 'duration';
    sortOrder?: 'highest' | 'lowest';

    // Result control
    minPlays?: number; // Ensure at least X plays
    limit?: number; // How many results (default 20)

    // External Discovery
    useSpotify?: boolean; // If true, search Spotify instead of DB
    spotifyQuery?: string; // The search term for Spotify (e.g., "Kanye West", "80s Pop", "Sad Songs")
}

export interface AIFilterResult {
    title: string;
    description: string;
    filter: AIFilterArgs;
    isError?: boolean;
}


// WEEKLY INSIGHT GENERATOR
export const generateWeeklyInsightStory = async (context: any): Promise<any[]> => {
    try {
        const client = getAiClient();
        if (!client) throw new Error("No AI Client");

        const prompt = `
        You are the Pulse Music Engine. Generate an immersive, interactive "Weekly Insight" story for this user.
        Return a JSON ARRAY of 7 to 9 "slides".

        User Data: ${JSON.stringify(context)}

        Structure each slide object as:
        {
           "type": "text" | "stat" | "quiz" | "bar_chart" | "pie_chart" | "race_chart",
           "title": "Short Header",
           "content": "Description or Question",
           "data": {} // Depends on type
        }

        Slide Types & Data Schemas:
        1. "text": Intro/Outro/Section Header. data: { "background": "gradient-name" }
        2. "stat": Big number highlight. data: { "value": "1,200 m", "subtext": "Top 1% of listeners", "icon": "emoji" }
        3. "quiz": Trivia. data: { "options": ["A", "B", "C"], "correctIndex": 0, "explanation": "You played them 42 times!" }
        4. "bar_chart": Compare 3-5 items (e.g. Days of Week activity). data: { "points": [{"label": "Mon", "value": 30}, {"label": "Tue", "value": 80}...] }
        5. "pie_chart": Genre/Mood breakdown. data: { "segments": [{"label": "Pop", "value": 40, "color": "#ec4899"}, {"label": "Rock", "value": 20, "color": "#8b5cf6"}...] }
        6. "race_chart": A "race" between top artists/songs. data: { "competitors": [{"name": "Artist A", "score": 95}, {"name": "Artist B", "score": 88}, {"name": "Artist C", "score": 70}] }

        Sequence Guide:
        - Slide 1: Intro (text)
        - Slide 2: Big Stat (stat)
        - Slide 3: Artist Race (race_chart) - Visualize their top artists competing.
        - Slide 4: Genre Mix (pie_chart)
        - Slide 5: Quiz (quiz)
        - Slide 6: Activity Trend (bar_chart)
        - Slide 7: Outro (text)

        Keep it fun, high energy, and personalized. 
        JSON ONLY. No markdown.
        `;

        const response = await client.chat.completions.create({
            model: "moonshotai/kimi-k2-instruct-0905",
            messages: [{ role: "system", content: "You are a JSON generator." }, { role: "user", content: prompt }],
            temperature: 0.7,
            response_format: { type: "json_object" }
        });

        const raw = response.choices[0]?.message?.content || "[]";
        // Parse safely
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : (parsed.slides || []);
        } catch (e) {
            // Heuristic cleanup if markdown exists
            const jsonMatch = raw.match(/\[.*\]/s);
            return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        }

    } catch (e) {
        console.error(e);
        return [];
    }
};

export const generateDynamicCategoryQuery = async (context: {
    artists: string[],
    albums: string[],
    songs: string[],
    userName?: string,
    globalStats?: {
        weeklyTime: string,
        weeklyTrend: string,
        totalTracks: number,
        totalMinutes?: number,
        extraStats?: { longestGapHours: string, longestSessionHours: string },
        charts?: any[]
    }
}, userPrompt?: string): Promise<AIFilterResult[]> => {
    try {
        const client = getAiClient();
        if (!client) throw new Error("Missing VITE_GROQ_API_KEY");

        const hour = new Date().getHours();
        const timeOfDay = hour < 6 ? 'latenight' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

        // Shuffle and sample to keep prompt fresh
        const shuffledArtists = [...context.artists].sort(() => 0.5 - Math.random());
        const shuffledAlbums = [...context.albums].sort(() => 0.5 - Math.random());
        const shuffledSongs = [...context.songs].sort(() => 0.5 - Math.random());

        const statsInfo = context.globalStats ? `
## GLOBAL STATS (Use these for descriptions!):
- Weekly Listening Time: ${context.globalStats.weeklyTime}
- Weekly Trend: ${context.globalStats.weeklyTrend}
- Total Minutes (All Time): ${context.globalStats.totalMinutes || '?'} min
- Longest Session: ${context.globalStats.extraStats?.longestSessionHours || '?'} hours
- Current Charts: ${JSON.stringify(context.globalStats.charts?.slice(0, 5).map(c => `${c.title} by ${c.artist} (Rank #${c.rank}, LW #${c.last_week_rank})`) || 'No chart data available')}
        ` : '';

        const systemInstructions = `
You are the DJ Algorithm for a premium music dashboard.
Your job: Create **ONE OR MORE** unique, creative listening categories from the user's REAL library based on their request.

## CHART CONTEXT:
If a song has jumped significantly in rank (e.g., LW #20 -> Rank #1), mention its "Meteorite Rise" or "Chart Dominance" in the category description!

## FORMATTING RULES:
- **TIME**: ALWAYS use American AM/PM time (e.g., "5:00 PM" instead of "17:00").
- **TONE**: Smart, professional, minimalist.

${statsInfo}

## USER'S LIBRARY:
- User name: ${context.userName || 'Unknown'}
- Top Artists: [${shuffledArtists.slice(0, 30).join(', ')}]
- Top Albums: [${shuffledAlbums.slice(0, 20).join(', ')}]
- Top Songs: [${shuffledSongs.slice(0, 20).join(', ')}]
- Current Time: ${hour}:00 (${timeOfDay})

## FILTER PARAMETERS (all optional, combine as needed):

| Parameter      | Type                                        | Description                                    |
|----------------|---------------------------------------------|------------------------------------------------|
| type           | "song" | "artist" | "album"                | **REQUIRED**: The type of items to return      |
| field          | "artist_name" | "album_name" | "track_name" | Column to match                                |
| value          | string                                      | EXACT match (use for specific artist/album)    |
| contains       | string                                      | PARTIAL match (broader, e.g. "love", "remix") |
| timeOfDay      | "morning"|"afternoon"|"evening"|"night"|"latenight" | When played               |
| dayOfWeek      | "weekday" | "weekend"                     | Weekday vs weekend listening                   |
| recentDays     | number                                      | Only last N days (7=week, 30=month)            |
| minDurationMs  | number                                      | Songs > X ms (240000 = 4min, for epics)        |
| maxDurationMs  | number                                      | Songs < X ms (180000 = 3min, for quick hits)   |
| sortBy         | "plays" | "minutes" | "recency" | "duration" | How to rank results                   |
| sortOrder      | "highest" | "lowest"                      | Top or Bottom                                  |
| minPlays       | number                                      | Minimum play count (ensures variety)           |
| limit          | number                                      | MAX results (Default 20, Max 50)               |
| useSpotify     | boolean                                     | Set TRUE for "suggest", "find new", "search"   |
| spotifyQuery   | string                                      | Search term (e.g. "Similar to Kanye", "80s Hits")|

## SPECIAL MODES:
1. **"DISCOVER" / "SUGGEST" / "SEARCH"**:
   - If user asks to "find new songs", "search for Drake songs", "suggest music like X":
   - Set "useSpotify": true.
   - Set "spotifyQuery" to the relevant search term (Artist Name, Genre, or Vibe).
   - "type" should usually be "song".

2. **"WRAPPED" / "RECAP"**: If user asks for "Wrapped", "Daily Recap", or similar:
   - Generate 3-5 distinct categories that tell a story.
   - Example 1: "Top Artists" (type: "artist", recentDays: 30)
   - Example 2: "Morning Routine" (timeOfDay: "morning")
   - Example 3: "Late Night Vibes" (timeOfDay: "night")
   - Use creative titles like "The Punky Wrapped", "Your Day in Audio".

2. **COMPLEX QUERY**:
   - "Top Artists": Use { type: "artist", sortBy: "plays", sortOrder: "highest" }
   - "Top Albums": Use { type: "album", sortBy: "plays", sortOrder: "highest" }
   - "Longest Tracks": Use { type: "song", sortBy: "duration", sortOrder: "highest" }

## CREATIVE GUIDELINES:
- **Title Creativity**: Avoid "Top Tracks". Use "The Marathon", "Quick Hits", "Heavy Rotation".
- **Context Awareness**: Use the user's data to check if an artist exists before creating a filter.
- **Accuracy**: If user wants "Top 5 Kanye", use { field: "artist_name", value: "Kanye West", limit: 5 }.

## OUTPUT (JSON only):
Return an ARRAY of objects:
[
  {
    "title": "Creative Title 1",
    "description": "Fun 1-liner",
    "filter": { ...your filter params... }
  },
  ...
]
`;

        const userMessage = userPrompt
            ? `USER REQUEST: "${userPrompt}". Generate matching categories using the library context.`
            : `Generate a random creative category based on the user's library and current time.`;

        const response = await client.chat.completions.create({
            model: "moonshotai/kimi-k2-instruct-0905",
            messages: [
                { role: "system", content: "You are a JSON-only API. Return raw JSON. No markdown, no explanation." },
                { role: "system", content: systemInstructions },
                { role: "user", content: userMessage }
            ],
            response_format: { type: "json_object" },
            temperature: 0.8
        });

        const text = response.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(text);

        // Handle both single object and array return types from AI (just in case)
        let results = [];
        if (Array.isArray(parsed)) {
            results = parsed;
        } else if (parsed.categories && Array.isArray(parsed.categories)) {
            results = parsed.categories; // Some models wrap in a root key
        } else if (parsed.title && parsed.filter) {
            results = [parsed];
        } else {
            // Try to find array in object keys if model wrapped it weirdly
            const firstKeyArray = Object.values(parsed).find(v => Array.isArray(v));
            if (firstKeyArray) {
                results = firstKeyArray as any[];
            }
        }

        if (results.length === 0) throw new Error("AI did not return any valid categories");

        return results as AIFilterResult[];

    } catch (e: any) {
        console.error("AI Category Gen Error:", e);
        return [{
            title: "Your Heavy Rotation",
            description: `Most played tracks overall`,
            filter: { sortBy: 'plays', sortOrder: 'highest', minPlays: 2, limit: 20 },
            isError: true
        }];
    }
}


export const generateWrappedStory = async (period: string): Promise<any> => {
    try {
        const client = getAiClient();
        if (!client) throw new Error("No API Key");

        const prompt = `
            Write a short, engaging, "Spotify Wrapped" style story text for a user's listening history for the ${period}.
            Make it fun, personalized, and exciting.
            Return ONLY a JSON object:
            {
                "storyTitle": "Your ${period} in Review",
                "storyText": "You really loved...",
                "topGenre": "Pop",
                "listeningMinutes": 12050
            }
        `;

        const response = await client.chat.completions.create({
            model: "openai/gpt-oss-20b",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.7
        });

        const text = response.choices[0]?.message?.content || "{}";
        return JSON.parse(text);

    } catch (e) {
        console.error("Groq Wrapped Error:", e);
        return {
            storyTitle: `Your ${period} Recap`,
            storyText: "You listened to some great music!",
            topGenre: "Mixed",
            listeningMinutes: 0
        }
    }
}

// Generate a creative title & description for a collection of songs (The "Twist")
export const generateWrappedVibe = async (tracks: any[]): Promise<{ title: string, description: string }> => {
    try {
        const client = getAiClient();
        // Fallback if no tracks
        if (!tracks || tracks.length === 0) return { title: "The Sound of Silence", description: "You didn't listen to anything. That's a vibe I guess." };
        if (!client) return { title: "Your Collection", description: "Here are your top tracks." };

        const trackList = tracks.slice(0, 15).map(t => `${t.title} by ${t.artist}`).join('\n');

        const prompt = `
            Analyze this list of songs and create a creative, unique Category Title and a 1-sentence "Roast" or "Vibe Check" description.
            
            Songs:
            ${trackList}

            Examples:
            - Title: "Sad Boi Hours", Description: "Who hurt you? This is a lot of minor keys."
            - Title: "Main Character Energy", Description: "Walking down the street like you own it."
            - Title: "The Time Calsule", Description: "Stuck in 2016 and refusing to leave."

            Return JSON ONLY: { "title": "...", "description": "..." }
        `;

        const response = await client.chat.completions.create({
            model: "moonshotai/kimi-k2-instruct-0905",
            messages: [{ role: "system", content: "You are a witty music critic." }, { role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.8
        });

        const text = response.choices[0]?.message?.content || "{}";
        const result = JSON.parse(text);

        return {
            title: result.title || "Your Mix",
            description: result.description || "A selection of your top tracks."
        };

    } catch (e) {
        console.error("Vibe Check Error:", e);
        return { title: "Top Tracks", description: "Your most played songs for this period." };
    }
};

export interface QuizQuestion {
    question: string;
    choices: string[];
    correctIndex: number;
}

export const generateWrappedQuiz = async (stats: {
    topArtist?: string;
    topSong?: string;
    topAlbum?: string;
    totalMinutes?: number;
    totalTracks?: number;
    peakHour?: string;
}): Promise<QuizQuestion> => {
    try {
        const client = getAiClient();
        if (!client) {
            return {
                question: `How many minutes did you listen this period?`,
                choices: [
                    `${Math.round((stats.totalMinutes || 100) * 0.5)}`,
                    `${stats.totalMinutes || 100}`,
                    `${Math.round((stats.totalMinutes || 100) * 1.5)}`,
                    `${Math.round((stats.totalMinutes || 100) * 2)}`
                ],
                correctIndex: 1
            };
        }

        const prompt = `
            Generate a fun music trivia question for a user's listening wrapped/recap.
            Use these stats to create a question about their listening habits:
            - Top Artist: ${stats.topArtist || 'Unknown'}
            - Top Song: ${stats.topSong || 'Unknown'}  
            - Total Minutes: ${stats.totalMinutes || 0}
            - Total Tracks: ${stats.totalTracks || 0}
            - Peak Listening Hour: ${stats.peakHour || 'Unknown'}

            Create a multiple choice question with 4 choices. One must be correct based on the data.
            Make it fun and engaging.

            Return JSON ONLY: { "question": "...", "choices": ["A", "B", "C", "D"], "correctIndex": 0 }
            correctIndex is 0-based index of the correct answer.
        `;

        const response = await client.chat.completions.create({
            model: "moonshotai/kimi-k2-instruct-0905",
            messages: [{ role: "system", content: "You are a fun music quiz host." }, { role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.7
        });

        const text = response.choices[0]?.message?.content || "{}";
        const result = JSON.parse(text);

        return {
            question: result.question || "How well do you know your music?",
            choices: result.choices || ["A", "B", "C", "D"],
            correctIndex: typeof result.correctIndex === 'number' ? result.correctIndex : 0
        };
    } catch (e) {
        console.error("Quiz Generation Error:", e);
        const correctAnswer = stats.topArtist || 'Artist A';
        const choices = [
            correctAnswer,
            'Taylor Swift',
            'Drake',
            'The Weeknd'
        ].sort(() => Math.random() - 0.5);
        return {
            question: `Who was your #1 most played artist?`,
            choices,
            correctIndex: choices.indexOf(correctAnswer)
        };
    }
};

// Generate fruit vibe - AI categorizes music taste as a fruit
export interface FruitVibe {
    fruit: string;
    emoji: string;
    description: string;
    topSongs: string[];
}

export const generateFruitVibe = async (tracks: any[]): Promise<FruitVibe> => {
    const fallback: FruitVibe = {
        fruit: 'Mango',
        emoji: '🥭',
        description: "Your vibe was sweet like a mango — full of happy, upbeat tracks",
        topSongs: tracks.slice(0, 3).map(t => `${t.title} by ${t.artist}`)
    };

    try {
        const client = getAiClient();
        if (!tracks || tracks.length === 0) return fallback;
        if (!client) return fallback;

        const trackList = tracks.slice(0, 15).map(t => `${t.title} by ${t.artist}`).join('\n');

        const prompt = `
            Analyze this list of songs and determine what FRUIT best represents this person's music taste.
            Choose from common fruits like: Mango, Strawberry, Watermelon, Cherry, Peach, Lemon, Grape, Orange, Apple, Banana, Kiwi, Pineapple, Coconut, Blueberry, Pomegranate, Dragon Fruit, Avocado.
            
            Match the fruit to the VIBE of the music:
            - Mango = sweet, upbeat, happy
            - Strawberry = romantic, soft, dreamy
            - Watermelon = refreshing, summer vibes, carefree
            - Cherry = bold, confident, sassy
            - Peach = warm, nostalgic, soulful
            - Lemon = energetic, sharp, punk/rock
            - Grape = smooth, chill, R&B/jazz
            - Pineapple = tropical, adventurous, eclectic
            - Coconut = laid-back, beachy, indie
            - Dragon Fruit = experimental, unique, avant-garde
            - Pomegranate = complex, layered, deep emotions
            - Avocado = trendy, versatile, well-rounded

            Songs:
            ${trackList}

            Pick the top 3 songs that most shaped this fruit choice.

            Return JSON ONLY: { "fruit": "Mango", "emoji": "🥭", "description": "Your vibe was sweet like a mango — full of happy, upbeat tracks", "topSongs": ["Song by Artist", "Song by Artist", "Song by Artist"] }
        `;

        const response = await client.chat.completions.create({
            model: "moonshotai/kimi-k2-instruct-0905",
            messages: [
                { role: "system", content: "You are a creative music analyst who matches music vibes to fruits. Be playful and fun." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.8
        });

        const text = response.choices[0]?.message?.content || "{}";
        const result = JSON.parse(text);

        return {
            fruit: result.fruit || fallback.fruit,
            emoji: result.emoji || fallback.emoji,
            description: result.description || fallback.description,
            topSongs: result.topSongs || fallback.topSongs
        };
    } catch (e) {
        console.error("Fruit Vibe Error:", e);
        return fallback;
    }
};

// WRAPPED TOOL CALLING - AI generates wrapped using function calls
export interface WrappedToolResult {
    slides: WrappedSlide[];
    stats: {
        totalMinutes: number;
        totalTracks: number;
        topArtist: { name: string; plays: number; image: string } | null;
        topSong: { title: string; artist: string; plays: number; cover: string } | null;
        topAlbum: { title: string; artist: string; plays: number; cover: string } | null;
        peakHour: string;
        topGenreGuess: string;
    };
}

export interface WrappedSlide {
    id: string;
    type: 'intro' | 'stat' | 'top_artist' | 'top_song' | 'top_album' | 'listening_time' | 'peak_hour' | 'vibe' | 'outro';
    title: string;
    subtitle?: string;
    value?: string | number;
    image?: string;
    gradient?: string;
}

const WRAPPED_TOOLS = [
    {
        type: "function" as const,
        function: {
            name: "get_wrapped_stats",
            description: "Get the user's listening statistics for their Wrapped summary. Returns top artists, songs, albums, total minutes, and listening patterns.",
            parameters: {
                type: "object",
                properties: {
                    period: {
                        type: "string",
                        enum: ["daily", "weekly", "monthly", "yearly"],
                        description: "The time period for the wrapped stats"
                    }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "generate_vibe_check",
            description: "Generate a creative 'vibe check' title and description based on the user's top tracks",
            parameters: {
                type: "object",
                properties: {
                    tracks: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of track names with artists (e.g., 'Song Title by Artist')"
                    }
                },
                required: ["tracks"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "build_wrapped_slides",
            description: "Build the final wrapped presentation slides",
            parameters: {
                type: "object",
                properties: {
                    slides: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                type: { type: "string", enum: ["intro", "stat", "top_artist", "top_song", "top_album", "listening_time", "peak_hour", "vibe", "outro"] },
                                title: { type: "string" },
                                subtitle: { type: "string" },
                                value: { type: "string" }
                            },
                            required: ["type", "title"]
                        },
                        description: "Array of slide objects for the wrapped presentation"
                    }
                },
                required: ["slides"]
            }
        }
    }
];

export const generateWrappedWithTools = async (
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    fetchStats: (period: string) => Promise<any>
): Promise<WrappedToolResult | null> => {
    try {
        const client = getAiClient();
        if (!client) return null;

        // Step 1: Let AI decide what to fetch
        const initialMessages: any[] = [
            {
                role: "system",
                content: `You are the Wrapped Generator AI. Your job is to create an engaging, personalized music wrapped experience.
                
                WORKFLOW:
                1. First call get_wrapped_stats to fetch the user's listening data
                2. Then call generate_vibe_check with their top tracks to get a creative title
                3. Finally call build_wrapped_slides to create the presentation
                
                Be creative with slide titles! Make them fun and personalized.`
            },
            {
                role: "user",
                content: `Create a ${period} wrapped experience for me. Start by fetching my stats.`
            }
        ];

        let messages = [...initialMessages];
        let finalSlides: WrappedSlide[] = [];
        let stats: any = null;
        let vibeResult: { title: string; description: string } | null = null;
        let iterations = 0;
        const MAX_ITERATIONS = 5;

        // Tool execution loop
        while (iterations < MAX_ITERATIONS) {
            iterations++;

            const response = await client.chat.completions.create({
                model: "moonshotai/kimi-k2-instruct-0905",
                messages,
                tools: WRAPPED_TOOLS,
                tool_choice: "auto"
            });

            const assistantMessage = response.choices[0]?.message;
            if (!assistantMessage) break;

            messages.push(assistantMessage);

            // Check if AI wants to call tools
            if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
                for (const toolCall of assistantMessage.tool_calls) {
                    const funcName = toolCall.function.name;
                    const funcArgs = JSON.parse(toolCall.function.arguments || "{}");

                    let toolResult: any = {};

                    if (funcName === "get_wrapped_stats") {
                        // Execute the stats fetch
                        stats = await fetchStats(funcArgs.period || period);
                        toolResult = {
                            success: !!stats,
                            totalMinutes: stats?.totalMinutes || 0,
                            totalTracks: stats?.totalTracks || 0,
                            topArtist: stats?.topArtist || null,
                            topSong: stats?.topSong || null,
                            topTracks: stats?.topTracks?.slice(0, 10).map((t: any) => `${t.title} by ${t.artist}`) || []
                        };
                    } else if (funcName === "generate_vibe_check") {
                        // Generate vibe from tracks
                        const tracks = funcArgs.tracks || [];
                        if (tracks.length > 0) {
                            vibeResult = await generateWrappedVibe(
                                tracks.map((t: string) => {
                                    const parts = t.split(' by ');
                                    return { title: parts[0], artist: parts[1] || 'Unknown' };
                                })
                            );
                        }
                        toolResult = vibeResult || { title: "Your Vibe", description: "Music that defines you." };
                    } else if (funcName === "build_wrapped_slides") {
                        // Build final slides with data
                        const rawSlides = funcArgs.slides || [];
                        finalSlides = rawSlides.map((s: any, idx: number) => ({
                            id: `slide-${idx}`,
                            type: s.type || 'stat',
                            title: s.title || '',
                            subtitle: s.subtitle || '',
                            value: s.value || '',
                            image: s.type === 'top_artist' ? stats?.topArtist?.image : 
                                   s.type === 'top_song' ? stats?.topSong?.cover :
                                   s.type === 'top_album' ? stats?.topAlbum?.cover : undefined,
                            gradient: getGradientForSlide(s.type)
                        }));
                        toolResult = { slides_created: finalSlides.length };
                    }

                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(toolResult)
                    });
                }
            } else {
                // No more tool calls, we're done
                break;
            }
        }

        // Ensure we have slides
        if (finalSlides.length === 0 && stats) {
            // Fallback: build default slides
            finalSlides = buildDefaultWrappedSlides(stats, vibeResult, period);
        }

        return {
            slides: finalSlides,
            stats: {
                totalMinutes: stats?.totalMinutes || 0,
                totalTracks: stats?.totalTracks || 0,
                topArtist: stats?.topArtist || null,
                topSong: stats?.topSong || null,
                topAlbum: null,
                peakHour: "Evening",
                topGenreGuess: vibeResult?.title || "Mixed"
            }
        };

    } catch (e) {
        console.error("Wrapped Tool Calling Error:", e);
        return null;
    }
};

function getGradientForSlide(type: string): string {
    const gradients: Record<string, string> = {
        intro: 'from-purple-600 via-pink-500 to-red-500',
        top_artist: 'from-green-600 via-emerald-500 to-teal-500',
        top_song: 'from-blue-600 via-indigo-500 to-purple-500',
        top_album: 'from-orange-600 via-amber-500 to-yellow-500',
        listening_time: 'from-cyan-600 via-blue-500 to-indigo-500',
        stat: 'from-rose-600 via-pink-500 to-fuchsia-500',
        vibe: 'from-violet-600 via-purple-500 to-indigo-500',
        peak_hour: 'from-amber-600 via-orange-500 to-red-500',
        outro: 'from-gray-800 via-gray-700 to-gray-600'
    };
    return gradients[type] || 'from-gray-700 to-gray-900';
}

function buildDefaultWrappedSlides(stats: any, vibe: any, period: string): WrappedSlide[] {
    const slides: WrappedSlide[] = [
        {
            id: 'intro',
            type: 'intro',
            title: `Your ${period.charAt(0).toUpperCase() + period.slice(1)} Wrapped`,
            subtitle: "Let's see what you've been listening to",
            gradient: getGradientForSlide('intro')
        }
    ];

    if (stats?.totalMinutes) {
        slides.push({
            id: 'time',
            type: 'listening_time',
            title: 'Minutes of Music',
            value: stats.totalMinutes.toLocaleString(),
            subtitle: `That's ${Math.round(stats.totalMinutes / 60)} hours of vibes`,
            gradient: getGradientForSlide('listening_time')
        });
    }

    if (stats?.topArtist) {
        slides.push({
            id: 'artist',
            type: 'top_artist',
            title: 'Your #1 Artist',
            value: stats.topArtist.name,
            subtitle: `${stats.topArtist.count} plays`,
            image: stats.topArtist.image,
            gradient: getGradientForSlide('top_artist')
        });
    }

    if (stats?.topSong) {
        slides.push({
            id: 'song',
            type: 'top_song',
            title: 'Most Played Track',
            value: stats.topSong.title,
            subtitle: `by ${stats.topSong.artist} • ${stats.topSong.count} plays`,
            image: stats.topSong.cover,
            gradient: getGradientForSlide('top_song')
        });
    }

    if (vibe) {
        slides.push({
            id: 'vibe',
            type: 'vibe',
            title: vibe.title,
            subtitle: vibe.description,
            gradient: getGradientForSlide('vibe')
        });
    }

    slides.push({
        id: 'outro',
        type: 'outro',
        title: 'Keep Listening',
        subtitle: 'Your next wrapped is already in the making',
        gradient: getGradientForSlide('outro')
    });

    return slides;
}


export const generateTopAlbumFunFact = async (album: { title: string; artist: string; plays?: number; trackCount?: number }): Promise<string> => {
    try {
        const client = getAiClient();
        if (!client) return "This album basically became your co-pilot this week.";

        const response = await client.chat.completions.create({
            model: "llama-3.1-8b-instant",
            temperature: 0.9,
            max_tokens: 80,
            messages: [
                {
                    role: "system",
                    content: "You write one playful fun fact about a listener's top album. Keep it under 24 words, confident, and never mention being an AI."
                },
                {
                    role: "user",
                    content: `Top album: ${album.title} by ${album.artist}. Plays: ${album.plays || 0}. Track count in listening set: ${album.trackCount || 0}.`
                }
            ]
        });

        const content = response.choices?.[0]?.message?.content?.trim();
        return content || "This album had main-character energy in your week.";
    } catch {
        return "This album had main-character energy in your week.";
    }
};
