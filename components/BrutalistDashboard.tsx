import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Artist, Album, Song } from '../types';
import BrutalistToggle from './BrutalistToggle';

// Brutalist Color Palette
const BC = {
  electricBlue: '#1A6BFF',
  coral: '#FF4D2E',
  magenta: '#FF0080',
  acidYellow: '#CCFF00',
  nearBlack: '#0D0D0D',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#222222'
};

const fallbackImage = 'https://ui-avatars.com/api/?background=0D0D0D&color=fff&size=128&bold=true';

const BrutTicker: React.FC<{ text: string; bg?: string; color?: string }> = ({ text, bg = BC.acidYellow, color = BC.black }) => {
  return (
    <div className="w-full h-9 overflow-hidden flex items-center border-y-2 border-black flex-shrink-0 relative" style={{ backgroundColor: bg }}>
        <motion.div
            className="whitespace-nowrap flex items-center gap-8"
            animate={{ x: [0, -1000] }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        >
             {Array(20).fill(text).map((t, i) => (
                 <span key={i} className="text-xs font-black uppercase tracking-[0.15em]" style={{ color }}>{t} ✶</span>
             ))}
        </motion.div>
    </div>
  );
};

interface BrutalistDashboardProps {
  onToggleOff: () => void;
  artists: Artist[];
  songs: Song[];
  albums: Album[];
  totalMinutes: number;
  userName?: string;
  userImage?: string;
  artistImages?: Record<string, string>;
  timeRange: string;
  onTimeRangeChange: (range: 'Daily' | 'Weekly' | 'Monthly' | 'All Time') => void;
  onArtistClick?: (artist: Artist) => void;
  onSongClick?: (song: Song) => void;
  onAlbumClick?: (album: Album) => void;
}

const BrutalistDashboard: React.FC<BrutalistDashboardProps> = ({
  onToggleOff,
  artists,
  songs,
  albums,
  totalMinutes,
  userName,
  userImage,
  artistImages = {},
  timeRange,
  onTimeRangeChange,
  onArtistClick,
  onSongClick,
  onAlbumClick,
}) => {
  const [activeTab, setActiveTab] = useState<'artists' | 'songs' | 'albums'>('artists');

  const hours = Math.round(totalMinutes / 60);
  const topArtist = artists[0];
  const topSong = songs[0];
  const topAlbum = albums[0];

  return (
    <div className="fixed inset-0 z-[200] bg-[#0D0D0D] overflow-y-auto font-sans flex flex-col text-black">
      {/* Scanline Effect */}
      <div className="fixed inset-0 pointer-events-none z-[1] opacity-5 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#ffffff_2px,#ffffff_4px)]"></div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#CCFF00] border-b-4 border-black p-4 flex justify-between items-center shadow-lg">
         <div className="flex items-center gap-4">
             {userImage && (
                 <div className="w-12 h-12 rounded-full border-[3px] border-black overflow-hidden bg-black shrink-0">
                     <img src={userImage} alt="User" className="w-full h-full object-cover" />
                 </div>
             )}
             <div>
                 <div className="text-[10px] font-black uppercase tracking-[0.3em] bg-black text-[#CCFF00] px-2 py-0.5 w-fit mb-1">Brutalist Mode</div>
                 <h1 className="text-2xl md:text-4xl font-black uppercase leading-none tracking-tight">
                     {userName ? `${userName}'S STATS` : 'YOUR STATS'}
                 </h1>
             </div>
         </div>
         <div className="scale-90 origin-right">
            <BrutalistToggle isOn={true} onToggle={onToggleOff} label="MODE" />
         </div>
      </header>

      <BrutTicker text="RAW DATA // NO FILTER // PURE ANALYTICS" />

      {/* Main Grid */}
      <main className="flex-1 relative z-10 p-4 md:p-8 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COL: Stats & Top Pick */}
          <div className="lg:col-span-5 flex flex-col gap-6">

              {/* Stat Blocks */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#1A6BFF] border-[4px] border-black p-4 shadow-[6px_6px_0px_0px_#000]">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-1">Minutes</h3>
                      <p className="text-3xl md:text-5xl font-black text-white leading-none">{totalMinutes.toLocaleString()}</p>
                  </div>
                  <div className="bg-[#FF4D2E] border-[4px] border-black p-4 shadow-[6px_6px_0px_0px_#000]">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-1">Hours</h3>
                      <p className="text-3xl md:text-5xl font-black text-white leading-none">{hours.toLocaleString()}</p>
                  </div>
              </div>

              {/* Time Range Selector */}
              <div className="flex flex-wrap gap-2">
                  {(['Daily', 'Weekly', 'Monthly', 'All Time'] as const).map((range) => (
                      <button
                          key={range}
                          onClick={() => onTimeRangeChange(range)}
                          className={`flex-1 px-4 py-3 font-black text-sm uppercase tracking-wider border-[3px] border-black transition-all ${
                              timeRange === range
                              ? 'bg-[#CCFF00] text-black shadow-[4px_4px_0px_0px_#000] -translate-y-1'
                              : 'bg-transparent text-white border-white/30 hover:bg-white hover:text-black hover:border-black'
                          }`}
                      >
                          {range}
                      </button>
                  ))}
              </div>

              {/* Top Artist Card - BIG */}
              {topArtist && (
                  <div
                    className="relative border-[6px] border-black bg-white shadow-[10px_10px_0px_0px_#000] group overflow-hidden cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-[6px_6px_0px_0px_#000] transition-all"
                    onClick={() => onArtistClick && onArtistClick(topArtist)}
                  >
                      <div className="absolute top-0 left-0 bg-black text-white px-3 py-1 text-xs font-black uppercase tracking-widest z-20">
                          #1 Obsession
                      </div>
                      <div className="aspect-square w-full relative overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                          <img
                              src={artistImages[topArtist.name] || topArtist.image || fallbackImage}
                              alt={topArtist.name}
                              className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>

                          <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                              <h2 className="text-5xl md:text-7xl font-black text-white uppercase leading-[0.85] break-words mb-2 drop-shadow-[4px_4px_0px_#000]">
                                  {topArtist.name}
                              </h2>
                              <div className="flex items-center gap-3">
                                  <div className="bg-[#CCFF00] text-black px-3 py-1 font-bold text-sm uppercase border-2 border-black">
                                      {topArtist.totalListens.toLocaleString()} Plays
                                  </div>
                                  <div className="bg-[#FF0080] text-white px-3 py-1 font-bold text-sm uppercase border-2 border-black">
                                      {topArtist.timeStr}
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* Top Song & Album Mini-Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topSong && (
                      <div
                        className="bg-[#FF4D2E] border-[4px] border-black p-4 shadow-[6px_6px_0px_0px_#000] flex flex-col justify-between h-40 relative overflow-hidden group cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-[4px_4px_0px_0px_#000] transition-all"
                        onClick={() => onSongClick && onSongClick(topSong)}
                      >
                           <div className="absolute right-[-20px] top-[-20px] text-[100px] leading-none opacity-20 font-black rotate-12 pointer-events-none">#1</div>
                           <div className="relative z-10">
                               <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-2 text-black/60">Top Track</h3>
                               <p className="text-xl font-black text-white leading-tight uppercase line-clamp-2">{topSong.title}</p>
                               <p className="text-sm font-bold text-black uppercase mt-1">{topSong.artist}</p>
                           </div>
                           <div className="text-right font-black text-3xl text-white/90">{topSong.listens} <span className="text-sm align-top opacity-70">PLAYS</span></div>
                      </div>
                  )}
                  {topAlbum && (
                      <div
                        className="bg-[#FF0080] border-[4px] border-black p-4 shadow-[6px_6px_0px_0px_#000] flex flex-col justify-between h-40 relative overflow-hidden group cursor-pointer active:translate-x-[2px] active:translate-y-[2px] active:shadow-[4px_4px_0px_0px_#000] transition-all"
                        onClick={() => onAlbumClick && onAlbumClick(topAlbum)}
                      >
                           <div className="absolute right-[-20px] top-[-20px] text-[100px] leading-none opacity-20 font-black rotate-12 pointer-events-none">#1</div>
                           <div className="relative z-10">
                               <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-2 text-black/60">Top Album</h3>
                               <p className="text-xl font-black text-white leading-tight uppercase line-clamp-2">{topAlbum.title}</p>
                               <p className="text-sm font-bold text-black uppercase mt-1">{topAlbum.artist}</p>
                           </div>
                           <div className="text-right font-black text-3xl text-white/90">{topAlbum.totalListens} <span className="text-sm align-top opacity-70">PLAYS</span></div>
                      </div>
                  )}
              </div>
          </div>

          {/* RIGHT COL: Lists */}
          <div className="lg:col-span-7 flex flex-col h-full gap-4">

              {/* Tabs */}
              <div className="flex border-[4px] border-black bg-black p-1 gap-1">
                  {(['artists', 'songs', 'albums'] as const).map((tab) => (
                      <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`flex-1 py-3 text-sm md:text-base font-black uppercase tracking-widest transition-all ${
                              activeTab === tab
                              ? 'text-white'
                              : 'bg-[#222] text-[#666] hover:bg-[#333] hover:text-white'
                          }`}
                          style={{ backgroundColor: activeTab === tab ? (tab === 'artists' ? BC.electricBlue : tab === 'songs' ? BC.coral : BC.magenta) : undefined }}
                      >
                          {tab}
                      </button>
                  ))}
              </div>

              {/* List Content */}
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar bg-[#111] border-[4px] border-black p-4 min-h-[500px]">
                  <AnimatePresence mode="wait">
                      <motion.div
                          key={activeTab}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          className="flex flex-col gap-3"
                      >
                          {activeTab === 'artists' && artists.slice(0, 10).map((artist, i) => (
                              <BrutRow
                                  key={artist.id}
                                  rank={i + 1}
                                  image={artistImages[artist.name] || artist.image}
                                  title={artist.name}
                                  meta={`${artist.totalListens} plays`}
                                  badge={artist.timeStr}
                                  color="#1A6BFF"
                                  onClick={() => onArtistClick && onArtistClick(artist)}
                              />
                          ))}
                          {activeTab === 'songs' && songs.slice(0, 10).map((song, i) => (
                              <BrutRow
                                  key={song.id}
                                  rank={i + 1}
                                  image={song.cover}
                                  title={song.title}
                                  sub={song.artist}
                                  meta={`${song.listens} plays`}
                                  color="#FF4D2E"
                                  onClick={() => onSongClick && onSongClick(song)}
                              />
                          ))}
                          {activeTab === 'albums' && albums.slice(0, 10).map((album, i) => (
                              <BrutRow
                                  key={album.id}
                                  rank={i + 1}
                                  image={album.cover}
                                  title={album.title}
                                  sub={album.artist}
                                  meta={`${album.totalListens} plays`}
                                  color="#FF0080"
                                  onClick={() => onAlbumClick && onAlbumClick(album)}
                              />
                          ))}
                      </motion.div>
                  </AnimatePresence>
              </div>

          </div>

      </main>

      <footer className="p-4 bg-black border-t-4 border-[#CCFF00]">
          <p className="text-[#CCFF00] text-center font-mono text-xs uppercase opacity-60">Generated by Lotus Analytics • Brutalist Engine v1.0</p>
      </footer>
    </div>
  );
};

const BrutRow = ({ rank, image, title, sub, meta, badge, color, onClick }: { rank: number, image?: string, title: string, sub?: string, meta: string, badge?: string, color: string, onClick?: () => void }) => (
    <div
        onClick={onClick}
        className={`flex items-center gap-4 bg-white border-[3px] border-black p-3 shadow-[4px_4px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] transition-all group ${onClick ? 'cursor-pointer active:translate-x-0 active:translate-y-0 active:shadow-none' : ''}`}
    >
        <div className="w-10 text-center font-black text-2xl text-black/20 group-hover:text-black transition-colors">{rank}</div>
        <div className="w-12 h-12 border-2 border-black bg-black shrink-0 overflow-hidden relative">
             <img src={image || fallbackImage} alt={title} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
        </div>
        <div className="flex-1 min-w-0">
            <h3 className="font-black text-lg uppercase leading-none truncate">{title}</h3>
            {sub && <p className="font-bold text-xs uppercase text-gray-500 mt-0.5 truncate">{sub}</p>}
        </div>
        <div className="text-right shrink-0">
            <p className="font-bold text-sm uppercase" style={{ color }}>{meta}</p>
            {badge && <span className="inline-block bg-black text-white text-[10px] px-2 py-0.5 font-bold uppercase mt-1">{badge}</span>}
        </div>
    </div>
);

export default BrutalistDashboard;
