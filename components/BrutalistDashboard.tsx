import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Artist, Album, Song } from '../types';

const NB = {
  electricBlue: '#1A6BFF',
  coral: '#FF4D2E',
  magenta: '#FF0080',
  acidYellow: '#CCFF00',
  nearBlack: '#0D0D0D',
  white: '#FFFFFF',
  black: '#000000',
};

const fallbackImage =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFDMUMxRSIvPjxwYXRoIGQ9Ik0xMzAgNjB2NzBjMCAxMS05IDIwLTIwIDIwcy0yMC05LTIwLTIwIDktMjAgMjAtMjBjNCAwIDcgMSAxMCAzVjcwbC00MCAxMHY2MGMwIDExLTkgMjAtMjAgMjBzLTIwLTktMjAtMjAgOS0yMCAyMC0yMGM0IDAgNyAxIDEwIDNWNjBsNjAtMTV6IiBmaWxsPSIjOEU4RTkzIi8+PC9zdmc+';

const tickerCSS = `@keyframes brutTickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`;
const BrutTicker: React.FC<{ text: string; bg?: string; color?: string }> = ({ text, bg = NB.acidYellow, color = NB.black }) => {
  const repeated = Array(12).fill(text + '  ✶  ').join('');
  return (
    <>
      <style>{tickerCSS}</style>
      <div style={{ width: '100%', height: 34, background: bg, overflow: 'hidden', display: 'flex', alignItems: 'center', borderTop: `2px solid ${NB.black}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'brutTickerScroll 18s linear infinite', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color }}>
          {repeated}
        </div>
      </div>
    </>
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
}) => {
  const [activeTab, setActiveTab] = useState<'artists' | 'songs' | 'albums'>('artists');
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const hours = Math.round(totalMinutes / 60);
  const topArtist = artists[0];
  const topSong = songs[0];
  const topAlbum = albums[0];

  const tabColors: Record<string, string> = {
    artists: NB.electricBlue,
    songs: NB.coral,
    albums: NB.magenta,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: NB.nearBlack,
        overflowY: 'auto',
        fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        @keyframes brutScan { 0%,100%{opacity:0.1} 50%{opacity:0.25} }
        @keyframes brutBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        .brut-btn:hover { filter: brightness(1.15); }
      `}</style>

      {/* Scanline overlay */}
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, rgba(255,255,255,0.03) 3px, rgba(255,255,255,0.03) 4px)', pointerEvents: 'none', zIndex: 1 }} />

      {/* Header */}
      <div style={{ background: NB.acidYellow, borderBottom: `4px solid ${NB.black}`, padding: '16px 16px 12px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {userImage && (
              <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', border: `3px solid ${NB.black}`, flexShrink: 0 }}>
                <img src={userImage} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.black }}>BRUTALIST MODE</p>
              <h1 style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(18px, 4vw, 26px)', color: NB.black, textTransform: 'uppercase', lineHeight: 1 }}>
                {userName ? `${userName}'S STATS` : 'YOUR STATS'}
              </h1>
            </div>
          </div>
          <button
            onClick={onToggleOff}
            className="brut-btn"
            style={{ background: NB.black, color: NB.acidYellow, border: `3px solid ${NB.black}`, boxShadow: '3px 3px 0 rgba(0,0,0,0.4)', padding: '8px 14px', fontFamily: "'Barlow Condensed', 'Impact', sans-serif", fontWeight: 900, fontSize: 13, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            ← NORMAL
          </button>
        </div>
      </div>

      <BrutTicker text="BRUTALIST MODE  •  REAL DATA  •  NO FILTER" bg={NB.black} color={NB.acidYellow} />

      {/* Main content */}
      <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 14, position: 'relative', zIndex: 2 }}>

        {/* Stats hero row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: animated ? 1 : 0, y: animated ? 0 : 20 }}
          transition={{ duration: 0.4 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}
        >
          {[
            { label: 'MINUTES', value: totalMinutes.toLocaleString(), color: NB.electricBlue },
            { label: 'HOURS', value: hours.toLocaleString(), color: NB.coral },
            { label: 'TOP ARTIST', value: topArtist?.name ?? '—', color: NB.magenta },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: animated ? 1 : 0, y: animated ? 0 : 16 }}
              transition={{ delay: i * 0.08, duration: 0.35 }}
              style={{ background: s.color, border: `3px solid ${NB.black}`, boxShadow: '4px 4px 0 #000', padding: '10px 10px 12px' }}
            >
              <p style={{ margin: '0 0 3px 0', fontWeight: 700, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.65)' }}>{s.label}</p>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(16px, 4vw, 22px)', color: NB.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.1 }}>{s.value}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Time range selector */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
          {(['Daily', 'Weekly', 'Monthly', 'All Time'] as const).map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className="brut-btn"
              style={{
                padding: '8px 14px',
                background: timeRange === range ? NB.acidYellow : 'transparent',
                border: `3px solid ${timeRange === range ? NB.black : 'rgba(255,255,255,0.3)'}`,
                boxShadow: timeRange === range ? '3px 3px 0 #000' : 'none',
                fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                fontWeight: 900,
                fontSize: 13,
                color: timeRange === range ? NB.black : 'rgba(255,255,255,0.7)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Top pick card */}
        {topArtist && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: animated ? 1 : 0, x: animated ? 0 : -20 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{ display: 'flex', gap: 0, border: `4px solid ${NB.black}`, boxShadow: '5px 5px 0 #000', overflow: 'hidden' }}
          >
            <div style={{ width: 100, height: 100, flexShrink: 0, background: '#222', overflow: 'hidden' }}>
              <img
                src={artistImages[topArtist.name] || topArtist.image || fallbackImage}
                alt={topArtist.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }}
              />
            </div>
            <div style={{ flex: 1, background: NB.white, padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <p style={{ margin: '0 0 2px 0', fontWeight: 700, fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666' }}>YOUR #1 ARTIST</p>
              <h2 style={{ margin: '0 0 4px 0', fontWeight: 900, fontSize: 'clamp(20px, 5vw, 28px)', color: NB.black, textTransform: 'uppercase', lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topArtist.name}</h2>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 12, color: '#444' }}>{topArtist.totalListens.toLocaleString()} plays</p>
            </div>
            <div style={{ background: NB.acidYellow, width: 10, flexShrink: 0 }} />
          </motion.div>
        )}

        {/* Tab row */}
        <div style={{ display: 'flex', borderBottom: `4px solid ${NB.black}` }}>
          {(['artists', 'songs', 'albums'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="brut-btn"
              style={{
                flex: 1,
                padding: '10px 4px',
                background: activeTab === tab ? tabColors[tab] : 'transparent',
                border: 'none',
                borderRight: tab !== 'albums' ? `4px solid ${NB.black}` : 'none',
                fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
                fontWeight: 900,
                fontSize: 14,
                color: activeTab === tab ? (tab === 'songs' ? NB.white : NB.black) : 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* List content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.2 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {activeTab === 'artists' && artists.slice(0, 10).map((artist, i) => (
              <BrutListRow
                key={artist.id}
                rank={i + 1}
                image={artistImages[artist.name] || artist.image}
                title={artist.name}
                meta={`${artist.totalListens.toLocaleString()} plays`}
                metaRight={artist.timeStr}
                accent={i === 0 ? NB.acidYellow : undefined}
                isRound
              />
            ))}
            {activeTab === 'songs' && songs.slice(0, 10).map((song, i) => (
              <BrutListRow
                key={song.id}
                rank={i + 1}
                image={song.cover}
                title={song.title}
                meta={song.artist}
                metaRight={`${song.listens.toLocaleString()}×`}
                accent={i === 0 ? NB.coral : undefined}
              />
            ))}
            {activeTab === 'albums' && albums.slice(0, 10).map((album, i) => (
              <BrutListRow
                key={album.id}
                rank={i + 1}
                image={album.cover}
                title={album.title}
                meta={album.artist}
                metaRight={`${album.totalListens.toLocaleString()} plays`}
                accent={i === 0 ? NB.magenta : undefined}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Summary strip */}
        {topSong && topAlbum && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: animated ? 1 : 0, y: animated ? 0 : 16 }}
            transition={{ delay: 0.45, duration: 0.4 }}
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}
          >
            <div style={{ border: `4px solid ${NB.black}`, background: NB.coral, boxShadow: '4px 4px 0 #000', padding: '10px 12px', overflow: 'hidden' }}>
              <p style={{ margin: '0 0 2px 0', fontWeight: 700, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>#1 SONG</p>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: NB.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.1 }}>{topSong.title}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topSong.artist}</p>
            </div>
            <div style={{ border: `4px solid ${NB.acidYellow}`, background: NB.nearBlack, boxShadow: '4px 4px 0 #000', padding: '10px 12px', overflow: 'hidden' }}>
              <p style={{ margin: '0 0 2px 0', fontWeight: 700, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: NB.acidYellow }}>TOP ALBUM</p>
              <p style={{ margin: 0, fontWeight: 900, fontSize: 16, color: NB.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.1 }}>{topAlbum.title}</p>
              <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topAlbum.artist}</p>
            </div>
          </motion.div>
        )}

        {/* Bottom toggle back button */}
        <button
          onClick={onToggleOff}
          className="brut-btn"
          style={{
            width: '100%',
            padding: '14px',
            background: NB.white,
            border: `4px solid ${NB.black}`,
            boxShadow: '5px 5px 0 #000',
            fontFamily: "'Barlow Condensed', 'Impact', sans-serif",
            fontWeight: 900,
            fontSize: 16,
            color: NB.black,
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginTop: 8,
          }}
        >
          ← BACK TO NORMAL DASHBOARD
        </button>
      </div>

      <BrutTicker text="LOTUS STATS  •  YOUR MUSIC DNA  •  KEEP LISTENING" bg={NB.acidYellow} color={NB.black} />
    </div>
  );
};

interface BrutListRowProps {
  rank: number;
  image?: string;
  title: string;
  meta?: string;
  metaRight?: string;
  accent?: string;
  isRound?: boolean;
}

const BrutListRow: React.FC<BrutListRowProps> = ({ rank, image, title, meta, metaRight, accent, isRound }) => {
  const palette = [NB.electricBlue, NB.coral, NB.magenta, NB.acidYellow, '#555555'];
  return (
    <motion.div
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: (rank - 1) * 0.05, duration: 0.3 }}
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        background: accent ? accent : NB.white,
        border: `3px solid ${NB.black}`,
        boxShadow: '3px 3px 0 #000',
        padding: '8px 10px',
        overflow: 'hidden',
      }}
    >
      <span style={{
        fontWeight: 900,
        fontSize: 22,
        color: accent ? NB.black : 'rgba(0,0,0,0.2)',
        minWidth: 28,
        lineHeight: 1,
        flexShrink: 0,
      }}>{rank}</span>
      <div style={{
        width: 48,
        height: 48,
        flexShrink: 0,
        borderRadius: isRound ? '50%' : 0,
        overflow: 'hidden',
        border: `2px solid ${NB.black}`,
        background: palette[(rank - 1) % palette.length],
      }}>
        {image && (
          <img
            src={image}
            alt={title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={(e) => { (e.target as HTMLImageElement).src = fallbackImage; }}
          />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          margin: 0,
          fontWeight: 900,
          fontSize: 15,
          color: accent ? NB.black : NB.black,
          textTransform: 'uppercase',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.1,
        }}>{title}</p>
        {meta && (
          <p style={{
            margin: '2px 0 0 0',
            fontSize: 11,
            color: accent ? 'rgba(0,0,0,0.65)' : '#555',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>{meta}</p>
        )}
      </div>
      {metaRight && (
        <span style={{
          fontWeight: 900,
          fontSize: 14,
          flexShrink: 0,
          background: rank === 1 ? NB.nearBlack : 'transparent',
          color: rank === 1 ? NB.acidYellow : '#333',
          padding: rank === 1 ? '3px 8px' : undefined,
        }}>{metaRight}</span>
      )}
    </motion.div>
  );
};

export default BrutalistDashboard;
