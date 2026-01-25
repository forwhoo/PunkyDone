import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
// Note: In a real environment, you would not hardcode the key or handle it this way without a proxy.
// We rely on the user having the environment variable set or providing it.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMusicInsights = async (contextData: string): Promise<string> => {
  try {
    const prompt = `
      You are a music analytics expert. Analyze the following data summary and provide a concise, 
      Apple Music-style "Editor's Note" or strategic insight about the listening trends.
      Keep it short, encouraging, and professional (max 2 sentences).
      
      Data: ${contextData}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });
    
    return response.text || "No insights available at this moment.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to generate insights right now. Please try again later.";
  }
};