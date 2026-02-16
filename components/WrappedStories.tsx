import React, { useState, useCallback, useEffect, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Fab from '@mui/material/Fab';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Fade from '@mui/material/Fade';
import Slide from '@mui/material/Slide';
import CloseIcon from '@mui/icons-material/Close';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import HeadphonesIcon from '@mui/icons-material/Headphones';
import AlbumIcon from '@mui/icons-material/Album';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';

// Material Design 3 theme with bold, expressive colors
const wrappedTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#D0BCFF', // MD3 Purple
      contrastText: '#381E72',
    },
    secondary: {
      main: '#CCC2DC',
      contrastText: '#332D41',
    },
    error: {
      main: '#F2B8B5',
    },
    background: {
      default: '#1C1B1F',
      paper: '#2B2930',
    },
    text: {
      primary: '#E6E1E5',
      secondary: '#CAC4D0',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 900,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 800,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 28,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 28,
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
  },
});

// Chapter gradient backgrounds - bold Material 3 colors
const CHAPTER_THEMES = [
  {
    gradient: 'linear-gradient(135deg, #1C1B1F 0%, #381E72 50%, #4F378B 100%)',
    accent: '#D0BCFF',
    accentDark: '#381E72',
    chipBg: 'rgba(208, 188, 255, 0.15)',
  },
  {
    gradient: 'linear-gradient(135deg, #1C1B1F 0%, #633B48 50%, #7D5260 100%)',
    accent: '#FFB4AB',
    accentDark: '#93000A',
    chipBg: 'rgba(255, 180, 171, 0.15)',
  },
  {
    gradient: 'linear-gradient(135deg, #1C1B1F 0%, #31111D 50%, #492532 100%)',
    accent: '#FFD8E4',
    accentDark: '#31111D',
    chipBg: 'rgba(255, 216, 228, 0.15)',
  },
  {
    gradient: 'linear-gradient(135deg, #1C1B1F 0%, #004D40 50%, #00695C 100%)',
    accent: '#A7F3D0',
    accentDark: '#004D40',
    chipBg: 'rgba(167, 243, 208, 0.15)',
  },
  {
    gradient: 'linear-gradient(135deg, #1C1B1F 0%, #1A237E 50%, #283593 100%)',
    accent: '#BBDEFB',
    accentDark: '#1A237E',
    chipBg: 'rgba(187, 222, 251, 0.15)',
  },
];

// Demo data for the 5 chapters
const DEMO_CHAPTERS = [
  {
    id: 'top-artist',
    label: 'Top Artist',
    icon: <StarIcon />,
    title: 'Your\nTop Artist',
    subtitle: 'This week you couldn\'t stop listening to',
    highlight: 'Taylor Swift',
    detail: '47 plays this week',
    extraInfo: 'That\'s 2h 44m of pure vibes',
    avatarText: 'TS',
  },
  {
    id: 'top-song',
    label: 'Top Song',
    icon: <MusicNoteIcon />,
    title: 'Your\n#1 Song',
    subtitle: 'On repeat all week',
    highlight: 'Cruel Summer',
    detail: '23 plays',
    extraInfo: 'You played this more than 99% of listeners',
    avatarText: 'CS',
  },
  {
    id: 'listening-stats',
    label: 'Stats',
    icon: <GraphicEqIcon />,
    title: 'Your Week\nin Numbers',
    subtitle: 'Here\'s how your week sounded',
    highlight: '156 songs',
    detail: '9h 6m total listening',
    extraInfo: '32 different artists explored',
    avatarText: '156',
  },
  {
    id: 'top-genre',
    label: 'Genre',
    icon: <AlbumIcon />,
    title: 'Your Top\nGenre',
    subtitle: 'The sound that defined your week',
    highlight: 'Pop',
    detail: '68% of your listening',
    extraInfo: 'Followed by Indie Rock and R&B',
    avatarText: '🎵',
  },
  {
    id: 'wrapped-summary',
    label: 'Summary',
    icon: <EmojiEventsIcon />,
    title: 'That\'s\na Wrap!',
    subtitle: 'Your Punky Wrapped summary',
    highlight: 'Music Explorer',
    detail: 'Your listener personality this week',
    extraInfo: 'Share your Punky Wrapped with friends!',
    avatarText: '🏆',
  },
];

interface WrappedStoriesProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WrappedStories: React.FC<WrappedStoriesProps> = ({ isOpen, onClose }) => {
  const [currentChapter, setCurrentChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [contentVisible, setContentVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const CHAPTER_DURATION = 8000; // 8 seconds per chapter
  const PROGRESS_INTERVAL = 50;

  const totalChapters = DEMO_CHAPTERS.length;
  const chapter = DEMO_CHAPTERS[currentChapter];
  const theme = CHAPTER_THEMES[currentChapter];

  const transitionToChapter = useCallback((newChapter: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setContentVisible(false);

    setTimeout(() => {
      setCurrentChapter(newChapter);
      setProgress(0);
      setContentVisible(true);
      setIsTransitioning(false);
    }, 250);
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

  // Progress timer
  useEffect(() => {
    if (!isOpen) return;

    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (PROGRESS_INTERVAL / CHAPTER_DURATION) * 100;
        if (next >= 100) {
          // Auto-advance to next chapter
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

  // Tap zones: left third goes back, right two-thirds goes forward
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

  return (
    <ThemeProvider theme={wrappedTheme}>
      <CssBaseline />
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.95)',
        }}
      >
        {/* Stories Container - mobile-first aspect ratio */}
        <Box
          sx={{
            position: 'relative',
            width: { xs: '100%', sm: 420 },
            height: { xs: '100%', sm: 740 },
            maxHeight: '100dvh',
            borderRadius: { xs: 0, sm: '28px' },
            overflow: 'hidden',
            background: theme.gradient,
            cursor: 'pointer',
            userSelect: 'none',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={handleTap}
        >
          {/* Progress Bars */}
          <Box
            sx={{
              display: 'flex',
              gap: '4px',
              px: 2,
              pt: 2,
              pb: 1,
              zIndex: 10,
            }}
          >
            {DEMO_CHAPTERS.map((_, idx) => (
              <LinearProgress
                key={idx}
                variant="determinate"
                value={idx < currentChapter ? 100 : idx === currentChapter ? progress : 0}
                sx={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: '#FFFFFF',
                    borderRadius: 2,
                    transition: idx === currentChapter ? 'none' : 'transform 0.3s ease',
                  },
                }}
              />
            ))}
          </Box>

          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1,
              zIndex: 10,
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: theme.accent,
                  color: theme.accentDark,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}
              >
                <AutoAwesomeIcon sx={{ fontSize: 18 }} />
              </Avatar>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                  Punky Wrapped
                </Typography>
                <Typography variant="caption" sx={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontSize: '0.65rem' }}>
                  Chapter {currentChapter + 1} of {totalChapters}
                </Typography>
              </Box>
            </Stack>

            <IconButton
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              sx={{
                color: '#fff',
                bgcolor: 'rgba(255,255,255,0.1)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                width: 36,
                height: 36,
              }}
            >
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>

          {/* Main Content */}
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              px: 3,
              pb: 4,
              position: 'relative',
            }}
          >
            <Fade in={contentVisible} timeout={300}>
              <Box>
                {/* Chapter Label Chip */}
                <Chip
                  icon={React.cloneElement(chapter.icon, { sx: { fontSize: 16, '&&': { color: theme.accent } } })}
                  label={chapter.label}
                  size="small"
                  sx={{
                    mb: 3,
                    bgcolor: theme.chipBg,
                    color: theme.accent,
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${theme.accent}33`,
                  }}
                />

                {/* Title */}
                <Typography
                  variant="h2"
                  sx={{
                    fontSize: { xs: '2.5rem', sm: '3rem' },
                    fontWeight: 900,
                    lineHeight: 1.05,
                    color: '#FFFFFF',
                    mb: 2,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {chapter.title}
                </Typography>

                {/* Subtitle */}
                <Typography
                  variant="body1"
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    mb: 3,
                    fontSize: '1rem',
                    lineHeight: 1.5,
                  }}
                >
                  {chapter.subtitle}
                </Typography>

                {/* Highlight Card */}
                <Card
                  elevation={0}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid rgba(255,255,255,0.1)`,
                    mb: 2,
                  }}
                >
                  <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          bgcolor: theme.accent,
                          color: theme.accentDark,
                          fontWeight: 800,
                          fontSize: '1.25rem',
                        }}
                      >
                        {chapter.avatarText}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h5"
                          sx={{
                            fontWeight: 800,
                            color: theme.accent,
                            lineHeight: 1.2,
                          }}
                        >
                          {chapter.highlight}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: 'rgba(255,255,255,0.7)', mt: 0.5 }}
                        >
                          {chapter.detail}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                {/* Extra Info */}
                <Typography
                  variant="body2"
                  sx={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                  }}
                >
                  {chapter.extraInfo}
                </Typography>
              </Box>
            </Fade>
          </Box>

          {/* Bottom Navigation Hints */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              px: 2,
              pb: 2,
              zIndex: 10,
            }}
          >
            <Fab
              size="small"
              disabled={currentChapter === 0}
              onClick={(e) => {
                e.stopPropagation();
                goToPrev();
              }}
              sx={{
                bgcolor: 'rgba(255,255,255,0.1)',
                color: '#fff',
                boxShadow: 'none',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                '&.Mui-disabled': {
                  bgcolor: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.2)',
                },
              }}
            >
              <NavigateBeforeIcon />
            </Fab>

            <Stack direction="row" spacing={0.5}>
              {DEMO_CHAPTERS.map((_, idx) => (
                <Box
                  key={idx}
                  sx={{
                    width: idx === currentChapter ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    bgcolor: idx === currentChapter ? theme.accent : 'rgba(255,255,255,0.3)',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </Stack>

            {currentChapter === totalChapters - 1 ? (
              <Fab
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose();
                }}
                sx={{
                  bgcolor: theme.accent,
                  color: theme.accentDark,
                  boxShadow: 'none',
                  '&:hover': { bgcolor: theme.accent, opacity: 0.9 },
                }}
              >
                <ShareIcon />
              </Fab>
            ) : (
              <Fab
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  boxShadow: 'none',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                }}
              >
                <NavigateNextIcon />
              </Fab>
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default WrappedStories;
