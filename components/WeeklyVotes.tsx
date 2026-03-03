import React, { useState, useEffect, useRef } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface VotableSong {
  id: string;
  title: string;
  artist: string;
  cover: string;
}

interface VoteState {
  vote: "up" | "down" | null;
  submittedNote: string;
}

function wilsonScore(ups: number, downs: number): number {
  const n = ups + downs;
  if (n === 0) return 0;
  const z = 1.281551565545;
  const phat = ups / n;
  return (
    (phat + (z * z) / (2 * n) - z * Math.sqrt((phat * (1 - phat) + (z * z) / (4 * n)) / n)) /
    (1 + (z * z) / n)
  );
}

function getSortScore(state: VoteState | undefined): number {
  if (!state || state.vote === null) return -1;
  if (state.vote === "up") return wilsonScore(1, 0);
  return wilsonScore(0, 1) - 2;
}

export const WeeklyVotes = ({ songs }: { songs: VotableSong[] }) => {
  const [votes, setVotes] = useState<Record<string, VoteState>>(() => {
    try {
      const saved = localStorage.getItem("weekly_votes");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [hoveredImgId, setHoveredImgId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem("weekly_votes", JSON.stringify(votes));
  }, [votes]);

  const handleVote = (id: string, type: "up" | "down") => {
    setVotes((prev) => ({
      ...prev,
      [id]: {
        submittedNote: prev[id]?.submittedNote || "",
        vote: prev[id]?.vote === type ? null : type,
      },
    }));
  };

  const handleOpenNote = (id: string) => {
    if (activeNoteId === id) {
      setActiveNoteId(null);
      setDraftNote("");
    } else {
      setActiveNoteId(id);
      setDraftNote(votes[id]?.submittedNote || "");
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = draftNote.trim();
      setVotes((prev) => ({
        ...prev,
        [id]: {
          vote: prev[id]?.vote || null,
          submittedNote: trimmed,
        },
      }));
      setActiveNoteId(null);
      setDraftNote("");
    }
  };

  if (!songs || songs.length === 0) return null;

  const pool = songs.slice(0, 10);

  const allVoted = pool.every((s) => votes[s.id]?.vote != null);
  const totalVotes = pool.filter((s) => votes[s.id]?.vote != null).length;

  const sortedSongs = [...pool].sort((a, b) => {
    const sa = getSortScore(votes[a.id]);
    const sb = getSortScore(votes[b.id]);
    if (sb !== sa) return sb - sa;
    return pool.indexOf(a) - pool.indexOf(b);
  });

  const upCount = pool.filter((s) => votes[s.id]?.vote === "up").length;
  const downCount = pool.filter((s) => votes[s.id]?.vote === "down").length;

  return (
    <div className="w-full bg-[#121212] border border-[#2A2A2A] rounded-3xl overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-[17px] font-bold text-foreground tracking-tight">Weekly Votes</h3>
          {totalVotes > 0 && (
            <span className="text-[10px] font-bold text-[#A0A0A0] bg-[#1A1A1A] border border-[#2A2A2A] px-2 py-0.5 rounded-full uppercase tracking-widest">
              {upCount}↑ {downCount}↓
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold text-[#A0A0A0] uppercase tracking-widest">
          {pool.length} tracks
        </span>
      </div>

      {totalVotes > 0 && (
        <div className="px-5 pb-3">
          <div className="w-full h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F5F5F5] rounded-full transition-all duration-500"
              style={{ width: `${(upCount / pool.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="px-3 pb-3 space-y-0.5">
        <AnimatePresence>
          {sortedSongs.map((song, index) => {
            const state = votes[song.id] || { vote: null, submittedNote: "" };
            const isNoteActive = activeNoteId === song.id;
            const isHoveringImg = hoveredImgId === song.id;
            const hasNote = !!state.submittedNote;

            return (
              <motion.div
                key={song.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="flex flex-col"
              >
                <div className="flex items-center gap-3 px-2 py-2 rounded-2xl hover:bg-[#1A1A1A] transition-colors group">
                  <span className="text-[11px] font-bold text-[#A0A0A0] w-4 text-center shrink-0">
                    {index + 1}
                  </span>

                  <div
                    className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 cursor-pointer"
                    onMouseEnter={() => hasNote && setHoveredImgId(song.id)}
                    onMouseLeave={() => setHoveredImgId(null)}
                    onClick={() => handleOpenNote(song.id)}
                  >
                    <img src={song.cover} alt={song.title} className="w-full h-full object-cover" />
                    {hasNote && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[8px] text-white font-bold">✏️</span>
                      </div>
                    )}

                    <AnimatePresence>
                      {isHoveringImg && hasNote && !isNoteActive && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 4 }}
                          transition={{ duration: 0.12 }}
                          className="absolute bottom-full left-0 mb-2 z-50 w-[160px] bg-[#1A1A1A] border border-[#3A3A3A] rounded-xl px-2.5 py-2 text-[11px] text-[#F5F5F5] shadow-xl whitespace-pre-wrap break-words pointer-events-none"
                        >
                          <div className="absolute bottom-[-5px] left-3 w-2.5 h-2.5 bg-[#1A1A1A] border-r border-b border-[#3A3A3A] rotate-45" />
                          {state.submittedNote}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-foreground truncate leading-tight">
                      {song.title}
                    </p>
                    <p className="text-[11px] text-[#A0A0A0] truncate font-medium">
                      {song.artist}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleVote(song.id, "up")}
                      className={`p-1.5 rounded-lg border transition-all ${
                        state.vote === "up"
                          ? "bg-[#F5F5F5] border-[#F5F5F5] text-[#050505]"
                          : "bg-transparent border-transparent text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-[#2A2A2A]"
                      }`}
                    >
                      <ThumbsUp size={13} className={state.vote === "up" ? "fill-current" : ""} />
                    </button>
                    <button
                      onClick={() => handleVote(song.id, "down")}
                      className={`p-1.5 rounded-lg border transition-all ${
                        state.vote === "down"
                          ? "bg-[#3BBFBF] border-[#3BBFBF] text-[#050505]"
                          : "bg-transparent border-transparent text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-[#2A2A2A]"
                      }`}
                    >
                      <ThumbsDown size={13} className={state.vote === "down" ? "fill-current" : ""} />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isNoteActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden px-2 pb-1"
                    >
                      <div className="relative">
                        <textarea
                          ref={textareaRef}
                          value={draftNote}
                          onChange={(e) => setDraftNote(e.target.value)}
                          onKeyDown={(e) => handleNoteKeyDown(e, song.id)}
                          placeholder="Add a note, press Enter to save..."
                          className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-2.5 text-xs text-[#F5F5F5] placeholder:text-[#505050] focus:outline-none focus:border-[#F5F5F5]/30 resize-none h-[60px] transition-all pr-20"
                        />
                        <span className="absolute bottom-2.5 right-2.5 text-[9px] text-[#505050] pointer-events-none">
                          ↵ to save
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {allVoted && pool.length > 0 && (
        <div className="px-5 py-3 border-t border-[#1A1A1A]">
          <p className="text-[11px] text-[#A0A0A0] font-medium text-center">
            🏆 Top pick: <span className="text-[#F5F5F5] font-bold">{sortedSongs[0]?.title}</span>
          </p>
        </div>
      )}
    </div>
  );
};
