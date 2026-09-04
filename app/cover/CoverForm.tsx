"use client";

import { useState, type ReactNode } from "react";
import { parseEther } from "viem";
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { PARAMS, formatCtc, formatDate, premiumFor } from "@/lib/data";
import { creditcoinTestnet } from "@/lib/chains";
import { ASC_ADDRESS, BPS, PREMIUM_BPS, ascAbi } from "@/lib/contracts";
import { Card, CardHead, Check, Note } from "../_components/ui";
import { Box, TxStatus, type TxPhase } from "../_components/tx";

const DURATIONS = [7, 30, 90] as const;

type Props = {
  live: boolean;
  freeCapital: number;
  snapshotAgeMinutes: number;
  healthFactor: number;
  hasActivePolicy: boolean;
  policyExpiresAt: Date | null;
  onBought?: () => void;
};

/**
 * Form dan daftar syarat sengaja tinggal di satu komponen.
 *
 * Sebelumnya daftar syarat dirender terpisah dengan nilai statis, dan hasilnya
 * panel itu tetap menyatakan "cukup" saat cover sudah melebihi modal vault.
 * Di produk risiko, panel yang menyatakan kondisi terpenuhi padahal tidak
 * lebih berbahaya daripada tidak ada panel sama sekali.
 */
export function BuyCover({
  live,
  freeCapital,
  snapshotAgeMinutes,
  healthFactor,
  hasActivePolicy,
  policyExpiresAt,
  onBought,
}: Props) {
  const [amount, setAmount] = useState(live ? 100 : 2500);
  const [days, setDays] = useState<number>(30);

  const premium = premiumFor(amount);
  const fitsVault = amount > 0 && amount <= freeCapital;
  const snapshotFresh = snapshotAgeMinutes * 60_000 < PARAMS.maxSnapshotAgeMs;
  const hfOk = healthFactor >= PARAMS.minHfToBuy;
  const durationOk = days >= PARAMS.minDurationDays && days <= PARAMS.maxDurationDays;

  // Kontrak menolak polis kedua selama yang pertama masih aktif
  // (`PolicyAlreadyActive`). Dicerminkan di sini supaya tombolnya tidak
  // mengundang transaksi yang sudah pasti gagal.
  const canBuy = fitsVault && snapshotFresh && hfOk && durationOk && !hasActivePolicy;

  const buy = useBuyCover(onBought);

  const checks: { ok: boolean; text: ReactNode }[] = [
    {
      ok: snapshotFresh,
      text: snapshotFresh ? (
        <>
          Your snapshot is <b>{snapshotAgeMinutes} minutes old</b> — under the{" "}
          <Code>1 hour</Code> limit.
        </>
      ) : (
        <>
          Your snapshot is <b>{snapshotAgeMinutes} minutes old</b>, past the{" "}
          <Code>1 hour</Code> limit. Re-probe your position first.
        </>
      ),
    },
    {
      ok: hfOk,
      text: hfOk ? (
        <>
          Health factor <b>{fmtHf(healthFactor)}</b> is above the{" "}
          <Code>{PARAMS.minHfToBuy.toFixed(2)}</Code> floor. You cannot insure a fire that
          has already started.
        </>
      ) : (
        <>
          Health factor <b>{fmtHf(healthFactor)}</b> is below the{" "}
          <Code>{PARAMS.minHfToBuy.toFixed(2)}</Code> floor. Liquidation is too close for
          cover to be sold.
        </>
      ),
    },
    {
      ok: durationOk,
      text: (
        <>
          Duration <b>{days} days</b> sits inside{" "}
          <Code>
            {PARAMS.minDurationDays}–{PARAMS.maxDurationDays} days
          </Code>
          .
        </>
      ),
    },
    {
      ok: fitsVault,
      text: fitsVault ? (
        <>
          Vault has <b>{formatCtc(freeCapital, 0)} CTC</b> free — enough to cover{" "}
          {formatCtc(amount, 0)} CTC in full.
        </>
      ) : (
        <>
          Vault has <b>{formatCtc(freeCapital, 0)} CTC</b> free, short of the{" "}
          {formatCtc(amount, 0)} CTC you asked for.
        </>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-2">
      <Card className="px-[22px] py-5">
        <CardHead title="Buy cover" sub="Priced against your verified snapshot" />

        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
          <div>
            <label
              htmlFor="amt"
              className="mb-1.5 block text-[11.5px] font-medium text-ink-3"
            >
              Cover amount
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-line-strong bg-surface px-4 py-3 focus-within:border-accent">
              <input
                id="amt"
                inputMode="decimal"
                value={amount.toLocaleString("en-US")}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(/[^0-9.]/g, ""));
                  setAmount(Number.isFinite(n) ? n : 0);
                }}
                className="tnum w-full border-0 bg-transparent font-display text-[17px] font-semibold text-ink outline-none"
              />
              <span className="shrink-0 text-[12.5px] text-ink-3">CTC</span>
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[11.5px] font-medium text-ink-3">
              Duration
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={days === d}
                  onClick={() => setDays(d)}
                  className={`cursor-pointer rounded-2xl border px-4 py-3 text-[12.5px] ${
                    days === d
                      ? "border-accent bg-accent font-semibold text-white"
                      : "border-line-strong bg-surface text-ink-2 hover:text-ink"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-[18px] overflow-hidden rounded-2xl border border-line">
          <QuoteRow label={`Premium · ${PARAMS.premiumBps / 100}% flat`}>
            {formatCtc(premium)} CTC
          </QuoteRow>
          <QuoteRow label="Cover period">{days} days</QuoteRow>
          <QuoteRow label="Pays out if liquidated">{formatCtc(amount)} CTC</QuoteRow>
          <QuoteRow label="You pay today" total>
            {formatCtc(premium)} CTC
          </QuoteRow>
        </div>

        {!fitsVault && amount > 0 && (
          <p className="mt-3 rounded-2xl bg-critical-soft px-3.5 py-3 text-[12.5px] text-critical">
            Cover of {formatCtc(amount, 0)} CTC is more than the{" "}
            {formatCtc(freeCapital, 0)} CTC the vault has free. Lower the amount, or wait
            for more underwriter capital — the contract will reject this purchase.
          </p>
        )}

        {hasActivePolicy && (
          <p className="mt-3 rounded-2xl bg-accent-soft px-3.5 py-3 text-[12.5px] text-accent">
            You already hold an active policy
            {policyExpiresAt ? ` until ${formatDate(policyExpiresAt, true)}` : ""}. The
            contract allows one at a time — a second purchase reverts with{" "}
            <Code>PolicyAlreadyActive</Code>.
          </p>
        )}

        <button
          type="button"
          onClick={() => buy.run(amount, days)}
          disabled={!canBuy || !live || buy.busy}
          className="mt-4 w-full cursor-pointer rounded-2xl bg-accent px-4 py-3.5 text-[14px] font-semibold text-white shadow-card hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {buy.busy ? "Confirming…" : "Pay premium on Creditcoin"}
        </button>

        {!live && (
          <Box tone="neutral">
            Sample mode. The contracts are not deployed yet, so this button has nothing to
            send a transaction to. Every number and every rule shown here is the real one.
          </Box>
        )}

        <TxStatus
          phase={buy.phase}
          hash={buy.hash}
          chain="creditcoin"
          error={buy.error}
          labels={{
            pending: "Premium sent. Waiting for the Creditcoin receipt…",
            success: "Cover is active.",
          }}
        />

        <p className="mt-2.5 text-center text-[12.5px] text-ink-3">
          One transaction. The policy is written to your address and cannot be
          transferred.
        </p>
      </Card>

      <Card className="px-[22px] py-5">
        <CardHead title="Before you can buy" />
        <p className="mt-0.5 text-[12.5px] text-ink-3">
          Four conditions, all enforced by the contract.
        </p>

        <ul className="mt-4 flex list-none flex-col gap-2.5 p-0">
          {checks.map((c, i) => (
            <li key={i} className="flex items-start gap-2.5 text-[12.5px] text-ink-2">
              <span className={`mt-0.5 shrink-0 ${c.ok ? "text-safe" : "text-critical"}`}>
                {c.ok ? <Check size={13} /> : <Cross />}
              </span>
              <span>{c.text}</span>
            </li>
          ))}
        </ul>

        <Note>
          Cover pays a <b className="font-semibold text-ink">fixed amount</b> on a
          liquidation event. It does not track how much you actually lost, and it is not a
          hedge against price moves.
        </Note>
      </Card>
    </div>
  );
}

/**
 * Pembelian cover.
 *
 * Premi dihitung dalam bigint dengan rumus yang sama persis seperti di kontrak
 * — `(coverAmount * PREMIUM_BPS) / BPS`. Menghitungnya dalam `number` lalu
 * dibulatkan akan meleset beberapa wei, dan `buyCover` menolak `msg.value`
 * yang tidak sama persis lewat `BadPremium`.
 */
function useBuyCover(onBought?: () => void) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const client = usePublicClient({ chainId: creditcoinTestnet.id });

  const [phase, setPhase] = useState<TxPhase>("idle");
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(amountCtc: number, days: number) {
    if (!ASC_ADDRESS || !client || !isConnected) return;
    setError(null);
    setPhase("signing");

    try {
      if (chainId !== creditcoinTestnet.id) {
        await switchChainAsync({ chainId: creditcoinTestnet.id });
      }

      const coverWei = parseEther(String(amountCtc));
      const premiumWei = (coverWei * PREMIUM_BPS) / BPS;

      const tx = await writeContractAsync({
        address: ASC_ADDRESS,
        abi: ascAbi,
        functionName: "buyCover",
        args: [coverWei, BigInt(days) * 86_400n],
        value: premiumWei,
        chainId: creditcoinTestnet.id,
      });
      setHash(tx);
      setPhase("pending");

      const receipt = await client.waitForTransactionReceipt({ hash: tx });
      if (receipt.status !== "success") throw new Error("buyCover reverted");

      setPhase("success");
      onBought?.();
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      setError(raw.split("\n")[0]!.slice(0, 200));
      setPhase("error");
    }
  }

  return {
    run,
    phase,
    hash,
    error,
    busy: phase === "signing" || phase === "pending",
  };
}

/** Posisi tanpa hutang punya HF tak hingga; `toFixed` di situ menghasilkan "Infinity". */
function fmtHf(hf: number) {
  return Number.isFinite(hf) ? hf.toFixed(2) : "\u221e";
}

function Cross() {
  return (
    <svg width="13" height="13" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path
        d="M2.4 2.4l5.2 5.2M7.6 2.4L2.4 7.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-sunken px-1.5 py-px font-mono text-[11.5px] text-ink">
      {children}
    </code>
  );
}

function QuoteRow({
  label,
  children,
  total = false,
}: {
  label: string;
  children: ReactNode;
  total?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-3.5 border-t border-line px-[15px] py-2.5 text-[13px] first:border-t-0 ${
        total ? "bg-surface-2 font-semibold" : ""
      }`}
    >
      <span>{label}</span>
      <b className="tnum font-display">{children}</b>
    </div>
  );
}
