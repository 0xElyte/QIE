// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title LeaderboardRegistry
/// @notice Global leaderboard for Q.I.A players — tracks ranking scores,
///         QIE-denominated wealth, win rates, and activity.
/// @dev    Ranking = 40% score + 30% QIE wealth + 20% win rate + 10% activity
///         All values use fixed-point math (×1e18).
contract LeaderboardRegistry {

    // ═══════════════════════════════════════════
    //  STRUCTS
    // ═══════════════════════════════════════════
    struct PlayerRanking {
        uint256 maxScore;           // highest single-match score
        uint256 totalQIEWinnings;   // cumulative QIE won (wei)
        uint256 wins;
        uint256 losses;
        uint256 totalMatches;
        uint256 rankingScore;       // computed composite score (×1e18)
        uint256 lastUpdated;        // block.timestamp of last update
    }

    // ═══════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════
    mapping(address => PlayerRanking) public rankings;
    address[] public allPlayers;
    mapping(address => bool) public isRegistered;

    // CompetitionLobby address — authorized updater
    address public lobbyContract;

    // ═══════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════
    event PlayerRegistered(address indexed player);
    event RankingUpdated(address indexed player, uint256 newRankingScore, uint256 maxScore, uint256 totalQIEWinnings);
    event LobbyContractUpdated(address indexed newLobby);

    // ═══════════════════════════════════════════
    //  ERRORS
    // ═══════════════════════════════════════════
    error OnlyLobby();
    error AlreadyRegistered();

    // ═══════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════
    constructor(address _lobbyContract) {
        lobbyContract = _lobbyContract;
    }

    // ═══════════════════════════════════════════
    //  ADMIN
    // ═══════════════════════════════════════════
    function setLobbyContract(address _lobby) external {
        // NOTE: Add ownership for production
        lobbyContract = _lobby;
        emit LobbyContractUpdated(_lobby);
    }

    // ═══════════════════════════════════════════
    //  PLAYER REGISTRATION
    // ═══════════════════════════════════════════

    /// @notice Register a new player (called once per wallet)
    function registerPlayer() external {
        if (isRegistered[msg.sender]) revert AlreadyRegistered();
        isRegistered[msg.sender] = true;
        allPlayers.push(msg.sender);
        emit PlayerRegistered(msg.sender);
    }

    // ═══════════════════════════════════════════
    //  RANKING UPDATE (called by CompetitionLobby)
    // ═══════════════════════════════════════════

    /// @notice Update a player's ranking after a match resolves
    /// @dev Called by CompetitionLobby contract only
    function updateRanking(
        address player,
        uint256 matchScore,
        uint256 qieWinnings,    // 0 if player lost
        bool won
    ) external {
        if (msg.sender != lobbyContract) revert OnlyLobby();

        PlayerRanking storage r = rankings[player];

        // Auto-register if needed
        if (!isRegistered[player]) {
            isRegistered[player] = true;
            allPlayers.push(player);
            emit PlayerRegistered(player);
        }

        // Update stats
        if (matchScore > r.maxScore) r.maxScore = matchScore;
        r.totalQIEWinnings += qieWinnings;
        r.totalMatches++;
        if (won) {
            r.wins++;
        } else {
            r.losses++;
        }

        // Recalculate composite ranking
        r.rankingScore = calculateRanking(
            r.maxScore,
            r.totalQIEWinnings,
            r.wins,
            r.losses,
            r.totalMatches
        );
        r.lastUpdated = block.timestamp;

        emit RankingUpdated(player, r.rankingScore, r.maxScore, r.totalQIEWinnings);
    }

    // ═══════════════════════════════════════════
    //  RANKING FORMULA
    // ═══════════════════════════════════════════

    /// @notice Calculate composite ranking score
    /// @dev Pure function — can be called off-chain for preview
    /// @return rankingScore Fixed-point ×1e18 composite score
    function calculateRanking(
        uint256 maxScore,
        uint256 totalQIEWinnings,
        uint256 wins,
        uint256 losses,
        uint256 totalMatches
    ) public pure returns (uint256 rankingScore) {
        // 1. Score normalization (log-scale to prevent runaway dominance)
        uint256 scoreNorm = _logScaleNormalize(maxScore);

        // 2. QIE wealth normalization (log-scale)
        uint256 wealthNorm = _logScaleNormalize(totalQIEWinnings);

        // 3. Win rate with Laplace smoothing
        uint256 winRate = (wins * 1e18) / (wins + losses + 1);

        // 4. Activity bonus: log2(totalMatches + 1) * 0.1e18
        uint256 activity = _log2(totalMatches + 1) * 1e17;

        // 5. Weighted sum: 40% score + 30% wealth + 20% win rate + 10% activity
        rankingScore = (scoreNorm * 4 + wealthNorm * 3 + winRate * 2 + activity) / 10;
    }

    // ═══════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═══════════════════════════════════════════

    /// @notice Get top N players by ranking score
    /// @dev Returns sorted array — O(n log n) via simple insertion sort for MVP
    function getTopPlayers(uint256 count) external view returns (address[] memory topPlayers, uint256[] memory scores) {
        uint256 total = allPlayers.length;
        uint256 n = count > total ? total : count;

        topPlayers = new address[](n);
        scores     = new uint256[](n);

        // Insertion sort into top-N buffer
        for (uint256 i; i < total; ++i) {
            address player = allPlayers[i];
            uint256 score  = rankings[player].rankingScore;

            // Find insertion point
            uint256 j = n;
            while (j > 0 && scores[j - 1] < score) {
                if (j < n) {
                    topPlayers[j] = topPlayers[j - 1];
                    scores[j]     = scores[j - 1];
                }
                j--;
            }

            if (j < n) {
                topPlayers[j] = player;
                scores[j]     = score;
            }
        }
    }

    /// @notice Get player ranking display value
    function getPlayerRankDisplay(address player) external view returns (uint256) {
        return rankings[player].rankingScore / 1e16; // "123.46" style
    }

    /// @notice Get total registered players
    function playerCount() external view returns (uint256) {
        return allPlayers.length;
    }

    // ═══════════════════════════════════════════
    //  INTERNAL MATH
    // ═══════════════════════════════════════════

    /// @dev Log-scale normalization: ln(value + 1) / ln(maxReasonableValue + 1) × 1e18
    ///      Capped at 1e18 to prevent dominance
    function _logScaleNormalize(uint256 value) internal pure returns (uint256) {
        if (value == 0) return 0;

        // Use log2 for gas efficiency, then convert: log2(x) * ln(2) ≈ ln(x)
        // We normalize against 1000 QIE (1000e18 wei) as "max reasonable"
        // ln(1000e18 + 1) ≈ 43.0 → we'll use 44e18 as denominator
        uint256 logVal = _log2(value + 1);

        // Convert log2 to approximate ln: log2(x) * 693 / 1000 ≈ ln(x)
        uint256 lnApprox = (logVal * 693) / 1000;

        // Normalize: cap at 1e18
        uint256 normalized = (lnApprox * 1e18) / 44e18; // 44 ≈ ln(1e19)
        return normalized > 1e18 ? 1e18 : normalized;
    }

    /// @dev Integer log2 (floor) — gas-efficient
    function _log2(uint256 x) internal pure returns (uint256) {
        uint256 result;
        unchecked {
            if (x >= 1 << 128) { x >>= 128; result += 128; }
            if (x >= 1 << 64)  { x >>= 64;  result += 64; }
            if (x >= 1 << 32)  { x >>= 32;  result += 32; }
            if (x >= 1 << 16)  { x >>= 16;  result += 16; }
            if (x >= 1 << 8)   { x >>= 8;   result += 8; }
            if (x >= 1 << 4)   { x >>= 4;   result += 4; }
            if (x >= 1 << 2)   { x >>= 2;   result += 2; }
            if (x >= 1 << 1)   { result += 1; }
        }
        return result;
    }
}
