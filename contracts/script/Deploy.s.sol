// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/CompetitionLobby.sol";
import "../src/LeaderboardRegistry.sol";

/// @title DeployQIA
/// @notice Deploy Q.I.A contracts to QIE Testnet (Chain ID 1983)
/// @dev Run with: forge script script/Deploy.s.sol:DeployQIA --rpc-url $QIE_TESTNET_RPC_URL --broadcast
contract DeployQIA is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy CompetitionLobby with zero QIDEX router (set later)
        CompetitionLobby lobby = new CompetitionLobby(address(0), address(0));

        // 2. Deploy LeaderboardRegistry linked to lobby
        LeaderboardRegistry leaderboard = new LeaderboardRegistry(address(lobby));

        // 3. Link lobby → leaderboard
        lobby.setLeaderboard(address(leaderboard));

        vm.stopBroadcast();

        // Log deployed addresses
        console.log("===============================================");
        console.log("  Q.I.A Contracts Deployed to QIE Testnet");
        console.log("===============================================");
        console.log("CompetitionLobby:   ", address(lobby));
        console.log("LeaderboardRegistry:", address(leaderboard));
        console.log("===============================================");
        console.log("Chain ID: 1983");
        console.log("Explorer: https://testnet.qie.digital");
        console.log("===============================================");
    }
}
