import React from 'react';
import { Card } from './UIComponents';

interface HeatMapProps {
    data: { day: string, hour: number, intensity: number }[]; // 0-10 intensity
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export const HeatMapWidget: React.FC<HeatMapProps> = ({ data }) => {
    // Generate dummy grid if no data
    const getIntensity = (day: number, hour: number) => {
        // Mock data logic if simple
        return Math.floor(Math.random() * 5); 
    };

    const getColor = (intensity: number) => {
        if (intensity === 0) return 'bg-[#2C2C2E]';
        if (intensity === 1) return 'bg-[#FA2D48]/20';
        if (intensity === 2) return 'bg-[#FA2D48]/40';
        if (intensity === 3) return 'bg-[#FA2D48]/60';
        if (intensity === 4) return 'bg-[#FA2D48]/80'; // Hot
        return 'bg-[#FA2D48]'; // Super Hot
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                 <h4 className="text-white text-sm font-semibold">Listening Heatmap</h4>
                 <div className="flex items-center gap-2 text-[10px] text-[#8E8E93]">
                     <span>Less</span>
                     <div className="flex gap-1">
                         <div className="w-2 h-2 rounded-sm bg-[#2C2C2E]"></div>
                         <div className="w-2 h-2 rounded-sm bg-[#FA2D48]/40"></div>
                         <div className="w-2 h-2 rounded-sm bg-[#FA2D48]"></div>
                     </div>
                     <span>More</span>
                 </div>
            </div>
            
            <div className="flex gap-2">
                {/* Y Axis Labels (Days) */}
                <div className="flex flex-col justify-between py-1">
                    {DAYS.map(day => (
                        <span key={day} className="text-[9px] text-[#8E8E93] h-3 leading-3">{day}</span>
                    ))}
                </div>

                {/* Grid */}
                <div className="flex-1 grid grid-cols-24 gap-[2px]">
                   {HOURS.map(hour => (
                       <div key={hour} className="flex flex-col gap-[2px]">
                           {DAYS.map((_, dayIdx) => (
                               <div 
                                    key={`${dayIdx}-${hour}`}
                                    className={`h-3 w-full min-w-[8px] rounded-sm transform transition-all hover:scale-125 cursor-pointer hover:z-10 hover:border hover:border-white/50 ${getColor(getIntensity(dayIdx, hour))}`}
                                    title={`${DAYS[dayIdx]} ${hour}:00`}
                               />
                           ))}
                       </div>
                   ))}
                </div>
            </div>
            {/* X Axis simplified */}
            <div className="flex justify-between pl-8 mt-2 text-[9px] text-[#8E8E93]">
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>11 PM</span>
            </div>
        </div>
    );
}
