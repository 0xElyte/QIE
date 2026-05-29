// ═══════════════════════════════════════════
//  Q.I.A Contract ABIs (key functions only)
// ═══════════════════════════════════════════

export const COMPETITION_LOBBY_ABI = [
  // View
  "function matches(uint256) view returns (address playerA, address playerB, uint256 betAmount, uint8 state, uint256 duration, uint256 startTime, uint256 bettingOpenedAt, uint256 endTime, uint256 finalScoreA, uint256 finalScoreB, bool scoreSubmittedA, bool scoreSubmittedB, uint256 tiebreakerDistanceA, uint256 tiebreakerDistanceB, bool tiebreakerSubmittedA, bool tiebreakerSubmittedB, uint256 totalPoolA, uint256 totalPoolB, uint256 maxSpectatorsPerSide, address allowedOpponent, uint256 totalPayouts)",
  "function nextMatchId() view returns (uint256)",
  "function playerStats(address) view returns (uint256 wins, uint256 losses, uint256 totalMatches, uint256 maxScore, uint256 totalQIEWinnings)",
  "function MIN_BET() view returns (uint256)",
  "function canLock(uint256) view returns (bool)",
  "function getSpectatorBets(uint256) view returns (address[] bettors, uint8[] sides, uint256[] amounts)",
  "function getQueuePosition(uint256, address, uint8) view returns (uint256)",

  // Competitor
  "function createCompetition(uint256 duration, address allowedOpponent) payable returns (uint256 matchId)",
  "function joinCompetition(uint256 matchId) payable",
  "function startMatch(uint256 matchId)",
  "function submitFinalScore(uint256 matchId, uint256 finalScore, bytes32 metadataHash, bytes signature)",
  "function submitTiebreakerShot(uint256 matchId, uint256 distance_x18, bytes32 metadataHash, bytes signature)",
  "function claimWinnings(uint256 matchId)",

  // Spectator
  "function addSpectator(uint256 matchId, uint8 side) payable",
  "function lockBetting(uint256 matchId)",

  // Events
  "event MatchCreated(uint256 indexed matchId, address indexed playerA, uint256 betAmount, uint256 duration)",
  "event MatchJoined(uint256 indexed matchId, address indexed playerB)",
  "event BettingOpened(uint256 indexed matchId)",
  "event SpectatorBetPlaced(uint256 indexed matchId, address indexed bettor, uint8 side, uint256 amount)",
  "event BettingLocked(uint256 indexed matchId)",
  "event MatchActivated(uint256 indexed matchId)",
  "event ScoreSubmitted(uint256 indexed matchId, address indexed player, uint256 score)",
  "event TiebreakerEntered(uint256 indexed matchId)",
  "event MatchResolved(uint256 indexed matchId, address winner, uint256 winnerPayout)",
  "event WinningsClaimed(uint256 indexed matchId, address indexed claimant, uint256 amount)",
] as const;

export const LEADERBOARD_REGISTRY_ABI = [
  "function rankings(address) view returns (uint256 maxScore, uint256 totalQIEWinnings, uint256 wins, uint256 losses, uint256 totalMatches, uint256 rankingScore, uint256 lastUpdated)",
  "function isRegistered(address) view returns (bool)",
  "function playerCount() view returns (uint256)",
  "function getTopPlayers(uint256 count) view returns (address[] topPlayers, uint256[] scores)",
  "function getPlayerRankDisplay(address) view returns (uint256)",
  "function calculateRanking(uint256 maxScore, uint256 totalQIEWinnings, uint256 wins, uint256 losses, uint256 totalMatches) pure returns (uint256)",
  "function registerPlayer()",
] as const;

export const QIDEX_ROUTER_ABI = [
  "function swapExactETHForTokens(uint amountOutMin, address[] path, address to, uint deadline) payable returns (uint[] amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] path, address to, uint deadline) returns (uint[] amounts)",
  "function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) payable returns (uint amountToken, uint amountETH, uint liquidity)",
  "function getAmountsOut(uint amountIn, address[] path) view returns (uint[] amounts)",
  "function WETH() view returns (address)",
  "function factory() view returns (address)",
] as const;
