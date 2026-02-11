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
        <div className="fixed inset-0 z-[60] bg-black">
            {/* Header - Fixed at Top */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5">
                <div className="flex items-center justify-between p-4 sm:p-6 max-w-5xl mx-auto">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{title}</h2>
                        <p className="text-[#8E8E93] text-xs sm:text-sm">{items.length} items</p>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Sorting Pills */}
                        <div className="hidden sm:flex bg-[#1C1C1E] p-1 rounded-full border border-white/5">
                            <button 
                                onClick={() => setSortBy('plays')}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${sortBy === 'plays' ? 'bg-white text-black' : 'text-[#8E8E93] hover:text-white'}`}
                            >
                                <Play size={10} fill="currentColor" /> Plays
                            </button>
                            <button 
                                onClick={() => setSortBy('time')}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${sortBy === 'time' ? 'bg-white text-black' : 'text-[#8E8E93] hover:text-white'}`}
                            >
                                <Clock size={10} /> Time
                            </button>
                            <button 
                                onClick={() => setSortBy('name')}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${sortBy === 'name' ? 'bg-white text-black' : 'text-[#8E8E93] hover:text-white'}`}
                            >
                                A-Z
                            </button>
                        </div>
                        
                        <button 
                            onClick={onClose}
                            className="bg-[#1C1C1E] hover:bg-[#2C2C2E] text-white rounded-full p-2.5 transition-all border border-white/10"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="h-full overflow-y-auto pt-24 sm:pt-28 pb-12 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    { type === 'artist' ? (
                        /* ARTIST GRID */
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
                            {sortedItems.map((item, index) => (
                                <div key={index} className="group flex flex-col items-center text-center">
                                    <div className="relative w-full aspect-square rounded-full overflow-hidden bg-[#1C1C1E] border border-white/5 group-hover:border-white/20 transition-all group-hover:scale-[1.02] mb-2">
                                        <img 
                                            src={item.cover || item.image || item.art || `https://ui-avatars.com/api/?name=${item.name}&background=1C1C1E&color=fff`} 
                                            alt={item.name} 
                                            className="w-full h-full object-cover"
                                        />
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center">
                                            <span className="text-lg font-bold text-white">{item.totalListens || item.listens || 0}</span>
                                            <span className="text-[10px] text-white/70">plays</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xs sm:text-sm font-semibold text-white truncate w-full px-1">{item.name}</h3>
                                    <p className="text-[10px] sm:text-xs text-[#8E8E93]">{item.timeStr || '0m'}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* ALBUM/SONG GRID */
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                            {sortedItems.map((item, index) => (
                                <div key={index} className="group cursor-pointer">
                                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#1C1C1E] border border-white/5 group-hover:border-white/20 transition-all group-hover:scale-[1.02] mb-2">
                                        <img 
                                            src={item.cover || item.image || item.art} 
                                            alt={item.title || item.name} 
                                            className="w-full h-full object-cover" 
                                        />
                                        {/* Gradient */}
                                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center">
                                            <span className="text-xl font-bold text-white">{item.listens || item.totalListens || 0}</span>
                                            <span className="text-xs text-white/70">plays</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xs sm:text-sm font-semibold text-white truncate">{item.title || item.name}</h3>
                                    <p className="text-[10px] sm:text-xs text-[#8E8E93] truncate">{item.artist} • {item.timeStr || '0m'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
