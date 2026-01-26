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
             <div className="relative h-[200px] w-full mt-8 group select-none">
                 
                 {/* No background container - pure data visualization */}
                 
                 {/* Visualizer Background Glow */}
                 <div className="absolute inset-0 bg-gradient-to-t from-[#FA2D48]/5 to-transparent opacity-50 blur-3xl pointer-events-none"></div>

                 {/* Bars */}
                 <div className="absolute inset-x-0 bottom-0 h-full flex items-end justify-between px-6 z-20 pointer-events-none">
                     {densityData.map((bucket, i) => {
                         const maxCount = Math.max(...densityData.map(d => d.count), 1);
                         const heightPct = (bucket.count / maxCount) * 100;
                         const isEmpty = bucket.count === 0;

                         // Interactive transparent columns for hover detection
                         return (
                            <div 
                                key={i} 
                                className="h-full flex items-end pointer-events-auto group/bar relative flex-1"
                                onMouseEnter={() => setHoveredItem(bucket.items.length > 0 ? bucket.items[bucket.items.length - 1] : null)}
                                onMouseLeave={() => setHoveredItem(null)}
                            >
                                {/* Active Peak Indicator */}
                                {!isEmpty && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent opacity-0 group-hover/bar:opacity-100 transition-opacity"></div>
                                )}

                                {/* Visible Bar */}
                                <div 
                                    className={`w-[70%] mx-auto rounded-full transition-all duration-500 ease-out ${
                                        hoveredItem && bucket.items.includes(hoveredItem) 
                                        ? 'bg-[#FA2D48] shadow-[0_0_20px_#FA2D48]' 
                                        : isEmpty ? 'bg-white/5 h-[3px]' : 'bg-white/30 group-hover/bar:bg-[#FA2D48]/60 group-hover/bar:h-[110%]'
                                    }`}
                                    style={{ 
                                        height: isEmpty ? '3px' : `${Math.max(heightPct, 8)}%`,
                                        transitionDelay: `${i * 10}ms`
                                    }}
                                />
                            </div>
                         );
                     })}
                 </div>

                 {/* Baseline */}
                 <div className="absolute bottom-0 left-6 right-6 h-[1px] bg-white/10 z-0"></div>

                 {/* Hover Popup - Fixed at Top with Animation */}
                 {hoveredItem && (
                     <div 
                        className="absolute left-1/2 -top-16 transform -translate-x-1/2 pointer-events-none z-50 w-72"
                     >
                         <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                             <div className="relative">
                                <img src={hoveredItem.cover} className="w-14 h-14 rounded-xl object-cover shadow-lg" />
                                <div className="absolute -top-2 -right-2 bg-[#FA2D48] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">LIVE</div>
                             </div>
                             <div className="text-left min-w-0 flex-1">
                                 <h4 className="text-white font-bold text-sm truncate leading-tight">{hoveredItem.track_name}</h4>
                                 <p className="text-[#8E8E93] text-xs truncate mt-0.5">{hoveredItem.artist_name}</p>
                                 <div className="flex items-center gap-2 mt-2">
                                     <div className="flex gap-0.5">
                                         {[1,2,3].map(v => <div key={v} className="w-1 h-3 bg-[#FA2D48] rounded-full animate-pulse" style={{animationDelay: `${v*0.2}s`}}></div>)}
                                     </div>
                                     <span className="text-[#FA2D48] text-[10px] font-mono">
                                        Playing {new Date(hoveredItem.played_at).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}
                                     </span>
                                 </div>
                             </div>
                         </div>
                     </div>
                 )}
                 
                 {filteredItems.length === 0 && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40">
                         <div className="flex gap-1 mb-2">
                            {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-8 bg-white/10 rounded-full"></div>)}
                         </div>
                         <p className="text-[#8E8E93] text-[11px] font-medium tracking-widest uppercase">No Listening Data in this Window</p>
                     </div>
                 )}
             </div>
        </div>
    );
};
