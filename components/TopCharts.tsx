
import React, { useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { MOCK_HOURLY_ACTIVITY, MOCK_ARTISTS, MOCK_SONGS, MOCK_ALBUMS } from '../services/mockData';
import { Card, CardHeader, CardTitle, Badge } from './UIComponents';
import { Play, TrendingUp, TrendingDown, Minus, Clock, Calendar } from 'lucide-react';

interface TopChartsProps {
  title: string;
}

export const TopCharts: React.FC<TopChartsProps> = ({ title }) => {
  const [viewMode, setViewMode] = useState<'Chart' | 'List'>('List');
  const [activeTab, setActiveTab] = useState<'Songs' | 'Albums' | 'Artists'>('Artists');
  const [hoverData, setHoverData] = useState<any>(null);

  // Helper to get today's date
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // Get data based on active tab
  const getListData = () => {
    switch (activeTab) {
      case 'Artists': return MOCK_ARTISTS;
      case 'Albums': return MOCK_ALBUMS;
      case 'Songs': return MOCK_SONGS;
      default: return [];
    }
  };

  const listData = getListData();

  const renderTrendIcon = (trend: number) => {
    if (trend > 0) return <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 flex gap-1 items-center px-2"><TrendingUp size={12}/> {Math.abs(trend)}</Badge>;
    if (trend < 0) return <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30 flex gap-1 items-center px-2"><TrendingDown size={12} /> {Math.abs(trend)}</Badge>;
    return <Badge variant="secondary"><Minus size={12} /></Badge>;
  };

  return (
    <Card className="flex flex-col bg-[#1C1C1E] border-none shadow-none overflow-visible relative min-h-[450px]">
      <CardHeader className="pb-4 pl-5 pr-5 pt-6 flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 gap-4">
        <div>
           <CardTitle className="text-white text-[22px] font-bold tracking-tight mb-1">{title}</CardTitle>
           <div className="text-[#8E8E93] text-sm flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              <span>{viewMode === 'List' ? `Weekly Top ${activeTab}` : `Total Activity • ${todayDate}`}</span>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
           {/* View Toggle */}
           <div className="flex bg-[#2C2C2E] p-1 rounded-lg">
             <button
               onClick={() => setViewMode('List')}
               className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-[6px] transition-all ${viewMode === 'List' ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93] hover:text-white'}`}
             >
               List
             </button>
             <button
               onClick={() => setViewMode('Chart')}
               className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-[6px] transition-all ${viewMode === 'Chart' ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93] hover:text-white'}`}
             >
               Trends
             </button>
           </div>

            {/* Category Toggle */}
            <div className="flex bg-[#2C2C2E] p-1 rounded-lg">
              {['Songs', 'Albums', 'Artists'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-[6px] transition-all ${
                    activeTab === tab 
                    ? 'bg-[#FA2D48] text-white shadow-md' 
                    : 'text-[#8E8E93] hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
        </div>
      </CardHeader>

      <div className="flex-1 p-0">
         {viewMode === 'Chart' ? (
           <div className="flex flex-col lg:flex-row h-[350px]">
              {/* Main Chart Area */}
              <div className="flex-1 pt-8 px-4 relative">
                {/* Background Grid */}
                <div className="absolute inset-0 top-8 px-4 flex justify-between pointer-events-none opacity-10">
                    {[...Array(6)].map((_, i) => <div key={i} className="w-px h-full bg-white"></div>)}
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
                    <Tooltip content={() => null} />
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

               {/* Side Detail Widget */}
               <div className="w-full lg:w-[280px] p-6 border-l border-white/5 bg-[#1C1C1E]/50 backdrop-blur-sm flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-2 h-2 rounded-full bg-[#FA2D48] animate-pulse"></div>
                     <span className="text-xs font-bold uppercase tracking-widest text-[#FA2D48]">Live Activity</span>
                  </div>
                  
                  {hoverData ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="text-sm text-[#8E8E93] mb-1">{hoverData.time}</div>
                        <div className="text-4xl font-black text-white mb-6">{hoverData.value} <span className="text-lg font-medium text-[#8E8E93]">listens</span></div>
                        
                        {hoverData.song && (
                            <div className="bg-[#2C2C2E] rounded-xl p-3 flex items-center gap-3 border border-white/5">
                                <img src={hoverData.song.cover} className="w-10 h-10 rounded-md object-cover" />
                                <div className="min-w-0">
                                    <div className="text-xs font-medium text-[#8E8E93] mb-0.5">Top Song</div>
                                    <div className="text-sm font-bold text-white truncate">{hoverData.song.title}</div>
                                </div>
                            </div>
                        )}
                    </div>
                  ) : (
                    <div className="text-[#636366]">Hover over the chart to see hourly details.</div>
                  )}
               </div>
           </div>
         ) : (
           /* LIST VIEW */
           <div className="w-full">
               <div className="grid grid-cols-[50px_80px_1fr_80px_80px_80px] px-6 py-3 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">
                   <div>#</div>
                   <div>Change</div>
                   <div>{activeTab.slice(0, -1).toUpperCase()}</div>
                   <div className="text-center">Peak</div>
                   <div className="text-center">Prev</div>
                   <div className="text-center">Streak</div>
               </div>
               
               <div className="flex flex-col">
                   {listData.map((item: any, idx) => (
                       <div key={item.id} className="grid grid-cols-[50px_80px_1fr_80px_80px_80px] items-center px-6 py-4 hover:bg-white/5 transition-colors group">
                           <div className="font-bold text-white text-md">{item.rank || idx + 1}</div>
                           <div className="flex items-center gap-1">
                               {renderTrendIcon(item.trend || 0)}
                           </div>
                           <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#2C2C2E] relative group-hover:shadow-lg transition-all">
                                   <img src={item.image || item.cover} className="w-full h-full object-cover" />
                                   {activeTab === 'Songs' && (
                                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                         <Play className="w-5 h-5 text-white fill-white" />
                                     </div>
                                   )}
                               </div>
                               <div>
                                   <div className="font-bold text-white text-[15px]">{item.name || item.title}</div>
                                   {(item.artist && activeTab !== 'Artists') && <div className="text-[13px] text-[#8E8E93]">{item.artist}</div>}
                               </div>
                           </div>
                           <div className="text-center text-white/60 font-medium">{item.peak || '-'}</div>
                           <div className="text-center text-white/60 font-medium">{item.prev || '-'}</div>
                           <div className="text-center text-white/60 font-medium">{item.streak || '-'}</div>
                       </div>
                   ))}
               </div>
               <div className="p-4 flex justify-center border-t border-white/5">
                   <button className="text-xs font-bold uppercase tracking-widest text-[#FA2D48] hover:text-white transition-colors">See all top 50</button>
               </div>
           </div>
         )}
      </div>
    </Card>
  );
};
