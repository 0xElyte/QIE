// ═══════════════════════════════════════════
//  Q.I.A Constants
// ═══════════════════════════════════════════

// QIE Testnet Chain Config
export const QIE_CHAIN_ID = 1983;
export const QIE_TESTNET_RPC = "https://rpc1testnet.qie.digital/";
export const QIE_EXPLORER = "https://testnet.qie.digital";
export const QIE_FAUCET = "https://qie.digital/faucet";

export const QIE_CHAIN = {
  chainId: QIE_CHAIN_ID,
  chainName: "QIE Testnet",
  nativeCurrency: {
    name: "QIE",
    symbol: "QIE",
    decimals: 18,
  },
  rpcUrls: [QIE_TESTNET_RPC],
  blockExplorerUrls: [QIE_EXPLORER],
};

// Contract Addresses (deployed to QIE testnet)
// Update these after deployment
export const CONTRACTS = {
  CompetitionLobby: process.env.NEXT_PUBLIC_LOBBY_ADDRESS || "0x...",
  LeaderboardRegistry: process.env.NEXT_PUBLIC_LEADERBOARD_ADDRESS || "0x...",
  QIDEXRouter: process.env.NEXT_PUBLIC_QIDEX_ROUTER || "0x...",
};

// Betting Constants (mirror on-chain)
export const MIN_BET_WEI = "1000000000000000000"; // 1 QIE in wei
export const MAX_DURATION = 180;
export const MIN_DURATION = 30;
export const BETTING_WINDOW = 60; // seconds
export const MAX_SPECTATORS_PER_SIDE = 10;

// Match States
export const MATCH_STATES = [
  "CREATED",
  "JOINED",
  "BETTING_OPEN",
  "LOCKED",
  "ACTIVE",
  "COMPLETED",
  "TIEBREAKER",
  "RESOLVED",
  "PAID_OUT",
] as const;

export type MatchState = (typeof MATCH_STATES)[number];

// Display
export const QIE_DECIMALS = 18;
export const RANKING_DECIMALS = 16; // display = score / 1e16

// ThirdWeb Client ID (get from thirdweb.com/dashboard)
export const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";
