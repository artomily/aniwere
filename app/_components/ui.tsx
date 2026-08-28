import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={`rounded-3xl bg-surface shadow-card ${className}`}
    >
      {children}
    </article>
  );
}

export function CardHead({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-2.5">
      <h2 className="font-display text-[15px] font-semibold">{title}</h2>
      {sub && <span className="text-[12.5px] text-ink-3">{sub}</span>}
      {right && <div className="ml-auto">{right}</div>}
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-[10.5px] font-semibold tracking-[0.09em] text-ink-3 uppercase">
      {children}
    </span>
  );
}

/**
 * Penanda bahwa angka di dekatnya berasal dari bukti, bukan dari klaim.
 * Sengaja diulang di banyak tempat: kalau provenance cuma muncul di satu panel,
 * user tidak punya alasan mempercayai angka di panel lain.
 */
export function ProofChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-3 py-1.5 font-mono text-[11px] font-medium whitespace-nowrap text-accent">
      <ShieldCheck />
      {children}
    </span>
  );
}

export function FactGrid({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={`grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-2.5 ${className}`}
    >
      {children}
    </dl>
  );
}

export function Fact({
  label,
  value,
  note,
  mono = false,
}: {
  label: string;
  value: ReactNode;
  note?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-surface-2 px-4 py-3.5">
      <dt className="mb-1.5 text-[11px] text-ink-3">{label}</dt>
      <dd
        className={`tnum m-0 font-semibold ${
          mono ? "font-mono text-[13px]" : "font-display text-[19px]"
        }`}
      >
        {value}
        {note && (
          <small className="mt-0.5 block font-sans text-[11px] font-normal tracking-normal text-ink-3">
            {note}
          </small>
        )}
      </dd>
    </div>
  );
}

/** Kotak untuk hal yang harus disebut walau tidak enak didengar. */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 flex gap-2.5 rounded-2xl bg-surface-2 px-4 py-3.5 text-[12.5px] leading-relaxed text-ink-2">
      <span className="mt-0.5 shrink-0 text-ink-3">
        <InfoIcon />
      </span>
      <span>{children}</span>
    </p>
  );
}

export function StatePill({
  risk,
  children,
}: {
  risk: "safe" | "caution" | "critical";
  children: ReactNode;
}) {
  const tone = {
    safe: "bg-safe-soft text-safe",
    caution: "bg-caution-soft text-caution",
    critical: "bg-critical-soft text-critical",
  }[risk];

  return (
    <span
      className={`mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-semibold ${tone}`}
    >
      {children}
    </span>
  );
}

/* ── ikon ───────────────────────────────────────────────── */

export function ShieldCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M6 1l4 2v3.2C10 8.6 8.3 10.6 6 11 3.7 10.6 2 8.6 2 6.2V3l4-2z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path
        d="M4.4 6.1l1.1 1.1 2.2-2.3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Check({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none" aria-hidden>
      <path
        d="M1.6 5.2l2.2 2.2L8.4 2.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.6" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M7 6.4v3.2M7 4.3v.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ClockIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M6 3.4V6l1.7 1.7"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path
        d="M7.6 1.2L2.4 8h3.4l-.6 4.8L10.9 6H7.2l.4-4.8z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
      <rect x="2.4" y="5.2" width="7.2" height="5.4" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.2 5.2V3.8a1.8 1.8 0 013.6 0v1.4" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

export function NoExitIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="4.6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M2.7 2.7l6.6 6.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
