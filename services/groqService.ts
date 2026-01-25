import OpenAI from "openai";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const client = new OpenAI({
    apiKey: GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true // Required for client-side usage
});

export const generateMusicInsight = async (query: string, stats: any) => {
    if (!GROQ_API_KEY) {
        return "Please set VITE_GROQ_API_KEY in your environment to use the AI features.";
    }

    // Prepare context from stats (summarized to avoid token limits if data is huge, though Groq is fast/large context)
    const context = {
        topArtist: stats?.artists?.[0] || null,
        topSong: stats?.songs?.[0] || null,
        topGenre: stats?.artists?.[0]?.genres?.[0] || "Unknown",
        totalListeningTime: stats?.hourlyActivity?.reduce((acc: number, curr: any) => acc + curr.value, 0) || 0,
        recentTracks: stats?.songs?.slice(0, 5).map((s: any) => s.title) || [],
        allArtists: stats?.artists?.slice(0, 5).map((a: any) => ({ name: a.name, image: a.image })) || []
    };

    const systemPrompt = `
You are Punky, a music analytics assistant.
Your goal is to answer their questions about their listening habits using the provided data.

Tools/Capabilities:
- If the user asks for their top artist, tell them the name AND display their image using Markdown syntax: ![Artist Name](image_url).
- If the user asks for their top song, tell them the title and artist, and show the cover art if available: ![Title](cover_url).
- Be extremely concise. Max 2-3 sentences.
- Avoid flowery language. Get straight to the point.
- If the answer isn't in the data, just say you don't have that info yet.

Current User Data:
${JSON.stringify(context, null, 2)}
    `;

    try {
        const response = await client.chat.completions.create({
            model: "llama-3.3-70b-versatile", // Using a solid model on Groq
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: query }
            ],
            temperature: 0.7,
            max_tokens: 300
        });

        return response.choices[0]?.message?.content || "I couldn't process that request right now.";
    } catch (error) {
        console.error("Groq AI Error:", error);
        return "Sorry, I'm having trouble connecting to my brain (Groq API).";
    }
};
