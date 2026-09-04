import { writeFileSync } from "node:fs";
import type { Hex } from "viem";
import { fetchProof, waitUntilAttested, type Proof } from "./attestcoin.js";
import { sepoliaClient } from "./clients.js";
import { submitProof } from "./submit.js";
import { log } from "./log.js";

/**
 * Satu jalur, dipakai baik untuk snapshot posisi maupun klaim likuidasi:
 *
 *   tx di Sepolia → tunggu blok ter-attest → minta proof → submit ke Creditcoin
 *
 * Perbedaan keduanya cuma nama fungsi yang dipanggil di ASC. Log yang mana
 * yang dipakai adalah urusan kontrak, bukan worker — worker mengirim seluruh
 * receipt dan `_findLog` yang memilih. Itu disengaja: worker tidak boleh punya
 * kesempatan untuk memilihkan.
 */

export async function buildProof(txHash: Hex): Promise<Proof> {
  const pub = sepoliaClient();

  const receipt = await pub.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    throw new Error(`transaksi sumber ${txHash} revert di Sepolia — log-nya tidak berlaku`);
  }
  log.ok(`tx sumber ada di blok Sepolia ${receipt.blockNumber}, ${receipt.logs.length} log`);

  await waitUntilAttested(receipt.blockNumber);

  log.step("meminta proof ke Proof Builder");
  const proof = await fetchProof(txHash);

  // Kalau prover menyebut blok yang berbeda dari receipt, ada yang salah
  // sebelum kita menyentuh rantai — reorg, atau tx hash yang tertukar.
  if (proof.height !== receipt.blockNumber) {
    throw new Error(`proof menyebut blok ${proof.height}, receipt Sepolia menyebut ${receipt.blockNumber}`);
  }

  log.ok(
    `proof siap — height ${proof.height}, txIndex ${proof.txIndex}, ` +
      `${proof.merkleProof.siblings.length} merkle sibling, ${proof.continuityProof.roots.length} continuity root, ` +
      `${(proof.encodedTransaction.length - 2) / 2} byte receipt`,
  );
  return proof;
}

export async function proveAndSubmit(
  txHash: Hex,
  fn: "submitPositionProof" | "submitLiquidationClaim",
): Promise<Hex> {
  const proof = await buildProof(txHash);
  return submitProof(fn, proof);
}

/** Simpan proof apa adanya, supaya bisa dipakai ulang tanpa menunggu lagi. */
export function saveProof(proof: Proof, path: string): void {
  writeFileSync(
    path,
    JSON.stringify(proof, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2),
  );
  log.ok(`proof disimpan ke ${path}`);
}
