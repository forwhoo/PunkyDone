import React, { useState, useEffect } from "react";
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
      },
    }));
  };

  const handleNoteChange = (id: string, note: string) => {
    setVotes((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        vote: prev[id]?.vote || null,
        note,
      },
    }));
  };

  if (!songs || songs.length === 0) {
    return null;
  }

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
        {songs.slice(0, 5).map((song) => {
          const state = votes[song.id] || { vote: null, note: "" };
          const isNoteActive = activeNoteId === song.id;

          return (
            <div
              key={song.id}
              className="group flex flex-col gap-3 p-4 bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl transition-all hover:border-[#F5F5F5]/30"
            >
              <div className="flex items-center gap-4">
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
                  <button
                    onClick={() => setActiveNoteId(isNoteActive ? null : song.id)}
                    className={`p-2.5 rounded-xl border transition-all ${
                      isNoteActive || state.note
                        ? "bg-[#1A1A1A] border-[#F5F5F5]/30 text-[#F5F5F5]"
                        : "bg-[#121212] border-[#2A2A2A] text-[#A0A0A0] hover:text-[#F5F5F5] hover:border-[#F5F5F5]/50"
                    }`}
                  >
                    <MessageSquare size={16} className={state.note ? "fill-[#F5F5F5]/10" : ""} />
                  </button>
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
                    <textarea
                      value={state.note}
                      onChange={(e) => handleNoteChange(song.id, e.target.value)}
                      placeholder="Add a note about this track..."
                      className="w-full bg-[#121212] border border-[#2A2A2A] rounded-xl p-3 text-sm text-[#F5F5F5] placeholder:text-[#A0A0A0] focus:outline-none focus:border-[#F5F5F5]/50 focus:ring-1 focus:ring-[#F5F5F5]/50 resize-none min-h-[80px] transition-all"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};
