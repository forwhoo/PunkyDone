import React, { useState, useEffect } from "react";
import { Star, MessageSquare, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface VotableSong {
  id: string;
  title: string;
  artist: string;
  cover: string;
}

interface VoteState {
  rating: number; // 1-5, 0 = unrated
  submittedNote: string;
}

const WEEKLY_VOTES_STORAGE_PREFIX = "weekly_votes_v3";
const LEGACY_WEEKLY_VOTES_KEY = "weekly_votes_v2";

/** Wilson Score Interval: A robust rating algorithm.
 * Since each user has 1 vote per song, we map the 1-5 star rating to a probability of being a "positive" vote.
 * We treat stars as: 1=0.0, 2=0.25, 3=0.5, 4=0.75, 5=1.0.
 * We use a lower bound of Wilson score confidence interval for a Bernoulli parameter.
 */
function wilsonScore(rating: number, z = 1.96): number {
  if (rating === 0) return -1;

  // Map 1-5 rating to 0-1 probability of "positive" interaction
  const p = (rating - 1) / 4;
  const n = 1; // 1 user rating

  // Wilson score formula lower bound
  const left = p + (z * z) / (2 * n);
  const right = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  const under = 1 + (z * z) / n;

  return (left - right) / under;
}

const STAR_LABELS = ["", "Skip", "Meh", "Okay", "Good", "Banger!"];
const STAR_COLORS = ["", "#6B6B6B", "#A0A0A0", "#d97757", "#F5A623", "#3BBFBF"];

const getWeekStartKey = (date = new Date()) => {
  const start = new Date(date);
  const dayOfWeek = start.getDay();
  const daysToMonday = (dayOfWeek + 6) % 7;
  start.setDate(start.getDate() - daysToMonday);
  start.setHours(0, 0, 0, 0);
  return start.toISOString().split("T")[0];
};

const getWeeklyVotesStorageKey = (weekKey: string) =>
  `${WEEKLY_VOTES_STORAGE_PREFIX}_${weekKey}`;

const isVoteState = (value: unknown): value is VoteState => {
  if (!value || typeof value !== "object") return false;
  const vote = value as VoteState;
  return (
    typeof vote.rating === "number" &&
    vote.rating >= 0 &&
    vote.rating <= 5 &&
    typeof vote.submittedNote === "string"
  );
};

const readStoredVotes = (weekKey: string) => {
  if (typeof window === "undefined") return {};

  const currentKey = getWeeklyVotesStorageKey(weekKey);

  try {
    const saved = localStorage.getItem(currentKey);
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, VoteState>;
      return Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => isVoteState(value))
      );
    }

    const legacy = localStorage.getItem(LEGACY_WEEKLY_VOTES_KEY);
    if (!legacy) return {};

    const parsed = JSON.parse(legacy) as Record<string, VoteState>;
    const sanitized = Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isVoteState(value))
    );

    localStorage.setItem(currentKey, JSON.stringify(sanitized));
    localStorage.removeItem(LEGACY_WEEKLY_VOTES_KEY);

    return sanitized;
  } catch {
    return {};
  }
};

export const WeeklyVotes = ({ songs }: { songs: VotableSong[] }) => {
  const [weekKey] = useState(() => getWeekStartKey());
  const [votes, setVotes] = useState<Record<string, VoteState>>(() =>
    readStoredVotes(weekKey)
  );

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [hoveredStar, setHoveredStar] = useState<{ id: string; star: number } | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem(getWeeklyVotesStorageKey(weekKey), JSON.stringify(votes));

    Object.keys(localStorage)
      .filter(
        (key) =>
          key.startsWith(`${WEEKLY_VOTES_STORAGE_PREFIX}_`) &&
          key !== getWeeklyVotesStorageKey(weekKey)
      )
      .forEach((key) => localStorage.removeItem(key));
  }, [votes, weekKey]);

  if (!songs || songs.length === 0) return null;

  const pool = songs.slice(0, 10);
  const originalOrder = new Map(pool.map((song, index) => [song.id, index]));

  const rated = pool.filter((s) => votes[s.id]?.rating > 0);
  const totalRated = rated.length;
  const globalMean = totalRated > 0
    ? rated.reduce((sum, s) => sum + (votes[s.id]?.rating || 0), 0) / totalRated
    : 3;

  const sortedSongs = [...pool].sort((a, b) => {
    const ratingA = votes[a.id]?.rating || 0;
    const ratingB = votes[b.id]?.rating || 0;

    const sa = wilsonScore(ratingA);
    const sb = wilsonScore(ratingB);

    // Sort by Wilson score descending
    if (Math.abs(sb - sa) > 0.0001) return sb - sa;

    // Tie-breaker: raw rating
    if (ratingB !== ratingA) return ratingB - ratingA;

    // Ultimate tie-breaker: original order
    return (originalOrder.get(a.id) || 0) - (originalOrder.get(b.id) || 0);
  });

  const handleRate = (id: string, star: number) => {
    setVotes((prev) => ({
      ...prev,
      [id]: {
        submittedNote: prev[id]?.submittedNote || "",
        rating: prev[id]?.rating === star ? 0 : star,
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
        [id]: { rating: prev[id]?.rating || 0, submittedNote: trimmed },
      }));
      setActiveNoteId(null);
      setDraftNote("");
    }
  };

  const allVoted = pool.every((s) => (votes[s.id]?.rating || 0) > 0);
  const topSong = sortedSongs[0];
  const topRating = votes[topSong?.id]?.rating || 0;

  // Distribution chart
  const dist = [1, 2, 3, 4, 5].map((star) =>
    pool.filter((s) => (votes[s.id]?.rating || 0) === star).length
  );
  const maxDist = Math.max(...dist, 1);

  return (
    <div className="w-full bg-[#121212] border border-[#2A2A2A] rounded-3xl overflow-hidden relative shadow-lg shadow-[#000000]/50 group/votes-card">
      <div className="absolute inset-0 bg-gradient-to-br from-[#d97757]/5 to-transparent pointer-events-none opacity-0 group-hover/votes-card:opacity-100 transition-opacity duration-700" />
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-[#2A2A2A]/50 bg-[#151515]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[18px] font-bold text-foreground tracking-tight flex items-center gap-2">
              Weekly Votes
            </h3>
            {totalRated > 0 && (
              <span className="text-[10px] font-bold text-[#d97757] bg-[#d97757]/10 border border-[#d97757]/20 px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                {totalRated}/{pool.length} rated
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#A0A0A0] font-medium leading-tight">Rate your top tracks this week using our Wilson Score algorithm.</p>
        </div>

        {/* Dynamic Equalizer / Chart */}
        <div className="flex items-end gap-1.5 h-8">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex flex-col items-center justify-end h-full">
              <div
                className="w-[6px] rounded-full transition-all duration-500 ease-out"
                style={{
                  height: `${Math.max(4, (dist[s - 1] / maxDist) * 32)}px`,
                  backgroundColor: dist[s - 1] > 0 ? STAR_COLORS[s] : '#2A2A2A',
                  opacity: dist[s - 1] > 0 ? 0.9 : 0.4,
                  boxShadow: dist[s - 1] > 0 ? `0 0 8px ${STAR_COLORS[s]}40` : 'none'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      {totalRated > 0 && (
        <div className="px-5 py-3 bg-[#181818]">
          <div className="w-full h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden flex shadow-inner">
            {[5, 4, 3, 2, 1].map((star) => (
              <div
                key={star}
                className="h-full transition-all duration-500"
                style={{
                  width: `${(dist[star - 1] / pool.length) * 100}%`,
                  backgroundColor: STAR_COLORS[star],
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Song list */}
      <div className="p-3 space-y-1 bg-[#121212]">
        <AnimatePresence>
          {sortedSongs.map((song, index) => {
            const state = votes[song.id] || { rating: 0, submittedNote: "" };
            const isNoteActive = activeNoteId === song.id;
            const hasNote = !!state.submittedNote;
            const currentRating = state.rating;
            const hovered = hoveredStar?.id === song.id ? hoveredStar.star : null;
            const displayRating = hovered ?? currentRating;

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
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-[#1A1A1A] border border-transparent hover:border-[#2A2A2A] transition-all duration-300 group">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#181818] border border-[#2A2A2A] group-hover:border-[#3A3A3A] transition-colors shrink-0">
                    <span className={`text-[11px] font-bold ${currentRating > 0 ? "text-foreground" : "text-[#6B6B6B]"}`}>
                      {currentRating > 0 ? index + 1 : "—"}
                    </span>
                  </div>

                  {/* Cover */}
                  <div
                    className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 cursor-pointer"
                    onClick={() => handleOpenNote(song.id)}
                  >
                    <img src={song.cover} alt={song.title} className="w-full h-full object-cover" />
                    {hasNote && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#121212]/90 border border-[#2A2A2A] flex items-center justify-center shadow-sm">
                        <MessageSquare size={9} className="text-[#F5F5F5]" />
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[14px] font-semibold text-foreground truncate leading-tight tracking-tight">
                      {song.title}
                    </p>
                    <p className="text-[12px] text-[#8A8A8A] truncate font-medium flex items-center gap-1.5 mt-0.5">
                      {song.artist}
                      {currentRating > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-[#3A3A3A]" />
                          <span
                            className="text-[11px] font-bold uppercase tracking-wider"
                            style={{ color: STAR_COLORS[currentRating] }}
                          >
                            {STAR_LABELS[currentRating]}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-1 shrink-0 bg-[#181818] p-1.5 rounded-full border border-[#2A2A2A]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRate(song.id, star)}
                        onMouseEnter={() => setHoveredStar({ id: song.id, star })}
                        onMouseLeave={() => setHoveredStar(null)}
                        className="p-1 transition-all hover:scale-125 active:scale-95 focus:outline-none rounded-full"
                      >
                        <Star
                          size={15}
                          className={`transition-all duration-200 ${star <= displayRating ? 'drop-shadow-md' : ''}`}
                          style={{
                            fill: star <= displayRating ? STAR_COLORS[currentRating || star] : "transparent",
                            color: star <= displayRating ? STAR_COLORS[currentRating || star] : "#3A3A3A",
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note textarea */}
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

      {/* Top pick footer */}
      {allVoted && pool.length > 0 && topRating > 0 && (
        <div className="px-5 py-3 border-t border-[#1A1A1A] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy size={13} className="text-[#d97757]" />
            <p className="text-[11px] text-[#A0A0A0] font-medium">
              Top pick: <span className="text-[#F5F5F5] font-bold">{topSong?.title}</span>
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={10}
                style={{
                  fill: s <= topRating ? STAR_COLORS[topRating] : "transparent",
                  color: s <= topRating ? STAR_COLORS[topRating] : "#2A2A2A",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
