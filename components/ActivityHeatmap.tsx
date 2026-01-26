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

    // Lock body scroll logic
    React.useEffect(() => {
        if (selectedDate) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
             document.body.style.overflow = '';
        };
    }, [selectedDate]);

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

            {/* SIDE PANEL DETAILS (Replaces Modal) */}
            {selectedDate && (
                <>
                     {/* Backdrop */}
                     <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-500"
                        onClick={() => setSelectedDate(null)}
                     />

                    <div className="fixed top-0 right-0 h-screen w-full sm:w-[400px] bg-[#1C1C1E] border-l border-white/10 shadow-2xl z-50 flex flex-col transform transition-transform duration-500 ease-spring animate-in slide-in-from-right">
                         {/* Header */}
                         <div className="relative h-40 w-full bg-gradient-to-b from-[#2C2C2E] to-[#1C1C1E] p-6 flex flex-col justify-end">
                            <button 
                                onClick={() => setSelectedDate(null)}
                                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors backdrop-blur-md"
                            >
                                <X size={16} />
                            </button>
                            
                            <h2 className="text-3xl font-bold text-white tracking-tight">{new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</h2>
                            <p className="text-[#FA2D48] text-sm font-medium uppercase tracking-wider mt-1">
                                {selectedTracks.length} tracks • {new Date(selectedDate).toLocaleDateString(undefined, { year: 'numeric' })}
                            </p>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-[#FA2D48] scrollbar-track-transparent">
                             {/* Stats Summary */}
                             <div className="grid grid-cols-2 gap-px bg-white/5 mb-4">
                                 <div className="bg-[#1C1C1E] p-4 text-center">
                                     <span className="block text-xl font-bold text-white">{selectedTracks.length}</span>
                                     <span className="text-[10px] text-[#8E8E93] uppercase tracking-widest">Plays</span>
                                 </div>
                                 <div className="bg-[#1C1C1E] p-4 text-center">
                                     <span className="block text-xl font-bold text-white">
                                         {Math.round(selectedTracks.reduce((acc, t) => acc + (t.duration_ms || 0), 0) / 60000)}
                                     </span>
                                     <span className="text-[10px] text-[#8E8E93] uppercase tracking-widest">Minutes</span>
                                 </div>
                             </div>

                             <div className="px-4 pb-12 space-y-1">
                                 {selectedTracks.map((track, i) => (
                                     <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group">
                                         <span className="text-[10px] font-mono text-[#8E8E93]/50 w-6 text-right pt-[2px]">
                                             {new Date(track.played_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                         </span>
                                         
                                         <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#2C2C2E] flex-shrink-0 shadow-lg group-hover:shadow-xl transition-all">
                                             <img src={track.cover || track.album_cover} className="w-full h-full object-cover" />
                                             <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                         </div>
                                         
                                         <div className="flex-1 min-w-0">
                                             <h4 className="text-[13px] font-bold text-white truncate group-hover:text-[#FA2D48] transition-colors">{track.track_name || track.name}</h4>
                                             <p className="text-[12px] text-[#8E8E93] truncate">{track.artist_name || track.artist}</p>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};
