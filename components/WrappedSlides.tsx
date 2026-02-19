import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X } from 'lucide-react';
import { Artist, Album, Song } from '../types';

// ─── COLOR PALETTE ───────────────────────────────────────────────────────
const NB = {
  electricBlue: '#1A6BFF',
  coral: '#FF4D2E',
  magenta: '#FF0080',
  acidYellow: '#CCFF00',
  nearBlack: '#0D0D0D',
  white: '#FFFFFF',
  black: '#000000',
};

const TOTAL_SLIDES = 14;
const AUTO_ADVANCE_MS = 6000;
const LEFT_TAP_ZONE = 0.3;

interface WrappedSlidesProps {
  onClose: () => void;
  totalMinutes: number;
  artists: Artist[];
  albums: Album[];
  songs: Song[];
  albumCovers: string[];
  connectionGraph?: { artistInfo: Record<string, any>; pairs: Record<string, Record<string, number>> };
}

const fallbackImage =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFDMUMxRSIvPjxwYXRoIGQ9Ik0xMzAgNjB2NzBjMCAxMS05IDIwLTIwIDIwcy0yMC05LTIwLTIwIDktMjAgMjAtMjBjNCAwIDcgMSAxMCAzVjcwbC00MCAxMHY2MGMwIDExLTkgMjAtMjAgMjBzLTIwLTktMjAtMjAgOS0yMCAyMC0yMGM0IDAgNyAxIDEwIDNWNjBsNjAtMTV6IiBmaWxsPSIjOEU4RTkzIi8+PC9zdmc+';

// ─── HELPERS ─────────────────────────────────────────────────────────────
function useOdometer(target: number, durationMs = 1200): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);
  useEffect(() => {
    setValue(0);
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs]);
  return value;
}

const stagger = (i: number, base = 0.15, step = 0.06) => base + i * step;

// ─── TICKER ──────────────────────────────────────────────────────────────
const tickerCSS = `
@keyframes tickerScroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
`;

const Ticker: React.FC<{ text: string; bg?: string; color?: string }> = ({
  text,
  bg = NB.acidYellow,
  color = NB.black,
}) => {
  const repeated = Array(12).fill(text + '  \u2736  ').join('');
  return (
    <>
      <style>{tickerCSS}</style>
      <div
        style={{
          width: '100%',
          height: 36,
          background: bg,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          borderTop: `2px solid ${NB.black}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            whiteSpace: 'nowrap',
            animation: 'tickerScroll 20s linear infinite',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color,
          }}
        >
          {repeated}
        </div>
      </div>
    </>
  );
};

// ─── STORY PROGRESS BAR ──────────────────────────────────────────────────
const StoryProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <div
    style={{
      position: 'absolute',
      top: 12,
      left: 12,
      right: 12,
      display: 'flex',
      gap: 4,
      zIndex: 100,
    }}
  >
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          flex: 1,
          height: 3,
          background: i < current ? NB.white : 'rgba(255,255,255,0.3)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {i === current && (
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: AUTO_ADVANCE_MS / 1000, ease: 'linear' }}
            style={{ position: 'absolute', top: 0, left: 0, height: '100%', background: NB.white }}
          />
        )}
      </div>
    ))}
  </div>
);

// ─── CLOSE BUTTON ────────────────────────────────────────────────────────
const CloseButton: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClose(); }}
    style={{
      position: 'absolute',
      top: 36,
      right: 12,
      zIndex: 100,
      width: 36,
      height: 36,
      background: NB.white,
      border: `3px solid ${NB.black}`,
      boxShadow: '3px 3px 0px #000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      padding: 0,
    }}
  >
    <X size={18} color={NB.black} />
  </button>
);

// ─── BRUTALIST CARD ──────────────────────────────────────────────────────
const BCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: NB.white,
      border: `4px solid ${NB.black}`,
      boxShadow: '4px 4px 0px #000',
      padding: '16px 20px',
      ...style,
    }}
  >
    {children}
  </div>
);

// ─── SLIDE 0: INTRO ──────────────────────────────────────────────────────
const Slide0: React.FC = () => (
  <div
    style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: NB.nearBlack,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 24px 24px',
      }}
    >
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 11,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: NB.white,
          marginBottom: 24,
          margin: '0 0 24px 0',
        }}
      >
        YOUR YEAR IN MUSIC
      </p>
      <div style={{ overflow: 'hidden', marginBottom: 8 }}>
        <motion.h1
          initial={{ y: '110%' }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
          style={{
            fontFamily: "'Anton', 'Impact', sans-serif",
            fontSize: 'clamp(80px, 22vw, 120px)',
            color: NB.white,
            lineHeight: 0.9,
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          YOUR
        </motion.h1>
      </div>
      <div style={{ overflow: 'hidden', marginBottom: 32 }}>
        <motion.h1
          initial={{ y: '110%' }}
          animate={{ y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: 0.13 }}
          style={{
            fontFamily: "'Anton', 'Impact', sans-serif",
            fontSize: 'clamp(80px, 22vw, 120px)',
            color: NB.acidYellow,
            lineHeight: 0.9,
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          STORY
        </motion.h1>
      </div>
      <div style={{ width: '100%', height: 1, background: NB.white, marginBottom: 24 }} />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: 0.4 }}
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: NB.white,
          margin: 0,
        }}
      >
        TAP TO BEGIN &rarr;
      </motion.p>
    </div>
    <Ticker text="YOUR YEAR IN MUSIC  PUNKY WRAPPED  2024" bg={NB.acidYellow} color={NB.black} />
  </div>
);

// ─── SLIDE 1: LISTENING TIME ─────────────────────────────────────────────
const Slide1: React.FC<{ totalMinutes: number }> = ({ totalMinutes }) => {
  const counted = useOdometer(totalMinutes);
  const hours = Math.round(totalMinutes / 60);
  const days = (totalMinutes / 60 / 24).toFixed(1);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: NB.acidYellow,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 24px 24px',
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: NB.black,
            margin: '0 0 8px 0',
          }}
        >
          THIS YEAR YOU LISTENED FOR
        </p>
        <p
          style={{
            fontFamily: "'Anton', 'Impact', sans-serif",
            fontSize: 'clamp(80px, 22vw, 140px)',
            color: NB.black,
            lineHeight: 0.9,
            margin: '0 0 0 0',
          }}
        >
          {counted.toLocaleString()}
        </p>
        <p
          style={{
            fontFamily: "'Anton', 'Impact', sans-serif",
            fontSize: 'clamp(32px, 8vw, 50px)',
            color: NB.black,
            margin: '0 0 32px 0',
          }}
        >
          MINUTES
        </p>
        <div style={{ display: 'flex', gap: 16 }}>
          <BCard style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: NB.black,
                margin: '0 0 4px 0',
              }}
            >
              HOURS
            </p>
            <p
              style={{
                fontFamily: "'Anton', 'Impact', sans-serif",
                fontSize: 36,
                color: NB.black,
                margin: 0,
              }}
            >
              {hours.toLocaleString()}
            </p>
          </BCard>
          <BCard style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: NB.black,
                margin: '0 0 4px 0',
              }}
            >
              DAYS
            </p>
            <p
              style={{
                fontFamily: "'Anton', 'Impact', sans-serif",
                fontSize: 36,
                color: NB.black,
                margin: 0,
              }}
            >
              {days}
            </p>
          </BCard>
        </div>
      </div>
      <Ticker text="MINUTES OF PURE MUSIC  KEEP LISTENING  PUNKY" bg={NB.black} color={NB.acidYellow} />
    </div>
  );
};

// ─── SLIDE 2: TOP ARTISTS LIST ───────────────────────────────────────────
const Slide2: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const top5 = artists.slice(0, 5);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: NB.magenta,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 24px 24px',
          overflow: 'hidden',
        }}
      >
        <h1
          style={{
            fontFamily: "'Anton', 'Impact', sans-serif",
            fontSize: 'clamp(48px, 13vw, 72px)',
            color: NB.white,
            textTransform: 'uppercase',
            margin: '0 0 12px 0',
            lineHeight: 1,
          }}
        >
          TOP ARTISTS
        </h1>
        <div style={{ width: '100%', height: 1, background: NB.white, marginBottom: 16 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {top5.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ x: -60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: stagger(i) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.4)',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  background: NB.black,
                  color: NB.white,
                  fontFamily: "'Anton', 'Impact', sans-serif",
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <p
                style={{
                  flex: 1,
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  color: NB.white,
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                }}
              >
                {a.name}
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.7)',
                  margin: 0,
                }}
              >
                {a.totalListens.toLocaleString()} plays
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── SLIDE 3: #1 ARTIST ──────────────────────────────────────────────────
const Slide3: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const top = artists[0];
  if (!top) return null;
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: NB.electricBlue,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {top.image && (
        <img
          src={top.image}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.35,
          }}
          alt=""
        />
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `${NB.electricBlue}99`,
        }}
      />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '60px 24px 24px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: NB.white,
            margin: '0 0 12px 0',
          }}
        >
          YOUR #1 ARTIST
        </p>
        <div style={{ overflow: 'hidden', marginBottom: 12 }}>
          <motion.h1
            initial={{ x: '-100%' }}
            animate={{ x: ['-100%', '5%', '0%'] }}
            transition={{ duration: 0.55, ease: 'easeOut', times: [0, 0.8, 1] }}
            style={{
              fontFamily: "'Anton', 'Impact', sans-serif",
              fontSize: 'clamp(48px, 13vw, 100px)',
              color: NB.white,
              textTransform: 'uppercase',
              lineHeight: 0.9,
              margin: 0,
            }}
          >
            {top.name}
          </motion.h1>
        </div>
        <div style={{ width: '100%', height: 1, background: NB.white, marginBottom: 12 }} />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: NB.white,
            margin: '0 0 20px 0',
          }}
        >
          {top.totalListens.toLocaleString()} PLAYS
        </motion.p>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
          style={{ position: 'relative' }}
        >
          <BCard>
            <div style={{ position: 'absolute', top: -10, right: 12 }}>
              <span
                style={{
                  background: NB.acidYellow,
                  color: NB.black,
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  padding: '3px 8px',
                  textTransform: 'uppercase',
                }}
              >
                LEGEND
              </span>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: NB.black, margin: 0 }}>
              &#10022; You listened to <strong>{top.name}</strong> on repeat. Dedication.
            </p>
          </BCard>
        </motion.div>
      </div>
    </div>
  );
};

// ─── SLIDE 4: TOP SONGS ──────────────────────────────────────────────────
const RANK_COLORS: Record<number, string> = {
  0: NB.acidYellow,
  1: NB.magenta,
  2: NB.electricBlue,
};

const Slide4: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const top = songs.slice(0, 7);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: NB.white,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 24px 24px',
          overflow: 'hidden',
        }}
      >
        <h1
          style={{
            fontFamily: "'Anton', 'Impact', sans-serif",
            fontSize: 'clamp(48px, 13vw, 72px)',
            color: NB.black,
            textTransform: 'uppercase',
            margin: '0 0 12px 0',
            lineHeight: 1,
          }}
        >
          TOP SONGS
        </h1>
        <div style={{ width: '100%', height: 3, background: NB.black, marginBottom: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {top.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ x: -60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: stagger(i) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: `1px solid ${NB.black}`,
              }}
            >
              <div
                style={{
                  width: i < 3 ? 28 : 24,
                  height: i < 3 ? 28 : 24,
                  background: RANK_COLORS[i] ?? NB.black,
                  color: i < 3 ? NB.black : NB.white,
                  fontFamily: "'Anton', 'Impact', sans-serif",
                  fontSize: i < 3 ? 14 : 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <img
                src={s.cover || fallbackImage}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackImage;
                }}
                style={{
                  width: 40,
                  height: 40,
                  objectFit: 'cover',
                  border: `2px solid ${NB.black}`,
                  flexShrink: 0,
                }}
                alt=""
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    color: NB.black,
                    margin: 0,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {s.title}
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                    color: 'rgba(0,0,0,0.5)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {s.artist}
                </p>
              </div>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  color: NB.black,
                  margin: 0,
                  flexShrink: 0,
                }}
              >
                {s.listens.toLocaleString()}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── SLIDE 5: #1 SONG ────────────────────────────────────────────────────
const Slide5: React.FC<{ songs: Song[] }> = ({ songs }) => {
  const top = songs[0];
  if (!top) return null;
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: NB.coral,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {top.cover && (
        <img
          src={top.cover}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.35,
          }}
          alt=""
        />
      )}
      <div style={{ position: 'absolute', inset: 0, background: `${NB.coral}99` }} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '60px 24px 24px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: NB.white,
            margin: '0 0 12px 0',
          }}
        >
          YOUR #1 SONG
        </p>
        <div style={{ overflow: 'hidden', marginBottom: 8 }}>
          <motion.h1
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              fontFamily: "'Anton', 'Impact', sans-serif",
              fontSize: 'clamp(40px, 11vw, 80px)',
              color: NB.white,
              textTransform: 'uppercase',
              lineHeight: 0.9,
              margin: 0,
            }}
          >
            {top.title}
          </motion.h1>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.3 }}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 15,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: NB.white,
            margin: '0 0 20px 0',
          }}
        >
          {top.artist}
        </motion.p>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.35 }}
        >
          <BCard>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: NB.black,
                margin: '0 0 4px 0',
              }}
            >
              TOTAL PLAYS
            </p>
            <p
              style={{
                fontFamily: "'Anton', 'Impact', sans-serif",
                fontSize: 42,
                color: NB.black,
                margin: 0,
              }}
            >
              {top.listens.toLocaleString()}
            </p>
          </BCard>
        </motion.div>
      </div>
    </div>
  );
};

// ─── SLIDE 6: TOP ALBUMS ─────────────────────────────────────────────────
const Slide6: React.FC<{ albums: Album[] }> = ({ albums }) => {
  const top = albums.slice(0, 6);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: NB.coral,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 24px 24px',
          overflow: 'hidden',
        }}
      >
        <h1
          style={{
            fontFamily: "'Anton', 'Impact', sans-serif",
            fontSize: 'clamp(48px, 13vw, 72px)',
            color: NB.white,
            textTransform: 'uppercase',
            margin: '0 0 12px 0',
            lineHeight: 1,
          }}
        >
          TOP ALBUMS
        </h1>
        <div
          style={{
            width: '100%',
            background: NB.black,
            padding: '4px 8px',
            marginBottom: 12,
          }}
        >
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 10,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: NB.white,
              margin: 0,
            }}
          >
            YOUR LISTENING HISTORY
          </p>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {top.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ x: -60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: stagger(i) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderBottom: '1px solid rgba(255,255,255,0.4)',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  background: NB.black,
                  color: NB.white,
                  fontFamily: "'Anton', 'Impact', sans-serif",
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <img
                src={a.cover || fallbackImage}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = fallbackImage;
                }}
                style={{
                  width: 52,
                  height: 52,
                  objectFit: 'cover',
                  border: `2px solid ${NB.black}`,
                  flexShrink: 0,
                }}
                alt=""
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    color: NB.white,
                    margin: 0,
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {a.title}
                </p>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.65)',
                    margin: 0,
                  }}
                >
                  {a.artist}
                </p>
              </div>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  color: NB.white,
                  margin: 0,
                  flexShrink: 0,
                }}
              >
                {a.totalListens.toLocaleString()}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── SLIDE 7: #1 ALBUM ───────────────────────────────────────────────────
const Slide7: React.FC<{ albums: Album[] }> = ({ albums }) => {
  const top = albums[0];
  if (!top) return null;
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: NB.nearBlack,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {top.cover && (
        <img
          src={top.cover}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.25,
          }}
          alt=""
        />
      )}
      <div style={{ position: 'absolute', inset: 0, background: `${NB.nearBlack}B3` }} />
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '60px 24px 24px',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: NB.white,
            margin: '0 0 12px 0',
          }}
        >
          #1 ALBUM
        </p>
        <div style={{ overflow: 'hidden', marginBottom: 8 }}>
          <motion.h1
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              fontFamily: "'Anton', 'Impact', sans-serif",
              fontSize: 'clamp(40px, 11vw, 80px)',
              color: NB.white,
              textTransform: 'uppercase',
              lineHeight: 0.9,
              margin: 0,
            }}
          >
            {top.title}
          </motion.h1>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.3 }}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 14,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: NB.white,
            margin: '0 0 20px 0',
          }}
        >
          {top.artist}
        </motion.p>
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.35 }}
        >
          <BCard>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: NB.black,
                margin: '0 0 4px 0',
              }}
            >
              TOTAL PLAYS
            </p>
            <p
              style={{
                fontFamily: "'Anton', 'Impact', sans-serif",
                fontSize: 42,
                color: NB.black,
                margin: 0,
              }}
            >
              {top.totalListens.toLocaleString()}
            </p>
          </BCard>
        </motion.div>
      </div>
    </div>
  );
};

// ─── SLIDE 8: GENRES ─────────────────────────────────────────────────────
const Slide8: React.FC<{ artists: Artist[] }> = ({ artists }) => {
  const genres = useMemo(() => {
    const map: Record<string, number> = {};
    artists.forEach((a) => {
      (a.genres ?? []).forEach((g) => {
        map[g] = (map[g] ?? 0) + a.totalListens;
      });
    });
    return Object.entries(map)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 6)
      .map(([g]) => g);
  }, [artists]);
  const fallbackGenres = ['Alternative', 'Indie', 'Rock', 'Pop', 'Electronic', 'Hip-Hop'];
  const display = genres.length > 0 ? genres : fallbackGenres;
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: NB.electricBlue,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 24px 24px',
        }}
      >
        <h1
          style={{
            fontFamily: "'Anton', 'Impact', sans-serif",
            fontSize: 'clamp(48px, 13vw, 80px)',
            color: NB.black,
            textTransform: 'uppercase',
            margin: '0 0 24px 0',
            lineHeight: 1,
          }}
        >
          YOUR GENRES
        </h1>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            flex: 1,
            alignContent: 'start',
          }}
        >
          {display.map((g, i) => (
            <motion.div
              key={g}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2, ease: 'easeOut', delay: 0.1 + i * 0.07 }}
            >
              <BCard style={{ textAlign: 'center', padding: '20px 12px' }}>
                <p
                  style={{
                    fontFamily: "'Anton', 'Impact', sans-serif",
                    fontSize: 20,
                    color: NB.black,
                    textTransform: 'uppercase',
                    margin: 0,
                  }}
                >
                  {g}
                </p>
              </BCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── SLIDE 9: STATS ──────────────────────────────────────────────────────
const Slide9: React.FC<{ totalMinutes: number }> = ({ totalMinutes }) => {
  const hours = Math.round(totalMinutes / 60);
  const avgPerDay = Math.round(totalMinutes / 365);
  const months = (totalMinutes / 60 / 24 / 30).toFixed(1);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: NB.acidYellow,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 24px 24px',
          gap: 20,
        }}
      >
        <h1
          style={{
            fontFamily: "'Anton', 'Impact', sans-serif",
            fontSize: 'clamp(48px, 13vw, 80px)',
            color: NB.black,
            textTransform: 'uppercase',
            margin: '0 0 8px 0',
            lineHeight: 0.9,
          }}
        >
          BY THE NUMBERS
        </h1>
        {[
          { label: 'HOURS', value: hours.toLocaleString() },
          { label: 'MONTHS', value: months },
          { label: 'AVG MIN / DAY', value: avgPerDay.toString() },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut', delay: 0.15 + i * 0.1 }}
          >
            <BCard
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: NB.black,
                  margin: 0,
                }}
              >
                {stat.label}
              </p>
              <p
                style={{
                  fontFamily: "'Anton', 'Impact', sans-serif",
                  fontSize: 40,
                  color: NB.black,
                  margin: 0,
                }}
              >
                {stat.value}
              </p>
            </BCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ─── SLIDE 10: AI INSIGHT ────────────────────────────────────────────────
const Slide10: React.FC<{ totalMinutes: number }> = ({ totalMinutes }) => {
  const type =
    totalMinutes > 20000
      ? 'THE OBSESSIVE'
      : totalMinutes > 10000
      ? 'THE DEDICATED LISTENER'
      : 'THE CASUAL FAN';
  const desc =
    totalMinutes > 20000
      ? "Music isn't just something you listen to — it's the air you breathe. You have strong opinions and even stronger playlists."
      : totalMinutes > 10000
      ? 'You show up every day, rain or shine. Artists know your name. Your taste is refined and unapologetic.'
      : 'You pick your moments carefully. When you listen, you\'re all in. Quality over quantity.';
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: NB.nearBlack,
        position: 'relative',
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '60px 24px 24px',
        }}
      >
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: NB.acidYellow,
            margin: '0 0 16px 0',
          }}
        >
          YOU ARE
        </p>
        <div style={{ position: 'relative', marginBottom: 32 }}>
          <div
            style={{
              position: 'absolute',
              inset: -12,
              border: `4px solid ${NB.white}`,
              transform: 'rotate(-1.5deg)',
              pointerEvents: 'none',
            }}
          />
          <motion.h1
            initial={{ x: '-60%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{
              fontFamily: "'Anton', 'Impact', sans-serif",
              fontSize: 'clamp(36px, 9vw, 64px)',
              color: NB.acidYellow,
              textTransform: 'uppercase',
              lineHeight: 1,
              margin: 0,
              padding: '12px 0',
            }}
          >
            {type}
          </motion.h1>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 15,
            color: NB.white,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {desc}
        </motion.p>
      </div>
    </div>
  );
};

// ─── SLIDE 11: ALBUM WALL ────────────────────────────────────────────────
const Slide11: React.FC<{ albumCovers: string[]; albums: Album[] }> = ({ albumCovers, albums }) => {
  const covers = useMemo(() => {
    const src =
      albumCovers.length > 0
        ? albumCovers
        : albums.map((a) => a.cover).filter(Boolean);
    return src.slice(0, 24);
  }, [albumCovers, albums]);
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: NB.nearBlack,
      }}
    >
      <div style={{ padding: '60px 24px 12px' }}>
        <h1
          style={{
            fontFamily: "'Anton', 'Impact', sans-serif",
            fontSize: 'clamp(40px, 11vw, 64px)',
            color: NB.white,
            textTransform: 'uppercase',
            margin: 0,
            lineHeight: 1,
          }}
        >
          YOUR COLLECTION
        </h1>
      </div>
      <div
        style={{
          flex: 1,
          padding: '0 24px 24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 6,
          alignContent: 'start',
        }}
      >
        {covers.map((c, i) => (
          <motion.img
            key={i}
            src={c || fallbackImage}
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackImage;
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: i * 0.03 }}
            style={{
              width: '100%',
              aspectRatio: '1',
              objectFit: 'cover',
              border: `2px solid ${NB.black}`,
              display: 'block',
            }}
            alt=""
          />
        ))}
      </div>
    </div>
  );
};

// ─── SLIDE 12: CONNECTION GRAPH ──────────────────────────────────────────
const Slide12: React.FC<{
  connectionGraph?: WrappedSlidesProps['connectionGraph'];
  artists: Artist[];
}> = ({ connectionGraph, artists }) => {
  const pairs = useMemo(() => {
    if (!connectionGraph) return [];
    const result: { a: string; b: string; count: number }[] = [];
    Object.entries(connectionGraph.pairs).forEach(([a, targets]) => {
      Object.entries(targets).forEach(([b, count]) => {
        result.push({ a, b, count });
      });
    });
    return result.sort((x, y) => y.count - x.count).slice(0, 6);
  }, [connectionGraph]);

  const fallbackPairs = useMemo(
    () =>
      artists.slice(0, 5).map((a, i) => ({
        a: a.name,
        b: artists[i + 1]?.name ?? artists[0]?.name ?? '',
        count: a.totalListens,
      })),
    [artists]
  );

  const display = pairs.length > 0 ? pairs : fallbackPairs;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: NB.electricBlue,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '60px 24px 24px',
        }}
      >
        <h1
          style={{
            fontFamily: "'Anton', 'Impact', sans-serif",
            fontSize: 'clamp(40px, 11vw, 64px)',
            color: NB.black,
            textTransform: 'uppercase',
            margin: '0 0 20px 0',
            lineHeight: 1,
          }}
        >
          YOUR MUSIC WEB
        </h1>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {display.map((p, i) => (
            <motion.div
              key={i}
              initial={{ x: -40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut', delay: 0.1 + i * 0.07 }}
            >
              <BCard
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                }}
              >
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    color: NB.black,
                    margin: 0,
                    flex: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {p.a}
                </p>
                <span
                  style={{
                    fontFamily: "'Anton', 'Impact', sans-serif",
                    fontSize: 16,
                    color: NB.black,
                  }}
                >
                  &#8596;
                </span>
                <p
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    color: NB.black,
                    margin: 0,
                    flex: 1,
                    textTransform: 'uppercase',
                    textAlign: 'right',
                  }}
                >
                  {p.b}
                </p>
              </BCard>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── SLIDE 13: FINAL / SHARE ─────────────────────────────────────────────
const Slide13: React.FC<{
  totalMinutes: number;
  artists: Artist[];
  songs: Song[];
  onClose: () => void;
}> = ({ totalMinutes, artists, songs, onClose }) => {
  const topArtist = artists[0]?.name ?? '—';
  const topSong = songs[0]?.title ?? '—';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          flex: 1,
          background: NB.acidYellow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `4px solid ${NB.black}`,
        }}
      >
        <h1
          style={{
            fontFamily: "'Anton', 'Impact', sans-serif",
            fontSize: 'clamp(56px, 15vw, 96px)',
            color: NB.black,
            textTransform: 'uppercase',
            margin: 0,
            letterSpacing: '-0.02em',
          }}
        >
          PUNKY
        </h1>
      </div>
      <div
        style={{
          flex: 1,
          background: NB.nearBlack,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '24px',
          gap: 12,
        }}
      >
        {[
          { label: 'MINUTES', value: totalMinutes.toLocaleString() },
          { label: '#1 ARTIST', value: topArtist },
          { label: '#1 SONG', value: topSong },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 10,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)',
                margin: 0,
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                color: NB.white,
                margin: 0,
                textAlign: 'right',
                maxWidth: '60%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
        <div style={{ marginTop: 12 }}>
          <button
            style={{
              width: '100%',
              height: 56,
              background: NB.black,
              color: NB.white,
              border: 'none',
              fontFamily: "'Anton', 'Impact', sans-serif",
              fontSize: 18,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              display: 'block',
              borderRadius: 0,
            }}
          >
            SHARE YOUR WRAPPED &rarr;
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              width: '100%',
              background: 'transparent',
              color: 'rgba(255,255,255,0.4)',
              border: 'none',
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              marginTop: 12,
              padding: '4px 0',
            }}
          >
            VIEW FULL STATS
          </button>
        </div>
      </div>
      <Ticker text="PUNKY WRAPPED 2024  YOUR YEAR IN MUSIC" bg={NB.acidYellow} color={NB.black} />
    </div>
  );
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────
export default function WrappedSlides({
  onClose,
  totalMinutes,
  artists,
  albums,
  songs,
  albumCovers,
  connectionGraph,
}: WrappedSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((index: number, dir: number) => {
    setDirection(dir);
    setCurrentSlide(index);
  }, []);

  const next = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1) goTo(currentSlide + 1, 1);
  }, [currentSlide, goTo]);

  const prev = useCallback(() => {
    if (currentSlide > 0) goTo(currentSlide - 1, -1);
  }, [currentSlide, goTo]);

  useEffect(() => {
    timerRef.current = setTimeout(next, AUTO_ADVANCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentSlide, next]);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      if (x / rect.width < LEFT_TAP_ZONE) prev();
      else next();
    },
    [prev, next]
  );

  const handleDragEnd = useCallback(
    (_: never, info: PanInfo) => {
      if (info.offset.x < -50) next();
      else if (info.offset.x > 50) prev();
    },
    [prev, next]
  );

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 1 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 1 }),
  };

  const renderSlide = () => {
    switch (currentSlide) {
      case 0:
        return <Slide0 />;
      case 1:
        return <Slide1 totalMinutes={totalMinutes} />;
      case 2:
        return <Slide2 artists={artists} />;
      case 3:
        return <Slide3 artists={artists} />;
      case 4:
        return <Slide4 songs={songs} />;
      case 5:
        return <Slide5 songs={songs} />;
      case 6:
        return <Slide6 albums={albums} />;
      case 7:
        return <Slide7 albums={albums} />;
      case 8:
        return <Slide8 artists={artists} />;
      case 9:
        return <Slide9 totalMinutes={totalMinutes} />;
      case 10:
        return <Slide10 totalMinutes={totalMinutes} />;
      case 11:
        return <Slide11 albumCovers={albumCovers} albums={albums} />;
      case 12:
        return <Slide12 connectionGraph={connectionGraph} artists={artists} />;
      case 13:
        return (
          <Slide13
            totalMinutes={totalMinutes}
            artists={artists}
            songs={songs}
            onClose={onClose}
          />
        );
      default:
        return <Slide0 />;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: NB.nearBlack,
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={handleTap}
      >
        <StoryProgressBar current={currentSlide} total={TOTAL_SLIDES} />
        <CloseButton onClose={onClose} />

        <AnimatePresence initial={false} custom={direction} mode="sync">
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {renderSlide()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
