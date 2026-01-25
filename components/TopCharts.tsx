
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, Badge } from './UIComponents';
import { Play, TrendingUp, TrendingDown, Minus, Clock, Calendar, GitBranch, Share2 } from 'lucide-react';
import { Artist, Album, Song } from '../types';
import { fetchArtistNetwork } from '../services/dbService';

interface TopChartsProps {
  title: string;
  artists?: Artist[];
  songs?: Song[];
  albums?: Album[];
  hourlyActivity?: any[];
}

// Graph Node Component for the new Graph View
const GraphNode = ({ item, size, x, y, onClick, isCenter, connectionStrength }: any) => (
    <div 
        className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-all duration-700 ease-out hover:scale-110 hover:z-50 ${isCenter ? 'z-40' : 'z-10'}`}
        style={{ left: `${x}%`, top: `${y}%` }}
        onClick={onClick}
    >
        <div className={`rounded-full overflow-hidden border-2 transition-all duration-500 ${isCenter ? 'border-[#FA2D48] shadow-[0_0_30px_rgba(250,45,72,0.4)]' : connectionStrength > 0 ? 'border-white/60 shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'border-white/10 opacity-60'} bg-[#2C2C2E]`}
             style={{ width: size, height: size }}>
            <img src={item.image || item.cover} alt={item.name || item.title} className="w-full h-full object-cover grayscale-[30%] group-hover:grayscale-0 transition-all" />
        </div>
        
        {/* Connection Strength Badge */}
        {!isCenter && connectionStrength > 0 && (
            <div className="absolute -top-2 -right-2 bg-white text-black text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg">
                {connectionStrength}
            </div>
        )}

        <div className={`absolute left-1/2 -translate-x-1/2 mt-3 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50`}>
            <div className="bg-black/95 border border-white/10 rounded-lg px-3 py-1.5 whitespace-nowrap shadow-2xl">
                <p className="text-white text-[11px] font-bold tracking-tight">{item.name || item.title}</p>
                <p className="text-[#8E8E93] text-[9px] uppercase tracking-widest font-bold">
                    {connectionStrength > 0 ? `${connectionStrength} Shared Sessions` : `${item.totalListens || item.listens} plays`}
                </p>
            </div>
        </div>

        {/* Pulsing Aura for center */}
        {isCenter && (
            <div className="absolute inset-0 rounded-full border border-[#FA2D48]/30 animate-ping opacity-20 pointer-events-none" />
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

  // Network Graph Data
  const [network, setNetwork] = useState<{ artistInfo: any, pairs: any }>({ artistInfo: {}, pairs: {} });
  const [centerArtist, setCenterArtist] = useState<string | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);

  useEffect(() => {
    if (viewMode === 'Graph' && Object.keys(network.artistInfo).length === 0) {
        loadNetwork();
    }
  }, [viewMode]);

  const loadNetwork = async () => {
    setLoadingGraph(true);
    const data = await fetchArtistNetwork(2000); // Analyze more plays for better graph
    setNetwork(data);
    
    // Default center to top artist if not set
    if (Object.keys(data.artistInfo).length > 0) {
        const top = Object.values(data.artistInfo).sort((a: any, b: any) => b.count - a.count)[0] as any;
        setCenterArtist(top.name);
    }
    setLoadingGraph(false);
  };

  // Get Orbiting Artists for Center
  const getOrbitData = () => {
      if (!centerArtist || !network.pairs[centerArtist]) return [];
      
      const related = network.pairs[centerArtist];
      return Object.entries(related)
        .map(([name, strength]) => ({
            ...network.artistInfo[name],
            strength: strength as number
        }))
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 8); // Show top 8 related
  };

  const orbitArtists = getOrbitData();
  const centerInfo = centerArtist ? network.artistInfo[centerArtist] : null;

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
           /* GRAPH VIEW - Dynamic Network Visualization */
           <div className="h-[420px] relative bg-[#0D0D0D] overflow-hidden group/graph">
              {/* Background Glow */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#FA2D48]/5 rounded-full blur-[120px] pointer-events-none" />
              
              {loadingGraph ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-50">
                      <div className="w-8 h-8 border-2 border-[#FA2D48] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[#8E8E93] text-[10px] font-bold uppercase tracking-widest">Mapping Connections...</p>
                  </div>
              ) : !centerInfo ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-12">
                      <Share2 className="w-12 h-12 text-[#2C2C2E]" />
                      <p className="text-[#8E8E93] text-sm">Not enough data to map your network yet. Keep listening!</p>
                  </div>
              ) : (
                  <>
                    {/* Header Info */}
                    <div className="absolute top-4 left-4 z-30 flex items-center gap-3">
                        <div className="bg-[#FA2D48]/10 text-[#FA2D48] p-2 rounded-lg">
                            <GitBranch className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-white text-xs font-bold leading-none mb-1">Artist Affinity</p>
                            <p className="text-[#8E8E93] text-[10px]">Showing artists you listen to together</p>
                        </div>
                    </div>

                    {/* Reset Button */}
                    <button 
                         onClick={loadNetwork}
                         className="absolute top-4 right-4 z-30 bg-[#2C2C2E]/80 hover:bg-[#3A3A3C] text-white p-2 rounded-lg transition-colors border border-white/5"
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </button>

                    {/* SVG Connections (Lines) */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
                        {orbitArtists.map((item, index) => {
                            const angle = (index * (360 / orbitArtists.length) - 90) * (Math.PI / 180);
                            const radiusX = 35; // % of width
                            const radiusY = 32; // % of height
                            const x2 = 50 + radiusX * Math.cos(angle);
                            const y2 = 50 + radiusY * Math.sin(angle);
                            
                            // Opacity based on strength
                            const opacity = Math.min(0.1 + (item.strength / 10), 0.5);
                            
                            return (
                                <line 
                                    key={item.id}
                                    x1="50%" y1="50%" 
                                    x2={`${x2}%`} y2={`${y2}%`}
                                    stroke={`rgba(250, 45, 72, ${opacity})`}
                                    strokeWidth={1 + item.strength/5}
                                    strokeDasharray={item.strength > 2 ? "" : "4 4"}
                                    className="transition-all duration-1000"
                                />
                            );
                        })}
                    </svg>
                    
                    {/* Center Node */}
                    <GraphNode 
                        item={centerInfo} 
                        size={110} 
                        x={50} 
                        y={50} 
                        isCenter={true}
                        onClick={() => setSelectedNode(centerInfo)}
                    />
                    
                    {/* Orbiting Nodes */}
                    {orbitArtists.map((item, index) => {
                        const angle = (index * (360 / orbitArtists.length) - 90) * (Math.PI / 180);
                        const radiusX = 35;
                        const radiusY = 32;
                        const x = 50 + radiusX * Math.cos(angle);
                        const y = 50 + radiusY * Math.sin(angle);
                        
                        // Size based on strength or count
                        const size = 65 + Math.min(item.strength * 2, 20);
                        
                        return (
                            <GraphNode 
                                key={item.id}
                                item={item} 
                                size={size} 
                                x={x} 
                                y={y} 
                                isCenter={false}
                                connectionStrength={item.strength}
                                onClick={() => {
                                    setCenterArtist(item.name);
                                    setSelectedNode(item);
                                }}
                            />
                        );
                    })}
                  </>
              )}
              
              {/* Selected Node Detail Overlay */}
              {selectedNode && (
                  <div className="absolute bottom-4 left-4 right-4 bg-black/90 backdrop-blur-xl rounded-2xl p-4 border border-white/10 animate-in slide-in-from-bottom-4 z-[60] shadow-2xl">
                      <div className="flex items-center gap-4">
                          <img src={selectedNode.image || selectedNode.cover} alt="" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                          <div className="flex-1 min-w-0">
                              <h4 className="text-white font-bold text-base truncate">{selectedNode.name || selectedNode.title}</h4>
                              <p className="text-[#8E8E93] text-xs uppercase tracking-widest font-bold">
                                  {selectedNode.count || selectedNode.listens} Plays In History
                              </p>
                          </div>
                          <button 
                            onClick={() => setSelectedNode(null)}
                            className="text-[#8E8E93] hover:text-white p-2"
                          >
                             <Minus className="w-5 h-5" />
                          </button>
                      </div>
                  </div>
              )}
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
