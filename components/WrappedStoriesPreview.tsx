import React, { useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import { WrappedStories } from './WrappedStories';

// Material Design 3 dark theme for the preview page
const previewTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#D0BCFF',
      contrastText: '#381E72',
    },
    secondary: {
      main: '#CCC2DC',
    },
    background: {
      default: '#1C1B1F',
      paper: '#2B2930',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 28,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 100,
          textTransform: 'none',
          fontWeight: 700,
          padding: '12px 32px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 28,
          backgroundImage: 'none',
        },
      },
    },
  },
});

export const WrappedStoriesPreview: React.FC = () => {
  const [isStoriesOpen, setIsStoriesOpen] = useState(false);

  return (
    <ThemeProvider theme={previewTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        {/* Preview Card */}
        <Card
          elevation={0}
          sx={{
            maxWidth: 480,
            width: '100%',
            bgcolor: 'background.paper',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            {/* Header */}
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '24px',
                bgcolor: 'rgba(208, 188, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>

            <Chip
              label="Material Design 3 Demo"
              size="small"
              sx={{
                mb: 2,
                bgcolor: 'rgba(208, 188, 255, 0.15)',
                color: 'primary.main',
                fontWeight: 600,
              }}
            />

            <Typography
              variant="h4"
              sx={{ fontWeight: 800, mb: 1, color: '#fff' }}
            >
              Punky Wrapped
            </Typography>

            <Typography
              variant="body1"
              sx={{ color: 'text.secondary', mb: 4, lineHeight: 1.6 }}
            >
              Your weekly listening story with 5 interactive chapters.
              Built with Material Design 3 components.
            </Typography>

            {/* Chapter Preview Chips */}
            <Stack
              direction="row"
              spacing={1}
              sx={{ mb: 4, justifyContent: 'center', flexWrap: 'wrap', gap: 1 }}
            >
              {['Top Artist', 'Top Song', 'Stats', 'Genre', 'Summary'].map((label) => (
                <Chip
                  key={label}
                  label={label}
                  variant="outlined"
                  size="small"
                  icon={<MusicNoteIcon sx={{ fontSize: 14 }} />}
                  sx={{
                    borderColor: 'rgba(255,255,255,0.15)',
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                  }}
                />
              ))}
            </Stack>

            {/* Launch Button */}
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={() => setIsStoriesOpen(true)}
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontSize: '1rem',
                px: 5,
                py: 1.5,
                '&:hover': {
                  bgcolor: '#E8DDFF',
                },
              }}
            >
              View Your Wrapped
            </Button>
          </CardContent>
        </Card>

        {/* Footnote */}
        <Typography
          variant="caption"
          sx={{
            mt: 3,
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'center',
          }}
        >
          Demo preview • Tap left/right to navigate stories
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
