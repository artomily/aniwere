"use client";

import { useState } from "react";
import type { Hex } from "viem";
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { creditcoinTestnet, sepolia } from "@/lib/chains";
import { ASC_ADDRESS, PROBE_ADDRESS, ascAbi, probeAbi } from "@/lib/contracts";
import type { ProofJson } from "@/lib/proofBuilder";
import { Box, Spinner, TxLink, TxStatus, WorkerFallback, type TxPhase } from "./tx";

/**
 * Aksi on-chain yang bisa dijalankan dari browser.
 *
 * Ketiganya juga tersedia lewat worker di terminal, dan itu bukan duplikasi
 * yang sia-sia: `submitPositionProof` dan `submitLiquidationClaim` memang
 * permissionless. Kalau tombol di sini gagal saat demo, perintah worker yang
 * ditampilkan di bawahnya menyelesaikan hal yang persis sama.
 */

function message(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  // Pesan viem panjang sekali. Baris pertama biasanya sudah cukup.
  return raw.split("\n")[0]!.slice(0, 200);
}

// ─────────────────────────────────────────────────────────────
// 1. Probe posisi di Sepolia
// ─────────────────────────────────────────────────────────────

export function ProbeButton({ onProbed }: { onProbed?: (tx: Hex) => void }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: sepolia.id });

  const [phase, setPhase] = useState<TxPhase>("idle");
  const [hash, setHash] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = isConnected && !!address && !!PROBE_ADDRESS;

  async function run() {
    if (!ready || !client) return;
    setError(null);
    setPhase("signing");
    try {
      if (chainId !== sepolia.id) await switchChainAsync({ chainId: sepolia.id });

      const tx = await writeContractAsync({
        address: PROBE_ADDRESS!,
        abi: probeAbi,
        functionName: "probe",
        args: [address!],
        chainId: sepolia.id,
      });
      setHash(tx);
      setPhase("pending");

      const receipt = await client.waitForTransactionReceipt({ hash: tx });
      if (receipt.status !== "success") throw new Error("probe reverted on Sepolia");

      setPhase("success");
      onProbed?.(tx);
    } catch (e) {
      setError(message(e));
      setPhase("error");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={!ready || phase === "signing" || phase === "pending"}
        className="w-full cursor-pointer rounded-2xl bg-accent px-4 py-3 text-[13px] font-semibold text-white shadow-card hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {phase === "signing" || phase === "pending" ? "Probing…" : "Probe my position on Sepolia"}
      </button>

      {!PROBE_ADDRESS && (
        <Box tone="neutral">
          <code className="font-mono text-[11px]">NEXT_PUBLIC_PROBE_ADDRESS</code> is not
          set, so there is no probe contract to call yet.
        </Box>
      )}

      <TxStatus
        phase={phase}
        hash={hash}
        chain="sepolia"
        error={error}
        labels={{
          pending: "Probe sent. Waiting for Sepolia to mine it…",
          success: "Position emitted on Sepolia.",
        }}
      />

      {phase === "success" && hash && (
        <>
          <Box tone="accent">
            Next: prove it on Creditcoin. The source block has to be attested first, which
            takes about 8 minutes.
          </Box>
          <ProveAndSubmit sourceTx={hash} kind="position" />
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. Bangun proof lalu kirim ke Creditcoin
// ─────────────────────────────────────────────────────────────

type Kind = "position" | "claim";

/**
 * Menunggu attestation, mengambil proof, lalu mengirimkannya.
 *
 * Proof diambil lewat route server kita sendiri karena Proof Builder tidak
 * mengirim header CORS. Route itu tidak menambah wewenang apa pun — proof yang
 * lewat sana tetap harus lolos precompile di kontrak.
 */
export function ProveAndSubmit({
  sourceTx,
  kind,
  onDone,
}: {
  sourceTx: Hex;
  kind: Kind;
  onDone?: () => void;
}) {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: creditcoinTestnet.id });

  const [phase, setPhase] = useState<TxPhase | "waiting" | "building">("idle");
  const [note, setNote] = useState<string | null>(null);
  const [hash, setHash] = useState<Hex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fn = kind === "position" ? "submitPositionProof" : "submitLiquidationClaim";
  const command = `npm run worker -- ${kind === "position" ? "submit-position" : "submit-claim"} ${sourceTx}`;

  async function run() {
    if (!ASC_ADDRESS || !client) return;
    setError(null);
    setNote(null);

    try {
      // 1. Tunggu blok sumber ter-attest. Proof Builder menolak sebelum itu.
      setPhase("waiting");
      const proof = await waitForProof(sourceTx, (msg) => setNote(msg));

      // 2. Kirim. Bentuk argumennya harus persis mengikuti struct precompile.
      setPhase("signing");
      if (chainId !== creditcoinTestnet.id) {
        await switchChainAsync({ chainId: creditcoinTestnet.id });
      }

      const tx = await writeContractAsync({
        address: ASC_ADDRESS,
        abi: ascAbi,
        functionName: fn,
        args: [
          BigInt(proof.headerNumber),
          proof.txBytes,
          proof.merkleProof,
          proof.continuityProof,
        ],
        chainId: creditcoinTestnet.id,
      });
      setHash(tx);
      setPhase("pending");

      const receipt = await client.waitForTransactionReceipt({ hash: tx });
      if (receipt.status !== "success") throw new Error("transaction reverted on Creditcoin");

      setPhase("success");
      onDone?.();
    } catch (e) {
      setError(message(e));
      setPhase("error");
    }
  }

  const busy = phase === "waiting" || phase === "building" || phase === "signing" || phase === "pending";

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={!isConnected || !ASC_ADDRESS || busy}
        className="mt-3 w-full cursor-pointer rounded-2xl bg-accent px-4 py-3 text-[13px] font-semibold text-white shadow-card hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy
          ? "Working…"
          : kind === "position"
            ? "Prove this snapshot on Creditcoin"
            : "Submit claim on Creditcoin"}
      </button>

      {!ASC_ADDRESS && (
        <Box tone="neutral">
          <code className="font-mono text-[11px]">NEXT_PUBLIC_ASC_ADDRESS</code> is not set,
          so there is no contract to submit to yet.
        </Box>
      )}

      {phase === "waiting" && (
        <Box tone="neutral">
          <Spinner />
          {note ?? "Checking attestation…"}
        </Box>
      )}

      <TxStatus
        phase={phase === "waiting" || phase === "building" ? "idle" : phase}
        hash={hash}
        chain="creditcoin"
        error={error}
        labels={{
          pending: "Proof submitted. Waiting for the Creditcoin receipt…",
          success:
            kind === "position" ? "Snapshot verified on Creditcoin." : "Claim settled — payout sent.",
        }}
      />

      <WorkerFallback command={command} />
    </div>
  );
}

/**
 * Polling attested height sampai proof bisa diambil.
 *
 * Interval 15 detik dan batas 20 menit adalah angka yang dipakai contoh resmi
 * Attestcoin, dan worker memakai angka yang sama. Jangan diturunkan hanya
 * supaya demo terasa cepat — attestation-nya tidak jadi lebih cepat.
 */
async function waitForProof(
  txHash: Hex,
  onProgress: (message: string) => void,
): Promise<ProofJson> {
  const deadline = Date.now() + 20 * 60_000;

  for (;;) {
    const res = await fetch(`/api/attestcoin/proof?tx=${txHash}`, { cache: "no-store" });
    if (res.ok) return (await res.json()) as ProofJson;

    if (Date.now() > deadline) {
      throw new Error("timed out waiting for attestation after 20 minutes");
    }

    const attested = await fetch("/api/attestcoin/attested", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);

    onProgress(
      attested?.height
        ? `Source block not attested yet. Attested head is ${Number(attested.height).toLocaleString("en-US")}. Checking again in 15s.`
        : "Proof builder did not answer. Retrying in 15s.",
    );

    await new Promise((r) => setTimeout(r, 15_000));
  }
}

// ─────────────────────────────────────────────────────────────
// 3. Klaim manual dari tx hash
// ─────────────────────────────────────────────────────────────

/**
 * Cadangan kalau worker mati saat demo.
 *
 * Ini bukan fitur darurat yang ditempel belakangan — `submitLiquidationClaim`
 * memang dirancang permissionless supaya pemegang polis tidak pernah
 * bergantung pada infrastruktur kami untuk dibayar.
 */
export function ManualClaim() {
  const [tx, setTx] = useState("");
  const valid = /^0x[0-9a-fA-F]{64}$/.test(tx);

  return (
    <div>
      <label htmlFor="claimtx" className="mb-1.5 block text-[11.5px] font-medium text-ink-3">
        Sepolia transaction containing the LiquidationCall
      </label>
      <input
        id="claimtx"
        value={tx}
        spellCheck={false}
        placeholder="0x…"
        onChange={(e) => setTx(e.target.value.trim())}
        className="w-full rounded-2xl border border-line-strong bg-surface px-4 py-3 font-mono text-[12.5px] text-ink outline-none focus:border-accent"
      />

      {tx.length > 0 && !valid && (
        <Box tone="critical">That is not a 32-byte transaction hash.</Box>
      )}

      {valid && <ProveAndSubmit sourceTx={tx as Hex} kind="claim" />}
    </div>
  );
}

export { TxLink };
