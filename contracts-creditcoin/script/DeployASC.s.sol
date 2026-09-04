// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AniWereASC} from "../src/AniWereASC.sol";
import {AttestcoinAdapter} from "../src/AttestcoinAdapter.sol";

/// @notice Deploy AniWereASC ke Creditcoin Testnet.
///         CoverVault ikut ter-deploy otomatis di dalam constructor ASC,
///         sehingga alamat ASC di vault bersifat immutable dan tidak ada
///         satu pun setter atau admin function.
///
/// Jalankan:
///   forge script script/DeployASC.s.sol:DeployASC \
///     --rpc-url creditcoin_testnet --broadcast --legacy
///
/// EvmV1Decoder adalah library dengan fungsi public, jadi forge akan
/// men-deploy-nya lebih dulu dan me-link otomatis. Kalau estimasi gas gagal,
/// tambahkan --gas-estimate-multiplier 135: contoh resmi Attestcoin memakai
/// buffer 35% karena estimasi ke precompile sering meleset.
contract DeployASC is Script {
    function run() external returns (AniWereASC asc, AttestcoinAdapter adapter) {
        // Block Prover Precompile, 0x...0FD2. Precompile pallet-evm tidak punya
        // bytecode, jadi jangan pernah cek code.length di sini.
        address verifier = vm.envAddress("ATTESTCOIN_PROVER");

        // Identifier Sepolia di Creditcoin. Sepolia = 1, BUKAN 11155111.
        uint64 chainKey = uint64(vm.envUint("SOURCE_CHAIN_KEY"));

        // AniWereProbe yang sudah di-deploy di Sepolia.
        address sourceProbe = vm.envAddress("SOURCE_PROBE_SEPOLIA");

        // Aave V3 Pool di Sepolia. Harus persis sama dengan yang dipakai probe.
        address aavePool = vm.envAddress("AAVE_POOL_SEPOLIA");

        uint256 pk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(pk);
        // Adapter dulu, baru ASC. Alamat adapter di ASC immutable, jadi urutannya
        // tidak bisa dibalik dan tidak ada setter untuk memperbaikinya nanti.
        adapter = new AttestcoinAdapter(chainKey, verifier);
        asc = new AniWereASC(address(adapter), sourceProbe, aavePool);
        vm.stopBroadcast();

        console.log("Adapter    :", address(adapter));
        console.log("AniWereASC :", address(asc));
        console.log("CoverVault :", address(asc.VAULT()));
        console.log("");
        console.log("Fund vault sebelum demo:");
        console.log("  cast send <vault> 'depositCapital()' --value 500ether ...");
    }
}
