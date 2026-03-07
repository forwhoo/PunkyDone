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
            className="relative bg-[#0F0F0F] w-full h-[95vh] md:h-[85vh] md:w-[90vw] md:max-w-5xl md:rounded-3xl overflow-hidden flex flex-col rounded-t-3xl shadow-2xl"
            style={{ border: `1px solid ${accent}40`, boxShadow: `0 0 80px -20px ${accent}40` }}
          >
            {/* Ambient Background Glow */}
            <div
              className="absolute top-0 left-0 right-0 h-64 pointer-events-none opacity-20"
              style={{ background: `radial-gradient(ellipse at 50% -20%, ${accent}, transparent 70%)` }}
            />

            {/* Header */}
            <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-[#2A2A2A]/40 relative z-10 bg-[#0F0F0F]/80 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] shadow-sm flex items-center justify-center">
                    <TypeIcon type={type} />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tighter flex items-center gap-3">
                      {title}
                      <span
                        className="text-xs font-bold px-2.5 py-0.5 rounded-full border border-current shadow-sm"
                        style={{ background: `${accent}15`, color: accent }}
                      >
                        {processedItems.length}
                      </span>
                    </h2>
                    <p className="text-xs text-[#8A8A8A] mt-1 font-medium tracking-wide uppercase">
                      {totalPlays.toLocaleString()} total plays
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* View toggle */}
                  <div className="bg-[#1A1A1A] p-1 rounded-xl flex border border-[#2A2A2A] shadow-inner">
                    <button
                      onClick={() => setViewMode("list")}
                      className="p-2 rounded-lg transition-all focus:outline-none"
                      style={viewMode === "list" ? { background: accent, color: "#000", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" } : { color: "#8A8A8A" }}
                    >
                      <ListIcon size={14} />
                    </button>
                    <button
                      onClick={() => setViewMode("grid")}
                      className="p-2 rounded-lg transition-all focus:outline-none"
                      style={viewMode === "grid" ? { background: accent, color: "#000", boxShadow: "0 2px 8px rgba(0,0,0,0.2)" } : { color: "#8A8A8A" }}
                    >
                      <LayoutGrid size={14} />
                    </button>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2.5 rounded-xl bg-[#1A1A1A] hover:bg-[#2A2A2A] text-[#8A8A8A] hover:text-[#F5F5F5] transition-all border border-[#2A2A2A]"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Search + Sort */}
              <div className="flex items-center gap-3 bg-[#151515] p-2 rounded-2xl border border-[#2A2A2A]">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6B6B]" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${type}s...`}
                    className="w-full bg-transparent border-none py-2 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder-[#6B6B6B] focus:outline-none"
                  />
                </div>

                <div className="w-px h-6 bg-[#2A2A2A] mx-1"></div>

                {/* Sort pills */}
                <div className="flex gap-1 pr-1">
                  {[
                    { key: "plays", label: "Plays", icon: TrendingUp },
                    { key: "time", label: "Time", icon: Clock },
                    { key: "name", label: "A–Z", icon: null },
                  ].map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={() => setSortBy(key as any)}
                      className="px-3.5 py-2 rounded-xl text-[11px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 focus:outline-none"
                      style={
                        sortBy === key
                          ? { background: accent, color: "#000", boxShadow: `0 2px 10px ${accent}40` }
                          : { background: "transparent", color: "#8A8A8A", hover: { color: "#F5F5F5" } }
                      }
                    >
                      {Icon && <Icon size={12} />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#0F0F0F]">
              {processedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#6B6B6B]">
                  <Search size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">No results for "{searchQuery}"</p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {processedItems.map((item, index) => (
                    <motion.div
                      key={index}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index < 20 ? index * 0.025 : 0, duration: 0.4 }}
                      className="group cursor-pointer flex flex-col gap-3 transition-all"
                      onClick={() => onItemClick?.(item)}
                    >
                      <div className="relative w-full aspect-square overflow-hidden rounded-2xl border border-[#2A2A2A] group-hover:border-[#4A4A4A] transition-colors shadow-lg">
                        <img
                          src={getItemImage(item)}
                          alt={item.name || item.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                          style={{ borderRadius: type === "artist" ? "50%" : undefined }}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <div className="absolute top-3 left-3 w-7 h-7 bg-black/80 backdrop-blur-md flex items-center justify-center text-[#F5F5F5] text-[11px] font-black rounded-full border border-white/10 shadow-sm">
                          {index + 1}
                        </div>
                      </div>
                      <div className="w-full px-1">
                        <p className="text-[14px] font-bold text-[#F5F5F5] truncate leading-tight group-hover:text-white transition-colors">{item.name || item.title}</p>
                        <p className="text-[11px] font-medium text-[#8A8A8A] uppercase tracking-wider truncate mt-1">
                          {(item.totalListens || item.listens || 0).toLocaleString()} plays
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {processedItems.map((item, index) => {
                    const plays = item.totalListens || item.listens || 0;
                    const barWidth = Math.max(1, (plays / maxPlays) * 100);
                    return (
                      <motion.div
                        key={index}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index < 30 ? index * 0.02 : 0, duration: 0.3 }}
                        className="group relative cursor-pointer flex items-center gap-4 px-4 py-3 rounded-2xl hover:bg-[#1A1A1A] border border-transparent hover:border-[#2A2A2A] transition-all overflow-hidden"
                        onClick={() => onItemClick?.(item)}
                      >
                        {/* Background bar */}
                        <div
                          className="absolute inset-y-0 left-0 rounded-2xl transition-all duration-1000 ease-out opacity-20 group-hover:opacity-30"
                          style={{ width: `${barWidth}%`, background: `linear-gradient(90deg, ${accent}40, ${accent}80)` }}
                        />

                        {/* Rank */}
                        <div className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-[#151515] border border-[#2A2A2A] flex-shrink-0">
                           <span className="text-[11px] font-black" style={{ color: index < 3 ? accent : "#8A8A8A" }}>
                            {index + 1}
                          </span>
                        </div>

                        {/* Image */}
                        <div className={`relative z-10 flex-shrink-0 overflow-hidden border border-[#2A2A2A] shadow-md ${
                          type === "artist" ? "w-14 h-14 rounded-full" : "w-14 h-14 rounded-xl"
                        }`}>
                          <img
                            src={getItemImage(item)}
                            alt={item.name || item.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                            loading="lazy"
                          />
                        </div>

                        {/* Info */}
                        <div className="relative z-10 flex-1 min-w-0 pr-4">
                          <p className="text-[16px] font-bold text-[#F5F5F5] truncate group-hover:text-white tracking-tight transition-colors">
                            {item.name || item.title}
                          </p>
                          <p className="text-[12px] font-medium text-[#8A8A8A] truncate mt-0.5 flex items-center gap-1.5">
                            {type === "artist"
                              ? item.timeStr || ""
                              : (
                                <>
                                  {item.artist && <span className="text-[#A0A0A0]">{item.artist}</span>}
                                  {item.artist && item.timeStr && <span className="w-1 h-1 rounded-full bg-[#4A4A4A]" />}
                                  {item.timeStr && <span>{item.timeStr}</span>}
                                </>
                              )}
                          </p>
                        </div>

                        {/* Plays */}
                        <div className="relative z-10 flex-shrink-0 flex items-center gap-2 bg-[#151515] px-3 py-1.5 rounded-full border border-[#2A2A2A]">
                          <Headphones size={12} style={{ color: accent }} />
                          <span className="text-[13px] font-black text-[#F5F5F5] tracking-wide">
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
