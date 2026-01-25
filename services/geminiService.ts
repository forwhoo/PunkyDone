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

export const generateDynamicCategoryQuery = async (context: { artists: string[], albums: string[] }): Promise<any> => {
    try {
        const client = getAiClient();
        if (!client) throw new Error("Missing VITE_GROQ_API_KEY");

        const hour = new Date().getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'late night';
        
        // Randomize the subset of artists sent to context to keep prompt size low but variations high
        const artistSample = context.artists.slice(0, 50).join(", "); 
        // const albumSample = context.albums.slice(0, 20).join(", ");

        const prompt = `
            You are the "Algorithm" for a high-end music dashboard.
            Your Goal: Create a distinct, personalized listening "Vibe" or "Collection" based on the user's actual library.

            CURRENT CONTEXT:
            - User's Local Time: ${hour}:00 (${timeOfDay})
            - User's Top Artists: [${artistSample}]
            - Database Schema: "listening_history" (track_name, artist_name, album_name, played_at, duration_ms)
            - NO Genre Column.

            TASK:
            1. Analyze the Time of Day + Available Artists.
            2. Invent a creative, specific Title & Description.
               - FORBIDDEN: "Morning Playlist", "Daytime Vibes", "Sunrise Serenade".
               - REQUIRED: Use cool/abstract names like "Coffee & 808s", "Late Registration", "Toronto 3AM", "Focus Flow", "Gems Only", "High Fidelity".
            3. Select the best TOOL from the list below to build this playlist from the DB.
            
            TOOLS (Choose ONE):
            
            A. { "tool": "filterByArtist", "args": { "artistName": "EXACT_NAME_FROM_LIST" } }
               - Use this to create an Artist Spotlight.
               - CRITICAL: "artistName" MUST actully exist in the "User's Top Artists" list above. Do not hallucinate an artist.
            
            B. { "tool": "filterByTime", "args": { "startHour": 0-23, "endHour": 0-23 } }
               - Use this for time-based vibes (e.g. "After Hours" or "Breakfast Club").
               - Set hours correctly for the context (Night = 22-04, Morning = 05-10).
            
            C. { "tool": "filterByKeyword", "args": { "keyword": "AnyString" } }
               - Use this to match words in Track Title or Album.
               - Examples: "Love", "Remix", "Live", "Acoustic", "Feat", "Interlude".

            D. { "tool": "filterByDiscovery", "args": {} }
               - Use this if you want to surface "Hidden Gems" or random shuffles.
               - Title ideas: "Buried Treasure", "Shuffle Play", "Forgotten Favorites".

            E. { "tool": "filterByLongest", "args": {} }
               - Use this for "Deep Cuts" or extended plays.
               - Title ideas: "Extended Versions", "The Long Game", "Progressive Journey".

            OUTPUT JSON ONLY:
            {
                "title": "Creative Title",
                "description": "Edgy/Fun description.",
                "tool": "...",
                "args": { ... }
            }
        `;

        const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: "You are a JSON-only API. Output raw JSON. No markdown." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.9 
        });

        const text = response.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(text);
        
        // Simple client-side validation
        if (!parsed.tool || !parsed.args) throw new Error("AI returned invalid protocol");
        
        return parsed;

    } catch (e: any) {
        console.error("AI Category Gen Error:", e);
        // Return the error so UI can show it if needed, or a fallback with error flag
        return {
            title: "Simulated Fallback",
            description: `AI Error: ${e.message || 'Unknown'}. Showing Morning flow.`,
            tool: "filterByTime", 
            args: { startHour: 6, endHour: 11 },
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
