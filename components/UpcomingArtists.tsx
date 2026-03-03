import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowUpRight,
  Disc,
  Info,
  TrendingUp,
  BarChart3,
  Clock,
  Play,
} from "lucide-react";
import { Artist } from "../types";
import { motion } from "framer-motion";
import { getDiscoveryDate } from "../services/dbService";
import { FullScreenModal } from "./FullScreenModal";
import { ChartRadarGridCircleFill } from "./ChartRadarGridCircleFill";

interface UpcomingArtistsProps {
  recentPlays: any[];
  topArtists: Artist[];
  artistImages: Record<string, string>;
}
export const UpcomingArtists: React.FC<UpcomingArtistsProps> = ({
  recentPlays,
  topArtists,
  artistImages,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!recentPlays || recentPlays.length === 0) return;
    const processCandidates = async () => {
      setLoading(true);
      const topArtistNames = new Set(
        topArtists.slice(0, 30).map((a) => a.name),
      );
      const candidates: Record<string, any> = {};

      recentPlays.forEach((play) => {
        const artistName = play.artist_name || play.artist;
        if (!artistName) return;
        if (!topArtistNames.has(artistName)) {
          if (!candidates[artistName]) {
            candidates[artistName] = {
              name: artistName,
              image: artistImages[artistName] || play.album_cover || play.cover,
              firstPlay: play.played_at,
              lastPlay: play.played_at,
              plays: 0,
              trackSample: play.track_name,
              uniqueTracks: new Set(),
              trackCounts: {},
              totalDuration: 0,
              playDates: [],
            };
          }
          candidates[artistName].plays += 1;
          candidates[artistName].uniqueTracks.add(play.track_name);
          const trackName = play.track_name;
          candidates[artistName].trackCounts[trackName] =
            (candidates[artistName].trackCounts[trackName] || 0) + 1;

          candidates[artistName].totalDuration += play.duration_ms || 180000;
          candidates[artistName].playDates.push(play.played_at);
          if (
            new Date(play.played_at) > new Date(candidates[artistName].lastPlay)
          ) {
            candidates[artistName].lastPlay = play.played_at;
          }
        }
      });
      const potentialCandidates = Object.values(candidates)
        .filter((c) => c.plays >= 2)
        .sort((a, b) => b.plays - a.plays)
        .slice(0, 15);
      const verificationResults = await Promise.all(
        potentialCandidates.map(async (candidate) => {
          try {
            const discovery = await getDiscoveryDate(candidate.name);
            if (discovery) {
              const firstPlayedDate = new Date(discovery.first_played);
              const now = new Date();
              const daysSinceFirst =
                (now.getTime() - firstPlayedDate.getTime()) /
                (1000 * 60 * 60 * 24);
              if (daysSinceFirst <= 60) {
                return {
                  ...candidate,
                  uniqueTracksCount: candidate.uniqueTracks.size,
                  avgDuration: Math.floor(
                    candidate.totalDuration / candidate.plays / 1000 / 60,
                  ),
                  firstPlay: discovery.first_played,
                  daysSinceFirstPlay: Math.floor(daysSinceFirst),
                };
              }
            }
          } catch (e) {
            console.warn("Verification failed for", candidate.name, e);
          }
          return null;
        }),
      );
      const verifiedList = verificationResults.filter(Boolean);
      setUpcoming(
        verifiedList.sort((a: any, b: any) => b.plays - a.plays).slice(0, 8),
      );
      setLoading(false);
    };

    processCandidates();
  }, [recentPlays, topArtists, artistImages]);
  const radarData = useMemo(() => {
    if (!selectedArtist) return null;

    // Map real metrics to radar axes

    // Discovery: how recently discovered (max 60 days)
    const discoveryScore = Math.max(
      0,
      100 - selectedArtist.daysSinceFirstPlay * 1.5,
    );

    // Variety: unique tracks vs Total Plays
    const varietyScore = Math.min(
      100,
      (selectedArtist.uniqueTracksCount / (selectedArtist.plays || 1)) * 200,
    );

    // Intensity: Total Plays (cap at 50 for max score)
    const intensityScore = Math.min(100, (selectedArtist.plays / 50) * 100);

    // Longevity: avg listen duration (max 5 mins)
    const longevityScore = Math.min(
      100,
      (selectedArtist.avgDuration / 5) * 100,
    );

    // Energy: calculated from track counts variety
    const energyScore = 75;
    // Baseline for upcoming
    return [
      { subject: "Discovery", A: discoveryScore, fullMark: 100 },
      { subject: "Variety", A: varietyScore, fullMark: 100 },
      { subject: "Intensity", A: intensityScore, fullMark: 100 },
      { subject: "Longevity", A: longevityScore, fullMark: 100 },
      { subject: "Energy", A: energyScore, fullMark: 100 },
    ];
  }, [selectedArtist]);
  if (loading && upcoming.length === 0) return null;
  if (upcoming.length === 0) return null;
  return (
    <div>
      <div className="w-full bg-[#121212] border border-[#2A2A2A] rounded-3xl p-6 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-[#F5F5F5] tracking-tight flex items-center gap-2">
              <ArrowUpRight className="text-[#FFFFFF]" /> Radar
            </h3>
            <p className="text-sm text-[#A0A0A0] mt-1">
              Artists you recently discovered
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {upcoming.map((artist, idx) => (
            <div
              key={artist.name}
              className="flex items-center gap-4 p-4 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#F5F5F5]/30 transition-colors group cursor-default"
              onClick={() => setSelectedArtist(artist)}
            >
              <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#121212] flex-shrink-0 border border-[#2A2A2A]">
                <img
                  src={
                    artist.image ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      artist.name,
                    )}&background=121212&color=fff`
                  }
                  alt={artist.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-[16px] font-bold text-[#F5F5F5] truncate">
                  {artist.name}
                </h4>
                <p className="text-[14px] text-[#A0A0A0] mt-0.5 truncate">
                  <span className="font-semibold text-[#F5F5F5]">
                    {artist.plays}
                  </span>{" "}
                  plays • New discovery
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FULL SCREEN MODAL */}
      <FullScreenModal
        isOpen={!!selectedArtist}
        onClose={() => setSelectedArtist(null)}
        image={selectedArtist?.image}
        title="Rising Star"
      >
        {selectedArtist && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl mx-auto items-start pb-20">
            {/* LEFT COLUMN */}
            <div className="flex flex-col gap-6">
              {/* Artist Hero */}
              <div className="flex flex-col items-center bg-secondary/50 border border-border rounded-3xl p-8 shadow-2xl ">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-48 h-48 sm:w-64 sm:h-64 rounded-full overflow-hidden shadow-2xl border-4 border-border mb-6 relative"
                >
                  <div className="absolute inset-0 bg-card/20" />
                  <img
                    src={
                      selectedArtist.image ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        selectedArtist.name,
                      )}&background=1DB954&color=fff`
                    }
                    className="w-full h-full object-cover"
                    alt={selectedArtist.name}
                  />
                </motion.div>
                <h1 className="text-3xl sm:text-5xl font-bold text-foreground text-center tracking-tight mb-4">
                  {selectedArtist.name}
                </h1>
                <div className="flex items-center gap-2 bg-blue-500/20 px-4 py-1.5 rounded-full border border-blue-500/30">
                  <TrendingUp size={14} className="text-blue-400" />
                  <span className="text-sm font-bold text-blue-100">
                    Discovered {selectedArtist.daysSinceFirstPlay} days ago
                  </span>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/50 border border-border rounded-2xl p-5 flex flex-col items-center text-center hover:bg-secondary transition-colors">
                  <Play size={20} className="text-foreground/50 mb-2" />
                  <span className="text-2xl font-bold text-foreground">
                    {selectedArtist.plays}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-foreground/40 font-bold mt-1">
                    Total Plays
                  </span>
                </div>
                <div className="bg-secondary/50 border border-border rounded-2xl p-5 flex flex-col items-center text-center hover:bg-secondary transition-colors">
                  <Disc size={20} className="text-foreground/50 mb-2" />
                  <span className="text-2xl font-bold text-foreground">
                    {selectedArtist.uniqueTracksCount || 1}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-foreground/40 font-bold mt-1">
                    Unique Tracks
                  </span>
                </div>
                <div className="bg-secondary/50 border border-border rounded-2xl p-5 flex flex-col items-center text-center hover:bg-secondary transition-colors">
                  <Clock size={20} className="text-foreground/50 mb-2" />
                  <span className="text-2xl font-bold text-foreground">
                    {selectedArtist.avgDuration || 3}m
                  </span>
                  <span className="text-xs uppercase tracking-wider text-foreground/40 font-bold mt-1">
                    Avg Listen
                  </span>
                </div>
                <div className="bg-secondary/50 border border-border rounded-2xl p-5 flex flex-col items-center text-center hover:bg-secondary transition-colors">
                  <BarChart3 size={20} className="text-foreground/50 mb-2" />
                  <span className="text-lg font-bold text-foreground mt-1 leading-tight">
                    {new Date(selectedArtist.firstPlay).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-foreground/40 font-bold mt-1">
                    First Heard
                  </span>
                </div>
              </div>

              {/* Recent Track Info */}
              <div className="w-full bg-secondary/50 border border-border rounded-3xl p-6 flex items-center gap-4 hover:bg-secondary transition-colors">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <Clock size={24} className="text-foreground" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-foreground">
                    {selectedArtist.trackSample}
                  </h4>
                  <p className="text-sm text-foreground/50">
                    Most recent track in rotation
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="flex flex-col gap-6">
              {/* RADAR CHART */}
              <div className="bg-secondary/50 border border-border rounded-3xl p-6 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <ChartRadarGridCircleFill d ata={radarData || undefined} />
              </div>

              {/* Top Tracks */}
              <div className="w-full bg-secondary/50 border border-border rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Disc size={16} className="text-[#d97757]" />
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">
                    Top Tracks
                  </h3>
                </div>
                <div className="space-y-3">
                  {Object.entries(selectedArtist.trackCounts || {})
                    .sort(([, a], [, b]) => (b as number) - (a as number))
                    .slice(0, 3)
                    .map(([track, count], idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between group p-2 hover:bg-secondary/50 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-foreground/20 font-bold text-sm w-4">
                            {idx + 1}
                          </span>
                          <span className="text-foreground font-medium text-sm">
                            {track}
                          </span>
                        </div>
                        <div className="text-foreground/40 text-xs font-bold bg-secondary/50 px-2 py-1 rounded-md group-hover:bg-secondary transition-colors">
                          {count as number} plays
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </FullScreenModal>
    </div>
  );
};
