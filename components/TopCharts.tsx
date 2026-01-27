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
  timeRange: 'Daily' | 'Weekly' | 'Monthly' | 'All Time';
  onTimeRangeChange: (range: 'Daily' | 'Weekly' | 'Monthly' | 'All Time') => void;
}

export const TopCharts: React.FC<TopChartsProps> = ({ title, username = 'Your', artists = [], songs = [], albums = [], hourlyActivity = [], timeRange, onTimeRangeChange }) => {
  const [activeTab, setActiveTab] = useState<'Songs' | 'Albums' | 'Artists'>('Artists');
  const [chartData, setChartData] = useState<any[]>([]);

  // Fetch dynamic chart when tab/timeRange changes
  React.useEffect(() => {
    if (activeTab === 'Songs') {
       // Only fetch if "Songs" because that's what the SQL supports right now
       const period = timeRange.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'all time';
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
    } else if (timeRange === 'Monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    } else {
        // All Time
        return 'All Time';
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
    <div className="flex flex-col overflow-visible relative">
      <div className="pb-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
           <div>
              <h3 className="text-white text-lg font-bold tracking-tight">{title}</h3>
              <div className="text-[#8E8E93] text-xs flex items-center gap-2 mt-1">
                 <Calendar className="w-3 h-3" />
                 <span>{getDateRangeText()}</span>
              </div>
           </div>
        </div>
        
        {/* Category Toggle Only - Time range is controlled by parent */}
        <div className="flex bg-[#2C2C2E] p-1 rounded-lg w-fit">
          {['Artists', 'Albums', 'Songs'].map((tab) => (
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

      <div className="flex-1 overflow-hidden">
         {/* LIST VIEW - LISTEN CHART */}
         <div className="w-full">
               <div className="grid grid-cols-[40px_1fr_50px_50px_50px] px-3 py-3 border-b border-white/10 text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">
                   <div className="text-center">#</div>
                   <div>{activeTab === 'Songs' ? 'TRACK' : activeTab === 'Artists' ? 'ARTIST' : 'ALBUM'}</div>
                   <div className="text-center">PK</div>
                   <div className="text-center">LW</div>
                   <div className="text-center">WKS</div>
               </div>
               
               <div className="flex flex-col max-h-[400px] overflow-y-auto custom-scrollbar">
                   {listData.slice(0, 10).map((item: any, idx) => {
                       const rank = idx + 1;
                       // Mock data logic for display if not present (remove in prod if always present)
                       const trend = item.trend || 'NEW';
                       const prev = item.prev || (trend === 'NEW' ? '-' : rank + Math.floor(Math.random() * 5)); 
                       const peak = item.peak || rank;
                       const streak = item.streak || 1; 

                       const getTrendIcon = (t: string) => {
                           if (t === 'UP') return <TrendingUp className="w-3 h-3 text-green-500" />;
                           if (t === 'DOWN') return <TrendingDown className="w-3 h-3 text-red-500" />;
                           if (t === 'STABLE') return <Minus className="w-3 h-3 text-gray-500" />;
                           return <SparklesBadge />;
                       };

                       return (
                       <div key={item.id} className="grid grid-cols-[40px_1fr_50px_50px_50px] items-center px-3 py-3 hover:bg-white/5 transition-colors group border-b border-white/5 last:border-0">
                           
                           {/* Rank + Trend Column */}
                           <div className="flex flex-col items-center justify-center">
                               <span className={`text-sm font-black ${rank <= 3 ? 'text-[#FA2D48]' : 'text-white'}`}>
                                   {rank}
                               </span>
                               <div className="flex items-center gap-0.5 mt-0.5">
                                   {trend === 'NEW' ? (
                                       <span className="text-[8px] font-black text-[#FA2D48] uppercase">NEW</span>
                                   ) : (
                                       getTrendIcon(trend)
                                   )}
                               </div>
                           </div>
                           
                           {/* Track Info */}
                           <div className="flex items-center gap-3 min-w-0 pr-2">
                               <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#2C2C2E] relative shrink-0 border border-white/5">
                                   <img 
                                      src={getImageSrc(item)} 
                                      className="w-full h-full object-cover" 
                                      onError={handleImageError}
                                   />
                                   {activeTab === 'Songs' && (
                                     <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                         <Play className="w-4 h-4 text-white fill-white" />
                                     </div>
                                   )}
                               </div>
                               <div className="min-w-0">
                                   <div className="font-semibold text-white text-sm truncate group-hover:text-[#FA2D48] transition-colors">
                                       {item.name || item.title}
                                   </div>
                                   {(item.artist && activeTab !== 'Artists') && (
                                       <div className="text-xs text-[#8E8E93] truncate mt-0.5">
                                           {item.artist}
                                       </div>
                                   )}
                               </div>
                           </div>
                           
                           {/* Stats Columns */}
                           <div className="text-center">
                               <span className="text-sm font-bold text-white">{peak}</span>
                           </div>
                           
                           <div className="text-center">
                               <span className="text-sm font-medium text-[#8E8E93]">{trend === 'NEW' ? '-' : prev}</span>
                           </div>

                            <div className="text-center">
                               <span className="text-sm font-bold text-white">{streak}</span>
                           </div>

                       </div>
                   )})}
               </div>
           </div>
      </div>
    </div>
  );
};

const SparklesBadge = () => (
    <div className="relative w-3 h-3">
        <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
        <div className="relative w-3 h-3 bg-yellow-500 rounded-full"></div>
    </div>
);
