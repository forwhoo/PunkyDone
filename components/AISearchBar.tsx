import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AISpotlight } from './AISpotlight';
import { createPortal } from 'react-dom';

interface AISearchBarProps {
    token?: string | null;
    history?: any[];
    contextData: {
        artists: string[],
        albums: string[],
        songs: string[],
        userName?: string,
        globalStats?: {
            weeklyTime: string,
            weeklyTrend: string,
            totalTracks: number,
            totalMinutes?: number,
            charts?: any[]
        }
    };
    user?: any;
}

export const AISearchBar: React.FC<AISearchBarProps> = ({ token, history, contextData, user }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [query, setQuery] = useState('');
    const [queryToSend, setQueryToSend] = useState('');
    const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Initialize portal container on mount
    useEffect(() => {
        setPortalContainer(document.body);
    }, []);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (query.trim()) {
            const trimmedQuery = query.trim();
            setQueryToSend(trimmedQuery);
            setIsExpanded(true);
        }
    };

    const handleClose = () => {
        setIsExpanded(false);
        setQuery('');
        setQueryToSend('');
    };

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isExpanded) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isExpanded]);

    return (
        <>
            {!isExpanded && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                >
                    <form onSubmit={handleSubmit} className="relative">
                        <div className="relative flex items-center bg-black/40 border border-white/15 rounded-2xl overflow-hidden transition-all hover:border-white/30 backdrop-blur-md">
                            <div className="pl-4 flex items-center pointer-events-none">
                                <Search className="w-5 h-5 text-[#8E8E93]" />
                            </div>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                                placeholder="Ask about your music..."
                                className="flex-1 bg-transparent text-white placeholder-white/40 px-3 py-4 focus:outline-none text-[15px]"
                            />
                            {query.trim() && (
                                <button
                                    type="submit"
                                    className="pr-4 pl-2 py-2 text-[#FA2D48] hover:text-[#FF6B82] transition-colors"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </form>
                </motion.div>
            )}

            {/* Portal for the modal - AnimatePresence inside portal for proper animation tracking */}
            {portalContainer && createPortal(
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            ref={modalRef}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 z-[10000] bg-[#0a0a0a] flex flex-col h-[100dvh] w-screen"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 flex-shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#FA2D48]/10 flex items-center justify-center">
                                        <MessageSquare className="w-4 h-4 text-[#FA2D48]" />
                                    </div>
                                    <h2 className="text-base font-bold text-white tracking-tight">Chat with Punky</h2>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-hidden">
                                <AISpotlight
                                    token={token}
                                    history={history}
                                    contextData={contextData}
                                    user={user}
                                    initialQuery={queryToSend}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                portalContainer
            )}
        </>
    );
};
