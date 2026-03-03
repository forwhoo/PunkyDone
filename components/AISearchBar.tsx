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
    <div className="w-full relative z-50" ref={containerRef}>
      <form onSubmit={(e) => handleSearch(e)} className="w-full relative">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 flex items-center pointer-events-none">
            <Search
              className="w-4 h-4 transition-colors duration-200"
              style={{ color: isFocused ? "#d97757" : "rgba(255,255,255,0.3)" }}
            />
          </div>

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
            placeholder="Ask Harvey anything about your music..."
            className="w-full h-10 rounded-md pl-9 pr-24 text-sm outline-none transition-all duration-200"
            style={{
              background: "hsl(0,0%,9%)",
              border: isFocused
                ? "1px solid rgba(217,119,87,0.6)"
                : "1px solid hsl(0,0%,15%)",
              color: "hsl(0,0%,95%)",
              caretColor: "#d97757",
              boxShadow: isFocused
                ? "0 0 0 3px rgba(217,119,87,0.12)"
                : "none",
            }}
          />

          <div className="absolute right-1.5 flex items-center">
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-7 px-3 rounded-sm text-xs font-medium flex items-center gap-1.5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: query.trim() ? "#d97757" : "hsl(0,0%,15%)",
                color: query.trim() ? "#fff" : "hsl(0,0%,45%)",
              }}
            >
              {loading ? (
                <div
                  className="w-3 h-3 rounded-full border-2 animate-spin"
                  style={{
                    borderColor: "rgba(255,255,255,0.25)",
                    borderTopColor: "#fff",
                  }}
                />
              ) : (
                <Wand2 size={12} />
              )}
              <span>Ask</span>
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
            className="absolute top-full left-0 right-0 mt-1.5 rounded-md overflow-hidden z-50"
            style={{
              background: "hsl(0,0%,9%)",
              border: "1px solid hsl(0,0%,15%)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            <div className="p-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-sm text-left group transition-colors duration-100"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "hsl(0,0%,13%)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-sm flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        suggestion.type === "query"
                          ? "rgba(217,119,87,0.15)"
                          : "hsl(0,0%,13%)",
                      border:
                        suggestion.type === "query"
                          ? "1px solid rgba(217,119,87,0.25)"
                          : "1px solid hsl(0,0%,18%)",
                    }}
                  >
                    {getIcon(suggestion.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium truncate"
                      style={{ color: "hsl(0,0%,90%)" }}
                    >
                      {suggestion.type === "query" ? query : suggestion.text}
                    </p>
                    <p
                      className="text-[10px] truncate"
                      style={{ color: "hsl(0,0%,40%)" }}
                    >
                      {suggestion.subtext}
                    </p>
                  </div>

                  <TrendingUp
                    size={11}
                    className="-rotate-45 group-hover:rotate-0 transition-transform duration-200 flex-shrink-0"
                    style={{ color: "hsl(0,0%,30%)" }}
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
