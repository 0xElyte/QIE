import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import {
  useAddress,
  useContract,
  useContractRead,
  useContractWrite,
} from "@thirdweb-dev/react";
import Layout from "@/components/shared/Layout";
import LiveScoreboard from "@/components/lobby/LiveScoreboard";
import { CONTRACTS, MATCH_STATES } from "@/lib/constants";
import { COMPETITION_LOBBY_ABI } from "@/lib/contracts";
import { truncateAddress, formatQIE, cn, formatDuration } from "@/lib/utils";
import { getMatch, getSpectatorBets } from "@/lib/supabase";
import toast from "react-hot-toast";

export default function MatchDetail() {
  const router = useRouter();
  const { id } = router.query;
  const matchId = id ? Number(id) : null;
  const address = useAddress();

  const { contract } = useContract(
    CONTRACTS.CompetitionLobby,
    COMPETITION_LOBBY_ABI
  );

  // On-chain match data
  const { data: matchData, isLoading } = useContractRead(contract, "matches", [
    matchId ?? 0,
  ]);

  const { mutateAsync: startMatch } = useContractWrite(contract, "startMatch");
  const { mutateAsync: lockBetting } = useContractWrite(
    contract,
    "lockBetting"
  );
  const { mutateAsync: claimWinnings } = useContractWrite(
    contract,
    "claimWinnings"
  );

  const [spectatorBets, setSpectatorBets] = useState<any[]>([]);
  const [canLockState, setCanLockState] = useState(false);

  useEffect(() => {
    if (matchId !== null) {
      getSpectatorBets(matchId).then(setSpectatorBets).catch(console.error);
    }
  }, [matchId]);

  // Destructure on-chain match data
  const [
    playerA,
    playerB,
    betAmount,
    state,
    duration,
    startTime,
    bettingOpenedAt,
    endTime,
    finalScoreA,
    finalScoreB,
    scoreSubmittedA,
    scoreSubmittedB,
    tiebreakerDistanceA,
    tiebreakerDistanceB,
    tiebreakerSubmittedA,
    tiebreakerSubmittedB,
    totalPoolA,
    totalPoolB,
    maxSpectatorsPerSide,
    allowedOpponent,
    totalPayouts,
  ] = matchData || [];

  const stateName = state !== undefined ? MATCH_STATES[Number(state)] : "LOADING";
  const isPlayerA =
    address?.toLowerCase() === playerA?.toLowerCase();
  const isPlayerB =
    address?.toLowerCase() === playerB?.toLowerCase();
  const isParticipant = isPlayerA || isPlayerB;

  const handleStartMatch = async () => {
    if (!contract || matchId === null) return;
    try {
      await startMatch({ args: [matchId] });
      toast.success("Match started! 🎯");
    } catch (err: any) {
      toast.error(err?.reason || err?.message || "Failed to start match");
    }
  };

  const handleLockBetting = async () => {
    if (!contract || matchId === null) return;
    try {
      await lockBetting({ args: [matchId] });
      toast.success("Betting locked! 🔒");
    } catch (err: any) {
      toast.error(err?.reason || err?.message || "Failed to lock betting");
    }
  };

  const handleClaim = async () => {
    if (!contract || matchId === null) return;
    try {
      await claimWinnings({ args: [matchId] });
      toast.success("Winnings claimed! 💰");
    } catch (err: any) {
      toast.error(err?.reason || err?.message || "Failed to claim");
    }
  };

  if (isLoading || matchId === null) {
    return (
      <Layout title="Match">
        <div className="text-center py-16">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-qia-accent border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!playerA || playerA === "0x0000000000000000000000000000000000000000") {
    return (
      <Layout title="Match Not Found">
        <div className="text-center py-16 qia-card">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-qia-text-secondary">Match #{matchId} not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`Match #${matchId}`}>
      <div className="mb-4">
        <button
          onClick={() => router.push("/lobby")}
          className="text-sm text-qia-text-secondary hover:text-qia-accent transition-colors"
        >
          ← Back to Lobby
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Match Info + Actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Match Header */}
          <div className="qia-card">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold font-mono text-qia-accent">
                ⚔️ Match #{matchId}
              </h1>
              <span
                className={cn(
                  "qia-badge",
                  stateName === "ACTIVE"
                    ? "qia-badge-green"
                    : stateName === "RESOLVED"
                    ? "qia-badge"
                    : stateName === "TIEBREAKER"
                    ? "qia-badge-yellow"
                    : "qia-badge-blue"
                )}
              >
                {stateName}
              </span>
            </div>

            {/* Players */}
            <div className="flex items-center justify-between py-4 border-y border-qia-border">
              <div className="text-center flex-1">
                <div className="h-12 w-12 rounded-full bg-qia-accent/10 border border-qia-accent/30 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-qia-accent">A</span>
                </div>
                <p className="text-sm font-mono">
                  {isPlayerA ? "You" : truncateAddress(playerA)}
                </p>
                {scoreSubmittedA && (
                  <p className="text-2xl font-bold font-mono text-qia-accent mt-1">
                    {Number(finalScoreA).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="px-6 text-center">
                <p className="text-xs text-qia-text-secondary mb-1">
                  {formatQIE(betAmount)} each
                </p>
                <p className="text-2xl font-bold text-qia-text-secondary">VS</p>
              </div>

              <div className="text-center flex-1">
                <div className="h-12 w-12 rounded-full bg-qia-info/10 border border-qia-info/30 flex items-center justify-center mx-auto mb-2">
                  <span className="font-bold text-qia-info">B</span>
                </div>
                <p className="text-sm font-mono">
                  {playerB === "0x0000000000000000000000000000000000000000"
                    ? "Waiting..."
                    : isPlayerB
                    ? "You"
                    : truncateAddress(playerB)}
                </p>
                {scoreSubmittedB && (
                  <p className="text-2xl font-bold font-mono text-qia-info mt-1">
                    {Number(finalScoreB).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Actions based on state */}
            <div className="mt-4 flex flex-wrap gap-2">
              {stateName === "LOCKED" && isParticipant && (
                <button onClick={handleStartMatch} className="qia-btn-primary">
                  🎮 Start Match
                </button>
              )}
              {(stateName === "JOINED" || stateName === "BETTING_OPEN") && (
                <button onClick={handleLockBetting} className="qia-btn-secondary">
                  🔒 Lock Betting
                </button>
              )}
              {stateName === "ACTIVE" && isParticipant && (
                <button
                  onClick={() => router.push(`/game?matchId=${matchId}`)}
                  className="qia-btn-primary"
                >
                  🎮 Open Game
                </button>
              )}
              {stateName === "RESOLVED" && (
                <button onClick={handleClaim} className="qia-btn-primary">
                  💰 Claim Winnings
                </button>
              )}
              {stateName === "ACTIVE" && !isParticipant && (
                <button
                  onClick={() => router.push(`/game?matchId=${matchId}&spectate=1`)}
                  className="qia-btn-secondary"
                >
                  📺 Watch Live
                </button>
              )}
            </div>
          </div>

          {/* Live Scoreboard (for active matches) */}
          {(stateName === "ACTIVE" || stateName === "TIEBREAKER") && (
            <LiveScoreboard
              matchId={matchId}
              playerA={playerA}
              playerB={playerB}
              state={stateName}
            />
          )}
        </div>

        {/* Right: Spectator Info */}
        <div className="space-y-4">
          <div className="qia-card">
            <h3 className="text-sm font-bold text-qia-text-secondary mb-3">
              👀 Spectator Pools
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Pool A</span>
                <span className="font-mono text-sm text-qia-accent">
                  {formatQIE(totalPoolA || "0")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pool B</span>
                <span className="font-mono text-sm text-qia-info">
                  {formatQIE(totalPoolB || "0")}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-qia-border">
                <span className="text-sm font-medium">Total Pot</span>
                <span className="font-mono text-sm font-bold text-qia-gold">
                  {formatQIE(
                    (
                      BigInt(betAmount || 0) * 2n +
                      BigInt(totalPoolA || 0) +
                      BigInt(totalPoolB || 0)
                    ).toString()
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Spectator Bets List */}
          {spectatorBets.length > 0 && (
            <div className="qia-card">
              <h3 className="text-sm font-bold text-qia-text-secondary mb-3">
                Bets Placed
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {spectatorBets.map((bet: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="font-mono text-qia-text-secondary">
                      {truncateAddress(bet.bettor)}
                    </span>
                    <span
                      className={
                        bet.side === "A" ? "text-qia-accent" : "text-qia-info"
                      }
                    >
                      {formatQIE(bet.amount_wei)} → {bet.side}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
