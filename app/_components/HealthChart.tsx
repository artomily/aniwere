import { history as sampleHistory } from "@/lib/data";

export type ChartPoint = {
  date: string;
  hf: number;
  debtUsd: number;
  block: number;
};

const W = 760;
const H = 260;
const PAD = { top: 34, right: 20, bottom: 30, left: 20 };

const x = (i: number, n: number) =>
  PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right);

/** Setiap seri diskalakan ke rentangnya sendiri, seperti grafik dua garis di referensi. */
function scaler(values: number[]) {
  // Posisi tanpa hutang punya HF tak hingga. Dijepit supaya satu titik
  // seperti itu tidak meratakan seluruh sisa grafik.
  const finite = values.map((v) => (Number.isFinite(v) ? v : 10));
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const span = max - min || 1;
  return (v: number) => {
    const t = ((Number.isFinite(v) ? v : 10) - min) / span;
    // Disisakan 12% di atas dan bawah supaya puncaknya tidak menempel tepi.
    return H - PAD.bottom - (0.12 + t * 0.76) * (H - PAD.top - PAD.bottom);
  };
}

/**
 * Catmull-Rom yang diubah jadi bezier. Tension ditahan supaya kurvanya
 * tidak melambung melewati titik data — grafik risiko tidak boleh
 * menggambar nilai yang tidak pernah terjadi.
 */
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  const t = 0.18;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function HealthChart({ points = sampleHistory }: { points?: ChartPoint[] }) {
  const history = points;
  const n = history.length;

  // Dua titik adalah minimum untuk sebuah garis. Di bawah itu jangan
  // menggambar apa pun: satu proof yang dirender sebagai grafik datar
  // terlihat seperti riwayat, padahal ia satu titik.
  if (n < 2) {
    return (
      <div className="grid h-[200px] place-items-center rounded-2xl border border-dashed border-line-strong text-[12.5px] text-ink-3">
        {n === 0
          ? "No verified snapshots yet — run a probe to create the first one."
          : "One verified snapshot so far. The chart appears from the second proof onward."}
      </div>
    );
  }

  const yHf = scaler(history.map((h) => h.hf));
  const yDebt = scaler(history.map((h) => h.debtUsd));

  const hfPts = history.map((h, i) => ({ x: x(i, n), y: yHf(h.hf) }));
  const debtPts = history.map((h, i) => ({ x: x(i, n), y: yDebt(h.debtUsd) }));

  const last = history[n - 1];
  const lastPt = hfPts[n - 1]!;
  // Maksimal lima label supaya tidak bertumpuk di rentang yang pendek.
  const tickCount = Math.min(5, n);
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    Math.round((i * (n - 1)) / Math.max(1, tickCount - 1)),
  );

  /* Pil dijaga tetap di dalam viewBox. Titik terakhir ada di tepi kanan,
     jadi tanpa clamp separuh pilnya terpotong. */
  const PILL_W = 132;
  const pillX = Math.min(
    Math.max(lastPt.x - PILL_W / 2, PAD.left),
    W - PAD.right - PILL_W
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      role="img"
      aria-label={`Health factor across ${n} verified snapshots, from ${history[0]!.hf.toFixed(
        2,
      )} to ${last!.hf.toFixed(2)}, shown against the debt trend over the same snapshots.`}
    >
      <defs>
        {/* Pil melayang di atas kartu berwarna sama, jadi butuh bayangan
            supaya terbaca sebagai lapisan terpisah. */}
        <filter id="pillShadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="6"
            floodColor="#1a1d2e"
            floodOpacity="0.16"
          />
        </filter>
      </defs>

      <foreignObject
        x={PAD.left}
        y={PAD.top}
        width={W - PAD.left - PAD.right}
        height={H - PAD.top - PAD.bottom}
      >
        <div className="dotgrid h-full w-full opacity-60" />
      </foreignObject>

      <path
        d={smoothPath(debtPts)}
        fill="none"
        stroke="var(--periwinkle)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={smoothPath(hfPts)}
        fill="none"
        stroke="var(--coral)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <circle
        cx={lastPt.x}
        cy={lastPt.y}
        r="6"
        fill="var(--surface)"
        stroke="var(--coral)"
        strokeWidth="3"
      />

      {/* Pil melayang di titik terakhir, seperti tooltip "Week 8" di referensi. */}
      <g transform={`translate(${pillX}, ${Math.max(4, lastPt.y - 58)})`}>
        <rect
          width={PILL_W}
          height="44"
          rx="16"
          fill="var(--surface)"
          stroke="var(--line)"
          filter="url(#pillShadow)"
        />
        <text
          x={PILL_W / 2}
          y="19"
          textAnchor="middle"
          fontSize="12.5"
          fontFamily="var(--font-display)"
          fontWeight="600"
          fill="var(--ink)"
        >
          Latest snapshot
        </text>
        <text
          x={PILL_W / 2}
          y="34"
          textAnchor="middle"
          fontSize="11"
          fontFamily="var(--font-mono)"
          fill="var(--ink-3)"
        >
          HF {last!.hf.toFixed(2)} · block {last!.block.toLocaleString("en-US")}
        </text>
      </g>

      {ticks.map((i) => (
        <text
          key={i}
          x={x(i, n)}
          y={H - 8}
          fontSize="11"
          fontFamily="var(--font-mono)"
          fill="var(--ink-3)"
          textAnchor="middle"
        >
          {history[i]!.date}
        </text>
      ))}
    </svg>
  );
}
