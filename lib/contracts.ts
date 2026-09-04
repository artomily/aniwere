import type { Address } from "viem";

/**
 * Alamat kontrak, dan satu-satunya tempat UI memutuskan "sudah live atau belum".
 *
 * Selama `ASC_ADDRESS` kosong, seluruh angka posisi dan polis di UI adalah data
 * contoh dan diberi label seperti itu. Jangan mengisi env ini dengan alamat
 * karangan hanya supaya banner-nya hilang — banner itu justru yang membuat
 * sisanya bisa dipercaya.
 */
function envAddress(name: string): Address | null {
  const v = process.env[name];
  return v && /^0x[0-9a-fA-F]{40}$/.test(v) ? (v as Address) : null;
}

export const ASC_ADDRESS = envAddress("NEXT_PUBLIC_ASC_ADDRESS");
export const PROBE_ADDRESS = envAddress("NEXT_PUBLIC_PROBE_ADDRESS");

/** Aave V3 Pool di Sepolia. Terverifikasi lewat `PoolAddressesProvider.getPool()`. */
export const AAVE_POOL = (process.env.NEXT_PUBLIC_AAVE_POOL ??
  "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951") as Address;

export const isDeployed = ASC_ADDRESS !== null;
export const canProbe = PROBE_ADDRESS !== null;

/**
 * Parameter produk. Semuanya `constant` di AniWereASC, jadi aman di-hardcode —
 * tidak ada admin yang bisa mengubahnya setelah deploy. Kalau suatu saat salah
 * satunya jadi bisa berubah, angka-angka ini harus dibaca dari kontrak.
 */
export const PREMIUM_BPS = 200n;
export const BPS = 10_000n;
export const MAX_SNAPSHOT_AGE_S = 3600n;
export const MIN_HF_TO_BUY = 1_050_000_000_000_000_000n; // 1.05e18

export const ascAbi = [
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
  {
    type: "function",
    name: "buyCover",
    stateMutability: "payable",
    inputs: [
      { name: "coverAmount", type: "uint256" },
      { name: "duration", type: "uint64" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "quotePremium",
    stateMutability: "pure",
    inputs: [{ name: "coverAmount", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "expirePolicy",
    stateMutability: "nonpayable",
    inputs: [{ name: "holder", type: "address" }],
    outputs: [],
  },
  { type: "function", name: "VAULT", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "SOURCE_PROBE", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "SOURCE_AAVE_POOL", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
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
] as const;

export const vaultAbi = [
  { type: "function", name: "totalCapital", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "lockedCapital", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "freeCapital", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "depositCapital", stateMutability: "payable", inputs: [], outputs: [] },
] as const;

export const probeAbi = [
  {
    type: "function",
    name: "probe",
    stateMutability: "nonpayable",
    inputs: [{ name: "user", type: "address" }],
    outputs: [],
  },
  {
    type: "event",
    name: "PositionProbedForCover",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "totalCollateralBase", type: "uint256", indexed: false },
      { name: "totalDebtBase", type: "uint256", indexed: false },
      { name: "healthFactor", type: "uint256", indexed: false },
      { name: "probedAt", type: "uint256", indexed: false },
    ],
  },
] as const;

/** Aave V3 Pool, hanya bagian yang dipakai untuk menampilkan posisi belum terbukti. */
export const aavePoolAbi = [
  {
    type: "function",
    name: "getUserAccountData",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "totalCollateralBase", type: "uint256" },
      { name: "totalDebtBase", type: "uint256" },
      { name: "availableBorrowsBase", type: "uint256" },
      { name: "currentLiquidationThreshold", type: "uint256" },
      { name: "ltv", type: "uint256" },
      { name: "healthFactor", type: "uint256" },
    ],
  },
] as const;
