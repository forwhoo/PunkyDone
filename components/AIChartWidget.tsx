import React, { useState } from 'react';
import { Card } from './UIComponents';
import { Flame, RefreshCcw } from 'lucide-react';
import { generateRandomCategory } from '../services/geminiService';

export const AIChartWidget: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    const handleRespin = async () => {
        setLoading(true);
        const result = await generateRandomCategory();
        setData(result);
        setLoading(false);
    };

    // Initial load? Maybe not, let user click to engage.
    // Or load one initially.
    
    // Default state if nothing loaded
    if (!data && !loading) {
       // Auto load once on mount? Better do it via effect in real app, but for now simple check
       // We'll just show a "Generate" ui first
    }

    return (
        <Card className="bg-gradient-to-br from-[#1C1C1E] to-[#2C2C2E] border border-white/5 relative overflow-hidden min-h-[300px] flex flex-col">
             {/* AI Decoriation */}
             <div className="absolute -top-10 -right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-[60px]" />
             <div className="absolute bottom-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px]" />

            <div className="p-5 flex justify-between items-start z-10 relative">
                <div>
                     <div className="flex items-center gap-2 mb-1">
                        <div className="bg-purple-500/20 p-1.5 rounded-lg">
                            <Flame className="w-4 h-4 text-purple-400" />
                        </div>
                        <span className="text-[#8E8E93] text-[10px] font-bold uppercase tracking-widest">AI Spotlight</span>
                     </div>
                     <h3 className="text-xl font-bold text-white leading-tight">
                        {data ? data.title : "Discover Something New"}
                     </h3>
                     <p className="text-white/50 text-xs mt-1">
                        {data ? data.description : "Generate a custom ranking based on random vibes."}
                     </p>
                </div>
                <button 
                    onClick={handleRespin}
                    disabled={loading}
                    className={`p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all ${loading ? 'animate-spin' : 'hover:rotate-180'}`}
                >
                    <RefreshCcw className="w-4 h-4 text-white" />
                </button>
            </div>

            <div className="flex-1 p-5 pt-0 z-10 overflow-y-auto custom-scrollbar">
                {loading ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-white/50">
                         <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                         <span className="text-xs">Consulting the algorithm...</span>
                    </div>
                ) : !data ? (
                     <div className="h-full flex items-center justify-center">
                        <button 
                            onClick={handleRespin}
                            className="bg-white text-black px-6 py-2.5 rounded-full font-bold text-sm hover:scale-105 transition-transform"
                        >
                            Generate Magic List
                        </button>
                     </div>
                ) : (
                    <div className="space-y-3">
                        {data.items?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 group">
                                <span className="text-white/30 font-black text-xl w-6">{item.rank}</span>
                                <div className="flex-1 p-3 bg-white/5 rounded-xl flex items-center gap-3 hover:bg-white/10 transition-colors border border-white/5">
                                    {item.image && (
                                        <img src={item.image} alt="art" className="w-10 h-10 rounded-md object-cover" />
                                    )}
                                    <div className="flex-1">
                                        <h4 className="text-white font-medium text-sm">{item.title}</h4>
                                        <p className="text-white/40 text-xs">{item.subtitle}</p>
                                    </div>
                                    <span className="text-xs font-bold text-purple-400">{item.value}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Card>
    );
};
