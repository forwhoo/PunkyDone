import React, { useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_HOURLY_ACTIVITY } from '../services/mockData';
import { Card, CardContent, CardHeader, CardTitle } from './UIComponents';
import { Song } from '../types';
import { Play } from 'lucide-react';

interface AnalyticsChartProps {
  title: string;
  data?: any[]; // Keep for compatibility but we use local mock for the timeline
}

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ title }) => {
  const [activeTab, setActiveTab] = useState<'Songs' | 'Albums' | 'Artists'>('Songs');
  const [hoverData, setHoverData] = useState<any>(null);

  // Default to a middle data point if no hover
  const activeSong = hoverData?.song || MOCK_HOURLY_ACTIVITY[16].song; 
  const activeTime = hoverData?.time || "4 PM";

  return (
    <Card className="flex flex-col bg-[#1C1C1E] border-none shadow-none overflow-visible relative min-h-[420px]">
      <CardHeader className="pb-4 pl-5 pr-5 pt-6 flex flex-row items-center justify-between border-b border-white/5">
        <CardTitle className="text-white text-[22px] font-bold tracking-tight">{title}</CardTitle>
        
        {/* Filters */}
        <div className="flex bg-[#2C2C2E] p-1 rounded-lg">
           {['Songs', 'Albums', 'Artists'].map((tab) => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-[6px] transition-all ${
                 activeTab === tab 
                 ? 'bg-[#3A3A3C] text-white shadow-sm' 
                 : 'text-[#8E8E93] hover:text-white'
               }`}
             >
               {tab}
             </button>
           ))}
        </div>
      </CardHeader>
      
      <div className="flex flex-col lg:flex-row h-full">
          {/* Main Chart Area */}
          <div className="flex-1 h-[320px] pt-8 px-4 relative">
             {/* Background Grid Lines for Aesthetics */}
             <div className="absolute inset-0 top-8 px-4 flex justify-between pointer-events-none opacity-10">
                 <div className="w-px h-full bg-white"></div>
                 <div className="w-px h-full bg-white"></div>
                 <div className="w-px h-full bg-white"></div>
                 <div className="w-px h-full bg-white"></div>
                 <div className="w-px h-full bg-white"></div>
             </div>

             <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={MOCK_HOURLY_ACTIVITY} 
                margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                onMouseMove={(e: any) => {
                    if (e.activePayload && e.activePayload[0]) {
                        setHoverData(e.activePayload[0].payload);
                    }
                }}
                onMouseLeave={() => setHoverData(null)}
              >
                <defs>
                  <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FA2D48" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#FA2D48" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Tooltip 
                    content={() => null} // Custom preview widget handles this
                    cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#FA2D48" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorActivity)"
                    animationDuration={1500}
                />
                 <XAxis 
                    dataKey="time" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6e6e73', fontSize: 10, fontWeight: 600, fontFamily: 'Inter' }} 
                    interval={3}
                    dy={10}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Side Widget / Preview Thingy */}
          <div className="w-full lg:w-[280px] p-6 border-l border-white/5 bg-[#1C1C1E]/50 backdrop-blur-sm flex flex-col justify-center">
             <div className="mb-2">
                <span className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider">At {activeTime}</span>
             </div>
             
             {activeSong ? (
                 <div className="animate-fade-in-up">
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-4 shadow-2xl group">
                         <img src={activeSong.cover} alt={activeSong.title} className="w-full h-full object-cover" />
                         <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                             <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center pl-1">
                                <Play className="w-5 h-5 text-white fill-white" />
                             </div>
                         </div>
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white leading-tight mb-1">{activeSong.title}</h4>
                        <p className="text-sm text-[#8E8E93]">{activeSong.artist}</p>
                        <div className="mt-3 flex items-center gap-2">
                             <span className="text-[10px] bg-white/10 text-white px-2 py-0.5 rounded text-shine font-medium">Played {hoverData?.value || 80} times</span>
                        </div>
                    </div>
                 </div>
             ) : (
                 <div className="h-full flex items-center justify-center text-[#8E8E93] text-sm">
                     No activity recorded.
                 </div>
             )}
          </div>
      </div>
    </Card>
  );
};