import React, { useState } from 'react';
import { Search, Sparkles, Wand2, Gift, Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { streamMusicQuestionWithTools, ToolCallInfo } from '../services/mistralService';
import { Tool, ToolPart } from './prompt-kit/tool';
import { AnimatePresence, motion } from 'framer-motion';

interface AISearchBarProps {
    token?: string | null;
    history?: any[];
    user?: any;
    contextData: any;
    onWrappedClick?: () => void;
}

const CollapsibleTools = ({ tools }: { tools: ToolPart[] }) => {
    const [isOpen, setIsOpen] = useState(false);
    if (!tools || tools.length === 0) return null;

    return (
        <div className="w-full mt-3 border border-white/5 rounded-xl overflow-hidden bg-white/[0.02]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-white/[0.03] transition-colors text-[10px] font-bold uppercase tracking-wider text-white/40"
            >
                <div className="flex items-center gap-2">
                    <Zap size={10} className="text-[#FF9F0A]" />
                    <span>AI Analysis ({tools.length})</span>
                </div>
                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-white/5 bg-black/20"
                    >
                        <div className="p-2 space-y-1">
                            {tools.map((tool, idx) => (
                                <Tool key={idx} toolPart={tool} className="my-0 border-white/5 bg-transparent scale-90 origin-left" />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export const AISearchBar: React.FC<AISearchBarProps> = ({ token, history = [], user, contextData, onWrappedClick }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState('');
    const [tools, setTools] = useState<ToolPart[]>([]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || loading) return;

        setLoading(true);
        setResponse('');
        setTools([]);

        try {
            // Memory: Use last 5 messages from history if available
            // Note: 'history' prop is actually raw play history in this app, not chat history.
            // But we can pass it as context.

            await streamMusicQuestionWithTools(
                query,
                contextData,
                (chunk) => {
                    if (chunk.type === 'text' && chunk.content) {
                        setResponse(prev => prev + chunk.content);
                    }
                    if (chunk.type === 'tool-call' && chunk.toolCall) {
                        setTools(prev => [...prev, {
                            type: chunk.toolCall!.name,
                            state: 'input-available',
                            input: chunk.toolCall!.arguments
                        }]);
                    }
                    if (chunk.type === 'tool-result' && chunk.toolCall) {
                        setTools(prev => {
                            const next = [...prev];
                            const idx = next.findIndex(t => t.type === chunk.toolCall!.name && t.state === 'input-available');
                            if (idx !== -1) {
                                next[idx] = { ...next[idx], state: 'output-available', output: chunk.toolCall!.result };
                            }
                            return next;
                        });
                    }
                },
                token,
                undefined,
                false, // web search off by default in search bar
                [] // no chat history yet in search bar component
            );
        } catch (error) {
            console.error('Search error:', error);
            setResponse('Sorry, something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full flex flex-col items-center gap-4">
            <form onSubmit={handleSearch} className="w-full relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-white/30 group-focus-within:text-[#FA2D48] transition-colors" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask Lotus anything about your music..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-32 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-[#FA2D48]/30 focus:border-[#FA2D48]/50 transition-all text-base shadow-2xl backdrop-blur-md"
                />
                <div className="absolute inset-y-2 right-2 flex items-center gap-2">
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="h-full px-5 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        ) : (
                            <Wand2 size={16} />
                        )}
                        <span>Ask</span>
                    </button>
                </div>
            </form>

            {/* Lotus Wrapped Button - Functional if prop provided */}
            <button
                onClick={onWrappedClick}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#FA2D48] text-white rounded-full font-bold text-sm hover:bg-[#ff4d64] transition-all shadow-lg hover:shadow-[#FA2D48]/20 group"
            >
                <Gift size={16} className="group-hover:rotate-12 transition-transform" />
                <span>Lotus Wrapped</span>
                <Sparkles size={14} className="animate-pulse" />
            </button>

            {(response || tools.length > 0) && (
                <div className="w-full mt-4 p-6 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={16} className="text-[#FA2D48]" />
                        <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Lotus Insight</span>
                    </div>

                    {response && (
                        <p className="text-white/90 leading-relaxed whitespace-pre-wrap text-[15px]">{response}</p>
                    )}

                    {tools.length > 0 && (
                        <CollapsibleTools tools={tools} />
                    )}
                </div>
            )}
        </div>
    );
};
