import { Mistral } from "@mistralai/mistralai";
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

// Initialize Mistral lazily
const getAiClient = () => {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_MISTRAL_API_KEY || import.meta.env.VITE_GROQ_API_KEY || '';
    if (!apiKey) return null;

    return new Mistral({ apiKey });
};

// ─── AI MODEL DEFINITIONS ────────────────────────────────────────
export interface AIModel {
    id: string;
    label: string;
    isReasoning: boolean;
}

export const AI_MODELS: AIModel[] = [
    { id: "mistral-medium-latest", label: "Mistral Medium", isReasoning: false },
    { id: "mistral-large-latest", label: "Mistral Large", isReasoning: false },
    { id: "mistral-small-latest", label: "Mistral Small", isReasoning: false },
    { id: "codestral-latest", label: "Codestral", isReasoning: false },
    { id: "ministral-14b-latest", label: "Ministral 14B", isReasoning: false },
];

export const DEFAULT_MODEL_ID = "mistral-medium-latest";

const trimToolPayload = (payload: any): any => {
    if (!payload) return payload;

    if (Array.isArray(payload)) {
        return payload.slice(0, 8).map(item => trimToolPayload(item));
    }

    if (typeof payload === 'object') {
        const clone: any = {};
        Object.keys(payload).forEach((key) => {
            const val = payload[key];
            if (typeof val === 'string') {
                clone[key] = val.length > 150 ? `${val.slice(0, 147)}...` : val;
            } else {
                clone[key] = trimToolPayload(val);
            }
        });
        return clone;
    }

    return payload;
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

// ─── AGENT TOOL DEFINITIONS (JSON Schema Format) ──────────────────────
const TOOL_DEFINITIONS = [
    {
        name: "get_top_songs",
        description: "Get the user's top songs/tracks.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"] },
                limit: { type: "number" },
                artist_filter: { type: "string" }
            },
            required: ["period"]
        }
    },
    {
        name: "get_top_artists",
        description: "Get the user's top artists.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"] },
                limit: { type: "number" }
            },
            required: ["period"]
        }
    },
    {
        name: "get_top_albums",
        description: "Get the user's top albums.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"] },
                limit: { type: "number" }
            },
            required: ["period"]
        }
    },
    {
        name: "get_listening_time",
        description: "Get the user's total listening time and stats.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"] }
            },
            required: ["period"]
        }
    },
    {
        name: "get_obsession_orbit",
        description: "Get the user's Obsession Orbit.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["daily", "weekly", "monthly"] },
                artist_name: { type: "string" }
            },
            required: ["period"]
        }
    },
    {
        name: "get_artist_streak",
        description: "Get streak information for an artist.",
        parameters: {
            type: "object",
            properties: {
                artist_name: { type: "string" },
                period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"] }
            },
            required: ["artist_name", "period"]
        }
    },
    {
        name: "get_listening_percentage",
        description: "Calculate what percentage of listening time a specific artist, song, or album takes up.",
        parameters: {
            type: "object",
            properties: {
                entity_type: { type: "string", enum: ["artist", "song", "album"] },
                entity_name: { type: "string" },
                period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"] }
            },
            required: ["entity_type", "entity_name", "period"]
        }
    },
    {
        name: "get_upcoming_artists",
        description: "Get radar/upcoming/new artists the user recently discovered.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["daily", "weekly", "monthly"] }
            },
            required: ["period"]
        }
    },
    {
        name: "get_peak_listening_hour",
        description: "Get the hour of day when the user listens to music the most.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["daily", "weekly", "monthly"] }
            },
            required: ["period"]
        }
    },
    {
        name: "get_rising_star",
        description: "Get the artist with the biggest increase in plays compared to previous period.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["daily", "weekly", "monthly"] }
            },
            required: ["period"]
        }
    },
    {
        name: "get_late_night_anthem",
        description: "Get the song the user plays most during late night hours (1AM-5AM).",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["daily", "weekly", "monthly"] }
            },
            required: ["period"]
        }
    },
    {
        name: "get_most_skipped",
        description: "Get the song the user skips the most.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["daily", "weekly", "monthly"] }
            },
            required: ["period"]
        }
    },
    {
        name: "get_charts",
        description: "Get the current music charts showing trending songs.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["daily", "weekly", "monthly", "all time"] }
            },
            required: ["period"]
        }
    },
    {
        name: "get_wrapped_overview",
        description: "Get a wrapped-style summary.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["daily", "weekly", "monthly"] }
            },
            required: ["period"]
        }
    },
    {
        name: "search_spotify_tracks",
        description: "Search Spotify tracks by keyword.",
        parameters: {
            type: "object",
            properties: {
                query: { type: "string" },
                limit: { type: "number" }
            },
            required: ["query"]
        }
    },
    {
        name: "filter_songs",
        description: "Filter songs by various criteria.",
        parameters: {
            type: "object",
            properties: {
                type: { type: "string", enum: ["song", "artist", "album"] },
                field: { type: "string", enum: ["artist_name", "album_name", "track_name"] },
                value: { type: "string" },
                contains: { type: "string" },
                time_of_day: { type: "string", enum: ["morning", "afternoon", "evening", "night", "latenight"] },
                day_of_week: { type: "string", enum: ["weekday", "weekend"] },
                recent_days: { type: "number" },
                sort_by: { type: "string", enum: ["plays", "minutes", "recency", "duration"] },
                sort_order: { type: "string", enum: ["highest", "lowest"] },
                limit: { type: "number" }
            },
            required: ["type"]
        }
    },
    {
        name: "fetch_image",
        description: "Fetch the image/artwork URL for an artist or album.",
        parameters: {
            type: "object",
            properties: {
                name: { type: "string" },
                type: { type: "string", enum: ["artist", "album"] }
            },
            required: ["name"]
        }
    },
    {
        name: "get_heatmap_data",
        description: "Get the user's listening activity heatmap data.",
        parameters: {
            type: "object",
            properties: {
                days: { type: "number" }
            },
            required: []
        }
    },
    {
        name: "get_artist_network",
        description: "Get artist connection/network data.",
        parameters: {
            type: "object",
            properties: {
                limit: { type: "number" }
            },
            required: []
        }
    },
    {
        name: "get_genre_breakdown",
        description: "Get an estimated genre breakdown.",
        parameters: {
            type: "object",
            properties: {
                period: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"] }
            },
            required: []
        }
    },
    {
        name: "get_recent_plays",
        description: "Get the user's most recently played tracks.",
        parameters: {
            type: "object",
            properties: {
                limit: { type: "number" }
            },
            required: []
        }
    },
    {
        name: "compare_periods",
        description: "Compare listening stats between two time periods.",
        parameters: {
            type: "object",
            properties: {
                period_a: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"] },
                period_b: { type: "string", enum: ["Daily", "Weekly", "Monthly", "All Time"] }
            },
            required: ["period_a", "period_b"]
        }
    },
    {
        name: "get_album_covers",
        description: "Fetch album cover artwork URLs.",
        parameters: {
            type: "object",
            properties: {
                names: { type: "array", items: { type: "string" } }
            },
            required: ["names"]
        }
    },
    {
        name: "compare_artist_performance",
        description: "Compare an artist's stats across two periods.",
        parameters: {
            type: "object",
            properties: {
                artist_name: { type: "string" },
                period_a: { type: "string" },
                period_b: { type: "string" }
            },
            required: ["artist_name", "period_a", "period_b"]
        }
    },
    {
        name: "get_rank_shift",
        description: "Shows how many spots an artist/song climbed or fell.",
        parameters: {
            type: "object",
            properties: {
                entity_name: { type: "string" },
                entity_type: { type: "string", enum: ["artist", "song"] },
                time_range: { type: "string", enum: ["daily", "weekly", "monthly"] }
            },
            required: ["entity_name", "entity_type"]
        }
    },
    {
        name: "get_loyalty_score",
        description: "Returns the ratio of this artist's plays vs. all other artists.",
        parameters: {
            type: "object",
            properties: {
                artist_name: { type: "string" }
            },
            required: ["artist_name"]
        }
    },
    {
        name: "get_market_share",
        description: "Returns a breakdown of what percentage of the 'total pie' an entity owns.",
        parameters: {
            type: "object",
            properties: {
                entity_type: { type: "string", enum: ["artist", "genre"] }
            },
            required: ["entity_type"]
        }
    },
    {
        name: "get_discovery_date",
        description: "Finds the exact timestamp and track of the user's very first interaction with an artist.",
        parameters: {
            type: "object",
            properties: {
                artist_name: { type: "string" }
            },
            required: ["artist_name"]
        }
    },
    {
        name: "get_binge_sessions",
        description: "Identifies 'binge' events where the user listened to one artist for a long continuous block.",
        parameters: {
            type: "object",
            properties: {
                threshold_minutes: { type: "number" }
            },
            required: []
        }
    },
    {
        name: "get_one_hit_wonders",
        description: "Finds artists where the user loves exactly ONE song but never listens to the rest.",
        parameters: {
            type: "object",
            properties: {
                min_plays: { type: "number" }
            },
            required: []
        }
    },
    {
        name: "get_album_completionist",
        description: "Checks if the user listens to full albums.",
        parameters: {
            type: "object",
            properties: {
                album_name: { type: "string" }
            },
            required: ["album_name"]
        }
    },
    {
        name: "get_earworm_report",
        description: "Finds the song the user has 'looped' the most in a short window.",
        parameters: {
            type: "object",
            properties: {
                days_back: { type: "number" }
            },
            required: []
        }
    },
    {
        name: "get_work_vs_play_stats",
        description: "Compares top genres/artists during weekdays vs. weekends.",
        parameters: { type: "object", properties: {}, required: [] }
    },
    {
        name: "get_seasonal_vibe",
        description: "Analyzes if the user's music taste changes based on the season.",
        parameters: {
            type: "object",
            properties: {
                season: { type: "string", enum: ["Summer", "Winter", "Spring", "Fall"] }
            },
            required: ["season"]
        }
    },
    {
        name: "get_anniversary_flashback",
        description: "Returns what the user was listening to exactly one year ago today.",
        parameters: {
            type: "object",
            properties: {
                date: { type: "string" }
            },
            required: []
        }
    },
    {
        name: "get_commute_soundtrack",
        description: "Analyzes specific activity during common commute hours.",
        parameters: { type: "object", properties: {}, required: [] }
    },
    {
        name: "get_sleep_pattern",
        description: "Detects when the user stops listening at night and what 'sleep' music they use.",
        parameters: { type: "object", properties: {}, required: [] }
    },
    {
        name: "get_diversity_index",
        description: "Measures how 'adventurous' the user is.",
        parameters: {
            type: "object",
            properties: {
                time_range: { type: "string", enum: ["daily", "weekly", "monthly"] }
            },
            required: []
        }
    },
    {
        name: "get_genre_evolution",
        description: "Shows how the user's favorite genre has changed month-over-month.",
        parameters: {
            type: "object",
            properties: {
                months: { type: "number" }
            },
            required: []
        }
    },
    {
        name: "get_skip_rate_by_artist",
        description: "Specifically checks if a user skips an artist's songs more than others.",
        parameters: {
            type: "object",
            properties: {
                artist_name: { type: "string" }
            },
            required: ["artist_name"]
        }
    },
    {
        name: "get_gateway_tracks",
        description: "Identifies the specific song that 'hooked' the user.",
        parameters: {
            type: "object",
            properties: {
                artist_name: { type: "string" }
            },
            required: ["artist_name"]
        }
    },
    {
        name: "get_top_collaborations",
        description: "Finds which artists are most frequently played in the same listening session.",
        parameters: { type: "object", properties: {}, required: [] }
    },
    {
        name: "get_milestone_tracker",
        description: "Tracks progress toward a milestone.",
        parameters: {
            type: "object",
            properties: {
                target_plays: { type: "number" },
                artist_name: { type: "string" }
            },
            required: ["target_plays"]
        }
    },
    {
        name: "get_obsession_score",
        description: "Get obsession score for an artist.",
        parameters: {
            type: "object",
            properties: {
                artist_name: { type: "string" },
                start_date: { type: "string" },
                end_date: { type: "string" }
            },
            required: []
        }
    }
];

const AGENT_TOOLS = TOOL_DEFINITIONS.map(tool => ({
    type: "function",
    function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
    }
}));

// ─── TOOL ICON MAP ──────────────────────────────────────────────
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
                const limit = Math.min(funcArgs.limit || 8, 20);
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
                const limit = Math.min(funcArgs.limit || 8, 20);
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
                const limit = Math.min(funcArgs.limit || 8, 20);
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
                return { period, new_artists: radar || [] };
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
                    charts: (charts || []).slice(0, 10).map((c: any) => ({
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
                    hourly_distribution: Object.fromEntries(Object.entries(hourCounts).sort((a, b) => Number(a[0]) - Number(b[0]))),
                    daily_distribution: Object.fromEntries(Object.entries(dayCounts).map(([d, c]) => [dayNames[Number(d)], c]).sort((a, b) => (b[1] as number) - (a[1] as number))),
                    peak_hour: peakHour ? { hour: Number(peakHour[0]), label: `${Number(peakHour[0]) % 12 || 12}${Number(peakHour[0]) < 12 ? 'AM' : 'PM'}`, plays: peakHour[1] } : null,
                    peak_day: peakDay ? { day: dayNames[Number(peakDay[0])], plays: peakDay[1] } : null,
                };
            }
            case 'get_artist_network': {
                const limit = Math.min(funcArgs.limit || 500, 1000);
                const network = await fetchArtistNetwork(limit);
                const artistList = Object.values(network.artistInfo).sort((a: any, b: any) => b.count - a.count).slice(0, 20);
                const pairList: { artist_a: string; artist_b: string; strength: number }[] = [];
                for (const [a, connections] of Object.entries(network.pairs)) {
                    for (const [b, count] of Object.entries(connections as Record<string, number>)) {
                        if (a < b) pairList.push({ artist_a: a, artist_b: b, strength: count });
                    }
                }
                pairList.sort((a, b) => b.strength - a.strength);
                return { top_artists: artistList.map((a: any) => ({ name: a.name, plays: a.count })), top_connections: pairList.slice(0, 15), total_artists: Object.keys(network.artistInfo).length };
            }
            case 'get_genre_breakdown': {
                const period = funcArgs.period || 'Weekly';
                const stats = await fetchDashboardStats(period as any);
                const artists = (stats.artists || []).slice(0, 30);
                const genreCounts: Record<string, number> = {};
                artists.forEach((a: any) => {
                    const genres = a.genres || [];
                    const weight = a.totalListens || 1;
                    if (genres.length === 0) genreCounts['Unknown'] = (genreCounts['Unknown'] || 0) + weight;
                    genres.forEach((g: string) => genreCounts[g] = (genreCounts[g] || 0) + weight);
                });
                const totalWeight = Object.values(genreCounts).reduce((a, b) => a + b, 0);
                const genreList = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([genre, count]) => ({ genre, count, percentage: totalWeight > 0 ? Math.round((count / totalWeight) * 1000) / 10 : 0 }));
                return { period, genres: genreList, total_artists_analyzed: artists.length };
            }
            case 'get_recent_plays': {
                const limit = Math.min(funcArgs.limit || 8, 20);
                const stats = await fetchDashboardStats('Daily');
                const recentPlays = (stats.recentPlays || stats.songs || []).slice(0, limit);
                return { count: recentPlays.length, plays: recentPlays.map((p: any, i: number) => ({ rank: i + 1, title: p.title || p.track_name || p.name, artist: p.artist || p.artist_name, album: p.album || p.album_name || null, cover: p.cover || p.album_cover || p.image || null, played_at: p.played_at || p.lastPlayed || null })) };
            }
            case 'compare_periods': {
                const periodA = funcArgs.period_a || 'Weekly';
                const periodB = funcArgs.period_b || 'Monthly';
                const [statsA, statsB] = await Promise.all([fetchDashboardStats(periodA as any), fetchDashboardStats(periodB as any)]);
                const totalMinsA = (statsA.songs || []).reduce((acc: number, s: any) => acc + (s.timeStr ? parseInt(s.timeStr.replace(/[^0-9]/g, ''), 10) : 0), 0);
                const totalMinsB = (statsB.songs || []).reduce((acc: number, s: any) => acc + (s.timeStr ? parseInt(s.timeStr.replace(/[^0-9]/g, ''), 10) : 0), 0);
                return {
                    period_a: { label: periodA, total_songs: (statsA.songs || []).length, total_artists: (statsA.artists || []).length, total_albums: (statsA.albums || []).length, total_minutes: totalMinsA, top_artist: statsA.artists?.[0]?.name || null, top_song: statsA.songs?.[0]?.title || null },
                    period_b: { label: periodB, total_songs: (statsB.songs || []).length, total_artists: (statsB.artists || []).length, total_albums: (statsB.albums || []).length, total_minutes: totalMinsB, top_artist: statsB.artists?.[0]?.name || null, top_song: statsB.songs?.[0]?.title || null },
                    comparison: { minutes_diff: totalMinsA - totalMinsB, songs_diff: (statsA.songs || []).length - (statsB.songs || []).length, artists_diff: (statsA.artists || []).length - (statsB.artists || []).length }
                };
            }
            case 'get_album_covers': {
                if (!token) return { covers: [], error: 'No Spotify token available' };
                const names = funcArgs.names || [];
                try {
                    const images = await fetchArtistImages(token, names);
                    return { count: Object.keys(images).length, covers: Object.entries(images).map(([name, url]) => ({ name, image_url: url })) };
                } catch { return { covers: [], error: 'Failed to fetch album covers' }; }
            }
            case 'compare_artist_performance': { return (await compareArtistPerformance(funcArgs.artist_name, funcArgs.period_a, funcArgs.period_b)) || { error: 'No data found' }; }
            case 'get_rank_shift': { return (await getRankShift(funcArgs.entity_name, funcArgs.entity_type, funcArgs.time_range || 'weekly')) || { error: 'No ranking data found' }; }
            case 'get_loyalty_score': { return (await getLoyaltyScore(funcArgs.artist_name)) || { error: 'No loyalty data found' }; }
            case 'get_market_share': { return (await getMarketShare(funcArgs.entity_type)) || { error: 'No market share data available' }; }
            case 'get_discovery_date': { return (await getDiscoveryDate(funcArgs.artist_name)) || { error: 'No discovery date found' }; }
            case 'get_binge_sessions': { return (await getBingeSessions(funcArgs.threshold_minutes || 60)) || { error: 'No binge sessions found' }; }
            case 'get_one_hit_wonders': { return (await getOneHitWonders(funcArgs.min_plays || 5)) || { error: 'No one-hit wonders found' }; }
            case 'get_album_completionist': { return (await getAlbumCompletionist(funcArgs.album_name)) || { error: 'No album completion data found' }; }
            case 'get_earworm_report': { return (await getEarwormReport(funcArgs.days_back || 7)) || { error: 'No earworm data found' }; }
            case 'get_work_vs_play_stats': { return (await getWorkVsPlayStats()) || { error: 'No work vs play data available' }; }
            case 'get_seasonal_vibe': { return (await getSeasonalVibe(funcArgs.season)) || { error: 'No seasonal data available' }; }
            case 'get_anniversary_flashback': { return (await getAnniversaryFlashback(funcArgs.date)) || { error: 'No anniversary data found' }; }
            case 'get_commute_soundtrack': { return (await getCommuteSoundtrack()) || { error: 'No commute data available' }; }
            case 'get_sleep_pattern': { return (await getSleepPattern()) || { error: 'No sleep pattern data found' }; }
            case 'get_diversity_index': { return (await getDiversityIndex(funcArgs.time_range || 'monthly')) || { error: 'No diversity data available' }; }
            case 'get_genre_evolution': { return (await getGenreEvolution(funcArgs.months || 6)) || { error: 'No genre evolution data found' }; }
            case 'get_skip_rate_by_artist': { return (await getSkipRateByArtist(funcArgs.artist_name)) || { error: 'No skip rate data found' }; }
            case 'get_gateway_tracks': { return (await getGatewayTracks(funcArgs.artist_name)) || { error: 'No gateway tracks found' }; }
            case 'get_top_collaborations': { return (await getTopCollaborations()) || { error: 'No collaboration data available' }; }
            case 'get_milestone_tracker': { return (await getMilestoneTracker(funcArgs.target_plays, funcArgs.artist_name)) || { error: 'No milestone tracking data available' }; }
            case 'get_obsession_score': { return (await getObsessionScore(funcArgs.artist_name, funcArgs.start_date, funcArgs.end_date)) || { error: 'No obsession score data found' }; }

            default: return { error: `Unknown tool: ${funcName}` };
        }
    } catch (error: any) {
        console.error(`[agentTools] Error executing ${funcName}:`, error);
        return { error: error.message || 'Tool execution failed' };
    }
}

// ─── AGENT SYSTEM PROMPT ─────────────────────────────────────────
const AGENT_SYSTEM_PROMPT = `You are **Lotus**, the AI music analytics agent.

**CORE DIRECTIVE:**
Answer user questions about their music listening habits using the provided tools.
You have access to a SQL database of the user's Spotify history and can fetch live data from Spotify.

**CAPABILITIES:**
- **Dashboard Stats**: Top artists, songs, albums, listening time (Daily/Weekly/Monthly/All Time).
- **Deep Analysis**: Obsession Orbit, Artist Streaks, Listening Percentages, Heatmaps.
- **Discovery**: Upcoming artists (Radar), Rising Stars, Genre Breakdown.
- **Fun Stats**: Late Night Anthem, Most Skipped, One-Hit Wonders, Earworms.
- **Comparisons**: Compare two time periods or two artists.
- **Spotify Search**: You can search for tracks on Spotify.

**RULES:**
1.  **Always use tools** when the user asks for their data. Do not hallucinate stats.
2.  If a tool returns no data, explain that to the user clearly.
3.  Be concise and witty in your final response.
4.  Use Markdown for the final response (bold, lists, etc.).
5.  If the user asks a general question unrelated to their data, use your knowledge.
`;

// ─── MAIN AGENT FUNCTION (Streamed) ──────────────────────────────
export interface StreamChunk {
    type: 'text' | 'tool-call' | 'tool-result' | 'grounding' | 'thinking';
    content?: string;
    toolCall?: ToolCallInfo;
    groundingMetadata?: any;
}

export const streamMusicQuestionWithTools = async (
    question: string,
    context: any,
    onChunk: (chunk: StreamChunk) => void,
    token?: string | null,
    modelId?: string,
    webSearchEnabled?: boolean
) => {
    console.log('[agentTools] streamMusicQuestionWithTools called', { question, modelId, webSearchEnabled });

    try {
        const client = getAiClient();
        if (!client) {
            onChunk({ type: 'text', content: "Configure VITE_MISTRAL_API_KEY to use chat features." });
            return;
        }

        const selectedModelId = modelId || DEFAULT_MODEL_ID;

        // Conversation history
        const messages: any[] = [
            {
                role: "system",
                content: AGENT_SYSTEM_PROMPT
            },
            {
                role: "assistant",
                content: "I understand. I am Lotus, ready to analyze music data."
            },
            {
                role: "user",
                content: `User: ${context.userName || 'Unknown'} | Date: ${new Date().toLocaleString()} | Quick context: Top artists include ${context.artists.slice(0, 5).join(', ')}. Weekly time: ${context.globalStats?.weeklyTime || '?'}. \n\nQuestion: ${question}`
            }
        ];

        let continueLoop = true;

        while (continueLoop) {
            const tools: any[] = [...AGENT_TOOLS];
            if (webSearchEnabled) {
                tools.push({ type: 'web_search' });
            }

            const stream = await client.chat.stream({
                model: selectedModelId,
                messages: messages,
                // @ts-ignore
                tools: tools,
            });

            let toolCallsBuffer: any[] = [];
            let currentContent = "";

            for await (const chunk of stream) {
                // Log chunk for debugging
                console.log('[Mistral Stream Chunk]', JSON.stringify(chunk, null, 2));

                const choice = (chunk as any).data?.choices?.[0] || chunk.choices?.[0];
                if (!choice) continue;

                const delta = choice.delta;

                // Handle thinking content (new Mistral models)
                if ((delta as any).thinking) {
                    onChunk({ type: 'thinking', content: (delta as any).thinking as string });
                }

                // Handle text/content
                if (delta.content) {
                    if (typeof delta.content === 'string') {
                        currentContent += delta.content;
                        onChunk({ type: 'text', content: delta.content });
                    } else if (Array.isArray(delta.content)) {
                        // Handle array content (structured output for reasoning models)
                        for (const part of delta.content) {
                            if (part.type === 'text' && part.text) {
                                currentContent += part.text;
                                onChunk({ type: 'text', content: part.text });
                            } else if (part.type === 'thinking') {
                                // Handle thinking part
                                // Based on user doc: "thinking": [ { "type": "text", "text": "..." } ]
                                if (typeof part.thinking === 'string') {
                                    onChunk({ type: 'thinking', content: part.thinking });
                                } else if (Array.isArray(part.thinking)) {
                                    for (const p of part.thinking) {
                                        if (p.type === 'text' && p.text) {
                                            onChunk({ type: 'thinking', content: p.text });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Handle tool calls
                if (delta.toolCalls) {
                    const toolCalls = delta.toolCalls;
                    if (Array.isArray(toolCalls)) {
                       toolCalls.forEach((toolCall: any) => {
                           const index = toolCall.index || 0;
                           if (!toolCallsBuffer[index]) {
                               toolCallsBuffer[index] = {
                                   id: toolCall.id,
                                   function: {
                                       name: toolCall.function?.name || "",
                                       arguments: toolCall.function?.arguments || ""
                                   },
                                   type: "function"
                               };
                           } else {
                               if (toolCall.function?.name) toolCallsBuffer[index].function.name += toolCall.function.name;
                               if (toolCall.function?.arguments) toolCallsBuffer[index].function.arguments += toolCall.function.arguments;
                           }
                       });
                    }
                }
            }

            // Append assistant message to history
            const assistantMessage: any = { role: "assistant", content: currentContent || null };
            if (toolCallsBuffer.length > 0) {
                assistantMessage.toolCalls = toolCallsBuffer;
            }
            messages.push(assistantMessage);

            if (toolCallsBuffer.length > 0) {
                // Execute tools
                for (const toolCall of toolCallsBuffer) {
                    const funcName = toolCall.function.name;
                    let funcArgs = {};
                    try {
                        funcArgs = JSON.parse(toolCall.function.arguments);
                    } catch (e) {
                        console.error("Failed to parse arguments", e);
                    }

                    const iconInfo = TOOL_ICON_MAP[funcName] || { icon: 'Zap', label: funcName };

                    // Notify UI about tool call
                    onChunk({
                        type: 'tool-call',
                        toolCall: {
                            id: toolCall.id || funcName + Date.now(),
                            name: funcName,
                            arguments: funcArgs,
                            icon: iconInfo.icon,
                            label: iconInfo.label
                        }
                    });

                    const rawResult = await executeAgentTool(funcName, funcArgs, token);
                    const toolResult = trimToolPayload(rawResult);

                    // Notify UI about tool result
                    onChunk({
                        type: 'tool-result',
                        toolCall: {
                            id: toolCall.id || funcName + Date.now(),
                            name: funcName,
                            arguments: funcArgs,
                            result: toolResult,
                            icon: iconInfo.icon,
                            label: iconInfo.label
                        }
                    });

                    messages.push({
                        role: "tool",
                        content: JSON.stringify(toolResult),
                        name: funcName,
                        toolCallId: toolCall.id
                    });
                }
            } else {
                continueLoop = false;
            }
        }

    } catch (error: any) {
        console.error("[agentTools] Stream Error:", error);
        onChunk({ type: 'text', content: `An error occurred: ${error.message}` });
    }
};

export const answerMusicQuestionWithTools = async (
    question: string,
    context: any,
    token?: string | null,
    modelId?: string,
    webSearchEnabled?: boolean
): Promise<{ text: string; toolCalls: ToolCallInfo[] }> => {
    console.log('[agentTools] answerMusicQuestionWithTools called', { question, modelId, webSearchEnabled });

    const fallbackResponse = { text: "Unable to answer right now. Try again!", toolCalls: [] };

    try {
        const client = getAiClient();
        if (!client) return { text: "Configure VITE_MISTRAL_API_KEY to use chat features.", toolCalls: [] };

        const selectedModelId = modelId || DEFAULT_MODEL_ID;

        const messages: any[] = [
            {
                role: "system",
                content: AGENT_SYSTEM_PROMPT
            },
            {
                role: "assistant",
                content: "I understand. I am Lotus, ready to analyze music data."
            },
            {
                role: "user",
                content: `User: ${context.userName || 'Unknown'} | Date: ${new Date().toLocaleString()} | Quick context: Top artists include ${context.artists.slice(0, 5).join(', ')}. Weekly time: ${context.globalStats?.weeklyTime || '?'}. \n\nQuestion: ${question}`
            }
        ];

        let finalResponseText = "";
        const collectedToolCalls: ToolCallInfo[] = [];
        let continueLoop = true;

        while (continueLoop) {
            const tools: any[] = [...AGENT_TOOLS];
            if (webSearchEnabled) {
                tools.push({ type: 'web_search' });
            }

            const response = await client.chat.complete({
                model: selectedModelId,
                messages: messages,
                // @ts-ignore
                tools: tools,
            });

            const choice = response.choices?.[0];
            const message = choice?.message;

            if (!message) break;

            messages.push(message);

            if (message.content) {
                finalResponseText += message.content;
            }

            if (message.toolCalls && message.toolCalls.length > 0) {
                for (const toolCall of message.toolCalls) {
                    const funcName = toolCall.function.name;
                    let funcArgs = {};
                    try {
                        funcArgs = JSON.parse(toolCall.function.arguments as string);
                    } catch (e) {
                        console.error("Failed to parse args", e);
                    }
                    const iconInfo = TOOL_ICON_MAP[funcName] || { icon: 'Zap', label: funcName };

                    const rawResult = await executeAgentTool(funcName, funcArgs, token);
                    const toolResult = trimToolPayload(rawResult);

                    collectedToolCalls.push({
                        id: toolCall.id,
                        name: funcName,
                        arguments: funcArgs,
                        result: toolResult,
                        icon: iconInfo.icon,
                        label: iconInfo.label
                    });

                    messages.push({
                        role: "tool",
                        content: JSON.stringify(toolResult),
                        name: funcName,
                        toolCallId: toolCall.id
                    });
                }
            } else {
                continueLoop = false;
            }
        }

        return {
            text: finalResponseText || "I processed your request.",
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
        if (!client) return "Configure VITE_MISTRAL_API_KEY to see insights.";

        const prompt = `You are a music analytics expert. Analyze: ${contextData}`;
        const result = await client.chat.complete({
            model: DEFAULT_MODEL_ID,
            messages: [{ role: 'user', content: prompt }]
        });

        return result.choices?.[0]?.message?.content as string || "";
    } catch (error) {
        console.error("Mistral API Error:", error);
        return "Unable to generate insights right now.";
    }
};

export const answerMusicQuestion = async (question: string, context: any): Promise<string> => {
    try {
        const client = getAiClient();
        if (!client) return "Configure VITE_MISTRAL_API_KEY.";

        const prompt = `User: ${context.userName}. Question: ${question}. Context: ${JSON.stringify(context.globalStats)}`;
        const result = await client.chat.complete({
            model: DEFAULT_MODEL_ID,
            messages: [{ role: 'user', content: prompt }]
        });

        return result.choices?.[0]?.message?.content as string || "";
    } catch (e) {
        return "Error answering question.";
    }
}

export const generateMusicInsight = async (query: string, stats: any): Promise<string> => {
    try {
        const client = getAiClient();
        if (!client) return "Configure VITE_MISTRAL_API_KEY.";
        const prompt = `Data: ${JSON.stringify(stats)}. User: ${query}`;
        const result = await client.chat.complete({
            model: DEFAULT_MODEL_ID,
            messages: [{ role: 'user', content: prompt }]
        });
        return result.choices?.[0]?.message?.content as string || "";
    } catch (e) { return "Insight error."; }
};

export const generateRankingInsights = async (items: string[]): Promise<Record<string, string>> => {
    try {
        const client = getAiClient();
        if (!client) return {};
        const prompt = `Items: ${items.join(',')}. Return JSON { item: "insight" }`;
        const result = await client.chat.complete({
            model: DEFAULT_MODEL_ID,
            messages: [{ role: 'user', content: prompt }],
            responseFormat: { type: "json_object" }
        });
        const content = result.choices?.[0]?.message?.content;
        return content ? JSON.parse(content as string) : {};
    } catch (e) { return {}; }
}

export const navigateConnectionGraph = async (params: any, graphContext: any): Promise<any> => {
    try {
        const client = getAiClient();
        if (!client) return { summary: 'No API Key' };
        const prompt = `Graph: ${JSON.stringify(graphContext)}. Request: ${JSON.stringify(params)}. Return JSON.`;
        const result = await client.chat.complete({
            model: DEFAULT_MODEL_ID,
            messages: [{ role: 'user', content: prompt }],
            responseFormat: { type: "json_object" }
        });
        const content = result.choices?.[0]?.message?.content;
        return content ? JSON.parse(content as string) : {};
    } catch (e) { return { summary: 'Error' }; }
};

export const generateWeeklyInsightStory = async (context: any): Promise<any[]> => {
    try {
        const client = getAiClient();
        if (!client) return [];
        const prompt = `Generate weekly insight story JSON for: ${JSON.stringify(context)}`;
        const result = await client.chat.complete({
            model: DEFAULT_MODEL_ID,
            messages: [{ role: 'user', content: prompt }],
            responseFormat: { type: "json_object" }
        });
        const content = result.choices?.[0]?.message?.content;
        if (!content) return [];
        const parsed = JSON.parse(content as string);
        return Array.isArray(parsed) ? parsed : (parsed.slides || []);
    } catch (e) { return []; }
};

export const generateDynamicCategoryQuery = async (context: any, userPrompt?: string): Promise<any[]> => {
    try {
        const client = getAiClient();
        if (!client) return [];
        const prompt = `Generate music category filters JSON. Context: ${JSON.stringify(context)}. Prompt: ${userPrompt || 'random'}`;
        const result = await client.chat.complete({
            model: DEFAULT_MODEL_ID,
            messages: [{ role: 'user', content: prompt }],
            responseFormat: { type: "json_object" }
        });
        const content = result.choices?.[0]?.message?.content;
        if (!content) return [];
        const parsed = JSON.parse(content as string);
        return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) { return []; }
}

export const generateWrappedStory = async (period: string): Promise<any> => {
    try {
        const client = getAiClient();
        if (!client) return {};
        const result = await client.chat.complete({
            model: DEFAULT_MODEL_ID,
            messages: [{ role: 'user', content: `Generate wrapped story JSON for ${period}` }],
            responseFormat: { type: "json_object" }
        });
        const content = result.choices?.[0]?.message?.content;
        return content ? JSON.parse(content as string) : {};
    } catch (e) { return {}; }
}

export const generateWrappedVibe = async (tracks: any[]): Promise<any> => {
    try {
        const client = getAiClient();
        if (!client) return {};
        const result = await client.chat.complete({
            model: DEFAULT_MODEL_ID,
            messages: [{ role: 'user', content: `Generate vibe check JSON for tracks: ${tracks.map(t => t.title).join(',')}` }],
            responseFormat: { type: "json_object" }
        });
        const content = result.choices?.[0]?.message?.content;
        return content ? JSON.parse(content as string) : {};
    } catch (e) { return {}; }
}

export const generateWrappedQuiz = async (stats: any): Promise<any> => {
    try {
        const client = getAiClient();
        if (!client) return {};
        const result = await client.chat.complete({
            model: DEFAULT_MODEL_ID,
            messages: [{ role: 'user', content: `Generate music quiz JSON from stats: ${JSON.stringify(stats)}` }],
            responseFormat: { type: "json_object" }
        });
        const content = result.choices?.[0]?.message?.content;
        return content ? JSON.parse(content as string) : {};
    } catch (e) { return {}; }
}

export const generateFruitVibe = async (tracks: any[]): Promise<any> => {
    try {
        const client = getAiClient();
        if (!client) return {};
        const result = await client.chat.complete({
            model: DEFAULT_MODEL_ID,
            messages: [{ role: 'user', content: `Generate fruit vibe JSON for tracks: ${tracks.map(t => t.title).join(',')}` }],
            responseFormat: { type: "json_object" }
        });
        const content = result.choices?.[0]?.message?.content;
        return content ? JSON.parse(content as string) : {};
    } catch (e) { return {}; }
}

export interface WrappedSlide {
    type: 'text' | 'stat' | 'chart' | 'top_artist' | 'top_song' | 'top_album';
    title?: string;
    subtitle?: string;
    value?: string;
    image?: string;
    gradient?: string;
    data?: any;
}

export const generateWrappedWithTools = async (period: string, fetchStats: any): Promise<any> => {
    // Simplified version without complex multi-turn tool use for now to ensure migration stability
    // In a real migration, we would implement the full chat loop with tools here too
    const stats = await fetchStats(period);
    return {
        slides: [],
        stats: {
            totalMinutes: stats?.totalMinutes || 0,
            totalTracks: stats?.totalTracks || 0,
            topArtist: stats?.topArtist || null,
            topSong: stats?.topSong || null,
            topAlbum: null,
            peakHour: "Evening",
            topGenreGuess: "Mixed"
        }
    };
};

export const generateTopAlbumFunFact = async (album: any): Promise<string> => {
    try {
        const client = getAiClient();
        if (!client) return "";
        const result = await client.chat.complete({
            model: DEFAULT_MODEL_ID,
            messages: [{ role: 'user', content: `Fun fact about album ${album.title}` }]
        });
        return result.choices?.[0]?.message?.content as string || "";
    } catch (e) { return ""; }
};
