import React from 'react';
import { Music, Clock } from 'lucide-react';

interface EmptyStateProps {
  timeRange: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ timeRange }) => {
  return (
    <div className="glass-morph rounded-[32px] p-8 md:p-12 text-center border border-white/[0.05] flex flex-col items-center justify-center min-h-[400px]">
      <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-6 border border-white/[0.05]">
        <Music size={24} className="text-[#141413]/40" />
      </div>

      <h3 className="text-2xl font-bold text-[#141413] mb-3 tracking-tight">Nothing here yet</h3>

      <p className="text-[#141413]/50 text-[15px] leading-relaxed max-w-sm font-medium">
        Your {timeRange.toLowerCase()} stats will appear after you've been listening. Go put on some music! 🎧
      </p>

      <div className="mt-8 px-5 py-3 rounded-xl bg-white border border-white/[0.05] text-[13px] text-[#141413]/40 font-medium inline-flex items-center gap-3">
         <Clock size={14} className="text-[#d97757]" />
         <span>Tip: Switch to "All Time" to see your complete history</span>
      </div>
    </div>
  );
};
