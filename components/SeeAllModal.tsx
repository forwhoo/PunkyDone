import React, { useEffect, useState, useMemo } from "react";
import {
  X,
  Clock,
  TrendingUp,
  Mic2,
  Disc,
  Music,
  Search,
  LayoutGrid,
  List as ListIcon,
  Headphones,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const getItemImage = (item: any) =>
  item.cover ||
  item.image ||
  item.art ||
  item.album_cover ||
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    item.name || item.title || "",
  )}&background=1C1C1E&color=fff`;

interface SeeAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: any[];
  type: "artist" | "album" | "song";
  onItemClick?: (item: any) => void;
}

const TypeIcon = ({ type }: { type: string }) => {
  if (type === "artist") return <Mic2 size={16} className="text-[#d97757]" />;
  if (type === "album") return <Disc size={16} className="text-[#3BBFBF]" />;
  return <Music size={16} className="text-[#F5A623]" />;
};

const TYPE_ACCENT: Record<string, string> = {
  artist: "#d97757",
  album: "#3BBFBF",
  song: "#F5A623",
};

export const SeeAllModal: React.FC<SeeAllModalProps> = ({
  isOpen,
  onClose,
  title,
  items,
  type,
  onItemClick,
}) => {
  const [sortBy, setSortBy] = useState<"plays" | "time" | "name">("plays");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [searchQuery, setSearchQuery] = useState("");

  const accent = TYPE_ACCENT[type] || "#d97757";

  useEffect(() => {
    if (isOpen) {
      setSortBy("plays");
      setSearchQuery("");
      setViewMode("list");
    }
  }, [isOpen]);

  const processedItems = useMemo(() => {
    let result = [...items];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const name = (item.name || item.title || "").toLowerCase();
        const artist = (item.artist || "").toLowerCase();
        return name.includes(query) || artist.includes(query);
      });
    }
    result.sort((a, b) => {
      if (sortBy === "plays") {
        return (b.totalListens || b.listens || 0) - (a.totalListens || a.listens || 0);
      }
      if (sortBy === "time") {
        const timeA = parseInt((a.timeStr || "0").replace(/[^0-9]/g, "")) || 0;
        const timeB = parseInt((b.timeStr || "0").replace(/[^0-9]/g, "")) || 0;
        return timeB - timeA;
      }
      if (sortBy === "name") {
        return (a.name || a.title || "").localeCompare(b.name || b.title || "");
      }
      return 0;
    });
    return result;
  }, [items, sortBy, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalPlays = processedItems.reduce(
    (sum, item) => sum + (item.totalListens || item.listens || 0), 0,
  );
  const maxPlays = processedItems.length > 0
    ? processedItems[0].totalListens || processedItems[0].listens || 1
    : 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center w-full h-full">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative bg-[#0C0C0C] w-full h-[92vh] md:h-[88vh] md:w-[88vw] md:max-w-5xl md:rounded-3xl overflow-hidden flex flex-col rounded-t-3xl"
            style={{ border: `1px solid ${accent}22` }}
          >
            {/* Accent line at top */}
            <div className="h-[2px] w-full flex-shrink-0" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

            {/* Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-white/[0.05]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl border" style={{ background: `${accent}15`, borderColor: `${accent}30` }}>
                    <TypeIcon type={type} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-foreground tracking-tight">{title}</h2>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${accent}20`, color: accent }}
                      >
                        {processedItems.length}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/30 mt-0.5 font-medium">
                      {totalPlays.toLocaleString()} total plays
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* View toggle */}
                  <div className="bg-white/[0.04] p-1 rounded-xl flex border border-white/[0.06] gap-0.5">
                    <button
                      onClick={() => setViewMode("list")}
                      className="p-1.5 rounded-lg transition-all"
                      style={viewMode === "list" ? { background: accent, color: "#000" } : { color: "rgba(255,255,255,0.3)" }}
                    >
                      <ListIcon size={13} />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className="p-1.5 rounded-lg transition-all"
                      style={viewMode === "grid" ? { background: accent, color: "#000" } : { color: "rgba(255,255,255,0.3)" }}
                    >
                      <LayoutGrid size={13} />
                    </button>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-foreground/40 hover:text-foreground transition-all border border-white/[0.06]"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Search + Sort */}
              <div className="flex items-center gap-3 mt-4">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/25" size={14} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${type}s...`}
                    className="w-full bg-white/[0.04] border border-white/[0.06] focus:border-white/[0.15] rounded-xl py-2 pl-9 pr-3 text-sm text-foreground placeholder-white/20 focus:outline-none transition-all"
                  />
                </div>

                {/* Sort pills */}
                <div className="flex gap-1.5">
                  {[
                    { key: "plays", label: "Plays", icon: TrendingUp },
                    { key: "time", label: "Time", icon: Clock },
                    { key: "name", label: "A–Z", icon: null },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setSortBy(key as any)}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1"
                      style={
                        sortBy === key
                          ? { background: accent, color: "#000" }
                          : { background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.06)" }
                      }
                    >
                      {Icon && <Icon size={10} />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {processedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-foreground/20">
                  <Search size={40} className="mb-3 opacity-30" />
                  <p className="text-sm">No results for "{searchQuery}"</p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {processedItems.map((item, index) => (
                    <motion.div
                      key={index}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index < 20 ? index * 0.025 : 0 }}
                      className="group cursor-pointer bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/[0.15] rounded-2xl p-3 flex flex-col items-center text-center gap-2.5 transition-all hover:-translate-y-1"
                      onClick={() => onItemClick?.(item)}
                    >
                      <div className="relative w-full aspect-square overflow-hidden rounded-xl">
                        <img
                          src={getItemImage(item)}
                          alt={item.name || item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          style={{ borderRadius: type === "artist" ? "50%" : undefined }}
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                          #{index + 1}
                        </div>
                      </div>
                      <div className="w-full">
                        <p className="text-[12px] font-semibold text-foreground truncate">{item.name || item.title}</p>
                        <p className="text-[10px] text-foreground/40 truncate mt-0.5">
                          {(item.totalListens || item.listens || 0).toLocaleString()} plays
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {processedItems.map((item, index) => {
                    const plays = item.totalListens || item.listens || 0;
                    const barWidth = Math.max(2, (plays / maxPlays) * 100);
                    return (
                      <motion.div
                        key={index}
                        layout
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index < 30 ? index * 0.02 : 0 }}
                        className="group relative cursor-pointer flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors overflow-hidden"
                        onClick={() => onItemClick?.(item)}
                      >
                        {/* Background bar */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-xl transition-all duration-700"
                          style={{ width: `${barWidth}%`, background: `${accent}12` }}
                        />

                        {/* Rank */}
                        <span className="relative z-10 text-[12px] font-bold w-6 text-center flex-shrink-0"
                          style={{ color: index < 3 ? accent : "rgba(255,255,255,0.3)" }}>
                          {index + 1}
                        </span>

                        {/* Image */}
                        <div className={`relative z-10 flex-shrink-0 overflow-hidden border border-white/[0.08] ${
                          type === "artist" ? "w-10 h-10 rounded-full" : "w-10 h-10 rounded-lg"
                        }`}>
                          <img
                            src={getItemImage(item)}
                            alt={item.name || item.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>

                        {/* Info */}
                        <div className="relative z-10 flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-foreground truncate group-hover:text-white transition-colors">
                            {item.name || item.title}
                          </p>
                          <p className="text-[11px] text-foreground/40 truncate">
                            {type === "artist"
                              ? item.timeStr || ""
                              : `${item.artist || ""}${item.artist ? " · " : ""}${item.timeStr || ""}`}
                          </p>
                        </div>

                        {/* Plays */}
                        <div className="relative z-10 flex-shrink-0 flex items-center gap-1.5">
                          <Headphones size={10} style={{ color: `${accent}80` }} />
                          <span className="text-[12px] font-bold text-foreground/70 group-hover:text-foreground transition-colors">
                            {plays.toLocaleString()}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
