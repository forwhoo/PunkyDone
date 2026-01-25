import { GoogleGenAI } from "@google/genai";

// Initialize Gemini lazily to prevent crashes if API key is missing
const getAiClient = () => {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
};

export const generateMusicInsights = async (contextData: string): Promise<string> => {
  try {
    const ai = getAiClient();
    if (!ai) return "Configure VITE_GEMINI_API_KEY to see insights.";

    const prompt = `
      You are a music analytics expert. Analyze the following data summary and provide a concise, 
      Apple Music-style "Editor's Note" or strategic insight about the listening trends.
      Keep it short, encouraging, and professional (max 2 sentences).
      
      Data: ${contextData}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: prompt
    });
    
    return response.text() || "No insights available at this moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate insights right now. Please try again later.";
  }
};

export const generateRandomCategory = async (): Promise<any> => {
    try {
        const ai = getAiClient();
        if (!ai) throw new Error("No API Key");

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
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt
        });

        const text = response.text() || "{}";
        const jsonBlock = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonBlock) {
             return JSON.parse(jsonBlock[1]);
        }
        return JSON.parse(text);

    } catch (error) {
        console.warn("Gemini Category Error (using fallback):", error);
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
        const ai = getAiClient();
        if (!ai) throw new Error("No API Key");

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
         const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: prompt
        });
        
        const text = response.text() || "{}";
        const jsonBlock = text.match(/```json\n([\s\S]*?)\n```/);
        if (jsonBlock) {
             return JSON.parse(jsonBlock[1]);
        }
        return JSON.parse(text);

     } catch (e) {
         return {
             storyTitle: `Your ${period} Recap`,
             storyText: "You listened to some great music!",
             topGenre: "Mixed",
             listeningMinutes: 0
         }
     }
}
