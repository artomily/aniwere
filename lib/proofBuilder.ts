/**
 * Klien Proof Builder untuk sisi server Next.
 *
 * Sengaja terpisah dari `worker/src/attestcoin.ts` walaupun bentuk responsnya
 * sama. Worker adalah proses yang berdiri sendiri dan tidak boleh punya
 * ketergantungan ke frontend, dan sebaliknya. Yang harus tetap sinkron cuma
 * satu hal: bentuk JSON di bawah, dan itu ditentukan oleh Attestcoin.
 */

import { unstable_rethrow } from "next/navigation";

// `||` supaya env var yang kosong di dashboard hosting tetap jatuh ke default.
const PROOF_BUILDER = (
  process.env.PROOF_BUILDER_URL?.trim() || "https://prover.cc3-testnet.creditcoin.network"
).replace(/\/+$/, "");

const CHAIN_KEY = Number(process.env.SOURCE_CHAIN_KEY?.trim() || 1);

export type MerkleSibling = { hash: `0x${string}`; isLeft: boolean };

export type ProofJson = {
  chainKey: number;
  headerNumber: number;
  txIndex: number;
  txBytes: `0x${string}`;
  merkleProof: { root: `0x${string}`; siblings: MerkleSibling[] };
  continuityProof: { lowerEndpointDigest: `0x${string}`; roots: `0x${string}`[] };
};

export async function attestedHeightOf(): Promise<number | null> {
  try {
    const res = await fetch(`${PROOF_BUILDER}/api/v1/attested-height/${CHAIN_KEY}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[proofBuilder] attested-height -> HTTP ${res.status}`);
      return null;
    }
    const body: unknown = await res.json();
    if (typeof body === "number") return body;
    if (typeof body === "string") return Number(body);
    if (body && typeof body === "object") {
      for (const k of ["height", "attestedHeight", "headerNumber", "latestHeight"]) {
        const v = (body as Record<string, unknown>)[k];
        if (typeof v === "number") return v;
        if (typeof v === "string") return Number(v);
      }
    }
    return null;
  } catch (e) {
    // Lihat catatan yang sama di lib/chain.ts.
    unstable_rethrow(e);
    console.error(`[proofBuilder] attested-height failed (${PROOF_BUILDER}):`, (e as Error).message);
    return null;
  }
}

export async function fetchProofJson(
  txHash: string,
): Promise<ProofJson | { error: string }> {
  try {
    const res = await fetch(`${PROOF_BUILDER}/api/v1/proof-by-tx/${CHAIN_KEY}/${txHash}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { error: `proof builder ${res.status}${body ? ` — ${body.slice(0, 160)}` : ""}` };
    }

    const proof = (await res.json()) as ProofJson;

    // chainKey yang tidak cocok berarti proof dibangun untuk chain lain.
    // Kontrak akan menolaknya juga, tapi lebih murah mati di sini.
    if (Number(proof.chainKey) !== CHAIN_KEY) {
      return { error: `proof untuk chainKey ${proof.chainKey}, aplikasi dikonfigurasi ${CHAIN_KEY}` };
    }
    if (!proof.txBytes || proof.txBytes === "0x") {
      return { error: "proof builder mengembalikan txBytes kosong" };
    }

    return proof;
  } catch (e) {
    unstable_rethrow(e);
    return { error: (e as Error).message };
  }
}
