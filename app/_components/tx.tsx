"use client";

import type { ReactNode } from "react";
import { creditcoinTxUrl, sepoliaTxUrl } from "@/lib/chains";

/**
 * Tampilan status transaksi.
 *
 * Satu aturan yang dipegang di seluruh file ini: jangan pernah menampilkan
 * "berhasil" sebelum receipt-nya ada. Transaksi terkirim bukan transaksi
 * sukses, dan di aplikasi yang memindahkan uang bedanya bukan detail.
 */
export type TxPhase = "idle" | "signing" | "pending" | "success" | "error";

export function TxStatus({
  phase,
  hash,
  chain,
  error,
  labels,
}: {
  phase: TxPhase;
  hash?: `0x${string}` | null;
  chain: "sepolia" | "creditcoin";
  error?: string | null;
  labels?: { signing?: string; pending?: string; success?: string };
}) {
  if (phase === "idle") return null;

  const url = hash
    ? chain === "sepolia"
      ? sepoliaTxUrl(hash)
      : creditcoinTxUrl(hash)
    : null;

  if (phase === "error") {
    return (
      <Box tone="critical">
        <b className="font-semibold">Failed.</b> {error ?? "Unknown error."}
      </Box>
    );
  }

  if (phase === "success") {
    return (
      <Box tone="safe">
        <b className="font-semibold">{labels?.success ?? "Confirmed."}</b>{" "}
        {url && <TxLink url={url} hash={hash!} />}
      </Box>
    );
  }

  return (
    <Box tone="neutral">
      <Spinner />
      {phase === "signing"
        ? (labels?.signing ?? "Waiting for your wallet…")
        : (labels?.pending ?? "Waiting for the transaction to be mined…")}{" "}
      {url && <TxLink url={url} hash={hash!} />}
    </Box>
  );
}

export function TxLink({ url, hash }: { url: string; hash: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-[11.5px] underline underline-offset-2 hover:no-underline"
    >
      {hash.slice(0, 10)}…{hash.slice(-6)}
    </a>
  );
}

export function Box({
  tone,
  children,
}: {
  tone: "safe" | "critical" | "neutral" | "accent";
  children: ReactNode;
}) {
  const tones = {
    safe: "bg-safe-soft text-safe",
    critical: "bg-critical-soft text-critical",
    accent: "bg-accent-soft text-accent",
    neutral: "bg-surface-2 text-ink-2",
  } as const;

  return (
    <p
      className={`mt-3 flex flex-wrap items-center gap-2 rounded-2xl px-3.5 py-3 text-[12.5px] leading-relaxed ${tones[tone]}`}
    >
      {children}
    </p>
  );
}

export function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden className="animate-spin">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
      <path d="M14 8a6 6 0 00-6-6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Perintah worker yang setara, lengkap dengan tx hash-nya.
 *
 * Ditampilkan bukan sebagai dekorasi: kalau jalur browser gagal saat demo,
 * baris inilah cadangannya, dan `submitLiquidationClaim` memang permissionless
 * supaya siapa pun bisa menjalankannya.
 */
export function WorkerFallback({ command }: { command: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-line bg-sunken px-3.5 py-3">
      <div className="text-[11px] text-ink-3">Same thing from the terminal</div>
      <code className="mt-1 block font-mono text-[11.5px] break-all text-ink-2">{command}</code>
    </div>
  );
}
