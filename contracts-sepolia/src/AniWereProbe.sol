// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Subset Aave V3 Pool yang kita butuhkan.
interface IPool {
    function getUserAccountData(address user)
        external
        view
        returns (
            uint256 totalCollateralBase,
            uint256 totalDebtBase,
            uint256 availableBorrowsBase,
            uint256 currentLiquidationThreshold,
            uint256 ltv,
            uint256 healthFactor
        );
}

/// @title AniWereProbe
/// @notice Kontrak source chain untuk AniWere. Satu-satunya tugasnya adalah
///         mengubah STATE Aave menjadi EVENT, karena Attestcoin Readability
///         hanya bisa membuktikan event di receipt log, bukan storage slot.
///
/// @dev Prinsip desain (jangan dilanggar tanpa alasan yang ditulis):
///      1. Logic source chain seminimal mungkin. Semua business logic di Creditcoin.
///      2. Event spesifik dan tidak ambigu. Tidak memakai event umum seperti Transfer.
///      3. Permissionless. Tidak ada owner, tidak ada gatekeeper.
///      4. Tidak pernah menghitung ulang health factor. Kita pakai angka Aave apa adanya,
///         supaya HF yang kita buktikan identik dengan yang dipakai Aave untuk
///         memutuskan likuidasi.
contract AniWereProbe {
    /// @notice Aave V3 Pool di Sepolia.
    IPool public immutable POOL;

    /// @notice Snapshot posisi Aave, untuk diverifikasi di Creditcoin.
    /// @param user               Address pemilik posisi
    /// @param totalCollateralBase Total collateral dalam base currency Aave (8 desimal)
    /// @param totalDebtBase       Total hutang dalam base currency Aave (8 desimal)
    /// @param healthFactor        Health factor, 18 desimal. type(uint256).max kalau tanpa hutang
    /// @param probedAt            block.timestamp saat probe
    event PositionProbedForCover(
        address indexed user,
        uint256 totalCollateralBase,
        uint256 totalDebtBase,
        uint256 healthFactor,
        uint256 probedAt
    );

    /// @notice Fallback path (Opsi B di PRD 6.4). Dipakai hanya kalau parsing
    ///         event LiquidationCall milik Aave ternyata merepotkan di ASC.
    ///         Jalur utama tetap membuktikan event Aave secara langsung.
    event LiquidationDetectedForCover(
        address indexed user,
        address indexed collateralAsset,
        address indexed debtAsset,
        uint256 debtToCover,
        uint256 liquidatedCollateralAmount,
        uint256 detectedAt
    );

    error ZeroAddress();

    constructor(address pool) {
        if (pool == address(0)) revert ZeroAddress();
        POOL = IPool(pool);
    }

    /// @notice Emit snapshot posisi Aave milik `user`.
    /// @dev Permissionless dan sengaja begitu. Siapa pun boleh mem-probe siapa pun.
    ///      Ini menghilangkan trust assumption terhadap tim AniWere sebagai operator:
    ///      kita bukan gatekeeper data, dan tidak bisa menghalangi siapa pun
    ///      membuktikan posisinya sendiri.
    function probe(address user) external {
        if (user == address(0)) revert ZeroAddress();

        (uint256 coll, uint256 debt,,,, uint256 hf) = POOL.getUserAccountData(user);

        emit PositionProbedForCover(user, coll, debt, hf, block.timestamp);
    }

    /// @notice Probe banyak address sekaligus.
    /// @dev Attestcoin membatasi 10 query per continuity proof, jadi jangan
    ///      kirim lebih dari 10 kalau ingin satu proof menutupi semuanya.
    function probeBatch(address[] calldata users) external {
        uint256 len = users.length;
        for (uint256 i; i < len;) {
            address user = users[i];
            if (user != address(0)) {
                (uint256 coll, uint256 debt,,,, uint256 hf) = POOL.getUserAccountData(user);
                emit PositionProbedForCover(user, coll, debt, hf, block.timestamp);
            }
            unchecked {
                ++i;
            }
        }
    }
}
