import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Music, Check, TrendingUp } from 'lucide-react';
import { fetchHeatmapData } from '../../services/dbService';
import { AnimatePresence, motion } from 'framer-motion';

interface ActivityHeatmapProps {
    history?: any[];
    variant?: 'full' | 'compact';
}

const AVAILABLE_YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ history: propHistory, variant = 'full' }) => {
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

    const filteredHistory = useMemo(() => {
        if (!fullHistory) return [];
        return fullHistory.filter(item => {
            if (!item.played_at) return false;
            const year = new Date(item.played_at).getFullYear();
            return year === selectedYear;
        });
    }, [fullHistory, selectedYear]);

    const { dailyData, dailyTracks, maxCount, totalPlays, totalMinutes } = useMemo(() => {
        const grouped: Record<string, number> = {};
        const tracks: Record<string, any[]> = {};
        let max = 0;
        let tPlays = 0;
        let tMins = 0;

        if (!filteredHistory || filteredHistory.length === 0) {
            return { dailyData: {}, dailyTracks: {}, maxCount: 1, totalPlays: 0, totalMinutes: 0 };
        }

        for (const item of filteredHistory) {
            if (!item.played_at) continue;
            tPlays++;
            tMins += (item.duration_ms || 0) / 60000;

            const date = new Date(item.played_at);
            const dateStr = date.toLocaleDateString('en-CA');

            grouped[dateStr] = (grouped[dateStr] || 0) + 1;

            if (!tracks[dateStr]) tracks[dateStr] = [];
            tracks[dateStr].push(item);

            if (grouped[dateStr] > max) max = grouped[dateStr];
        }

        for (const date of Object.keys(tracks)) {
            tracks[date].sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
        }

        return { dailyData: grouped, dailyTracks: tracks, maxCount: Math.max(max, 5), totalPlays: tPlays, totalMinutes: Math.round(tMins) };
    }, [filteredHistory]);

    const weeks = useMemo(() => {
        const year = selectedYear;
        const startDate = new Date(year, 0, 1);
        const startDayOfWeek = startDate.getDay();
        const gridStart = new Date(startDate);
        gridStart.setDate(startDate.getDate() - startDayOfWeek);

        const weeksArr = [];
        let current = new Date(gridStart);

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
        if (count === 0) return 'bg-[#161b22] border border-[#e8e6dc]';

        const intensity = count / maxCount;
        if (intensity < 0.25) return 'bg-[#404040]'; // Dark Grey
        if (intensity < 0.5) return 'bg-[#808080]'; // Medium Grey
        if (intensity < 0.75) return 'bg-[#bfbfbf]'; // Light Grey
        return 'bg-white'; // Full White
    };

    const handleDayClick = (dateStr: string) => {
        if (!dailyTracks[dateStr] || dailyTracks[dateStr].length === 0) return;
        setSelectedDate(dateStr);
        setSelectedTracks(dailyTracks[dateStr]);
    };

    const isCompact = variant === 'compact';

    return (
        <div className={`relative flex flex-col ${isCompact ? 'gap-4' : 'lg:flex-row gap-8'} items-start transition-all duration-500 overflow-x-hidden w-full`}>

            {/* LEFT: Heatmap Container */}
            <div className={`w-full transition-all duration-500 ease-in-out ${!isCompact && selectedDate ? 'lg:w-[calc(100%-390px)]' : 'w-full'}`}>
                <div className={`w-full max-w-4xl mx-auto ${isCompact ? 'mb-4' : 'mb-8'} animate-in fade-in slide-in-from-top-4 duration-700`}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 px-1 gap-4">
                        <div className="flex flex-col gap-0.5">
                            <h3 className="text-xl font-bold text-[#141413] tracking-tight">{totalPlays.toLocaleString()} contributions</h3>
                            <p className="text-[13px] text-[#b0aea5] font-medium flex items-center gap-2">
                                <span>{totalMinutes.toLocaleString()} minutes of music</span>
                                <span className="w-1 h-1 rounded-full bg-[#333]"></span>
                                <span>{selectedYear}</span>
                            </p>
                        </div>
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setShowYearDropdown(!showYearDropdown)}
                                className="flex items-center gap-1 text-[12px] font-medium text-[#b0aea5] bg-white px-3 py-1.5 rounded-lg border border-[#e8e6dc] hover:bg-[#2C2C2E] transition-colors"
                            >
                                {selectedYear} <ChevronDown size={14} className={`transition-transform ${showYearDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showYearDropdown && (
                                <div className="absolute right-0 top-full mt-1 bg-white border border-[#e8e6dc] rounded-xl shadow-2xl z-50 overflow-hidden min-w-[100px] animate-in fade-in slide-in-from-top-2 duration-200">
                                    {AVAILABLE_YEARS.map(year => (
                                        <button
                                            key={year}
                                            onClick={() => {
                                                setSelectedYear(year);
                                                setShowYearDropdown(false);
                                                setSelectedDate(null);
                                                setSelectedTracks([]);
                                            }}
                                            className={`w-full px-4 py-2 text-left text-[12px] font-medium flex items-center justify-between gap-2 hover:bg-[#e8e6dc]/50 transition-colors ${year === selectedYear ? 'text-[#141413] bg-[#e8e6dc]/50' : 'text-[#b0aea5]'}`}
                                        >
                                            {year}
                                            {year === selectedYear && <Check size={12} className="text-[#d97757]" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

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
                    <div className="flex justify-between items-center mt-3 text-[10px] text-[#b0aea5] px-1">
                        <span>Learn how we count contributions</span>
                        <div className="flex items-center gap-1">
                            <span>Less</span>
                            <div className="w-[10px] h-[10px] bg-[#161b22] rounded-[2px] border border-[#e8e6dc]" />
                            <div className="w-[10px] h-[10px] bg-[#404040] rounded-[2px]" />
                            <div className="w-[10px] h-[10px] bg-[#808080] rounded-[2px]" />
                            <div className="w-[10px] h-[10px] bg-[#bfbfbf] rounded-[2px]" />
                            <div className="w-[10px] h-[10px] bg-white rounded-[2px]" />
                            <span>More</span>
                        </div>
                    </div>

                    {totalPlays === 0 && fullHistory.length > 0 && (
                        <div className="flex flex-col items-center justify-center py-8 mt-4 bg-[#e8e6dc]/500 rounded-2xl border border-[#e8e6dc] animate-in fade-in duration-500">
                            <Music className="w-6 h-6 text-[#141413]/20 mb-2" />
                            <p className="text-[#141413]/40 text-sm font-medium">No listening data for {selectedYear}</p>
                            <p className="text-[#141413]/20 text-xs mt-1">Try selecting a different year</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Detail View (Desktop Side Panel / Mobile Modal) */}
            <AnimatePresence>
                {selectedDate && (
                    <>
                        {/* Desktop / Compact Inline Panel - Clean & Dark */}
                        <motion.div
                            initial={{ x: isCompact ? 0 : 20, opacity: 0, height: isCompact ? 0 : 500 }}
                            animate={{ x: 0, opacity: 1, height: isCompact ? 400 : 500 }}
                            exit={{ x: isCompact ? 0 : 20, opacity: 0, height: isCompact ? 0 : 0 }}
                            className={`${
                                !isCompact
                                ? 'hidden lg:flex w-full lg:w-[380px] flex-shrink-0 bg-[#111] border border-[#e8e6dc] rounded-3xl overflow-hidden shadow-2xl flex-col relative sticky top-24'
                                : 'w-full flex flex-col bg-[#111] border border-[#e8e6dc] rounded-3xl overflow-hidden shadow-2xl h-[300px] relative mt-2'
                            }`}
                        >
                            <div className="relative flex-shrink-0 p-6 border-b border-[#e8e6dc] bg-gradient-to-b from-white/5 to-transparent">
                                <button
                                    onClick={() => setSelectedDate(null)}
                                    className="absolute top-4 right-4 w-7 h-7 rounded-full bg-[#222] hover:bg-[#333] flex items-center justify-center text-[#b0aea5] hover:text-[#141413] transition-colors"
                                >
                                    <X size={14} />
                                </button>

                                <div className="flex flex-col gap-1 mt-2">
                                    <h2 className="text-3xl font-bold text-[#141413] tracking-tight">
                                        {new Date(selectedDate).toLocaleString('default', { month: 'short' })} <span className="text-[#d97757]">{new Date(selectedDate).getDate()}</span>
                                    </h2>
                                    <p className="text-sm font-medium text-[#b0aea5] flex items-center gap-2">
                                        <span>{selectedTracks.length} tracks</span>
                                        <span className="w-1 h-1 rounded-full bg-[#3A3A3C]" />
                                        <span>{new Date(selectedDate).getFullYear()}</span>
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mt-6">
                                    <div className="bg-[#222] rounded-xl p-3 border border-[#e8e6dc]">
                                        <span className="block text-xl font-bold text-[#141413]">{selectedTracks.length}</span>
                                        <span className="text-[10px] font-bold text-[#b0aea5] uppercase tracking-wide">Plays</span>
                                    </div>
                                    <div className="bg-[#222] rounded-xl p-3 border border-[#e8e6dc]">
                                        <span className="block text-xl font-bold text-[#141413]">
                                            {Math.round(selectedTracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0) / 60000)}
                                        </span>
                                        <span className="text-[10px] font-bold text-[#b0aea5] uppercase tracking-wide">Minutes</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                <div className="p-2 space-y-1">
                                    {selectedTracks.map((track, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#e8e6dc]/50 transition-colors group cursor-default">
                                            <div className="relative w-10 h-10 rounded overflow-hidden bg-[#222] flex-shrink-0 shadow-sm border border-[#e8e6dc]">
                                                <img src={track.cover || track.album_cover} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-[13px] font-medium text-[#141413] truncate group-hover:text-[#d97757] transition-colors">{track.track_name || track.name}</h4>
                                                <p className="text-[11px] text-[#b0aea5] truncate">{track.artist_name || track.artist}</p>
                                            </div>
                                            <span className="text-[10px] font-medium text-[#b0aea5] tabular-nums pr-2 opacity-50 group-hover:opacity-100">
                                                {new Date(track.played_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        {/* Mobile Bottom Sheet (Clean Style) - Only if not compact */}
                        {!isCompact && (
                            <motion.div
                                initial={{ y: "100%" }}
                                animate={{ y: 0 }}
                                exit={{ y: "100%" }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                className="fixed inset-x-0 bottom-0 z-[60] lg:hidden h-[50vh]"
                            >
                                <div className="absolute inset-0 bg-[#faf9f5]/60 backdrop-blur-sm -z-10 h-[100vh] top-[-100vh]" onClick={() => setSelectedDate(null)} />

                                <div className="bg-[#111] border-t border-[#e8e6dc] rounded-t-[30px] p-6 h-full flex flex-col shadow-2xl relative">
                                    <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-[#333] rounded-full" />

                                    <div className="flex justify-between items-start mt-4 mb-6">
                                        <div>
                                            <h2 className="text-3xl font-bold text-[#141413] tracking-tight">
                                                {new Date(selectedDate).toLocaleString('default', { month: 'short' })} <span className="text-[#d97757]">{new Date(selectedDate).getDate()}</span>
                                            </h2>
                                            <p className="text-sm text-[#b0aea5] mt-1 font-medium">{selectedTracks.length} tracks played</p>
                                        </div>
                                        <button
                                            onClick={() => setSelectedDate(null)}
                                            className="bg-[#222] p-2 rounded-full text-[#141413]/50 hover:text-[#141413]"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                                        <div className="space-y-2 pb-10">
                                            {selectedTracks.map((track, i) => (
                                                <div key={i} className="flex items-center gap-4 p-3 rounded-2xl bg-[#e8e6dc]/50 border border-[#e8e6dc]">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#222] shrink-0">
                                                        <img src={track.cover || track.album_cover} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-[#141413] truncate">{track.track_name || track.name}</h4>
                                                        <p className="text-xs text-[#b0aea5] truncate">{track.artist_name || track.artist}</p>
                                                    </div>
                                                    <span className="text-[10px] text-[#555] font-bold">
                                                        {new Date(track.played_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};
