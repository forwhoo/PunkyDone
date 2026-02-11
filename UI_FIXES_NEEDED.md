# UI Fixes & Improvements Needed

## ✅ COMPLETED
1. **Buttons Match Search Bar** - Removed gradient, clean white/black style with rounded-xl

## 🔧 TODO

### 1. Artist Modal Redesign (PRIORITY)
**File:** `App.tsx` (selectedTopArtist modal section)
- Add more comprehensive stats:
  - Total listening time breakdown
  - Average daily plays
  - First/Last played dates
  - Listening streak
  - Top 3 albums by this artist
- Better visual hierarchy
- Add genre tags if available

### 2. Fix Contribution Year Sorting
**File:** `components/ActivityHeatmap.tsx` (needs to be checked)
- Auto-sort automatically when year is selected
- Fast, instant response
- No loading delays

### 3. Weekly Insight UI Redesign
**File:** `components/AISpotlight.tsx` (insightMode section, lines ~640-870)
- Fix small profile pictures
- Apple Music Recap style:
  - Larger images
  - Better typography
  - Smoother transitions
  - Professional gradients
- Better slide layouts

### 4. Wrapped Multi-Category Fix (CRITICAL)
**File:** `services/geminiService.ts` + `components/AISpotlight.tsx`
- Monthly/Weekly wrapped should generate **multiple categories** using AI tool calls
- NOT just one list of songs
- Should use `generateDynamicCategoryQuery` to create 3-5 themed categories
- Examples: "Morning Commute", "Late Night Vibes", "Workout Energy", etc.

### 5. Top Album & Top Song Modals
**File:** `App.tsx`
- Add state: `selectedTopSong`, `selectedTopAlbum`
- Create modals similar to artist modal with:
  - Album: Total plays, tracks on album, release year, total time spent
  - Song: Play count, skip rate, avg completion %, time of day most played
- Implement onClick handlers for RankedAlbum and RankedSong components

### 6. Obsession Card Click Fix
**File:** `components/TrendingArtists.tsx` (check this file)
- Fix click behavior
- Ensure proper modal opening

### 7. Tooltip Direction Fix
**File:** Multiple components with hover tooltips
- Tooltips should NEVER flip
- Always show in correct direction (top/bottom/left/right)
- Add `data-placement` prop
- Use CSS: `transform-origin` to prevent flipping

### 8. Quality of Life Improvements

#### Feature 1: Keyboard Shortcuts
- `Cmd/Ctrl + K` - Focus search
- `Esc` - Close any modal
- Arrow keys - Navigate slides in Wrapped/Insight mode

#### Feature 2: Loading Skeletons
- Add skeleton loaders instead of spinners
- Smooth content transitions
- Better perceived performance

#### Feature 3: Quick Actions Menu
- Right-click on artist/song/album for context menu:
  - "Open in Spotify"
  - "Share"
  - "Add to favorites"
  - "Hide from stats"

#### Feature 4: Export Feature
- Export charts as image (PNG/SVG)
- Export Wrapped as shareable story
- Download listening history as CSV

#### Feature 5: Time Range Presets
- Add custom date range picker
- Quick presets: "Last 7 days", "Last 30 days", "This Year", "Custom"
- Remember last selected range

## Implementation Priority
1. **Wrapped Multi-Category Fix** (most broken)
2. **Artist/Album/Song Modals** (high impact)
3. **Tooltip Direction** (annoying bug)
4. **Weekly Insight Redesign** (ugly UI)
5. **QOL Features** (nice to have)

## Design Guidelines
- Match search bar style: `border border-white/10 bg-white/5 rounded-2xl`
- No gradients on buttons (use solid white for active)
- Apple Music-inspired spacing and typography
- Smooth transitions (300-500ms)
- Backdrop blur for modals: `backdrop-blur-xl`
