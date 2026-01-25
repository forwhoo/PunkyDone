import React, { useState, useEffect, useRef } from 'react';
import { Clock, Music, Headphones, Sparkles, Send } from 'lucide-react';
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

export const HeroCarousel = ({ insight, loadingInsight, onGenerateInsight }: HeroCarouselProps) => {
  const [inputValue, setInputValue] = useState('');
  
  const handleSend = () => {
      if (!inputValue.trim()) return;
      onGenerateInsight(inputValue);
      setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleSend();
      }
  };

  return (
    <div className="w-full mb-12">
      <h2 className="text-[32px] font-bold text-white mb-6 tracking-tight">For You</h2>
      <div className="flex gap-4 overflow-x-auto pb-8 -mx-6 px-6 md:mx-0 md:px-0 no-scrollbar snap-x scroll-smooth">
        
        {/* Card 1: AI Insight (Music Intelligence) */}
        <div className="relative flex-shrink-0 w-[85vw] md:w-[480px] h-[220px] rounded-2xl overflow-hidden snap-start border border-white/5 bg-[#1C1C1E] flex flex-col group">
            {/* Dark elegant background with subtle spotlight */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#2C2C2E] to-[#141414]"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-white/10 transition-colors duration-500"></div>
            
            <div className="relative z-10 p-6 flex flex-col h-full justify-between">
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-gray-400" />
                            <span className="text-[11px] uppercase tracking-widest text-shine">Music Intelligence</span>
                        </div>
                        {loadingInsight && <WaveLoading />}
                    </div>
                    
                    <div className="min-h-[60px]">
                        {loadingInsight ? (
                            <span className="text-white/50 text-sm animate-pulse">Thinking...</span>
                        ) : insight ? (
                            <Typewriter text={insight} />
                        ) : (
                             <div className="max-w-[85%]">
                                 <h3 className="text-2xl font-bold text-white mb-2">Your Daily Recap</h3>
                                 <p className="text-[#9CA3AF] text-sm leading-relaxed">Unlock deep insights about your listening habits.</p>
                             </div>
                        )}
                    </div>
                </div>
                
                <div className="w-full mt-auto">
                  {!insight && !loadingInsight ? (
                     <Button 
                         onClick={() => onGenerateInsight()} 
                         className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10 rounded-full px-5 h-9 text-xs font-semibold transition-all"
                     >
                         Generate Insight
                     </Button>
                  ) : (
                    // Chat Input Box
                    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 border border-white/10 animate-fade-in-up w-full mt-2">
                        <input 
                          type="text" 
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Ask about your history..." 
                          className="bg-transparent border-none outline-none text-[13px] text-white placeholder-white/40 flex-1 min-w-0"
                          autoFocus
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!inputValue.trim() || loadingInsight}
                            className="text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </div>
                  )}
                </div>
            </div>
        </div>

        {/* Card 2: Weekly Time */}
        <HeroCard 
            title="21h 14m" 
            subtitle="Weekly Time" 
            meta="+2h vs last week"
            gradientClass="bg-[conic-gradient(at_bottom_right,_var(--tw-gradient-stops))] from-orange-500 via-rose-500 to-transparent blur-2xl"
            icon={Clock}
        />

        {/* Card 3: Top Genre */}
        <HeroCard 
            title="Pop" 
            subtitle="Top Genre" 
            meta="45% of total plays"
            gradientClass="bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500 via-teal-500 to-transparent blur-2xl"
            icon={Music}
        />

        {/* Card 4: New Discoveries */}
        <HeroCard 
            title="24 Tracks" 
            subtitle="New Music" 
            meta="Added to library"
            gradientClass="bg-[conic-gradient(at_top_left,_var(--tw-gradient-stops))] from-indigo-500 via-purple-500 to-transparent blur-2xl"
            icon={Headphones}
        />

      </div>
    </div>
  );
};