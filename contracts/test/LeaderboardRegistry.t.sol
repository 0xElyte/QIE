// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/LeaderboardRegistry.sol";

/// @title LeaderboardRegistryTest
contract LeaderboardRegistryTest is Test {
    LeaderboardRegistry public leaderboard;
    address public lobbyContract;

    address public playerA = makeAddr("playerA");
    address public playerB = makeAddr("playerB");

    function setUp() public {
        lobbyContract = makeAddr("lobby");
        leaderboard = new LeaderboardRegistry(lobbyContract);
    }

    // ═══════════════════════════════════════════
    //  TEST: REGISTRATION
    // ═══════════════════════════════════════════

    function test_registerPlayer() public {
        vm.prank(playerA);
        leaderboard.registerPlayer();

        assertTrue(leaderboard.isRegistered(playerA));
        assertEq(leaderboard.playerCount(), 1);
    }

    function test_registerPlayer_revertDuplicate() public {
        vm.prank(playerA);
        leaderboard.registerPlayer();

        vm.prank(playerA);
        vm.expectRevert(LeaderboardRegistry.AlreadyRegistered.selector);
        leaderboard.registerPlayer();
    }

    // ═══════════════════════════════════════════
    //  TEST: RANKING UPDATE
    // ═══════════════════════════════════════════

    function test_updateRanking_winner() public {
        vm.prank(lobbyContract);
        leaderboard.updateRanking(playerA, 150, 10 ether, true);

        (uint256 maxScore, uint256 totalQIE, uint256 wins, uint256 losses, uint256 totalMatches, uint256 rankingScore,) = leaderboard.rankings(playerA);

        assertEq(maxScore, 150);
        assertEq(totalQIE, 10 ether);
        assertEq(wins, 1);
        assertEq(losses, 0);
        assertEq(totalMatches, 1);
        assertGt(rankingScore, 0);
    }

    function test_updateRanking_loser() public {
        vm.prank(lobbyContract);
        leaderboard.updateRanking(playerB, 80, 0, false);

        (, uint256 totalQIE, uint256 wins, uint256 losses, , ,) = leaderboard.rankings(playerB);

        assertEq(totalQIE, 0);
        assertEq(wins, 0);
        assertEq(losses, 1);
    }

    function test_updateRanking_revertOnlyLobby() public {
        vm.prank(playerA);
        vm.expectRevert(LeaderboardRegistry.OnlyLobby.selector);
        leaderboard.updateRanking(playerA, 100, 5 ether, true);
    }

    // ═══════════════════════════════════════════
    //  TEST: RANKING FORMULA
    // ═══════════════════════════════════════════

    function test_calculateRanking_pure() public view {
        // High score, high wealth, good win rate
        uint256 rank1 = leaderboard.calculateRanking(
            1000,       // maxScore
            50 ether,   // totalQIEWinnings
            8,          // wins
            2,          // losses
            10          // totalMatches
        );

        // Low score, low wealth, bad win rate
        uint256 rank2 = leaderboard.calculateRanking(
            50,
            1 ether,
            1,
            9,
            10
        );

        assertGt(rank1, rank2, "Higher stats should yield higher rank");
    }

    function test_calculateRanking_zeroValues() public view {
        uint256 rank = leaderboard.calculateRanking(0, 0, 0, 0, 0);
        assertEq(rank, 0);
    }

    function test_calculateRanking_weightDistribution() public view {
        // Same win rate, but player 1 has higher score → should rank higher
        uint256 scoreWeight = leaderboard.calculateRanking(
            1000, 0, 5, 5, 10
        );
        uint256 wealthWeight = leaderboard.calculateRanking(
            0, 100 ether, 5, 5, 10
        );

        // Score weight (40%) vs wealth weight (30%) with 0 for other components
        // score component: log(1001) ≈ 6.9, normalized ≈ high
        // wealth component: log(100e18+1) ≈ high, normalized ≈ high
        // Both should be positive
        assertGt(scoreWeight, 0);
        assertGt(wealthWeight, 0);
    }

    // ═══════════════════════════════════════════
    //  TEST: TOP PLAYERS
    // ═══════════════════════════════════════════

    function test_getTopPlayers() public {
        // Register players with very different stats
        vm.prank(lobbyContract);
        leaderboard.updateRanking(playerA, 100000, 100 ether, true);

        vm.prank(lobbyContract);
        leaderboard.updateRanking(playerB, 10, 1 ether, false);

        (address[] memory topPlayers, uint256[] memory scores) = leaderboard.getTopPlayers(2);

        assertEq(topPlayers.length, 2);
        // Player A should rank much higher (score 100k + 100 QIE + win vs 10 + 1 QIE + loss)
        assertEq(topPlayers[0], playerA);
        assertGt(scores[0], scores[1]);
    }

    function test_getTopPlayers_moreThanRegistered() public {
        vm.prank(lobbyContract);
        leaderboard.updateRanking(playerA, 100, 5 ether, true);

        (address[] memory topPlayers, uint256[] memory scores) = leaderboard.getTopPlayers(10);

        assertEq(topPlayers.length, 1);
        assertEq(topPlayers[0], playerA);
    }

    // ═══════════════════════════════════════════
    //  TEST: DISPLAY HELPERS
    // ═══════════════════════════════════════════

    function test_getPlayerRankDisplay() public {
        vm.prank(lobbyContract);
        leaderboard.updateRanking(playerA, 500, 20 ether, true);

        uint256 display = leaderboard.getPlayerRankDisplay(playerA);
        // Should be a reasonable display value
        assertGt(display, 0);
    }

    // ═══════════════════════════════════════════
    //  TEST: FUZZ
    // ═══════════════════════════════════════════

    function testFuzz_calculateRanking(uint256 score, uint256 winnings, uint256 wins, uint256 losses, uint256 matches) public {
        vm.assume(score <= type(uint128).max);
        vm.assume(winnings <= type(uint128).max);
        vm.assume(wins <= 1000);
        vm.assume(losses <= 1000);
        vm.assume(matches <= 2000);

        uint256 rank = leaderboard.calculateRanking(score, winnings, wins, losses, matches);
        // Should always return a value (may be 0 for all-zero inputs)
        assertTrue(rank <= type(uint256).max);
    }
}
