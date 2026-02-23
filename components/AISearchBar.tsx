import React, { useState, useEffect, useRef } from 'react';
import { Search, Send, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AISpotlight } from './AISpotlight';
import { createPortal } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
                        <div className="relative flex items-center gap-2">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                                <Search className="w-4 h-4 text-white/40" />
                            </div>
                            <Input
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
                                className="pl-9 h-12 rounded-xl bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-white/20 text-base shadow-lg backdrop-blur-md"
                            />
                            {query.trim() && (
                                <Button
                                    type="submit"
                                    size="icon"
                                    className="absolute right-1 top-1 h-10 w-10 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                                >
                                    <Send className="w-4 h-4" />
                                </Button>
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
                            className="fixed inset-0 z-[10000] bg-[#09090b] flex flex-col h-[100dvh] w-screen"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-end px-6 py-4 border-b border-white/5 flex-shrink-0 bg-black/20 backdrop-blur-xl">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleClose}
                                    className="rounded-full hover:bg-white/10"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-hidden bg-[#09090b]">
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
