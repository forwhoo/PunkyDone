# Feature Explanations

This document provides detailed explanations of key metrics and features in the Lotus Stats application.

## 1. Obsession Score
The **Obsession Score** identifies artists where your listening habits are dominated by a single song. It is calculated using a combination of "dominance percentage" and total play volume.

- **Criteria**: An artist is flagged for an obsession if their top song accounts for **≥ 50%** of their total plays (with a minimum of 3 total plays).
- **Formula**: `obsessionScore = Math.round(dominancePercent * (1 + Math.log10(totalPlays)))`
- **Why log10?**: Using a logarithmic scale for total plays ensures that high-volume obsessions (e.g., 100 plays with 50% dominance) are ranked higher than low-volume ones (e.g., 5 plays with 50% dominance) without letting the total volume completely overshadow the dominance factor.

## 2. Upcoming Artist (Radar)
The **Upcoming Artist** feature identifies new names that are entering your rotation but haven't yet reached your "Top Charts."

- **Criteria**:
    - The artist must have at least **2 plays** in your recent history.
    - The artist must **NOT** be in your top 30 artists list.
    - **Discovery Logic**: Their very first recorded play in the database must be within the **last 60 days**.
- **Purpose**: This ensures that "Upcoming Artists" are truly new discoveries, not just older favorites you happen to be revisiting.

## 3. AI Chat (Lotus)
**Lotus** is an AI-powered music analytics agent that utilizes **Mistral AI** models and **Function Calling** to interact with your personal listening database.

- **Capabilities**: Unlike a standard chatbot, Lotus has access to real-time tools that can query your Spotify history stored in Supabase.
- **Tools Available**:
    - `get_top_songs`, `get_top_artists`, `get_top_albums`
    - `get_obsession_orbit`, `get_artist_streak`
    - `get_peak_listening_hour`, `get_most_skipped`
    - `get_discovery_date`, `get_binge_sessions`, `get_one_hit_wonders`
- **Flow**: When you ask a question like "Who did I discover this month?", Lotus analyzes the request, selects the appropriate tool(s), executes them against your database, and then summarizes the results in a witty and insightful manner.
