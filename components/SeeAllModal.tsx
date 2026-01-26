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

                {/* Scrollable List OR Grid */}
                <div className="flex-1 overflow-y-auto px-2 md:px-6 pb-6 pt-2 scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
                    { type === 'artist' ? (
                        /* CIRCULAR ARTIST GRID LAYOUT */
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 p-4">
                            {items.map((item, index) => (
                                <div key={index} className="group relative flex flex-col items-center">
                                    <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-2xl z-10 cursor-pointer border border-white/5 group-hover:border-white/20">
                                        {/* Artist Image */}
                                        <img 
                                            src={item.cover || item.image || item.art || `https://ui-avatars.com/api/?name=${item.name}&background=1DB954&color=fff`} 
                                            alt={item.name} 
                                            className="w-full h-full object-cover rounded-full"
                                        />
                                        
                                        {/* Hover Blur & Stats */}
                                        <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center text-center p-2">
                                            <span className="text-2xl font-bold text-white mb-1">{item.totalListens || item.listens || 0}</span>
                                            <span className="text-[10px] uppercase tracking-widest text-white/70 mb-2">Plays</span>
                                            <span className="text-sm font-medium text-[#FA2D48]">{item.timeStr || '0m'}</span>
                                        </div>
                                        
                                        {/* Rank Badge */}
                                        <div className="absolute -top-1 -right-1 w-8 h-8 bg-black/80 backdrop-blur border border-white/10 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                            #{index+1}
                                        </div>
                                    </div>
                                    
                                    {/* Name Below - Visual Stack */}
                                    <div className="mt-[-20px] pt-8 pb-4 px-4 bg-[#2C2C2E] rounded-2xl w-full text-center border border-white/5 relative z-0 transition-transform group-hover:translate-y-1">
                                         <h3 className="text-sm font-bold text-white truncate px-2">{item.name}</h3>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* SQUARE STACK LAYOUT (Albums/Songs) */
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 p-4">
                            {items.map((item, index) => (
                                <div key={index} className="group relative cursor-pointer">
                                    {/* Fake Stack Effect */}
                                    <div className="absolute top-2 left-2 w-full h-full bg-white/5 rounded-xl border border-white/5 z-0 transition-transform group-hover:translate-x-1 group-hover:translate-y-1"></div>
                                    <div className="absolute top-1 left-1 w-full h-full bg-[#2C2C2E] rounded-xl border border-white/10 z-10"></div>
                                    
                                    {/* Main Card */}
                                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#1C1C1E] z-20 shadow-xl border border-white/10 group-hover:-translate-y-1 transition-transform duration-300">
                                        <img 
                                            src={item.cover || item.image} 
                                            alt={item.title || item.name} 
                                            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" 
                                        />
                                        
                                        {/* Permanent Gradient Overlay for Text Readability */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80" />
                                        
                                        {/* Text Inside Image */}
                                        <div className="absolute bottom-0 left-0 w-full p-4 transform transition-transform duration-300 group-hover:-translate-y-2">
                                            <h3 className="text-sm md:text-base font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
                                                {item.title || item.name}
                                            </h3>
                                            <p className="text-xs text-[#AAA] font-medium truncate mt-1">
                                                {item.artist}
                                            </p>
                                        </div>
                                        
                                        {/* Rank */}
                                        <div className="absolute top-2 left-2 text-[40px] leading-none font-black text-white/10 italic select-none">
                                            {index + 1}
                                        </div>

                                        {/* Hover Overlay Stats */}
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center text-center p-4">
                                            <div className="translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                                <span className="block text-3xl font-black text-white mb-0">{item.listens || item.totalListens || 0}</span>
                                                <span className="block text-[10px] uppercase tracking-widest text-[#FA2D48] mb-3">Total Plays</span>
                                                <div className="inline-block px-3 py-1 bg-white/10 rounded-full border border-white/10">
                                                    <span className="text-xs font-bold text-white">{item.timeStr || '0m'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
