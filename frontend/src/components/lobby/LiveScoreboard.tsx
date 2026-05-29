import { useState, useEffect } from "react";
import { subscribeToLiveScores, supabase } from "@/lib/supabase";
import { truncateAddress, cn } from "@/lib/utils";

interface LiveScoreboardProps {
  matchId: number;
  playerA: string;
  playerB: string;
  state: string;
}

export default function LiveScoreboard({
  matchId,
  playerA,
  playerB,
  state,
}: LiveScoreboardProps) {
  const [scores, setScores] = useState<{ player: string; score: number }[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    // Subscribe to realtime score updates
    const channel = subscribeToLiveScores(matchId, (newScores) => {
      setScores(newScores);
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const scoreA = scores.find(
    (s) => s.player.toLowerCase() === playerA.toLowerCase()
  )?.score || 0;
  const scoreB = scores.find(
    (s) => s.player.toLowerCase() === playerB.toLowerCase()
  )?.score || 0;

  const isLeading = scoreA !== scoreB;

  return (
    <div className="qia-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-qia-accent font-mono">
          📺 LIVE SCOREBOARD
        </h3>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs text-qia-text-secondary">#{matchId}</span>
        </div>
      </div>

      {/* Score Display */}
      <div className="flex items-center justify-between py-4">
        {/* Player A */}
        <div className="text-center flex-1">
          <div
            className={cn(
              "inline-flex h-12 w-12 items-center justify-center rounded-full mb-2",
              isLeading && scoreA > scoreB
                ? "bg-qia-accent/20 border-2 border-qia-accent"
                : "bg-qia-surface border border-qia-border"
            )}
          >
            <span className="font-bold text-sm">A</span>
          </div>
          <p className="text-xs font-mono text-qia-text-secondary">
            {truncateAddress(playerA)}
          </p>
          <p
            className={cn(
              "text-3xl font-bold font-mono mt-1",
              isLeading && scoreA > scoreB
                ? "text-qia-accent glow-text-green"
                : "text-qia-text-primary"
            )}
          >
            {scoreA.toLocaleString()}
          </p>
        </div>

        {/* VS */}
        <div className="px-4">
          <span className="text-2xl font-bold text-qia-text-secondary">VS</span>
        </div>

        {/* Player B */}
        <div className="text-center flex-1">
          <div
            className={cn(
              "inline-flex h-12 w-12 items-center justify-center rounded-full mb-2",
              isLeading && scoreB > scoreA
                ? "bg-qia-info/20 border-2 border-qia-info"
                : "bg-qia-surface border border-qia-border"
            )}
          >
            <span className="font-bold text-sm">B</span>
          </div>
          <p className="text-xs font-mono text-qia-text-secondary">
            {truncateAddress(playerB)}
          </p>
          <p
            className={cn(
              "text-3xl font-bold font-mono mt-1",
              isLeading && scoreB > scoreA
                ? "text-qia-info"
                : "text-qia-text-primary"
            )}
          >
            {scoreB.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Match State */}
      <div className="text-center mt-2">
        <span
          className={cn(
            "qia-badge",
            state === "ACTIVE"
              ? "qia-badge-green"
              : state === "TIEBREAKER"
              ? "qia-badge-yellow"
              : "qia-badge"
          )}
        >
          {state}
        </span>
      </div>
    </div>
  );
}
