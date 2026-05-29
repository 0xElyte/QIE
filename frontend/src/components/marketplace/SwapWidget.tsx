import { useState } from "react";
import { useAddress, useBalance } from "@thirdweb-dev/react";
import { formatQIE, cn } from "@/lib/utils";

// Common tokens on QIE ecosystem (mock for MVP)
const TOKENS = [
  { symbol: "QIE", name: "Native QIE", isNative: true, address: "" },
  { symbol: "USDC", name: "USD Coin", isNative: false, address: "0x..." },
  { symbol: "DAI", name: "Dai Stablecoin", isNative: false, address: "0x..." },
  { symbol: "WETH", name: "Wrapped ETH", isNative: false, address: "0x..." },
];

export default function SwapWidget() {
  const address = useAddress();
  const { data: qieBalance } = useBalance();
  const [fromToken, setFromToken] = useState(TOKENS[0]);
  const [toToken, setToToken] = useState(TOKENS[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [isSwapping, setIsSwapping] = useState(false);

  const handleSwap = async () => {
    if (!address || !fromAmount) return;

    setIsSwapping(true);
    try {
      // MVP: Simulated swap — real swap uses QIDEX router
      // In production: call CompetitionLobby.swapQIEForToken or QIDEX router directly
      await new Promise((r) => setTimeout(r, 2000));
      alert(
        `🔄 Swap Demo\n\nSwapping ${fromAmount} ${fromToken.symbol} → ${toToken.symbol}\n\n` +
          `This is a simulated swap for the MVP demo.\n` +
          `Upon mainnet launch with QIDEX router deployment, all swaps execute trustlessly on-chain.`
      );
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="qia-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-qia-accent font-mono">
          🔄 QIDEX Swap
        </h3>
        <button
          onClick={() => setSlippage(slippage === 0.5 ? 1 : slippage === 1 ? 3 : 0.5)}
          className="text-xs text-qia-text-secondary hover:text-qia-accent transition-colors"
        >
          ⚙️ Slippage: {slippage}%
        </button>
      </div>

      {/* From Token */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-qia-text-secondary">From</span>
          {address && qieBalance && (
            <span className="text-xs text-qia-text-secondary">
              Balance: {formatQIE(qieBalance.value, 4)}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={fromToken.symbol}
            onChange={(e) =>
              setFromToken(TOKENS.find((t) => t.symbol === e.target.value)!)
            }
            className="qia-input w-32 text-sm font-mono"
          >
            {TOKENS.map((t) => (
              <option key={t.symbol} value={t.symbol}>
                {t.symbol}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            value={fromAmount}
            onChange={(e) => setFromAmount(e.target.value)}
            className="qia-input flex-1 text-right font-mono"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Swap direction */}
      <div className="flex justify-center my-2">
        <button
          onClick={() => {
            const temp = fromToken;
            setFromToken(toToken);
            setToToken(temp);
          }}
          className="h-8 w-8 rounded-full bg-qia-surface border border-qia-border
                     hover:border-qia-accent flex items-center justify-center
                     transition-colors text-qia-text-secondary hover:text-qia-accent"
        >
          ↕
        </button>
      </div>

      {/* To Token */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-qia-text-secondary">To (estimated)</span>
        </div>
        <div className="flex gap-2">
          <select
            value={toToken.symbol}
            onChange={(e) =>
              setToToken(TOKENS.find((t) => t.symbol === e.target.value)!)
            }
            className="qia-input w-32 text-sm font-mono"
          >
            {TOKENS.filter((t) => t.symbol !== fromToken.symbol).map((t) => (
              <option key={t.symbol} value={t.symbol}>
                {t.symbol}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={
              fromAmount
                ? (parseFloat(fromAmount) * 0.998).toFixed(4) // Mock 0.2% fee
                : ""
            }
            readOnly
            className="qia-input flex-1 text-right font-mono text-qia-text-secondary"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Swap Button */}
      <button
        onClick={handleSwap}
        disabled={!address || !fromAmount || isSwapping}
        className={cn(
          "w-full py-3 rounded-xl font-bold text-sm transition-all",
          address && fromAmount
            ? "qia-btn-primary"
            : "bg-qia-border text-qia-text-secondary cursor-not-allowed"
        )}
      >
        {!address
          ? "Connect Wallet"
          : isSwapping
          ? "Swapping..."
          : fromToken.isNative
          ? `Swap QIE → ${toToken.symbol}`
          : `Swap ${fromToken.symbol} → ${toToken.symbol}`}
      </button>

      {/* QIDEX notice */}
      <p className="text-xs text-qia-text-secondary mt-3 text-center">
        Powered by QIDEX •{" "}
        <span className="text-qia-warning">Simulated for MVP</span>
      </p>
    </div>
  );
}
