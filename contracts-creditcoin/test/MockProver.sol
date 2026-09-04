// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAttestcoinProver, INativeQueryVerifier, VerifiedLog} from "../src/interfaces/IAttestcoinProver.sol";

/// @notice Pengganti `AttestcoinAdapter` untuk testing lokal.
///
/// @dev Yang di-mock adalah adapter, bukan precompile-nya. Alasannya:
///      precompile pallet-evm tidak punya bytecode, jadi fork test Foundry
///      tidak bisa memanggilnya sama sekali.
///
///      Konsekuensinya jujur disebut di sini: test yang memakai mock ini
///      menguji business logic AniWereASC, BUKAN decoding receipt di adapter.
///      Jalur adapter hanya bisa dibuktikan di Creditcoin Testnet.
contract MockProver is IAttestcoinProver {
    mapping(bytes32 => VerifiedLog[]) internal logsOf;
    mapping(bytes32 => bool) internal registered;

    error ProofRejected();

    function registerTransaction(bytes calldata encodedTransaction, VerifiedLog[] calldata logs) external {
        bytes32 key = keccak256(encodedTransaction);
        registered[key] = true;

        delete logsOf[key];
        for (uint256 i; i < logs.length; ++i) {
            logsOf[key].push(logs[i]);
        }
    }

    function verifyAndExtract(
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata
    ) external view returns (bytes32 proofId, VerifiedLog[] memory logs) {
        bytes32 key = keccak256(encodedTransaction);

        // Perilaku yang benar: REVERT kalau tidak sah, bukan return false.
        // Precompile aslinya juga revert — empat vektor proof rusak sudah diuji.
        if (!registered[key]) revert ProofRejected();

        // Mengikat height, sama seperti adapter asli, supaya test anti-replay
        // benar-benar menguji properti yang sama.
        proofId = keccak256(abi.encode(uint64(1), height, merkleProof.root, key));
        logs = logsOf[key];
    }
}
