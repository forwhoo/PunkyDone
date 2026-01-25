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

export const generateDynamicCategoryQuery = async (availableGenres: string[]): Promise<any> => {
    try {
        const client = getAiClient();
        if (!client) throw new Error("No API Key");

        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'night';

        const prompt = `
            You are an advanced music analytics engine.
            Your task: specific specific formula-based categorization of a user's listening history.
            
            Context:
            - User's Time: ${timeOfDay} (Hour: ${hour})
            - Database Schema: "listening_history" table.
            - Available Columns: [track_name, artist_name, album_name, played_at, duration_ms]
            - NO 'genre' column exists. Do NOT try to filter by genre.
            
            Instructions:
            1. Invent a creative category Title & Description fitting the current time/vibe.
            2. Construct a "Tool Call" formula to filter the tracks from the database.
            
            Verified Tools (Use exactly one):
            - A: Filter by Artist -> { "tool": "filterByArtist", "args": { "artistName": "Exact Artist Name" } }
            - B: Filter by Time Range (Hour 0-23) -> { "tool": "filterByTime", "args": { "startHour": int, "endHour": int } }
            - C: Keyword Match (in Track/Album) -> { "tool": "filterByKeyword", "args": { "keyword": "partial string" } }
            
            Rules:
            - Be creative with the Title (e.g., "The Weeknd Marathon", "Late Night Lo-Fi", "Morning Motivation").
            - If choosing a specific artist, pick a popular one (e.g., Harry Styles, Drake, Taylor Swift) or one that fits the vibe.
            - If choosing a time, make sure it matches the current context (${timeOfDay}) or adjacent hours.
            
            Return ONLY validated JSON:
            {
                "title": "...",
                "description": "...",
                "tool": "filterBy..." (one of the above),
                "args": { ... }
            }
        `;

        const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: "You are a JSON-only API. Output raw JSON." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.8 
        });

        const text = response.choices[0]?.message?.content || "{}";
        return JSON.parse(text);

    } catch (e) {
        console.error("AI Category Gen Error:", e);
        // Fallback that is safe
        return {
            title: "Morning Coffee",
            description: "Start your day right",
            tool: "filterByTime", 
            args: { startHour: 6, endHour: 11 } 
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
