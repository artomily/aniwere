// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AniWereASC} from "../src/AniWereASC.sol";
import {CoverVault} from "../src/CoverVault.sol";
import {INativeQueryVerifier, VerifiedLog} from "../src/interfaces/IAttestcoinProver.sol";
import {MockProver} from "./MockProver.sol";

contract AniWereASCTest is Test {
    AniWereASC internal asc;
    CoverVault internal vault;
    MockProver internal prover;

    address internal constant SOURCE_PROBE = address(0x9401);
    address internal constant AAVE_POOL = address(0x9402);
    address internal constant EVIL_CONTRACT = address(0xBAD);

    address internal alice = address(0xA11CE);
    address internal underwriter = address(0xDEF1);

    uint256 internal constant COVER = 100 ether;
    uint256 internal constant PREMIUM = 2 ether; // 2%

    function setUp() public {
        prover = new MockProver();
        asc = new AniWereASC(address(prover), SOURCE_PROBE, AAVE_POOL);
        vault = asc.VAULT();

        vm.deal(underwriter, 1000 ether);
        vm.deal(alice, 100 ether);

        vm.prank(underwriter);
        vault.depositCapital{value: 500 ether}();
    }

    // ── helpers ──────────────────────────────────────────────

    function _probeLog(address user, uint256 coll, uint256 debt, uint256 hf)
        internal
        pure
        returns (VerifiedLog memory l)
    {
        bytes32[] memory t = new bytes32[](2);
        t[0] = keccak256("PositionProbedForCover(address,uint256,uint256,uint256,uint256)");
        t[1] = bytes32(uint256(uint160(user)));

        l.emitter = SOURCE_PROBE;
        l.topics = t;
        l.data = abi.encode(coll, debt, hf, uint256(1_700_000_000));
    }

    function _liquidationLog(address user, address emitter) internal pure returns (VerifiedLog memory l) {
        bytes32[] memory t = new bytes32[](4);
        t[0] = keccak256("LiquidationCall(address,address,address,uint256,uint256,address,bool)");
        t[1] = bytes32(uint256(uint160(address(0x1111)))); // collateralAsset
        t[2] = bytes32(uint256(uint160(address(0x2222)))); // debtAsset
        t[3] = bytes32(uint256(uint160(user)));

        l.emitter = emitter;
        l.topics = t;
        l.data = abi.encode(uint256(1e18), uint256(2e18), address(0x3333), false);
    }

    function _register(bytes memory rawTx, VerifiedLog memory l) internal {
        VerifiedLog[] memory logs = new VerifiedLog[](1);
        logs[0] = l;
        prover.registerTransaction(rawTx, logs);
    }

    /// @dev Proof kosong. Isinya tidak pernah dibaca MockProver — yang diuji
    ///      di file ini adalah logic ASC, bukan verifikasi kriptografisnya.
    function _merkle() internal pure returns (INativeQueryVerifier.MerkleProof memory m) {
        m.siblings = new INativeQueryVerifier.MerkleProofEntry[](0);
    }

    function _continuity() internal pure returns (INativeQueryVerifier.ContinuityProof memory c) {
        c.roots = new bytes32[](0);
    }

    function _submitPosition(uint64 height, bytes memory rawTx) internal {
        asc.submitPositionProof(height, rawTx, _merkle(), _continuity());
    }

    function _submitClaim(uint64 height, bytes memory rawTx) internal {
        asc.submitLiquidationClaim(height, rawTx, _merkle(), _continuity());
    }

    function _verifyHealthyPosition() internal {
        bytes memory rawTx = hex"aa01";
        _register(rawTx, _probeLog(alice, 10_000e8, 4_000e8, 1.8e18));
        _submitPosition(21_000_000, rawTx);
    }

    // ── tests ────────────────────────────────────────────────

    function test_HappyPath_BuyCoverThenClaim() public {
        _verifyHealthyPosition();

        vm.prank(alice);
        asc.buyCover{value: PREMIUM}(COVER, 30 days);

        assertEq(vault.lockedCapital(), COVER);

        uint256 before = alice.balance;

        bytes memory liqTx = hex"bb01";
        _register(liqTx, _liquidationLog(alice, AAVE_POOL));
        _submitClaim(21_000_500, liqTx);

        assertEq(alice.balance, before + COVER);
        assertEq(vault.lockedCapital(), 0);

        (,,,,, bool claimed) = asc.policies(alice);
        assertTrue(claimed);
    }

    /// @dev Properti keamanan paling penting di kontrak ini. Tanpa pengecekan
    ///      emitter, siapa pun bisa deploy kontrak di Sepolia yang meng-emit
    ///      event dengan signature sama dan menguras vault.
    function test_RejectsLiquidationFromWrongEmitter() public {
        _verifyHealthyPosition();

        vm.prank(alice);
        asc.buyCover{value: PREMIUM}(COVER, 30 days);

        bytes memory liqTx = hex"bb02";
        _register(liqTx, _liquidationLog(alice, EVIL_CONTRACT));

        vm.expectRevert(AniWereASC.NoMatchingLog.selector);
        _submitClaim(21_000_500, liqTx);
    }

    function test_RejectsUnprovenTransaction() public {
        vm.expectRevert(MockProver.ProofRejected.selector);
        _submitPosition(21_000_000, hex"deadbeef");
    }

    function test_RejectsReplayedProof() public {
        _verifyHealthyPosition();

        vm.expectRevert(AniWereASC.ProofAlreadyUsed.selector);
        _submitPosition(21_000_000, hex"aa01");
    }

    /// @dev proofId mengikat height, bukan cuma isi transaksi. Tanpa itu,
    ///      snapshot lama bisa dikirim ulang seolah datang dari blok baru.
    ///      Kebalikannya juga harus benar: transaksi yang sama di height berbeda
    ///      adalah proof berbeda, dan memang harus lolos.
    function test_SameTransactionAtDifferentHeightIsSeparateProof() public {
        _verifyHealthyPosition();
        _submitPosition(21_000_001, hex"aa01");

        (,,, uint256 sourceBlock,) = asc.latestSnapshot(alice);
        assertEq(sourceBlock, 21_000_001);
    }

    function test_CannotBuyCoverWhenAlreadyUnhealthy() public {
        bytes memory rawTx = hex"aa02";
        _register(rawTx, _probeLog(alice, 10_000e8, 9_800e8, 1.01e18));
        _submitPosition(21_000_000, rawTx);

        vm.prank(alice);
        vm.expectRevert(AniWereASC.HealthFactorTooLow.selector);
        asc.buyCover{value: PREMIUM}(COVER, 30 days);
    }

    function test_CannotBuyCoverWithStaleSnapshot() public {
        _verifyHealthyPosition();
        skip(2 hours);

        vm.prank(alice);
        vm.expectRevert(AniWereASC.StaleSnapshot.selector);
        asc.buyCover{value: PREMIUM}(COVER, 30 days);
    }

    /// @dev Solvency guard: vault tidak boleh menjual cover melebihi modalnya.
    function test_CannotOversellCover() public {
        _verifyHealthyPosition();

        uint256 tooMuch = 600 ether; // modal hanya 500
        vm.deal(alice, 20 ether);

        vm.prank(alice);
        vm.expectRevert(CoverVault.InsufficientFreeCapital.selector);
        asc.buyCover{value: (tooMuch * 200) / 10_000}(tooMuch, 30 days);
    }

    function test_ExpiredPolicyUnlocksCapital() public {
        _verifyHealthyPosition();

        vm.prank(alice);
        asc.buyCover{value: PREMIUM}(COVER, 30 days);
        assertEq(vault.lockedCapital(), COVER);

        skip(31 days);
        asc.expirePolicy(alice);

        assertEq(vault.lockedCapital(), 0);
        // Premi jadi milik pool underwriter.
        assertEq(vault.totalCapital(), 500 ether + PREMIUM);
    }

    function test_CannotClaimAfterExpiry() public {
        _verifyHealthyPosition();

        vm.prank(alice);
        asc.buyCover{value: PREMIUM}(COVER, 30 days);

        skip(31 days);

        bytes memory liqTx = hex"bb03";
        _register(liqTx, _liquidationLog(alice, AAVE_POOL));

        vm.expectRevert(AniWereASC.PolicyExpiredError.selector);
        _submitClaim(21_000_500, liqTx);
    }

    function test_UnderwriterCannotWithdrawLockedCapital() public {
        _verifyHealthyPosition();

        vm.prank(alice);
        asc.buyCover{value: PREMIUM}(COVER, 30 days);

        vm.prank(underwriter);
        vm.expectRevert(CoverVault.InsufficientFreeCapital.selector);
        vault.withdrawCapital(450 ether);
    }

    /// @dev Properti "no privileged access". Kalau tes ini gagal, seseorang
    ///      menambahkan jalan bagi pihak luar untuk menyentuh dana vault.
    function test_OnlyASCCanTouchVault() public {
        vm.expectRevert(CoverVault.NotASC.selector);
        vault.lockCapital(1 ether);

        vm.expectRevert(CoverVault.NotASC.selector);
        vault.payClaim(address(this), 1 ether);
    }
}
