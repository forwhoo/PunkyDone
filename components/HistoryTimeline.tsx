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

    // Function to calculate position (0-100%)
    const getPosition = (ts: number, startTs: number, endTs: number) => {
        const total = endTs - startTs;
        const current = ts - startTs;
        return (current / total) * 100;
    };

    // Range Logic
    const getRange = () => {
        const start = new Date(currentDate);
        const end = new Date(currentDate);

        if (view === 'day') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else if (view === 'week') {
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
        return { start: start.getTime(), end: end.getTime(), startDate: start };
    };

    const { start: rangeStart, end: rangeEnd, startDate: rangeStartDate } = getRange();

    // Render Markers based on View
    const renderMarkers = () => {
        const markers = [];
        if (view === 'day') {
            // Every 3 hours
            for (let i = 0; i <= 24; i += 3) {
                markers.push({ label: i === 0 || i === 24 ? '12 AM' : i === 12 ? '12 PM' : i > 12 ? `${i-12} PM` : `${i} AM`, pct: (i / 24) * 100 });
            }
        } else if (view === 'week') {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            days.forEach((d, i) => {
                markers.push({ label: d, pct: (i / 7) * 100 + (100/14), clickableDateOffset: i });
            });
        } else if (view === 'month') {
            // 5 day intervals
            for (let i = 1; i <= 30; i += 5) {
                markers.push({ label: `${i}th`, pct: ((i - 1) / 30) * 100, clickableDateOffset: i-1 });
            }
        } else if (view === 'year') {
            const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
            months.forEach((m, i) => {
                markers.push({ label: m, pct: (i / 12) * 100 + (100/24), clickableMonthOffset: i });
            });
        }
        return markers;
    };

    // Navigation Handler
    const handleDrillDown = (marker: any) => {
        const newDate = new Date(rangeStartDate);
        
        if (view === 'week') {
            if (marker.clickableDateOffset !== undefined) {
                newDate.setDate(newDate.getDate() + marker.clickableDateOffset);
                setCurrentDate(newDate);
                setView('day');
            }
        } else if (view === 'month') {
             if (marker.clickableDateOffset !== undefined) {
                newDate.setDate(newDate.getDate() + marker.clickableDateOffset);
                setCurrentDate(newDate);
                setView('day');
            }
        } else if (view === 'year') {
             if (marker.clickableMonthOffset !== undefined) {
                newDate.setMonth(marker.clickableMonthOffset);
                newDate.setDate(1); // Default to 1st
                setCurrentDate(newDate);
                setView('month');
            }
        }
    };

    return (
        <div className="mb-16 animate-in fade-in duration-700">
             {/* Header & Filters */}
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
                
                <div className="flex bg-[#1C1C1E] rounded-lg p-1 border border-white/10">
                    {(['day', 'week', 'month', 'year'] as const).map(v => (
                        <button
                            key={v}
                            onClick={() => setView(v)}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold capitalize transition-all ${
                                view === v ? 'bg-[#FA2D48] text-white shadow-lg' : 'text-[#8E8E93] hover:text-white'
                            }`}
                        >
                            {v}
                        </button>
                    ))}
                </div>
             </div>

             {/* Timeline Container */}
             <div className="relative h-[200px] w-full bg-[#1C1C1E] border border-white/5 rounded-2xl overflow-hidden group shadow-2xl">
                 
                 {/* Hover Highlight Overlay */}
                 {hoveredItem && (
                     <div className="absolute inset-0 z-10 pointer-events-none bg-black/40 backdrop-blur-[2px] transition-all duration-500 animate-in fade-in" />
                 )}

                 {/* The Timeline Line */}
                 <div className="absolute top-1/2 left-8 right-8 h-[2px] bg-white/10 z-0"></div>

                 {/* Time Markers */}
                 {renderMarkers().map((m, i) => (
                     <div 
                        key={i} 
                        className="absolute top-1/2 text-[10px] text-[#555] font-mono transform -translate-y-1/2 -translate-x-1/2 transition-colors cursor-pointer hover:text-white z-20 group/marker"
                        style={{ left: `calc(2rem + ((100% - 4rem) * ${m.pct / 100}))` }}
                        onClick={() => handleDrillDown(m)}
                     >
                         <div className="h-3 w-[1px] bg-white/20 mx-auto mb-2 group-hover/marker:h-5 group-hover/marker:bg-[#FA2D48] transition-all" />
                         <span className="group-hover/marker:font-bold group-hover/marker:text-[#FA2D48]">{m.label}</span>
                     </div>
                 ))}

                 {/* Data Points (Dots) */}
                 {filteredItems.map((item, i) => {
                     const pct = getPosition(item.ts, rangeStart, rangeEnd);
                     // Skip if out of bounds (can happen due to loose boundary checks)
                     if (pct < 0 || pct > 100) return null;

                     return (
                         <div
                            key={item.id || i}
                            className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full cursor-pointer transition-all duration-300 z-30 hover:scale-[2] hover:bg-white hover:z-50"
                            style={{ 
                                left: `calc(2rem + ((100% - 4rem) * ${pct / 100}))`,
                                backgroundColor: hoveredItem === item ? '#FA2D48' : 'rgba(255,255,255,0.3)'
                            }}
                            onMouseEnter={() => setHoveredItem(item)}
                            onMouseLeave={() => setHoveredItem(null)}
                         />
                     );
                 })}

                 {/* Hover Popup (Apple Style) */}
                 {hoveredItem && (
                     <div 
                        className="absolute z-50 pointer-events-none transform -translate-x-1/2 transition-all duration-300 ease-out"
                        style={{ 
                            left: `calc(2rem + ((100% - 4rem) * ${getPosition(hoveredItem.ts, rangeStart, rangeEnd) / 100}))`,
                            top: '15%'
                        }}
                     >
                         <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-[#2C2C2E] animate-in zoom-in-95 duration-200">
                             <img src={hoveredItem.cover} className="w-full h-full object-cover" />
                             {/* Gradient Overlay for Text */}
                             <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-3 text-center">
                                 <h4 className="text-white font-bold text-xs line-clamp-2 leading-tight drop-shadow-md">{hoveredItem.track_name}</h4>
                                 <p className="text-white/60 text-[10px] mt-0.5 truncate">{hoveredItem.artist_name}</p>
                                 <p className="text-[#FA2D48] text-[9px] font-mono mt-1 font-bold">
                                    {hoveredItem.dateObj.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}
                                 </p>
                             </div>
                         </div>
                         {/* Connector generic */}
                         <div className="w-[1px] h-8 bg-gradient-to-b from-[#FA2D48] to-transparent mx-auto opacity-50"></div>
                     </div>
                 )}
                 
                 {filteredItems.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center text-[#555] text-xs font-medium">
                         No activity in this period.
                     </div>
                 )}
             </div>
        </div>
    );
};
