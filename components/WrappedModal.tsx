import React, { useEffect, useState } from 'react';
import { X, Share2, Sparkles, Music2, Calendar } from 'lucide-react';
import { generateWrappedStory } from '../services/geminiService';

interface WrappedModalProps {
    isOpen: boolean;
    onClose: () => void;
    period?: string; // 'Day', 'Week', 'Month'
}

export const WrappedModal: React.FC<WrappedModalProps> = ({ isOpen, onClose, period = "Week" }) => {
    const [step, setStep] = useState(0);
    const [story, setStory] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            generateWrappedStory(period).then(data => {
                setStory(data);
                setLoading(false);
            });
            setStep(0);
        }
    }, [isOpen, period]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <button 
                onClick={onClose} 
                className="absolute top-6 right-6 p-2 bg-white/10 rounded-full hover:bg-white/20 z-50 transition-colors"
            >
                <X className="text-white w-6 h-6" />
            </button>
            
            <div className="w-full max-w-sm aspect-[9/16] bg-[#1C1C1E] rounded-3xl overflow-hidden relative shadow-2xl border border-white/10 flex flex-col">
                {/* Story Progress Bar */}
                <div className="absolute top-4 left-4 right-4 flex gap-1 z-20">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                            <div 
                                className={`h-full bg-white transition-all duration-500 ease-linear ${step > i ? 'w-full' : step === i ? 'w-full bg-white animate-progress' : 'w-0'}`} 
                            />
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4">
                        <Sparkles className="w-12 h-12 text-[#FA2D48] animate-pulse" />
                        <p className="text-white font-medium animate-pulse">Analyzing your vibes...</p>
                    </div>
                ) : (
                    <div className="flex-1 relative" onClick={() => setStep(prev => prev < 2 ? prev + 1 : prev)}>
                        {/* Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-b from-[#FA2D48]/20 to-black/80 pointer-events-none" />
                        <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#FA2D48] rounded-full blur-[100px] opacity-30 animate-pulse" />

                        {/* Content based on step */}
                        <div className="relative z-10 h-full flex flex-col p-8 pt-20">
                            {step === 0 && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
                                    <h2 className="text-4xl font-black text-white leading-tight">
                                        Your {period}<br /> <span className="text-[#FA2D48]">Wrapped</span>
                                    </h2>
                                    <div className="w-full aspect-square bg-[#2C2C2E] rounded-2xl flex items-center justify-center shadow-lg transform rotate-[-2deg]">
                                        <div className="text-center">
                                            <Music2 className="w-16 h-16 text-white mb-2 mx-auto" />
                                            <p className="text-white/50 text-sm">Top Genre</p>
                                            <p className="text-2xl font-bold text-white">{story?.topGenre || "Pop"}</p>
                                        </div>
                                    </div>
                                    <p className="text-xl text-white font-medium leading-relaxed">
                                        "{story?.storyText || "You listened to a lot of music this week!"}"
                                    </p>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-10 fade-in duration-500">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-6 h-6 text-[#FA2D48]" />
                                        <span className="text-white font-bold uppercase tracking-widest text-sm">Time Check</span>
                                    </div>
                                    
                                    <div className="text-center py-10">
                                        <span className="text-[80px] font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50 leading-none">
                                            {Math.round((story?.listeningMinutes || 1200) / 60)}
                                        </span>
                                        <p className="text-2xl text-white font-bold mt-2">Hours Streamed</p>
                                    </div>

                                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                                        <p className="text-white/80 text-lg text-center italic">
                                            Thats like flying from New York to London while vibing non-stop.
                                        </p>
                                    </div>
                                </div>
                            )}

                             {step === 2 && (
                                <div className="h-full flex flex-col justify-center animate-in zoom-in-95 fade-in duration-500">
                                     <h2 className="text-3xl font-bold text-center text-white mb-10">See you next {period.toLowerCase()}!</h2>
                                     
                                     <div className="flex justify-center mb-10">
                                         <div className="relative group cursor-pointer">
                                             <div className="absolute inset-0 bg-[#FA2D48] blur-xl opacity-50 group-hover:opacity-80 transition-opacity"></div>
                                             <div className="relative w-40 h-40 bg-black rounded-full border-4 border-[#FA2D48] flex items-center justify-center">
                                                 <span className="text-6xl">🔥</span>
                                             </div>
                                         </div>
                                     </div>

                                     <button className="w-full py-4 bg-white text-black font-bold rounded-full text-lg hover:scale-105 transition-transform flex items-center justify-center gap-2">
                                        <Share2 className="w-5 h-5"/> Share Story
                                     </button>
                                </div>
                            )}
                        </div>

                         <div className="absolute bottom-6 left-0 right-0 text-center text-white/30 text-xs">
                             Tap to continue
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};
