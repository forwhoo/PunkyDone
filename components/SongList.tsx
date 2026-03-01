import React from 'react';
import { Song } from '../types';
import { Card, CardHeader, CardTitle, CardContent } from './UIComponents';

export const SongList = ({ songs }: { songs: Song[] }) => {
  return (
    <Card className="bg-white border-none shadow-none h-[380px] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-4 pl-0 pr-2 pt-0">
             <CardTitle className="text-[#141413] text-xl font-bold px-5">Top Songs</CardTitle>
             <button className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors mr-3">See All</button>
        </CardHeader>
        <CardContent className="flex flex-col gap-0 px-0 overflow-y-auto no-scrollbar h-full pb-4">
            {songs.map((song, index) => (
                <div key={song.id} className="flex items-center px-5 py-3 hover:bg-[#2C2C2E] transition-colors duration-200 cursor-default group border-b border-[#2C2C2E]/50 last:border-0">
                    <div className="w-6 text-left text-[#b0aea5] text-sm font-semibold group-hover:text-[#141413] transition-colors">
                        {index + 1}
                    </div>

                    <img src={song.cover} alt={song.title} className="w-11 h-11 rounded-[4px] object-cover ml-3 mr-4 bg-[#2C2C2E]" />
                    
                    <div className="flex-1 min-w-0 pr-4">
                        <h4 className="text-[14px] font-medium text-[#141413] truncate">{song.title}</h4>
                        <p className="text-[13px] text-[#b0aea5] truncate mt-0.5">{song.artist}</p>
                    </div>

                    <div className="text-right">
                        <span className="text-[13px] font-medium text-[#b0aea5] group-hover:text-[#141413] transition-colors block">
                            {(song.listens / 1000000).toFixed(1)}M <span className="text-[11px] uppercase ml-0.5">Plays</span>
                        </span>
                    </div>
                </div>
            ))}
        </CardContent>
    </Card>
  );
};