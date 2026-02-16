import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { WrappedStories } from './WrappedStories';

const LIME = '#BFFF00';
const BLACK = '#000000';
const MAGENTA = '#FF00FF';
const CYAN = '#00F0FF';
const WHITE = '#FFFFFF';
const BRUTAL_FONT = '"Impact", "Arial Black", "Helvetica Neue Bold", sans-serif';
const MONO_FONT = '"Courier New", "Courier", monospace';

const previewTheme = createTheme({
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
});

export const WrappedStoriesPreview: React.FC = () => {
  const [isStoriesOpen, setIsStoriesOpen] = useState(false);

  return (
    <ThemeProvider theme={previewTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: BLACK,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        {/* Preview Card — brutalist box */}
        <Box
          sx={{
            maxWidth: 520,
            width: '100%',
            border: `6px solid ${LIME}`,
            p: 4,
            textAlign: 'center',
            position: 'relative',
          }}
        >
          {/* Rotated corner label */}
          <Typography sx={{
            position: 'absolute', top: 12, right: -36,
            transform: 'rotate(90deg)',
            fontFamily: BRUTAL_FONT, fontSize: '0.7rem', fontWeight: 900,
            color: MAGENTA, letterSpacing: '0.3em',
          }}>
            DEMO
          </Typography>

          <Typography sx={{
            fontFamily: BRUTAL_FONT,
            fontSize: { xs: '3rem', sm: '4rem' },
            fontWeight: 900, lineHeight: 0.95,
            color: LIME,
            textShadow: `3px 3px 0 ${MAGENTA}`,
            mb: 1,
          }}>
            PUNKY WRAPPED
          </Typography>

          <Typography sx={{
            fontFamily: MONO_FONT, fontSize: '0.85rem', fontWeight: 700,
            color: WHITE, mb: 3, lineHeight: 1.6,
          }}>
            YOUR WEEKLY LISTENING STORY — 5 BRUTAL CHAPTERS.
            TAP LEFT/RIGHT TO NAVIGATE.
          </Typography>

          {/* Chapter labels */}
          <Box sx={{
            display: 'flex', flexWrap: 'wrap', gap: '4px',
            justifyContent: 'center', mb: 4,
          }}>
            {['#1 ARTIST', 'TOP 5', 'TIMELINE', 'GENRES', 'PERSONALITY'].map((label, i) => (
              <Box key={label} sx={{
                border: `3px solid ${[LIME, MAGENTA, CYAN, '#FF6B00', WHITE][i]}`,
                px: 1.5, py: 0.5,
              }}>
                <Typography sx={{
                  fontFamily: BRUTAL_FONT, fontSize: '0.7rem', fontWeight: 900,
                  color: [LIME, MAGENTA, CYAN, '#FF6B00', WHITE][i],
                  letterSpacing: '0.1em',
                }}>
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Launch Button */}
          <Box
            component="button"
            onClick={() => setIsStoriesOpen(true)}
            sx={{
              fontFamily: BRUTAL_FONT, fontSize: '1.1rem', fontWeight: 900,
              color: BLACK, bgcolor: LIME,
              border: `4px solid ${LIME}`,
              px: 4, py: 1.5, cursor: 'pointer',
              letterSpacing: '0.15em',
              display: 'inline-flex', alignItems: 'center', gap: 1,
              '&:hover': { bgcolor: '#a0d900' },
            }}
          >
            <PlayArrowIcon sx={{ fontSize: 24, color: BLACK }} />
            VIEW YOUR WRAPPED
          </Box>
        </Box>

        {/* Footnote */}
        <Typography sx={{
          mt: 3, fontFamily: MONO_FONT, fontSize: '0.7rem',
          fontWeight: 700, color: '#555', letterSpacing: '0.15em',
        }}>
          PUNK ZINE STYLE — NOT MATERIAL DESIGN
        </Typography>

        {/* Stories Modal */}
        <WrappedStories
          isOpen={isStoriesOpen}
          onClose={() => setIsStoriesOpen(false)}
        />
      </Box>
    </ThemeProvider>
  );
};

export default WrappedStoriesPreview;
