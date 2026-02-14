import { ArrowUpRight, Disc, Info } from 'lucide-react';
import { Artist } from '../types';
import React, { useState } from 'react';

interface UpcomingArtistsProps {
    recentPlays: any[];
    topArtists: Artist[];
    artistImages: Record<string, string>;
}

export const UpcomingArtists: React.FC<UpcomingArtistsProps> = ({ recentPlays, topArtists, artistImages }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    
    // Logic: distinct artists in recentPlays who are NOT in topArtists (Top 20)
    // This simulates "New Discoveries"
    
    const topArtistNames = new Set(topArtists.slice(0, 30).map(a => a.name));
    
    const candidates: Record<string, any> = {};

    recentPlays.forEach(play => {
        if (!topArtistNames.has(play.artist_name)) {
            if (!candidates[play.artist_name]) {
                candidates[play.artist_name] = {
                    name: play.artist_name,
                    image: artistImages[play.artist_name] || play.album_cover || play.cover, // Prefer artist image
                    firstPlay: play.played_at,
                    plays: 0,
                    trackSample: play.track_name
                };
            }
            candidates[play.artist_name].plays += 1;
        }
    });

    // Filter for "Meaningful" discoveries (at least 2 plays)
    const upcoming = Object.values(candidates)
        .filter(c => c.plays >= 2)
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 8); // Top 8 new artists

    if (upcoming.length === 0) return null;

    return (
        <div>
             <div className="flex justify-between items-center mb-6 px-1">
                <div className="flex items-center gap-3">
                    <h3 className="text-[20px] font-bold text-white tracking-tight flex items-center gap-2">
                        <ArrowUpRight className="text-blue-400" /> Upcoming Artists
                        <button
                            onClick={() => setShowTooltip(!showTooltip)}
                            className="relative p-1 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <Info size={16} className="text-[#8E8E93]" />
                            {showTooltip && (
                                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 bg-[#1C1C1E] border border-white/10 rounded-xl p-3 w-64 shadow-2xl">
                                    <p className="text-xs text-white/70 leading-relaxed text-left font-normal">
                                        Artists entering your radar that you&apos;ve never listened to before. Our algorithm detects new artists appearing in your recent listening that aren&apos;t in your top charts.
                                    </p>
                                </div>
                            )}
                        </button>
                    </h3>
                </div>
                <p className="text-[#8E8E93] text-xs">New artists entering your orbit</p>
             </div>

            <div className="flex items-start overflow-x-auto pb-8 pt-2 no-scrollbar snap-x pl-6 scroll-smooth gap-0">
                {upcoming.map((artist, idx) => (
                    <div key={artist.name} className="flex-shrink-0 relative flex items-center snap-start group cursor-default w-[180px] md:w-[220px]">
                        <span className="text-[140px] leading-none font-black text-outline absolute -left-6 -bottom-6 z-0 select-none pointer-events-none scale-y-90 italic opacity-40 text-white/5">
                            {idx + 1}
                        </span>
                        <div className="relative z-10 ml-10 md:ml-12">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-[#2C2C2E] shadow-2xl border border-white/5 group-hover:border-white/20 transition-all duration-300 group-hover:-translate-y-2 relative">
                                <img 
                                    src={artist.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=1DB954&color=fff`}
                                    alt={artist.name} 
                                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm" 
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 bg-black/40">
                                    <span className="text-white font-bold text-xl drop-shadow-md">{artist.plays} plays</span>
                                </div>
                            </div>
                            <div className="mt-3 relative z-20">
                                <h3 className="text-[15px] font-semibold text-white truncate w-32 md:w-40 leading-tight group-hover:text-white transition-colors">
                                    {artist.name}
                                </h3>
                                <p className="text-[13px] text-[#8E8E93] truncate w-32 md:w-40 mt-0.5 font-medium flex items-center gap-1">
                                    <Disc size={12} /> {artist.trackSample}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
