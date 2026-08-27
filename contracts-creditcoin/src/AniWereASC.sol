// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAttestcoinProver, VerifiedLog} from "./interfaces/IAttestcoinProver.sol";
import {CoverVault} from "./CoverVault.sol";

/// @title AniWereASC
/// @notice Attestcoin Smart Contract untuk AniWere.
///
///         Parametric liquidation cover: user membeli proteksi di Creditcoin
///         untuk posisi Aave V3 mereka di Ethereum. Kalau event LiquidationCall
///         terbukti secara kriptografis lewat Attestcoin, payout cair otomatis.
///
/// @dev Tidak ada admin, tidak ada owner, tidak ada pause. Semua parameter
///      immutable atau constant. Kalau kamu merasa perlu menambahkan admin
///      function, tulis dulu alasannya di PRD dan pikirkan ulang.
contract AniWereASC {
    // ─────────────────────────────────────────────────────────────
    // Konstanta event signature
    // ─────────────────────────────────────────────────────────────

    /// @dev keccak256("PositionProbedForCover(address,uint256,uint256,uint256,uint256)")
    bytes32 public constant TOPIC_POSITION_PROBED =
        keccak256("PositionProbedForCover(address,uint256,uint256,uint256,uint256)");

    /// @dev Aave V3 Pool:
    ///      keccak256("LiquidationCall(address,address,address,uint256,uint256,address,bool)")
    ///      Topics: [sig, collateralAsset, debtAsset, user]
    bytes32 public constant TOPIC_LIQUIDATION_CALL =
        keccak256("LiquidationCall(address,address,address,uint256,uint256,address,bool)");

    // ─────────────────────────────────────────────────────────────
    // Parameter produk
    // ─────────────────────────────────────────────────────────────

    /// @notice Premi flat 2% dari cover amount.
    /// @dev Disederhanakan untuk MVP. Risk-priced premium ada di roadmap.
    uint256 public constant PREMIUM_BPS = 200;
    uint256 public constant BPS = 10_000;

    /// @notice Snapshot lebih tua dari ini tidak bisa dipakai membeli cover.
    uint256 public constant MAX_SNAPSHOT_AGE = 1 hours;

    /// @notice HF minimum saat membeli cover. Mencegah orang membeli proteksi
    ///         ketika likuidasi praktis sudah pasti terjadi.
    uint256 public constant MIN_HF_TO_BUY = 1.05e18;

    uint256 public constant MIN_DURATION = 1 days;
    uint256 public constant MAX_DURATION = 90 days;

    // ─────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────

    /// @notice Block Prover Precompile (lihat IAttestcoinProver soal adapter).
    IAttestcoinProver public immutable PROVER;

    /// @notice AniWereProbe di Sepolia. Log dari emitter lain ditolak.
    address public immutable SOURCE_PROBE;

    /// @notice Aave V3 Pool di Sepolia. Sumber sah event LiquidationCall.
    address public immutable SOURCE_AAVE_POOL;

    CoverVault public immutable VAULT;

    struct Snapshot {
        uint256 collateral;
        uint256 debt;
        uint256 healthFactor;
        uint256 sourceBlock;
        uint64 verifiedAt;
    }

    struct Policy {
        uint256 coverAmount;
        uint256 premiumPaid;
        uint256 hfAtPurchase;
        uint64 expiresAt;
        bool active;
        bool claimed;
    }

    mapping(address => Snapshot) public latestSnapshot;
    mapping(address => Policy) public policies;

    /// @dev Anti-replay. Satu source transaction hanya bisa dipakai sekali.
    mapping(bytes32 => bool) public usedProofs;

    event PositionVerified(
        address indexed user, uint256 collateral, uint256 debt, uint256 healthFactor, uint256 sourceBlock
    );
    event CoverPurchased(address indexed holder, uint256 coverAmount, uint256 premium, uint64 expiresAt);
    event ClaimSettled(address indexed holder, uint256 payout, uint256 sourceBlock);
    event PolicyExpired(address indexed holder, uint256 unlockedAmount);

    error ProofAlreadyUsed();
    error NoMatchingLog();
    error StaleSnapshot();
    error NoSnapshot();
    error HealthFactorTooLow();
    error PolicyAlreadyActive();
    error NoActivePolicy();
    error PolicyExpiredError();
    error PolicyNotExpiredYet();
    error AlreadyClaimed();
    error BadPremium();
    error BadDuration();
    error ZeroAmount();

    constructor(address prover, address sourceProbe, address sourceAavePool) {
        PROVER = IAttestcoinProver(prover);
        SOURCE_PROBE = sourceProbe;
        SOURCE_AAVE_POOL = sourceAavePool;

        // Vault di-deploy di sini supaya alamat ASC di vault bisa immutable.
        // Tidak ada setter, tidak ada bootstrap admin, tidak ada celah.
        VAULT = new CoverVault(address(this));
    }

    // ─────────────────────────────────────────────────────────────
    // 1. Verifikasi posisi
    // ─────────────────────────────────────────────────────────────

    /// @notice Buktikan snapshot posisi Aave dari Sepolia dan simpan di Creditcoin.
    /// @dev Dipanggil off-chain worker. Worker tidak dipercaya untuk apa pun:
    ///      kalau proof-nya palsu, PROVER revert dan transaksi ini gagal total.
    function submitPositionProof(
        bytes calldata continuityProof,
        bytes calldata merkleProof,
        bytes calldata rawTransaction
    ) external {
        bytes32 proofId = keccak256(rawTransaction);
        if (usedProofs[proofId]) revert ProofAlreadyUsed();
        usedProofs[proofId] = true;

        (uint256 sourceBlock, VerifiedLog[] memory logs) =
            PROVER.verifyTransaction(continuityProof, merkleProof, rawTransaction);

        VerifiedLog memory log = _findLog(logs, SOURCE_PROBE, TOPIC_POSITION_PROBED);

        address user = address(uint160(uint256(log.topics[1])));
        (uint256 coll, uint256 debt, uint256 hf,) =
            abi.decode(log.data, (uint256, uint256, uint256, uint256));

        latestSnapshot[user] = Snapshot({
            collateral: coll,
            debt: debt,
            healthFactor: hf,
            sourceBlock: sourceBlock,
            verifiedAt: uint64(block.timestamp)
        });

        emit PositionVerified(user, coll, debt, hf, sourceBlock);
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Beli cover
    // ─────────────────────────────────────────────────────────────

    /// @notice Beli proteksi. Premi dibayar dalam CTC native.
    function buyCover(uint256 coverAmount, uint64 duration) external payable {
        if (coverAmount == 0) revert ZeroAmount();
        if (duration < MIN_DURATION || duration > MAX_DURATION) revert BadDuration();

        Policy storage existing = policies[msg.sender];
        if (existing.active) revert PolicyAlreadyActive();

        Snapshot memory snap = latestSnapshot[msg.sender];
        if (snap.verifiedAt == 0) revert NoSnapshot();
        if (block.timestamp > snap.verifiedAt + MAX_SNAPSHOT_AGE) revert StaleSnapshot();
        if (snap.healthFactor < MIN_HF_TO_BUY) revert HealthFactorTooLow();

        uint256 premium = (coverAmount * PREMIUM_BPS) / BPS;
        if (msg.value != premium) revert BadPremium();

        // Solvency guard: revert kalau modal bebas tidak cukup menjamin polis ini.
        VAULT.lockCapital(coverAmount);
        VAULT.receivePremium{value: msg.value}();

        uint64 expiresAt = uint64(block.timestamp) + duration;

        policies[msg.sender] = Policy({
            coverAmount: coverAmount,
            premiumPaid: premium,
            hfAtPurchase: snap.healthFactor,
            expiresAt: expiresAt,
            active: true,
            claimed: false
        });

        emit CoverPurchased(msg.sender, coverAmount, premium, expiresAt);
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Klaim
    // ─────────────────────────────────────────────────────────────

    /// @notice Buktikan likuidasi dan bayarkan klaim, dalam satu transaksi.
    /// @dev Permissionless. Siapa pun boleh mengirim proof untuk polis siapa pun,
    ///      karena payout selalu ke pemegang polis. Ini penting: kalau worker
    ///      kita mati, user atau pihak lain tetap bisa menyelesaikan klaim sendiri.
    function submitLiquidationClaim(
        bytes calldata continuityProof,
        bytes calldata merkleProof,
        bytes calldata rawTransaction
    ) external {
        bytes32 proofId = keccak256(rawTransaction);
        if (usedProofs[proofId]) revert ProofAlreadyUsed();
        usedProofs[proofId] = true;

        // 1. Verifikasi. Revert kalau proof tidak sah.
        (uint256 sourceBlock, VerifiedLog[] memory logs) =
            PROVER.verifyTransaction(continuityProof, merkleProof, rawTransaction);

        // 2. Cari LiquidationCall yang benar-benar dari Aave Pool.
        VerifiedLog memory log = _findLog(logs, SOURCE_AAVE_POOL, TOPIC_LIQUIDATION_CALL);

        // topics: [sig, collateralAsset, debtAsset, user]
        address holder = address(uint160(uint256(log.topics[3])));

        // 3. Validasi polis.
        Policy storage p = policies[holder];
        if (!p.active) revert NoActivePolicy();
        if (p.claimed) revert AlreadyClaimed();
        if (block.timestamp > p.expiresAt) revert PolicyExpiredError();

        // 4. Bayar. Effects sebelum interactions.
        uint256 payout = p.coverAmount;
        p.claimed = true;
        p.active = false;

        VAULT.payClaim(holder, payout);

        emit ClaimSettled(holder, payout, sourceBlock);
    }

    /// @notice Tutup polis yang sudah lewat masa berlakunya dan lepas modalnya.
    /// @dev Permissionless. Underwriter atau siapa pun boleh memanggil supaya
    ///      modal tidak terkunci selamanya karena tidak ada yang mengurus.
    function expirePolicy(address holder) external {
        Policy storage p = policies[holder];
        if (!p.active) revert NoActivePolicy();
        if (block.timestamp <= p.expiresAt) revert PolicyNotExpiredYet();

        uint256 amount = p.coverAmount;
        p.active = false;

        VAULT.unlockCapital(amount);

        emit PolicyExpired(holder, amount);
    }

    // ─────────────────────────────────────────────────────────────
    // View helpers
    // ─────────────────────────────────────────────────────────────

    function quotePremium(uint256 coverAmount) external pure returns (uint256) {
        return (coverAmount * PREMIUM_BPS) / BPS;
    }

    function isProtected(address holder) external view returns (bool) {
        Policy memory p = policies[holder];
        return p.active && block.timestamp <= p.expiresAt;
    }

    // ─────────────────────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────────────────────

    /// @dev Mencocokkan emitter DAN topic0. Mengecek emitter itu wajib:
    ///      tanpa itu, siapa pun bisa men-deploy kontrak di Sepolia yang
    ///      meng-emit event dengan signature sama dan memalsukan klaim.
    function _findLog(VerifiedLog[] memory logs, address emitter, bytes32 topic0)
        internal
        pure
        returns (VerifiedLog memory)
    {
        uint256 len = logs.length;
        for (uint256 i; i < len;) {
            VerifiedLog memory l = logs[i];
            if (l.emitter == emitter && l.topics.length > 0 && l.topics[0] == topic0) {
                return l;
            }
            unchecked {
                ++i;
            }
        }
        revert NoMatchingLog();
    }
}
