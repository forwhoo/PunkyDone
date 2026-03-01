import React, { useState, useEffect, useRef } from 'react';
import { Clock, Music, Headphones, Sparkles, Send, Zap, Mic2 } from 'lucide-react';
import { Button } from './UIComponents';

// --- Typewriter Component ---
const Typewriter = ({ text }: { text: string }) => {
  // Simple markdown image parser: ![Alt](Url)
  const safeText = text || '';
  const imageMatch = safeText.match(/!\[(.*?)\]\((.*?)\)/);
  const cleanText = safeText.replace(/!\[(.*?)\]\((.*?)\)/, '').trim();

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
        <span className="text-lg md:text-xl font-medium text-[#141413] leading-relaxed">
        {displayedText}
        <span className="inline-block w-[2px] h-5 ml-1 bg-[#d97757] align-middle animate-pulse"></span>
        </span>
        {imageMatch && (
            <div className="mt-2 rounded-lg overflow-hidden border border-[#e8e6dc] w-fit max-w-[200px] animate-in fade-in slide-in-from-bottom-2 duration-500 delay-500">
                <img src={imageMatch[2]} alt={imageMatch[1]} className="w-full object-cover" />
                <div className="bg-[#faf9f5]/50 p-1 text-[10px] text-[#141413]/70 text-center">{imageMatch[1]}</div>
            </div>
        )}
    </div>
  );
};

// --- Wave Animation Component ---
const WaveLoading = () => (
    <div className="flex items-center gap-1 h-6">
        {/* Changed wave color to #FA2D48 to match the cursor/theme */}
        <div className="w-1 bg-[#d97757] rounded-full wave-bar h-1"></div>
        <div className="w-1 bg-[#d97757] rounded-full wave-bar h-1"></div>
        <div className="w-1 bg-[#d97757] rounded-full wave-bar h-1"></div>
        <div className="w-1 bg-[#d97757] rounded-full wave-bar h-1"></div>
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
  <div className="relative flex-shrink-0 w-[85vw] md:w-[400px] h-[220px] rounded-2xl overflow-hidden snap-start cursor-pointer group border border-[#e8e6dc] bg-white">
    {/* Aurora Gradient Background */}
    <div className={`absolute inset-0 opacity-40 group-hover:opacity-60 transition-opacity duration-700 ${gradientClass}`}></div>
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
    
    <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
      <div className="flex justify-between items-start">
        <div>
           <span className="text-[10px] font-bold uppercase tracking-widest text-[#141413]/70 mb-1 block">{subtitle}</span>
           <h3 className="text-xl md:text-2xl font-bold text-[#141413] leading-tight max-w-[90%] drop-shadow-md">{title}</h3>
        </div>
        {Icon && <Icon className="w-5 h-5 text-[#141413]/80" />}
      </div>
      
      <div className="flex items-end justify-between">
        <span className="text-sm font-medium text-[#141413]/90">{meta}</span>
        {children}
      </div>
    </div>
  </div>
);

interface HeroCarouselProps {
  userImage?: string;
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

export const HeroCarousel = ({ userImage, insight, loadingInsight, onGenerateInsight, topArtistImage, topAlbumImage, weeklyStats, topGenre, longestSession, recentPlays = [], topSongs = [] }: HeroCarouselProps) => {
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
    <div className="w-full mb-8 flex justify-center">
      {/* Replaced Weekly Insight content with User Profile Image */}
      <div className="relative group">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-[#1C1C1E] shadow-2xl relative z-10">
               {userImage ? (
                   <img src={userImage} alt="User" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
               ) : (
                   <div className="w-full h-full bg-[#2C2C2E] flex items-center justify-center">
                       <Music className="w-10 h-10 text-[#141413]/20" />
                   </div>
               )}
          </div>
          {/* Glow effect */}
          <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-[#FA2D48]/20 to-transparent blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
    </div>
  );
};