import { parseAbi } from "viem";

/** AniWereProbe di Sepolia. */
export const probeAbi = parseAbi([
  "event PositionProbedForCover(address indexed user, uint256 totalCollateralBase, uint256 totalDebtBase, uint256 healthFactor, uint256 probedAt)",
  "function probe(address user)",
  "function probeBatch(address[] users)",
  "function POOL() view returns (address)",
]);

/**
 * Aave V3 Pool di Sepolia.
 *
 * Hanya event LiquidationCall yang dipakai. Topics-nya
 * [sig, collateralAsset, debtAsset, user] — `user` ada di topics[3], dan
 * itulah pemegang polis yang akan dibayar.
 */
export const aavePoolAbi = parseAbi([
  "event LiquidationCall(address indexed collateralAsset, address indexed debtAsset, address indexed user, uint256 debtToCover, uint256 liquidatedCollateralAmount, address liquidator, bool receiveAToken)",
  "function getUserAccountData(address user) view returns (uint256 totalCollateralBase, uint256 totalDebtBase, uint256 availableBorrowsBase, uint256 currentLiquidationThreshold, uint256 ltv, uint256 healthFactor)",
]);

/**
 * AniWereASC di Creditcoin.
 *
 * Struct proof ditulis inline persis seperti di INativeQueryVerifier.
 * Tata letaknya tidak boleh diubah: harus byte-identik dengan precompile.
 */
export const ascAbi = [
  {
    type: "function",
    name: "submitPositionProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "height", type: "uint64" },
      { name: "encodedTransaction", type: "bytes" },
      {
        name: "merkleProof",
        type: "tuple",
        components: [
          { name: "root", type: "bytes32" },
          {
            name: "siblings",
            type: "tuple[]",
            components: [
              { name: "hash", type: "bytes32" },
              { name: "isLeft", type: "bool" },
            ],
          },
        ],
      },
      {
        name: "continuityProof",
        type: "tuple",
        components: [
          { name: "lowerEndpointDigest", type: "bytes32" },
          { name: "roots", type: "bytes32[]" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "submitLiquidationClaim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "height", type: "uint64" },
      { name: "encodedTransaction", type: "bytes" },
      {
        name: "merkleProof",
        type: "tuple",
        components: [
          { name: "root", type: "bytes32" },
          {
            name: "siblings",
            type: "tuple[]",
            components: [
              { name: "hash", type: "bytes32" },
              { name: "isLeft", type: "bool" },
            ],
          },
        ],
      },
      {
        name: "continuityProof",
        type: "tuple",
        components: [
          { name: "lowerEndpointDigest", type: "bytes32" },
          { name: "roots", type: "bytes32[]" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "latestSnapshot",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "collateral", type: "uint256" },
      { name: "debt", type: "uint256" },
      { name: "healthFactor", type: "uint256" },
      { name: "sourceBlock", type: "uint256" },
      { name: "verifiedAt", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "policies",
    stateMutability: "view",
    inputs: [{ name: "holder", type: "address" }],
    outputs: [
      { name: "coverAmount", type: "uint256" },
      { name: "premiumPaid", type: "uint256" },
      { name: "hfAtPurchase", type: "uint256" },
      { name: "expiresAt", type: "uint64" },
      { name: "active", type: "bool" },
      { name: "claimed", type: "bool" },
    ],
  },
  { type: "function", name: "VAULT", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "SOURCE_PROBE", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "SOURCE_AAVE_POOL", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "function",
    name: "usedProofs",
    stateMutability: "view",
    inputs: [{ type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "event",
    name: "PositionVerified",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "collateral", type: "uint256", indexed: false },
      { name: "debt", type: "uint256", indexed: false },
      { name: "healthFactor", type: "uint256", indexed: false },
      { name: "sourceBlock", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ClaimSettled",
    inputs: [
      { name: "holder", type: "address", indexed: true },
      { name: "payout", type: "uint256", indexed: false },
      { name: "sourceBlock", type: "uint256", indexed: false },
    ],
  },
] as const;

/**
 * Chain Info Precompile, 0x…0FD3.
 *
 * PERINGATAN: signature di bawah adalah dugaan dari bentuk return yang tercatat
 * di docs/ATTESTCOIN.md bagian 4, BUKAN salinan dari header resmi seperti
 * INativeQueryVerifier. Karena itu ia hanya dipakai `status` sebagai pembanding,
 * dan kegagalannya tidak boleh menghentikan apa pun.
 *
 * Sumber kebenaran untuk attested height adalah REST Proof Builder, yang
 * bentuk responsnya sudah diverifikasi langsung.
 */
export const chainInfoAbi = parseAbi([
  "function is_height_attested(uint64 chainKey, uint64 height) view returns (bool)",
  "function get_latest_attestation_height_and_hash(uint64 chainKey) view returns (uint64, bytes32)",
]);
