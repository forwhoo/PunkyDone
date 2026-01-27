import React from 'react';
import { Share2, Music, TrendingUp, Clock, Calendar } from 'lucide-react';

interface WrappedCardProps {
    data: any[];
    title: string;
    description: string;
    userName?: string;
    onClose: () => void;
}

export const WrappedView: React.FC<WrappedCardProps> = ({ data, title, description, userName, onClose }) => {
    // Determine stats from data
    const totalMins = Math.round(data.reduce((acc, curr) => acc + (curr.totalMinutes || curr.timeStr?.replace('m','')*1 || 0), 0));
    const topItem = data[0];
    
    // Determine Type of Wrapped based on data content
    const isArtistWrapped = data[0]?.type === 'artist' || data[0]?.artist === data[0]?.title;
    
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="relative w-full max-w-md h-[85vh] bg-gradient-to-br from-[#1C1C1E] to-[#000] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
                
                {/* Story Progress Bar (Decorative) */}
                <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
                    <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white w-full animate-[width_5s_linear]"></div>
                    </div>
                </div>

                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-8 right-6 z-30 text-white/50 hover:text-white p-2"
                >
                    ✕
                </button>

                {/* Content Container */}
                <div className="flex-1 flex flex-col relative p-8">
                    
                    {/* Header */}
                    <div className="mt-12 mb-8">
                        <span className="text-white font-bold tracking-widest text-xs uppercase mb-2 block animate-in slide-in-from-left duration-700">Punky Wrapped</span>
                        <h1 className="text-4xl font-black text-white leading-tight mb-4 animate-in slide-in-from-bottom duration-700 delay-100">
                            {title}
                        </h1>
                        <p className="text-white/60 text-lg font-medium leading-relaxed animate-in slide-in-from-bottom duration-700 delay-200">
                            {description}
                        </p>
                    </div>

                    {/* Main Visual / Chart */}
                    <div className="flex-1 flex flex-col items-center justify-center mb-8 relative">
                         {/* Background Glow */}
                         <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent blur-3xl opacity-30"></div>
                         
                         {topItem && (
                            <div className="relative w-64 h-64 mb-8 group animate-in zoom-in duration-1000 delay-300">
                                <div className="absolute inset-0 bg-white rounded-full blur-2xl opacity-10 group-hover:opacity-30 transition-opacity"></div>
                                <img 
                                    src={topItem.cover || topItem.image} 
                                    className={`w-full h-full object-cover shadow-2xl border-2 border-white/10 ${isArtistWrapped ? 'rounded-full' : 'rounded-2xl'}`}
                                    alt="Top Item"
                                />
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white text-black font-black px-6 py-2 rounded-full text-xl shadow-xl whitespace-nowrap">
                                    #1 {isArtistWrapped ? topItem.title : 'Track'}
                                </div>
                            </div>
                         )}
                         
                         {/* Stats Grid */}
                         <div className="grid grid-cols-2 gap-4 w-full animate-in slide-in-from-bottom duration-700 delay-500">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-white mb-1">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">Time</span>
                                </div>
                                <span className="text-2xl font-bold text-white">{totalMins}m</span>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                                <div className="flex items-center gap-2 text-white mb-1">
                                    <TrendingUp className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">Top Genre</span>
                                </div>
                                <span className="text-lg font-bold text-white truncate w-full block">Pop</span> 
                                {/* Placeholder for genre as it's not in track stats usually */}
                            </div>
                         </div>
                    </div>

                    {/* List */}
                    <div className="space-y-3 pb-8 animate-in slide-in-from-bottom duration-700 delay-700">
                        {data.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                                <span className="font-bold text-white/30 text-lg w-4 text-center">{idx + 1}</span>
                                <img src={item.cover} className="w-10 h-10 rounded-md object-cover bg-black/50" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold text-sm truncate">{item.title}</h3>
                                    <p className="text-white/50 text-xs truncate">{item.artist}</p>
                                </div>
                                <span className="text-white/70 text-xs font-mono">{item.timeStr || item.listens}</span>
                            </div>
                        ))}
                    </div>

                </div>

                {/* Footer / postcard action */}
                <div className="p-6 bg-[#111] border-t border-white/5 flex gap-3 animate-in fade-in duration-1000 delay-1000">
                    <button className="flex-1 py-4 rounded-xl bg-white text-black font-bold text-sm tracking-widest uppercase hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <Share2 className="w-4 h-4" />
                        Share Postcard
                    </button>
                    <button onClick={onClose} className="px-6 py-4 rounded-xl bg-white/10 text-white font-bold text-sm tracking-widest uppercase hover:bg-white/20 transition-all">
                        Skip
                    </button>
                </div>
            </div>
        </div>
    );
};
