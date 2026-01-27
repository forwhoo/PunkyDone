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
      Current Date: ${new Date().toLocaleDateString()}
      
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
  try {
    const client = getAiClient();
    if (!client) return "Configure VITE_GROQ_API_KEY to use chat features.";

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
You are a music analytics assistant with deep knowledge of the user's listening history.
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
6. Tone: Smart, professional, minimalist.    
7. **VOCABULARY**:
   - "Obsession Orbit" refers to the user's TOP RANKED ARTISTS.
   - If they ask "Is Kanye my obsession?", check if Kanye is Rank #1 or in the Top 5.
   - "Deep Cut" usually means songs with encoded popularity < 30 (if available) or rarely played tracks.
`;

    const response = await client.chat.completions.create({
        model: "moonshotai/kimi-k2-instruct-0905",
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
    songs: string[] ,
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
