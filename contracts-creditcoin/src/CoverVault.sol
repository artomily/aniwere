// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CoverVault
/// @notice Memegang modal underwriter dan premi. Membayar klaim.
///
/// @dev NO PRIVILEGED ACCESS — ini keputusan desain, bukan detail implementasi.
///
///      Vault ini di-deploy OLEH AniWereASC di dalam constructor-nya, sehingga
///      `ASC` bersifat immutable dan tidak ada setter sama sekali. Konsekuensinya:
///
///      - Tidak ada owner, onlyOwner, pause, atau upgrade.
///      - Tim AniWere secara teknis tidak bisa menyentuh dana siapa pun.
///      - Dana hanya keluar lewat dua jalan: payout yang dipicu proof valid,
///        atau penarikan underwriter atas modal yang tidak sedang terkunci.
///
///      Kalau ada yang menambahkan fungsi withdraw untuk tim "biar aman",
///      seluruh klaim trustless produk ini batal. Jangan.
contract CoverVault {
    /// @notice Satu-satunya kontrak yang boleh mengunci dan membayarkan dana.
    address public immutable ASC;

    /// @notice Total modal di vault (modal underwriter + premi terkumpul).
    uint256 public totalCapital;

    /// @notice Bagian modal yang sedang menjamin polis aktif dan tidak bisa ditarik.
    uint256 public lockedCapital;

    /// @notice Kontribusi modal per underwriter.
    mapping(address => uint256) public capitalOf;

    event CapitalDeposited(address indexed underwriter, uint256 amount);
    event CapitalWithdrawn(address indexed underwriter, uint256 amount);
    event CapitalLocked(uint256 amount, uint256 totalLocked);
    event CapitalUnlocked(uint256 amount, uint256 totalLocked);
    event PremiumReceived(uint256 amount);
    event ClaimPaid(address indexed to, uint256 amount);

    error NotASC();
    error ZeroAmount();
    error InsufficientFreeCapital();
    error InsufficientBalance();
    error TransferFailed();

    modifier onlyASC() {
        if (msg.sender != ASC) revert NotASC();
        _;
    }

    constructor(address asc) {
        ASC = asc;
    }

    /// @notice Modal yang tidak sedang menjamin polis apa pun.
    function freeCapital() public view returns (uint256) {
        return totalCapital - lockedCapital;
    }

    /// @notice Deposit modal sebagai underwriter. Permissionless.
    /// @dev Untuk MVP hackathon ini di-fund manual sebelum demo. Ekonomi
    ///      underwriting yang sesungguhnya (share, yield, lock period) ada di roadmap.
    function depositCapital() external payable {
        if (msg.value == 0) revert ZeroAmount();
        capitalOf[msg.sender] += msg.value;
        totalCapital += msg.value;
        emit CapitalDeposited(msg.sender, msg.value);
    }

    /// @notice Tarik modal yang tidak sedang terkunci.
    function withdrawCapital(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (capitalOf[msg.sender] < amount) revert InsufficientBalance();
        if (freeCapital() < amount) revert InsufficientFreeCapital();

        capitalOf[msg.sender] -= amount;
        totalCapital -= amount;

        emit CapitalWithdrawn(msg.sender, amount);

        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    /// @notice Terima premi dari ASC. Premi menambah modal pool.
    function receivePremium() external payable onlyASC {
        totalCapital += msg.value;
        emit PremiumReceived(msg.value);
    }

    /// @notice Kunci modal untuk menjamin satu polis.
    /// @dev SOLVENCY GUARD. Total cover aktif tidak akan pernah melebihi modal
    ///      yang ada, jadi vault secara matematis tidak bisa insolvent.
    function lockCapital(uint256 amount) external onlyASC {
        if (freeCapital() < amount) revert InsufficientFreeCapital();
        lockedCapital += amount;
        emit CapitalLocked(amount, lockedCapital);
    }

    /// @notice Lepas kunci modal ketika polis expired tanpa klaim.
    function unlockCapital(uint256 amount) external onlyASC {
        lockedCapital -= amount;
        emit CapitalUnlocked(amount, lockedCapital);
    }

    /// @notice Bayar klaim. Hanya dipanggil ASC setelah proof terverifikasi.
    function payClaim(address to, uint256 amount) external onlyASC {
        lockedCapital -= amount;
        totalCapital -= amount;

        emit ClaimPaid(to, amount);

        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
