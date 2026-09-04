import type { Hex } from "viem";
import { config } from "./config.js";
import { log } from "./log.js";

/**
 * Klien Proof Builder.
 *
 * Sengaja memakai REST langsung, bukan @gluwa/usc-sdk. Alasannya satu:
 * bentuk respons di bawah sudah diverifikasi lewat pemanggilan live
 * (docs/ATTESTCOIN.md bagian 5), sementara SDK menyeret ethers ke dalam
 * project yang seluruh sisanya memakai viem. Kalau suatu saat perlu pindah
 * ke SDK, satu-satunya file yang berubah adalah ini.
 */

export type MerkleSibling = { hash: Hex; isLeft: boolean };
export type MerkleProof = { root: Hex; siblings: MerkleSibling[] };
export type ContinuityProof = { lowerEndpointDigest: Hex; roots: Hex[] };

/** Bentuk mentah dari `GET /api/v1/proof-by-tx/{chainKey}/{txHash}`. */
export type RawProof = {
  chainKey: number;
  headerNumber: number;
  txIndex: number;
  txBytes: Hex;
  merkleProof: MerkleProof;
  continuityProof: ContinuityProof;
};

/** Bentuk yang siap masuk ke kontrak. */
export type Proof = {
  chainKey: bigint;
  height: bigint;
  txIndex: number;
  encodedTransaction: Hex;
  merkleProof: MerkleProof;
  continuityProof: ContinuityProof;
};

async function get<T>(path: string): Promise<T> {
  const url = `${config.proofBuilderUrl}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`proof builder ${res.status} ${url}${body ? ` — ${body.slice(0, 200)}` : ""}`);
  }
  return (await res.json()) as T;
}

/**
 * Blok tertinggi di source chain yang sudah ter-attest di Creditcoin.
 *
 * Dipakai juga sebagai liveness check: `GET /health` mengembalikan 404,
 * jadi endpoint inilah yang menjawab "prover masih hidup?".
 */
export async function attestedHeight(): Promise<bigint> {
  const body = await get<unknown>(`/api/v1/attested-height/${config.chainKey}`);
  return parseHeight(body);
}

/**
 * Respons attested-height bisa berupa angka telanjang atau objek pembungkus,
 * tergantung versi prover. Terima keduanya, dan mati dengan pesan yang jelas
 * kalau bukan dua-duanya — jangan diam-diam mengembalikan NaN.
 */
function parseHeight(body: unknown): bigint {
  if (typeof body === "number" || typeof body === "string") return BigInt(body);
  if (body && typeof body === "object") {
    for (const key of ["height", "attestedHeight", "headerNumber", "latestHeight"]) {
      const v = (body as Record<string, unknown>)[key];
      if (typeof v === "number" || typeof v === "string") return BigInt(v);
    }
  }
  throw new Error(`bentuk respons attested-height tidak dikenali: ${JSON.stringify(body).slice(0, 200)}`);
}

/**
 * Tunggu sampai `height` ter-attest di Creditcoin.
 *
 * Polling 15 detik dengan batas 20 menit adalah angka yang dipakai contoh
 * resmi Attestcoin, dan kami memakainya apa adanya. Lag yang terukur sekitar
 * 8 menit di belakang head Sepolia, jadi batas 20 menit memberi ruang dua kali
 * lipat sebelum menyerah.
 */
export async function waitUntilAttested(height: bigint): Promise<void> {
  const deadline = Date.now() + config.attestTimeoutMs;
  let last = -1n;

  for (;;) {
    const current = await attestedHeight();
    if (current >= height) {
      log.ok(`blok ${height} sudah ter-attest (attested head ${current})`);
      return;
    }
    if (current !== last) {
      const behind = height - current;
      log.step(`menunggu attestation — attested ${current}, butuh ${height}, kurang ${behind} blok`);
      last = current;
    }
    if (Date.now() > deadline) {
      throw new Error(
        `timeout menunggu attestation blok ${height} setelah ${Math.round(config.attestTimeoutMs / 60_000)} menit ` +
          `(attested head berhenti di ${current}). Cek dulu apakah blok ini benar ada di Sepolia.`,
      );
    }
    await sleep(config.attestPollMs);
  }
}

/** Ambil proof untuk satu transaksi source chain. */
export async function fetchProof(txHash: Hex): Promise<Proof> {
  const raw = await get<RawProof>(`/api/v1/proof-by-tx/${config.chainKey}/${txHash}`);

  // Chain key yang tidak cocok berarti proof dibangun untuk chain lain.
  // Kontrak akan menolaknya, tapi lebih murah mati di sini.
  if (BigInt(raw.chainKey) !== config.chainKey) {
    throw new Error(`proof untuk chainKey ${raw.chainKey}, worker dikonfigurasi untuk ${config.chainKey}`);
  }
  if (!raw.txBytes || raw.txBytes === "0x") {
    throw new Error("proof builder mengembalikan txBytes kosong");
  }

  return {
    chainKey: BigInt(raw.chainKey),
    height: BigInt(raw.headerNumber),
    txIndex: raw.txIndex,
    encodedTransaction: raw.txBytes,
    merkleProof: raw.merkleProof,
    continuityProof: raw.continuityProof,
  };
}

/** Argumen posisional untuk submitPositionProof / submitLiquidationClaim. */
export function toContractArgs(p: Proof) {
  return [p.height, p.encodedTransaction, p.merkleProof, p.continuityProof] as const;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
