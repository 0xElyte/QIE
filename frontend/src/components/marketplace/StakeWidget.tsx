import { useState } from "react";
import { useAddress, useBalance } from "@thirdweb-dev/react";
import { formatQIE, cn } from "@/lib/utils";

export default function StakeWidget() {
  const address = useAddress();
  const { data: balance } = useBalance();
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);

  // Mock APY for MVP
  const currentAPY = 12.5;

  const handleStake = async () => {
    if (!address || !stakeAmount) return;
    setIsStaking(true);
    try {
      // MVP: Simulated staking
      await new Promise((r) => setTimeout(r, 2000));
      alert(
        `🥩 Staking Demo\n\nStaking ${stakeAmount} QIE at ${currentAPY}% APY\n\n` +
          `This is a simulated staking interface for the MVP demo.\n` +
          `Upon mainnet launch, staking will be powered by QIE ecosystem contracts.`
      );
    } finally {
      setIsStaking(false);
    }
  };

  return (
    <div className="qia-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-qia-accent font-mono">
          🥩 QIE Staking
        </h3>
        <span className="qia-badge-green">{currentAPY}% APY</span>
      </div>

      <p className="text-sm text-qia-text-secondary mb-4">
        Stake your QIE to earn passive yield. Your staked QIE contributes to
        your ranking score as &quot;QIE wealth&quot;.
      </p>

      {/* Staking input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-qia-text-secondary">Amount to Stake</span>
          {balance && (
            <button
              onClick={() => setStakeAmount(formatQIE(balance.value, 4).split(" ")[0])}
              className="text-xs text-qia-accent hover:underline"
            >
              MAX
            </button>
          )}
        </div>
        <input
          type="number"
          min="0"
          step="0.01"
          value={stakeAmount}
          onChange={(e) => setStakeAmount(e.target.value)}
          className="qia-input font-mono"
          placeholder="0.00 QIE"
        />
      </div>

      {/* Estimated returns */}
      {stakeAmount && parseFloat(stakeAmount) > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-qia-accent/5 border border-qia-accent/10">
          <div className="flex justify-between text-sm">
            <span className="text-qia-text-secondary">Est. Annual Yield</span>
            <span className="text-qia-accent font-mono">
              {(parseFloat(stakeAmount) * (currentAPY / 100)).toFixed(4)} QIE
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-qia-text-secondary">Est. Monthly</span>
            <span className="text-qia-accent font-mono">
              {((parseFloat(stakeAmount) * currentAPY) / 100 / 12).toFixed(4)} QIE
            </span>
          </div>
        </div>
      )}

      <button
        onClick={handleStake}
        disabled={!address || !stakeAmount || isStaking}
        className={cn(
          "w-full py-3 rounded-xl font-bold text-sm transition-all",
          address && stakeAmount
            ? "qia-btn-primary"
            : "bg-qia-border text-qia-text-secondary cursor-not-allowed"
        )}
      >
        {!address
          ? "Connect Wallet"
          : isStaking
          ? "Staking..."
          : "🥩 Stake QIE"}
      </button>

      <p className="text-xs text-qia-text-secondary mt-3 text-center">
        Simulated for MVP • Powered by QIE ecosystem
      </p>
    </div>
  );
}
