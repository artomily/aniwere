/**
 * Sumber data sementara untuk UI.
 *
 * Bentuk tiap tipe di bawah sengaja dibuat mengikuti struct di AniWereASC.sol,
 * supaya saat kontrak sudah live yang berubah hanya isi fungsi getter-nya,
 * bukan komponen yang memakainya.
 *
 * Nilai numerik disimpan sebagai number dalam satuan yang sudah manusiawi
 * (bukan wei / 1e18). Konversi dari bigint on-chain jadi tanggung jawab
 * lapisan pengambil data nanti, bukan komponen.
 */

/**
 * Cermin dari `Snapshot` di AniWereASC.
 *
 * Beberapa field `null` ketika datanya dari chain: kontrak menyimpan collateral
 * dalam base currency Aave, bukan ETH, dan tidak menyimpan liquidation threshold
 * sama sekali. Dibiarkan `null` daripada diisi angka perkiraan — angka
 * perkiraan di dashboard risiko tidak bisa dibedakan dari angka terbukti.
 */
export type Snapshot = {
  collateralEth: number | null;
  collateralUsd: number;
  debtUsd: number;
  /** `Infinity` kalau posisi tidak punya hutang. */
  healthFactor: number;
  /** Block Sepolia tempat event probe di-emit. */
  sourceBlock: number;
  /** Kapan snapshot ini diverifikasi di Creditcoin. */
  verifiedAt: Date;
  liquidationThresholdPct: number | null;
};

/** Cermin dari `Policy` di AniWereASC. */
export type Policy = {
  id: string;
  coverAmount: number;
  premiumPaid: number;
  hfAtPurchase: number;
  /** `null` dari chain — kontrak hanya menyimpan `expiresAt`. */
  startedAt: Date | null;
  expiresAt: Date;
  active: boolean;
  claimed: boolean;
  holder: string;
};

export type VaultState = {
  totalCapital: number;
  locked: number;
};

/** Satu langkah dalam rantai bukti, dari event di Sepolia sampai efek di Creditcoin. */
export type ProofStep = {
  label: string;
  detail: string;
  /** Detik sejak transaksi sumber. Dipakai menampilkan latency yang jujur. */
  atSeconds: number;
};

/**
 * Parameter produk. Semuanya `constant` di AniWereASC — tidak ada admin
 * yang bisa mengubahnya setelah deploy, dan UI harus menampilkannya apa adanya.
 */
export const PARAMS = {
  premiumBps: 200,
  bps: 10_000,
  maxSnapshotAgeMs: 60 * 60 * 1000,
  minHfToBuy: 1.05,
  minDurationDays: 1,
  maxDurationDays: 90,
} as const;

export const WALLET = "0x7a3f…9C21";

/** Aave V3 Pool di Sepolia, diverifikasi lewat PoolAddressesProvider.getPool(). */
export const AAVE_POOL_SEPOLIA = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";

export const snapshot: Snapshot = {
  collateralEth: 4.2,
  collateralUsd: 10_483.2,
  debtUsd: 6_240,
  healthFactor: 1.42,
  sourceBlock: 11_576_800,
  verifiedAt: new Date("2026-08-27T09:06:00Z"),
  liquidationThresholdPct: 82.5,
};

export const policy: Policy = {
  id: "0042",
  coverAmount: 2_500,
  premiumPaid: 50,
  hfAtPurchase: 1.51,
  startedAt: new Date("2026-08-15T00:00:00Z"),
  expiresAt: new Date("2026-09-14T00:00:00Z"),
  active: true,
  claimed: false,
  holder: WALLET,
};

export const vault: VaultState = {
  totalCapital: 180_000,
  locked: 42_500,
};

/**
 * Riwayat health factor dari snapshot yang benar-benar tersimpan on-chain.
 * Tiap titik adalah satu proof, bukan hasil polling.
 */
export const history: {
  date: string;
  hf: number;
  /** Utang pada snapshot yang sama. Dipakai sebagai seri kedua di grafik. */
  debtUsd: number;
  block: number;
}[] = [
  { date: "14 Aug", hf: 1.86, debtUsd: 4_820, block: 11_501_204 },
  { date: "16 Aug", hf: 1.79, debtUsd: 5_010, block: 11_515_882 },
  { date: "18 Aug", hf: 1.68, debtUsd: 5_340, block: 11_530_119 },
  { date: "20 Aug", hf: 1.72, debtUsd: 5_220, block: 11_544_760 },
  { date: "22 Aug", hf: 1.51, debtUsd: 5_940, block: 11_552_338 },
  { date: "24 Aug", hf: 1.43, debtUsd: 6_310, block: 11_560_907 },
  { date: "25 Aug", hf: 1.54, debtUsd: 6_050, block: 11_566_441 },
  { date: "26 Aug", hf: 1.61, debtUsd: 5_780, block: 11_571_002 },
  { date: "now", hf: 1.42, debtUsd: 6_240, block: 11_576_800 },
];

/** Rantai bukti untuk snapshot terakhir. */
export const snapshotProof: ProofStep[] = [
  { label: "Probe called on Sepolia", detail: "0x3429c1aa…3f4d7e", atSeconds: 0 },
  { label: "Mined in block", detail: "11,576,800 · tx index 0", atSeconds: 12 },
  { label: "Attested on Creditcoin", detail: "chain key 1 · height 11,576,870", atSeconds: 484 },
  { label: "Continuity + Merkle verified", detail: "precompile 0x…0FD2 → true", atSeconds: 499 },
  { label: "Snapshot stored", detail: "0xb7e2…41ac", atSeconds: 499 },
];

export function freeCapital(v: VaultState) {
  return v.totalCapital - v.locked;
}

export function premiumFor(coverAmount: number) {
  return (coverAmount * PARAMS.premiumBps) / PARAMS.bps;
}

/** Ambang yang sama dengan yang dipakai kontrak untuk memutuskan warna status. */
export function riskOf(hf: number): "safe" | "caution" | "critical" {
  if (hf < 1.1) return "critical";
  if (hf < 1.35) return "caution";
  return "safe";
}

export function formatCtc(n: number, digits = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatUsd(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

/** "15 Aug 2026" — dipakai untuk tanggal polis. */
export function formatDate(d: Date, withYear = false) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

/** "8 min" — dipakai untuk umur snapshot. Tidak pernah diklaim sebagai live. */
export function minutesAgo(from: Date, now: Date) {
  return Math.max(0, Math.round((now.getTime() - from.getTime()) / 60_000));
}
