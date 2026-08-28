import { riskOf } from "@/lib/data";

const R = 62;
const CIRC = 2 * Math.PI * R;
/** HF 2.0 dianggap penuh. Di atas itu bedanya tidak berarti bagi user. */
const HF_FULL = 2;

/**
 * Cincin di sekeliling angka, sepadan dengan ring pada avatar di referensi.
 * Panjang busur menyatakan jarak ke likuidasi, warnanya menyatakan tingkat risiko.
 */
export function HealthRing({ hf }: { hf: number }) {
  const risk = riskOf(hf);
  const label = { safe: "Healthy", caution: "Watch closely", critical: "At risk" }[risk];
  /* Ditulis lengkap, bukan dirangkai. Tailwind memindai teks sumber,
     jadi class yang dibentuk dinamis tidak akan pernah ikut ter-generate. */
  const pillTone = {
    safe: "bg-safe-soft text-safe",
    caution: "bg-caution-soft text-caution",
    critical: "bg-critical-soft text-critical",
  }[risk];
  const pct = Math.min(Math.max(hf / HF_FULL, 0), 1);

  return (
    <figure className="relative m-0 h-[150px] w-[150px]">
      <svg viewBox="0 0 150 150" width="150" height="150" aria-hidden>
        <circle cx="75" cy="75" r={R} fill="none" stroke="var(--sunken)" strokeWidth="8" />
        <circle
          cx="75"
          cy="75"
          r={R}
          fill="none"
          stroke={`var(--${risk})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${pct * CIRC} ${CIRC}`}
          transform="rotate(-90 75 75)"
        />
      </svg>

      <figcaption className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className="tnum font-display text-[38px] leading-none font-bold">
          {hf.toFixed(2)}
        </span>
        <span className="text-[10px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
          Health factor
        </span>
        <span
          className={`mt-1 rounded-full px-2.5 py-[3px] text-[10.5px] font-semibold ${pillTone}`}
        >
          {label}
        </span>
      </figcaption>
    </figure>
  );
}
