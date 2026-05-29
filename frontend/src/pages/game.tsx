import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useAddress, useContract, useContractWrite } from "@thirdweb-dev/react";
import Layout from "@/components/shared/Layout";
import { CONTRACTS } from "@/lib/constants";
import { COMPETITION_LOBBY_ABI } from "@/lib/contracts";
import toast from "react-hot-toast";

// ═══════════════════════════════════════════
//  Game Page
//  Hosts Unity WebGL build in iframe + handles
//  score submission via postMessage bridge
// ═══════════════════════════════════════════

interface GameMessage {
  type: string;
  payload?: any;
}

export default function GamePage() {
  const router = useRouter();
  const { matchId, spectate } = router.query;
  const address = useAddress();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [gameLoaded, setGameLoaded] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gamePhase, setGamePhase] = useState<
    "loading" | "countdown" | "playing" | "finished" | "submitted"
  >("loading");

  const { contract } = useContract(
    CONTRACTS.CompetitionLobby,
    COMPETITION_LOBBY_ABI
  );
  const { mutateAsync: submitFinalScore } = useContractWrite(
    contract,
    "submitFinalScore"
  );

  // Listen for messages from Unity WebGL
  const handleUnityMessage = useCallback(
    async (event: MessageEvent) => {
      const msg = event.data as GameMessage;

      switch (msg.type) {
        case "UNITY_LOADED":
          setGameLoaded(true);
          setGamePhase("countdown");
          // Send match config to Unity
          sendMessageToUnity({
            type: "INIT_MATCH",
            payload: {
              matchId: Number(matchId),
              playerAddress: address,
              isSpectator: spectate === "1",
            },
          });
          break;

        case "COUNTDOWN_COMPLETE":
          setGamePhase("playing");
          break;

        case "GAME_OVER":
          setGamePhase("finished");
          setFinalScore(msg.payload.score);
          break;

        case "SCORE_SIGNED":
          // Unity sent back the signed score
          await handleScoreSubmit(
            msg.payload.score,
            msg.payload.metadataHash,
            msg.payload.signature
          );
          break;

        case "GAME_ERROR":
          toast.error(msg.payload.message || "Game error occurred");
          break;
      }
    },
    [matchId, address, spectate]
  );

  useEffect(() => {
    window.addEventListener("message", handleUnityMessage);
    return () => window.removeEventListener("message", handleUnityMessage);
  }, [handleUnityMessage]);

  // Send message to Unity iframe
  const sendMessageToUnity = (msg: GameMessage) => {
    iframeRef.current?.contentWindow?.postMessage(msg, "*");
  };

  // Submit signed score to blockchain
  const handleScoreSubmit = async (
    score: number,
    metadataHash: string,
    signature: string
  ) => {
    if (!contract || !matchId) return;

    setIsSubmitting(true);
    try {
      await submitFinalScore({
        args: [Number(matchId), score, metadataHash, signature],
      });
      setGamePhase("submitted");
      toast.success(`Score ${score} submitted on-chain! 🎯`);
    } catch (err: any) {
      toast.error(err?.reason || err?.message || "Score submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manual score submit (fallback if auto-sign fails)
  const handleManualSubmit = () => {
    sendMessageToUnity({ type: "REQUEST_SCORE_SIGN" });
  };

  return (
    <Layout title="Game">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => router.push(`/match/${matchId}`)}
          className="text-sm text-qia-text-secondary hover:text-qia-accent transition-colors"
        >
          ← Back to Match #{matchId}
        </button>

        {/* Game phase indicator */}
        <div className="flex items-center gap-2">
          {gamePhase === "loading" && (
            <span className="qia-badge-yellow">Loading Unity...</span>
          )}
          {gamePhase === "countdown" && (
            <span className="qia-badge-blue">Get Ready...</span>
          )}
          {gamePhase === "playing" && (
            <span className="qia-badge-green animate-pulse-glow">
              🔴 LIVE
            </span>
          )}
          {gamePhase === "finished" && (
            <span className="qia-badge">Score: {finalScore}</span>
          )}
          {gamePhase === "submitted" && (
            <span className="qia-badge-green">✅ Submitted</span>
          )}
        </div>
      </div>

      {/* Unity WebGL Container */}
      <div className="relative rounded-xl overflow-hidden border border-qia-border bg-black">
        {!gameLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-qia-bg z-10">
            <div className="text-center">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-2 border-qia-accent border-t-transparent mb-4" />
              <p className="text-qia-text-secondary">
                Loading Q.I.A Game Client...
              </p>
              <p className="text-xs text-qia-text-secondary mt-2">
                Unity WebGL build • {matchId ? `Match #${matchId}` : "Practice"}
              </p>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src="/game/index.html"
          className="w-full"
          style={{ height: "70vh", minHeight: "500px" }}
          allow="autoplay; fullscreen"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>

      {/* Score Submission Bar */}
      {gamePhase === "finished" && (
        <div className="mt-4 qia-card animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-qia-text-secondary">Final Score</p>
              <p className="text-3xl font-bold font-mono text-qia-accent">
                {finalScore?.toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleManualSubmit}
                disabled={isSubmitting}
                className="qia-btn-primary"
              >
                {isSubmitting
                  ? "⏳ Submitting..."
                  : "🔏 Sign & Submit Score"}
              </button>
            </div>
          </div>
          <p className="text-xs text-qia-text-secondary mt-2">
            Your score will be ECDSA-signed and submitted to the blockchain.
            Both players must submit to resolve the match.
          </p>
        </div>
      )}

      {/* Submitted confirmation */}
      {gamePhase === "submitted" && (
        <div className="mt-4 qia-card text-center animate-slide-up">
          <div className="text-4xl mb-2">✅</div>
          <p className="text-lg font-bold text-qia-accent">
            Score Submitted Successfully!
          </p>
          <p className="text-sm text-qia-text-secondary mt-1">
            Waiting for opponent to submit their score...
          </p>
          <button
            onClick={() => router.push(`/match/${matchId}`)}
            className="qia-btn-secondary mt-4"
          >
            View Match Details
          </button>
        </div>
      )}
    </Layout>
  );
}
