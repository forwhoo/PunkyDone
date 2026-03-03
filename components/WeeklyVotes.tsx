import React, { useState, useEffect, useRef } from "react";
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface VotableSong {
  id: string;
  title: string;
  artist: string;
  cover: string;
}

interface VoteState {
  vote: "up" | "down" | null;
  note: string;
  submittedNote: string;
}

const getScore = (state: VoteState | undefined) => {
  if (!state) return 0;
  if (state.vote === "up") return 1;
  if (state.vote === "down") return -1;
  return 0;
};

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
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem("weekly_votes", JSON.stringify(votes));
  }, [votes]);

  const handleVote = (id: string, type: "up" | "down") => {
    setVotes((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        vote: prev[id]?.vote === type ? null : type,
        note: prev[id]?.note || "",
        submittedNote: prev[id]?.submittedNote || "",
      },
    }));
  };

  const handleOpenNote = (id: string) => {
    if (activeNoteId === id) {
      setActiveNoteId(null);
      setDraftNote("");
    } else {
      setActiveNoteId(id);
      setDraftNote(votes[id]?.note || "");
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>, id: string) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = draftNote.trim();
      if (!trimmed) return;
      setVotes((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          vote: prev[id]?.vote || null,
          note: trimmed,
          submittedNote: trimmed,
        },
      }));
      setActiveNoteId(null);
      setDraftNote("");
    }
  };

  if (!songs || songs.length === 0) {
    return null;
  }

  const sortedSongs = [...songs.slice(0, 5)].sort((a, b) => {
    return getScore(votes[b.id]) - getScore(votes[a.id]);
  });

  return (
    <div className="w-full bg-[#121212] border border-[#2A2A2A] rounded-3xl p-6 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-heading font-bold text-[#F5F5F5] tracking-tight">
          Weekly Votes
        </h3>
        <span className="text-xs font-bold text-[#A0A0A0] uppercase tracking-widest">
          {songs.length} Tracks
        </span>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {sortedSongs.map((song, index) => {
            const state = votes[song.id] || { vote: null, note: "", submittedNote: "" };
            const isNoteActive = activeNoteId === song.id;
            const isHoveringNote = hoveredNoteId === song.id;
            const hasSubmittedNote = !!state.submittedNote;

            return (
              <motion.div
                key={song.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="group flex flex-col gap-3 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl transition-all hover:border-[#F5F5F5]/30 relative"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-6 shrink-0">
                    <span className="text-xs font-bold text-[#A0A0A0]">{index + 1}</span>
                  </div>
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-[#2A2A2A]">
                    <img
                      src={song.cover}
                      alt={song.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-bold text-[#F5F5F5] truncate tracking-tight">
                      {song.title}
                    </p>
                    <p className="text-[14px] text-[#A0A0A0] truncate font-medium">
                      {song.artist}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleVote(song.id, "up")}
                      className={`p-2.5 rounded-xl border transition-all ${
                        state.vote === "up"
                          ? "bg-[#FFFFFF] border-[#FFFFFF] text-[#050505]"
                          : "bg-[#121212] border-[#2A2A2A] text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-[#F5F5F5]/50"
                      }`}
                    >
                      <ThumbsUp size={16} className={state.vote === "up" ? "fill-current" : ""} />
                    </button>
                    <button
                      onClick={() => handleVote(song.id, "down")}
                      className={`p-2.5 rounded-xl border transition-all ${
                        state.vote === "down"
                          ? "bg-[#3BBFBF] border-[#3BBFBF] text-[#050505]"
                          : "bg-[#121212] border-[#2A2A2A] text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-[#F5F5F5]/50"
                      }`}
                    >
                      <ThumbsDown size={16} className={state.vote === "down" ? "fill-current" : ""} />
                    </button>

                    <div
                      className="relative"
                      onMouseEnter={() => hasSubmittedNote && setHoveredNoteId(song.id)}
                      onMouseLeave={() => setHoveredNoteId(null)}
                    >
                      <button
                        onClick={() => handleOpenNote(song.id)}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isNoteActive || hasSubmittedNote
                            ? "bg-[#1A1A1A] border-[#F5F5F5]/30 text-[#F5F5F5]"
                            : "bg-[#121212] border-[#2A2A2A] text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-[#F5F5F5]/50"
                        }`}
                      >
                        <MessageSquare size={16} className={hasSubmittedNote ? "fill-[#F5F5F5]/20" : ""} />
                      </button>

                      <AnimatePresence>
                        {isHoveringNote && hasSubmittedNote && !isNoteActive && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 6 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full right-0 mb-2 z-50 max-w-[200px] bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl px-3 py-2 text-xs text-[#F5F5F5] shadow-xl whitespace-pre-wrap break-words pointer-events-none"
                          >
                            <div className="absolute bottom-[-6px] right-3 w-3 h-3 bg-[#2A2A2A] border-r border-b border-[#3A3A3A] rotate-45" />
                            {state.submittedNote}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isNoteActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="relative">
                        <textarea
                          ref={textareaRef}
                          value={draftNote}
                          onChange={(e) => setDraftNote(e.target.value)}
                          onKeyDown={(e) => handleNoteKeyDown(e, song.id)}
                          placeholder="Add a note and press Enter to save..."
                          className="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl p-3 text-sm text-[#F5F5F5] placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#F5F5F5]/50 focus:ring-1 focus:ring-[#F5F5F5]/50 resize-none min-h-[80px] transition-all pr-24"
                        />
                        <span className="absolute bottom-3 right-3 text-[10px] text-[#A0A0A0] pointer-events-none">
                          Enter to save
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
    </div>
  );
};
