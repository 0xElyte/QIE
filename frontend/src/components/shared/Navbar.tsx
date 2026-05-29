import Link from "next/link";
import { useRouter } from "next/router";
import { ConnectWallet, useAddress, useBalance } from "@thirdweb-dev/react";
import { truncateAddress, formatQIE } from "@/lib/utils";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/lobby", label: "Lobby" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Navbar() {
  const router = useRouter();
  const address = useAddress();
  const { data: balance } = useBalance();

  return (
    <nav className="sticky top-0 z-50 border-b border-qia-border bg-qia-bg/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-qia-accent/10 border border-qia-accent/30">
              <span className="text-qia-accent font-mono font-bold text-sm">Q</span>
            </div>
            <span className="font-mono text-lg font-bold text-qia-accent glow-text-green">
              Q.I.A
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  router.pathname === item.href
                    ? "bg-qia-accent/10 text-qia-accent"
                    : "text-qia-text-secondary hover:text-qia-text-primary hover:bg-qia-surface"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Wallet */}
          <div className="flex items-center gap-3">
            {address && balance && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-qia-surface border border-qia-border">
                <div className="h-2 w-2 rounded-full bg-qia-accent animate-pulse" />
                <span className="font-mono text-sm text-qia-accent">
                  {formatQIE(balance.value, 2)}
                </span>
              </div>
            )}
            {address && (
              <span className="hidden lg:block text-xs text-qia-text-secondary font-mono">
                {truncateAddress(address)}
              </span>
            )}
            <ConnectWallet
              theme="dark"
              btnTitle="Connect Wallet"
              className="!bg-qia-accent !text-black !font-medium !rounded-lg !px-4 !py-2 !text-sm"
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
