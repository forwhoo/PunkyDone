import React from 'react';
import { X, Play, Clock } from 'lucide-react';

interface SeeAllModalProps {
    title: string;
    type: 'Artists' | 'Songs' | 'Albums' | 'History';
    data: any[];
    onClose: () => void;
}

export const SeeAllModal: React.FC<SeeAllModalProps> = ({ title, type, data, onClose }) => {
    
    // Prevent scrolling on body when modal is open
    React.useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4 md:p-8">
            <div className="bg-[#1C1C1E] w-full max-w-6xl h-full md:h-[90vh] rounded-2xl border border-white/10 shadow-2xl flex flex-col relative overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#1C1C1E] z-10">
                    <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 bg-[#2C2C2E] hover:bg-[#3C3C3E] rounded-full text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                    
                    {/* Artists Grid */}
                    {type === 'Artists' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {data.map((artist, idx) => (
                                <div key={idx} className="flex flex-col items-center group cursor-pointer">
                                    <div className="w-32 h-32 rounded-full overflow-hidden bg-[#2C2C2E] border border-white/5 group-hover:scale-105 transition-transform duration-300 shadow-xl mb-3 relative">
                                        <img 
                                            src={artist.image || `https://ui-avatars.com/api/?name=${artist.name}&background=1DB954&color=fff`} 
                                            alt={artist.name} 
                                            className="w-full h-full object-cover group-hover:blur-[2px] transition-all" 
                                        />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                            <span className="text-white font-bold text-lg">{artist.totalListens}</span>
                                            <span className="text-white/80 text-[10px] uppercase font-bold tracking-widest">Plays</span>
                                        </div>
                                    </div>
                                    <h3 className="text-[15px] font-medium text-white text-center truncate w-full px-2 group-hover:text-[#FA2D48] transition-colors">{artist.name}</h3>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Albums Grid */}
                    {type === 'Albums' && (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                            {data.map((album, idx) => (
                                <div key={idx} className="group cursor-pointer">
                                    <div className="aspect-square rounded-xl overflow-hidden bg-[#2C2C2E] border border-white/5 shadow-xl mb-3 relative group-hover:-translate-y-1 transition-transform">
                                        <img src={album.cover} alt={album.title} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                                    </div>
                                    <h3 className="text-[15px] font-semibold text-white truncate group-hover:text-[#FA2D48] transition-colors">{album.title}</h3>
                                    <p className="text-[13px] text-[#8E8E93] truncate">{album.artist}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Songs List */}
                    {type === 'Songs' && (
                        <div className="space-y-2">
                             {data.map((song, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/5">
                                    <div className="text-[#8E8E93] font-medium w-8 text-center">{idx + 1}</div>
                                    <div className="w-12 h-12 rounded overflow-hidden bg-[#2C2C2E] flex-shrink-0">
                                        <img src={song.cover} alt={song.title} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[15px] font-medium text-white truncate group-hover:text-[#FA2D48] transition-colors">{song.title}</h3>
                                        <p className="text-[13px] text-[#8E8E93] truncate">{song.artist}</p>
                                    </div>
                                    <div className="hidden md:flex items-center gap-6 pr-4">
                                        <div className="text-sm text-[#8E8E93] w-20 text-right">{song.listens} plays</div>
                                        <div className="text-sm text-[#8E8E93] w-16 text-right font-mono">{song.duration}</div>
                                    </div>
                                </div>
                             ))}
                        </div>
                    )}

                    {/* History List */}
                    {type === 'History' && (
                        <div className="space-y-2">
                             {data.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/5">
                                    <div className="w-12 h-12 rounded overflow-hidden bg-[#2C2C2E] flex-shrink-0 relative">
                                        <img src={item.cover} alt={item.track_name} className="w-full h-full object-cover" />
                                         <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Play className="w-5 h-5 text-white fill-current" />
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[15px] font-medium text-white truncate group-hover:text-[#FA2D48] transition-colors">{item.track_name}</h3>
                                        <p className="text-[13px] text-[#8E8E93] truncate">{item.artist_name} • {item.album_name}</p>
                                    </div>
                                    <div className="hidden md:flex flex-col items-end pr-4">
                                        <div className="flex items-center gap-1.5 text-[#8E8E93] text-xs">
                                            <Clock className="w-3 h-3" />
                                            <span>{new Date(item.played_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                        <div className="text-[10px] text-[#555] mt-0.5">
                                            {new Date(item.played_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                             ))}
                             {data.length === 0 && (
                                 <div className="text-center py-20 text-[#8E8E93]">No history available</div>
                             )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
