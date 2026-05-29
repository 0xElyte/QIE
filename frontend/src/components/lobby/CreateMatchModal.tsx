import { useState } from "react";
import { useContract, useContractWrite } from "@thirdweb-dev/react";
import { CONTRACTS, MIN_BET_WEI, MIN_DURATION, MAX_DURATION } from "@/lib/constants";
import { COMPETITION_LOBBY_ABI } from "@/lib/contracts";
import { parseQIE } from "@/lib/utils";
import toast from "react-hot-toast";

interface CreateMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateMatchModal({ isOpen, onClose }: CreateMatchModalProps) {
  const [betAmount, setBetAmount] = useState("1");
  const [duration, setDuration] = useState(120);
  const [opponentAddress, setOpponentAddress] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { contract } = useContract(
    CONTRACTS.CompetitionLobby,
    COMPETITION_LOBBY_ABI
  );
  const { mutateAsync: createCompetition } = useContractWrite(
    contract,
    "createCompetition"
  );

  const handleCreate = async () => {
    if (!contract) return;

    const betWei = parseQIE(betAmount);
    if (betWei < BigInt(MIN_BET_WEI)) {
      toast.error("Minimum bet is 1 QIE");
      return;
    }

    setIsCreating(true);
    try {
      const tx = await createCompetition({
        args: [duration, opponentAddress || "0x0000000000000000000000000000000000000000"],
        overrides: { value: betWei },
      });
      toast.success("Competition created! 🎯");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create competition");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="qia-card w-full max-w-md animate-slide-up">
        <h2 className="text-xl font-bold text-qia-accent mb-4 font-mono">
          ⚔️ Create Competition
        </h2>

        {/* Bet Amount */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-qia-text-secondary mb-1">
            Bet Amount (QIE)
          </label>
          <input
            type="number"
            min="1"
            step="0.1"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            className="qia-input"
            placeholder="1.0"
          />
          <p className="text-xs text-qia-text-secondary mt-1">
            Minimum: 1 QIE • Sent as native value
          </p>
        </div>

        {/* Duration */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-qia-text-secondary mb-1">
            Match Duration: {duration}s
          </label>
          <input
            type="range"
            min={MIN_DURATION}
            max={MAX_DURATION}
            step={10}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full accent-qia-accent"
          />
          <div className="flex justify-between text-xs text-qia-text-secondary">
            <span>30s</span>
            <span>180s</span>
          </div>
        </div>

        {/* Opponent (optional) */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-qia-text-secondary mb-1">
            Opponent Address (optional)
          </label>
          <input
            type="text"
            value={opponentAddress}
            onChange={(e) => setOpponentAddress(e.target.value)}
            className="qia-input font-mono text-sm"
            placeholder="0x... (leave empty for open match)"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={onClose} className="qia-btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="qia-btn-primary flex-1"
          >
            {isCreating ? "Creating..." : "⚔️ Create Match"}
          </button>
        </div>
      </div>
    </div>
  );
}
