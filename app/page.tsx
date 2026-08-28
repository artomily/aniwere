import {
  AAVE_POOL_SEPOLIA,
  formatCtc,
  formatDate,
  formatUsd,
  freeCapital,
  history,
  minutesAgo,
  policy,
  snapshot,
  snapshotProof,
  vault,
} from "@/lib/data";
import { HealthChart } from "./_components/HealthChart";
import { HealthGauge } from "./_components/HealthGauge";
import {
  BoltIcon,
  Card,
  CardHead,
  Check,
  Eyebrow,
  Fact,
  FactGrid,
  LockIcon,
  Note,
  NoExitIcon,
  ProofChip,
  ShieldCheck,
  ClockIcon,
} from "./_components/ui";

/** Waktu acuan demo. Diganti `new Date()` begitu data sudah dari chain. */
const NOW = new Date("2026-08-27T09:14:00Z");

export default function DashboardPage() {
  const ageMinutes = minutesAgo(snapshot.verifiedAt, NOW);
  const free = freeCapital(vault);
  const lockedPct = (vault.locked / vault.totalCapital) * 100;

  const totalDays = Math.round(
    (policy.expiresAt.getTime() - policy.startedAt.getTime()) / 86_400_000
  );
  const elapsedDays = Math.round(
    (NOW.getTime() - policy.startedAt.getTime()) / 86_400_000
  );
  const daysLeft = Math.max(0, totalDays - elapsedDays);

  return (
    <div className="grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[minmax(0,1.85fr)_minmax(300px,1fr)]">
      <div className="flex min-w-0 flex-col gap-[18px]">
        {/* ── posisi ── */}
        <Card className="px-[22px] py-5">
          <CardHead
            title="Your Aave V3 position"
            sub="Ethereum Sepolia"
            right={<ProofChip>block {snapshot.sourceBlock.toLocaleString("en-US")}</ProofChip>}
          />
          <p className="mt-0.5 mb-5 text-[12.5px] text-ink-3">
            Proven from an Ethereum event, verified on Creditcoin.
          </p>

          <div className="flex flex-col items-center gap-6 text-center md:flex-row md:items-center md:text-left">
            <HealthGauge hf={snapshot.healthFactor} />

            <FactGrid className="w-full flex-1">
              <Fact
                label="Collateral"
                value={`${snapshot.collateralEth.toFixed(2)} ETH`}
                note={`≈ ${formatUsd(snapshot.collateralUsd)}`}
              />
              <Fact label="Debt" value={formatCtc(snapshot.debtUsd)} note="USDC" />
              <Fact
                label="Liquidation at"
                value="HF < 1.00"
                note={`Threshold ${snapshot.liquidationThresholdPct}%`}
              />
              <Fact
                label="Last probe"
                value={`${ageMinutes} min`}
                note="ago · you can re-probe"
              />
            </FactGrid>
          </div>

          <Note>
            <b className="font-semibold text-ink">This is a snapshot, not a live feed.</b>{" "}
            These numbers were true at block{" "}
            {snapshot.sourceBlock.toLocaleString("en-US")}. Between probes your position
            is unknown to AniWere — that is a consequence of proving events rather than
            reading state, and payouts do not depend on it.
          </Note>
        </Card>

        {/* ── polis ── */}
        <Card className="px-[22px] py-5">
          <CardHead title="Active cover" sub={`Policy #${policy.id} · Creditcoin`} />

          <div className="mt-3.5 flex flex-wrap items-end justify-between gap-[18px]">
            <div>
              <div className="mb-1.5">
                <Eyebrow>Pays out</Eyebrow>
              </div>
              <div className="tnum font-display text-[34px] leading-none font-bold">
                {formatCtc(policy.coverAmount, 0)}
                <span className="ml-1 text-[15px] font-medium text-ink-3">CTC</span>
              </div>
            </div>

            <div className="min-w-[260px] flex-1">
              <FactGrid>
                <Fact
                  label="Premium paid"
                  value={formatCtc(policy.premiumPaid)}
                  note="CTC · 2% flat"
                />
                <Fact label="Bound to" value={policy.holder} note="Non-transferable" mono />
              </FactGrid>
            </div>
          </div>

          <div className="mt-4">
            <div
              className="h-[7px] overflow-hidden rounded-full border border-line bg-sunken"
              role="img"
              aria-label={`${daysLeft} of ${totalDays} days remaining`}
            >
              <div
                className="h-full rounded-full bg-proof"
                style={{ width: `${(elapsedDays / totalDays) * 100}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11.5px] text-ink-3">
              <span>Started {formatDate(policy.startedAt, true)}</span>
              <span>
                {daysLeft} of {totalDays} days left
              </span>
              <span>Expires {formatDate(policy.expiresAt)}</span>
            </div>
          </div>

          <p className="mt-4 flex gap-2.5 rounded-xl border border-dashed border-line-strong px-3.5 py-3 text-[12.5px] text-ink-2">
            <span className="mt-0.5 shrink-0 text-ink-3">
              <BoltIcon />
            </span>
            <span>
              <b className="font-semibold text-ink">Trigger.</b> A{" "}
              <code className="rounded bg-sunken px-1.5 py-px font-mono text-[11.5px] text-ink">
                LiquidationCall
              </code>{" "}
              event emitted by the Aave V3 Pool on Sepolia naming this address. No claim
              form, no assessor, no vote. The proof is the claim.
            </span>
          </p>
        </Card>

        {/* ── grafik ── */}
        <Card className="px-[22px] py-5">
          <CardHead
            title="Verified health history"
            sub="Every point is an on-chain proof"
          />
          <div className="mt-3 overflow-x-auto">
            <HealthChart />
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block h-0 w-3.5 border-t-2 border-proof" />
              {history.length} verified snapshots
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm bg-caution opacity-45" />
              Caution band
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm bg-critical opacity-45" />
              Liquidation zone
            </span>
          </div>
        </Card>
      </div>

      {/* ── rail kanan ── */}
      <aside className="flex min-w-0 flex-col gap-[18px]">
        <Card className="px-[22px] py-5">
          <CardHead title="Proof of this snapshot" />
          <p className="mt-0.5 text-[12.5px] text-ink-3">
            How block {snapshot.sourceBlock.toLocaleString("en-US")} got here.
          </p>

          <ol className="mt-3.5 list-none p-0">
            {snapshotProof.map((s, i) => (
              <li
                key={s.label}
                className="relative pl-[27px] pb-4 last:pb-0"
              >
                {i < snapshotProof.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-4 bottom-[-2px] left-[7px] w-[1.5px] bg-line-strong"
                  />
                )}
                <span className="absolute top-0.5 left-0 grid h-4 w-4 place-items-center rounded-full bg-proof text-surface">
                  <Check size={9} />
                </span>
                <div className="flex items-baseline justify-between gap-2 text-[12.5px] font-semibold">
                  <span>{s.label}</span>
                  <em className="font-mono text-[10.5px] font-medium not-italic text-ink-3">
                    {Math.floor(s.atSeconds / 60)}:
                    {String(s.atSeconds % 60).padStart(2, "0")}
                  </em>
                </div>
                <div className="mt-0.5 font-mono text-[11.5px] break-all text-ink-3">
                  {s.detail}
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="px-[22px] py-5">
          <CardHead title="Vault" right={<span className="text-[12.5px] text-ink-3">Underwriter capital</span>} />

          <div className="my-3.5 flex h-[11px] overflow-hidden rounded-full border border-line bg-sunken">
            <i className="block h-full bg-proof" style={{ width: `${lockedPct}%` }} />
            <i
              className="block h-full bg-safe opacity-45"
              style={{ width: `${100 - lockedPct}%` }}
            />
          </div>

          <VaultRow color="bg-proof" label="Locked to policies" value={vault.locked} />
          <VaultRow color="bg-safe opacity-45" label="Free to underwrite" value={free} />
          <div className="mt-1 flex items-center gap-2.5 border-t border-line pt-2.5 text-[12.5px]">
            Total capital
            <b className="tnum ml-auto font-display font-semibold">
              {formatCtc(vault.totalCapital, 0)} CTC
            </b>
          </div>

          <p className="mt-3 flex gap-2 rounded-xl bg-safe-wash px-3.5 py-3 text-[12px] leading-relaxed text-safe">
            <span className="mt-px shrink-0">
              <ShieldCheck />
            </span>
            <span>
              Solvency guard is on. New cover is refused the moment it would exceed free
              capital — the contract cannot sell what it cannot pay.
            </span>
          </p>
        </Card>

        <Card className="px-[22px] py-5">
          <CardHead title="What cannot happen" />
          <ul className="mt-3 flex list-none flex-col gap-2.5 p-0">
            <Guarantee icon={<LockIcon />} title="No admin keys">
              There is no owner, no pause, no upgrade path. Nobody can freeze your policy
              — including us.
            </Guarantee>
            <Guarantee icon={<NoExitIcon />} title="No withdrawal for the team">
              Money leaves the vault two ways only: a payout backed by a valid proof, or
              an underwriter reclaiming unlocked capital.
            </Guarantee>
            <Guarantee icon={<ClockIcon size={14} />} title="No price of our own">
              Health factor comes from Aave&apos;s own accounting at{" "}
              <span className="font-mono text-[11.5px]">
                {AAVE_POOL_SEPOLIA.slice(0, 8)}…{AAVE_POOL_SEPOLIA.slice(-6)}
              </span>
              . AniWere never re-prices your collateral.
            </Guarantee>
          </ul>
        </Card>
      </aside>
    </div>
  );
}

function VaultRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 text-[12.5px]">
      <i aria-hidden className={`inline-block h-2.5 w-2.5 rounded-sm ${color}`} />
      {label}
      <b className="tnum ml-auto font-display font-semibold">{formatCtc(value, 0)} CTC</b>
    </div>
  );
}

function Guarantee({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-2">
      <span className="mt-0.5 shrink-0 text-proof">{icon}</span>
      <span>
        <b className="block text-[13px] font-semibold text-ink">{title}</b>
        {children}
      </span>
    </li>
  );
}
