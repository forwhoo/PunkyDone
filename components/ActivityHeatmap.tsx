import React, { useMemo, useState } from 'react';
import { ChevronDown, X, Music } from 'lucide-react';

interface ActivityHeatmapProps {
    history: any[];
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ history }) => {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedTracks, setSelectedTracks] = useState<any[]>([]);

    // 1. Process Data: Group by Date (YYYY-MM-DD)
    const { dailyData, dailyTracks, maxCount } = useMemo(() => {
        const grouped: Record<string, number> = {};
        const tracks: Record<string, any[]> = {};
        let max = 0;

        if (!history) return { dailyData: {}, dailyTracks: {}, maxCount: 1 };

        history.forEach(item => {
            if (!item.played_at) return;
            const date = new Date(item.played_at);
            const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
            
            if (!grouped[dateStr]) grouped[dateStr] = 0;
            grouped[dateStr]++;
            
            if (!tracks[dateStr]) tracks[dateStr] = [];
            tracks[dateStr].push(item);
        });

        // Sort tracks by time desc
        Object.keys(tracks).forEach(date => {
            tracks[date].sort((a,b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime());
        });

        Object.values(grouped).forEach(count => {
            if (count > max) max = count;
        });

        return { dailyData: grouped, dailyTracks: tracks, maxCount: Math.max(max, 5) }; // Min max of 5 for scaling
    }, [history]);

    // 2. Generate Calendar Grid (Horizontal: Weeks, Vertical: Days)
    const weeks = useMemo(() => {
        // Target Year 2026 as requested
        const year = 2026;
        const startDate = new Date(year, 0, 1); // Jan 1
        // const endDate = new Date(year, 11, 31); // Dec 31
        
        // Align to Sunday start
        const startDayOfWeek = startDate.getDay(); // 0 = Sunday
        const gridStart = new Date(startDate);
        gridStart.setDate(startDate.getDate() - startDayOfWeek);

        const weeksArr = [];
        let current = new Date(gridStart);
        
        // Loop for 53 weeks to fill the grid
        for(let w=0; w<53; w++) {
            const currentWeek = [];
            for(let d=0; d<7; d++) {
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
    }, [dailyData]);

    const getColor = (count: number, inYear: boolean) => {
        if (!inYear) return 'bg-[#1C1C1E] opacity-20'; // Placeholder for padding days
        if (count === 0) return 'bg-[#2C2C2E]/60';
        
        // GitHub style scale
        const intensity = count / maxCount;
        if (intensity < 0.25) return 'bg-[#0E4429]'; // Low
        if (intensity < 0.5) return 'bg-[#006D32]'; // Med-Low
        if (intensity < 0.75) return 'bg-[#26A641]'; // Med-High
        return 'bg-[#39D353]'; // High
    };
    
    // User requested "Like actual github" but "dark mode" implies maybe white/grey scale or the classic green? 
    // The previous app used Red (#FA2D48). A monochromatic Red scale or White scale fits better with the theme.
    // Let's use White/Grey scale as seen in generic dark mode heatmaps, or Red since it's the accent.
    // Screenshot: Dark squares, White active squares. "Activity" header.
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
        <>
            <div className="w-full max-w-4xl mx-auto mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex justify-between items-end mb-4 px-1">
                    <h3 className="text-[16px] font-semibold text-white">Activity</h3>
                    <button className="flex items-center gap-1 text-[12px] font-medium text-[#8E8E93] bg-[#1C1C1E] px-3 py-1.5 rounded-lg border border-white/5 hover:bg-[#2C2C2E] transition-colors">
                        2026 <ChevronDown size={14} />
                    </button>
                </div>
                
                <div className="w-full overflow-x-auto no-scrollbar">
                    <div className="flex gap-[3px] min-w-max">
                        {weeks.map((week, idx) => (
                            <div key={idx} className="flex flex-col gap-[3px]">
                                {week.map((day, dIdx) => (
                                    <div 
                                        key={`${idx}-${dIdx}`}
                                        className={`w-[10px] h-[10px] rounded-[2px] transition-all hover:scale-125 hover:z-10 cursor-pointer ${getThemeColor(day.count, day.inYear)}`}
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

            {/* CLICK MODAL - Reusing standard modal style */}
            {selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                        onClick={() => setSelectedDate(null)}
                    />
                    <div className="relative bg-[#1C1C1E] w-full max-w-lg max-h-[70vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
                         {/* Header */}
                         <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#1C1C1E]">
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Activity • {selectedDate}</h2>
                                <span className="text-[#8E8E93] text-sm">{selectedTracks.length} tracks played</span>
                            </div>
                            <button 
                                onClick={() => setSelectedDate(null)}
                                className="w-8 h-8 rounded-full bg-[#2C2C2E] flex items-center justify-center text-white hover:bg-[#3A3A3C] transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-[#FA2D48] scrollbar-track-transparent">
                             {selectedTracks.map((track, i) => (
                                 <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                     <div className="w-10 h-10 rounded-md overflow-hidden bg-[#2C2C2E]">
                                         <img src={track.cover || track.album_cover} className="w-full h-full object-cover" />
                                     </div>
                                     <div className="flex-1 min-w-0">
                                         <h4 className="text-sm font-semibold text-white truncate">{track.track_name || track.name}</h4>
                                         <p className="text-xs text-[#8E8E93] truncate">{track.artist_name || track.artist}</p>
                                     </div>
                                     <span className="text-xs text-[#8E8E93] font-mono">
                                         {new Date(track.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                     </span>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
