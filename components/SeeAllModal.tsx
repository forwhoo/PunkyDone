import React, { useEffect } from 'react';
import { X, Play, Clock, Music } from 'lucide-react';

interface SeeAllModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: any[];
    type: 'artist' | 'album' | 'song';
    onItemClick?: (item: any) => void;
}

export const SeeAllModal: React.FC<SeeAllModalProps> = ({ isOpen, onClose, title, items, type }) => {
    
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 md:p-6 w-full h-full">
            {/* Backdrop with heavy blur for premium feel */}
            <div 
                className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-all duration-500"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-[#1C1C1E] w-full max-w-5xl h-full md:rounded-[40px] overflow-hidden shadow-2xl flex flex-col border border-white/10 animate-in slide-in-from-bottom-10 fade-in duration-500">
                {/* Header Area */}
                <div className="flex-shrink-0 relative overflow-hidden h-40 md:h-52 w-full bg-gradient-to-b from-[#2C2C2E] to-[#1C1C1E]">
                     {/* Dynamic Background Noise/Gradient */}
                     <div className="absolute inset-0 opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div>
                     <div className="absolute top-0 right-0 w-96 h-96 bg-[#FA2D48] rounded-full blur-[150px] opacity-10 translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

                     <div className="absolute inset-x-6 top-6 flex justify-between items-start z-20">
                        <button 
                            onClick={onClose}
                            className="bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full p-2 transition-all hover:scale-105 active:scale-95"
                        >
                            <X size={24} />
                        </button>
                     </div>

                     <div className="absolute bottom-6 left-6 md:left-10 z-10">
                        <p className="text-[#FA2D48] text-xs font-bold uppercase tracking-[0.2em] mb-2 animate-in fade-in slide-in-from-left-4 duration-700 delay-100">Full Ranking</p>
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-none animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
                            Top {type === 'artist' ? 'Artists' : (type === 'album' ? 'Albums' : 'Songs')}
                        </h2>
                     </div>
                </div>

                {/* List Header */}
                <div className="flex items-center px-6 md:px-10 py-3 border-b border-white/5 bg-[#1C1C1E]/50 backdrop-blur text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest sticky top-0 z-20">
                    <span className="w-12 text-center">#</span>
                    <span className="flex-1">Title</span>
                    <span className="w-24 text-right hidden md:block">Time Played</span>
                    <span className="w-16 text-right">Plays</span>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto px-2 md:px-6 pb-6 pt-2 scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
                    <div className="space-y-1">
                        {items.map((item, index) => (
                            <div 
                                key={item.id || index}
                                className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 transition-all duration-200 cursor-default border border-transparent hover:border-white/5 active:scale-[0.99]"
                                onClick={() => onItemClick && onItemClick(item)}
                            >
                                <span className="text-xl font-bold text-[#8E8E93]/40 w-12 text-center font-mono group-hover:text-white transition-colors">
                                    {index + 1}
                                </span>
                                
                                <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl overflow-hidden flex-shrink-0 bg-[#2C2C2E] shadow-lg group-hover:shadow-2xl transition-all">
                                    <img src={item.cover || item.image || item.art} alt={item.name || item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play size={20} className="text-white fill-white drop-shadow-lg" />
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="text-base font-bold text-white truncate group-hover:text-[#FA2D48] transition-colors">
                                        {item.name || item.title}
                                    </h3>
                                    <p className="text-xs text-[#8E8E93] truncate font-medium">
                                        {type === 'artist' ? 'Artist' : item.artist}
                                    </p>
                                </div>

                                {/* Desktop Stats */}
                                <div className="hidden md:flex flex-col items-end w-24 text-right">
                                    <span className="text-sm font-bold text-white">{item.timeStr || "0m"}</span>
                                </div>

                                <div className="flex flex-col items-end w-16 text-right">
                                    <span className="text-sm font-black text-white">{item.totalListens || item.plays || item.count || 0}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
