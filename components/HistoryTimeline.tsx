import React, { useState, useMemo } from 'react';
import { Calendar, Music, Clock, ChevronRight, Play } from 'lucide-react';

interface HistoryItem {
    id: string; // or number? usually id
    played_at: string; // ISO string
    track_name: string;
    artist_name: string;
    cover: string;
}

interface HistoryTimelineProps {
    history: any[]; 
}

export const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ history }) => {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // 1. Process Data: Group by Date (YYYY-MM-DD)
    const { dailyData, maxCount, totalPlays } = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        let max = 0;
        let total = 0;

        if (!history) return { dailyData: {}, maxCount: 1, totalPlays: 0 };

        history.forEach(item => {
            const date = new Date(item.played_at);
            // Use local date string YYYY-MM-DD
            // Using en-CA ensures YYYY-MM-DD format
            const dateStr = date.toLocaleDateString('en-CA'); 
            
            if (!grouped[dateStr]) grouped[dateStr] = [];
            grouped[dateStr].push(item);
            total++;
        });

        // Find max plays in a single day for color scaling
        Object.values(grouped).forEach(dayList => {
            if (dayList.length > max) max = dayList.length;
        });

        // Sort items within each day by time descending
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
        });

        return { dailyData: grouped, maxCount: Math.max(max, 1), totalPlays: total };
    }, [history]);

    // 2. Generate Calendar Grid (Last 365 Days)
    const calendarGrid = useMemo(() => {
        const today = new Date();
        const endDate = new Date(2026, 11, 31); // Dec 31, 2026
        const startDate = new Date(2026, 0, 1); // Jan 1, 2026

        // Align start date to previous Sunday to make grid nice
        const startDayOfWeek = startDate.getDay(); // 0 = Sunday
        const gridStart = new Date(startDate);
        gridStart.setDate(startDate.getDate() - startDayOfWeek);

        // Align end date to next Saturday
        const endDayOfWeek = endDate.getDay();
        const gridEnd = new Date(endDate);
        gridEnd.setDate(endDate.getDate() + (6 - endDayOfWeek));

        const weeks = [];
        let current = new Date(gridStart);
        
        let iterations = 0;
        // Should be around 53-54 weeks 
        while (current <= gridEnd && iterations < 60) {
            const week = [];
            for (let i = 0; i < 7; i++) {
                const dateStr = current.toLocaleDateString('en-CA');
                
                // Only count plays if it's actually within 2026 
                // OR within our known history range. 
                // However, the user wants "show all 365 days for 2026".
                // We mark days outside 2026 (from padding) as !inYear
                const is2026 = current.getFullYear() === 2026;

                week.push({
                    date: dateStr,
                    dateObj: new Date(current),
                    count: dailyData[dateStr]?.length || 0,
                    inYear: is2026
                });
                current.setDate(current.getDate() + 1);
            }
            weeks.push(week);
            iterations++;
        }
        return weeks;
    }, [dailyData]);

    // 3. Color Scale Helper
    const getColor = (count: number, inYear: boolean) => {
        if (!inYear) return 'bg-transparent border-none pointer-events-none opacity-0'; // Hide days outside 2026
        if (count === 0) return 'bg-[#2C2C2E]/50';
        const intensity = count / maxCount;
        if (intensity < 0.25) return 'bg-[#FA2D48]/30';
        if (intensity < 0.50) return 'bg-[#FA2D48]/60';
        if (intensity < 0.75) return 'bg-[#FA2D48]/80';
        return 'bg-[#FA2D48] shadow-[0_0_8px_rgba(250,45,72,0.4)]';
    };

    // Selected Day Data
    const selectedDayItems = selectedDate ? dailyData[selectedDate] || [] : [];

    // Helper to format date header
    const formatDateHeader = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    };

    return (
        <div className="mb-20 animate-in fade-in duration-700 select-none">
            <div className="flex items-end justify-between mb-4 px-1">
                <div>
                    <h2 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-2">
                        {new Date().getFullYear()} Rewind
                    </h2>
                    <p className="text-[#8E8E93] text-[13px] mt-1">
                        {totalPlays} tracks played in 2026
                    </p>
                </div>
            </div>

            {/* HEATMAP CONTAINER */}
            <div className="w-full overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex gap-1 min-w-fit p-1">
                    {calendarGrid.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-1">
                            {week.map((day, dIndex) => (
                                <div
                                    key={day.date}
                                    onClick={() => day.inYear && setSelectedDate(selectedDate === day.date ? null : day.date)}
                                    className={`w-3 h-3 md:w-3.5 md:h-3.5 rounded-[3px] transition-all duration-300 relative group ${
                                        selectedDate === day.date ? 'ring-2 ring-white z-20 scale-125 bg-[#FA2D48] shadow-[0_0_10px_#FA2D48]' : 'hover:scale-125 hover:z-10'
                                    } ${getColor(day.count, day.inYear)} ${day.inYear ? 'cursor-pointer' : ''}`}
                                >
                                    {/* Tooltip */}
                                    {day.inYear && (
                                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[max-content] bg-[#1C1C1E] text-white text-[10px] px-3 py-1.5 rounded-full shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap text-center font-medium">
                                            {day.count} plays on {day.dateObj.toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* EXPANDED DETAILS (Selected Date) - IMPROVED UI */}
            <div className={`overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${selectedDate ? 'max-h-[800px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
                {selectedDate && (
                    <div className="bg-[#1C1C1E] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
                        <div className="p-6 relative">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#FA2D48]/20 flex items-center justify-center text-[#FA2D48]">
                                        <Calendar className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-white leading-none">
                                            {formatDateHeader(selectedDate)}
                                        </h3>
                                        <p className="text-[#8E8E93] text-xs mt-1 font-medium">Daily Mix</p>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-white bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                                    {selectedDayItems.length} Tracks
                                </span>
                            </div>

                            {selectedDayItems.length === 0 ? (
                                <div className="text-center py-12 text-[#8E8E93]">
                                    <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                    <p>No listening history recorded.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {selectedDayItems.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-black/40 hover:bg-white/5 transition-colors group border border-transparent hover:border-white/5 cursor-default">
                                            <div className="relative w-12 h-12 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                                <img 
                                                    src={item.cover || item.album_cover} 
                                                    alt={item.track_name} 
                                                    className="w-full h-full object-cover rounded-md shadow-lg" 
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md">
                                                </div>
                                            </div>
                                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                                                <h4 className="text-white text-[15px] font-semibold truncate group-hover:text-[#FA2D48] transition-colors leading-tight">
                                                    {item.track_name}
                                                </h4>
                                                <p className="text-[#8E8E93] text-[13px] truncate">{item.artist_name}</p>
                                            </div>
                                            <div className="text-right pl-2">
                                                 <span className="font-mono text-[11px] text-[#8E8E93] bg-white/5 px-2 py-1 rounded">
                                                    {new Date(item.played_at).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}).replace(' ', '')}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            
            {/* Empty State / Call to Action if no date selected */}
            {!selectedDate && (
                <div className="mt-4 p-4 rounded-xl border border-dashed border-white/10 text-center">
                    <p className="text-[#8E8E93] text-xs">Select a square above to reveal your detailed listening history for that day.</p>
                </div>
            )}
        </div>
    );
};