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
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7
    });
    
    return response.choices[0]?.message?.content || "No insights available via Groq.";
  } catch (error) {
    console.error("Groq API Error:", error);
    return "Unable to generate insights right now.";
  }
};

export const generateRandomCategory = async (): Promise<any> => {
    try {
        const client = getAiClient();
        if (!client) throw new Error("No API Key");

        const prompt = `
            Generate a creative, random music ranking category (e.g., "Songs for a Rainy Tuesday", "High Energy Workouts", "Underrated Gems").
            Then, generate a list of 5 fictional or real songs/artists that fit this category with listener counts.
            Return ONLY a JSON object with this structure:
            {
                "title": "Category Name",
                "description": "Short description",
                "items": [
                    { "rank": 1, "title": "Song/Artist Name", "subtitle": "Artist/Genre", "value": "1.2M", "image": "https://source.unsplash.com/random/200x200/?music,abstract" },
                    ...
                ]
            }
        `;

        const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.8
        });

        const text = response.choices[0]?.message?.content || "{}";
        return JSON.parse(text);

    } catch (error) {
        console.warn("Groq Category Error (using fallback):", error);
         // Fallback
        return {
            title: "Weekend Vibe",
            description: "Songs to chill to",
            items: [
                { rank: 1, title: "Sunny Days", subtitle: "The Vibes", value: "500K", image: "https://ui-avatars.com/api/?name=SD&background=random" },
                { rank: 2, title: "Coffee Run", subtitle: "Morning Crew", value: "320K", image: "https://ui-avatars.com/api/?name=CR&background=random" },
                { rank: 3, title: "Late Night", subtitle: "Insominacs", value: "150K", image: "https://ui-avatars.com/api/?name=LN&background=random" },
                { rank: 4, title: "Study LoFi", subtitle: "Focus", value: "120K", image: "https://ui-avatars.com/api/?name=SL&background=random" },
                { rank: 5, title: "Gym Pump", subtitle: "Gains", value: "90K", image: "https://ui-avatars.com/api/?name=GP&background=random" }
            ]
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
            model: "llama-3.3-70b-versatile",
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
