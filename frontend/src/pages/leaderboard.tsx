import { useState, useEffect } from "react";
import Layout from "@/components/shared/Layout";
import { getLeaderboard, formatQIE, formatRank } from "@/lib/supabase";
import { truncateAddress, cn } from "@/lib/utils";

interface LeaderboardEntry {
  wallet_address: string;
  display_name: string | null;
  max_score: number;
  total_qie_winnings: string;
  wins: number;
  losses: number;
  total_matches: number;
  ranking_score: string;
}

type SortKey = "ranking_score" | "max_score" | "total_qie_winnings" | "wins";

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("ranking_score");

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await getLeaderboard(100);
      setEntries(data || []);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const sortedEntries = [...entries].sort((a, b) => {
    if (sortKey === "total_qie_winnings") {
      return BigInt(b.total_qie_winnings) > BigInt(a.total_qie_winnings)
        ? 1
        : -1;
    }
    return (b[sortKey] as number) - (a[sortKey] as number);
  });

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: "ranking_score", label: "🏆 Overall Rank" },
    { key: "max_score", label: "🎯 Highest Score" },
    { key: "total_qie_winnings", label: "💰 QIE Wealth" },
    { key: "wins", label: "✅ Most Wins" },
  ];

  const getMedal = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
    <Layout title="Leaderboard">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-mono text-qia-accent">
          🏆 Global Leaderboard
        </h1>
        <p className="text-sm text-qia-text-secondary mt-1">
          Rankings based on score (40%) + QIE wealth (30%) + win rate (20%) +
          activity (10%)
        </p>
      </div>

      {/* Sort Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortKey(opt.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              sortKey === opt.key
                ? "bg-qia-accent/10 text-qia-accent border border-qia-accent/30"
                : "bg-qia-surface text-qia-text-secondary border border-qia-border hover:border-qia-accent/20"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-qia-accent border-t-transparent" />
          <p className="mt-4 text-qia-text-secondary">Loading leaderboard...</p>
        </div>
      ) : sortedEntries.length === 0 ? (
        <div className="text-center py-16 qia-card">
          <div className="text-4xl mb-4">🏁</div>
          <p className="text-qia-text-secondary">
            No rankings yet. Be the first to compete!
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-qia-border">
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-qia-text-secondary">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-qia-text-secondary">
                  Player
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-qia-text-secondary">
                  Score
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-qia-text-secondary">
                  QIE Wealth
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-qia-text-secondary">
                  W / L
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-qia-text-secondary">
                  Ranking
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, index) => (
                <tr
                  key={entry.wallet_address}
                  className={cn(
                    "border-b border-qia-border/50 hover:bg-qia-surface/50 transition-colors",
                    index < 3 && "bg-qia-accent/5"
                  )}
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm font-bold">
                      {getMedal(index)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">
                        {entry.display_name ||
                          truncateAddress(entry.wallet_address)}
                      </p>
                      <p className="text-xs text-qia-text-secondary font-mono">
                        {truncateAddress(entry.wallet_address, 6)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-sm font-bold text-qia-accent">
                      {entry.max_score.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-sm text-qia-gold">
                      {formatQIE(entry.total_qie_winnings)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm">
                      <span className="text-qia-accent">{entry.wins}</span>
                      <span className="text-qia-text-secondary mx-1">/</span>
                      <span className="text-qia-danger">{entry.losses}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-mono text-sm font-bold text-qia-purple">
                      {formatRank(entry.ranking_score)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
