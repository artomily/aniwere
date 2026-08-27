// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AniWereASC} from "../src/AniWereASC.sol";

/// @notice Deploy AniWereASC ke Creditcoin Testnet.
///         CoverVault ikut ter-deploy otomatis di dalam constructor ASC,
///         sehingga alamat ASC di vault bersifat immutable dan tidak ada
///         satu pun setter atau admin function.
///
/// Jalankan:
///   forge script script/DeployASC.s.sol:DeployASC \
///     --rpc-url creditcoin_testnet --broadcast --legacy
contract DeployASC is Script {
    function run() external returns (AniWereASC asc) {
        // Alamat Block Prover Precompile. AMBIL DARI DOKUMENTASI ATTESTCOIN,
        // jangan menebak. Lihat catatan di src/interfaces/IAttestcoinProver.sol.
        address prover = vm.envAddress("ATTESTCOIN_PROVER");

        // AniWereProbe yang sudah di-deploy di Sepolia.
        address sourceProbe = vm.envAddress("SOURCE_PROBE_SEPOLIA");

        // Aave V3 Pool di Sepolia. Harus persis sama dengan yang dipakai probe.
        address aavePool = vm.envAddress("AAVE_POOL_SEPOLIA");

        uint256 pk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(pk);
        asc = new AniWereASC(prover, sourceProbe, aavePool);
        vm.stopBroadcast();

        console.log("AniWereASC :", address(asc));
        console.log("CoverVault :", address(asc.VAULT()));
        console.log("");
        console.log("Fund vault sebelum demo:");
        console.log("  cast send <vault> 'depositCapital()' --value 500ether ...");
    }
}
