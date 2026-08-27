// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AniWereProbe} from "../src/AniWereProbe.sol";

/// @notice Deploy AniWereProbe ke Ethereum Sepolia.
///
/// Jalankan:
///   forge script script/DeployProbe.s.sol:DeployProbe \
///     --rpc-url sepolia --broadcast --verify
contract DeployProbe is Script {
    function run() external returns (AniWereProbe probe) {
        // VERIFIKASI SENDIRI sebelum deploy. Address Aave V3 Pool di Sepolia
        // bisa berubah kalau Aave melakukan redeployment testnet.
        // Sumber kebenaran: https://aave.com/docs/resources/addresses
        address pool = vm.envAddress("AAVE_POOL_SEPOLIA");

        uint256 pk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(pk);
        probe = new AniWereProbe(pool);
        vm.stopBroadcast();

        console.log("AniWereProbe:", address(probe));
        console.log("Aave V3 Pool:", pool);
    }
}
