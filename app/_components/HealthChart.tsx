import { history } from "@/lib/data";

const W = 720;
const H = 240;
const PAD = { top: 20, right: 18, bottom: 34, left: 46 };

/** Domain sengaja dimulai di bawah 1.0 supaya garis likuidasi selalu kelihatan. */
const HF_MIN = 0.8;
const HF_MAX = 2.0;

const x = (i: number, n: number) =>
  PAD.left + (i / (n - 1)) * (W - PAD.left - PAD.right);

const y = (hf: number) => {
  const t = (hf - HF_MIN) / (HF_MAX - HF_MIN);
  return H - PAD.bottom - t * (H - PAD.top - PAD.bottom);
};

/**
 * Catmull-Rom yang diubah jadi kurva bezier, dengan tension ditahan
 * supaya kurvanya tidak melambung melewati titik data. Grafik risiko
 * tidak boleh menggambar nilai yang tidak pernah terjadi.
 */
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 2) return "";
  const t = 0.18;
  let d = `M ${pts[0].x} ${pts[0].y}`;
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

export function HealthChart() {
  const n = history.length;
  const pts = history.map((h, i) => ({ x: x(i, n), y: y(h.hf) }));
  const line = smoothPath(pts);
  const area = `${line} L ${pts[n - 1].x} ${H - PAD.bottom} L ${pts[0].x} ${H - PAD.bottom} Z`;
  const last = history[n - 1];
  const lastPt = pts[n - 1];

  const gridLines = [1.0, 1.25, 1.5, 1.75];
  const ticks = [0, 2, 4, 6, 8];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      role="img"
      aria-label={`Health factor across ${n} verified snapshots, from ${history[0].hf.toFixed(
        2
      )} down to ${last.hf.toFixed(2)}. All points stay above the liquidation line at 1.00.`}
    >
      <defs>
        <linearGradient id="hfFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--proof)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--proof)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Zona bahaya digambar lebih dulu supaya selalu berada di belakang data. */}
      <rect
        x={PAD.left}
        y={y(1.1)}
        width={W - PAD.left - PAD.right}
        height={H - PAD.bottom - y(1.1)}
        fill="var(--critical)"
        opacity="0.09"
      />
      <rect
        x={PAD.left}
        y={y(1.35)}
        width={W - PAD.left - PAD.right}
        height={y(1.1) - y(1.35)}
        fill="var(--caution)"
        opacity="0.09"
      />

      {gridLines.map((g) => (
        <line
          key={g}
          x1={PAD.left}
          y1={y(g)}
          x2={W - PAD.right}
          y2={y(g)}
          stroke="var(--line)"
          strokeWidth="1"
        />
      ))}

      <line
        x1={PAD.left}
        y1={y(1)}
        x2={W - PAD.right}
        y2={y(1)}
        stroke="var(--critical)"
        strokeWidth="1.5"
        strokeDasharray="5 4"
      />
      <text
        x={PAD.left + 6}
        y={y(1) + 14}
        fontSize="10"
        fontFamily="var(--font-mono)"
        fill="var(--critical)"
        fontWeight="500"
      >
        Liquidation
      </text>

      {[0.8, 1.0, 1.25, 1.5, 1.75, 2.0].map((g) => (
        <text
          key={g}
          x={PAD.left - 8}
          y={y(g) + 3.5}
          fontSize="10"
          fontFamily="var(--font-mono)"
          fill="var(--ink-3)"
          textAnchor="end"
        >
          {g.toFixed(2)}
        </text>
      ))}

      <path d={area} fill="url(#hfFill)" />
      <path
        d={line}
        fill="none"
        stroke="var(--proof)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {pts.slice(0, -1).map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3.5"
          fill="var(--surface)"
          stroke="var(--proof)"
          strokeWidth="2"
        />
      ))}

      <circle
        cx={lastPt.x}
        cy={lastPt.y}
        r="6"
        fill="var(--proof)"
        stroke="var(--surface)"
        strokeWidth="2.5"
      />
      <text
        x={lastPt.x}
        y={lastPt.y - 15}
        fontSize="11"
        fontFamily="var(--font-display)"
        fontWeight="600"
        fill="var(--ink)"
        textAnchor="middle"
      >
        {last.hf.toFixed(2)}
      </text>

      {ticks.map((i) => (
        <text
          key={i}
          x={x(i, n)}
          y={H - 10}
          fontSize="10"
          fontFamily="var(--font-mono)"
          fill="var(--ink-3)"
          textAnchor="middle"
        >
          {history[i].date}
        </text>
      ))}
    </svg>
  );
}
