
import React, { useState } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, Badge } from './UIComponents';
import { Play, TrendingUp, TrendingDown, Minus, Clock, Calendar, GitBranch } from 'lucide-react';
import { Artist, Album, Song } from '../types';

interface TopChartsProps {
  title: string;
  artists?: Artist[];
  songs?: Song[];
  albums?: Album[];
  hourlyActivity?: any[];
}

// Graph Node Component for the new Graph View
const GraphNode = ({ item, size, x, y, onClick, isCenter }: any) => (
    <div 
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-all duration-300 hover:scale-110 hover:z-50 ${isCenter ? 'z-40' : 'z-10'}`}
        style={{ left: `${x}%`, top: `${y}%` }}
        onClick={onClick}
    >
        <div className={`rounded-full overflow-hidden border-2 ${isCenter ? 'border-[#FA2D48] shadow-lg shadow-[#FA2D48]/30' : 'border-white/20'} bg-[#2C2C2E]`}
             style={{ width: size, height: size }}>
            <img src={item.image || item.cover} alt={item.name || item.title} className="w-full h-full object-cover" />
        </div>
        <div className={`absolute left-1/2 -translate-x-1/2 mt-2 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`}>
            <div className="bg-black/90 rounded-lg px-2 py-1 whitespace-nowrap">
                <p className="text-white text-xs font-bold">{item.name || item.title}</p>
                <p className="text-[#8E8E93] text-[10px]">{item.totalListens || item.listens} plays</p>
            </div>
        </div>
        {/* Connection Lines */}
        {isCenter && (
            <div className="absolute inset-0 pointer-events-none">
                {[45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                    <div key={i} className="absolute left-1/2 top-1/2 w-20 h-px bg-gradient-to-r from-white/20 to-transparent origin-left"
                         style={{ transform: `rotate(${angle}deg)` }} />
                ))}
            </div>
        )}
    </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
         // Hidden because we use side widget
         <div className="custom-tooltip"></div>
      );
    }
    return null;
};

export const TopCharts: React.FC<TopChartsProps> = ({ title, artists = [], songs = [], albums = [], hourlyActivity = [] }) => {
  const [viewMode, setViewMode] = useState<'Chart' | 'List' | 'Graph'>('List');
  const [activeTab, setActiveTab] = useState<'Songs' | 'Albums' | 'Artists'>('Artists');
  const [hoverData, setHoverData] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Helper to get today's date
  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // Get data based on active tab
  const getListData = () => {
    switch (activeTab) {
      case 'Artists': return artists;
      case 'Albums': return albums;
      case 'Songs': return songs;
      default: return [];
    }
  };

  const listData = getListData();


  // Helper for safe image loading
  const getImageSrc = (item: any) => {
       const url = item.image || item.cover;
       return url;
  };
  
  // Fallback if image fails
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      e.currentTarget.src = "https://ui-avatars.com/api/?background=2C2C2E&color=fff&size=128&bold=true";
  };

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
             <button
               onClick={() => setViewMode('Graph')}
               className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-[6px] transition-all ${viewMode === 'Graph' ? 'bg-[#3A3A3C] text-white' : 'text-[#8E8E93] hover:text-white'}`}
             >
               Graph
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
                    data={hourlyActivity} 
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
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip content={() => null} />
                    <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#22c55e" 
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
                     <span className="text-xs font-bold uppercase tracking-widest text-[#FA2D48]">Peak Activity</span>
                  </div>
                  
                  {hoverData ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="text-sm text-[#8E8E93] mb-1">{hoverData.time}</div>
                        <div className="text-4xl font-black text-white mb-4">{hoverData.value} <span className="text-lg font-medium text-[#8E8E93]">min</span></div>
                        
                        <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E8E93]">Most Played At This Hour</span>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-md overflow-hidden bg-[#2C2C2E] flex-shrink-0">
                                    <img src={hoverData.cover} alt="" className="w-full h-full object-cover" />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-white truncate">{hoverData.song}</div>
                                    <div className="text-xs text-[#8E8E93] truncate">{hoverData.artist}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center space-y-4 py-8">
                       <Clock className="w-8 h-8 text-[#2C2C2E]" />
                      <div className="text-[#636366] text-sm font-medium">Hover over the chart to see what you played at each hour.</div>
                    </div>
                  )}
               </div>
           </div>
         ) : viewMode === 'Graph' ? (
           /* GRAPH VIEW - Node Visualization */
           <div className="h-[400px] relative bg-[#0D0D0D] overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0" style={{ 
                      backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
                      backgroundSize: '40px 40px'
                  }}></div>
              </div>
              
              {/* Center Node - #1 */}
              {listData[0] && (
                  <GraphNode 
                      item={listData[0]} 
                      size={100} 
                      x={50} 
                      y={50} 
                      isCenter={true}
                      onClick={() => setSelectedNode(listData[0])}
                  />
              )}
              
              {/* Orbiting Nodes */}
              {listData.slice(1, 7).map((item, index) => {
                  const angle = (index * 60) * (Math.PI / 180);
                  const radius = 35;
                  const x = 50 + radius * Math.cos(angle);
                  const y = 50 + radius * Math.sin(angle);
                  const size = 60 - (index * 5);
                  
                  return (
                      <GraphNode 
                          key={item.id}
                          item={item} 
                          size={size} 
                          x={x} 
                          y={y} 
                          isCenter={false}
                          onClick={() => setSelectedNode(item)}
                      />
                  );
              })}
              
              {/* Connection Lines from Center */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                  {listData.slice(1, 7).map((_, index) => {
                      const angle = (index * 60) * (Math.PI / 180);
                      const radius = 35;
                      const x2 = 50 + radius * Math.cos(angle);
                      const y2 = 50 + radius * Math.sin(angle);
                      
                      return (
                          <line 
                              key={index}
                              x1="50%" y1="50%" 
                              x2={`${x2}%`} y2={`${y2}%`}
                              stroke="rgba(255,255,255,0.1)"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                          />
                      );
                  })}
              </svg>
              
              {/* Selected Node Detail */}
              {selectedNode && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md rounded-xl p-4 border border-white/10 animate-in slide-in-from-bottom-4 z-50">
                      <div className="flex items-center gap-4">
                          <img src={selectedNode.image || selectedNode.cover} alt="" className="w-16 h-16 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold text-lg truncate">{selectedNode.name || selectedNode.title}</h4>
                              <p className="text-[#8E8E93] text-sm">{selectedNode.artist || 'Artist'}</p>
                          </div>
                          <div className="text-right">
                              <div className="text-2xl font-black text-[#FA2D48]">{selectedNode.totalListens || selectedNode.listens}</div>
                              <div className="text-[10px] text-[#8E8E93] uppercase tracking-widest">plays</div>
                          </div>
                      </div>
                  </div>
              )}
              
              {/* Legend */}
              <div className="absolute top-4 left-4 flex items-center gap-2 text-[10px] text-[#8E8E93] uppercase tracking-widest">
                  <GitBranch className="w-3 h-3" />
                  <span>Connection Graph • Click nodes for details</span>
              </div>
           </div>
         ) : (
           /* LIST VIEW */
           <div className="w-full">
               <div className="grid grid-cols-[50px_1fr_100px_80px] px-6 py-3 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">
                   <div>#</div>
                   <div>{activeTab.slice(0, -1).toUpperCase()}</div>
                   <div className="text-right">Time</div>
                   <div className="text-right">Plays</div>
               </div>
               
               <div className="flex flex-col">
                   {listData.map((item: any, idx) => (
                       <div key={item.id} className="grid grid-cols-[50px_1fr_100px_80px] items-center px-6 py-4 hover:bg-white/5 transition-colors group">
                           <div className="font-bold text-white text-md">{idx + 1}</div>
                           
                           <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#2C2C2E] relative group-hover:shadow-lg transition-all shrink-0">
                                   <img 
                                      src={getImageSrc(item)} 
                                      className="w-full h-full object-cover" 
                                      onError={handleImageError}
                                   />
                                   {activeTab === 'Songs' && (
                                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                         <Play className="w-4 h-4 text-white fill-white" />
                                     </div>
                                   )}
                               </div>
                               <div className="min-w-0">
                                   <div className="font-bold text-white text-[14px] truncate">{item.name || item.title}</div>
                                   {(item.artist && activeTab !== 'Artists') && <div className="text-[12px] text-[#8E8E93] truncate">{item.artist}</div>}
                               </div>
                           </div>
                           
                           <div className="text-right text-white/90 font-bold text-[13px]">{item.timeStr || '0m'}</div>
                           <div className="text-right">
                               <div className="inline-block bg-[#2C2C2E] text-[#8E8E93] text-[11px] font-bold px-2 py-0.5 rounded-md">
                                  {item.totalListens || item.listens}
                               </div>
                           </div>
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
