// ═══════════════════════════════════════════
//  Q.I.A Event Indexer
//  Polls CompetitionLobby contract events on QIE testnet
//  and syncs them to Supabase for realtime UI updates.
// ═══════════════════════════════════════════

require("dotenv").config();
const { ethers } = require("ethers");
const { createClient } = require("@supabase/supabase-js");

// ─── Config ───────────────────────────────
const RPC_URL = process.env.QIE_TESTNET_RPC;
const LOBBY_ADDRESS = process.env.LOBBY_CONTRACT_ADDRESS;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const START_BLOCK = parseInt(process.env.START_BLOCK || "0", 10);
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || "4000", 10);

// ─── ABIs (events only) ───────────────────
const LOBBY_ABI = [
  "event MatchCreated(uint256 indexed matchId, address indexed playerA, uint256 betAmount, uint256 duration)",
  "event MatchJoined(uint256 indexed matchId, address indexed playerB)",
  "event BettingOpened(uint256 indexed matchId)",
  "event SpectatorBetPlaced(uint256 indexed matchId, address indexed bettor, uint8 side, uint256 amount)",
  "event SpectatorQueued(uint256 indexed matchId, address indexed bettor, uint8 side, uint256 amount, uint256 position)",
  "event BettingLocked(uint256 indexed matchId)",
  "event MatchActivated(uint256 indexed matchId)",
  "event ScoreSubmitted(uint256 indexed matchId, address indexed player, uint256 score)",
  "event TiebreakerEntered(uint256 indexed matchId)",
  "event TiebreakerSubmitted(uint256 indexed matchId, address indexed player, uint256 distance)",
  "event MatchResolved(uint256 indexed matchId, address winner, uint256 winnerPayout)",
  "event WinningsClaimed(uint256 indexed matchId, address indexed claimant, uint256 amount)",
  // View functions needed for enrichment
  "function matches(uint256) view returns (address playerA, address playerB, uint256 betAmount, uint8 state, uint256 startTime, uint256 bettingOpenedAt, uint256 endTime, uint256 finalScoreA, uint256 finalScoreB, bool scoreSubmittedA, bool scoreSubmittedB, uint256 tiebreakerDistanceA, uint256 tiebreakerDistanceB, bool tiebreakerSubmittedA, bool tiebreakerSubmittedB, uint256 totalPoolA, uint256 totalPoolB, uint256 maxSpectatorsPerSide, address allowedOpponent, uint256 totalPayouts)",
];

const LEADERBOARD_ABI = [
  "event RankingUpdated(address indexed player, uint256 newRankingScore, uint256 maxScore, uint256 totalQIEWinnings)",
  "function rankings(address) view returns (uint256 maxScore, uint256 totalQIEWinnings, uint256 wins, uint256 losses, uint256 totalMatches, uint256 rankingScore, uint256 lastUpdated)",
];

// Match state enum names
const STATE_NAMES = [
  "CREATED",
  "JOINED",
  "BETTING_OPEN",
  "LOCKED",
  "ACTIVE",
  "COMPLETED",
  "TIEBREAKER",
  "RESOLVED",
  "PAID_OUT",
];

// ─── Init ─────────────────────────────────
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const lobby = new ethers.Contract(LOBBY_ADDRESS, LOBBY_ABI, provider);

let lastProcessedBlock = START_BLOCK;

// ─── Event Handlers ───────────────────────

async function handleMatchCreated(event) {
  const { matchId, playerA, betAmount, duration } = event.args;
  const block = await provider.getBlock(event.blockNumber);

  console.log(`[MatchCreated] #${matchId} by ${playerA} — ${ethers.utils.formatEther(betAmount)} QIE`);

  await supabase.from("matches").upsert({
    id: matchId.toNumber(),
    player_a: playerA,
    player_b: null,
    bet_amount_wei: betAmount.toString(),
    state: "CREATED",
    duration_seconds: duration.toNumber(),
    created_at: new Date(block.timestamp * 1000).toISOString(),
    tx_hash_created: event.transactionHash,
    chain_id: 1983,
  });
}

async function handleMatchJoined(event) {
  const { matchId, playerB } = event.args;
  console.log(`[MatchJoined] #${matchId} by ${playerB}`);

  // Fetch on-chain state for enrichment
  const matchData = await lobby.matches(matchId);

  await supabase
    .from("matches")
    .update({
      player_b: playerB,
      state: STATE_NAMES[matchData.state],
      match_ends_at: new Date(matchData.endTime.toNumber() * 1000).toISOString(),
    })
    .eq("id", matchId.toNumber());
}

async function handleBettingOpened(event) {
  const { matchId } = event.args;
  console.log(`[BettingOpened] #${matchId}`);

  await supabase
    .from("matches")
    .update({ state: "BETTING_OPEN" })
    .eq("id", matchId.toNumber());
}

async function handleSpectatorBetPlaced(event) {
  const { matchId, bettor, side, amount } = event.args;
  const sideName = side === 0 ? "A" : "B";
  console.log(
    `[SpectatorBet] #${matchId} — ${bettor} bet ${ethers.utils.formatEther(amount)} QIE on ${sideName}`
  );

  await supabase.from("spectator_bets").insert({
    match_id: matchId.toNumber(),
    bettor: bettor,
    side: sideName,
    amount_wei: amount.toString(),
    tx_hash: event.transactionHash,
  });

  // Update pools on match
  const matchData = await lobby.matches(matchId);
  await supabase
    .from("matches")
    .update({
      spectator_pool_a_wei: matchData.totalPoolA.toString(),
      spectator_pool_b_wei: matchData.totalPoolB.toString(),
    })
    .eq("id", matchId.toNumber());
}

async function handleBettingLocked(event) {
  const { matchId } = event.args;
  console.log(`[BettingLocked] #${matchId}`);

  await supabase
    .from("matches")
    .update({ state: "LOCKED" })
    .eq("id", matchId.toNumber());
}

async function handleMatchActivated(event) {
  const { matchId } = event.args;
  console.log(`[MatchActivated] #${matchId}`);

  await supabase
    .from("matches")
    .update({ state: "ACTIVE" })
    .eq("id", matchId.toNumber());
}

async function handleScoreSubmitted(event) {
  const { matchId, player, score } = event.args;
  console.log(`[ScoreSubmitted] #${matchId} — ${player}: ${score.toNumber()}`);

  // Upsert live score
  await supabase.from("live_scores").upsert(
    {
      match_id: matchId.toNumber(),
      player: player,
      score: score.toNumber(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "match_id,player" }
  );
}

async function handleMatchResolved(event) {
  const { matchId, winner, winnerPayout } = event.args;
  console.log(
    `[MatchResolved] #${matchId} — Winner: ${winner} — ${ethers.utils.formatEther(winnerPayout)} QIE`
  );

  const matchData = await lobby.matches(matchId);

  await supabase
    .from("matches")
    .update({
      state: "RESOLVED",
      winner: winner,
      score_a: matchData.finalScoreA.toNumber(),
      score_b: matchData.finalScoreB.toNumber(),
      resolved_at: new Date().toISOString(),
      tx_hash_resolved: event.transactionHash,
    })
    .eq("id", matchId.toNumber());

  // Create match_history entries for both players
  const playerA = matchData.playerA;
  const playerB = matchData.playerB;
  const scoreA = matchData.finalScoreA.toNumber();
  const scoreB = matchData.finalScoreB.toNumber();
  const betWei = matchData.betAmount.toString();

  const winnerIsA = winner.toLowerCase() === playerA.toLowerCase();

  // Winner entry
  await supabase.from("match_history").insert({
    match_id: matchId.toNumber(),
    player: winner,
    opponent: winnerIsA ? playerB : playerA,
    player_score: winnerIsA ? scoreA : scoreB,
    opponent_score: winnerIsA ? scoreB : scoreA,
    is_winner: true,
    bet_amount_wei: betWei,
    winnings_wei: winnerPayout.toString(),
  });

  // Loser entry
  const loser = winnerIsA ? playerB : playerA;
  await supabase.from("match_history").insert({
    match_id: matchId.toNumber(),
    player: loser,
    opponent: winner,
    player_score: winnerIsA ? scoreB : scoreA,
    opponent_score: winnerIsA ? scoreA : scoreB,
    is_winner: false,
    bet_amount_wei: betWei,
    winnings_wei: "0",
  });
}

async function handleWinningsClaimed(event) {
  const { matchId, claimant, amount } = event.args;
  console.log(
    `[WinningsClaimed] #${matchId} — ${claimant}: ${ethers.utils.formatEther(amount)} QIE`
  );
}

async function handleTiebreakerEntered(event) {
  const { matchId } = event.args;
  console.log(`[TiebreakerEntered] #${matchId}`);

  await supabase
    .from("matches")
    .update({ state: "TIEBREAKER" })
    .eq("id", matchId.toNumber());
}

// ─── Leaderboard Sync ─────────────────────

async function syncLeaderboard(playerAddress) {
  try {
    const leaderboard = new ethers.Contract(
      process.env.LEADERBOARD_CONTRACT_ADDRESS,
      LEADERBOARD_ABI,
      provider
    );
    const r = await leaderboard.rankings(playerAddress);

    await supabase.rpc("sync_leaderboard", {
      p_wallet: playerAddress,
      p_max_score: r.maxScore.toNumber(),
      p_total_qie: r.totalQIEWinnings.toString(),
      p_wins: r.wins.toNumber(),
      p_losses: r.losses.toNumber(),
      p_total_matches: r.totalMatches.toNumber(),
      p_ranking_score: r.rankingScore.toString(),
    });
  } catch (err) {
    console.error(`[LeaderboardSync] Failed for ${playerAddress}:`, err.message);
  }
}

// ─── Main Polling Loop ────────────────────

async function poll() {
  try {
    const currentBlock = await provider.getBlockNumber();

    if (currentBlock <= lastProcessedBlock) {
      return; // No new blocks
    }

    const fromBlock = lastProcessedBlock + 1;
    const toBlock = currentBlock;

    console.log(`[Poll] Blocks ${fromBlock} → ${toBlock}`);

    // Query all events in the range
    const events = await lobby.queryFilter("*", fromBlock, toBlock);

    for (const event of events) {
      switch (event.event) {
        case "MatchCreated":
          await handleMatchCreated(event);
          break;
        case "MatchJoined":
          await handleMatchJoined(event);
          break;
        case "BettingOpened":
          await handleBettingOpened(event);
          break;
        case "SpectatorBetPlaced":
          await handleSpectatorBetPlaced(event);
          break;
        case "BettingLocked":
          await handleBettingLocked(event);
          break;
        case "MatchActivated":
          await handleMatchActivated(event);
          break;
        case "ScoreSubmitted":
          await handleScoreSubmitted(event);
          break;
        case "MatchResolved":
          await handleMatchResolved(event);
          // Sync leaderboard for both players
          if (event.args) {
            await syncLeaderboard(event.args.winner);
          }
          break;
        case "WinningsClaimed":
          await handleWinningsClaimed(event);
          break;
        case "TiebreakerEntered":
          await handleTiebreakerEntered(event);
          break;
      }
    }

    lastProcessedBlock = toBlock;
  } catch (err) {
    console.error("[Poll Error]", err.message);
  }
}

// ─── Start ────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  Q.I.A Event Indexer");
  console.log("═══════════════════════════════════════");
  console.log(`RPC:     ${RPC_URL}`);
  console.log(`Lobby:   ${LOBBY_ADDRESS}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Starting from block: ${START_BLOCK}`);
  console.log(`Poll interval: ${POLL_INTERVAL}ms`);
  console.log("═══════════════════════════════════════");

  // Initial sync
  await poll();

  // Poll loop
  setInterval(poll, POLL_INTERVAL);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
