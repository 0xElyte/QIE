import { useState } from "react";
import { useRouter } from "next/router";
import { useContract, useContractWrite, useAddress } from "@thirdweb-dev/react";
import { CONTRACTS } from "@/lib/constants";
import { COMPETITION_LOBBY_ABI } from "@/lib/contracts";
import { truncateAddress, formatQIE, cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface MatchCardProps {
  matchId: number;
  playerA: string;
  playerB: string | null;
  betAmount: string;
  state: string;
  poolA: string;
  poolB: string;
  createdAt: string;
}

const STATE_COLORS: Record<string, string> = {
  CREATED: "qia-badge-yellow",
  JOINED: "qia-badge-blue",
  BETTING_OPEN: "qia-badge-green",
  LOCKED: "qia-badge",
  ACTIVE: "qia-badge-green",
  RESOLVED: "qia-badge",
  PAID_OUT: "qia-badge",
};

export default function MatchCard({
  matchId,
  playerA,
  playerB,
  betAmount,
  state,
  poolA,
  poolB,
  createdAt,
}: MatchCardProps) {
  const router = useRouter();
  const address = useAddress();
  const [isJoining, setIsJoining] = useState(false);
  const [betSide, setBetSide] = useState<"A" | "B" | null>(null);
  const [betAmountQIE, setBetAmountQIE] = useState("1");

  const { contract } = useContract(
    CONTRACTS.CompetitionLobby,
    COMPETITION_LOBBY_ABI
  );
  const { mutateAsync: joinCompetition } = useContractWrite(
    contract,
    "joinCompetition"
  );
  const { mutateAsync: addSpectator } = useContractWrite(
    contract,
    "addSpectator"
  );

  const handleJoin = async () => {
    if (!contract) return;
    setIsJoining(true);
    try {
      await joinCompetition({
        args: [matchId],
        overrides: { value: BigInt(betAmount) },
      });
      toast.success("Joined the competition! 🎯");
    } catch (err: any) {
      toast.error(err?.message || "Failed to join");
    } finally {
      setIsJoining(false);
    }
  };

  const handleSpectatorBet = async () => {
    if (!contract || !betSide) return;
    try {
      const sideNum = betSide === "A" ? 0 : 1;
      await addSpectator({
        args: [matchId, sideNum],
        overrides: { value: BigInt(Math.floor(parseFloat(betAmountQIE) * 1e18)) },
      });
      toast.success(`Bet placed on Player ${betSide}! 👀`);
      setBetSide(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to place bet");
    }
  };

  const isPlayerA = address?.toLowerCase() === playerA.toLowerCase();
  const isPlayerB = address?.toLowerCase() === playerB?.toLowerCase();
  const isParticipant = isPlayerA || isPlayerB;

  return (
    <div className="qia-card hover:border-qia-accent/30 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-qia-text-secondary">
            #{matchId}
          </span>
          <span className={cn("qia-badge", STATE_COLORS[state] || "")}>
            {state}
          </span>
        </div>
        <span className="font-mono text-sm font-bold text-qia-gold">
          {formatQIE(betAmount)}
        </span>
      </div>

      {/* Players */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-qia-accent/10 border border-qia-accent/30 flex items-center justify-center">
            <span className="text-xs font-bold text-qia-accent">A</span>
          </div>
          <div>
            <p className="text-sm font-medium">{truncateAddress(playerA)}</p>
            {BigInt(poolA) > 0n && (
              <p className="text-xs text-qia-accent">{formatQIE(poolA)} pool</p>
            )}
          </div>
        </div>

        <span className="text-qia-text-secondary font-mono text-xs">VS</span>

        <div className="flex items-center gap-2">
          {playerB ? (
            <>
              <div>
                <p className="text-sm font-medium text-right">
                  {truncateAddress(playerB)}
                </p>
                {BigInt(poolB) > 0n && (
                  <p className="text-xs text-qia-info text-right">
                    {formatQIE(poolB)} pool
                  </p>
                )}
              </div>
              <div className="h-8 w-8 rounded-full bg-qia-info/10 border border-qia-info/30 flex items-center justify-center">
                <span className="text-xs font-bold text-qia-info">B</span>
              </div>
            </>
          ) : (
            <div className="h-8 w-8 rounded-full bg-qia-border flex items-center justify-center">
              <span className="text-xs text-qia-text-secondary">?</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {/* Join button (if match is open and user isn't already in) */}
        {state === "CREATED" && !isParticipant && (
          <button
            onClick={handleJoin}
            disabled={isJoining}
            className="qia-btn-primary flex-1 text-sm"
          >
            {isJoining ? "Joining..." : "⚔️ Join Match"}
          </button>
        )}

        {/* Spectator bet buttons (if betting is open) */}
        {(state === "JOINED" || state === "BETTING_OPEN") && !isParticipant && (
          <>
            <button
              onClick={() => setBetSide("A")}
              className={cn(
                "qia-btn-secondary flex-1 text-sm",
                betSide === "A" && "!border-qia-accent !text-qia-accent"
              )}
            >
              👀 Bet on A
            </button>
            <button
              onClick={() => setBetSide("B")}
              className={cn(
                "qia-btn-secondary flex-1 text-sm",
                betSide === "B" && "!border-qia-info !text-qia-info"
              )}
            >
              👀 Bet on B
            </button>
          </>
        )}

        {/* View details */}
        {state === "ACTIVE" && (
          <button
            onClick={() => router.push(`/match/${matchId}`)}
            className="qia-btn-secondary flex-1 text-sm"
          >
            📺 Watch Live
          </button>
        )}

        {/* Always show view details */}
        <button
          onClick={() => router.push(`/match/${matchId}`)}
          className="qia-btn-secondary text-sm px-3"
        >
          →
        </button>
      </div>

      {/* Spectator bet form */}
      {betSide && (
        <div className="mt-3 pt-3 border-t border-qia-border animate-slide-up">
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              step="0.1"
              value={betAmountQIE}
              onChange={(e) => setBetAmountQIE(e.target.value)}
              className="qia-input flex-1 text-sm"
              placeholder="1.0 QIE"
            />
            <button onClick={handleSpectatorBet} className="qia-btn-primary text-sm">
              Place Bet
            </button>
            <button
              onClick={() => setBetSide(null)}
              className="qia-btn-secondary text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
