import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from './UIComponents';
import { Play, Calendar, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { Artist, Album, Song } from '../types';
import { fetchCharts } from '../services/dbService';

interface TopChartsProps {
  title: string;
  username?: string;
  artists?: Artist[];
  songs?: Song[];
  albums?: Album[];
  hourlyActivity?: any[];
  timeRange: 'Daily' | 'Weekly' | 'Monthly';
  onTimeRangeChange: (range: 'Daily' | 'Weekly' | 'Monthly') => void;
}

export const TopCharts: React.FC<TopChartsProps> = ({ title, username = 'Your', artists = [], songs = [], albums = [], hourlyActivity = [], timeRange, onTimeRangeChange }) => {
  const [activeTab, setActiveTab] = useState<'Songs' | 'Albums' | 'Artists'>('Artists');
  const [chartData, setChartData] = useState<any[]>([]);

  // Fetch dynamic chart when tab/timeRange changes
  React.useEffect(() => {
    if (activeTab === 'Songs') {
       // Only fetch if "Songs" because that's what the SQL supports right now
       const period = timeRange.toLowerCase() as 'daily' | 'weekly' | 'monthly';
       fetchCharts(period).then(data => setChartData(data));
    }
  }, [timeRange, activeTab]);

  // Merge dynamic chart data with passed-in songs if needed, 
  // OR just use chartData if available and activeTab is 'Songs'.
  // For now, let's prefer chartData for Songs tab if it has content
  
  // Helper to get date range based on timeRange
  const getDateRangeText = () => {
    const now = new Date();
    let startDate: Date;
    
    if (timeRange === 'Daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    } else if (timeRange === 'Weekly') {
      const dayOfWeek = now.getDay();
      const daysToMonday = (dayOfWeek + 6) % 7;
      startDate = new Date(now.getTime() - daysToMonday * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    }
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    return `${formatDate(startDate)} - ${formatDate(now)}`;
  };

  // Get data based on active tab
  const getListData = () => {
    switch (activeTab) {
      case 'Artists': return artists;
      case 'Albums': return albums;
      case 'Songs': return chartData.length > 0 ? chartData : songs;
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

  return (
    <Card className="flex flex-col bg-transparent border-none shadow-none overflow-visible relative min-h-[450px]">
      <CardHeader className="pb-6 pl-1 pr-1 pt-0 flex flex-col xl:flex-row xl:items-center justify-between border-b border-white/5 gap-4">
        <div>
           <CardTitle className="text-white text-[22px] font-bold tracking-tight mb-1">{username}'s Chart</CardTitle>
           <div className="text-[#8E8E93] text-sm flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              <span>{getDateRangeText()} · {activeTab}</span>
           </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
           {/* Time Range Toggle */}
           <div className="flex bg-[#2C2C2E] p-1 rounded-lg">
             {['Daily', 'Weekly', 'Monthly'].map((range) => (
               <button
                 key={range}
                 onClick={() => onTimeRangeChange(range as any)}
                 className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide rounded-[6px] transition-all ${
                   timeRange === range 
                   ? 'bg-[#FA2D48] text-white shadow-md' 
                   : 'text-[#8E8E93] hover:text-white'
                 }`}
               >
                 {range}
               </button>
             ))}
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

      <div className="flex-1 p-0 overflow-hidden">
         {/* LIST VIEW - LISTEN CHART */}
         <div className="w-full">
               <div className="grid grid-cols-[45px_1fr_40px_40px_40px] md:grid-cols-[70px_1fr_100px_80px_80px] px-4 md:px-6 py-3 border-b border-white/5 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">
                   <div>#</div>
                   <div>{activeTab === 'Songs' ? 'TRACK' : activeTab === 'Artists' ? 'ARTIST' : 'ALBUM'}</div>
                   <div className="text-center">PK</div>
                   <div className="text-center">LW</div>
                   <div className="text-center">Wks</div>
               </div>
               
               <div className="flex flex-col">
                   {listData.map((item: any, idx) => {
                       const rank = idx + 1;
                       // Mock data logic for display if not present (remove in prod if always present)
                       const trend = item.trend || 'NEW';
                       const prev = item.prev || (trend === 'NEW' ? '-' : rank + Math.floor(Math.random() * 5)); 
                       const peak = item.peak || rank;
                       const streak = item.streak || 1; 

                       const getTrendIcon = (t: string) => {
                           if (t === 'UP') return <TrendingUp className="w-2.5 h-2.5 md:w-3 h-3 text-green-500" />;
                           if (t === 'DOWN') return <TrendingDown className="w-2.5 h-2.5 md:w-3 h-3 text-red-500" />;
                           if (t === 'STABLE') return <Minus className="w-2.5 h-2.5 md:w-3 h-3 text-gray-500" />;
                           return <SparklesBadge />;
                       };

                       return (
                       <div key={item.id} className="grid grid-cols-[45px_1fr_40px_40px_40px] md:grid-cols-[70px_1fr_100px_80px_80px] items-center px-4 md:px-6 py-4 hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0 relative overflow-hidden">
                           
                           {/* Rank + Trend Column */}
                           <div className="flex flex-col items-center justify-center -ml-1 md:-ml-2 w-10 md:w-14">
                               <span className={`text-[14px] md:text-[16px] font-black italic tracking-tighter ${rank === 1 ? 'text-[#FA2D48] md:text-[20px]' : 'text-white'}`}>
                                   {rank}
                               </span>
                               <div className="flex items-center gap-1 mt-0.5">
                                   {trend === 'NEW' ? (
                                       <span className="text-[7px] md:text-[9px] font-black text-[#FA2D48] uppercase tracking-wider bg-[#FA2D48]/10 px-1 rounded-sm">NEW</span>
                                   ) : (
                                       <>
                                         {getTrendIcon(trend)}
                                         {trend !== 'STABLE' && (
                                            <span className={`text-[7px] md:text-[9px] font-bold ${trend === 'UP' ? 'text-green-500' : 'text-red-500'}`}>
                                                {Math.abs((item.prev || 0) - rank) || 1}
                                            </span>
                                         )}
                                       </>
                                   )}
                               </div>
                           </div>
                           
                           {/* Track Info */}
                           <div className="flex items-center gap-3 md:gap-4 min-w-0 pr-2">
                               <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg overflow-hidden bg-[#2C2C2E] relative group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)] transition-all shrink-0">
                                   <img 
                                      src={getImageSrc(item)} 
                                      className="w-full h-full object-cover" 
                                      onError={handleImageError}
                                   />
                                   {activeTab === 'Songs' && (
                                     <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                         <Play className="w-4 h-4 md:w-5 md:h-5 text-white fill-white drop-shadow-lg" />
                                     </div>
                                   )}
                               </div>
                               <div className="min-w-0 flex flex-col justify-center">
                                   <div className="font-bold text-white text-[13px] md:text-[15px] truncate group-hover:text-[#FA2D48] transition-colors leading-tight">
                                       {item.name || item.title}
                                   </div>
                                   {(item.artist && activeTab !== 'Artists') && (
                                       <div className="text-[11px] md:text-[12px] text-[#8E8E93] truncate hover:text-white transition-colors cursor-pointer w-fit mt-0.5">
                                           {item.artist}
                                       </div>
                                   )}
                               </div>
                           </div>
                           
                           {/* Stats Columns */}
                           <div className="flex flex-col items-center justify-center">
                               <span className="text-[12px] md:text-[14px] font-bold text-white/90">{peak}</span>
                               <span className="text-[7px] md:text-[9px] text-[#555] font-mono uppercase hidden md:inline">Peak</span>
                           </div>
                           
                           <div className="flex flex-col items-center justify-center">
                               <span className="text-[12px] md:text-[14px] font-bold text-[#8E8E93]">{trend === 'NEW' ? '-' : prev}</span>
                               <span className="text-[7px] md:text-[9px] text-[#555] font-mono uppercase hidden md:inline">Last</span>
                           </div>

                            <div className="flex flex-col items-center justify-center">
                               <span className="text-[12px] md:text-[14px] font-bold text-white">{streak}</span>
                               <span className="text-[7px] md:text-[9px] text-[#555] font-mono uppercase hidden md:inline">Wks</span>
                           </div>

                       </div>
                   )})}
               </div>
           </div>
      </div>
    </Card>
  );
};

const SparklesBadge = () => (
    <div className="relative w-3 h-3">
        <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
        <div className="relative w-3 h-3 bg-yellow-500 rounded-full"></div>
    </div>
);
