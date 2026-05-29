// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IQIDEXRouter.sol";
import "./LeaderboardRegistry.sol";

/// @title CompetitionLobby
/// @notice Core Q.I.A contract: 1v1 competitive matches with native QIE wagering,
///         spectator betting pools, ECDSA-signed score submission, tiebreaker rounds,
///         and pull-pattern payouts.
/// @dev    All economic interactions use native QIE (msg.value / call{value:}).
contract CompetitionLobby is ReentrancyGuard {
    using ECDSA for bytes32;

    // ═══════════════════════════════════════════
    //  CONSTANTS
    // ═══════════════════════════════════════════
    uint256 public constant MIN_BET        = 1 ether;            // 1 QIE
    uint256 public constant MAX_DURATION   = 180;                // 3 minutes
    uint256 public constant MIN_DURATION   = 30;                 // 30 seconds
    uint256 public constant BETTING_WINDOW = 60 seconds;         // 60s after both players join
    uint256 public constant GRACE_PERIOD   = 1 hours;            // late score submission window
    uint256 public constant MAX_SPECTATORS_PER_SIDE = 10;

    // ═══════════════════════════════════════════
    //  ENUMS
    // ═══════════════════════════════════════════
    enum MatchState {
        CREATED,        // Player A deposited, waiting for Player B
        JOINED,         // Player B deposited, betting window starts
        BETTING_OPEN,   // Spectators can place bets
        LOCKED,         // Betting locked, match about to begin
        ACTIVE,         // Match in progress
        COMPLETED,      // Both scores submitted
        TIEBREAKER,     // Scores tied — tiebreaker round
        RESOLVED,       // Winner determined, payouts ready
        PAID_OUT        // All claims processed
    }

    enum Side { A, B }

    // ═══════════════════════════════════════════
    //  STRUCTS
    // ═══════════════════════════════════════════
    struct Match {
        address playerA;
        address playerB;
        uint256 betAmount;              // wei (native QIE)
        MatchState state;
        uint256 duration;               // seconds: 30–180
        uint256 startTime;
        uint256 bettingOpenedAt;        // when both players joined — betting window starts
        uint256 endTime;
        // Scores
        uint256 finalScoreA;
        uint256 finalScoreB;
        bool scoreSubmittedA;
        bool scoreSubmittedB;
        // Tiebreaker
        uint256 tiebreakerDistanceA;    // fixed-point x1e18, lower = better
        uint256 tiebreakerDistanceB;
        bool tiebreakerSubmittedA;
        bool tiebreakerSubmittedB;
        // Spectator betting
        mapping(address => SpectatorBet) spectatorBets;
        address[] spectators;
        uint256 totalPoolA;             // wei
        uint256 totalPoolB;             // wei
        uint256 spectatorCountA;
        uint256 spectatorCountB;
        // Queue for overflow spectators
        mapping(Side => address[]) spectatorQueue;
        // Address gating
        address allowedOpponent;        // address(0) = open match
        // Payout tracking
        mapping(address => uint256) payouts;
        mapping(address => bool) claimed;
        uint256 totalPayouts;           // sum of all assigned payouts
    }

    struct SpectatorBet {
        Side side;
        uint256 amount;                 // wei
        bool active;
    }

    // ═══════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════
    mapping(uint256 => Match) public matches;
    uint256 public nextMatchId;
    address public qidexRouter;
    LeaderboardRegistry public leaderboard;

    // Player stats (lightweight on-chain tracking)
    struct PlayerStats {
        uint256 wins;
        uint256 losses;
        uint256 totalMatches;
        uint256 maxScore;
        uint256 totalQIEWinnings;       // wei, cumulative
    }
    mapping(address => PlayerStats) public playerStats;

    // ═══════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════
    event MatchCreated(uint256 indexed matchId, address indexed playerA, uint256 betAmount, uint256 duration);
    event MatchJoined(uint256 indexed matchId, address indexed playerB);
    event BettingOpened(uint256 indexed matchId);
    event SpectatorBetPlaced(uint256 indexed matchId, address indexed bettor, Side side, uint256 amount);
    event SpectatorQueued(uint256 indexed matchId, address indexed bettor, Side side, uint256 amount, uint256 position);
    event BettingLocked(uint256 indexed matchId);
    event MatchActivated(uint256 indexed matchId);
    event ScoreSubmitted(uint256 indexed matchId, address indexed player, uint256 score);
    event TiebreakerEntered(uint256 indexed matchId);
    event TiebreakerSubmitted(uint256 indexed matchId, address indexed player, uint256 distance);
    event MatchResolved(uint256 indexed matchId, address winner, uint256 winnerPayout);
    event WinningsClaimed(uint256 indexed matchId, address indexed claimant, uint256 amount);
    event QIDEXRouterUpdated(address indexed newRouter);

    // ═══════════════════════════════════════════
    //  ERRORS
    // ═══════════════════════════════════════════
    error BetBelowMinimum(uint256 provided, uint256 minimum);
    error InvalidDuration(uint256 provided, uint256 min, uint256 max);
    error MatchNotInState(MatchState expected, MatchState actual);
    error BetAmountMismatch(uint256 expected, uint256 provided);
    error NotAllowedOpponent(address caller, address expected);
    error BettingClosed();
    error SpectatorLimitReached(Side side);
    error InvalidSigner(address signer, address expected);
    error GracePeriodExpired();
    error NoWinnings();
    error AlreadyClaimed();
    error TransferFailed();
    error TournamentNotActive();

    // ═══════════════════════════════════════════
    //  MODIFIERS
    // ═══════════════════════════════════════════
    modifier onlyPlayer(uint256 matchId) {
        Match storage m = matches[matchId];
        require(
            msg.sender == m.playerA || msg.sender == m.playerB,
            "Not a match player"
        );
        _;
    }

    // ═══════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════
    constructor(address _qidexRouter, address _leaderboard) {
        qidexRouter = _qidexRouter;
        leaderboard = LeaderboardRegistry(_leaderboard);
    }

    // ═══════════════════════════════════════════
    //  ADMIN
    // ═══════════════════════════════════════════
    function setQIDEXRouter(address _router) external {
        // NOTE: Add ownership / governance for production
        qidexRouter = _router;
        emit QIDEXRouterUpdated(_router);
    }

    function setLeaderboard(address _leaderboard) external {
        leaderboard = LeaderboardRegistry(_leaderboard);
    }

    // ═══════════════════════════════════════════
    //  COMPETITOR FUNCTIONS
    // ═══════════════════════════════════════════

    /// @notice Create a new competition by depositing native QIE
    /// @param duration Match length in seconds (30–180)
    /// @param allowedOpponent Specific opponent address, or address(0) for open match
    /// @return matchId The new match's ID
    function createCompetition(
        uint256 duration,
        address allowedOpponent
    ) external payable returns (uint256 matchId) {
        if (msg.value < MIN_BET) revert BetBelowMinimum(msg.value, MIN_BET);
        if (duration < MIN_DURATION || duration > MAX_DURATION)
            revert InvalidDuration(duration, MIN_DURATION, MAX_DURATION);

        matchId = nextMatchId++;
        Match storage m = matches[matchId];

        m.playerA         = msg.sender;
        m.betAmount       = msg.value;
        m.state           = MatchState.CREATED;
        m.duration        = duration;
        m.startTime       = block.timestamp;
        m.allowedOpponent = allowedOpponent;

        emit MatchCreated(matchId, msg.sender, msg.value, duration);
    }

    /// @notice Join an existing competition by matching the bet amount
    /// @param matchId The match to join
    function joinCompetition(uint256 matchId) external payable nonReentrant {
        Match storage m = matches[matchId];

        if (m.state != MatchState.CREATED)
            revert MatchNotInState(MatchState.CREATED, m.state);
        if (msg.value != m.betAmount)
            revert BetAmountMismatch(m.betAmount, msg.value);
        if (m.allowedOpponent != address(0) && msg.sender != m.allowedOpponent)
            revert NotAllowedOpponent(msg.sender, m.allowedOpponent);

        m.playerB = msg.sender;
        m.state   = MatchState.JOINED;
        // endTime = now + match duration (match clock starts when both players are in)
        m.endTime = block.timestamp + m.duration;

        emit MatchJoined(matchId, msg.sender);

        _openBetting(matchId);
    }

    /// @notice Transition match to ACTIVE state (called by player or oracle after betting locks)
    function startMatch(uint256 matchId) external onlyPlayer(matchId) {
        Match storage m = matches[matchId];
        if (m.state != MatchState.LOCKED)
            revert MatchNotInState(MatchState.LOCKED, m.state);

        m.state = MatchState.ACTIVE;
        emit MatchActivated(matchId);
    }

    /// @notice Submit final score with ECDSA signature
    /// @param matchId Match ID
    /// @param finalScore The player's final score
    /// @param metadataHash Keccak256 hash of (matchId, finalScore, salt)
    /// @param signature ECDSA signature over metadataHash
    function submitFinalScore(
        uint256 matchId,
        uint256 finalScore,
        bytes32 metadataHash,
        bytes calldata signature
    ) external {
        Match storage m = matches[matchId];
        if (m.state != MatchState.ACTIVE)
            revert MatchNotInState(MatchState.ACTIVE, m.state);
        if (block.timestamp > m.endTime + GRACE_PERIOD)
            revert GracePeriodExpired();

        // Recover signer from metadata hash
        address signer = metadataHash.recover(signature);
        if (signer != msg.sender || (msg.sender != m.playerA && msg.sender != m.playerB))
            revert InvalidSigner(signer, msg.sender);

        if (msg.sender == m.playerA) {
            m.finalScoreA     = finalScore;
            m.scoreSubmittedA = true;
        } else {
            m.finalScoreB     = finalScore;
            m.scoreSubmittedB = true;
        }

        emit ScoreSubmitted(matchId, msg.sender, finalScore);

        // Auto-resolve if both submitted
        if (m.scoreSubmittedA && m.scoreSubmittedB) {
            _resolveMatch(matchId);
        }
    }

    /// @notice Submit tiebreaker shot distance (lower = closer to bullseye = better)
    /// @param distance_x18 Distance in fixed-point (×1e18)
    function submitTiebreakerShot(
        uint256 matchId,
        uint256 distance_x18,
        bytes32 metadataHash,
        bytes calldata signature
    ) external {
        Match storage m = matches[matchId];
        if (m.state != MatchState.TIEBREAKER)
            revert MatchNotInState(MatchState.TIEBREAKER, m.state);

        address signer = metadataHash.recover(signature);
        if (signer != msg.sender || (msg.sender != m.playerA && msg.sender != m.playerB))
            revert InvalidSigner(signer, msg.sender);

        if (msg.sender == m.playerA) {
            m.tiebreakerDistanceA    = distance_x18;
            m.tiebreakerSubmittedA  = true;
        } else {
            m.tiebreakerDistanceB    = distance_x18;
            m.tiebreakerSubmittedB  = true;
        }

        emit TiebreakerSubmitted(matchId, msg.sender, distance_x18);

        if (m.tiebreakerSubmittedA && m.tiebreakerSubmittedB) {
            _resolveTiebreaker(matchId);
        }
    }

    /// @notice Claim winnings (pull pattern — native QIE transfer)
    function claimWinnings(uint256 matchId) external nonReentrant {
        Match storage m = matches[matchId];
        if (m.state != MatchState.RESOLVED && m.state != MatchState.PAID_OUT)
            revert MatchNotInState(MatchState.RESOLVED, m.state);
        if (m.claimed[msg.sender]) revert AlreadyClaimed();

        uint256 payout = m.payouts[msg.sender];
        if (payout == 0) revert NoWinnings();

        m.claimed[msg.sender] = true;

        (bool success, ) = msg.sender.call{value: payout}("");
        if (!success) revert TransferFailed();

        emit WinningsClaimed(matchId, msg.sender, payout);

        // Auto-mark PAID_OUT when all claims processed
        if (_allPayoutsClaimed(matchId)) {
            m.state = MatchState.PAID_OUT;
        }
    }

    // ═══════════════════════════════════════════
    //  SPECTATOR FUNCTIONS
    // ═══════════════════════════════════════════

    /// @notice Place a spectator bet on one side
    /// @param matchId Match to bet on
    /// @param side Which player to bet on (A or B)
    function addSpectator(uint256 matchId, Side side) external payable nonReentrant {
        Match storage m = matches[matchId];

        if (m.state != MatchState.JOINED && m.state != MatchState.BETTING_OPEN)
            revert BettingClosed();
        if (msg.value < MIN_BET) revert BetBelowMinimum(msg.value, MIN_BET);

        uint256 count = (side == Side.A) ? m.spectatorCountA : m.spectatorCountB;

        if (count < MAX_SPECTATORS_PER_SIDE) {
            _acceptSpectator(matchId, m, msg.sender, side, msg.value);
        } else {
            _enqueueSpectator(matchId, m, msg.sender, side, msg.value);
        }
    }

    /// @notice Lock betting — called automatically or manually after BETTING_WINDOW
    function lockBetting(uint256 matchId) external {
        Match storage m = matches[matchId];
        if (m.state != MatchState.JOINED && m.state != MatchState.BETTING_OPEN)
            revert MatchNotInState(MatchState.BETTING_OPEN, m.state);
        if (block.timestamp < m.bettingOpenedAt + BETTING_WINDOW)
            revert TournamentNotActive();

        m.state = MatchState.LOCKED;
        emit BettingLocked(matchId);
    }

    // ═══════════════════════════════════════════
    //  QIDEX INTEGRATION (Stub)
    // ═══════════════════════════════════════════

    /// @notice Swap native QIE for another token via QIDEX
    /// @dev For MVP: stubbed; works once QIDEX router is deployed
    function swapQIEForToken(
        address tokenOut,
        uint256 amountOutMin,
        address to,
        uint256 deadline
    ) external payable returns (uint[] memory amounts) {
        require(qidexRouter != address(0), "QIDEX router not set");
        address[] memory path = new address[](2);
        path[0] = _wethAddress(); // QIDEX WETH/QIE wrapper
        path[1] = tokenOut;

        return IQIDEXRouter(qidexRouter).swapExactETHForTokens{value: msg.value}(
            amountOutMin,
            path,
            to,
            deadline
        );
    }

    // ═══════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═══════════════════════════════════════════

    /// @notice Get all spectator bets for a match
    function getSpectatorBets(uint256 matchId) external view returns (address[] memory bettors, Side[] memory sides, uint256[] memory amounts) {
        Match storage m = matches[matchId];
        uint256 len = m.spectators.length;
        bettors = new address[](len);
        sides   = new Side[](len);
        amounts = new uint256[](len);

        for (uint256 i; i < len; ++i) {
            bettors[i] = m.spectators[i];
            SpectatorBet storage b = m.spectatorBets[m.spectators[i]];
            sides[i]   = b.side;
            amounts[i] = b.amount;
        }
    }

    /// @notice Check if a match is ready for betting lock
    function canLock(uint256 matchId) external view returns (bool) {
        Match storage m = matches[matchId];
        return (m.state == MatchState.JOINED || m.state == MatchState.BETTING_OPEN)
            && block.timestamp >= m.bettingOpenedAt + BETTING_WINDOW;
    }

    /// @notice Get spectator queue position
    function getQueuePosition(uint256 matchId, address bettor, Side side) external view returns (uint256) {
        Match storage m = matches[matchId];
        address[] storage queue = m.spectatorQueue[side];
        for (uint256 i; i < queue.length; ++i) {
            if (queue[i] == bettor) return i + 1; // 1-indexed
        }
        return 0; // not in queue
    }

    // ═══════════════════════════════════════════
    //  INTERNAL: BETTING
    // ═══════════════════════════════════════════

    function _openBetting(uint256 matchId) internal {
        Match storage m = matches[matchId];
        m.state = MatchState.BETTING_OPEN;
        m.bettingOpenedAt = block.timestamp;
        emit BettingOpened(matchId);
    }

    function _acceptSpectator(
        uint256 matchId,
        Match storage m,
        address bettor,
        Side side,
        uint256 amount
    ) internal {
        m.spectatorBets[bettor] = SpectatorBet({
            side: side,
            amount: amount,
            active: true
        });
        m.spectators.push(bettor);

        if (side == Side.A) {
            m.totalPoolA += amount;
            m.spectatorCountA++;
        } else {
            m.totalPoolB += amount;
            m.spectatorCountB++;
        }

        emit SpectatorBetPlaced(matchId, bettor, side, amount);
    }

    function _enqueueSpectator(
        uint256 matchId,
        Match storage m,
        address bettor,
        Side side,
        uint256 amount
    ) internal {
        // Refund immediately for MVP — queue logic simplified
        // In production: store in queue, auto-fill on slot open
        m.spectatorQueue[side].push(bettor);

        // Refund the QIE since queue is full for MVP
        (bool success, ) = bettor.call{value: amount}("");
        require(success, "Refund failed");

        emit SpectatorQueued(matchId, bettor, side, amount, m.spectatorQueue[side].length);
    }

    // ═══════════════════════════════════════════
    //  INTERNAL: RESOLUTION
    // ═══════════════════════════════════════════

    function _resolveMatch(uint256 matchId) internal {
        Match storage m = matches[matchId];

        if (m.finalScoreA == m.finalScoreB) {
            // Tie → enter tiebreaker
            m.state                  = MatchState.TIEBREAKER;
            m.tiebreakerDistanceA    = type(uint256).max;
            m.tiebreakerDistanceB    = type(uint256).max;
            m.tiebreakerSubmittedA   = false;
            m.tiebreakerSubmittedB   = false;
            emit TiebreakerEntered(matchId);
        } else {
            address winner = m.finalScoreA > m.finalScoreB ? m.playerA : m.playerB;
            _distributePayouts(matchId, winner);
            m.state = MatchState.RESOLVED;
            _updatePlayerStats(matchId, winner);
        }
    }

    function _resolveTiebreaker(uint256 matchId) internal {
        Match storage m = matches[matchId];
        // Lower distance = closer to target = winner
        address winner = m.tiebreakerDistanceA <= m.tiebreakerDistanceB
            ? m.playerA
            : m.playerB;
        _distributePayouts(matchId, winner);
        m.state = MatchState.RESOLVED;
        _updatePlayerStats(matchId, winner);
    }

    function _distributePayouts(uint256 matchId, address winner) internal {
        Match storage m = matches[matchId];

        uint256 competitorPool      = m.betAmount * 2;
        uint256 losingSpectatorPool = (winner == m.playerA) ? m.totalPoolB : m.totalPoolA;
        uint256 winningSpectatorPool = (winner == m.playerA) ? m.totalPoolA : m.totalPoolB;

        // Winner gets: both competitor bets
        uint256 winnerPayout = competitorPool;
        m.payouts[winner]   = winnerPayout;
        m.totalPayouts      += winnerPayout;

        // Winning spectators: get their bet back + proportional share of losing pool
        if (winningSpectatorPool > 0) {
            Side winningSide = (winner == m.playerA) ? Side.A : Side.B;

            for (uint256 i; i < m.spectators.length; ++i) {
                address bettor = m.spectators[i];
                SpectatorBet storage bet = m.spectatorBets[bettor];

                if (bet.active && bet.side == winningSide) {
                    // Return original bet + share of losing pool
                    uint256 share = bet.amount; // refund their bet
                    if (losingSpectatorPool > 0) {
                        share += (bet.amount * losingSpectatorPool) / winningSpectatorPool;
                    }
                    m.payouts[bettor] += share;
                    m.totalPayouts    += share;
                }
            }
        }

        emit MatchResolved(matchId, winner, winnerPayout);
    }

    function _updatePlayerStats(uint256 matchId, address winner) internal {
        Match storage m = matches[matchId];
        address loser = (winner == m.playerA) ? m.playerB : m.playerA;

        // Update on-chain stats
        PlayerStats storage ws = playerStats[winner];
        ws.wins++;
        ws.totalMatches++;
        ws.totalQIEWinnings += m.payouts[winner];
        uint256 winnerScore = (winner == m.playerA) ? m.finalScoreA : m.finalScoreB;
        if (winnerScore > ws.maxScore) ws.maxScore = winnerScore;

        PlayerStats storage ls = playerStats[loser];
        ls.losses++;
        ls.totalMatches++;
        uint256 loserScore = (loser == m.playerA) ? m.finalScoreA : m.finalScoreB;
        if (loserScore > ls.maxScore) ls.maxScore = loserScore;

        // Update leaderboard registry (if deployed)
        if (address(leaderboard) != address(0)) {
            leaderboard.updateRanking(winner, winnerScore, m.payouts[winner], true);
            leaderboard.updateRanking(loser, loserScore, 0, false);
        }
    }

    function _allPayoutsClaimed(uint256 matchId) internal view returns (bool) {
        Match storage m = matches[matchId];

        if (!m.claimed[m.playerA] && m.payouts[m.playerA] > 0) return false;
        if (!m.claimed[m.playerB] && m.payouts[m.playerB] > 0) return false;

        for (uint256 i; i < m.spectators.length; ++i) {
            address bettor = m.spectators[i];
            if (!m.claimed[bettor] && m.payouts[bettor] > 0) return false;
        }

        return true;
    }

    // ═══════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════

    function _wethAddress() internal view returns (address) {
        if (qidexRouter != address(0)) {
            return IQIDEXRouter(qidexRouter).WETH();
        }
        // Fallback: zero address signals native QIE (no wrapper needed)
        return address(0);
    }

    /// @notice Allow contract to receive native QIE (for refunds, etc.)
    receive() external payable {}
}
