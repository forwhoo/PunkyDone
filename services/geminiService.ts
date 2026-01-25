import OpenAI from "openai";

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

export const generateMusicInsights = async (contextData: string): Promise<string> => {
  try {
    const client = getAiClient();
    if (!client) return "Configure VITE_GROQ_API_KEY to see insights.";

    const prompt = `
      You are a music analytics expert. Analyze the following data summary and provide a concise, 
      Apple Music-style "Editor's Note" or strategic insight about the listening trends.
      Keep it short, encouraging, and professional (max 2 sentences).
      
      Data: ${contextData}
    `;

    const response = await client.chat.completions.create({
        model: "openai/gpt-oss-20b",
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
  globalStats?: { weeklyTime: string, weeklyTrend: string, totalTracks: number, totalMinutes?: number }
}): Promise<string> => {
  try {
    const client = getAiClient();
    if (!client) return "Configure VITE_GROQ_API_KEY to use chat features.";

    const statsInfo = context.globalStats ? `
- This Week's Listening Time: ${context.globalStats.weeklyTime}
- Weekly Trend: ${context.globalStats.weeklyTrend}
- Total History Tracks: ${context.globalStats.totalTracks}
- Total Minutes Listened (Overall): ${context.globalStats.totalMinutes || 'Unknown'} min
    ` : '';

    const prompt = `
You are a music analytics assistant with deep knowledge of the user's listening history.

USER'S LIBRARY CONTEXT:
${statsInfo}
- Top Artists: [${context.artists.slice(0, 30).join(' | ')}]
- Top Albums: [${context.albums.slice(0, 15).join(' | ')}]
- Top Songs: [${context.songs.slice(0, 15).join(' | ')}]

USER QUESTION: "${question}"

## GUIDELINES:
1. Provide a helpful, insightful, and conversational answer based on their listening data. 
2. Be specific, reference their actual music and stats when relevant.
3. If they ask about totals (minutes, plays), use the provided stats.
4. FORMATTING: You CAN use Markdown tables for lists/rankings. Use bolding and clean lists.
5. If the user asks for patterns or "why", give your best strategic interpretation of their mood.
6. Keep it friendly and terminal-chic.
    `;

    const response = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 600
    });
    
    return response.choices[0]?.message?.content || "I couldn't process that question. Try rephrasing!";
  } catch (error) {
    console.error("Chat Error:", error);
    return "Unable to answer right now. Try again!";
  }
};

export interface AIFilterArgs {
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
    sortBy?: 'plays' | 'minutes' | 'recency';
    sortOrder?: 'highest' | 'lowest';
    
    // Result control
    minPlays?: number; // Ensure at least X plays
    limit?: number; // How many results (default 20)
}

export interface AIFilterResult {
    title: string;
    description: string;
    filter: AIFilterArgs;
    isError?: boolean;
}

export const generateDynamicCategoryQuery = async (context: { 
    artists: string[], 
    albums: string[], 
    songs: string[] 
}, userPrompt?: string): Promise<AIFilterResult> => {
    try {
        const client = getAiClient();
        if (!client) throw new Error("Missing VITE_GROQ_API_KEY");

        const hour = new Date().getHours();
        const timeOfDay = hour < 6 ? 'latenight' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
        
        // Shuffle and sample to keep prompt fresh
        const shuffledArtists = [...context.artists].sort(() => 0.5 - Math.random());
        const shuffledAlbums = [...context.albums].sort(() => 0.5 - Math.random());
        const shuffledSongs = [...context.songs].sort(() => 0.5 - Math.random());

        const systemInstructions = `
You are the DJ Algorithm for a premium music dashboard.
Your job: Create ONE unique, creative listening category from the user's REAL library.

## USER'S LIBRARY:
- Top Artists: [${shuffledArtists.slice(0, 30).join(', ')}]
- Top Albums: [${shuffledAlbums.slice(0, 20).join(', ')}]
- Top Songs: [${shuffledSongs.slice(0, 20).join(', ')}]
- Current Time: ${hour}:00 (${timeOfDay})

## FILTER PARAMETERS (all optional, combine as needed):

| Parameter      | Type                                        | Description                                    |
|----------------|---------------------------------------------|------------------------------------------------|
| field          | "artist_name" | "album_name" | "track_name" | Column to match                                |
| value          | string                                      | EXACT match (use for specific artist/album)    |
| contains       | string                                      | PARTIAL match (broader, e.g. "love", "remix") |
| timeOfDay      | "morning"|"afternoon"|"evening"|"night"|"latenight" | When played               |
| dayOfWeek      | "weekday" | "weekend"                     | Weekday vs weekend listening                   |
| recentDays     | number                                      | Only last N days (7=week, 30=month)            |
| minDurationMs  | number                                      | Songs > X ms (240000 = 4min, for epics)        |
| maxDurationMs  | number                                      | Songs < X ms (180000 = 3min, for quick hits)   |
| sortBy         | "plays" | "minutes" | "recency"            | How to rank results                            |
| sortOrder      | "highest" | "lowest"                      | Top or Bottom                                  |
| minPlays       | number                                      | Minimum play count (ensures variety)           |

## CREATIVE GUIDELINES:
- FORBIDDEN titles: "Morning Playlist", "Top Tracks", "Best Of", "Daily Mix"
- GOOD titles: "The Marathon", "Quick Hits", "Weekend Warriors", "Deep Cuts", "Repeat Offenders", "Fresh Finds"
- STRICTLY FOLLOW USER PROMPTS: If user asks for "Harry Styles", use { "field": "artist_name", "value": "Harry Styles", "sortBy": "plays", "sortOrder": "highest" }
- If user asks for "top albums", use { "sortBy": "plays", "sortOrder": "highest" } or similar to show all top content
- If user asks for specific artist/album/song, use exact "value" match. For broader queries, use "contains" or skip field entirely.
- Always return valid filters that will produce results.

## OUTPUT (JSON only):
{
    "title": "Creative Title",
    "description": "Fun 1-liner",
    "filter": { ...your filter params... }
}
`;

        const userMessage = userPrompt 
            ? `USER REQUEST: "${userPrompt}". Generate a matching category using the library context.`
            : `Generate a random creative category based on the user's library and current time.`;

        const response = await client.chat.completions.create({
            model: "openai/gpt-oss-120b",
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
        
        // Validate
        if (!parsed.filter) throw new Error("AI did not return a filter object");
        
        return parsed as AIFilterResult;

    } catch (e: any) {
        console.error("AI Category Gen Error:", e);
        return {
            title: "Your Heavy Rotation",
            description: `Most played tracks overall`,
            filter: { sortBy: 'plays', sortOrder: 'highest', minPlays: 2 },
            isError: true
        };
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
