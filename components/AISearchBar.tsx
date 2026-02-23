import React, { useState } from 'react';
import { Search, Wand2 } from 'lucide-react';

interface AISearchBarProps {
    token?: string | null;
    history?: any[];
    user?: any;
    contextData: any;
    onSearch?: (query: string) => void;
}

export const AISearchBar: React.FC<AISearchBarProps> = ({ token, history = [], user, contextData, onSearch }) => {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || loading) return;

        setLoading(true);
        if (onSearch) {
             onSearch(query);
             setQuery('');
        }
        setLoading(false);
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
        </div>
    );
};
