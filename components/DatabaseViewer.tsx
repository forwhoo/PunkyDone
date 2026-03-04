import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Search,
  Database,
  Calendar,
  Music,
  Disc,
  User,
  Clock,
  RefreshCw,
  ChevronDown,
  Hash,
} from "lucide-react";
import { supabase } from "../services/supabaseClient";
import { motion, AnimatePresence } from "framer-motion";

interface DatabaseViewerProps {
  isOpen: boolean;
  onClose: () => void;
}

const formatDuration = (ms: number | null) => {
  if (!ms) return "--:--";
  const m = Math.floor(ms / 60000);
  const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${m}:${s}`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
};

export const DatabaseViewer: React.FC<DatabaseViewerProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [limit, setLimit] = useState(100);
  const [sortField, setSortField] = useState<"played_at" | "track_name" | "artist_name">("played_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen, limit]);

  const fetchData = async () => {
    setLoading(true);
    const { data: history, error } = await supabase
      .from("listening_history")
      .select("*")
      .order("played_at", { ascending: false })
      .limit(limit);
    if (!error && history) setData(history);
    setLoading(false);
  };

  const filteredData = useMemo(() => {
    let result = data.filter((item) => {
      const q = searchTerm.toLowerCase();
      return (
        (item.track_name || "").toLowerCase().includes(q) ||
        (item.artist_name || "").toLowerCase().includes(q) ||
        (item.album_name || "").toLowerCase().includes(q)
      );
    });
    result.sort((a, b) => {
      const va = a[sortField] || "";
      const vb = b[sortField] || "";
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [data, searchTerm, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortHeader = ({ field, label, icon: Icon }: { field: typeof sortField; label: string; icon: any }) => (
    <th
      className="p-4 text-left cursor-pointer select-none group"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground/30 group-hover:text-foreground/60 transition-colors">
        <Icon size={12} />
        <span>{label}</span>
        {sortField === field && (
          <ChevronDown size={12} className={`transition-transform ${sortDir === "asc" ? "rotate-180" : ""}`} style={{ color: "#d97757" }} />
        )}
      </div>
    </th>
  );

  // Stats
  const uniqueArtists = new Set(data.map(d => d.artist_name)).size;
  const uniqueTracks = new Set(data.map(d => d.track_name)).size;
  const totalMs = data.reduce((s, d) => s + (d.duration_ms || 0), 0);
  const totalMins = Math.round(totalMs / 60000);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
        >
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="bg-[#0C0C0C] w-full max-w-5xl h-[95vh] md:h-[88vh] rounded-t-3xl md:rounded-3xl border border-white/[0.07] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Accent line */}
            <div className="h-[2px] w-full flex-shrink-0 bg-gradient-to-r from-transparent via-[#3BBFBF] to-transparent" />

            {/* Header */}
            <div className="flex-shrink-0 px-6 py-5 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-[#3BBFBF]/10 border border-[#3BBFBF]/20">
                    <Database size={18} className="text-[#3BBFBF]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground tracking-tight">Listening History</h2>
                    <p className="text-[11px] text-foreground/30 mt-0.5">
                      {filteredData.length.toLocaleString()} records
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchData}
                    disabled={loading}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-foreground/40 hover:text-foreground transition-all border border-white/[0.06] disabled:opacity-30"
                  >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-foreground/40 hover:text-foreground transition-all border border-white/[0.06]"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Stats pills */}
              <div className="flex gap-2 flex-wrap mb-4">
                {[
                  { label: "tracks", value: uniqueTracks.toLocaleString(), color: "#d97757" },
                  { label: "artists", value: uniqueArtists.toLocaleString(), color: "#3BBFBF" },
                  { label: "minutes", value: totalMins.toLocaleString(), color: "#F5A623" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-1.5">
                    <span className="text-[13px] font-bold" style={{ color }}>{value}</span>
                    <span className="text-[11px] text-foreground/30 font-medium">{label}</span>
                  </div>
                ))}
              </div>

              {/* Search + limit */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/25" />
                  <input
                    type="text"
                    placeholder="Search tracks, artists, albums..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.06] focus:border-[#3BBFBF]/40 rounded-xl py-2 pl-9 pr-3 text-sm text-foreground placeholder-white/20 focus:outline-none transition-all"
                  />
                </div>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="bg-white/[0.04] border border-white/[0.06] text-foreground/60 text-[12px] rounded-xl px-3 py-2 focus:outline-none focus:border-[#3BBFBF]/40 cursor-pointer"
                >
                  <option value={100}>Last 100</option>
                  <option value={500}>Last 500</option>
                  <option value={1000}>Last 1000</option>
                  <option value={5000}>Last 5000</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="sticky top-0 z-10 bg-[#0C0C0C] border-b border-white/[0.06]">
                  <tr>
                    <SortHeader field="played_at" label="When" icon={Calendar} />
                    <SortHeader field="track_name" label="Track" icon={Music} />
                    <SortHeader field="artist_name" label="Artist" icon={User} />
                    <th className="p-4 text-left">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground/30">
                        <Disc size={12} /><span className="hidden md:inline">Album</span>
                      </div>
                    </th>
                    <th className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground/30">
                        <Clock size={12} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-white/[0.03]">
                        {[1, 2, 3, 4, 5].map((j) => (
                          <td key={j} className="p-4">
                            <div className="h-4 bg-white/[0.05] rounded animate-pulse" style={{ width: `${40 + Math.random() * 40}%` }} />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-foreground/20 text-sm">
                        {searchTerm ? `No records matching "${searchTerm}"` : "No records found"}
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((item, i) => (
                      <motion.tr
                        key={item.id || i}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i < 20 ? i * 0.01 : 0 }}
                        className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors group"
                      >
                        <td className="p-4 text-[12px] text-foreground/40 font-medium whitespace-nowrap">
                          {item.played_at ? formatDate(item.played_at) : "—"}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-white/[0.04] overflow-hidden flex-shrink-0 border border-white/[0.06]">
                              {item.cover || item.album_cover ? (
                                <img src={item.cover || item.album_cover} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Music size={12} className="text-foreground/20" />
                                </div>
                              )}
                            </div>
                            <span className="text-[13px] font-medium text-foreground truncate max-w-[180px] group-hover:text-[#d97757] transition-colors">
                              {item.track_name || "Unknown Track"}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-[13px] text-foreground/60 truncate max-w-[140px]">
                          {item.artist_name || "—"}
                        </td>
                        <td className="p-4 text-[12px] text-foreground/30 truncate max-w-[140px] hidden md:table-cell">
                          {item.album_name || "—"}
                        </td>
                        <td className="p-4 text-[12px] text-foreground/30 font-mono text-right whitespace-nowrap">
                          {formatDuration(item.duration_ms)}
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-3 border-t border-white/[0.04] flex items-center justify-between">
              <p className="text-[11px] text-foreground/20">
                {filteredData.length.toLocaleString()} of {data.length.toLocaleString()} records
              </p>
              <p className="text-[11px] text-foreground/20">Supabase · listening_history</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
