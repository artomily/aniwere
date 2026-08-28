import { riskOf } from "@/lib/data";
import { StatePill } from "./ui";

const R = 70;
const CIRC = 2 * Math.PI * R;

/** Bagian lingkaran yang dipakai sebagai skala, sisanya dibiarkan kosong. */
const SWEEP = 0.75;
/** HF di atas ini dianggap mentok skala. Di atas 2.5 bedanya tidak berarti bagi user. */
const HF_MAX = 2.5;

function arc(fromHf: number, toHf: number) {
  const clamp = (v: number) => Math.min(Math.max(v / HF_MAX, 0), 1);
  const start = clamp(fromHf);
  const end = clamp(toHf);
  const len = (end - start) * SWEEP * CIRC;
  return {
    strokeDasharray: `${len} ${CIRC}`,
    strokeDashoffset: -(start * SWEEP * CIRC),
  };
}

export function HealthGauge({ hf }: { hf: number }) {
  const risk = riskOf(hf);
  const stroke = `var(--${risk})`;
  const label = { safe: "Healthy", caution: "Watch closely", critical: "At risk" }[risk];

  return (
    <figure className="relative m-0 h-[168px] w-[168px] shrink-0">
      <svg viewBox="0 0 168 168" width="168" height="168" aria-hidden>
        <g transform="rotate(135 84 84)">
          <circle
            cx="84"
            cy="84"
            r={R}
            fill="none"
            stroke="var(--sunken)"
            strokeWidth="13"
            {...arc(0, HF_MAX)}
          />
          {/* Pita risiko: batas 1.0 dan 1.35 sama dengan yang dipakai riskOf(). */}
          <circle
            cx="84"
            cy="84"
            r={R}
            fill="none"
            stroke="var(--critical)"
            strokeWidth="13"
            opacity="0.3"
            {...arc(0, 1.1)}
          />
          <circle
            cx="84"
            cy="84"
            r={R}
            fill="none"
            stroke="var(--caution)"
            strokeWidth="13"
            opacity="0.3"
            {...arc(1.1, 1.35)}
          />
          <circle
            cx="84"
            cy="84"
            r={R}
            fill="none"
            stroke={stroke}
            strokeWidth="13"
            strokeLinecap="round"
            {...arc(0, hf)}
          />
        </g>
      </svg>

      <figcaption className="absolute inset-0 flex flex-col items-center justify-center gap-px text-center">
        <span className="tnum font-display text-[44px] leading-none font-bold">
          {hf.toFixed(2)}
        </span>
        <span className="text-[10.5px] font-semibold tracking-[0.09em] text-ink-3 uppercase">
          Health factor
        </span>
        <StatePill risk={risk}>{label}</StatePill>
      </figcaption>
    </figure>
  );
}
