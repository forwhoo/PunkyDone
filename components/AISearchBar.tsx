import React, { useState, useEffect, useRef } from "react";
import { Search, Wand2, Music, User, Disc, TrendingUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface AISearchBarProps {
  token?: string | null;
  history?: any[];
  user?: any;
  contextData: any;
  onSearch?: (query: string) => void;
}

interface Suggestion {
  id: string;
  type: "artist" | "song" | "album" | "query";
  text: string;
  subtext?: string;
}

export const AISearchBar: React.FC<AISearchBarProps> = ({
  token,
  history = [],
  user,
  contextData,
  onSearch,
}) => {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    const lowerQuery = query.toLowerCase();
    const newSuggestions: Suggestion[] = [];

    newSuggestions.push({
      id: "ask-ai",
      type: "query",
      text: `Ask AI: "${query}"`,
      subtext: "Get insights & analysis",
    });

    if (contextData?.artists) {
      contextData.artists
        .filter((a: string) => a.toLowerCase().includes(lowerQuery))
        .slice(0, 3)
        .forEach((a: string) =>
          newSuggestions.push({
            id: `artist-${a}`,
            type: "artist",
            text: a,
            subtext: "Artist Analysis",
          }),
        );
    }

    if (contextData?.songs) {
      contextData.songs
        .filter((s: string) => s.toLowerCase().includes(lowerQuery))
        .slice(0, 3)
        .forEach((s: string) =>
          newSuggestions.push({
            id: `song-${s}`,
            type: "song",
            text: s,
            subtext: "Track Stats",
          }),
        );
    }

    if (contextData?.albums) {
      contextData.albums
        .filter((a: string) => a.toLowerCase().includes(lowerQuery))
        .slice(0, 2)
        .forEach((a: string) =>
          newSuggestions.push({
            id: `album-${a}`,
            type: "album",
            text: a,
            subtext: "Album Stats",
          }),
        );
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
      setQuery("");
    }
    setLoading(false);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    if (suggestion.type === "query") {
      handleSearch(undefined, query);
    } else if (suggestion.type === "artist") {
      handleSearch(undefined, `Tell me about my listening stats for ${suggestion.text}`);
    } else if (suggestion.type === "song") {
      handleSearch(undefined, `Analyze the song "${suggestion.text}"`);
    } else if (suggestion.type === "album") {
      handleSearch(undefined, `Stats for the album "${suggestion.text}"`);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "artist":
        return <User size={13} className="text-[#d97757]" />;
      case "song":
        return <Music size={13} className="text-[#d97757]" />;
      case "album":
        return <Disc size={13} className="text-[#d97757]" />;
      default:
        return <Wand2 size={13} className="text-[#d97757]" />;
    }
  };

  return (
    <div className="w-full relative z-50 group/search" ref={containerRef}>
      <form onSubmit={(e) => handleSearch(e)} className="w-full relative">
        <div className="relative flex items-center">
          <div className="absolute left-4 flex items-center pointer-events-none z-10">
            <Search
              className="w-[18px] h-[18px] transition-colors duration-300"
              style={{ color: isFocused ? "#d97757" : "rgba(255,255,255,0.4)" }}
            />
          </div>

          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#d97757]/0 via-[#d97757]/5 to-[#d97757]/0 opacity-0 group-hover/search:opacity-100 transition-opacity duration-500 pointer-events-none" />

          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => {
              setShowSuggestions(true);
              setIsFocused(true);
            }}
            placeholder="Ask Claudius anything about your music..."
            className="w-full h-12 rounded-2xl pl-11 pr-28 text-[15px] outline-none transition-all duration-300 relative bg-[#121212] focus:bg-[#151515] text-foreground placeholder-[#6B6B6B]"
            style={{
              border: isFocused
                ? "1px solid rgba(217,119,87,0.6)"
                : "1px solid rgba(42,42,42,0.8)",
              caretColor: "#d97757",
              boxShadow: isFocused
                ? "0 0 0 4px rgba(217,119,87,0.1), 0 8px 32px rgba(0,0,0,0.4)"
                : "0 4px 12px rgba(0,0,0,0.2)",
            }}
          />

          <div className="absolute right-2 flex items-center gap-1.5 z-10">
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setSuggestions([]); }}
                className="h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-bold transition-all duration-200 hover:bg-[#2A2A2A] text-[#8A8A8A] hover:text-[#F5F5F5]"
              >
                ×
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-8 px-4 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed group/ask-btn"
              style={{
                background: query.trim() ? "linear-gradient(135deg, #d97757, #c45e3e)" : "#1A1A1A",
                color: query.trim() ? "#fff" : "#8A8A8A",
                boxShadow: query.trim() ? "0 4px 12px rgba(217,119,87,0.25)" : "none",
                border: query.trim() ? "none" : "1px solid #2A2A2A",
              }}
            >
              {loading ? (
                <div
                  className="w-3.5 h-3.5 rounded-full border-[2.5px] animate-spin"
                  style={{
                    borderColor: "rgba(255,255,255,0.25)",
                    borderTopColor: "#fff",
                  }}
                />
              ) : (
                <Wand2 size={14} className={query.trim() ? "animate-pulse" : ""} />
              )}
              <span className="tracking-wide">Ask</span>
            </button>
          </div>
        </div>
      </form>

      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && query.trim() && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 backdrop-blur-xl"
            style={{
              background: "rgba(18,18,18,0.95)",
              border: "1px solid rgba(42,42,42,0.8)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            <div className="p-2 flex flex-col gap-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left group transition-all duration-200 hover:bg-[#1A1A1A] border border-transparent hover:border-[#2A2A2A]"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                    style={{
                      background:
                        suggestion.type === "query"
                          ? "rgba(217,119,87,0.15)"
                          : "#151515",
                      border:
                        suggestion.type === "query"
                          ? "1px solid rgba(217,119,87,0.3)"
                          : "1px solid #2A2A2A",
                    }}
                  >
                    {getIcon(suggestion.type)}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <p className="text-[14px] font-semibold truncate text-[#F5F5F5] tracking-tight">
                      {suggestion.type === "query" ? query : suggestion.text}
                    </p>
                    <p className="text-[11px] font-medium truncate text-[#8A8A8A] uppercase tracking-wider mt-0.5">
                      {suggestion.subtext}
                    </p>
                  </div>

                  <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:bg-[#d97757]/10 group-hover:border-[#d97757]/30">
                    <TrendingUp
                      size={12}
                      className="-rotate-45 group-hover:rotate-0 transition-transform duration-300 flex-shrink-0 text-[#8A8A8A] group-hover:text-[#d97757]"
                    />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
