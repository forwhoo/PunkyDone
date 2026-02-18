import React, { useEffect, useState, useMemo } from 'react';
import { X, Play, Clock, TrendingUp, Mic2, Disc, Music } from 'lucide-react';

const getItemImage = (item: any) => item.cover || item.image || item.art || item.album_cover || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || item.title || '')}&background=1C1C1E&color=fff`;

const getTypeIcon = (type: string) => {
    if (type === 'artist') return <Mic2 size={14} className="text-white" />;
    if (type === 'album') return <Disc size={14} className="text-white" />;
    return <Music size={14} className="text-white" />;
};

interface SeeAllModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    items: any[];
    type: 'artist' | 'album' | 'song';
    onItemClick?: (item: any) => void;
}

export const SeeAllModal: React.FC<SeeAllModalProps> = ({ isOpen, onClose, title, items, type, onItemClick }) => {
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

    // Summary stats
    const totalPlays = items.reduce((sum, item) => sum + (item.totalListens || item.listens || 0), 0);
    const totalTime = items.reduce((sum, item) => sum + (parseInt(String(item.timeStr || '0').replace(/[^0-9]/g, ''), 10) || 0), 0);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center w-full h-full">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/90 backdrop-blur-2xl transition-all duration-500"
                onClick={onClose}
            />

            {/* Modal Content - Full Screen */}
            <div className="relative bg-[#0A0A0A] w-full h-full overflow-hidden flex flex-col border-none">
                
                {/* Header */}
                <div className="flex-shrink-0 px-5 md:px-8 pt-6 md:pt-8 pb-4 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-white/[0.06] sticky top-0 z-10">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">{title}</h2>
                        </div>
                        <button 
                            onClick={onClose}
                            className="bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-all hover:scale-105 active:scale-95"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Summary + Sorting */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-4 text-[#8E8E93]">
                            <span className="text-xs font-medium">{items.length} {type === 'artist' ? 'artists' : type === 'album' ? 'albums' : 'songs'}</span>
                            <span className="w-1 h-1 rounded-full bg-white/10"></span>
                            <span className="text-xs font-medium">{totalPlays.toLocaleString()} plays</span>
                            <span className="w-1 h-1 rounded-full bg-white/10"></span>
                            <span className="text-xs font-medium">{totalTime.toLocaleString()}m</span>
                        </div>

                        <div className="bg-[#1C1C1E] p-1 rounded-full flex border border-white/[0.06]">
                            <button 
                                onClick={() => setSortBy('plays')}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 ${sortBy === 'plays' ? 'bg-white text-black shadow-lg' : 'text-[#8E8E93] hover:text-white'}`}
                            >
                                <TrendingUp size={10} /> Plays
                            </button>
                            <button 
                                onClick={() => setSortBy('time')}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 ${sortBy === 'time' ? 'bg-white text-black shadow-lg' : 'text-[#8E8E93] hover:text-white'}`}
                            >
                                <Clock size={10} /> Time
                            </button>
                            <button 
                                onClick={() => setSortBy('name')}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5 ${sortBy === 'name' ? 'bg-white text-black shadow-lg' : 'text-[#8E8E93] hover:text-white'}`}
                            >
                                A-Z
                            </button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-5 md:px-8 py-6 no-scrollbar">
                    <div className="space-y-1">
                        {sortedItems.map((item, index) => {
                            const plays = item.totalListens || item.listens || 0;
                            const maxPlays = sortedItems[0] ? (sortedItems[0].totalListens || sortedItems[0].listens || 1) : 1;
                            const barWidth = Math.max(5, (plays / maxPlays) * 100);

                            return (
                                <div 
                                    key={index} 
                                    className="flex items-center gap-3 p-2.5 md:p-3 rounded-xl hover:bg-white/[0.04] transition-all group cursor-pointer active:scale-[0.99] relative overflow-hidden"
                                    onClick={() => onItemClick?.(item)}
                                >
                                    {/* Background bar indicator */}
                                    <div 
                                        className="absolute inset-y-0 left-0 bg-white/[0.02] rounded-xl transition-all duration-500"
                                        style={{ width: `${barWidth}%` }}
                                    />

                                    {/* Rank */}
                                    <span className={`relative z-10 w-7 text-center text-sm font-black flex-shrink-0 ${index < 3 ? 'text-white' : 'text-white/30'}`}>
                                        {index + 1}
                                    </span>

                                    {/* Image */}
                                    <div className={`relative z-10 w-12 h-12 ${type === 'artist' ? 'rounded-full' : 'rounded-lg'} overflow-hidden bg-[#1C1C1E] flex-shrink-0 border border-white/[0.08] group-hover:border-white/[0.15] transition-all`}>
                                        <img 
                                            src={getItemImage(item)} 
                                            alt={item.name || item.title} 
                                            className="w-full h-full object-cover" 
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="relative z-10 flex-1 min-w-0">
                                        <h3 className="text-[13px] md:text-sm font-semibold text-white truncate group-hover:text-white/90 transition-colors">
                                            {item.name || item.title}
                                        </h3>
                                        <p className="text-[11px] text-[#8E8E93] truncate">
                                            {type === 'artist' 
                                                ? `${item.timeStr || '0m'} listened`
                                                : `${item.artist || ''} ${item.artist ? '•' : ''} ${item.timeStr || '0m'}`
                                            }
                                        </p>
                                    </div>

                                    {/* Stats */}
                                    <div className="relative z-10 text-right flex-shrink-0">
                                        <span className="text-sm font-bold text-white block">{plays.toLocaleString()}</span>
                                        <span className="text-[9px] uppercase tracking-wider text-[#8E8E93]">plays</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
