"use client";

import { useState, type ReactNode } from "react";
import { PARAMS, formatCtc, premiumFor } from "@/lib/data";
import { Card, CardHead, Check, Note } from "../_components/ui";

const DURATIONS = [7, 30, 90] as const;

type Props = {
  freeCapital: number;
  snapshotAgeMinutes: number;
  healthFactor: number;
};

/**
 * Form dan daftar syarat sengaja tinggal di satu komponen.
 *
 * Sebelumnya daftar syarat dirender terpisah dengan nilai statis, dan hasilnya
 * panel itu tetap menyatakan "cukup" saat cover sudah melebihi modal vault.
 * Di produk risiko, panel yang menyatakan kondisi terpenuhi padahal tidak
 * lebih berbahaya daripada tidak ada panel sama sekali.
 */
export function BuyCover({ freeCapital, snapshotAgeMinutes, healthFactor }: Props) {
  const [amount, setAmount] = useState(2500);
  const [days, setDays] = useState<number>(30);

  const premium = premiumFor(amount);
  const fitsVault = amount > 0 && amount <= freeCapital;
  const snapshotFresh = snapshotAgeMinutes * 60_000 < PARAMS.maxSnapshotAgeMs;
  const hfOk = healthFactor >= PARAMS.minHfToBuy;
  const durationOk = days >= PARAMS.minDurationDays && days <= PARAMS.maxDurationDays;

  const canBuy = fitsVault && snapshotFresh && hfOk && durationOk;

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
          Health factor <b>{healthFactor.toFixed(2)}</b> is above the{" "}
          <Code>{PARAMS.minHfToBuy.toFixed(2)}</Code> floor. You cannot insure a fire that
          has already started.
        </>
      ) : (
        <>
          Health factor <b>{healthFactor.toFixed(2)}</b> is below the{" "}
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

        <button
          type="button"
          disabled={!canBuy}
          className="mt-4 w-full cursor-pointer rounded-2xl bg-accent px-4 py-3.5 text-[14px] font-semibold text-white shadow-card hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Pay premium on Creditcoin
        </button>
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
