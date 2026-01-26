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
        const endDate = today;
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 364); // Approx 1 year

        // Align start date to previous Sunday to make grid nice
        const dayOfWeek = startDate.getDay(); // 0 = Sunday
        startDate.setDate(startDate.getDate() - dayOfWeek);

        const weeks = [];
        let current = new Date(startDate);
        
        // Safety break to prevent infinite loops if date math fails
        let iterations = 0;
        while (current <= endDate && iterations < 60) {
            const week = [];
            for (let i = 0; i < 7; i++) {
                const dateStr = current.toLocaleDateString('en-CA');
                week.push({
                    date: dateStr,
                    dateObj: new Date(current),
                    count: dailyData[dateStr]?.length || 0
                });
                current.setDate(current.getDate() + 1);
            }
            weeks.push(week);
            iterations++;
        }
        return weeks;
    }, [dailyData]);

    // 3. Color Scale Helper
    const getColor = (count: number) => {
        if (count === 0) return 'bg-[#2C2C2E]';
        const intensity = count / maxCount;
        if (intensity < 0.25) return 'bg-[#FA2D48]/30';
        if (intensity < 0.50) return 'bg-[#FA2D48]/60';
        if (intensity < 0.75) return 'bg-[#FA2D48]/80';
        return 'bg-[#FA2D48]';
    };

    // Selected Day Data
    const selectedDayItems = selectedDate ? dailyData[selectedDate] || [] : [];

    // Helper to format date header
    const formatDateHeader = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    return (
        <div className="mb-20 animate-in fade-in duration-700">
            <div className="flex items-end justify-between mb-6 px-1">
                <div>
                    <h2 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-2">
                        Listening Activity
                    </h2>
                    <p className="text-[#8E8E93] text-[13px] mt-1">
                        {totalPlays} songs in the last year
                    </p>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-2 text-[10px] text-[#8E8E93]">
                    <span>Less</span>
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-[#2C2C2E]"></div>
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-[#FA2D48]/30"></div>
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-[#FA2D48]/60"></div>
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-[#FA2D48]"></div>
                    <span>More</span>
                </div>
            </div>

            {/* HEATMAP CONTAINER */}
            <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
                <div className="flex gap-1 min-w-fit">
                    {calendarGrid.map((week, wIndex) => (
                        <div key={wIndex} className="flex flex-col gap-1">
                            {week.map((day, dIndex) => (
                                <div
                                    key={day.date}
                                    onClick={() => setSelectedDate(selectedDate === day.date ? null : day.date)}
                                    className={`w-3 h-3 md:w-3.5 md:h-3.5 rounded-[3px] cursor-pointer transition-all duration-200 hover:scale-125 hover:z-10 relative group ${
                                        selectedDate === day.date ? 'ring-2 ring-white z-20 scale-110 border border-black' : 'border border-transparent'
                                    } ${getColor(day.count)}`}
                                >
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 min-w-[120px] bg-[#1C1C1E] text-white text-[10px] px-2 py-1.5 rounded shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap text-center">
                                        <div className="font-bold">{day.count} plays</div>
                                        <div className="text-[#8E8E93]">{day.date}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* EXPANDED DETAILS (Selected Date) */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${selectedDate ? 'max-h-[800px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
                {selectedDate && (
                    <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-[#FA2D48]" />
                                {formatDateHeader(selectedDate)}
                            </h3>
                            <span className="text-xs font-mono text-[#8E8E93] bg-white/5 px-2 py-1 rounded-md">
                                {selectedDayItems.length} Tracks
                            </span>
                        </div>

                        {selectedDayItems.length === 0 ? (
                            <div className="text-center py-12 text-[#8E8E93]">
                                <Clock className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                <p>No listening history recorded for this day.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {selectedDayItems.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-black/20 hover:bg-[#2C2C2E] transition-colors group border border-transparent hover:border-white/5">
                                        <div className="relative w-10 h-10 flex-shrink-0">
                                            <img 
                                                src={item.cover || item.album_cover} 
                                                alt={item.track_name} 
                                                className="w-full h-full object-cover rounded-md shadow-sm opacity-80 group-hover:opacity-100 transition-opacity" 
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                <div className="bg-black/50 rounded-full p-1">
                                                    <Play size={10} fill="white" className="text-white" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="text-white text-sm font-medium truncate group-hover:text-[#FA2D48] transition-colors">
                                                {item.track_name}
                                            </h4>
                                            <div className="flex items-center gap-2 text-[11px] text-[#8E8E93]">
                                                <span className="truncate max-w-[100px]">{item.artist_name}</span>
                                                <span className="text-white/10">•</span>
                                                <span className="font-mono text-[10px]">
                                                    {new Date(item.played_at).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
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