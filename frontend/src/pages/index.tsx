import { useAddress, useBalance } from "@thirdweb-dev/react";
import Layout from "@/components/shared/Layout";
import StatCard from "@/components/shared/StatCard";
import Link from "next/link";
import { formatQIE } from "@/lib/utils";

export default function Dashboard() {
  const address = useAddress();
  const { data: balance } = useBalance();

  return (
    <Layout title="Dashboard">
      {/* Hero */}
      <section className="mb-8">
        <div className="text-center py-12">
          <h1 className="text-4xl sm:text-5xl font-bold font-mono mb-4">
            <span className="text-qia-accent glow-text-green">Q.I.A</span>
          </h1>
          <p className="text-xl text-qia-text-secondary mb-2">
            QIE Intelligent Agent
          </p>
          <p className="text-sm text-qia-text-secondary max-w-lg mx-auto">
            Eliminate MEV predators through precision targeting. Compete for native QIE.
            Your wallet is your identity. Your skill is your weapon.
          </p>
        </div>
      </section>

      {address ? (
        <>
          {/* Stats */}
          <section className="mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="QIE Balance"
                value={balance ? formatQIE(balance.value, 2) : "0.00 QIE"}
                variant="accent"
                icon="💎"
              />
              <StatCard
                label="Total Matches"
                value="--"
                subtitle="Connect to load"
                icon="⚔️"
              />
              <StatCard
                label="Win Rate"
                value="--"
                subtitle="Connect to load"
                icon="🎯"
              />
              <StatCard
                label="Global Rank"
                value="--"
                subtitle="Connect to load"
                icon="🏆"
              />
            </div>
          </section>

          {/* Quick Actions */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-qia-text-primary mb-4 font-mono">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link
                href="/lobby"
                className="qia-card group hover:border-qia-accent/50 transition-all cursor-pointer"
              >
                <div className="text-3xl mb-2">⚔️</div>
                <h3 className="font-bold text-qia-accent group-hover:glow-text-green transition-all">
                  Compete
                </h3>
                <p className="text-sm text-qia-text-secondary">
                  Create or join a match. Bet QIE. Prove your skill.
                </p>
              </Link>

              <Link
                href="/lobby?tab=watch"
                className="qia-card group hover:border-qia-info/50 transition-all cursor-pointer"
              >
                <div className="text-3xl mb-2">👀</div>
                <h3 className="font-bold text-qia-info">Spectate</h3>
                <p className="text-sm text-qia-text-secondary">
                  Watch live matches. Place bets. Earn from the sidelines.
                </p>
              </Link>

              <Link
                href="/marketplace"
                className="qia-card group hover:border-qia-purple/50 transition-all cursor-pointer"
              >
                <div className="text-3xl mb-2">🔄</div>
                <h3 className="font-bold text-qia-purple">Marketplace</h3>
                <p className="text-sm text-qia-text-secondary">
                  Swap QIE. Stake for yield. Grow your wealth.
                </p>
              </Link>
            </div>
          </section>
        </>
      ) : (
        /* Not connected */
        <section className="text-center py-16">
          <div className="qia-card max-w-md mx-auto">
            <div className="text-5xl mb-4">🔗</div>
            <h2 className="text-xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-sm text-qia-text-secondary mb-4">
              Connect your QIE Wallet to start competing, spectating, and earning.
            </p>
            <div className="text-xs text-qia-text-secondary">
              QIE Testnet • Chain ID 1983
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t border-qia-border text-center">
        <p className="text-xs text-qia-text-secondary">
          Q.I.A — QIE Intelligent Agent • Built for QIE Hackathon 2026
        </p>
        <p className="text-xs text-qia-text-secondary mt-1">
          All economic interactions use native QIE on QIE Testnet (Chain ID 1983)
        </p>
      </footer>
    </Layout>
  );
}
