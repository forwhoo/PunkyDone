import React, { useEffect, useState, useMemo } from 'react';
import { X, Play, Clock, Calendar } from 'lucide-react';

interface SeeAllModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: any[];
    type: 'artist' | 'album' | 'song';
    onItemClick?: (item: any) => void;
}

export const SeeAllModal: React.FC<SeeAllModalProps> = ({ isOpen, onClose, title, items, type }) => {
    const [sortBy, setSortBy] = useState<'plays' | 'time' | 'name'>('plays');

    // Reset sort when modal opens
    useEffect(() => {
        if (isOpen) setSortBy('plays');
    }, [isOpen]);
    
    // Sort Items Logic
    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => {
            if (sortBy === 'plays') {
                const playsA = a.totalListens || a.listens || 0;
                const playsB = b.totalListens || b.listens || 0;
                return playsB - playsA;
            }
            if (sortBy === 'time') {
                // Parse "120m", "5m" etc.
                const timeA = parseInt((a.timeStr || '0').replace(/[^0-9]/g, '')) || 0;
                const timeB = parseInt((b.timeStr || '0').replace(/[^0-9]/g, '')) || 0;
                return timeB - timeA;
            }
            if (sortBy === 'name') {
                const nameA = a.name || a.title || '';
                const nameB = b.name || b.title || '';
                return nameA.localeCompare(nameB);
            }
            return 0;
        });
    }, [items, sortBy]);

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
            <div className="relative bg-[#1C1C1E] w-full max-w-5xl h-full md:h-[85vh] md:rounded-[40px] overflow-hidden shadow-2xl flex flex-col border border-white/10 animate-in slide-in-from-bottom-10 fade-in duration-500">
                
                {/* Header: Title + Sorting + Close */}
                <div className="absolute top-0 left-0 right-0 z-50 p-6 flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-b from-[#1C1C1E] via-[#1C1C1E]/90 to-transparent pb-12">
                     <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">{title}</h2>
                        <p className="text-[#8E8E93] text-sm mt-1">{items.length} items ranked</p>
                     </div>

                     <div className="flex items-center gap-2 mt-4 md:mt-0">
                        {/* Sorting Pills */}
                        <div className="bg-[#2C2C2E]/80 backdrop-blur-md p-1 rounded-full flex border border-white/5">
                            <button 
                                onClick={() => setSortBy('plays')}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${sortBy === 'plays' ? 'bg-[#FA2D48] text-white shadow-lg' : 'text-[#8E8E93] hover:text-white'}`}
                            >
                                <Play size={10} fill="currentColor" /> Plays
                            </button>
                            <button 
                                onClick={() => setSortBy('time')}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${sortBy === 'time' ? 'bg-[#FA2D48] text-white shadow-lg' : 'text-[#8E8E93] hover:text-white'}`}
                            >
                                <Clock size={10} /> Time
                            </button>
                            <button 
                                onClick={() => setSortBy('name')}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${sortBy === 'name' ? 'bg-[#FA2D48] text-white shadow-lg' : 'text-[#8E8E93] hover:text-white'}`}
                            >
                                <span className="text-[10px]">Az</span> Name
                            </button>
                        </div>
                        
                        <div className="w-px h-6 bg-white/10 mx-2 hidden md:block" />

                        <button 
                            onClick={onClose}
                            className="bg-[#3A3A3C] hover:bg-[#48484A] text-white rounded-full p-2 transition-all hover:scale-105 active:scale-95 border border-white/10"
                        >
                            <X size={20} />
                        </button>
                     </div>
                </div>

                {/* Scrollable Layout - Added top padding for header */}
                <div className="flex-1 overflow-y-auto px-4 md:px-8 pt-32 pb-12 scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
                    { type === 'artist' ? (
                        /* CIRCULAR ARTIST GRID LAYOUT */
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-12 gap-x-6 p-4">
                            {sortedItems.map((item, index) => (
                                <div key={index} className="group relative flex flex-col items-center">
                                    <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full shadow-lg transition-transform duration-300 group-hover:scale-105 group-hover:shadow-2xl z-10 cursor-pointer border border-white/5 group-hover:border-white/20">
                                        {/* Artist Image */}
                                        <img 
                                            src={item.cover || item.image || item.art || `https://ui-avatars.com/api/?name=${item.name}&background=1DB954&color=fff`} 
                                            alt={item.name} 
                                            className="w-full h-full object-cover rounded-full"
                                        />

                                        {/* Gradient for text readability */}
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 rounded-full bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                                        
                                        {/* Name Inside Image */}
                                        <div className="absolute inset-x-0 bottom-0 pb-3 px-3 text-center">
                                            <h3 className="text-[12px] font-bold text-white drop-shadow-md truncate">{item.name}</h3>
                                        </div>
                                        
                                        {/* Hover Blur & Stats */}
                                        <div className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center text-center p-2">
                                            <span className="text-xl font-bold text-white mb-0">{item.totalListens || item.listens || 0}</span>
                                            <span className="text-[9px] uppercase tracking-widest text-white/70 mb-1">Plays</span>
                                            <span className="text-xs font-bold text-[#FA2D48] bg-white/10 px-2 py-0.5 rounded-full">{item.timeStr || '0m'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* SQUARE STACK LAYOUT (Albums/Songs) */
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-10 gap-x-6 p-4">
                            {sortedItems.map((item, index) => (
                                <div key={index} className="group relative cursor-pointer">
                                    {/* Fake Stack Effect */}
                                    <div className="absolute top-1.5 left-1.5 w-full h-full bg-white/5 rounded-xl border border-white/5 z-0 transition-transform group-hover:translate-x-1 group-hover:translate-y-1"></div>
                                    <div className="absolute top-0.5 left-0.5 w-full h-full bg-[#2C2C2E] rounded-xl border border-white/10 z-10"></div>
                                    
                                    {/* Main Card */}
                                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#1C1C1E] z-20 shadow-xl border border-white/10 group-hover:-translate-y-1 transition-transform duration-300">
                                        <img 
                                            src={item.cover || item.image || item.art} 
                                            alt={item.title || item.name} 
                                            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110" 
                                        />
                                        
                                        {/* Permanent Gradient Overlay for Text Readability - Stronger at bottom */}
                                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent opacity-90" />
                                        
                                        {/* Text Inside Image */}
                                        <div className="absolute bottom-0 left-0 w-full p-3 transform transition-transform duration-300 group-hover:-translate-y-1">
                                            <h3 className="text-[13px] md:text-[14px] font-bold text-white leading-tight line-clamp-2 drop-shadow-md">
                                                {item.title || item.name}
                                            </h3>
                                            <p className="text-[11px] text-gray-300 font-medium truncate mt-0.5">
                                                {item.artist}
                                            </p>
                                        </div>

                                        {/* Hover Overlay Stats */}
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center text-center p-3 z-40">
                                            <div className="translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                                <span className="block text-2xl font-black text-white mb-0">{item.listens || item.totalListens || 0}</span>
                                                <span className="block text-[9px] uppercase tracking-widest text-[#FA2D48] mb-2">Plays</span>
                                                <div className="inline-block px-2 py-0.5 bg-white/10 rounded-full border border-white/10">
                                                    <span className="text-[10px] font-bold text-white">{item.timeStr || '0m'}</span>
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
