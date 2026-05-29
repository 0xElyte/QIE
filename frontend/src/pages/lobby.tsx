import { useState, useEffect } from "react";
import { useAddress } from "@thirdweb-dev/react";
import Layout from "@/components/shared/Layout";
import MatchCard from "@/components/lobby/MatchCard";
import CreateMatchModal from "@/components/lobby/CreateMatchModal";
import { getOpenMatches, getActiveMatches } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Tab = "open" | "active" | "my";

export default function Lobby() {
  const address = useAddress();
  const [activeTab, setActiveTab] = useState<Tab>("open");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, [activeTab]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      if (activeTab === "open") {
        const data = await getOpenMatches();
        setMatches(data || []);
      } else if (activeTab === "active") {
        const data = await getActiveMatches();
        setMatches(data || []);
      } else {
        // "my" tab — filter from all
        const open = await getOpenMatches();
        const active = await getActiveMatches();
        const all = [...(open || []), ...(active || [])];
        const mine = all.filter(
          (m) =>
            m.player_a?.toLowerCase() === address?.toLowerCase() ||
            m.player_b?.toLowerCase() === address?.toLowerCase()
        );
        setMatches(mine);
      }
    } catch (err) {
      console.error("Failed to load matches:", err);
    } finally {
      setLoading(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "open", label: "Open Matches", icon: "🎯" },
    { key: "active", label: "Live", icon: "🔴" },
    { key: "my", label: "My Matches", icon: "👤" },
  ];

  return (
    <Layout title="Lobby">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-mono text-qia-accent">
            ⚔️ Competition Lobby
          </h1>
          <p className="text-sm text-qia-text-secondary mt-1">
            Create, join, or spectate matches • All bets in native QIE
          </p>
        </div>
        {address && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="qia-btn-primary"
          >
            ⚔️ Create Match
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-qia-surface rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeTab === tab.key
                ? "bg-qia-card text-qia-accent"
                : "text-qia-text-secondary hover:text-qia-text-primary"
            )}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Match Grid */}
      {loading ? (
        <div className="text-center py-16">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-qia-accent border-t-transparent" />
          <p className="mt-4 text-qia-text-secondary">Loading matches...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 qia-card">
          <div className="text-4xl mb-4">
            {activeTab === "open"
              ? "🏟️"
              : activeTab === "active"
              ? "😴"
              : "📭"}
          </div>
          <p className="text-qia-text-secondary">
            {activeTab === "open"
              ? "No open matches. Create one to get started!"
              : activeTab === "active"
              ? "No live matches right now."
              : "You haven't participated in any matches yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              matchId={match.id}
              playerA={match.player_a}
              playerB={match.player_b}
              betAmount={match.bet_amount_wei}
              state={match.state}
              poolA={match.spectator_pool_a_wei}
              poolB={match.spectator_pool_b_wei}
              createdAt={match.created_at}
            />
          ))}
        </div>
      )}

      {/* Create Match Modal */}
      <CreateMatchModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          loadMatches();
        }}
      />
    </Layout>
  );
}
