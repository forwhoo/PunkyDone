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
  const [inputValue, setInputValue] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState<number>(0);

  // Auto-rotate suggestions for visual effect (optional)
  useEffect(() => {
      const interval = setInterval(() => {
          setActiveSuggestion(prev => (prev + 1) % SUGGESTIONS.length);
      }, 5000);
      return () => clearInterval(interval);
  }, []);
  
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
        <h2 className="text-[22px] font-bold text-white tracking-tight mb-6 px-1">AI Music Intelligence</h2>
        
        <div className="relative rounded-3xl overflow-hidden bg-[#1C1C1E] border border-white/5 min-h-[320px] flex flex-col md:flex-row shadow-2xl">
            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1C1C1E] via-[#2C2C2E] to-black z-0"></div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#FA2D48] opacity-5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600 opacity-5 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2"></div>
            
            {/* Left Content */}
            <div className="relative z-10 flex-1 p-8 flex flex-col justify-between">
                <div>
                     <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6 shadow-inner">
                        <Sparkles className="w-3.5 h-3.5 text-[#FA2D48]" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-white/80">Powered by Gemini</span>
                     </div>
                     
                     <div className="mb-6 min-h-[80px]">
                         {loadingInsight ? (
                            <div className="flex items-center gap-3 text-white/50 h-full">
                                <WaveLoading />
                                <span className="text-lg font-medium animate-pulse ml-2">Analyzing your taste profile...</span>
                            </div>
                         ) : (
                             <Typewriter text={insight || "Ask me anything about your music taste, or choose a suggestion to get started."} />
                         )}
                     </div>
                </div>

                <div className="relative mt-4 group">
                    <div className="absolute inset-0 bg-gradient-to-r from-[#FA2D48]/20 to-purple-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative flex items-center bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md transition-all focus-within:bg-black/60 focus-within:border-white/20">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about your listening habits..."
                            className="w-full bg-transparent pl-5 pr-14 py-4 text-white placeholder:text-white/30 focus:outline-none font-medium h-full"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={!inputValue.trim()}
                            className="absolute right-2 p-2 bg-[#FA2D48] hover:bg-[#d4253d] disabled:bg-white/5 disabled:text-white/20 text-white rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center p-2.5 m-1"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Side - Suggestions Carousel/Grid */}
            <div className="relative z-10 w-full md:w-[340px] border-l border-white/5 bg-black/20 backdrop-blur-sm p-6 flex flex-col justify-center">
                 <div className="flex items-center justify-between mb-4">
                     <div className="text-xs font-bold uppercase tracking-widest text-[#8E8E93]">Quick Actions</div>
                     <Zap className="w-3 h-3 text-[#FA2D48]" />
                 </div>
                 
                 <div className="space-y-3">
                     {SUGGESTIONS.map((s, i) => (
                         <button 
                            key={i}
                            onClick={() => onGenerateInsight(s.label)}
                            className={`group w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left relative overflow-hidden ${
                                i === activeSuggestion 
                                ? 'bg-white/10 border-white/10 shadow-lg' 
                                : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/5'
                            }`}
                         >
                             {/* Hover Gradient Effect */}
                             <div className={`absolute inset-0 bg-gradient-to-r ${s.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>

                             <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                 <s.icon className="w-5 h-5 text-white" />
                             </div>
                             <div className="flex-1 z-10">
                                 <div className="text-[13px] font-bold text-white group-hover:text-white transition-colors">{s.label}</div>
                                 <div className="text-[10px] text-white/50 group-hover:text-white/70">Tap to generate</div>
                             </div>
                         </button>
                     ))}
                 </div>
                 
                 <div className="mt-6 flex items-center justify-center gap-2">
                     {SUGGESTIONS.map((_, i) => (
                         <div 
                            key={i} 
                            className={`h-1 rounded-full transition-all duration-300 ${i === activeSuggestion ? 'w-6 bg-[#FA2D48]' : 'w-1 bg-white/10'}`}
                         ></div>
                     ))}
                 </div>
            </div>
        </div>
    </div>
  );
};