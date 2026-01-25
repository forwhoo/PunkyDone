import React, { useState, useEffect, useRef } from 'react';
import { Clock, Music, Headphones, Sparkles, Send, Zap } from 'lucide-react';
import { Button } from './UIComponents';

// --- Typewriter Component ---
const Typewriter = ({ text }: { text: string }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(prev => prev + text.charAt(i));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 20); // Typing speed
    return () => clearInterval(timer);
  }, [text]);

  return (
    <span className="text-lg md:text-xl font-medium text-white leading-relaxed">
      {displayedText}
      {/* Changed cursor color to #FA2D48 (red) */}
      <span className="inline-block w-[2px] h-5 ml-1 bg-[#FA2D48] align-middle animate-pulse"></span>
    </span>
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
}

const SUGGESTIONS = [
    { label: "Analyze my top genres", icon: Music, color: "from-pink-500 to-rose-500" },
    { label: "Predict my next favorite", icon: Sparkles, color: "from-purple-500 to-indigo-500" },
    { label: "Morning drive vibe", icon: Headphones, color: "from-orange-400 to-amber-400" },
    { label: "Workout energy check", icon: Clock, color: "from-emerald-500 to-teal-500" },
];

export const HeroCarousel = ({ insight, loadingInsight, onGenerateInsight }: HeroCarouselProps) => {
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');
  
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
        
        {/* CARD 1: MUSIC INTELLIGENCE (Interactive) */}
        <div className="relative flex-shrink-0 w-[300px] md:w-[480px] h-[220px] rounded-xl overflow-hidden snap-start border border-white/5 bg-[#1C1C1E] flex flex-col group">
             {/* Subdued Dark Background */}
             <div className="absolute inset-0 bg-[#1C1C1E]"></div>
             <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-white/10 transition-colors"></div>

             <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                         <Sparkles className="w-4 h-4 text-white/60" />
                         <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">Music Intelligence</span>
                    </div>

                    <div className="min-h-[60px]">
                        {loadingInsight ? (
                            <div className="flex items-center gap-2">
                                <WaveLoading />
                                <span className="text-white/50 text-sm animate-pulse">Thinking...</span>
                            </div>
                        ) : insight ? (
                            <div className="text-white/90 text-[15px] leading-relaxed">
                                <Typewriter text={insight} />
                            </div>
                        ) : (
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">Your Daily Recap</h3>
                                <p className="text-[#9CA3AF] text-sm leading-relaxed">Unlock deep insights about your listening habits.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-4">
                    {showInput ? (
                        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                             <input 
                                autoFocus
                                className="bg-transparent w-full text-sm text-white placeholder:text-white/30 focus:outline-none"
                                placeholder="Ask about your music..."
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                             />
                             <div 
                                onClick={handleGenerate}
                                className="bg-[#FA2D48] p-1.5 rounded-md cursor-pointer hover:bg-red-600"
                             >
                                <Send className="w-3 h-3 text-white" />
                             </div>
                        </div>
                    ) : (
                        <Button 
                            onClick={handleGenerate}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-lg px-4 h-10 text-sm font-semibold transition-all w-fit"
                        >
                            Generate Insight
                        </Button>
                    )}
                </div>
             </div>
        </div>

        {/* CARD 2: WEEKLY TIME */}
        <HeroCard 
            title="21h 14m" 
            subtitle="Weekly Time" 
            meta="+2h vs last week"
            gradientClass="bg-gradient-to-br from-orange-500/20 via-rose-500/10 to-transparent"
            icon={Clock}
        />

        {/* CARD 3: TOP GENRE */}
        <HeroCard 
            title="Pop" 
            subtitle="Top Genre" 
            meta="45% of total plays"
            gradientClass="bg-gradient-to-tl from-emerald-500/80 via-teal-500/50 to-transparent mix-blend-overlay"
            icon={Music}
            image={topArtistImage}
        />
        
        {/* CARD 4: NEW DISCOVERIES */}
        <HeroCard 
            title="24 Tracks" 
            subtitle="New Music" 
            meta="Added to library"
            gradientClass="bg-gradient-to-br from-purple-500/80 via-indigo-500/50 to-transparent mix-blend-overlay"
            icon={Headphones}
            image={topAlbumImage}
        />

      </div>
    </div>
  );
};