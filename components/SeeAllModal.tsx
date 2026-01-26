import React from 'react';
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
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with Blur */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative bg-[#1C1C1E] w-full max-w-4xl h-[80vh] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-white/10 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5 bg-[#1C1C1E]/50 backdrop-blur-xl absolute top-0 left-0 right-0 z-10 transition-all">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
                        <span className="text-[#8E8E93] text-sm">Top 50 Ranking</span>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-[#2C2C2E] flex items-center justify-center text-white hover:bg-[#3A3A3C] transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable List */}
                <div className="flex-1 overflow-y-auto pt-24 pb-6 px-6 scrollbar-thin scrollbar-thumb-[#FA2D48] scrollbar-track-transparent">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.slice(0, 50).map((item, index) => (
                            <div 
                                key={item.id || index}
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                            >
                                <span className="text-2xl font-black text-[#8E8E93]/30 w-10 text-center font-mono italic">
                                    {index + 1}
                                </span>
                                
                                <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-[#2C2C2E]">
                                    <img src={item.cover || item.image || item.art} alt={item.name || item.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Play size={16} className="text-white fill-current" />
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-semibold text-white truncate">{item.name || item.title}</h3>
                                    <p className="text-sm text-[#8E8E93] truncate">
                                        {type === 'artist' ? 'Artist' : item.artist}
                                        {item.timeStr && <span className="text-[#FA2D48] ml-2 font-medium">• {item.timeStr}</span>}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
