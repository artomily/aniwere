// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Satu log yang sudah terbukti berasal dari transaksi nyata di source chain.
struct VerifiedLog {
    address emitter; // kontrak yang meng-emit di source chain
    bytes32[] topics; // topics[0] = event signature
    bytes data; // parameter non-indexed, ABI-encoded
}

/// @title IAttestcoinProver
/// @notice ADAPTER LAYER. Ini BUKAN interface resmi Attestcoin.
///
/// @dev PENTING — baca sebelum menyentuh file ini.
///
///      Signature asli Block Prover Precompile harus diambil dari dokumentasi
///      Attestcoin / USC SDK dan belum diverifikasi saat scaffold ini dibuat:
///      https://docs.creditcoin.org/attestcoin-protocol/dapp-builder-infrastructure/attestcoin-smart-contracts
///
///      Bentuk di bawah adalah PLACEHOLDER yang sengaja dibuat supaya seluruh
///      business logic bisa ditulis dan dites hari ini tanpa menunggu.
///      Ketika signature aslinya sudah diketahui, yang perlu diubah HANYA
///      file ini plus satu adapter tipis. AniWereASC tidak perlu disentuh.
///
///      Ini keputusan arsitektur yang disengaja: isolasi ketidakpastian
///      di satu titik, jangan sebar ke seluruh kontrak.
interface IAttestcoinProver {
    /// @notice Verifikasi continuity proof + merkle proof, kembalikan log terverifikasi.
    /// @dev Harus REVERT kalau proof tidak valid. Jangan mengembalikan bool,
    ///      karena bool yang tidak dicek adalah cara klasik kehilangan uang.
    function verifyTransaction(
        bytes calldata continuityProof,
        bytes calldata merkleProof,
        bytes calldata rawTransaction
    ) external view returns (uint256 sourceBlockNumber, VerifiedLog[] memory logs);
}
