import React from 'react';
import { ArrowUpRight, Music, Disc } from 'lucide-react';
import { Artist } from '../types';

interface UpcomingArtistsProps {
    recentPlays: any[];
    topArtists: Artist[];
    artistImages: Record<string, string>;
}

export const UpcomingArtists: React.FC<UpcomingArtistsProps> = ({ recentPlays, topArtists, artistImages }) => {
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
        <div className="bg-[#1C1C1E] rounded-3xl p-6 border border-white/5">
             <div className="mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <ArrowUpRight className="text-blue-400" /> Upcoming Artists
                </h3>
                <p className="text-[#8E8E93] text-xs">New artists entering your orbit recently</p>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 {upcoming.map((artist, idx) => (
                     <div key={idx} className="group relative bg-[#2C2C2E] p-3 rounded-2xl hover:bg-[#3C3C3E] transition-all cursor-default">
                         <div className="aspect-square rounded-full overflow-hidden mb-3 border border-white/5 group-hover:border-white/20 shadow-lg">
                             <img 
                                src={artist.image} 
                                alt={artist.name} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                             />
                         </div>
                         <div className="text-center">
                             <div className="text-white font-bold text-sm truncate">{artist.name}</div>
                             <div className="text-[#8E8E93] text-[10px] mt-1 flex items-center justify-center gap-1">
                                <Disc size={8} /> {artist.trackSample}
                             </div>
                         </div>
                     </div>
                 ))}
             </div>
        </div>
    );
};
