# 🎯 Q.I.A — QIE Intelligent Agent

> Web-Based Competitive P2E Shooter | QIE Hackathon 2026 Entry

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Q.I.A Architecture                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │
│  │   Frontend   │  │ Unity WebGL  │  │   Supabase      │ │
│  │  (Next.js)   │  │ Game Client  │  │  (Realtime DB)  │ │
│  │             │  │             │  │                 │ │
│  │ • Lobby     │  │ • Targets   │  │ • Live Scores   │ │
│  │ • Market    │  │ • Scoring   │  │ • Leaderboard   │ │
│  │ • Leaderbrd │  │ • Practice  │  │ • Match History │ │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘ │
│         │                │                   │          │
│         └────────┬───────┘                   │          │
│                  │                           │          │
│         ┌────────▼────────┐                  │          │
│         │  QIE Testnet    │◄─────────────────┘          │
│         │  (Chain 1983)   │                              │
│         │                 │                              │
│         │ • CompetitionLobby.sol                         │
│         │ • LeaderboardRegistry.sol                      │
│         │ • IQIDEXRouter.sol                             │
│         └─────────────────┘                              │
│                                                          │
│         ┌─────────────────┐                              │
│         │    QIDEX DEX     │                              │
│         │  (Swap/Stake/LP) │                              │
│         └─────────────────┘                              │
└─────────────────────────────────────────────────────────┘
```

## Native QIE — Key Design Decision

All economic interactions use **native QIE** (no custom game token):
- `payable` functions + `msg.value` for bets
- `call{value:}` for payouts (pull pattern)
- Single balance display everywhere
- 40% less contract code, lower gas, simpler UX

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/) (Solidity development)
- [Node.js 18+](https://nodejs.org/) (Frontend)
- QIE testnet QIE (from [faucet](https://qie.digital/faucet))

### 1. Deploy Contracts

```bash
cd contracts

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts --no-commit

# Run tests
forge test -vvv

# Deploy to QIE testnet
forge script script/Deploy.s.sol:DeployQIA \
  --rpc-url https://rpc1testnet.qie.digital/ \
  --broadcast \
  --verify

# Or deploy locally (Anvil)
anvil  # terminal 1
forge script script/DeployLocal.s.sol:DeployLocal \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast
```

### 2. Set Up Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy env template
cp .env.local.example .env.local

# Fill in values:
# - NEXT_PUBLIC_THIRDWEB_CLIENT_ID
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - Contract addresses from deployment

# Run dev server
npm run dev
```

### 3. Set Up Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Run migration: `supabase/migrations/001_initial_schema.sql`
3. Enable Realtime on `live_scores` and `matches` tables
4. Copy URL + anon key to `.env.local`

## Smart Contracts

### CompetitionLobby.sol

Core match contract with full lifecycle:

```
CREATED → JOINED → BETTING_OPEN → LOCKED → ACTIVE → RESOLVED → PAID_OUT
                                              └─→ TIEBREAKER ──┘
```

Key functions:
- `createCompetition{value: X}(duration, opponent)` — Create match with QIE bet
- `joinCompetition{value: X}(matchId)` — Join with matching bet
- `addSpectator{value: X}(matchId, side)` — Spectator bet
- `submitFinalScore(matchId, score, hash, sig)` — ECDSA-signed score
- `claimWinnings(matchId)` — Pull-pattern payout

### LeaderboardRegistry.sol

Composite ranking: 40% score + 30% QIE wealth + 20% win rate + 10% activity

### IQIDEXRouter.sol

Uniswap V2-compatible interface for QIDEX DEX integration

## QIE Testnet

| Parameter | Value |
|-----------|-------|
| Chain ID | 1983 |
| RPC | `https://rpc1testnet.qie.digital/` |
| Explorer | `https://testnet.qie.digital` |
| Faucet | `https://qie.digital/faucet` |
| Currency | QIE (18 decimals, ETH-like) |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Solidity 0.8.19, Foundry, OpenZeppelin |
| Frontend | Next.js 14, React 18, TailwindCSS, ThirdWeb SDK |
| Game Client | Unity 2022.3 LTS, WebGL, ThirdWeb Unity SDK |
| Database | Supabase (PostgreSQL + Realtime) |
| Deployment | QIE Testnet (Chain ID 1983) |

## Project Structure

```
QIE/
├── contracts/              # Foundry project
│   ├── src/
│   │   ├── CompetitionLobby.sol
│   │   ├── LeaderboardRegistry.sol
│   │   └── interfaces/
│   │       ├── IQIDEXRouter.sol
│   │       └── IQIDEXFactory.sol
│   ├── test/
│   │   ├── CompetitionLobby.t.sol
│   │   └── LeaderboardRegistry.t.sol
│   └── script/
│       ├── Deploy.s.sol
│       └── DeployLocal.s.sol
├── frontend/               # Next.js web app
│   └── src/
│       ├── pages/          # Dashboard, Lobby, Marketplace, Leaderboard
│       ├── components/     # UI components (lobby, marketplace, shared)
│       ├── lib/            # Constants, Supabase client, utils, ABIs
│       └── styles/         # Tailwind + custom cyberpunk theme
├── game-client/            # Unity WebGL project
│   └── README.md           # Unity setup instructions
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
└── README.md
```

## License

MIT — Built for QIE Hackathon 2026
