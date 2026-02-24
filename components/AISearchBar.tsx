import React, { useState, useEffect, useRef } from 'react';
import { Search, Wand2, Music, User, Disc, TrendingUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface AISearchBarProps {
    token?: string | null;
    history?: any[];
    user?: any;
    contextData: any;
    onSearch?: (query: string) => void;
}

interface Suggestion {
    id: string;
    type: 'artist' | 'song' | 'album' | 'query';
    text: string;
    subtext?: string;
}

export const AISearchBar: React.FC<AISearchBarProps> = ({ token, history = [], user, contextData, onSearch }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter suggestions based on query
    useEffect(() => {
        if (!query.trim()) {
            setSuggestions([]);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const newSuggestions: Suggestion[] = [];

        // Add "Ask AI" suggestion first
        newSuggestions.push({
            id: 'ask-ai',
            type: 'query',
            text: `Ask AI: "${query}"`,
            subtext: 'Get insights & analysis'
        });

        // Filter Artists
        if (contextData?.artists) {
            contextData.artists
                .filter((a: string) => a.toLowerCase().includes(lowerQuery))
                .slice(0, 3)
                .forEach((a: string) => newSuggestions.push({
                    id: `artist-${a}`,
                    type: 'artist',
                    text: a,
                    subtext: 'Artist Analysis'
                }));
        }

        // Filter Songs
        if (contextData?.songs) {
            contextData.songs
                .filter((s: string) => s.toLowerCase().includes(lowerQuery))
                .slice(0, 3)
                .forEach((s: string) => newSuggestions.push({
                    id: `song-${s}`,
                    type: 'song',
                    text: s,
                    subtext: 'Track Stats'
                }));
        }

        // Filter Albums
        if (contextData?.albums) {
            contextData.albums
                .filter((a: string) => a.toLowerCase().includes(lowerQuery))
                .slice(0, 2)
                .forEach((a: string) => newSuggestions.push({
                    id: `album-${a}`,
                    type: 'album',
                    text: a,
                    subtext: 'Album Stats'
                }));
        }

        setSuggestions(newSuggestions);
    }, [query, contextData]);

    const handleSearch = async (e?: React.FormEvent, searchQuery?: string) => {
        if (e) e.preventDefault();
        const text = searchQuery || query;

        if (!text.trim() || loading) return;

        setLoading(true);
        setShowSuggestions(false);

        if (onSearch) {
             onSearch(text);
             setQuery('');
        }
        setLoading(false);
    };

    const handleSuggestionClick = (suggestion: Suggestion) => {
        if (suggestion.type === 'query') {
            handleSearch(undefined, query);
        } else if (suggestion.type === 'artist') {
            handleSearch(undefined, `Tell me about my listening stats for ${suggestion.text}`);
        } else if (suggestion.type === 'song') {
            handleSearch(undefined, `Analyze the song "${suggestion.text}"`);
        } else if (suggestion.type === 'album') {
            handleSearch(undefined, `Stats for the album "${suggestion.text}"`);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'artist': return <User size={14} className="text-[#FA2D48]" />;
            case 'song': return <Music size={14} className="text-[#FA2D48]" />;
            case 'album': return <Disc size={14} className="text-[#FA2D48]" />;
            default: return <Wand2 size={14} className="text-[#FA2D48]" />;
        }
    };

    return (
        <div className="w-full flex flex-col items-center gap-4 z-50 relative" ref={containerRef}>
            <form onSubmit={(e) => handleSearch(e)} className="w-full relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-white/30 group-focus-within:text-[#FA2D48] transition-colors" />
                </div>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
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

            <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && query.trim() && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl"
                    >
                        <div className="py-2">
                            {suggestions.map((suggestion) => (
                                <button
                                    key={suggestion.id}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors text-left group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-white/10 transition-colors">
                                        {getIcon(suggestion.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate group-hover:text-[#FA2D48] transition-colors">
                                            {suggestion.type === 'query' ? query : suggestion.text}
                                        </p>
                                        <p className="text-xs text-white/40 truncate">{suggestion.subtext}</p>
                                    </div>
                                    <TrendingUp size={14} className="text-white/20 group-hover:text-white/50 -rotate-45 group-hover:rotate-0 transition-all duration-300" />
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
