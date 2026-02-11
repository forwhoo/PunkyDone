import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Sparkles, Disc, Mic2, Music, X, Clock, ChevronDown, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

interface TrendingItem {
    id: string;
    name: string; // Artist Name or Album Title
    subName?: string; // Artist Name for albums
    image: string;
    trendScore: number;
    recentPlays: number;
    type: 'artist' | 'album' | 'song';
    tracks?: any[]; // For expanded view
}

interface TrendingArtistsProps {
    artists: any[];
    albums?: any[];
    songs?: any[]; // Add songs support
    recentPlays: any[];
    artistImages?: Record<string, string>;
    timeRange?: 'Daily' | 'Weekly' | 'Monthly'; 
}

export const TrendingArtists: React.FC<TrendingArtistsProps> = ({ artists, albums, songs, recentPlays, artistImages, timeRange = 'Weekly' }) => {
    const [activeTab, setActiveTab] = useState<'artist' | 'album'>('artist');
    const [trendingItems, setTrendingItems] = useState<TrendingItem[]>([]);
    const [selectedItem, setSelectedItem] = useState<TrendingItem | null>(null);
    const [selectedYear, setSelectedYear] = useState<number>(2026);
    const [showYearDropdown, setShowYearDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowYearDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter recentPlays by selected year - memoized for performance
    const filteredPlays = useMemo(() => {
        if (!recentPlays || recentPlays.length === 0) return [];
        return recentPlays.filter(play => {
            if (!play.played_at) return false;
            return new Date(play.played_at).getFullYear() === selectedYear;
        });
    }, [recentPlays, selectedYear]);

    // Stats Calculation Helper - Optimized with useCallback
    const calculateArtistStats = useCallback((artistName: string) => {
        const artistPlays = filteredPlays.filter(p => p.artist_name === artistName);
        if (!artistPlays.length) return null;

        // 1. Streak Calculation - Optimized with Set
        const playDateSet = new Set<number>();
        artistPlays.forEach(p => playDateSet.add(new Date(p.played_at).setHours(0,0,0,0)));
        const playDates = Array.from(playDateSet).sort((a, b) => a - b);

        // Calculate "Current Active Streak" (ending today or yesterday)
        let activeStreak = 0;
        const now = new Date().setHours(0,0,0,0);
        const yesterday = now - 86400000;
        
        // Reverse iterate for active streak
        for (let i = playDates.length - 1; i >= 0; i--) {
            if (i === playDates.length - 1) {
                if (playDates[i] === now || playDates[i] === yesterday) {
                    activeStreak = 1;
                } else {
                    break;
                }
            } else {
                const dayDiff = (playDates[i+1] - playDates[i]) / 86400000;
                if (dayDiff === 1) activeStreak++;
                else break;
            }
        }

        // 2. Favorite Song - Use Map for O(n) counting
        const songCounts = new Map<string, number>();
        artistPlays.forEach(p => songCounts.set(p.track_name, (songCounts.get(p.track_name) || 0) + 1));
        let topSongName = 'Unknown';
        let maxPlays = 0;
        songCounts.forEach((count, name) => {
            if (count > maxPlays) {
                maxPlays = count;
                topSongName = name;
            }
        });
        
        // 3. Peak Listening Time (Hour)
        const hourCounts = new Uint16Array(24); // Faster than Array
        artistPlays.forEach(p => {
            const h = new Date(p.played_at).getHours();
            hourCounts[h]++;
        });
        let peakHour = 0;
        let maxHourCount = 0;
        for (let i = 0; i < 24; i++) {
            if (hourCounts[i] > maxHourCount) {
                maxHourCount = hourCounts[i];
                peakHour = i;
            }
        }
        const formatTime = (h: number) => {
            if (h === 0) return 'Midnight';
            if (h === 12) return 'Noon';
            return h > 12 ? `${h-12} PM` : `${h} AM`;
        };

        // 4. Total Listening Time
        let totalDurationMs = 0;
        artistPlays.forEach(p => totalDurationMs += (p.duration_ms || 180000));
        const hours = Math.floor(totalDurationMs / (1000 * 60 * 60));
        const minutes = Math.floor((totalDurationMs % (1000 * 60 * 60)) / (1000 * 60));

        return {
            streak: activeStreak,
            topSong: topSongName,
            peakTime: formatTime(peakHour),
            totalTime: `${hours}h ${minutes}m`,
            firstPlay: new Date(Math.min(...artistPlays.map(p => new Date(p.played_at).getTime()))).toLocaleDateString()
        };
    }, [filteredPlays]);

    const handleItemClick = (item: TrendingItem) => {
        if (item.type === 'artist') {
            const stats = calculateArtistStats(item.name);
            
            // Get all tracks for this artist from filteredPlays with play counts
            const artistPlays = filteredPlays.filter(p => p.artist_name === item.name);
            const trackCounts = new Map<string, { track: any, count: number }>();
            
            for (const play of artistPlays) {
                const key = play.track_name;
                if (!trackCounts.has(key)) {
                    trackCounts.set(key, { track: play, count: 0 });
                }
                trackCounts.get(key)!.count++;
            }
            
            // Convert to array sorted by count
            const tracksWithCounts = Array.from(trackCounts.values())
                .sort((a, b) => b.count - a.count)
                .map(({ track, count }) => ({ ...track, count }));
            
            setSelectedItem({ ...item, stats, tracks: tracksWithCounts });
        } else {
            // For albums, also get tracks with counts
            const albumPlays = filteredPlays.filter(p => 
                p.album_name === item.name && p.artist_name === item.subName
            );
            const trackCounts = new Map<string, { track: any, count: number }>();
            
            for (const play of albumPlays) {
                const key = play.track_name;
                if (!trackCounts.has(key)) {
                    trackCounts.set(key, { track: play, count: 0 });
                }
                trackCounts.get(key)!.count++;
            }
            
            const tracksWithCounts = Array.from(trackCounts.values())
                .sort((a, b) => b.count - a.count)
                .map(({ track, count }) => ({ ...track, count }));
            
            setSelectedItem({ ...item, tracks: tracksWithCounts });
        }
    };

    // Scroll Lock Effect
    useEffect(() => {
        if (selectedItem) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [selectedItem]);

    // Calculate Trending Data based on Active Tab - Optimized with useMemo
    const calculatedTrending = useMemo(() => {
        if (!filteredPlays || filteredPlays.length === 0) return [];

        const now = Date.now();
        const stats = new Map<string, { plays: number[], image: string | null, subName?: string, tracks: any[] }>();

        // Single pass through data
        for (const play of filteredPlays) {
            let key = ''; 
            let image = '';
            let subName = '';
            
            if (activeTab === 'artist') {
                key = play.artist_name || 'Unknown Artist';
                image = (artistImages && artistImages[key]) ? artistImages[key] : (play.album_cover || play.cover);
            } else {
                const album = play.album_name || 'Unknown Album';
                const artist = play.artist_name || 'Unknown Artist';
                key = `${album}||${artist}`;
                subName = artist;
                image = play.album_cover || play.cover;
            }

            if (!stats.has(key)) {
                const validImage = image && image.length > 5 ? image : null;
                stats.set(key, { plays: [], image: validImage, subName, tracks: [] });
            } else if (!stats.get(key)!.image && image && image.length > 5) {
                stats.get(key)!.image = image;
            }
            
            stats.get(key)!.plays.push(new Date(play.played_at).getTime());
            
            // Add track info (dedupe by track name)
            const trackData = stats.get(key)!;
            if (!trackData.tracks.find((t: any) => t.track_name === play.track_name)) {
                trackData.tracks.push(play);
            }
        }

        // Compute Scores - Optimized calculations
        const result: TrendingItem[] = [];
        const halfLifeMs = 14 * 24 * 60 * 60 * 1000;
        const sessionGapMs = 90 * 60 * 1000;

        stats.forEach((data, key) => {
            if (data.plays.length < 1) return;

            const sortedPlays = data.plays.sort((a, b) => a - b);
            const totalPlays = sortedPlays.length;
            const firstPlay = sortedPlays[0];
            const lastPlay = sortedPlays[totalPlays - 1];

            const spanDays = Math.max(1, Math.ceil((lastPlay - firstPlay) / (24 * 60 * 60 * 1000)) + 1);
            const uniqueDaysSet = new Set(sortedPlays.map(play => Math.floor(play / (24 * 60 * 60 * 1000))));
            const uniqueDays = uniqueDaysSet.size;
            const consistency = uniqueDays / spanDays;
            const playsPerDay = totalPlays / uniqueDays;

            // Session counting
            let sessionCount = 1;
            for (let i = 1; i < sortedPlays.length; i++) {
                if (sortedPlays[i] - sortedPlays[i - 1] > sessionGapMs) sessionCount++;
            }
            const sessionIntensity = totalPlays / sessionCount;

            const daysSinceLastPlay = (now - lastPlay) / (24 * 60 * 60 * 1000);
            const recencyFactor = Math.exp(-daysSinceLastPlay / 14);

            // Recency weighted plays
            let recencyWeightedPlays = 0;
            for (const play of sortedPlays) {
                recencyWeightedPlays += Math.exp(-(now - play) / halfLifeMs);
            }

            // Score components - Normalized to 0-100 scale
            // Volume: How much you listen (log scale for diminishing returns) - Max ~25
            const volumeScore = Math.min(25, Math.log1p(totalPlays) * 6);
            // Consistency: How regularly you listen (ratio of active days) - Max 25
            const consistencyScore = Math.min(25, consistency * 25);
            // Intensity: Average plays per active day - Max 20
            const intensityScore = Math.min(1, playsPerDay / 5) * 20;
            // Focus: Plays per session (high = obsessed in a session) - Max 15
            const focusScore = Math.min(1, sessionIntensity / 6) * 15;
            // Recency: How recently you listened - Max 15
            const recencyScore = recencyFactor * 15;

            const score = volumeScore + consistencyScore + intensityScore + focusScore + recencyScore;

            const finalImage = data.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(key)}&background=random`;
            
            // Ensure key is a string and handle potential undefined/null
            let safeKey = String(key || 'unknown');
            if (safeKey === 'undefined' || safeKey === 'null') safeKey = 'unknown';
            
            const trendId = safeKey.replace ? safeKey.replace(/\s+/g, '-').toLowerCase() : 'unknown-item';

            result.push({
                id: `trend-${trendId}-${activeTab}`,
                name: activeTab === 'artist' ? key : data.subName ? key.split('||')[0] : key,
                subName: data.subName,
                image: finalImage,
                trendScore: Math.round(score),
                recentPlays: totalPlays,
                type: activeTab,
                tracks: data.tracks
            });
        });

        result.sort((a, b) => b.trendScore - a.trendScore);
        return result.slice(0, 27);
    }, [filteredPlays, activeTab, artistImages]);

    // Update trending items when calculation changes
    useEffect(() => {
        setTrendingItems(calculatedTrending);
    }, [calculatedTrending]);

    // Handle Closing
    const handleClose = () => setSelectedItem(null);


    // ORBITAL LAYOUT
    const centerItem = trendingItems[0];
    const innerRing = trendingItems.slice(1, 9);
    const outerRing = trendingItems.slice(9, 27);

    // Dynamic rotation for rings
    // We use Framer Motion for smooth continuous rotation
    
    return (
        <div className="relative z-0 flex flex-col md:flex-row gap-8 items-start mb-12">
            
            <div className="flex-1 w-full relative min-h-[400px] md:min-h-[500px]">
                <div className="flex justify-between items-end mb-4 md:mb-16 px-2 relative z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                            Obsession Orbit
                        </h2>
                        <p className="text-[#8E8E93] text-sm mt-1">
                            Your {activeTab} universe in motion
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Year Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button 
                                onClick={() => setShowYearDropdown(!showYearDropdown)}
                                className="flex items-center gap-1 text-[11px] font-medium text-[#8E8E93] bg-[#1C1C1E] px-3 py-1.5 rounded-lg border border-white/5 hover:bg-[#2C2C2E] transition-colors"
                            >
                                {selectedYear} <ChevronDown size={12} className={`transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showYearDropdown && (
                                <div className="absolute right-0 top-full mt-1 bg-[#1C1C1E] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[90px] animate-in fade-in slide-in-from-top-2 duration-200">
                                    {AVAILABLE_YEARS.map(year => (
                                        <button
                                            key={year}
                                            onClick={() => {
                                                setSelectedYear(year);
                                                setShowYearDropdown(false);
                                                setSelectedItem(null);
                                            }}
                                            className={`w-full px-3 py-1.5 text-left text-[11px] font-medium flex items-center justify-between gap-2 hover:bg-white/5 transition-colors ${
                                                year === selectedYear ? 'text-white bg-white/5' : 'text-[#8E8E93]'
                                            }`}
                                        >
                                            {year}
                                            {year === selectedYear && <Check size={10} className="text-[#FA2D48]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Custom Toggle UI */}
                        <div className="bg-[#1C1C1EFF] p-1 rounded-full flex gap-1 border border-white/5 shadow-sm">
                            <button 
                                onClick={() => setActiveTab('artist')}
                                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'artist' ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93] hover:text-white'}`}
                            >
                                 Artists
                            </button>
                            <button 
                                onClick={() => setActiveTab('album')}
                                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs font-semibold transition-all flex items-center gap-2 ${activeTab === 'album' ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93] hover:text-white'}`}
                            >
                                 Albums
                            </button>
                        </div>
                    </div>
                </div>

                {/* MAIN ORBIT VIEW */}
                {trendingItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                        <Music className="w-10 h-10 text-white/10 mb-4" />
                        <p className="text-white/30 text-sm font-medium">No data for {selectedYear}</p>
                        <p className="text-white/15 text-xs mt-1">Try selecting a different year</p>
                    </div>
                ) : (
                <motion.div 
                    layout
                    className="relative w-full max-w-[480px] mx-auto aspect-square select-none scale-[0.65] sm:scale-75 md:scale-100 origin-center md:origin-top mt-[-40px] md:mt-0"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    
                    {/* Center Item */}
                    {centerItem && (
                        <div 
                            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 cursor-pointer group transition-all duration-300 ${selectedItem && selectedItem.id !== centerItem.id ? 'opacity-30 blur-sm scale-90' : 'opacity-100'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleItemClick(centerItem);
                            }}
                        >
                            <div className="relative w-28 h-28 md:w-36 md:h-36">
                                <div className="w-full h-full rounded-full overflow-hidden border-4 border-[#1C1C1E] shadow-2xl relative z-10 bg-[#1C1C1E] transition-transform duration-500 group-hover:scale-105">
                                    <img src={centerItem.image} className="w-full h-full object-cover" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Inner Ring Layer (Counter-Clockwise) */}
                    <div 
                        className={`absolute inset-0 z-20 transition-all duration-500 pointer-events-none ${selectedItem ? '[animation-play-state:paused] opacity-30' : 'hover:[animation-play-state:paused] opacity-100'}`}
                        style={{ animation: 'spin-slow 60s linear infinite' }}
                    >
                         <style>{`
                            @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                            @keyframes spin-reverse-slow { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
                            .animate-spin-slow { animation: spin-slow 60s linear infinite; }
                            .animate-spin-reverse-slow { animation: spin-reverse-slow 90s linear infinite; }
                         `}</style>
                        
                        <div className="w-full h-full absolute inset-0 animate-spin-slow group-hover:[animation-play-state:paused]">
                            {innerRing.map((item, i) => {
                                const total = innerRing.length;
                                const angle = (i / total) * 360;
                                const radius = 34; // %
                                
                                return (
                                    <div 
                                        key={item.id}
                                        className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-auto"
                                        style={{ 
                                            transform: `rotate(${angle}deg) translate(${radius * 5}px) rotate(-${angle}deg)` 
                                        }}
                                    >
                                        <div className="animate-spin-reverse-slow group-hover:[animation-play-state:paused]">
                                            <OrbitNode 
                                                item={item} 
                                                rank={i + 2} 
                                                size={60} 
                                                isActive={selectedItem?.id === item.id}
                                                isDimmed={selectedItem !== null && selectedItem.id !== item.id}
                                                onClick={() => handleItemClick(item)} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Outer Ring Layer (Clockwise) */}
                    <div 
                        className={`absolute inset-0 z-10 transition-all duration-500 pointer-events-none ${selectedItem ? '[animation-play-state:paused] opacity-30' : 'hover:[animation-play-state:paused] opacity-100'}`}
                        style={{ animation: 'spin-reverse-slow 90s linear infinite' }}
                    >
                         <div className="w-full h-full absolute inset-0 animate-spin-reverse-slow group-hover:[animation-play-state:paused]">
                            {outerRing.map((item, i) => {
                                const total = outerRing.length;
                                const angle = (i / total) * 360;
                                const radius = 48; // %
                                
                                return (
                                    <div 
                                        key={item.id}
                                        className="absolute top-1/2 left-1/2 w-0 h-0 pointer-events-auto"
                                        style={{ 
                                            transform: `rotate(${angle}deg) translate(${radius * 5}px) rotate(-${angle}deg)` 
                                        }}
                                    >
                                        <div className="animate-spin-slow group-hover:[animation-play-state:paused]">
                                            <OrbitNode 
                                                item={item} 
                                                rank={i + 10} 
                                                size={40} 
                                                isActive={selectedItem?.id === item.id}
                                                isDimmed={selectedItem !== null && selectedItem.id !== item.id}
                                                onClick={() => handleItemClick(item)} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Orbital Lines */}
                    <div className="absolute inset-0 rounded-full border border-white/5 opacity-60 scale-[0.68] pointer-events-none"></div>
                    <div className="absolute inset-0 rounded-full border border-white/5 opacity-40 scale-[0.96] pointer-events-none"></div>
                    <div className="absolute inset-0 rounded-full border border-white/5 opacity-30 scale-[0.82] pointer-events-none"></div>
                </motion.div>
                )}
            </div>
            
            {/* SIDE PANEL VIEW (Replaces Modal) */}
            {createPortal(
                <AnimatePresence mode="wait">
                    {selectedItem && (
                        <>
                            {/* Global Backdrop (Click to close) */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150]"
                                onClick={() => setSelectedItem(null)}
                            />

                            {/* Floating Side Panel */}
                            <motion.div 
                                initial={{ opacity: 0, x: 50, scale: 0.95 }} 
                                animate={{ opacity: 1, x: 0, scale: 1 }} 
                                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="fixed top-2 bottom-2 right-2 w-[calc(100vw-16px)] md:w-[320px] z-[200] max-h-[calc(100vh-16px)] pointer-events-none"
                            >
                                <div 
                                    className="h-full w-full bg-[#1C1C1E] rounded-3xl overflow-hidden flex flex-col relative shadow-2xl border border-white/10 pointer-events-auto"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button 
                                        onClick={() => setSelectedItem(null)} 
                                        className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 rounded-full p-2 text-white z-50 transition-colors backdrop-blur-md"
                                    >
                                        <X size={20} />
                                    </button>

                            {/* BANNER HEADER */}
                            <div className="relative w-full h-56 overflow-hidden flex-shrink-0">
                                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-transparent to-transparent z-10"></div>
                                <img 
                                    src={selectedItem.image} 
                                    alt={selectedItem.name} 
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-4 left-6 z-20">
                                    <h2 className="text-2xl font-black text-white leading-none tracking-tight mb-1 drop-shadow-lg line-clamp-2">{selectedItem.name}</h2>
                                    {selectedItem.subName && <p className="text-white/60 text-xs font-medium tracking-wide drop-shadow-md">{selectedItem.subName}</p>}
                                    <div className="inline-flex items-center gap-1.5 mt-2 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/5">
                                        <Sparkles size={10} className="text-white" />
                                        <span className="text-[10px] uppercase font-bold text-white tracking-wider">Obsession Score: {selectedItem.trendScore}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto no-scrollbar pb-8 pt-2">
                                {/* STATS ROW (Grid Layout) */}
                                {/* @ts-ignore */}
                                {selectedItem.stats ? (
                                    <>
                                        <div className="grid grid-cols-3 gap-2 px-4 mb-6">
                                            {/* @ts-ignore */}
                                            <div className="bg-white/5 p-3 rounded-lg text-center flex flex-col items-center justify-center">
                                                <div className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Streak</div>
                                                {/* @ts-ignore */}
                                                <div className="text-lg font-bold text-white leading-none">{selectedItem.stats.streak}<span className="text-[10px] font-normal text-white/40 ml-0.5">d</span></div>
                                            </div>

                                            <div className="bg-white/5 p-3 rounded-lg text-center flex flex-col items-center justify-center">
                                                <div className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Peak</div>
                                                {/* @ts-ignore */}
                                                <div className="text-base font-bold text-white leading-none truncate w-full">{selectedItem.stats.peakTime}</div>
                                            </div>

                                            <div className="bg-white/5 p-3 rounded-lg text-center flex flex-col items-center justify-center">
                                                <div className="text-[9px] font-bold uppercase tracking-widest text-white/40 mb-1">Time</div>
                                                {/* @ts-ignore */}
                                                <div className="text-base font-bold text-white leading-none truncate w-full">{selectedItem.stats.totalTime}</div>
                                            </div>
                                        </div>

                                        {/* TOP SONGS LIST */}
                                        <div className="px-4">
                                            <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-3 pl-2 opacity-50">Top Tracks</h3>
                                            <div className="space-y-0.5">
                                                {/* @ts-ignore */}
                                                {selectedItem.tracks && selectedItem.tracks.length > 0 ? (
                                                    selectedItem.tracks
                                                    .slice(0, 15)
                                                    .map((track: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-md group transition-colors cursor-default">
                                                            <div className="text-[#8E8E93] font-mono text-[10px] w-4 text-center">{idx + 1}</div>
                                                            <div className="w-8 h-8 rounded bg-[#2C2C2E] overflow-hidden flex-shrink-0">
                                                                <img src={track.album_cover || track.cover} className="w-full h-full object-cover" alt="" />
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-[13px] font-medium text-white truncate group-hover:text-white transition-colors">{track.track_name}</div>
                                                                <div className="text-[10px] text-[#8E8E93] truncate">{track.count} plays</div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                     <div className="text-xs text-[#8E8E93] italic py-4 text-center">Track data unavailable</div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center text-white/40 py-20 flex flex-col items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        <span className="text-xs tracking-widest uppercase">Calculating Orbit...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                        </>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

// Helper Component for Orbit Nodes
const OrbitNode = ({ item, rank, size, isActive, isDimmed, onClick }: { item: TrendingItem, rank: number, size: number, isActive: boolean, isDimmed: boolean, onClick: () => void }) => {
    return (
        <div 
            className={`group absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 ${isDimmed ? 'opacity-20 scale-75 blur-[1px]' : 'opacity-100'} ${isActive ? 'scale-110 z-50' : ''}`}
            onClick={onClick}
        >
            <div 
                className={`relative rounded-full overflow-hidden border transition-all duration-300 bg-[#1C1C1E] ${isActive ? 'border-[#FA2D48] shadow-[0_0_20px_#FA2D48]' : 'border-[#1C1C1E] shadow-lg group-hover:scale-125'}`}
                style={{ width: size, height: size }}
            >
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                
                {/* Shiny overlay on hover */}
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-full pointer-events-none"></div>
            </div>

            {/* Custom Tooltip - STRAIGHT (Not rotated via parent) */}
            <div className={`absolute top-full mt-3 left-1/2 -translate-x-1/2 transition-all duration-200 pointer-events-none z-[60] min-w-[max-content] text-center ${isActive || isDimmed ? 'opacity-0' : 'opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2'}`}>
                 <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 shadow-2xl transform-none flex items-center gap-3">
                     <span className="text-[10px] font-black text-[#FA2D48] font-mono">#{rank}</span>
                     <div className="h-3 w-px bg-white/20"></div>
                     <p className="text-[11px] font-bold text-white whitespace-nowrap">{item.recentPlays} plays</p>
                 </div>
            </div>
        </div>
    );
};
