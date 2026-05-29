import Layout from "@/components/shared/Layout";
import SwapWidget from "@/components/marketplace/SwapWidget";
import StakeWidget from "@/components/marketplace/StakeWidget";
import WealthDashboard from "@/components/marketplace/WealthDashboard";
import { useAddress, useBalance } from "@thirdweb-dev/react";
import { formatQIE } from "@/lib/utils";

export default function Marketplace() {
  const address = useAddress();
  const { data: qieBalance } = useBalance();

  return (
    <Layout title="Marketplace">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-mono text-qia-accent">
          🔄 In-App Marketplace
        </h1>
        <p className="text-sm text-qia-text-secondary mt-1">
          Swap, stake, and manage your QIE — powered by QIDEX
        </p>
        {address && qieBalance && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-qia-accent/10 border border-qia-accent/20">
            <div className="h-2 w-2 rounded-full bg-qia-accent" />
            <span className="font-mono text-sm text-qia-accent">
              {formatQIE(qieBalance.value, 4)} available
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Swap + Stake */}
        <div className="lg:col-span-2 space-y-6">
          <SwapWidget />
          <StakeWidget />

          {/* Liquidity Provision (simplified) */}
          <div className="qia-card">
            <h3 className="text-lg font-bold text-qia-accent font-mono mb-4">
              🌊 Liquidity Provision
            </h3>
            <p className="text-sm text-qia-text-secondary mb-4">
              Provide liquidity to QIE trading pairs on QIDEX and earn trading fees.
              Your liquidity position contributes to your QIE wealth ranking.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-qia-surface border border-qia-border">
                <p className="text-xs text-qia-text-secondary">Your Liquidity</p>
                <p className="text-lg font-bold font-mono text-qia-accent">
                  0.00 QIE
                </p>
              </div>
              <div className="p-3 rounded-lg bg-qia-surface border border-qia-border">
                <p className="text-xs text-qia-text-secondary">Fees Earned</p>
                <p className="text-lg font-bold font-mono text-qia-gold">
                  0.00 QIE
                </p>
              </div>
            </div>
            <button
              className="qia-btn-secondary w-full"
              onClick={() =>
                alert(
                  "🌊 Add Liquidity\n\nThis feature is simulated for the MVP demo.\n" +
                    "Upon mainnet launch with QIDEX deployment, you'll be able to provide " +
                    "liquidity to QIE pairs directly from this interface."
                )
              }
            >
              🌊 Add Liquidity (QIE + Token)
            </button>
            <p className="text-xs text-qia-text-secondary mt-3 text-center">
              Simulated for MVP • Designed for QIDEX router integration
            </p>
          </div>
        </div>

        {/* Right: Wealth Dashboard */}
        <div>
          <WealthDashboard />
        </div>
      </div>
    </Layout>
  );
}
