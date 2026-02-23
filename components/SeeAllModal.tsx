import React, { useEffect, useState, useMemo } from 'react';
import { X, Clock, TrendingUp, Mic2, Disc, Music, Search, LayoutGrid, List as ListIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const getItemImage = (item: any) => item.cover || item.image || item.art || item.album_cover || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || item.title || '')}&background=1C1C1E&color=fff`;

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
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchQuery, setSearchQuery] = useState('');

    // Reset states when modal opens
    useEffect(() => {
        if (isOpen) {
            setSortBy('plays');
            setSearchQuery('');
            // Default to list view for songs, grid for albums/artists could be nice but let's stick to user preference or default
            setViewMode('list');
        }
    }, [isOpen]);
    
    // Filter and Sort Items Logic
    const processedItems = useMemo(() => {
        let result = [...items];

        // Filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(item => {
                const name = (item.name || item.title || '').toLowerCase();
                const artist = (item.artist || '').toLowerCase();
                return name.includes(query) || artist.includes(query);
            });
        }

        // Sort
        result.sort((a, b) => {
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

        return result;
    }, [items, sortBy, searchQuery]);

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

    // Summary stats (based on filtered items or total? usually filtered is more helpful in this context)
    const totalPlays = processedItems.reduce((sum, item) => sum + (item.totalListens || item.listens || 0), 0);
    const totalTime = processedItems.reduce((sum, item) => sum + (parseInt(String(item.timeStr || '0').replace(/[^0-9]/g, ''), 10) || 0), 0);

    const maxPlays = processedItems.length > 0 ? (processedItems[0].totalListens || processedItems[0].listens || 1) : 1;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center w-full h-full">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal Content - Full Screen */}
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 50, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative bg-[#09090b] w-full h-full md:h-[90vh] md:w-[90vw] md:max-w-6xl md:rounded-3xl overflow-hidden flex flex-col border border-white/[0.08] shadow-2xl"
                    >

                        {/* Header */}
                        <div className="flex-shrink-0 px-6 py-6 bg-gradient-to-b from-white/[0.08] to-transparent border-b border-white/[0.06] backdrop-blur-xl sticky top-0 z-20">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">

                                {/* Title & Search */}
                                <div className="flex-1 flex flex-col md:flex-row md:items-center gap-6">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                                            {title}
                                            <span className="text-sm font-normal text-white/40 bg-white/10 px-2 py-0.5 rounded-full">
                                                {processedItems.length}
                                            </span>
                                        </h2>
                                        {/* Mobile Close Button (visible only on mobile) */}
                                        <button
                                            onClick={onClose}
                                            className="md:hidden bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {/* Search Bar */}
                                    <div className="relative group w-full md:max-w-md">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={18} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={`Search ${type}s...`}
                                            className="w-full bg-white/[0.05] border border-white/[0.05] focus:border-white/20 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:bg-white/[0.08] transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-3 self-end md:self-auto">

                                    {/* Sort Toggle */}
                                    <div className="bg-[#18181b] p-1 rounded-lg flex border border-white/[0.06]">
                                        <button
                                            onClick={() => setSortBy('plays')}
                                            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${sortBy === 'plays' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'}`}
                                        >
                                            <TrendingUp size={12} /> Plays
                                        </button>
                                        <button
                                            onClick={() => setSortBy('time')}
                                            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${sortBy === 'time' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'}`}
                                        >
                                            <Clock size={12} /> Time
                                        </button>
                                        <button
                                            onClick={() => setSortBy('name')}
                                            className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${sortBy === 'name' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'}`}
                                        >
                                            A-Z
                                        </button>
                                    </div>

                                    {/* View Toggle */}
                                    <div className="bg-[#18181b] p-1 rounded-lg flex border border-white/[0.06]">
                                        <button
                                            onClick={() => setViewMode('list')}
                                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'}`}
                                        >
                                            <ListIcon size={14} />
                                        </button>
                                        <button
                                            onClick={() => setViewMode('grid')}
                                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white text-black shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/[0.05]'}`}
                                        >
                                            <LayoutGrid size={14} />
                                        </button>
                                    </div>

                                    {/* Desktop Close Button */}
                                    <button
                                        onClick={onClose}
                                        className="hidden md:flex bg-white/10 hover:bg-white/20 text-white rounded-full p-2.5 transition-all hover:scale-105 active:scale-95 ml-2"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Summary Bar */}
                            <div className="flex items-center gap-6 mt-6 text-xs font-medium text-white/40">
                                <span className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                                    {processedItems.length} visible
                                </span>
                                <span className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                                    {totalPlays.toLocaleString()} total plays
                                </span>
                                <span className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/40"></div>
                                    {totalTime.toLocaleString()}m listened
                                </span>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#09090b]">
                            {processedItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-white/30">
                                    <Search size={48} className="mb-4 opacity-20" />
                                    <p>No results found for "{searchQuery}"</p>
                                </div>
                            ) : (
                                <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" : "space-y-1"}>
                                    {processedItems.map((item, index) => {
                                        const plays = item.totalListens || item.listens || 0;
                                        const barWidth = Math.max(0, (plays / maxPlays) * 100);

                                        return (
                                            <motion.div
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index < 20 ? index * 0.03 : 0 }}
                                                key={index} // Ideally use a unique ID if available
                                                className={`
                                                    group cursor-pointer relative overflow-hidden transition-all
                                                    ${viewMode === 'grid'
                                                        ? 'bg-white/[0.03] hover:bg-white/[0.08] p-4 rounded-2xl flex flex-col items-center text-center gap-3 border border-white/[0.05] hover:border-white/20 hover:-translate-y-1 hover:shadow-xl'
                                                        : 'flex items-center gap-4 p-3 rounded-xl hover:bg-white/[0.06] active:scale-[0.99] border border-transparent hover:border-white/[0.05]'
                                                    }
                                                `}
                                                onClick={() => onItemClick?.(item)}
                                            >
                                                {/* List View: Background Bar */}
                                                {viewMode === 'list' && (
                                                    <div
                                                        className="absolute inset-y-0 left-0 bg-white/[0.02] rounded-xl transition-all duration-500"
                                                        style={{ width: `${barWidth}%` }}
                                                    />
                                                )}

                                                {/* Rank Badge */}
                                                <div className={`
                                                    ${viewMode === 'grid'
                                                        ? 'absolute top-3 left-3 bg-black/50 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold text-white border border-white/10'
                                                        : 'relative z-10 w-8 text-center text-sm font-bold flex-shrink-0 text-white/50 group-hover:text-white'
                                                    }
                                                `}>
                                                    #{index + 1}
                                                </div>

                                                {/* Image */}
                                                <div className={`
                                                    relative z-10 overflow-hidden bg-[#1C1C1E] flex-shrink-0 border border-white/[0.08] group-hover:border-white/30 transition-all shadow-lg
                                                    ${viewMode === 'grid'
                                                        ? 'w-32 h-32 rounded-full shadow-2xl mb-2'
                                                        : `w-14 h-14 ${type === 'artist' ? 'rounded-full' : 'rounded-lg'}`
                                                    }
                                                `}>
                                                    <img
                                                        src={getItemImage(item)}
                                                        alt={item.name || item.title}
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        loading="lazy"
                                                    />
                                                    {/* Play Overlay */}
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                                                        <Mic2 className="text-white drop-shadow-md" size={viewMode === 'grid' ? 24 : 18} />
                                                    </div>
                                                </div>

                                                {/* Info */}
                                                <div className={`relative z-10 min-w-0 ${viewMode === 'grid' ? 'w-full' : 'flex-1'}`}>
                                                    <h3 className={`font-semibold text-white truncate group-hover:text-white/90 transition-colors ${viewMode === 'grid' ? 'text-base mb-1' : 'text-sm'}`}>
                                                        {item.name || item.title}
                                                    </h3>
                                                    <p className={`text-xs text-white/50 truncate ${viewMode === 'grid' ? 'mx-auto max-w-[90%]' : ''}`}>
                                                        {type === 'artist'
                                                            ? `${item.timeStr || '0m'} listened`
                                                            : `${item.artist || ''} ${item.artist ? '•' : ''} ${item.timeStr || '0m'}`
                                                        }
                                                    </p>
                                                </div>

                                                {/* Stats */}
                                                <div className={`relative z-10 flex-shrink-0 ${viewMode === 'grid' ? 'bg-white/[0.05] rounded-full px-3 py-1 mt-1' : 'text-right'}`}>
                                                    <span className={`font-bold text-white block ${viewMode === 'grid' ? 'text-xs' : 'text-sm'}`}>
                                                        {plays.toLocaleString()}
                                                        <span className="text-[9px] uppercase tracking-wider text-white/40 ml-1 font-medium">plays</span>
                                                    </span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
