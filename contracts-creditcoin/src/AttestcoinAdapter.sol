// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EvmV1Decoder} from "@gluwa/usc-contracts/contracts/decoding/EvmV1Decoder.sol";
import {IAttestcoinProver, INativeQueryVerifier, VerifiedLog} from "./interfaces/IAttestcoinProver.sol";

/// @title AttestcoinAdapter
/// @notice Satu-satunya tempat AniWere menyentuh Attestcoin.
///
/// @dev Tugasnya cuma dua, dan sengaja tidak lebih:
///
///      1. Panggil Block Prover Precompile. Kalau proof tidak sah, precompile
///         revert dan transaksi mati di sini.
///      2. Decode receipt jadi daftar log. Precompile hanya mengembalikan `bool` —
///         log tidak ikut, jadi harus kita bongkar sendiri dari `encodedTransaction`.
///
///      Yang TIDAK dilakukan di sini: menyaring log. Penyaringan emitter dan topic0
///      tetap milik `AniWereASC._findLog`, karena di situlah aturan bisnisnya berada.
///      `EvmV1Decoder.getLogsByEventSignature` sengaja tidak dipakai — ia hanya
///      mencocokkan topic0 dan buta terhadap emitter, dan emitter justru satu-satunya
///      hal yang memisahkan vault dari kontrak palsu di Sepolia.
///
///      Tidak ada owner, tidak ada setter. Kontrak ini stateless.
contract AttestcoinAdapter is IAttestcoinProver {
    /// @notice Identifier source chain di jaringan Creditcoin.
    /// @dev INI BUKAN chain ID. Sepolia punya chainKey 1, chain ID 11155111.
    ///      Diambil dari `get_supported_chains()` di Chain Info precompile.
    uint64 public immutable CHAIN_KEY;

    /// @notice Block Prover Precompile, `0x…0FD2` di Creditcoin.
    /// @dev Dibuat parameter constructor supaya test bisa `vm.etch` mock ke
    ///      alamat mana pun. Precompile pallet-evm tidak punya bytecode, jadi
    ///      jangan pernah memvalidasi alamat ini dengan `code.length > 0`.
    INativeQueryVerifier public immutable VERIFIER;

    error VerificationFailed();
    error SourceTransactionReverted();

    constructor(uint64 chainKey, address verifier) {
        CHAIN_KEY = chainKey;
        VERIFIER = INativeQueryVerifier(verifier);
    }

    /// @inheritdoc IAttestcoinProver
    function verifyAndExtract(
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external returns (bytes32 proofId, VerifiedLog[] memory logs) {
        bool ok = VERIFIER.verifyAndEmit(CHAIN_KEY, height, encodedTransaction, merkleProof, continuityProof);
        // Precompile aslinya revert, tidak mengembalikan false. Ini sabuk kedua.
        if (!ok) revert VerificationFailed();

        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encodedTransaction);
        // Transaksi yang revert tetap masuk blok dan tetap bisa dibuktikan
        // inklusinya. Log-nya tidak berlaku, jadi tolak di sini.
        if (receipt.receiptStatus != 1) revert SourceTransactionReverted();

        // Mengikat chainKey + height + merkle root + isi transaksi sekaligus.
        // Kalau proofId hanya hash dari transaksi, transaksi yang sama masih
        // bisa dikirim ulang lewat blok berbeda.
        proofId = keccak256(abi.encode(CHAIN_KEY, height, merkleProof.root, keccak256(encodedTransaction)));

        uint256 len = receipt.receiptLogs.length;
        logs = new VerifiedLog[](len);
        for (uint256 i; i < len;) {
            EvmV1Decoder.LogEntry memory e = receipt.receiptLogs[i];
            logs[i] = VerifiedLog({emitter: e.address_, topics: e.topics, data: e.data});
            unchecked {
                ++i;
            }
        }
    }
}
