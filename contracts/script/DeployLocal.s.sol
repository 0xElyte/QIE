// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/CompetitionLobby.sol";
import "../src/LeaderboardRegistry.sol";

/// @title DeployLocal
/// @notice Deploy to local Anvil instance for testing
/// @dev Run with: forge script script/DeployLocal.s.sol:DeployLocal --rpc-url http://127.0.0.1:8545 --broadcast
contract DeployLocal is Script {
    function run() external {
        // Anvil default deployer key
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        CompetitionLobby lobby = new CompetitionLobby(address(0), address(0));
        LeaderboardRegistry leaderboard = new LeaderboardRegistry(address(lobby));
        lobby.setLeaderboard(address(leaderboard));

        vm.stopBroadcast();

        console.log("Local deployment complete");
        console.log("CompetitionLobby:   ", address(lobby));
        console.log("LeaderboardRegistry:", address(leaderboard));
    }
}
