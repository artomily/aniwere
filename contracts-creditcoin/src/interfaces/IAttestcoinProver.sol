// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Satu log yang sudah terbukti berasal dari transaksi nyata di source chain.
/// @dev Bentuknya sengaja identik dengan `EvmV1Decoder.LogEntry`, supaya adapter
///      cuma menyalin field, bukan menerjemahkan.
struct VerifiedLog {
    address emitter; // kontrak yang meng-emit di source chain
    bytes32[] topics; // topics[0] = event signature
    bytes data; // parameter non-indexed, ABI-encoded
}

/// @title INativeQueryVerifier
/// @notice Bentuk asli Block Prover Precompile di `0x…0FD2`.
///
/// @dev Disalin dari `@gluwa/usc-contracts` dan dari pemanggilan live yang dicatat
///      di `docs/ATTESTCOIN.md`. JANGAN ubah tata letak struct atau signature —
///      keduanya harus byte-identik dengan precompile.
///
///      Dua fungsi verifikasi, dan bedanya penting:
///
///      - `verify` — view, dideklarasikan di salinan vendored paket usc-contracts 0.1.2.
///      - `verifyAndEmit` — mengubah state dan meng-emit `TransactionVerified`.
///        Ini yang dibuktikan hidup lewat `eth_call` pada 27 Agustus
///        (lihat `docs/ATTESTCOIN.md` bagian 4), dan ini yang dipakai adapter,
///        karena event-nya jadi jejak on-chain untuk Proof Explorer.
///
///      Kalau `verifyAndEmit` ternyata tidak ada di precompile, gantinya cukup
///      satu baris di `AttestcoinAdapter`: pakai `verify`. Tidak ada yang lain
///      yang perlu disentuh.
///
///      Keduanya REVERT kalau proof tidak sah — tidak mengembalikan `false`.
///      Empat vektor proof rusak sudah diuji dan semuanya revert.
///      `require(ok)` tetap ditulis sebagai sabuk pengaman kedua.
interface INativeQueryVerifier {
    struct MerkleProofEntry {
        bytes32 hash;
        bool isLeft;
    }

    struct MerkleProof {
        bytes32 root;
        MerkleProofEntry[] siblings;
    }

    struct ContinuityProof {
        bytes32 lowerEndpointDigest;
        bytes32[] roots;
    }

    function verify(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool);

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);
}

/// @title IAttestcoinProver
/// @notice ADAPTER LAYER. Seluruh ketidakpastian Attestcoin berhenti di sini.
///
/// @dev `AniWereASC` hanya mengenal interface ini. Ia tidak tahu ada precompile,
///      tidak tahu bentuk receipt EVM, dan tidak pernah memanggil decoder.
///      Kalau suatu saat kamu merasa perlu menambal decoding di dalam ASC,
///      berarti adapter yang salah — perbaiki di sana.
///
///      Bukan `view`: `verifyAndEmit` mengubah state di precompile.
interface IAttestcoinProver {
    /// @notice Verifikasi inklusi transaksi source chain, lalu kembalikan log-nya.
    /// @dev WAJIB revert kalau proof tidak sah. Jangan pernah mengembalikan
    ///      status sebagai bool yang bisa diabaikan pemanggil.
    /// @param height Nomor blok source chain. Ini INPUT, bukan output —
    ///        precompile tidak memberi tahu kita bloknya. Tetap aman karena
    ///        height yang salah membuat continuity proof gagal, jadi angka ini
    ///        terikat pada proof, bukan klaim bebas dari pemanggil.
    /// @return proofId Identitas unik untuk anti-replay. Mengikat chainKey,
    ///         height, merkle root, dan isi transaksi sekaligus — supaya
    ///         transaksi yang sama tidak bisa dikirim ulang lewat blok lain.
    /// @return logs Seluruh log di receipt transaksi tersebut.
    function verifyAndExtract(
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external returns (bytes32 proofId, VerifiedLog[] memory logs);
}
