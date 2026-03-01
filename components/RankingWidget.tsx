import React from 'react';
import { ChevronRight, Play, Trophy, Music, Disc, Mic2 } from 'lucide-react';
import { Card } from './UIComponents';

interface RankingItem {
  rank: number;
  title: string;
  subtitle: string;
  value?: string;
  image?: string;
  change?: number; // for trend
}

interface RankingWidgetProps {
  title: string;
  items: RankingItem[];
  color?: string; // Accent color
  icon?: React.ReactNode;
  onExpand?: () => void;
  type?: 'list' | 'grid';
}

export const RankingWidget: React.FC<RankingWidgetProps> = ({ 
  title, 
  items, 
  color = "#ffffff", 
  icon,
  onExpand,
  type = 'list' 
}) => {
  return (
    <Card className="bg-white border border-[#e8e6dc] overflow-hidden relative group hover:border-[#e8e6dc] transition-all duration-300">
      <div 
        className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 pointer-events-none" 
        style={{ backgroundColor: color }} 
      />
      
      <div className="p-5 flex justify-between items-end relative z-10">
        <div className="flex flex-col gap-1">
            <h3 className="text-[19px] font-bold text-[#141413] tracking-tight flex items-center gap-2">
                {icon} {title}
            </h3>
             <p className="text-[#b0aea5] text-[11px] font-medium uppercase tracking-wider">Top 5 This Week</p>
        </div>
        {onExpand && (
            <button 
                onClick={onExpand}
                className="w-8 h-8 rounded-full bg-[#e8e6dc]/50 flex items-center justify-center hover:bg-[#e8e6dc] transition-colors"
                title="View Wrapped"
            >
                <Play className="w-3 h-3 text-[#141413] fill-white" />
            </button>
        )}
      </div>

      <div className="px-3 pb-4 space-y-2 relative z-10">
        {items.slice(0, 5).map((item, index) => (
            <div 
                key={index} 
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#e8e6dc]/50 transition-colors group/item cursor-pointer relative"
            >
                {/* Background Large Number */}
                <div className="absolute left-1 top-0 text-[40px] font-black italic select-none pointer-events-none opacity-[0.03] group-hover/item:opacity-[0.07] transition-opacity">
                    {item.rank}
                </div>

                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-lg ml-2">
                    <img 
                        src={item.image || `https://ui-avatars.com/api/?name=${item.title}&background=random`} 
                        alt={item.title} 
                        className="w-full h-full object-cover" 
                    />
                     {/* Overlay play icon on hover */}
                     <div className="absolute inset-0 bg-[#faf9f5]/40 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                         <Play className="w-3 h-3 text-[#141413] fill-white" />
                     </div>
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className="text-[#141413] font-semibold text-[13px] truncate">{item.title}</h4>
                    <p className="text-[#b0aea5] text-[11px] truncate">{item.subtitle}</p>
                </div>

                {item.value && (
                    <div className="text-right">
                        <span className="text-[#141413]/60 text-[11px] font-medium block">{item.value}</span>
                         {item.change ? (
                             <span className={`text-[9px] ${item.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {item.change > 0 ? '+' : ''}{item.change}%
                             </span>
                         ) : null}
                    </div>
                )}
            </div>
        ))}
      </div>
    </Card>
  );
};
