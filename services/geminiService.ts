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

export interface AIFilterArgs {
    field?: 'artist_name' | 'album_name' | 'track_name'; // What column to filter
    value?: string; // The value to match
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'latenight'; // Time filter
    sortBy?: 'plays' | 'minutes'; // What to rank by
    sortOrder?: 'highest' | 'lowest'; // Top or Bottom
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
}): Promise<AIFilterResult> => {
    try {
        const client = getAiClient();
        if (!client) throw new Error("Missing VITE_GROQ_API_KEY");

        const hour = new Date().getHours();
        const timeOfDay = hour < 6 ? 'latenight' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
        
        // Shuffle and sample to keep prompt fresh
        const shuffledArtists = [...context.artists].sort(() => 0.5 - Math.random());
        const shuffledAlbums = [...context.albums].sort(() => 0.5 - Math.random());
        const shuffledSongs = [...context.songs].sort(() => 0.5 - Math.random());

        const prompt = `
You are the DJ Algorithm for a premium music dashboard.
Your job: Create ONE unique, creative listening category from the user's REAL library.

## USER'S LIBRARY (What you can use):
- Artists: [${shuffledArtists.slice(0, 30).join(', ')}]
- Albums: [${shuffledAlbums.slice(0, 20).join(', ')}]
- Songs: [${shuffledSongs.slice(0, 15).join(', ')}]
- Current Time: ${hour}:00 (${timeOfDay})

## DATABASE SCHEMA:
Table: listening_history
Columns: track_name, artist_name, album_name, played_at (timestamp), duration_ms

## YOUR SINGLE TOOL: "filter"
You must output ONE filter object. Parameters:

| Parameter   | Type                                                    | Description                                      |
|-------------|---------------------------------------------------------|--------------------------------------------------|
| field       | "artist_name" \| "album_name" \| "track_name"          | Which column to match (OPTIONAL)                 |
| value       | string                                                  | EXACT value from the library lists above         |
| timeOfDay   | "morning" \| "afternoon" \| "evening" \| "night" \| "latenight" | Filter by when songs were played (OPTIONAL)     |
| sortBy      | "plays" \| "minutes"                                    | Rank by total play count or total listening time |
| sortOrder   | "highest" \| "lowest"                                   | Top (most) or Bottom (least)                     |

## RULES:
1. "value" MUST be an EXACT match from the Artists/Albums/Songs lists. Do NOT invent names.
2. You can combine filters (e.g., Artist + Morning + Most Played).
3. Be CREATIVE with titles. FORBIDDEN: "Morning Playlist", "Top Tracks", "Best Of".
   GOOD: "Drake Season", "3AM Thoughts", "Hidden Gems", "The Long Game", "Album Deep Dive".
4. If you pick "lowest" for sortOrder, make the title reflect discovery (e.g., "Buried Treasure").

## OUTPUT (JSON only, no markdown):
{
    "title": "Creative Title Here",
    "description": "Short fun description",
    "filter": {
        "field": "artist_name",
        "value": "Drake",
        "timeOfDay": "night",
        "sortBy": "plays",
        "sortOrder": "highest"
    }
}

NOTE: All filter fields are optional. You can use just one, or combine them.
Examples:
- Artist spotlight: { "field": "artist_name", "value": "The Weeknd", "sortBy": "plays", "sortOrder": "highest" }
- Morning vibes: { "timeOfDay": "morning", "sortBy": "plays", "sortOrder": "highest" }
- Hidden gems: { "sortBy": "plays", "sortOrder": "lowest" }
- Album deep dive: { "field": "album_name", "value": "Graduation", "sortBy": "minutes", "sortOrder": "highest" }
`;

        const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: "You are a JSON-only API. Return raw JSON. No markdown, no explanation." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.95 
        });

        const text = response.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(text);
        
        // Validate
        if (!parsed.filter) throw new Error("AI did not return a filter object");
        
        return parsed as AIFilterResult;

    } catch (e: any) {
        console.error("AI Category Gen Error:", e);
        return {
            title: "Fallback Mix",
            description: `Error: ${e.message || 'Unknown'}`,
            filter: { sortBy: 'plays', sortOrder: 'highest' },
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
