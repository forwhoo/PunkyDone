import React, { useState, useEffect, useRef } from 'react';
import { Clock, Music, Headphones, Sparkles, Send, Zap, Mic2 } from 'lucide-react';
import { Button } from './UIComponents';

// --- Typewriter Component ---
const Typewriter = ({ text }: { text: string }) => {
  // Simple markdown image parser: ![Alt](Url)
  const imageMatch = text.match(/!\[(.*?)\]\((.*?)\)/);
  const cleanText = text.replace(/!\[(.*?)\]\((.*?)\)/, '').trim();

  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < cleanText.length) {
        setDisplayedText(prev => prev + cleanText.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 20); 
    return () => clearInterval(timer);
  }, [text]); // Reset on full text change

  return (
    <div className='flex flex-col gap-2'>
        <span className="text-lg md:text-xl font-medium text-white leading-relaxed">
        {displayedText}
        <span className="inline-block w-[2px] h-5 ml-1 bg-[#FA2D48] align-middle animate-pulse"></span>
        </span>
        {imageMatch && (
            <div className="mt-2 rounded-lg overflow-hidden border border-white/10 w-fit max-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500">
                <img src={imageMatch[2]} alt={imageMatch[1]} className="w-full object-cover" />
                <div className="bg-black/50 p-1 text-[10px] text-white/70 text-center">{imageMatch[1]}</div>
            </div>
        )}
    </div>
  );
};

// --- Wave Animation Component ---
const WaveLoading = () => (
    <div className="flex items-center gap-1 h-6">
        {/* Changed wave color to #FA2D48 to match the cursor/theme */}
        <div className="w-1 bg-[#FA2D48] rounded-full wave-bar h-1"></div>
        <div className="w-1 bg-[#FA2D48] rounded-full wave-bar h-1"></div>
        <div className="w-1 bg-[#FA2D48] rounded-full wave-bar h-1"></div>
        <div className="w-1 bg-[#FA2D48] rounded-full wave-bar h-1"></div>
    </div>
);

// --- Hero Card Component ---
interface HeroCardProps {
  title: string;
  subtitle: string;
  meta: string;
  gradientClass: string;
  icon?: React.ElementType;
  children?: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
}

const HeroCard = ({ title, subtitle, meta, gradientClass, icon: Icon, children, onClick, loading }: HeroCardProps) => (
  <div className="relative flex-shrink-0 w-[85vw] md:w-[400px] h-[220px] rounded-2xl overflow-hidden snap-start cursor-pointer group border border-white/5 bg-[#1C1C1E]">
    {/* Aurora Gradient Background */}
    <div className={`absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-700 ${gradientClass}`}></div>
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
    
    <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
      <div className="flex justify-between items-start">
        <div>
           <span className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-1 block">{subtitle}</span>
           <h3 className="text-xl md:text-2xl font-bold text-white leading-tight max-w-[90%] drop-shadow-md">{title}</h3>
        </div>
        {Icon && <Icon className="w-5 h-5 text-white/80" />}
      </div>
      
      <div className="flex items-end justify-between">
        <span className="text-sm font-medium text-white/90">{meta}</span>
        {children}
      </div>
    </div>
  </div>
);

interface HeroCarouselProps {
  insight: string | null;
  loadingInsight: boolean;
  onGenerateInsight: (query?: string) => void;
  topArtistImage?: string;
  topAlbumImage?: string;
  weeklyStats?: { weeklyTime: string; weeklyTrend: string; totalTracks: number };
  topGenre?: string;
  longestSession?: { title: string; artist: string; cover: string; duration: string; timeStr?: string };
  recentPlays?: any[];
  topSongs?: any[];
}

const SUGGESTIONS = [
    { label: "Analyze my top genres", icon: Music, color: "from-pink-500 to-rose-500" },
    { label: "Predict my next favorite", icon: Sparkles, color: "from-purple-500 to-indigo-500" },
    { label: "Morning drive vibe", icon: Headphones, color: "from-orange-400 to-amber-400" },
    { label: "Workout energy check", icon: Clock, color: "from-emerald-500 to-teal-500" },
];

export const HeroCarousel = ({ insight, loadingInsight, onGenerateInsight, topArtistImage, topAlbumImage, weeklyStats, topGenre, longestSession, recentPlays = [], topSongs = [] }: HeroCarouselProps) => {
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
  // Calculate stats from real data
  const todayPlays = recentPlays.filter((play: any) => {
    const playDate = new Date(play.played_at);
    const today = new Date();
    return playDate.toDateString() === today.toDateString();
  });
  
  const mostPlayedToday = todayPlays.length > 0 ? todayPlays.reduce((acc: any, curr: any) => {
    const existing = acc.find((item: any) => item.track_name === curr.track_name);
    if (existing) existing.count++;
    else acc.push({ ...curr, count: 1 });
    return acc;
  }, []).sort((a: any, b: any) => b.count - a.count)[0] : null;
  
  // Calculate peak listening hour
  const hourCounts: Record<number, number> = {};
  todayPlays.forEach((play: any) => {
    const hour = new Date(play.played_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0];
  const peakHourFormatted = peakHour ? `${peakHour[0] % 12 || 12}${parseInt(peakHour[0]) >= 12 ? 'PM' : 'AM'}` : 'N/A';
  
  const handleGenerate = () => {
    // Reveal input or generate default
    if (!showInput) {
        setShowInput(true);
    } else if (inputValue.trim()) {
        onGenerateInsight(inputValue);
        setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleGenerate();
    }
  };

  return (
    <div className="w-full mb-10">
      
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x scroll-smooth -mx-1 px-1">
        
        {/* WIDGETS REMOVED */}

      </div>
    </div>
  );
};