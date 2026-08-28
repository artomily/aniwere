import { AAVE_POOL_SEPOLIA, WALLET } from "@/lib/data";
import { Card, CardHead, Check, ClockIcon, Eyebrow } from "../_components/ui";

type Row = { k: string; v: string };

const STEPS: {
  n: number;
  title: string;
  status: string;
  verified: boolean;
  rows: Row[];
  foot?: string;
  highlight?: boolean;
}[] = [
  {
    n: 1,
    title: "Source event",
    status: "Ethereum Sepolia",
    verified: false,
    rows: [
      { k: "Event", v: "LiquidationCall" },
      { k: "Emitter", v: `${AAVE_POOL_SEPOLIA.slice(0, 8)}…${AAVE_POOL_SEPOLIA.slice(-6)}` },
      { k: "User", v: WALLET },
      { k: "Tx", v: "0x9d14fe…8b02" },
    ],
  },
  {
    n: 2,
    title: "Emitter check",
    status: "match",
    verified: true,
    rows: [
      { k: "Expected", v: `${AAVE_POOL_SEPOLIA.slice(0, 8)}…${AAVE_POOL_SEPOLIA.slice(-6)}` },
      { k: "topic0", v: "0xe413a321…f0a7c1" },
      { k: "Result", v: "emitter + topic0 both matched" },
    ],
    foot: "Without this check, anyone could deploy a fake contract on Sepolia and drain the vault.",
  },
  {
    n: 3,
    title: "Attestation",
    status: "attested",
    verified: true,
    rows: [
      { k: "Chain key", v: "1 (Sepolia)" },
      { k: "Source block", v: "11,576,800" },
      { k: "Attested height", v: "11,576,870" },
    ],
  },
  {
    n: 4,
    title: "Continuity proof",
    status: "valid",
    verified: true,
    rows: [
      { k: "Lower endpoint", v: "0xc857012a…909fff" },
      { k: "Roots", v: "1" },
    ],
  },
  {
    n: 5,
    title: "Merkle proof",
    status: "valid",
    verified: true,
    rows: [
      { k: "Root", v: "0x7b6659cd…64165a" },
      { k: "Siblings", v: "8" },
      { k: "Tx index", v: "0" },
    ],
  },
  {
    n: 6,
    title: "Payout",
    status: "settled",
    verified: true,
    highlight: true,
    rows: [
      { k: "Amount", v: "2,500.00 CTC" },
      { k: "To", v: WALLET },
      { k: "Creditcoin tx", v: "0x4f0ab3…77de" },
    ],
  },
];

export default function ProofPage() {
  return (
    <Card className="px-[22px] py-5">
      <CardHead
        title="Proof explorer"
        sub="Claim payout · policy #0042"
        right={
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-proof-wash px-2.5 py-1 font-mono text-[11px] font-medium text-proof">
            verified · payout released
          </span>
        }
      />
      <p className="mt-1 max-w-[66ch] text-[12.5px] text-ink-3">
        An Aave liquidation on Ethereum paid out on Creditcoin without anyone approving
        it. Every link below is independently checkable — follow them and you never have
        to trust us.
      </p>

      <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-3.5">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className={`rounded-xl border px-4 py-[15px] ${
              s.highlight
                ? "border-proof bg-proof-wash"
                : "border-line bg-surface-2"
            }`}
          >
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <span
                className={
                  s.highlight
                    ? "text-[10.5px] font-semibold tracking-[0.09em] text-proof uppercase"
                    : ""
                }
              >
                {s.highlight ? (
                  `${s.n} · ${s.title}`
                ) : (
                  <Eyebrow>
                    {s.n} · {s.title}
                  </Eyebrow>
                )}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                  s.highlight ? "text-proof" : s.verified ? "text-safe" : "text-ink-3"
                }`}
              >
                {s.verified && !s.highlight && <Check />}
                {s.status}
              </span>
            </div>

            <dl className="m-0">
              {s.rows.map((r, i) => (
                <div
                  key={r.k}
                  className={`flex justify-between gap-3 py-1.5 text-[12px] ${
                    i === 0
                      ? ""
                      : s.highlight
                        ? "border-t border-line-strong"
                        : "border-t border-line"
                  }`}
                >
                  <dt className="shrink-0 text-ink-3">{r.k}</dt>
                  <dd className="m-0 text-right font-mono text-[11.5px] break-all">
                    {r.v}
                  </dd>
                </div>
              ))}
            </dl>

            {s.foot && (
              <p className="mt-2.5 text-[11.5px] text-ink-3">{s.foot}</p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-[18px] flex items-start gap-2.5 rounded-xl bg-proof-wash px-4 py-3.5 text-[12.5px] leading-relaxed text-proof">
        <span className="mt-px shrink-0">
          <ClockIcon size={15} />
        </span>
        <span className="flex-1">
          <b className="font-semibold">8 minutes 19 seconds</b> from the liquidation on
          Ethereum to CTC arriving in the holder&apos;s wallet. Verification and payout
          happen inside a single Creditcoin transaction — the proof is checked and the
          money moves together, or neither happens.
        </span>
      </p>
    </Card>
  );
}
