import React from 'react';
import { Share2, Music, TrendingUp, Clock, Calendar, X, Mic2, Disc } from 'lucide-react';

interface WrappedCardProps {
    data: any[];
    title: string;
    description: string;
    userName?: string;
    userImage?: string;
    onClose: () => void;
}

export const WrappedView: React.FC<WrappedCardProps> = ({ data, title, description, userName, userImage, onClose }) => {
    // Parse time from item safely
    const parseItemTime = (item: any): number => {
        if (item.totalMinutes) return item.totalMinutes;
        if (item.timeStr) {
            const parsed = parseInt(String(item.timeStr).replace(/[^0-9]/g, ''), 10);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };

    const totalMins = Math.round(data.reduce((acc, curr) => acc + parseItemTime(curr), 0));
    const topItem = data[0];
    const totalTracks = data.length;
    const uniqueArtists = new Set(data.map(d => d.artist)).size;
    
    // Determine Type of Wrapped based on data content
    const isArtistWrapped = data[0]?.type === 'artist' || data[0]?.artist === data[0]?.title || data[0]?.artist === data[0]?.name;

    // Get image from item safely
    const getItemImage = (item: any) => item?.cover || item?.image || item?.album_cover || '';
    
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
                    className="absolute top-8 right-6 z-30 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white/60 hover:text-white transition-all"
                >
                    <X size={16} />
                </button>

                {/* Content Container */}
                <div className="flex-1 flex flex-col relative p-6 sm:p-8 overflow-y-auto no-scrollbar">
                    
                    {/* Header with Profile */}
                    <div className="mt-10 mb-6">
                        <div className="flex items-center gap-3 mb-4 animate-in slide-in-from-left duration-700">
                            {userImage && (
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 flex-shrink-0">
                                    <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                                </div>
                            )}
                            <span className="text-white/60 font-bold tracking-widest text-[10px] uppercase">
                                {userName ? `${userName}'s Wrapped` : 'Your Wrapped'}
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-3 animate-in slide-in-from-bottom duration-700 delay-100">
                            {title}
                        </h1>
                        <p className="text-white/50 text-base font-medium leading-relaxed animate-in slide-in-from-bottom duration-700 delay-200">
                            {description}
                        </p>
                    </div>

                    {/* Main Visual */}
                    <div className="flex flex-col items-center justify-center mb-6 relative">
                         {/* Background Glow */}
                         <div className="absolute inset-0 bg-gradient-to-t from-white/5 to-transparent blur-3xl opacity-20"></div>
                         
                         {topItem && (
                            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mb-10 group animate-in zoom-in duration-1000 delay-300">
                                <div className={`absolute inset-0 bg-white ${isArtistWrapped ? 'rounded-full' : 'rounded-2xl'} blur-2xl opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                                <img 
                                    src={getItemImage(topItem)} 
                                    className={`w-full h-full object-cover shadow-2xl border-2 border-white/10 ${isArtistWrapped ? 'rounded-full' : 'rounded-2xl'}`}
                                    alt={topItem.title || topItem.name || 'Top Item'}
                                />
                                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white text-black font-black px-5 py-1.5 rounded-full text-sm shadow-xl whitespace-nowrap">
                                    #1 {isArtistWrapped ? (topItem.title || topItem.name) : 'Track'}
                                </div>
                            </div>
                         )}
                         
                         {/* Stats Grid */}
                         <div className="grid grid-cols-3 gap-3 w-full animate-in slide-in-from-bottom duration-700 delay-500">
                            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-sm text-center">
                                <Clock className="w-4 h-4 text-[#FA2D48] mx-auto mb-1.5" />
                                <span className="text-xl font-black text-white block">{totalMins}</span>
                                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Minutes</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-sm text-center">
                                <Disc className="w-4 h-4 text-[#FA2D48] mx-auto mb-1.5" />
                                <span className="text-xl font-black text-white block">{totalTracks}</span>
                                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Tracks</span>
                            </div>
                            <div className="bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-sm text-center">
                                <Mic2 className="w-4 h-4 text-[#FA2D48] mx-auto mb-1.5" />
                                <span className="text-xl font-black text-white block">{uniqueArtists}</span>
                                <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold">Artists</span>
                            </div>
                         </div>
                    </div>

                    {/* List */}
                    <div className="space-y-2 pb-4 animate-in slide-in-from-bottom duration-700 delay-700">
                        {data.slice(0, 5).map((item, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/5">
                                <span className="font-black text-white/20 text-sm w-5 text-center flex-shrink-0">{idx + 1}</span>
                                <div className={`w-10 h-10 ${isArtistWrapped ? 'rounded-full' : 'rounded-lg'} overflow-hidden bg-[#2C2C2E] flex-shrink-0`}>
                                    <img src={getItemImage(item)} className="w-full h-full object-cover" alt={item.title || item.name} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-semibold text-[13px] truncate">{item.title || item.name}</h3>
                                    <p className="text-white/40 text-[11px] truncate">{item.artist}</p>
                                </div>
                                <span className="text-white/50 text-[11px] font-medium flex-shrink-0">{item.timeStr || `${item.listens || item.totalListens || 0}p`}</span>
                            </div>
                        ))}
                    </div>

                </div>

                {/* Footer */}
                <div className="p-5 bg-[#111] border-t border-white/5 flex gap-3 animate-in fade-in duration-1000 delay-1000 flex-shrink-0">
                    <button className="flex-1 py-3.5 rounded-2xl bg-white text-black font-bold text-xs tracking-widest uppercase hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <Share2 className="w-3.5 h-3.5" />
                        Share
                    </button>
                    <button onClick={onClose} className="px-5 py-3.5 rounded-2xl bg-white/10 text-white font-bold text-xs tracking-widest uppercase hover:bg-white/20 transition-all">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
