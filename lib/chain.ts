/**
 * Pembacaan on-chain untuk UI.
 *
 * Semuanya dijalankan di server dan tidak butuh wallet, deployment, atau
 * library web3 apa pun — cukup JSON-RPC dan satu endpoint REST. Itu disengaja:
 * bagian dashboard yang paling penting untuk dipercaya, yaitu status
 * attestation, harus tetap nyata walaupun kontraknya belum di-deploy.
 *
 * Kalau jaringan tidak bisa dihubungi, fungsi di sini mengembalikan `null`.
 * Komponen wajib menanganinya dengan mengatakan "tidak terbaca" — jangan
 * pernah menggantinya diam-diam dengan angka contoh.
 */

import { unstable_rethrow } from "next/navigation";
import { attestedHeightOf } from "./proofBuilder";

// `||`, bukan `??`: env var yang dideklarasikan tapi dibiarkan kosong di dashboard
// hosting bernilai "" — `??` meloloskannya, lalu fetch("") gagal diam-diam dan
// seluruh panel live terbaca "unreachable".
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL?.trim() || "https://ethereum-sepolia-rpc.publicnode.com";
const CREDITCOIN_RPC = process.env.CREDITCOIN_RPC_URL?.trim() || "https://rpc.cc3-testnet.creditcoin.network";

/** Rata-rata block time Sepolia, dipakai mengubah selisih blok jadi menit. */
const SEPOLIA_BLOCK_SECONDS = 12;

export type NetworkStatus = {
  sepoliaHead: number | null;
  sepoliaFinalized: number | null;
  attestedHeight: number | null;
  /** Selisih attested terhadap head, dalam blok. */
  behindHead: number | null;
  /** Positif berarti attestation berjalan MENDAHULUI finality Ethereum. */
  aheadOfFinalized: number | null;
  lagMinutes: number | null;
  creditcoinHead: number | null;
};

async function rpc(url: string, method: string, params: unknown[]): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      // Status jaringan tidak boleh di-cache. Angka basi di panel yang
      // judulnya "live" lebih buruk daripada tidak ada angka sama sekali.
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[chain] ${method} ${url} -> HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { result?: { number?: string } | string };
    if (typeof body.result === "string") return body.result;
    return body.result?.number ?? null;
  } catch (e) {
    // `fetch` no-store melempar sinyal internal Next saat prerender untuk
    // menandai route sebagai dinamis. Kalau ikut ditelan di sini, Next mengira
    // route ini aman dibekukan saat build dan mengirim "unreachable" selamanya.
    unstable_rethrow(e);
    // Tetap null ke UI, tapi alasannya harus terlihat di log server —
    // tanpa ini kegagalan di produksi tidak bisa dibedakan satu sama lain.
    console.error(`[chain] ${method} ${url} failed:`, (e as Error).message);
    return null;
  }
}

const toNum = (hex: string | null) => (hex ? Number.parseInt(hex, 16) : null);

export async function networkStatus(): Promise<NetworkStatus> {
  const [headHex, finalHex, ccHex, attestedHeight] = await Promise.all([
    rpc(SEPOLIA_RPC, "eth_getBlockByNumber", ["latest", false]),
    rpc(SEPOLIA_RPC, "eth_getBlockByNumber", ["finalized", false]),
    rpc(CREDITCOIN_RPC, "eth_blockNumber", []),
    attestedHeightOf(),
  ]);

  const sepoliaHead = toNum(headHex);
  const sepoliaFinalized = toNum(finalHex);
  const creditcoinHead = toNum(ccHex);

  const behindHead = sepoliaHead !== null && attestedHeight !== null ? sepoliaHead - attestedHeight : null;
  const aheadOfFinalized =
    sepoliaFinalized !== null && attestedHeight !== null ? attestedHeight - sepoliaFinalized : null;

  return {
    sepoliaHead,
    sepoliaFinalized,
    attestedHeight,
    behindHead,
    aheadOfFinalized,
    lagMinutes: behindHead === null ? null : Math.round((behindHead * SEPOLIA_BLOCK_SECONDS) / 60),
    creditcoinHead,
  };
}
