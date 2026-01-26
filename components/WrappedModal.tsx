import React, { useEffect, useState } from 'react';
import { X, Share2, Sparkles, Music2, Calendar, Headphones, Clock, TrendingUp, Mic2, Disc } from 'lucide-react';
import { generateWrappedStory } from '../services/geminiService';

interface WrappedModalProps {
    isOpen: boolean;
    onClose: () => void;
    period?: string; // 'Day', 'Week', 'Month'
}

export const WrappedModal: React.FC<WrappedModalProps> = ({ isOpen, onClose, period = "Week" }) => {
    const [story, setStory] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            generateWrappedStory(period).then(data => {
                setStory(data);
                setLoading(false);
            });
        }
    }, [isOpen, period]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-black/99 backdrop-blur-xl animate-in fade-in duration-300">
            <button 
                onClick={onClose} 
                className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-[#FA2D48] z-[110] transition-all hover:scale-110 active:scale-95"
            >
                <X className="text-white w-6 h-6" />
            </button>
            
            <div className="w-full h-full sm:h-auto sm:max-w-4xl max-h-[95vh] bg-[#0A0A0A] sm:rounded-[40px] overflow-y-auto no-scrollbar relative shadow-[0_0_100px_rgba(250,45,72,0.2)] border border-white/5 flex flex-col p-6 sm:p-12">
                {/* Header Section */}
                <div className="flex flex-col mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-[#FA2D48]/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-[#FA2D48]" />
                        </div>
                        <span className="text-[#8E8E93] font-bold uppercase tracking-[0.2em] text-[10px]">Muse Analytics Report</span>
                    </div>
                    <h2 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none">
                        Your {period} <span className="text-[#FA2D48]">Wrapped</span>
                    </h2>
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-6 py-24">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-[#FA2D48]/10 border-t-[#FA2D48] rounded-full animate-spin" />
                            <Headphones className="absolute inset-0 m-auto w-8 h-8 text-[#FA2D48] animate-pulse" />
                        </div>
                        <p className="text-white/40 font-bold uppercase tracking-widest text-xs animate-pulse">De-coding your musical DNA...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 auto-rows-fr">
                        {/* Summary Bento Card - Large */}
                        <div className="md:col-span-2 md:row-span-2 rounded-[32px] bg-gradient-to-br from-[#1C1C1E] to-[#0A0A0A] p-8 sm:p-10 border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-[#FA2D48] rounded-full blur-[120px] opacity-[0.05] group-hover:opacity-[0.1] transition-opacity duration-1000" />
                            
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-[#FA2D48] mb-8">
                                        <Music2 size={16} />
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">The Insight</span>
                                    </div>
                                    <h3 className="text-3xl sm:text-4xl font-bold text-white mb-8 leading-tight tracking-tight">
                                        {story?.storyText || "You explored new horizons, blending diverse sounds into a unique profile."}
                                    </h3>
                                </div>
                                
                                <div className="flex items-end justify-between">
                                    <div className="space-y-1">
                                        <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.2em]">Primary Genre</p>
                                        <div className="flex items-center gap-3">
                                            <Disc className="text-[#FA2D48]" size={24} />
                                            <span className="text-3xl font-black text-white uppercase italic tracking-tighter">{story?.topGenre || "Pop/Rock"}</span>
                                        </div>
                                    </div>
                                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-colors group cursor-pointer shadow-xl">
                                        <Share2 className="text-white/40 group-hover:text-white transition-colors" size={20} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Time Card */}
                        <div className="rounded-[32px] bg-[#111] p-8 border border-white/5 flex flex-col justify-between relative overflow-hidden group">
                             <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#FA2D48] rounded-full blur-3xl opacity-[0.05]" />
                             <div className="relative z-10">
                                <Clock className="text-[#FA2D48] mb-6" size={28} />
                                <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Total Focus</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-black text-white tracking-tighter">{Math.round((story?.listeningMinutes || 0) / 60)}</span>
                                    <span className="text-[#FA2D48] font-black text-xl italic uppercase">Hours</span>
                                </div>
                             </div>
                             <p className="text-[10px] text-white/40 mt-6 leading-relaxed font-bold uppercase tracking-widest italic flex items-center gap-2">
                                <div className="w-1 h-3 bg-[#FA2D48]" />
                                Dedicated Listening
                             </p>
                        </div>

                        {/* Tier Card */}
                        <div className="rounded-[32px] bg-[#111] border border-white/5 p-8 flex flex-col justify-between group overflow-hidden">
                             <TrendingUp className="text-emerald-500 mb-6" size={28} />
                             <div className="relative z-10">
                                <p className="text-white/30 text-[9px] font-bold uppercase tracking-[0.2em] mb-2">Listener Profile</p>
                                <span className="text-3xl font-black text-white italic uppercase tracking-tighter leading-tight">Elite Explorer</span>
                             </div>
                             <div className="mt-8 flex items-center gap-2">
                                <div className="flex -space-x-3">
                                    {[1,2,3].map(i => (
                                        <div key={i} className="w-7 h-7 rounded-full border-2 border-[#111] bg-gradient-to-br from-white/10 to-transparent" />
                                    ))}
                                </div>
                                <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest pl-2">Top 1.2%</span>
                             </div>
                        </div>

                        {/* Full Width Banner */}
                        <div className="md:col-span-3 rounded-[32px] bg-[#FA2D48] p-[1px] mt-4">
                            <div className="bg-[#0A0A0A] rounded-[31px] px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-8">
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-10">
                                    <div className="text-center sm:text-left">
                                        <p className="text-[9px] font-bold text-[#FA2D48] uppercase tracking-[0.3em] mb-2">Discoveries</p>
                                        <div className="flex items-center gap-2">
                                            <Mic2 size={18} className="text-white/40" />
                                            <p className="text-3xl font-black text-white tabular-nums">{story?.uniqueArtists || 142}</p>
                                        </div>
                                    </div>
                                    <div className="w-px h-12 bg-white/5 hidden sm:block" />
                                    <div className="text-center sm:text-left">
                                        <p className="text-[9px] font-bold text-[#FA2D48] uppercase tracking-[0.3em] mb-2">Total Plays</p>
                                        <div className="flex items-center gap-2">
                                            <Headphones size={18} className="text-white/40" />
                                            <p className="text-3xl font-black text-white tabular-nums">{story?.totalTracks || 642}</p>
                                        </div>
                                    </div>
                                </div>
                                <button className="px-10 py-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#FA2D48] hover:text-white transition-all shadow-2xl active:scale-95">
                                    Export Analysis
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
