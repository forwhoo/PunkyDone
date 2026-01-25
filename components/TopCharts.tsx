import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from './UIComponents';
import { Play, Calendar } from 'lucide-react';
import { Artist, Album, Song } from '../types';

interface TopChartsProps {
  title: string;
  artists?: Artist[];
  songs?: Song[];
  albums?: Album[];
  hourlyActivity?: any[];
  timeRange: 'Daily' | 'Weekly' | 'Monthly';
  onTimeRangeChange: (range: 'Daily' | 'Weekly' | 'Monthly') => void;
}

export const TopCharts: React.FC<TopChartsProps> = ({ title, artists = [], songs = [], albums = [], hourlyActivity = [], timeRange, onTimeRangeChange }) => {
  const [activeTab, setActiveTab] = useState<'Songs' | 'Albums' | 'Artists'>('Artists');

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

  return (
    <Card className="flex flex-col bg-[#1C1C1E] border-none shadow-none overflow-visible relative min-h-[450px]">
      <CardHeader className="pb-4 pl-5 pr-5 pt-6 flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 gap-4">
        <div>
           <CardTitle className="text-white text-[22px] font-bold tracking-tight mb-1">User Chart</CardTitle>
           <div className="text-[#8E8E93] text-sm flex items-center gap-2">
              <Calendar className="w-3 h-3" />
              <span>{getDateRangeText()} · {activeTab}</span>
           </div>
        </div>
        
        <div className="flex items-center gap-3">
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

      <div className="flex-1 p-0">
         {/* LIST VIEW - LISTEN CHART */}
         <div className="w-full">
               <div className="grid grid-cols-[50px_1fr_100px_80px] px-6 py-3 border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-[#8E8E93]">
                   <div>#</div>
                   <div>Listen Chart</div>
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
      </div>
    </Card>
  );
};
