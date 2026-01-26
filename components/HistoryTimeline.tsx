import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, Music } from 'lucide-react';

interface HistoryItem {
    id: string; // or number? usually id
    played_at: string; // ISO string
    track_name: string;
    artist_name: string;
    cover: string;
}

interface HistoryTimelineProps {
    history: any[]; // Raw history list
}

export const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ history }) => {
    const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('day');
    const [currentDate, setCurrentDate] = useState(new Date()); // The date we are currently viewing
    const [hoveredItem, setHoveredItem] = useState<any | null>(null);

    // Process history data into a timeline-friendly format
    // Optimizing with useMemo
    const timelineData = useMemo(() => {
        if (!history || history.length === 0) return [];
        
        // Convert to objects with date objects for easier comparison
        const processed = history.map(h => ({
            ...h,
            dateObj: new Date(h.played_at),
            ts: new Date(h.played_at).getTime()
        })).sort((a, b) => a.ts - b.ts);

        return processed;
    }, [history]);

    // FILTER DATA BASED ON VIEW
    const filteredItems = useMemo(() => {
        if (timelineData.length === 0) return [];

        const start = new Date(currentDate);
        const end = new Date(currentDate);

        if (view === 'day') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (view === 'week') {
            // Start of week (Monday)
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1); 
            start.setDate(diff);
            start.setHours(0,0,0,0);
            
            end.setDate(start.getDate() + 6);
            end.setHours(23,59,59,999);
        } else if (view === 'month') {
            start.setDate(1);
            start.setHours(0,0,0,0);
            end.setMonth(start.getMonth() + 1);
            end.setDate(0);
            end.setHours(23,59,59,999);
        } else if (view === 'year') {
            start.setMonth(0, 1);
            start.setHours(0,0,0,0);
            end.setMonth(11, 31);
            end.setHours(23,59,59,999);
        }

        return timelineData.filter(item => 
            item.ts >= start.getTime() && item.ts <= end.getTime()
        );
    }, [timelineData, view, currentDate]);

    const [selectedTimeRange, setSelectedTimeRange] = useState<{start: number, end: number} | null>(null);

    // Filter by Time of Day logic
    // Create density buckets for visualizer instead of raw dots
    const densityData = useMemo(() => {
        if (filteredItems.length === 0) return [];
        const { start, end } = getRange();
        const totalDuration = end - start;
        const bucketCount = 60; // 60 bars across the width
        const bucketSize = totalDuration / bucketCount;
        
        const buckets = new Array(bucketCount).fill(0).map(() => ({ count: 0, items: [] as any[], ts: 0 }));
        
        filteredItems.forEach(item => {
            const offset = item.ts - start;
            const bucketIndex = Math.floor(offset / bucketSize);
            if (bucketIndex >= 0 && bucketIndex < bucketCount) {
                buckets[bucketIndex].count++;
                buckets[bucketIndex].items.push(item);
                buckets[bucketIndex].ts = start + (bucketIndex * bucketSize); // Approximate time
            }
        });
        
        return buckets;
    }, [filteredItems, view, currentDate]);

    return (
        <div className="mb-16 animate-in fade-in duration-700">
             {/* Header & Filters - Updated for seamless look */}
             <div className="flex justify-between items-end mb-8 px-1 mx-1">
                <div>
                    <h2 className="text-[22px] font-bold text-white tracking-tight flex items-center gap-2">
                        {view !== 'day' && (
                             <button onClick={() => setView(view === 'month' ? 'year' : 'week')} className="hover:text-[#FA2D48] transition-colors">
                                <ArrowLeft className="w-5 h-5"/>
                             </button>
                        )}
                        Time Travel
                    </h2>
                    <p className="text-[#8E8E93] text-[13px] mt-1 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                         {view === 'day' && currentDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                         {view === 'week' && `Week of ${rangeStartDate.toLocaleDateString()}`}
                         {view === 'month' && rangeStartDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                         {view === 'year' && rangeStartDate.getFullYear()}
                    </p>
                </div>
                
                {/* Minimal Text Filters */}
                <div className="flex items-center gap-4 text-sm font-medium">
                    {(['day', 'week', 'month', 'year'] as const).map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`pb-1 border-b-2 transition-all capitalize ${
                                view === v ? 'text-white border-[#FA2D48]' : 'text-[#8E8E93] border-transparent hover:text-white'
                            }`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
             </div>

             {/* Seamless Waveform Timeline (Bar Chart Style) */}
             <div className="relative h-[180px] w-full mt-4 group select-none">
                 
                 {/* No background container - pure data visualization */}
                 
                 {/* Bars */}
                 <div className="absolute inset-0 flex items-end justify-between px-4 z-20 pointer-events-none">
                     {density.map((bucket, i) => {
                         const maxCount = Math.max(...density.map(d => d.count), 1);
                         const heightPct = (bucket.count / maxCount) * 100;
                         const isEmpty = bucket.count === 0;

                         // Interactive transparent columns for hover detection
                         return (
                            <div 
                                key={i} 
                                className="h-full flex items-end pointer-events-auto group/bar relative"
                                style={{ width: `${100 / 60}%` }}
                                onMouseEnter={() => setHoveredItem(bucket.items.length > 0 ? bucket.items[bucket.items.length - 1] : null)} // Show last played in bucket
                                onMouseLeave={() => setHoveredItem(null)}
                            >
                                {/* Visible Bar */}
                                <div 
                                    className={`w-[60%] mx-auto rounded-t-sm transition-all duration-300 ${
                                        hoveredItem && bucket.items.includes(hoveredItem) 
                                        ? 'bg-[#FA2D48] shadow-[0_0_15px_#FA2D48]' 
                                        : isEmpty ? 'bg-white/5 h-[2px]' : 'bg-white/30 group-hover/bar:bg-white'
                                    }`}
                                    style={{ height: isEmpty ? '2px' : `${Math.max(heightPct, 5)}%` }}
                                />
                            </div>
                         );
                     })}
                 </div>

                 {/* Hover Line */}
                 <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-white/10 z-0"></div>

                 {/* Hover Popup Fixed at Top Center or Following Mouse */}
                 {hoveredItem && (
                     <div 
                        className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-4 pointer-events-none z-50 w-64"
                     >
                         <div className="bg-[#1C1C1E] border border-white/10 p-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200">
                             <img src={hoveredItem.cover} className="w-12 h-12 rounded-lg object-cover shadow-sm" />
                             <div className="text-left min-w-0 flex-1">
                                 <h4 className="text-white font-bold text-sm truncate">{hoveredItem.track_name}</h4>
                                 <p className="text-[#8E8E93] text-xs truncate">{hoveredItem.artist_name}</p>
                                 <p className="text-[#FA2D48] text-[10px] font-mono mt-0.5">
                                    {new Date(hoveredItem.played_at).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}
                                 </p>
                             </div>
                         </div>
                         {/* Down Arrow */}
                         <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-[#1C1C1E] mx-auto opacity-100"></div>
                     </div>
                 )}
                 
                 {filteredItems.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center text-[#555] text-xs font-medium">
                         Silence...
                     </div>
                 )}
             </div>
        </div>
    );
};
