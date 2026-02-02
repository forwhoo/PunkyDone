import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Music, Check } from 'lucide-react';
import { fetchHeatmapData } from '../services/dbService';

interface ActivityHeatmapProps {
    history?: any[]; // Keep prop for backwards compat, but we will likely fetch full data
}

const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ history: propHistory }) => {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedTracks, setSelectedTracks] = useState<any[]>([]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [showYearDropdown, setShowYearDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [fullHistory, setFullHistory] = useState<any[]>(propHistory || []);

    // FETCH FULL DATA ON MOUNT
    useEffect(() => {
        const load = async () => {
            const data = await fetchHeatmapData();
            if (data && data.length > 0) {
                setFullHistory(data);
            }
        };
        load();
    }, []);

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

    // Filter history by selected year
    const filteredHistory = useMemo(() => {
        if (!fullHistory) return [];
        return fullHistory.filter(item => {
            if (!item.played_at) return false;
            const year = new Date(item.played_at).getFullYear();
            return year === selectedYear;
        });
    }, [fullHistory, selectedYear]);

    // 1. Process Data: Group by Date (YYYY-MM-DD) - Optimized with single pass
    const { dailyData, dailyTracks, maxCount, totalPlays, totalMinutes } = useMemo(() => {
        const grouped: Record<string, number> = {};
        const tracks: Record<string, any[]> = {};
        let max = 0;
        let tPlays = 0;
        let tMins = 0;

        if (!filteredHistory || filteredHistory.length === 0) {
            return { dailyData: {}, dailyTracks: {}, maxCount: 1, totalPlays: 0, totalMinutes: 0 };
        }

        // Single pass through data
        for (const item of filteredHistory) {
            if (!item.played_at) continue;
            tPlays++;
            tMins += (item.duration_ms || 0) / 60000;

            const date = new Date(item.played_at);
            const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD

            grouped[dateStr] = (grouped[dateStr] || 0) + 1;

            if (!tracks[dateStr]) tracks[dateStr] = [];
            tracks[dateStr].push(item);

            // Track max inline
            if (grouped[dateStr] > max) max = grouped[dateStr];
        }

        // Sort tracks by time desc
        for (const date of Object.keys(tracks)) {
            tracks[date].sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
        }

        return { dailyData: grouped, dailyTracks: tracks, maxCount: Math.max(max, 5), totalPlays: tPlays, totalMinutes: Math.round(tMins) };
    }, [filteredHistory]);

    // 2. Generate Calendar Grid (Horizontal: Weeks, Vertical: Days)
    const weeks = useMemo(() => {
        const year = selectedYear;
        const startDate = new Date(year, 0, 1); // Jan 1

        // Align to Sunday start
        const startDayOfWeek = startDate.getDay(); // 0 = Sunday
        const gridStart = new Date(startDate);
        gridStart.setDate(startDate.getDate() - startDayOfWeek);

        const weeksArr = [];
        let current = new Date(gridStart);

        // Loop for 53 weeks to fill the grid
        for (let w = 0; w < 53; w++) {
            const currentWeek = [];
            for (let d = 0; d < 7; d++) {
                const dateStr = current.toLocaleDateString('en-CA');
                const isTargetYear = current.getFullYear() === year;

                currentWeek.push({
                    date: dateStr,
                    count: dailyData[dateStr] || 0,
                    inYear: isTargetYear
                });
                current.setDate(current.getDate() + 1);
            }
            weeksArr.push(currentWeek);
        }
        return weeksArr;
    }, [dailyData, selectedYear]);

    const getThemeColor = (count: number, inYear: boolean) => {
        if (!inYear) return 'invisible';
        if (count === 0) return 'bg-[#161b22] border border-white/5'; // Dark block

        const intensity = count / maxCount;
        // White scale
        if (intensity < 0.25) return 'bg-[#404040]';
        if (intensity < 0.5) return 'bg-[#808080]';
        if (intensity < 0.75) return 'bg-[#bfbfbf]';
        return 'bg-white';
    };

    const handleDayClick = (dateStr: string) => {
        if (!dailyTracks[dateStr] || dailyTracks[dateStr].length === 0) return;
        setSelectedDate(dateStr);
        setSelectedTracks(dailyTracks[dateStr]);
    };

    return (
        <div className="relative flex flex-col lg:flex-row gap-8 items-start transition-all duration-500 overflow-x-hidden w-full">

            {/* LEFT: Heatmap Container - Mobile Friendly Scrolling */}
            <div className={`w-full transition-all duration-500 ease-in-out ${selectedDate ? 'lg:w-[calc(100%-390px)]' : 'w-full'}`}>
                <div className="w-full max-w-4xl mx-auto mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 px-1 gap-4">
                        <div className="flex flex-col gap-0.5">
                            <h3 className="text-xl font-bold text-white tracking-tight">{totalPlays.toLocaleString()} contributions</h3>
                            <p className="text-[13px] text-[#8E8E93] font-medium flex items-center gap-2">
                                <span>{totalMinutes.toLocaleString()} minutes of music</span>
                                <span className="w-1 h-1 rounded-full bg-[#333]"></span>
                                <span>{selectedYear}</span>
                            </p>
                        </div>
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowYearDropdown(!showYearDropdown)}
                                className="flex items-center gap-1 text-[12px] font-medium text-[#8E8E93] bg-[#1C1C1E] px-3 py-1.5 rounded-lg border border-white/5 hover:bg-[#2C2C2E] transition-colors"
                            >
                                {selectedYear} <ChevronDown size={14} className={`transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showYearDropdown && (
                                <div className="absolute right-0 top-full mt-1 bg-[#1C1C1E] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[100px] animate-in fade-in slide-in-from-top-2 duration-200">
                                    {AVAILABLE_YEARS.map(year => (
                                        <button
                                            key={year}
                                            onClick={() => {
                                                setSelectedYear(year);
                                                setShowYearDropdown(false);
                                                setSelectedDate(null);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-[12px] font-medium flex items-center justify-between gap-2 hover:bg-white/5 transition-colors ${year === selectedYear ? 'text-white bg-white/5' : 'text-[#8E8E93]'
                                                }`}
                                        >
                                            {year}
                                            {year === selectedYear && <Check size={12} className="text-[#FA2D48]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Horizontal Scrollable Heatmap */}
                    <div className="w-full overflow-x-auto pb-4 custom-scrollbar lg:no-scrollbar">
                        <div className="flex gap-[3px] min-w-max">
                            {weeks.map((week, idx) => (
                                <div key={idx} className="flex flex-col gap-[3px]">
                                    {week.map((day, dIdx) => (
                                        <div
                                            key={`${idx}-${dIdx}`}
                                            className={`w-[10px] h-[10px] rounded-[2px] transition-all hover:scale-125 hover:z-10 cursor-pointer ${getThemeColor(day.count, day.inYear)} ${selectedDate === day.date ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0A0A0A]' : ''}`}
                                            title={`${day.date}: ${day.count} plays`}
                                            onClick={() => handleDayClick(day.date)}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between items-center mt-3 text-[10px] text-[#8E8E93] px-1">
                        <span>Learn how we count contributions</span>
                        <div className="flex items-center gap-1">
                            <span>Less</span>
                            <div className="w-[10px] h-[10px] bg-[#161b22] rounded-[2px] border border-white/5" />
                            <div className="w-[10px] h-[10px] bg-[#404040] rounded-[2px]" />
                            <div className="w-[10px] h-[10px] bg-[#808080] rounded-[2px]" />
                            <div className="w-[10px] h-[10px] bg-[#bfbfbf] rounded-[2px]" />
                            <div className="w-[10px] h-[10px] bg-white rounded-[2px]" />
                            <span>More</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: Side Panel - Mobile gets a Modal/Fixed Overlay, Desktop gets side panel */}
            {selectedDate && (
                <>
                    {/* Desktop Panel */}
                    <div className="hidden lg:flex w-full lg:w-[380px] flex-shrink-0 bg-[#1C1C1E]/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-right fade-in duration-500 h-[600px] flex-col relative sticky top-24">

                        {/* Header: Apple Music Style Gradient/Blur */}
                        <div className="relative flex-shrink-0 p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                            <button
                                onClick={() => setSelectedDate(null)}
                                className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#2C2C2E] hover:bg-[#3A3A3C] flex items-center justify-center text-[#8E8E93] hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>

                            <div className="flex flex-col gap-1 mt-2">
                                <h2 className="text-3xl font-bold text-white tracking-tight">
                                    {new Date(selectedDate).toLocaleString('default', { month: 'short' })} <span className="text-[#FA2D48]">{new Date(selectedDate).getDate()}</span>
                                </h2>
                                <p className="text-sm font-medium text-[#8E8E93] flex items-center gap-2">
                                    <span>{selectedTracks.length} tracks</span>
                                    <span className="w-1 h-1 rounded-full bg-[#3A3A3C]" />
                                    <span>{new Date(selectedDate).getFullYear()}</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-6">
                                <div className="bg-[#2C2C2E]/50 rounded-xl p-3 border border-white/5">
                                    <span className="block text-xl font-bold text-white">{selectedTracks.length}</span>
                                    <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide">Plays</span>
                                </div>
                                <div className="bg-[#2C2C2E]/50 rounded-xl p-3 border border-white/5">
                                    <span className="block text-xl font-bold text-white">
                                        {Math.round(selectedTracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0) / 60000)}
                                    </span>
                                    <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wide">Minutes</span>
                                </div>
                            </div>
                        </div>

                        {/* Scrollable List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                            <div className="p-2 space-y-1">
                                {selectedTracks.map((track, i) => (
                                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group cursor-default">

                                        <div className="relative w-10 h-10 rounded overflow-hidden bg-[#2C2C2E] flex-shrink-0 shadow-sm">
                                            <img src={track.cover || track.album_cover} className="w-full h-full object-cover" />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-[13px] font-medium text-white truncate group-hover:text-[#FA2D48] transition-colors">{track.track_name || track.name}</h4>
                                            <p className="text-[11px] text-[#8E8E93] truncate">{track.artist_name || track.artist}</p>
                                        </div>

                                        <span className="text-[10px] font-medium text-[#8E8E93] tabular-nums pr-2 opacity-50 group-hover:opacity-100">
                                            {new Date(track.played_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Mobile Bottom Sheet Panel (Fixed Overlay) */}
                    <div className="fixed inset-x-0 bottom-0 z-[60] lg:hidden animate-in slide-in-from-bottom-full duration-500">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm -z-10 h-[100vh] top-[-100vh]" onClick={() => setSelectedDate(null)} />

                        <div className="bg-[#1C1C1E] border-t border-white/10 rounded-t-[30px] p-6 h-[70vh] flex flex-col shadow-2xl relative">
                            {/* Drag Handle */}
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-[#3A3A3C] rounded-full" />

                            <div className="flex justify-between items-start mt-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">
                                        {new Date(selectedDate).toLocaleString('default', { month: 'short' })} <span className="text-[#FA2D48]">{new Date(selectedDate).getDate()}</span>
                                    </h2>
                                    <p className="text-xs text-[#8E8E93] mt-1">{selectedTracks.length} tracks played</p>
                                </div>
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    className="bg-[#2C2C2E] p-2 rounded-full text-white"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto w-full">
                                <div className="space-y-2">
                                    {selectedTracks.map((track, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
                                            <div className="w-10 h-10 rounded-md overflow-hidden bg-[#333]">
                                                <img src={track.cover || track.album_cover} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-bold text-white truncate">{track.track_name || track.name}</h4>
                                                <p className="text-xs text-[#8E8E93] truncate">{track.artist_name || track.artist}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
