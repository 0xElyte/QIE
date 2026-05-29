// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/CompetitionLobby.sol";
import "../src/LeaderboardRegistry.sol";

/// @title CompetitionLobbyTest
/// @notice Comprehensive test suite for Q.I.A CompetitionLobby contract
contract CompetitionLobbyTest is Test {
    CompetitionLobby public lobby;
    LeaderboardRegistry public leaderboard;

    // Test accounts
    address public spectator1 = makeAddr("spectator1");
    address public spectator2 = makeAddr("spectator2");
    address public spectator3 = makeAddr("spectator3");

    // Constants
    uint256 constant MIN_BET = 1 ether;
    uint256 constant BET_AMOUNT = 5 ether;
    uint256 constant DURATION = 120; // 2 minutes

    // ECDSA signing keys (addresses derived via vm.addr)
    uint256 playerAKey = 0xA11CE;
    uint256 playerBKey = 0xB0B;

    // Derive player addresses from signing keys so signatures verify
    address public playerA;
    address public playerB;

    function setUp() public {
        lobby = new CompetitionLobby(address(0), address(0));
        leaderboard = new LeaderboardRegistry(address(lobby));
        lobby.setLeaderboard(address(leaderboard));

        // Derive player addresses from signing keys
        playerA = vm.addr(playerAKey);
        playerB = vm.addr(playerBKey);

        // Fund test accounts
        vm.deal(playerA, 100 ether);
        vm.deal(playerB, 100 ether);
        vm.deal(spectator1, 50 ether);
        vm.deal(spectator2, 50 ether);
        vm.deal(spectator3, 50 ether);
    }

    // ═══════════════════════════════════════════
    //  HELPER: SIGN SCORES
    // ═══════════════════════════════════════════

    function _signScore(uint256 key, uint256 matchId, uint256 score, bytes32 salt) internal pure returns (bytes32 hash, bytes memory sig) {
        hash = keccak256(abi.encodePacked(matchId, score, salt));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, hash);
        sig = abi.encodePacked(r, s, v);
    }

    // ═══════════════════════════════════════════
    //  TEST: CREATE COMPETITION
    // ═══════════════════════════════════════════

    function test_createCompetition_success() public {
        vm.prank(playerA);
        uint256 matchId = lobby.createCompetition{value: BET_AMOUNT}(DURATION, address(0));

        assertEq(matchId, 0);
        assertEq(lobby.nextMatchId(), 1);

        (address pA, , uint256 bet, CompetitionLobby.MatchState st, , , , , , , , , , , , , , , , , ,) = lobby.matches(0);
        assertEq(pA, playerA);
        assertEq(bet, BET_AMOUNT);
        assertEq(uint256(st), uint256(CompetitionLobby.MatchState.CREATED));
    }

    function test_createCompetition_revertBelowMinimum() public {
        vm.prank(playerA);
        vm.expectRevert(abi.encodeWithSelector(
            CompetitionLobby.BetBelowMinimum.selector,
            0.5 ether,
            MIN_BET
        ));
        lobby.createCompetition{value: 0.5 ether}(DURATION, address(0));
    }

    function test_createCompetition_revertInvalidDuration() public {
        vm.prank(playerA);
        vm.expectRevert(abi.encodeWithSelector(
            CompetitionLobby.InvalidDuration.selector,
            10,
            30,
            180
        ));
        lobby.createCompetition{value: BET_AMOUNT}(10, address(0));
    }

    // ═══════════════════════════════════════════
    //  TEST: JOIN COMPETITION
    // ═══════════════════════════════════════════

    function test_joinCompetition_success() public {
        vm.prank(playerA);
        uint256 matchId = lobby.createCompetition{value: BET_AMOUNT}(DURATION, address(0));

        vm.prank(playerB);
        lobby.joinCompetition{value: BET_AMOUNT}(matchId);

        (, address pB, , CompetitionLobby.MatchState st, , , , , , , , , , , , , , , , , ,) = lobby.matches(matchId);
        assertEq(pB, playerB);
        assertEq(uint256(st), uint256(CompetitionLobby.MatchState.BETTING_OPEN));
    }

    function test_joinCompetition_revertWrongAmount() public {
        vm.prank(playerA);
        uint256 matchId = lobby.createCompetition{value: BET_AMOUNT}(DURATION, address(0));

        vm.prank(playerB);
        vm.expectRevert(abi.encodeWithSelector(
            CompetitionLobby.BetAmountMismatch.selector,
            BET_AMOUNT,
            3 ether
        ));
        lobby.joinCompetition{value: 3 ether}(matchId);
    }

    function test_joinCompetition_revertNotAllowed() public {
        vm.prank(playerA);
        uint256 matchId = lobby.createCompetition{value: BET_AMOUNT}(DURATION, playerB);

        address rando = makeAddr("rando");
        vm.deal(rando, 50 ether);
        vm.prank(rando);
        vm.expectRevert(abi.encodeWithSelector(
            CompetitionLobby.NotAllowedOpponent.selector,
            rando,
            playerB
        ));
        lobby.joinCompetition{value: BET_AMOUNT}(matchId);
    }

    // ═══════════════════════════════════════════
    //  TEST: SPECTATOR BETTING
    // ═══════════════════════════════════════════

    function test_addSpectator_success() public {
        uint256 matchId = _createAndJoinMatch();

        vm.prank(spectator1);
        lobby.addSpectator{value: 2 ether}(matchId, CompetitionLobby.Side.A);

        (, , , , , , , , , , , , , , , , uint256 poolA, , , , ,) = lobby.matches(matchId);
        assertEq(poolA, 2 ether);
    }

    function test_addSpectator_revertBelowMinimum() public {
        uint256 matchId = _createAndJoinMatch();

        vm.prank(spectator1);
        vm.expectRevert(abi.encodeWithSelector(
            CompetitionLobby.BetBelowMinimum.selector,
            0.5 ether,
            MIN_BET
        ));
        lobby.addSpectator{value: 0.5 ether}(matchId, CompetitionLobby.Side.A);
    }

    function test_addSpectator_multiple() public {
        uint256 matchId = _createAndJoinMatch();

        vm.prank(spectator1);
        lobby.addSpectator{value: 2 ether}(matchId, CompetitionLobby.Side.A);

        vm.prank(spectator2);
        lobby.addSpectator{value: 3 ether}(matchId, CompetitionLobby.Side.B);

        (, , , , , , , , , , , , , , , , uint256 poolA, uint256 poolB, , , ,) = lobby.matches(matchId);
        assertEq(poolA, 2 ether);
        assertEq(poolB, 3 ether);
    }

    // ═══════════════════════════════════════════
    //  TEST: MATCH LIFECYCLE (FULL)
    // ═══════════════════════════════════════════

    function test_fullMatch_lifecycle() public {
        // 1. Create & join
        uint256 matchId = _createAndJoinMatch();

        // 2. Spectator bets
        vm.prank(spectator1);
        lobby.addSpectator{value: 2 ether}(matchId, CompetitionLobby.Side.A); // bets on A
        vm.prank(spectator2);
        lobby.addSpectator{value: 3 ether}(matchId, CompetitionLobby.Side.B); // bets on B

        // 3. Lock betting (fast forward past betting window)
        vm.warp(block.timestamp + 61);
        lobby.lockBetting(matchId);

        (, , , CompetitionLobby.MatchState lockedSt, , , , , , , , , , , , , , , , , ,) = lobby.matches(matchId);
        assertEq(uint256(lockedSt), uint256(CompetitionLobby.MatchState.LOCKED));

        // 4. Start match
        vm.prank(playerA);
        lobby.startMatch(matchId);

        // 5. Submit scores (player A wins: 100 vs 80)
        bytes32 saltA = keccak256("saltA");
        bytes32 saltB = keccak256("saltB");

        (bytes32 hashA, bytes memory sigA) = _signScore(playerAKey, matchId, 100, saltA);
        (bytes32 hashB, bytes memory sigB) = _signScore(playerBKey, matchId, 80, saltB);

        vm.prank(playerA);
        lobby.submitFinalScore(matchId, 100, hashA, sigA);

        vm.prank(playerB);
        lobby.submitFinalScore(matchId, 80, hashB, sigB);

        // 6. Check resolution
        (, , , CompetitionLobby.MatchState resolvedSt, , , , , , , , , , , , , , , , , ,) = lobby.matches(matchId);
        assertEq(uint256(resolvedSt), uint256(CompetitionLobby.MatchState.RESOLVED));

        // 7. Claim winnings
        uint256 playerABalanceBefore = playerA.balance;
        vm.prank(playerA);
        lobby.claimWinnings(matchId);

        // Player A should get: 2×5 ether (competitor pool only) = 10 ether
        assertEq(playerA.balance - playerABalanceBefore, 10 ether);

        // Spectator 1 bet 2 on A (winning side): gets bet back + share of losing pool
        uint256 spec1BalanceBefore = spectator1.balance;
        vm.prank(spectator1);
        lobby.claimWinnings(matchId);
        // bet back (2) + (2 * 3) / 2 = 2 + 3 = 5 ether
        assertEq(spectator1.balance - spec1BalanceBefore, 5 ether);
    }

    // ═══════════════════════════════════════════
    //  TEST: TIEBREAKER
    // ═══════════════════════════════════════════

    function test_tiebreaker_resolvesCorrectly() public {
        uint256 matchId = _createAndJoinMatch();

        // Lock & start
        vm.warp(block.timestamp + 61);
        lobby.lockBetting(matchId);
        vm.prank(playerA);
        lobby.startMatch(matchId);

        // Submit tied scores: 100 vs 100
        bytes32 saltA = keccak256("saltA");
        bytes32 saltB = keccak256("saltB");

        (bytes32 hashA, bytes memory sigA) = _signScore(playerAKey, matchId, 100, saltA);
        (bytes32 hashB, bytes memory sigB) = _signScore(playerBKey, matchId, 100, saltB);

        vm.prank(playerA);
        lobby.submitFinalScore(matchId, 100, hashA, sigA);
        vm.prank(playerB);
        lobby.submitFinalScore(matchId, 100, hashB, sigB);

        // Should enter tiebreaker
        (, , , CompetitionLobby.MatchState tbSt, , , , , , , , , , , , , , , , , ,) = lobby.matches(matchId);
        assertEq(uint256(tbSt), uint256(CompetitionLobby.MatchState.TIEBREAKER));

        // Submit tiebreaker shots (A closer: 1.5e18 vs 2.3e18)
        bytes32 tbSaltA = keccak256("tbSaltA");
        bytes32 tbSaltB = keccak256("tbSaltB");

        (bytes32 tbHashA, bytes memory tbSigA) = _signScore(playerAKey, matchId, 15e17, tbSaltA);
        (bytes32 tbHashB, bytes memory tbSigB) = _signScore(playerBKey, matchId, 23e17, tbSaltB);

        vm.prank(playerA);
        lobby.submitTiebreakerShot(matchId, 15e17, tbHashA, tbSigA);
        vm.prank(playerB);
        lobby.submitTiebreakerShot(matchId, 23e17, tbHashB, tbSigB);

        // Player A should win (lower distance)
        (, , , CompetitionLobby.MatchState tbRes, , , , , , , , , , , , , , , , , ,) = lobby.matches(matchId);
        assertEq(uint256(tbRes), uint256(CompetitionLobby.MatchState.RESOLVED));

        // Player A claims
        uint256 balBefore = playerA.balance;
        vm.prank(playerA);
        lobby.claimWinnings(matchId);
        assertGt(playerA.balance, balBefore);
    }

    // ═══════════════════════════════════════════
    //  TEST: SECURITY
    // ═══════════════════════════════════════════

    function test_claimWinnings_revertDoubleClaim() public {
        uint256 matchId = _resolveMatch();

        vm.prank(playerA);
        lobby.claimWinnings(matchId);

        vm.prank(playerA);
        vm.expectRevert(CompetitionLobby.AlreadyClaimed.selector);
        lobby.claimWinnings(matchId);
    }

    function test_claimWinnings_revertNoWinnings() public {
        uint256 matchId = _resolveMatch();

        address rando = makeAddr("rando");
        vm.prank(rando);
        vm.expectRevert(CompetitionLobby.NoWinnings.selector);
        lobby.claimWinnings(matchId);
    }

    function test_submitScore_revertInvalidSignature() public {
        uint256 matchId = _createAndJoinMatch();
        vm.warp(block.timestamp + 61);
        lobby.lockBetting(matchId);
        vm.prank(playerA);
        lobby.startMatch(matchId);

        // Sign with wrong key
        bytes32 hash = keccak256(abi.encodePacked(matchId, uint256(100), bytes32(0)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xDEAD, hash);
        bytes memory badSig = abi.encodePacked(r, s, v);

        vm.prank(playerA);
        vm.expectRevert(); // InvalidSigner
        lobby.submitFinalScore(matchId, 100, hash, badSig);
    }

    // ═══════════════════════════════════════════
    //  TEST: VIEW FUNCTIONS
    // ═══════════════════════════════════════════

    function test_getSpectatorBets() public {
        uint256 matchId = _createAndJoinMatch();

        vm.prank(spectator1);
        lobby.addSpectator{value: 2 ether}(matchId, CompetitionLobby.Side.A);
        vm.prank(spectator2);
        lobby.addSpectator{value: 3 ether}(matchId, CompetitionLobby.Side.B);

        (
            address[] memory bettors,
            CompetitionLobby.Side[] memory sides,
            uint256[] memory amounts
        ) = lobby.getSpectatorBets(matchId);

        assertEq(bettors.length, 2);
        assertEq(amounts[0], 2 ether);
        assertEq(amounts[1], 3 ether);
    }

    function test_canLock() public {
        uint256 matchId = _createAndJoinMatch();

        assertFalse(lobby.canLock(matchId));

        vm.warp(block.timestamp + 61);
        assertTrue(lobby.canLock(matchId));
    }

    // ═══════════════════════════════════════════
    //  TEST: FUZZ TESTING
    // ═══════════════════════════════════════════

    function testFuzz_createCompetition(uint256 betAmount, uint256 duration) public {
        // Constrain inputs to valid ranges using subtraction + addition pattern
        betAmount = (betAmount % (100 ether)) + MIN_BET; // Between 1-101 ether
        duration = (duration % 151) + 30;  // Between 30-180 seconds

        vm.deal(playerA, betAmount);
        vm.prank(playerA);

        uint256 matchId = lobby.createCompetition{value: betAmount}(duration, address(0));
        assertEq(matchId, 0);
    }

    // ═══════════════════════════════════════════
    //  INTERNAL HELPERS
    // ═══════════════════════════════════════════

    function _createAndJoinMatch() internal returns (uint256 matchId) {
        vm.prank(playerA);
        matchId = lobby.createCompetition{value: BET_AMOUNT}(DURATION, address(0));

        vm.prank(playerB);
        lobby.joinCompetition{value: BET_AMOUNT}(matchId);
    }

    function _resolveMatch() internal returns (uint256 matchId) {
        matchId = _createAndJoinMatch();

        vm.warp(block.timestamp + 61);
        lobby.lockBetting(matchId);

        vm.prank(playerA);
        lobby.startMatch(matchId);

        bytes32 saltA = keccak256("saltA");
        bytes32 saltB = keccak256("saltB");

        (bytes32 hashA, bytes memory sigA) = _signScore(playerAKey, matchId, 100, saltA);
        (bytes32 hashB, bytes memory sigB) = _signScore(playerBKey, matchId, 80, saltB);

        vm.prank(playerA);
        lobby.submitFinalScore(matchId, 100, hashA, sigA);
        vm.prank(playerB);
        lobby.submitFinalScore(matchId, 80, hashB, sigB);
    }
}
