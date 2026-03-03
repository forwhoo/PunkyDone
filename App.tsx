import React from 'react';
import { RankedArtistProps } from './types';

const RankedArtist: React.FC<RankedArtistProps> = ({ artist }) => {
    return (
        <div className="flex items-center space-x-4">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-background transition-all duration-300 group-hover:-translate-y-2 relative">
                <img src={artist.imageUrl} alt={artist.name} className="object-cover w-full h-full" />
            </div>
            <div>
                <h2 className="text-lg font-semibold">{artist.name}</h2>
                <p className="text-sm text-gray-500">{artist.rank}</p>
            </div>
        </div>
    );
};

export default RankedArtist;