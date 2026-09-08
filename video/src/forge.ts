/**
 * Output `forge test` yang sebenarnya dari `contracts-creditcoin/`, disalin apa
 * adanya pada 8 September 2026. Kalau test berubah, jalankan ulang:
 *
 *   cd contracts-creditcoin && forge test | grep -E '^\[PASS\]|^Suite result'
 *
 * Angka di video harus selalu bisa direproduksi orang lain dari repo yang sama.
 */
export const FORGE_LINES = [
  "Ran 12 tests for test/AniWereASC.t.sol:AniWereASCTest",
  "[PASS] test_CannotBuyCoverWhenAlreadyUnhealthy",
  "[PASS] test_CannotBuyCoverWithStaleSnapshot",
  "[PASS] test_CannotClaimAfterExpiry",
  "[PASS] test_CannotOversellCover",
  "[PASS] test_ExpiredPolicyUnlocksCapital",
  "[PASS] test_HappyPath_BuyCoverThenClaim",
  "[PASS] test_OnlyASCCanTouchVault",
  "[PASS] test_RejectsLiquidationFromWrongEmitter",
  "[PASS] test_RejectsReplayedProof",
  "[PASS] test_RejectsUnprovenTransaction",
  "[PASS] test_SameTransactionAtDifferentHeightIsSeparateProof",
  "[PASS] test_UnderwriterCannotWithdrawLockedCapital",
  "",
  "Suite result: ok. 12 passed; 0 failed; 0 skipped",
];
