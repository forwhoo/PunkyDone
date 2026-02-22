# Obsession Orbit Documentation

**Obsession Orbit** is a multi-faceted feature in the LotusStats application that visualizes and quantifies a user's intense listening habits. It appears in three primary contexts:
1.  **Metric**: A data point identifying artists where a single song dominates listening.
2.  **Visualization**: An interactive "Solar System" view of trending artists.
3.  **Story Mode**: A chapter in the "Wrapped" presentation.

---

## 1. Metric: Single-Song Dominance

The core metric for identifying an "Obsession Artist" is defined in `services/dbService.ts`.

### Logic (`getObsessionArtist`)
This function identifies an artist where **one single song accounts for ≥ 50% of the total plays** for that artist (minimum 3 total plays).

-   **Input**: Time period (daily, weekly, monthly).
-   **Algorithm**:
    1.  Fetch listening history for the period.
    2.  Group plays by artist and then by song.
    3.  Calculate the percentage of total artist plays that the top song accounts for:
        ```typescript
        dominancePercent = (topSongPlays / totalArtistPlays) * 100
        ```
    4.  Identify the artist with the highest `dominancePercent` (must be ≥ 50%).
-   **Output**: An object containing:
    -   `artist`: Artist name
    -   `topSong`: Title of the dominant song
    -   `percentage`: The dominance percentage (e.g., "85%")
    -   `totalPlays`: Total plays for the artist in the period

### Obsession Score (`getObsessionScore`)
A more nuanced score is calculated to rank obsessions:
```typescript
obsessionScore = Math.round(dominancePercent * (1 + Math.log10(totalPlays)))
```
This formula rewards both high dominance and high total volume.

---

## 2. Visualization: Solar System View

The interactive visualization is implemented in `components/TrendingArtists.tsx`.

### Logic (`TrendingArtists`)
When `viewType` is set to `'orbit'`, the component renders a "Solar System" view where the top trending item is the "Sun" (center) and other items orbit around it.

#### Trend Score Algorithm
The items displayed in the orbit are ranked by a complex `trendScore` (0-250 scale) calculated in `calculateTrending`. The algorithm considers multiple factors:

1.  **Volume (Max 50)**: Logarithmic scale of total plays.
2.  **Consistency (Max 45)**: Regularity of listening (days played / total span).
3.  **Intensity (Max 40)**: Average plays per day.
4.  **Focus (Max 30)**: Session intensity and binge listening behavior.
5.  **Recency (Max 25)**: Weighted by decay (fast decay: 3 days, slow decay: 21 days).
6.  **Momentum (Max 20)**: Velocity of listening patterns (acceleration/deceleration).
7.  **Weighted Recency (Max 20)**: Double-exponential weighted plays.
8.  **Engagement (Max 15)**: Session variance and length.
9.  **Loyalty (Max 15)**: Long-term listening bonus.
10. **Night Owl (Max 10)**: Bonus for late-night listening (11 PM - 4 AM).

**Diversity Multiplier**: The raw score is multiplied by a diversity factor (`0.5 - 1.0`) to penalize repetitive listening (e.g., listening to only one track over and over).

#### Rendering
-   **Center**: Top item (Highest Trend Score).
-   **Inner Ring**: Items ranked 2-9 (counter-clockwise rotation).
-   **Outer Ring**: Items ranked 10-27 (clockwise rotation).
-   **Animation**: Uses CSS animations (`spin-slow`, `spin-reverse-slow`) and `framer-motion` for smooth transitions.

---

## 3. Story Mode: Wrapped Chapter

In `components/WrappedSlides.tsx`, "Obsession Orbit" appears as **Slide 9**.

### Logic (`Slide9`)
This is a simplified version for storytelling purposes.
-   **Orbit Score**: Calculated purely based on volume for the top artist:
    ```typescript
    orbitScore = Math.min(250, 80 + Math.round(topArtist.totalListens / 3))
    ```
-   **Narrative**:
    -   **Chapter 1: The Discovery**: "You found [Artist] and couldn't stop."
    -   **Chapter 2: The Obsession**: "[X] plays later — they were comfort, noise, everything."
    -   **Chapter 3: Orbit Locked**: "Orbit score: [Score]/250. You were gravitationally locked."

---

## 4. AI Integration: `get_obsession_orbit`

The feature is exposed to the AI chat agent via the `get_obsession_orbit` tool in `services/geminiService.ts`.

### Functionality
-   **Tool Name**: `get_obsession_orbit`
-   **Description**: "Get the user's Obsession Orbit - their most obsessed-over artists where one song dominates their plays."
-   **Parameters**: `period` (required), `artist_name` (optional).
-   **Implementation**: Calls `dbService.getObsessionArtist(period)`.
-   **Response**: Returns the obsession artist, score, and whether the queried artist (if provided) is the current obsession.

This allows users to ask questions like:
-   "What's my obsession orbit this week?"
-   "How obsessed am I with Kanye West?"
