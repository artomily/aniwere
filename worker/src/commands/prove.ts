import type { Hex } from "viem";
import { buildProof, proveAndSubmit, saveProof } from "../pipeline.js";
import { log } from "../log.js";

/**
 * Bangun proof dan simpan ke file, tanpa mengirim apa pun.
 *
 * Ini yang menjawab DoD Hari 3, dan juga jaring pengaman saat demo: proof
 * yang sudah tersimpan bisa dikirim ulang kapan saja tanpa menunggu
 * attestation lagi.
 */
export async function prove(txHash: Hex, out?: string): Promise<void> {
  const proof = await buildProof(txHash);
  saveProof(proof, out ?? `proof-${txHash.slice(0, 10)}.json`);
}

export async function submitPosition(txHash: Hex): Promise<void> {
  const hash = await proveAndSubmit(txHash, "submitPositionProof");
  log.info("");
  log.ok(`snapshot posisi tersimpan di Creditcoin: ${hash}`);
}

export async function submitClaim(txHash: Hex): Promise<void> {
  const hash = await proveAndSubmit(txHash, "submitLiquidationClaim");
  log.info("");
  log.ok(`klaim dibayar: ${hash}`);
}
