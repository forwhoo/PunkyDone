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
      <h2 className="text-[22px] font-bold text-white tracking-tight mb-6 px-1">For You</h2>
      
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x scroll-smooth -mx-1 px-1">
        
        {/* CARD 1: TOP ARTIST HIGHLIGHT */}
        <div className="relative flex-shrink-0 w-[300px] md:w-[480px] h-[220px] rounded-xl overflow-hidden snap-start border border-white/5 bg-gradient-to-br from-[#FA2D48]/10 to-[#1C1C1E]">
             <div className="absolute inset-0 opacity-10">
                <img src={topArtistImage} alt="Top Artist" className="w-full h-full object-cover blur-xl" />
             </div>
             <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                         <Mic2 className="w-4 h-4 text-white/60" />
                         <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">Top Artist</span>
                    </div>
                    <h3 className="text-3xl font-black text-white mb-2">On Repeat</h3>
                    <p className="text-white/70 text-sm">Your most played artist this week</p>
                </div>
                <div className="flex items-center gap-3">
                    <img src={topArtistImage} alt="Top" className="w-12 h-12 rounded-full border-2 border-white/20" />
                    <div>
                        <p className="text-white font-bold text-sm">{topGenre}</p>
                        <p className="text-white/50 text-xs">Trending in your library</p>
                    </div>
                </div>
             </div>
        </div>

        {/* CARD 2: WEEKLY TIME */}
        <HeroCard 
            title={weeklyStats?.weeklyTime || "0h 0m"}
            subtitle="Weekly Time" 
            meta={weeklyStats?.weeklyTrend || "vs last week"}
            gradientClass="bg-gradient-to-br from-orange-500/20 via-rose-500/10 to-transparent"
            icon={Clock}
        >
             {/* Simple Firework CSS effect */}
             <div className="absolute top-4 right-4 grid grid-cols-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="w-1 h-1 bg-yellow-400 rounded-full animate-ping"></span>
                <span className="w-1 h-1 bg-orange-500 rounded-full animate-ping delay-75"></span>
             </div>
        </HeroCard>

        {/* CARD 3: TOP GENRE */}
        <HeroCard 
            title={topGenre || "Pop"} 
            subtitle="Top Genre" 
            meta="Most Played"
            gradientClass="bg-gradient-to-tl from-emerald-500/80 via-teal-500/50 to-transparent mix-blend-overlay"
            icon={Music}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-pulse"></div>
            {topArtistImage && (
                 <div className="absolute right-0 bottom-0 w-32 h-32 opacity-20 -mr-4 -mb-4 rotate-12 bg-cover bg-center rounded-full blur-[1px] group-hover:scale-110 transition-transform duration-500" style={{ backgroundImage: `url(${topArtistImage})` }}></div>
            )}
        </HeroCard>
        
        {/* CARD 4: TOP TIME PLAYING (Longest Session / Most Played Song) */}
        {longestSession ? (
          <HeroCard
              title={longestSession.title}
              subtitle="Longest Listening"
              meta={`${longestSession.timeStr || longestSession.duration} Total Time`}
              gradientClass="bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-transparent"
              icon={Zap}
          >
              <div className="absolute right-4 bottom-4 w-20 h-20 rounded-lg overflow-hidden shadow-2xl border border-white/10 group-hover:scale-105 transition-transform rotate-3">
                  <img src={longestSession.cover} alt="" className="w-full h-full object-cover" />
              </div>
          </HeroCard>
        ) : (
           <HeroCard 
            title={weeklyStats ? `${weeklyStats.totalTracks} Tracks` : "Loading..."}
            subtitle="Total History" 
            meta="Stored in Punky DB"
            gradientClass="bg-gradient-to-br from-purple-500/80 via-indigo-500/50 to-transparent mix-blend-overlay"
            icon={Headphones}
           >
             {topAlbumImage && (
                 <div className="absolute right-0 bottom-0 w-full h-full opacity-10 bg-cover bg-center rounded-2xl" style={{ backgroundImage: `url(${topAlbumImage})` }}></div>
            )}
           </HeroCard>
        )}
        
        {/* CARD 5: MOST PLAYED TODAY */}
        {mostPlayedToday && (
          <HeroCard
              title={mostPlayedToday.track_name}
              subtitle="On Repeat Today"
              meta={`${mostPlayedToday.count} ${mostPlayedToday.count === 1 ? 'play' : 'plays'}`}
              gradientClass="bg-gradient-to-r from-pink-500/30 via-purple-500/20 to-transparent"
              icon={Music}
          >
              <div className="absolute right-4 bottom-4 w-16 h-16 rounded-lg overflow-hidden shadow-2xl border border-white/10 group-hover:scale-110 transition-transform -rotate-6">
                  <img src={mostPlayedToday.album_cover || mostPlayedToday.cover} alt="" className="w-full h-full object-cover" />
              </div>
          </HeroCard>
        )}
        
        {/* CARD 6: PEAK LISTENING TIME */}
        {peakHour && (
          <HeroCard
              title={peakHourFormatted}
              subtitle="Peak Listening"
              meta={`${peakHour[1]} ${peakHour[1] === 1 ? 'song' : 'songs'} played`}
              gradientClass="bg-gradient-to-br from-yellow-500/30 via-amber-500/20 to-transparent"
              icon={Clock}
          >
              <div className="absolute top-6 right-6 text-6xl opacity-20 group-hover:opacity-30 transition-opacity">🎧</div>
          </HeroCard>
        )}
        
        {/* CARD 7: LISTENING ACTIVITY */}
        <HeroCard
            title={`${todayPlays.length} Songs`}
            subtitle="Today's Activity"
            meta={todayPlays.length > 0 ? "You're on fire!" : "Start listening"}
            gradientClass="bg-gradient-to-r from-green-500/30 via-emerald-500/20 to-transparent"
            icon={Headphones}
        >
            <div className="absolute bottom-4 right-4 flex gap-1">
                {Array.from({length: Math.min(5, Math.ceil(todayPlays.length / 5))}).map((_, i) => (
                    <div key={i} className="w-1 bg-green-400 rounded-full animate-pulse" style={{height: `${20 + i * 8}px`, animationDelay: `${i * 100}ms`}}></div>
                ))}
            </div>
        </HeroCard>

      </div>
    </div>
  );
};