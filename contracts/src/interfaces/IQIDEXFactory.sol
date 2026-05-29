// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title IQIDEXFactory
/// @notice Interface for QIDEX pair factory
interface IQIDEXFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function allPairsLength() external view returns (uint);
    function createPair(address tokenA, address tokenB) external returns (address pair);
}
