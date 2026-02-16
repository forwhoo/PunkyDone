import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import { motion, AnimatePresence } from 'framer-motion';

// --- BRUTALIST CONSTANTS ---
const LIME = '#BFFF00';
const BLACK = '#000000';
const MAGENTA = '#FF00FF';
const CYAN = '#00F0FF';
const ORANGE = '#FF6B00';
const WHITE = '#FFFFFF';

const BRUTAL_FONT = '"Impact", "Arial Black", "Helvetica Neue Bold", sans-serif';
const MONO_FONT = '"Courier New", "Courier", monospace';

const brutalistTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: LIME, contrastText: BLACK },
    secondary: { main: MAGENTA },
    background: { default: BLACK, paper: BLACK },
    text: { primary: WHITE, secondary: LIME },
  },
  typography: {
    fontFamily: BRUTAL_FONT,
    allVariants: { textTransform: 'uppercase' as const },
  },
  shape: { borderRadius: 0 },
  components: {
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 0, height: 6 },
        bar: { borderRadius: 0 },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
  },
});

// Glitch keyframes injected once
const GLITCH_STYLE_ID = 'brutalist-glitch-keyframes';
function ensureGlitchStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(GLITCH_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = GLITCH_STYLE_ID;
  style.textContent = `
    @keyframes brutalist-glitch {
      0% { transform: translate(0); }
      20% { transform: translate(-3px, 3px); }
      40% { transform: translate(3px, -3px); }
      60% { transform: translate(-2px, -2px); }
      80% { transform: translate(2px, 2px); }
      100% { transform: translate(0); }
    }
    @keyframes brutalist-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.04); }
    }
  `;
  document.head.appendChild(style);
}

// --- DEMO DATA ---
interface ChapterData {
  id: string;
  trackName: string;
  previewUrl: string;
}

const CHAPTER_DATA: ChapterData[] = [
  { id: 'top-artist', trackName: 'TAYLOR SWIFT — CRUEL SUMMER', previewUrl: '' },
  { id: 'top-tracks', trackName: 'RADIOHEAD — EVERYTHING IN ITS RIGHT PLACE', previewUrl: '' },
  { id: 'timeline', trackName: 'LCD SOUNDSYSTEM — ALL MY FRIENDS', previewUrl: '' },
  { id: 'genres', trackName: 'DEATH GRIPS — GUILLOTINE', previewUrl: '' },
  { id: 'personality', trackName: 'SONIC YOUTH — TEEN AGE RIOT', previewUrl: '' },
];

const TOP_TRACKS = [
  { rank: 1, title: 'CRUEL SUMMER', artist: 'TAYLOR SWIFT', plays: 23 },
  { rank: 2, title: 'VAMPIRE', artist: 'OLIVIA RODRIGO', plays: 19 },
  { rank: 3, title: 'ANTI-HERO', artist: 'TAYLOR SWIFT', plays: 17 },
  { rank: 4, title: 'FLOWERS', artist: 'MILEY CYRUS', plays: 14 },
  { rank: 5, title: 'KILL BILL', artist: 'SZA', plays: 12 },
];

const GENRE_DATA = [
  { genre: 'POP', pct: 68, color: LIME },
  { genre: 'INDIE ROCK', pct: 15, color: MAGENTA },
  { genre: 'R&B', pct: 9, color: CYAN },
  { genre: 'ELECTRONIC', pct: 5, color: ORANGE },
  { genre: 'OTHER', pct: 3, color: WHITE },
];

const TIMELINE_STATS = [
  { label: 'PEAK HOUR', value: '11 PM', color: MAGENTA },
  { label: 'TOTAL TIME', value: '9H 06M', color: LIME },
  { label: 'TRACKS', value: '156', color: CYAN },
  { label: 'ARTISTS', value: '32', color: ORANGE },
];

// --- AUDIO PLAYER HOOK ---
function useAudioPreview(previewUrl: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);

  useEffect(() => {
    // Reset on url change
    setIsPlaying(false);
    setAudioProgress(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [previewUrl]);

  const togglePlay = useCallback(() => {
    if (!previewUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(previewUrl);
      audioRef.current.addEventListener('timeupdate', () => {
        const a = audioRef.current;
        if (a && a.duration) {
          setAudioProgress((a.currentTime / a.duration) * 100);
        }
      });
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setAudioProgress(0);
      });
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  }, [previewUrl, isPlaying]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return { isPlaying, audioProgress, togglePlay };
}

// --- CHAPTER RENDERERS ---

function ChapterTopArtist() {
  return (
    <Box sx={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden' }}>
      {/* Thick border frame */}
      <Box sx={{
        position: 'absolute', inset: 12,
        border: `6px solid ${LIME}`,
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* Rotated label */}
      <Typography sx={{
        position: 'absolute', left: -20, top: '50%',
        transform: 'rotate(-90deg) translateX(-50%)',
        transformOrigin: 'left center',
        fontFamily: BRUTAL_FONT, fontSize: '1.1rem', fontWeight: 900,
        color: MAGENTA, letterSpacing: '0.3em', zIndex: 2,
      }}>
        OBSESSED
      </Typography>

      <Box sx={{ textAlign: 'center', px: 4, zIndex: 2 }}>
        <Typography sx={{
          fontFamily: BRUTAL_FONT, fontSize: '1rem', fontWeight: 900,
          color: WHITE, letterSpacing: '0.4em', mb: 1,
        }}>
          YOUR #1 ARTIST
        </Typography>

        <Typography sx={{
          fontFamily: BRUTAL_FONT,
          fontSize: { xs: '4rem', sm: '5rem' },
          fontWeight: 900, lineHeight: 0.95,
          color: LIME,
          animation: 'brutalist-pulse 2s ease-in-out infinite',
          textShadow: `4px 4px 0 ${MAGENTA}`,
        }}>
          TAYLOR SWIFT
        </Typography>

        <Box sx={{
          mt: 3, border: `4px solid ${WHITE}`, display: 'inline-block', px: 3, py: 1,
        }}>
          <Typography sx={{
            fontFamily: MONO_FONT, fontSize: '1.2rem', fontWeight: 700, color: WHITE,
          }}>
            47 PLAYS — 2H 44M
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function ChapterTopTracks() {
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', px: 2, pt: 1 }}>
      <Typography sx={{
        fontFamily: BRUTAL_FONT, fontSize: '2rem', fontWeight: 900,
        color: LIME, borderBottom: `4px solid ${LIME}`, pb: 1, mb: 0,
      }}>
        TOP 5 TRACKS
      </Typography>

      {TOP_TRACKS.map((t) => (
        <Box key={t.rank} sx={{
          display: 'flex', alignItems: 'center',
          borderBottom: `3px solid ${WHITE}`,
          py: 1.2,
        }}>
          {/* Oversized rank */}
          <Typography sx={{
            fontFamily: BRUTAL_FONT, fontSize: '2.8rem', fontWeight: 900,
            color: MAGENTA, width: 56, lineHeight: 1, textAlign: 'center',
            flexShrink: 0,
          }}>
            {t.rank}
          </Typography>

          <Box sx={{ flex: 1, ml: 1, minWidth: 0 }}>
            <Typography sx={{
              fontFamily: BRUTAL_FONT, fontSize: '0.95rem', fontWeight: 900,
              color: WHITE, lineHeight: 1.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {t.title}
            </Typography>
            <Typography sx={{
              fontFamily: BRUTAL_FONT, fontSize: '0.7rem', fontWeight: 700,
              color: CYAN, lineHeight: 1.2,
            }}>
              {t.artist}
            </Typography>
          </Box>

          {/* Monospace play count */}
          <Typography sx={{
            fontFamily: MONO_FONT, fontSize: '1.1rem', fontWeight: 700,
            color: LIME, flexShrink: 0, ml: 1,
          }}>
            {String(t.plays).padStart(3, '0')}×
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function ChapterTimeline() {
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 2 }}>
      <Typography sx={{
        fontFamily: BRUTAL_FONT, fontSize: '2.2rem', fontWeight: 900,
        color: CYAN, mb: 2, borderBottom: `4px solid ${CYAN}`, pb: 1,
      }}>
        LISTENING TIMELINE
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px' }}>
        {TIMELINE_STATS.map((s) => (
          <Box key={s.label} sx={{
            border: `4px solid ${s.color}`,
            p: 2, textAlign: 'center',
          }}>
            <Typography sx={{
              fontFamily: BRUTAL_FONT, fontSize: '0.7rem', fontWeight: 700,
              color: s.color, letterSpacing: '0.2em', mb: 0.5,
            }}>
              {s.label}
            </Typography>
            <Typography sx={{
              fontFamily: BRUTAL_FONT, fontSize: '2.2rem', fontWeight: 900,
              color: WHITE, lineHeight: 1,
            }}>
              {s.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Evolution bar */}
      <Box sx={{ mt: 3, border: `3px solid ${WHITE}`, p: 1.5 }}>
        <Typography sx={{
          fontFamily: BRUTAL_FONT, fontSize: '0.7rem', fontWeight: 700,
          color: ORANGE, letterSpacing: '0.15em', mb: 1,
        }}>
          WEEKLY EVOLUTION
        </Typography>
        <Box sx={{ display: 'flex', gap: '2px', height: 24 }}>
          {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day, i) => {
            const heights = [40, 55, 70, 45, 80, 100, 65];
            return (
              <Box key={day} sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center' }}>
                <Box sx={{
                  width: '100%',
                  height: `${heights[i]}%`,
                  bgcolor: i === 5 ? LIME : MAGENTA,
                }} />
              </Box>
            );
          })}
        </Box>
        <Box sx={{ display: 'flex', gap: '2px', mt: 0.5 }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Typography key={i} sx={{
              flex: 1, textAlign: 'center',
              fontFamily: MONO_FONT, fontSize: '0.5rem', color: WHITE,
            }}>
              {d}
            </Typography>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

function ChapterGenres() {
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 2 }}>
      <Typography sx={{
        fontFamily: BRUTAL_FONT, fontSize: '2.2rem', fontWeight: 900,
        color: ORANGE, mb: 2, borderBottom: `4px solid ${ORANGE}`, pb: 1,
      }}>
        GENRE BREAKDOWN
      </Typography>

      {GENRE_DATA.map((g) => (
        <Box key={g.genre} sx={{ mb: 1.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
            <Typography sx={{
              fontFamily: BRUTAL_FONT, fontSize: '0.85rem', fontWeight: 900,
              color: g.color,
            }}>
              {g.genre}
            </Typography>
            <Typography sx={{
              fontFamily: MONO_FONT, fontSize: '0.85rem', fontWeight: 700,
              color: WHITE,
            }}>
              {g.pct}%
            </Typography>
          </Box>
          {/* Chunky bar */}
          <Box sx={{ width: '100%', height: 20, bgcolor: '#222', border: `2px solid ${g.color}` }}>
            <Box sx={{
              width: `${g.pct}%`, height: '100%', bgcolor: g.color,
            }} />
          </Box>
        </Box>
      ))}

      <Box sx={{
        mt: 2, border: `3px solid ${LIME}`, px: 2, py: 1,
        display: 'inline-block', alignSelf: 'flex-start',
      }}>
        <Typography sx={{
          fontFamily: MONO_FONT, fontSize: '0.75rem', fontWeight: 700, color: LIME,
        }}>
          5 GENRES DETECTED
        </Typography>
      </Box>
    </Box>
  );
}

function ChapterPersonality() {
  return (
    <Box sx={{
      flex: 1, display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', px: 2,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Glitch background text */}
      <Typography sx={{
        position: 'absolute', top: '15%', left: '50%',
        transform: 'translate(-50%, 0)',
        fontFamily: BRUTAL_FONT, fontSize: '6rem', fontWeight: 900,
        color: MAGENTA, opacity: 0.12, whiteSpace: 'nowrap',
        animation: 'brutalist-glitch 0.3s infinite',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        MUSIC EXPLORER
      </Typography>

      <Typography sx={{
        fontFamily: BRUTAL_FONT, fontSize: '0.9rem', fontWeight: 700,
        color: CYAN, letterSpacing: '0.5em', mb: 1,
      }}>
        YOUR AUDIO PERSONALITY
      </Typography>

      <Typography sx={{
        fontFamily: BRUTAL_FONT,
        fontSize: { xs: '3.5rem', sm: '4.5rem' },
        fontWeight: 900, lineHeight: 0.95, textAlign: 'center',
        color: WHITE,
        textShadow: `3px 3px 0 ${MAGENTA}, -3px -3px 0 ${CYAN}`,
      }}>
        MUSIC EXPLORER
      </Typography>

      <Box sx={{
        mt: 3, border: `4px solid ${LIME}`,
        px: 3, py: 1.5, textAlign: 'center',
      }}>
        <Typography sx={{
          fontFamily: MONO_FONT, fontSize: '0.8rem', fontWeight: 700,
          color: LIME, lineHeight: 1.5,
        }}>
          32 ARTISTS · 5 GENRES · 156 TRACKS
        </Typography>
      </Box>

      <Typography sx={{
        mt: 3, fontFamily: BRUTAL_FONT, fontSize: '0.75rem',
        fontWeight: 700, color: ORANGE, letterSpacing: '0.3em',
      }}>
        SHARE YOUR PUNKY WRAPPED
      </Typography>
    </Box>
  );
}

// --- AUDIO PLAYER BAR ---
function AudioPlayerBar({ trackName, previewUrl }: { trackName: string; previewUrl: string }) {
  const { isPlaying, audioProgress, togglePlay } = useAudioPreview(previewUrl);

  return (
    <Box
      onClick={(e) => e.stopPropagation()}
      sx={{
        borderTop: `4px solid ${LIME}`,
        bgcolor: BLACK, px: 1.5, py: 1,
        display: 'flex', alignItems: 'center', gap: 1.5,
        zIndex: 10,
      }}
    >
      {/* Play/Pause button */}
      <IconButton
        onClick={togglePlay}
        disabled={!previewUrl}
        sx={{
          width: 60, height: 60,
          border: `4px solid ${previewUrl ? LIME : '#333'}`,
          borderRadius: 0, color: previewUrl ? LIME : '#333',
          bgcolor: BLACK, flexShrink: 0,
          '&:hover': { bgcolor: '#111' },
          '&.Mui-disabled': { color: '#333' },
        }}
      >
        {isPlaying ? <PauseIcon sx={{ fontSize: 32 }} /> : <PlayArrowIcon sx={{ fontSize: 32 }} />}
      </IconButton>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontFamily: MONO_FONT, fontSize: '0.6rem', fontWeight: 700,
          color: LIME, whiteSpace: 'nowrap',
          overflow: 'hidden', textOverflow: 'ellipsis',
          mb: 0.5,
        }}>
          {trackName}
        </Typography>
        {/* Progress bar */}
        <LinearProgress
          variant="determinate"
          value={audioProgress}
          sx={{
            height: 6, borderRadius: 0,
            bgcolor: '#333',
            '& .MuiLinearProgress-bar': {
              bgcolor: LIME, borderRadius: 0, transition: 'none',
            },
          }}
        />
      </Box>
    </Box>
  );
}

// --- CHAPTER LAYOUT MAP ---
const CHAPTER_RENDERERS = [ChapterTopArtist, ChapterTopTracks, ChapterTimeline, ChapterGenres, ChapterPersonality];

// --- MAIN COMPONENT ---
interface WrappedStoriesProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WrappedStories: React.FC<WrappedStoriesProps> = ({ isOpen, onClose }) => {
  const [currentChapter, setCurrentChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const CHAPTER_DURATION = 8000;
  const PROGRESS_INTERVAL = 50;

  const totalChapters = CHAPTER_DATA.length;

  useEffect(() => { ensureGlitchStyles(); }, []);

  const transitionToChapter = useCallback((newChapter: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentChapter(newChapter);
      setProgress(0);
      setIsTransitioning(false);
    }, 80);
  }, [isTransitioning]);

  const goToNext = useCallback(() => {
    if (currentChapter < totalChapters - 1) {
      transitionToChapter(currentChapter + 1);
    }
  }, [currentChapter, totalChapters, transitionToChapter]);

  const goToPrev = useCallback(() => {
    if (currentChapter > 0) {
      transitionToChapter(currentChapter - 1);
    }
  }, [currentChapter, transitionToChapter]);

  // Auto-advance timer
  useEffect(() => {
    if (!isOpen) return;
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (PROGRESS_INTERVAL / CHAPTER_DURATION) * 100;
        if (next >= 100) {
          if (currentChapter < totalChapters - 1) {
            goToNext();
          } else {
            if (timerRef.current) clearInterval(timerRef.current);
          }
          return 100;
        }
        return next;
      });
    }, PROGRESS_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, currentChapter, goToNext, totalChapters]);

  // Tap zones: left third = prev, right two-thirds = next
  const handleTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) {
      goToPrev();
    } else {
      goToNext();
    }
  }, [goToNext, goToPrev]);

  const handleClose = useCallback(() => {
    setCurrentChapter(0);
    setProgress(0);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const ChapterContent = CHAPTER_RENDERERS[currentChapter];
  const chapterData = CHAPTER_DATA[currentChapter];

  return (
    <ThemeProvider theme={brutalistTheme}>
      <CssBaseline />
      <Box sx={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: BLACK,
      }}>
        {/* Stories container */}
        <Box sx={{
          position: 'relative',
          width: { xs: '100%', sm: 420 },
          height: { xs: '100%', sm: 740 },
          maxHeight: '100dvh',
          overflow: 'hidden',
          bgcolor: BLACK,
          border: { xs: 'none', sm: `4px solid ${LIME}` },
          cursor: 'pointer',
          userSelect: 'none',
          display: 'flex',
          flexDirection: 'column',
        }} onClick={handleTap}>

          {/* Progress bars */}
          <Box sx={{ display: 'flex', gap: '3px', px: 1, pt: 1, pb: 0.5, zIndex: 10 }}>
            {CHAPTER_DATA.map((_, idx) => (
              <LinearProgress
                key={idx}
                variant="determinate"
                value={idx < currentChapter ? 100 : idx === currentChapter ? progress : 0}
                sx={{
                  flex: 1, height: 6, borderRadius: 0,
                  bgcolor: '#333',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: LIME, borderRadius: 0,
                    transition: idx === currentChapter ? 'none' : 'transform 0s',
                  },
                }}
              />
            ))}
          </Box>

          {/* Header bar */}
          <Box sx={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.5, py: 0.5, zIndex: 10,
            borderBottom: `2px solid ${WHITE}`,
          }}>
            <Typography sx={{
              fontFamily: BRUTAL_FONT, fontSize: '0.8rem', fontWeight: 900,
              color: LIME, letterSpacing: '0.2em',
            }}>
              PUNKY WRAPPED — {currentChapter + 1}/{totalChapters}
            </Typography>

            <IconButton
              onClick={(e) => { e.stopPropagation(); handleClose(); }}
              sx={{
                color: WHITE, border: `2px solid ${WHITE}`,
                borderRadius: 0, width: 32, height: 32,
                '&:hover': { bgcolor: '#222' },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          {/* Main content with snap-in animation */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentChapter}
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -60, opacity: 0 }}
              transition={{ duration: 0, type: 'tween' }}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
            >
              <ChapterContent />
            </motion.div>
          </AnimatePresence>

          {/* Audio player bar */}
          <AudioPlayerBar trackName={chapterData.trackName} previewUrl={chapterData.previewUrl} />

          {/* Bottom navigation */}
          <Box sx={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', px: 1, py: 1,
            borderTop: `2px solid ${WHITE}`, zIndex: 10,
          }}>
            <Box
              component="button"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); goToPrev(); }}
              sx={{
                fontFamily: BRUTAL_FONT, fontSize: '0.8rem', fontWeight: 900,
                color: currentChapter === 0 ? '#333' : WHITE,
                bgcolor: BLACK,
                border: `3px solid ${currentChapter === 0 ? '#333' : WHITE}`,
                px: 2, py: 1, cursor: currentChapter === 0 ? 'default' : 'pointer',
                '&:hover': currentChapter > 0 ? { bgcolor: '#111' } : {},
                letterSpacing: '0.1em',
              }}
            >
              ◀ PREV
            </Box>

            {/* Chapter indicators */}
            <Box sx={{ display: 'flex', gap: '4px' }}>
              {CHAPTER_DATA.map((_, idx) => (
                <Box key={idx} sx={{
                  width: idx === currentChapter ? 24 : 8,
                  height: 8, bgcolor: idx === currentChapter ? LIME : '#555',
                }} />
              ))}
            </Box>

            <Box
              component="button"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (currentChapter === totalChapters - 1) { handleClose(); } else { goToNext(); }
              }}
              sx={{
                fontFamily: BRUTAL_FONT, fontSize: '0.8rem', fontWeight: 900,
                color: BLACK, bgcolor: LIME,
                border: `3px solid ${LIME}`,
                px: 2, py: 1, cursor: 'pointer',
                '&:hover': { bgcolor: '#a0d900' },
                letterSpacing: '0.1em',
              }}
            >
              {currentChapter === totalChapters - 1 ? 'CLOSE ■' : 'NEXT ▶'}
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default WrappedStories;
