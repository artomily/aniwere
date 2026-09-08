"use client";

import {
  formatCtc,
  formatDate,
  formatUsd,
  freeCapital,
  history as sampleHistory,
  minutesAgo,
  riskOf,
  SAMPLE_EPOCH,
  snapshotProof,
  type Policy,
  type Snapshot,
} from "@/lib/data";
import { useAniWere, useNow, useProofHistory, type ProofEvent } from "@/lib/useAniWere";
import { creditcoinTxUrl } from "@/lib/chains";
import { HealthChart, type ChartPoint } from "./_components/HealthChart";
import { HealthRing } from "./_components/HealthRing";
import { Card, Check, ProofChip } from "./_components/ui";
import { ProbeButton } from "./_components/Actions";
import { ConnectButton } from "./_components/ConnectButton";

/**
 * Waktu acuan untuk data contoh.
 *
 * Render pertama di server dan di client harus identik, jadi `useNow` memakai
 * nilai ini lebih dulu lalu menggantinya dengan waktu asli setelah mount.
 *
 * Datang dari `lib/data` supaya jam dan datanya tidak bisa lagi bergeser
 * sendiri-sendiri — dulu konstanta ini ditulis ulang di dua halaman.
 */
const SAMPLE_NOW = SAMPLE_EPOCH;

export default function DashboardPage() {
  const { source, deployed, connected, loading, snapshot, policy, vault, refetch } =
    useAniWere();
  const proofs = useProofHistory();
  const liveNow = useNow(SAMPLE_NOW);

  // Dalam mode contoh, waktu ikut dibekukan di titik yang sama dengan datanya.
  // Kalau tidak, snapshot contoh dari Agustus akan terbaca "11.000 menit lalu"
  // dan seluruh panel syarat berubah merah — bukan karena ada yang salah,
  // melainkan karena mencampur data beku dengan jam yang berjalan.
  const now = source === "chain" ? liveNow : SAMPLE_NOW;

  // Sudah di-deploy tapi wallet belum tersambung. Menampilkan data contoh di
  // sini akan menyesatkan — kontraknya nyata, jadi angkanya juga harus nyata.
  if (deployed && !connected) {
    return <ConnectPrompt />;
  }

  // Tersambung, tapi address ini belum pernah punya snapshot terbukti.
  // Ini keadaan yang normal untuk user baru, bukan error.
  if (deployed && connected && !snapshot) {
    return <NoSnapshot loading={loading} onProbed={refetch} />;
  }

  // `snapshot` di titik ini selalu terisi: kalau `deployed` false, hook
  // mengembalikan data contoh.
  return (
    <Dashboard
      source={source}
      snapshot={snapshot!}
      policy={policy}
      vault={vault}
      now={now}
      proofs={proofs.events}
      proofsLoading={proofs.loading}
      onRefetch={refetch}
    />
  );
}

function Dashboard({
  source,
  snapshot,
  policy,
  vault,
  now,
  proofs,
  proofsLoading,
  onRefetch,
}: {
  source: "chain" | "sample";
  snapshot: Snapshot;
  policy: Policy | null;
  vault: { totalCapital: number; locked: number };
  now: Date;
  proofs: ProofEvent[];
  proofsLoading: boolean;
  onRefetch: () => void;
}) {
  const live = source === "chain";
  const ageMinutes = minutesAgo(snapshot.verifiedAt, now);
  const free = freeCapital(vault);
  const freePct = vault.totalCapital > 0 ? (free / vault.totalCapital) * 100 : 0;
  const risk = riskOf(snapshot.healthFactor);

  // Kontrak hanya menyimpan `expiresAt`, jadi untuk polis dari chain durasi
  // totalnya tidak diketahui. Dihitung dari sisa waktu saja, dan sisanya
  // dibiarkan kosong daripada ditebak.
  const daysLeft = policy
    ? Math.max(0, Math.ceil((policy.expiresAt.getTime() - now.getTime()) / 86_400_000))
    : 0;
  const totalDays =
    policy?.startedAt != null
      ? Math.round((policy.expiresAt.getTime() - policy.startedAt.getTime()) / 86_400_000)
      : null;

  /* Buffer sampai likuidasi, dinormalkan ke 0–100% dengan HF 2.0 sebagai atap.
     Ini yang sebenarnya ingin diketahui user: seberapa jauh dari garis merah. */
  const buffer = Math.min(
    100,
    Math.max(0, ((Math.min(snapshot.healthFactor, 2) - 1) / (2 - 1)) * 100)
  );

  const metrics = [
    { label: "Buffer to liquidation", pct: buffer, up: false },
    {
      label: "Cover period left",
      pct: totalDays ? (daysLeft / totalDays) * 100 : policy ? 100 : 0,
      up: true,
    },
    { label: "Vault free capital", pct: freePct, up: true },
    {
      label: "Snapshot freshness",
      pct: Math.max(0, 100 - (ageMinutes / 60) * 100),
      up: false,
    },
  ];

  /* Grafik dibangun dari event PositionVerified, bukan dari storage: kontrak
     hanya menyimpan snapshot terakhir, dan riwayatnya memang hidup di log. */
  const chartPoints: ChartPoint[] = live
    ? proofs
        .filter((p) => p.kind === "snapshot" && p.healthFactor !== null)
        .map((p) => ({
          date: `#${p.sourceBlock.toLocaleString("en-US")}`,
          hf: p.healthFactor!,
          debtUsd: p.debtUsd ?? 0,
          block: p.sourceBlock,
        }))
    : sampleHistory;

  return (
    <div className="grid grid-cols-1 gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* ── kolom utama ── */}
      <div className="flex min-w-0 flex-col gap-5">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
          {/* kartu posisi dengan ring */}
          <Card className="flex flex-col items-center px-6 py-7 text-center">
            <div className="mb-1 flex w-full items-center justify-between">
              <span className="font-display text-[15px] font-semibold">Position</span>
              <span className="text-[11px] text-ink-3">{ageMinutes} min ago</span>
            </div>

            <HealthRing hf={Math.min(snapshot.healthFactor, 3)} />

            <div className="mt-4 font-display text-[20px] font-semibold">
              {snapshot.collateralEth !== null
                ? `${snapshot.collateralEth.toFixed(2)} ETH`
                : formatUsd(snapshot.collateralUsd)}
            </div>
            <div className="text-[12.5px] text-ink-3">
              {snapshot.collateralEth !== null
                ? `${formatUsd(snapshot.collateralUsd)} collateral`
                : "collateral, Aave base currency"}
            </div>

            <div className="mt-5 flex w-full flex-wrap justify-center gap-2">
              <MiniStat label="Debt" value={formatCtc(snapshot.debtUsd, 0)} />
              {snapshot.liquidationThresholdPct !== null ? (
                <MiniStat
                  label="Thresh."
                  value={`${snapshot.liquidationThresholdPct}%`}
                />
              ) : (
                <MiniStat label="Block" value={snapshot.sourceBlock.toLocaleString("en-US")} />
              )}
            </div>
          </Card>

          {/* dua kartu gradien + strip */}
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <MeshCard
                variant="warm"
                title="Health factor"
                value={
                  Number.isFinite(snapshot.healthFactor)
                    ? snapshot.healthFactor.toFixed(2)
                    : "∞"
                }
                caption={
                  !Number.isFinite(snapshot.healthFactor)
                    ? "No debt — cannot be liquidated"
                    : risk === "safe"
                      ? "Comfortably above liquidation"
                      : risk === "caution"
                        ? "Getting close to liquidation"
                        : "Liquidation is near"
                }
                icon={<GaugeIcon />}
              />
              <MeshCard
                variant="cool"
                title="Active cover"
                value={policy ? formatCtc(policy.coverAmount, 0) : "—"}
                unit={policy ? "CTC" : undefined}
                caption={
                  policy
                    ? `Pays out on liquidation · ${daysLeft}d left`
                    : "No policy yet — buy cover to get one"
                }
                icon={<ShieldIcon />}
              />
            </div>

            {/* strip, sepadan dengan "Trackers connected" di referensi */}
            <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-surface-2 px-6 py-5">
              <div className="mr-auto">
                <div className="font-display text-[15px] font-semibold">
                  {live ? "Proofs on Creditcoin" : "Proof chain verified"}
                </div>
                <div className="text-[12.5px] text-ink-3">
                  {live
                    ? `${proofs.length} proof${proofs.length === 1 ? "" : "s"} · latest source block ${snapshot.sourceBlock.toLocaleString("en-US")}`
                    : `${snapshotProof.length} steps · block ${snapshot.sourceBlock.toLocaleString("en-US")}`}
                </div>
              </div>
              <div className="flex items-center">
                {(live
                  ? proofs.slice(-5).map((p) => p.txHash)
                  : snapshotProof.map((s) => s.label)
                ).map((key, i) => (
                  <span
                    key={key}
                    style={{ marginLeft: i === 0 ? 0 : -10, zIndex: i }}
                    className="grid h-9 w-9 place-items-center rounded-full bg-accent text-white ring-3 ring-surface-2"
                  >
                    <Check size={12} />
                  </span>
                ))}
              </div>
              {!live && <ProofChip>8:19 total</ProofChip>}
            </div>
          </div>
        </div>

        {/* grafik */}
        <Card className="px-6 py-6">
          <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-[18px] font-semibold">
                Verified health history
              </h2>
              <p className="text-[12.5px] text-ink-3">
                Every point is an on-chain proof
              </p>
            </div>
            <span className="rounded-full bg-surface-2 px-4 py-2 text-[12.5px] text-ink-2">
              {proofsLoading && live
                ? "Loading proofs…"
                : `Range: ${chartPoints.length} snapshot${chartPoints.length === 1 ? "" : "s"}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <HealthChart points={chartPoints} />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-5 text-[12px] text-ink-2">
            <Legend color="bg-coral" label="Health factor" />
            <Legend color="bg-periwinkle" label="Debt trend" />
            <span className="ml-auto text-right">
              <span className="tnum block font-display text-[26px] font-semibold">
                {Number.isFinite(snapshot.healthFactor)
                  ? snapshot.healthFactor.toFixed(2)
                  : "∞"}
              </span>
              <span className="text-[11.5px] text-ink-3">Latest verified HF</span>
            </span>
          </div>
        </Card>

        {/* Vault ditaruh di bawah grafik, bukan di rail: sebagai kartu sempit
            ia membuat rail kanan memanjang, sementara kolom kiri berhenti
            di grafik. Melebar tiga kolom, ruangnya terpakai. */}
        <Card className="grid grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[200px_minmax(0,1fr)_260px] md:items-center">
          <div>
            <h2 className="font-display text-[18px] font-semibold">Vault</h2>
            <p className="text-[12.5px] text-ink-3">Underwriter capital</p>
            <div className="tnum mt-3 font-display text-[30px] leading-none font-semibold">
              {formatCtc(vault.totalCapital, 0)}
              <span className="ml-1.5 text-[14px] font-medium text-ink-3">CTC</span>
            </div>
          </div>

          <div>
            <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-sunken">
              <i
                className="block h-full bg-accent"
                style={{ width: `${100 - freePct}%` }}
              />
              <i className="block h-full bg-safe" style={{ width: `${freePct}%` }} />
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-3">
              <VaultStat color="bg-accent" label="Locked to policies" value={vault.locked} />
              <VaultStat color="bg-safe" label="Free to underwrite" value={free} />
            </div>
          </div>

          <p className="rounded-2xl bg-safe-soft px-4 py-3.5 text-[11.5px] leading-relaxed text-safe">
            Solvency guard is on. Cover that exceeds free capital is refused — the
            contract cannot sell what it cannot pay.
          </p>
        </Card>
      </div>

      {/* ── rail kanan ── */}
      <aside className="flex min-w-0 flex-col gap-7 lg:border-l lg:border-line lg:pl-7">
        <section>
          <h2 className="mb-4 font-display text-[18px] font-semibold">Recent proofs</h2>
          {live ? (
            <LiveProofList proofs={proofs} loading={proofsLoading} />
          ) : (
            <SampleProofList />
          )}
          <a
            href="/proof"
            className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:underline"
          >
            See the full proof chain
            <ArrowUpRight />
          </a>
        </section>

        {live && (
          <section>
            <h2 className="mb-1 font-display text-[15px] font-semibold">Refresh position</h2>
            <p className="mb-3 text-[12.5px] text-ink-3">
              A probe emits your Aave numbers on Sepolia. Proving it here takes about
              8 minutes.
            </p>
            <ProbeButton onProbed={onRefetch} />
          </section>
        )}

        <section>
          <h2 className="font-display text-[18px] font-semibold">Position metrics</h2>
          <p className="mb-4 text-[12.5px] text-ink-3">
            Derived from the latest verified snapshot
          </p>

          <ul className="flex list-none flex-col gap-4 p-0">
            {metrics.map((m) => (
              <li key={m.label} className="flex items-center gap-3">
                <span className="w-[104px] shrink-0 text-[12.5px]">{m.label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                  <span
                    className="block h-full rounded-full bg-accent"
                    style={{ width: `${Math.round(m.pct)}%` }}
                  />
                </span>
                <span className="tnum w-9 shrink-0 text-right text-[12px] text-ink-2">
                  {Math.round(m.pct)}%
                </span>
                <span
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-white ${
                    m.up ? "bg-accent" : "bg-caution"
                  }`}
                >
                  <ArrowSmall up={m.up} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 font-display text-[15px] font-semibold">
            What cannot happen
          </h2>
          <ul className="flex list-none flex-col gap-3 p-0 text-[12px] leading-relaxed text-ink-2">
            <li>
              <b className="block text-[12.5px] font-semibold text-ink">No admin keys</b>
              No owner, no pause, no upgrade path — including for us.
            </li>
            <li>
              <b className="block text-[12.5px] font-semibold text-ink">
                No withdrawal for the team
              </b>
              Money leaves only via a proven payout or an underwriter reclaiming unlocked
              capital.
            </li>
            <li>
              <b className="block text-[12.5px] font-semibold text-ink">
                No price of our own
              </b>
              Health factor comes from Aave&apos;s own accounting, never recomputed here.
            </li>
          </ul>
        </section>

        <p className="rounded-2xl bg-surface-2 px-4 py-3.5 text-[11.5px] leading-relaxed text-ink-2">
          <b className="font-semibold text-ink">Snapshot, not a live feed.</b> These
          numbers were true at block {snapshot.sourceBlock.toLocaleString("en-US")}.
          Between probes your position is unknown to AniWere, and payouts do not depend on
          it.{" "}
          {policy
            ? `Cover runs to ${formatDate(policy.expiresAt, true)}.`
            : "You have no active cover."}
        </p>
      </aside>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Keadaan sebelum ada data
// ─────────────────────────────────────────────────────────────

function ConnectPrompt() {
  return (
    <Card className="mx-auto max-w-[520px] px-7 py-9 text-center">
      <h2 className="font-display text-[20px] font-semibold">Connect your wallet</h2>
      <p className="mx-auto mt-2 max-w-[42ch] text-[13px] text-ink-3">
        The contracts are live, so everything on this page comes from them. Connect to see
        your own verified position instead of someone else&apos;s numbers.
      </p>
      <div className="mt-5 flex justify-center">
        <ConnectButton />
      </div>
    </Card>
  );
}

function NoSnapshot({ loading, onProbed }: { loading: boolean; onProbed: () => void }) {
  return (
    <Card className="mx-auto max-w-[560px] px-7 py-9">
      <h2 className="text-center font-display text-[20px] font-semibold">
        {loading ? "Reading your position…" : "No verified snapshot yet"}
      </h2>
      <p className="mx-auto mt-2 max-w-[46ch] text-center text-[13px] text-ink-3">
        AniWere cannot see your Aave position until it has been emitted as an event on
        Sepolia and proved here. That is the whole point of the prober pattern — nobody,
        including us, gets to assert your numbers.
      </p>
      <div className="mt-5">
        <ProbeButton onProbed={onProbed} />
      </div>
    </Card>
  );
}

function LiveProofList({ proofs, loading }: { proofs: ProofEvent[]; loading: boolean }) {
  if (loading) {
    return <p className="py-3 text-[12.5px] text-ink-3">Reading proofs from Creditcoin…</p>;
  }
  if (proofs.length === 0) {
    return (
      <p className="py-3 text-[12.5px] text-ink-3">
        No proofs for this address yet. The first one appears here about 8 minutes after
        your first probe.
      </p>
    );
  }

  return (
    <ul className="list-none p-0">
      {[...proofs].reverse().map((p, i) => (
        <li
          key={p.txHash}
          className={`flex items-start gap-3 py-3.5 ${i === 0 ? "" : "border-t border-line"}`}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium">
              {p.kind === "claim" ? "Claim settled" : "Snapshot verified"}
            </div>
            <div className="truncate font-mono text-[11px] text-ink-3">
              source block {p.sourceBlock.toLocaleString("en-US")}
              {p.healthFactor !== null &&
                ` · HF ${Number.isFinite(p.healthFactor) ? p.healthFactor.toFixed(2) : "∞"}`}
              {p.payoutCtc !== null && ` · ${formatCtc(p.payoutCtc)} CTC`}
            </div>
          </div>
          <a
            href={creditcoinTxUrl(p.txHash)}
            target="_blank"
            rel="noreferrer"
            title="Open on Creditcoin explorer"
            className="mt-0.5 shrink-0 text-ink-3 hover:text-accent"
          >
            <ArrowUpRight />
          </a>
        </li>
      ))}
    </ul>
  );
}

function SampleProofList() {
  return (
    <ul className="list-none p-0">
      {snapshotProof.map((s, i) => (
        <li
          key={s.label}
          className={`flex items-start gap-3 py-3.5 ${i === 0 ? "" : "border-t border-line"}`}
        >
          <div className="w-[52px] shrink-0">
            <div className="font-mono text-[11px] text-ink-3">
              {Math.floor(s.atSeconds / 60)}:{String(s.atSeconds % 60).padStart(2, "0")}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium">{s.label}</div>
            <div className="truncate font-mono text-[11px] text-ink-3">{s.detail}</div>
          </div>
          <span className="mt-0.5 shrink-0 text-ink-3">
            <ArrowUpRight />
          </span>
        </li>
      ))}
    </ul>
  );
}

function MeshCard({
  variant,
  title,
  value,
  unit,
  caption,
  icon,
}: {
  variant: "warm" | "cool";
  title: string;
  value: string;
  unit?: string;
  caption: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={`flex min-h-[210px] flex-col rounded-3xl p-6 text-mesh-ink shadow-card ${
        variant === "warm" ? "mesh-warm" : "mesh-cool"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="font-display text-[15px] leading-snug font-semibold">
          {title}
        </span>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-mesh-chip text-mesh-ink">
          {icon}
        </span>
      </div>
      <div className="mt-auto">
        <div className="tnum font-display text-[44px] leading-none font-bold">
          {value}
          {unit && <span className="ml-1.5 text-[17px] font-semibold">{unit}</span>}
        </div>
        <div className="mt-1.5 text-[12.5px] text-mesh-ink-soft">{caption}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-3.5 py-2 text-[12px]">
      <span className="text-ink-3">{label}</span>
      <b className="tnum font-semibold">{value}</b>
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <i aria-hidden className={`h-2.5 w-2.5 rounded-sm ${color}`} />
      {label}
    </span>
  );
}

/** Label di atas, angka di bawah. Di kolom sempit ini terbaca jauh lebih
 *  baik daripada baris "label — spasi — angka" yang labelnya ikut wrap. */
function VaultStat({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[12px] whitespace-nowrap text-ink-3">
        <i aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-sm ${color}`} />
        {label}
      </div>
      <div className="tnum mt-1 font-display text-[18px] font-semibold">
        {formatCtc(value, 0)}
        <span className="ml-1 text-[12px] font-medium text-ink-3">CTC</span>
      </div>
    </div>
  );
}

function ArrowUpRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M3.5 8.5l5-5M4.2 3.5h4.3v4.3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowSmall({ up }: { up: boolean }) {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path
        d={up ? "M5 8V2M2.5 4.5L5 2l2.5 2.5" : "M5 2v6M2.5 5.5L5 8l2.5-2.5"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GaugeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3 13a6.5 6.5 0 1112 0"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M9 13L12 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M9 2l5 2.2v4.4C14 12 11.7 14.6 9 15.2 6.3 14.6 4 12 4 8.6V4.2L9 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M6.8 8.8l1.5 1.5 3-3.1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
