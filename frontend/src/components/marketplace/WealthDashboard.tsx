import { useAddress, useBalance } from "@thirdweb-dev/react";
import { formatQIE, truncateAddress } from "@/lib/utils";
import StatCard from "@/components/shared/StatCard";

export default function WealthDashboard() {
  const address = useAddress();
  const { data: balance } = useBalance();

  if (!address) {
    return (
      <div className="qia-card text-center py-8">
        <p className="text-qia-text-secondary">
          Connect wallet to view your wealth dashboard
        </p>
      </div>
    );
  }

  // Mock data for MVP — in production, fetch from on-chain playerStats
  const mockStats = {
    totalWinnings: BigInt(Math.floor(Math.random() * 50 * 1e18)),
    totalMatches: 12,
    wins: 8,
    losses: 4,
    currentRank: 42,
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-qia-accent font-mono">
        💰 Wealth Dashboard
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="QIE Balance"
          value={balance ? formatQIE(balance.value, 2) : "0.00 QIE"}
          variant="accent"
          icon="💎"
        />
        <StatCard
          label="Total Winnings"
          value={formatQIE(mockStats.totalWinnings, 2)}
          variant="default"
          icon="🏆"
        />
        <StatCard
          label="Win / Loss"
          value={`${mockStats.wins}W / ${mockStats.losses}L`}
          subtitle={`${((mockStats.wins / mockStats.totalMatches) * 100).toFixed(0)}% win rate`}
          variant="default"
          icon="📊"
        />
        <StatCard
          label="Global Rank"
          value={`#${mockStats.currentRank}`}
          variant="default"
          icon="🌐"
        />
      </div>

      {/* Recent Activity */}
      <div className="qia-card">
        <h4 className="text-sm font-medium text-qia-text-secondary mb-3">
          Recent Match Activity
        </h4>
        <div className="space-y-2">
          {[
            { type: "win", opponent: "0x1234...5678", amount: "5.2 QIE", time: "2h ago" },
            { type: "loss", opponent: "0xabcd...ef01", amount: "3.0 QIE", time: "5h ago" },
            { type: "win", opponent: "0x9876...5432", amount: "10.0 QIE", time: "1d ago" },
          ].map((activity, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-qia-border last:border-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className={
                    activity.type === "win"
                      ? "text-qia-accent"
                      : "text-qia-danger"
                  }
                >
                  {activity.type === "win" ? "✅" : "❌"}
                </span>
                <span className="text-sm">
                  vs {truncateAddress(activity.opponent)}
                </span>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-mono ${
                    activity.type === "win"
                      ? "text-qia-accent"
                      : "text-qia-danger"
                  }`}
                >
                  {activity.type === "win" ? "+" : "-"}
                  {activity.amount}
                </p>
                <p className="text-xs text-qia-text-secondary">
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
