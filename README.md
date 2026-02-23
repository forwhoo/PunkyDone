# Lotus Stats (MuseAnalytics) 🎧

**Lotus Stats** is a sleek, Apple-style music analytics dashboard that tracks your listening habits, provides AI-powered insights, and generates immersive "Wrapped" stories.

## Features ✨

*   **Real-time Dashboard**: Track your top artists, songs, and albums across daily, weekly, monthly, and all-time ranges.
*   **Lotus Wrapped**: An immersive, animated story experience that summarizes your music journey using advanced WebGL effects (LightRays, GridScan, ColorBends).
*   **AI Insights**: Ask questions about your music taste and get intelligent responses powered by Gemini and Groq.
*   **Brutalist Mode**: Switch to a raw, data-heavy interface for a different perspective on your stats.
*   **Interactive Visuals**: Features glassmorphism, smooth Framer Motion animations, and 3D elements powered by Three.js and OGL.
*   **Mobile Responsive**: Fully optimized for both desktop and mobile devices.

## Tech Stack 🛠️

*   **Frontend**: React, Vite, TypeScript, Tailwind CSS
*   **Backend / Database**: Supabase
*   **Animations & 3D**: Framer Motion, GSAP, Three.js, OGL
*   **AI**: Google Gemini, Groq (via OpenAI SDK)
*   **Music Data**: Spotify Web API

## Getting Started 🚀

### Prerequisites

*   Node.js (v18+ recommended)
*   npm or yarn
*   Supabase account
*   Spotify Developer account
*   Google AI Studio account (for Gemini)
*   Groq Cloud account

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd museanalytics
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env` file in the root directory and add the following keys:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id
    VITE_SPOTIFY_REDIRECT_URI=http://localhost:3000/
    VITE_GEMINI_API_KEY=your_gemini_api_key
    VITE_MISTRAL_API_KEY=your_mistral_api_key
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  **Build for production:**
    ```bash
    npm run build
    ```

## Scripts 📜

*   `npm run dev`: Start the development server (runs on port 3000 by default).
*   `npm run build`: Build the project for production.
*   `npm run preview`: Preview the production build locally.

## License 📄

This project is open-source and available under the MIT License.

---
*Note: This project is for educational and personal use. Ensure you comply with Spotify's Developer Terms of Service.*
