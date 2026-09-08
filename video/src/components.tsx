/**
 * Primitif visual video. Semuanya murni presentasi — tidak ada satu pun yang
 * tahu soal narasi atau urutan scene. Timing datang dari luar lewat props.
 */

import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import { C, EASE, GRADIENT } from "./theme";

/**
 * Weight dan subset dibatasi ke yang benar-benar dipakai. Tanpa ini
 * @remotion/google-fonts menarik puluhan file per font di tiap tab render,
 * dan itu terasa jelas di waktu render.
 */
export const poppins = loadPoppins("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
}).fontFamily;

export const mono = loadMono("normal", {
  weights: ["400", "600"],
  subsets: ["latin"],
  ignoreTooManyRequestsWarning: true,
}).fontFamily;

const ease = Easing.bezier(...EASE);

/** Fade-in + geser ke atas. Dipakai hampir semua elemen. */
export function rise(frame: number, delay = 0, distance = 28) {
  const p = interpolate(frame - delay, [0, 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` };
}

/**
 * Latar dasar tiap scene: ground gelap, dua pusaran cahaya redup, dan grain.
 *
 * Grain-nya penting. Gradien besar di area gelap gampang banding jadi pita
 * setelah dikompres YouTube; noise tipis memecah pita itu.
 */
export const Stage: React.FC<{
  children: React.ReactNode;
  glow?: boolean;
}> = ({ children, glow = true }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 40;

  return (
    <AbsoluteFill style={{ background: C.ground, fontFamily: poppins }}>
      {glow && (
        <AbsoluteFill
          style={{
            background: `
              radial-gradient(1100px 700px at ${18 + drift / 8}% 12%, rgba(91,141,239,0.16), transparent 62%),
              radial-gradient(900px 620px at ${86 - drift / 10}% 88%, rgba(47,191,162,0.10), transparent 60%)
            `,
          }}
        />
      )}

      {children}

      {/* Vignette: menahan mata di tengah frame. */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 85% at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.035,
          pointerEvents: "none",
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/></filter><rect width='140' height='140' filter='url(%23n)'/></svg>\")",
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Teks yang muncul kata per kata.
 *
 * `stagger` kecil (2–3 frame) terbaca sebagai satu kalimat yang "mendarat";
 * lebih dari 6 mulai terasa seperti karaoke.
 */
export const Kinetic: React.FC<{
  text: string;
  size?: number;
  weight?: number;
  color?: string;
  gradient?: boolean;
  delay?: number;
  stagger?: number;
  maxWidth?: number;
  align?: "left" | "center";
  lineHeight?: number;
}> = ({
  text,
  size = 96,
  weight = 600,
  color = C.ink,
  gradient = false,
  delay = 0,
  stagger = 3,
  maxWidth = 1500,
  align = "center",
  lineHeight = 1.08,
}) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: `${size * 0.06}px ${size * 0.26}px`,
        maxWidth,
        justifyContent: align === "center" ? "center" : "flex-start",
        fontSize: size,
        fontWeight: weight,
        letterSpacing: "-0.03em",
        lineHeight,
        textAlign: align,
      }}
    >
      {words.map((w, i) => {
        const s = rise(frame, delay + i * stagger, size * 0.3);
        return (
          <span
            key={`${w}-${i}`}
            style={{
              ...s,
              display: "inline-block",
              ...(gradient
                ? {
                    background: GRADIENT,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                  }
                : { color }),
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Label kecil huruf besar di atas headline. */
export const Eyebrow: React.FC<{ children: React.ReactNode; delay?: number; color?: string }> = ({
  children,
  delay = 0,
  color = C.accent,
}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...rise(frame, delay, 14),
        fontFamily: mono,
        fontSize: 24,
        letterSpacing: "0.34em",
        textTransform: "uppercase",
        color,
        marginBottom: 30,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Screenshot produk dengan dorongan kamera pelan (Ken Burns).
 *
 * `focus` menunjuk titik yang di-zoom dalam koordinat 0–1 relatif gambar, jadi
 * scene bisa menyorot kartu tertentu tanpa perlu meng-crop asetnya lebih dulu.
 * Aset di-capture 2×, jadi zoom sampai ~1.8 masih tajam.
 */
export const Shot: React.FC<{
  src: string;
  from?: number;
  to?: number;
  focus?: [number, number];
  delay?: number;
  radius?: number;
  duration?: number;
}> = ({ src, from = 1.02, to = 1.12, focus = [0.5, 0.28], delay = 0, radius = 22, duration }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const span = duration ?? durationInFrames;

  const scale = interpolate(frame - delay, [0, span], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.5, 1),
  });
  const enter = rise(frame, delay, 40);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        borderRadius: radius,
        border: `1px solid ${C.line}`,
        boxShadow: "0 60px 120px -40px rgba(0,0,0,0.85)",
        opacity: enter.opacity,
        transform: enter.transform,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{
          position: "absolute",
          width: "100%",
          left: 0,
          top: 0,
          transform: `scale(${scale})`,
          transformOrigin: `${focus[0] * 100}% ${focus[1] * 100}%`,
        }}
      />
    </div>
  );
};

/** Kartu kaca untuk menampung statistik atau langkah. */
export const Card: React.FC<{
  children: React.ReactNode;
  delay?: number;
  accent?: string;
  padding?: number;
}> = ({ children, delay = 0, accent, padding = 34 }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...rise(frame, delay, 26),
        background: "rgba(33,37,51,0.72)",
        border: `1px solid ${accent ?? C.line}`,
        borderRadius: 18,
        padding,
        backdropFilter: "blur(8px)",
        boxShadow: accent ? `0 0 44px -12px ${accent}66` : undefined,
      }}
    >
      {children}
    </div>
  );
};

/** Baris terminal yang "diketik" — dipakai untuk output forge test asli. */
export const Terminal: React.FC<{
  lines: string[];
  delay?: number;
  perLine?: number;
  highlight?: string;
  fontSize?: number;
}> = ({ lines, delay = 0, perLine = 4, highlight, fontSize = 25 }) => {
  const frame = useCurrentFrame();

  return (
    <Card delay={delay} padding={38}>
      <div style={{ display: "flex", gap: 9, marginBottom: 24 }}>
        {[C.coral, C.caution, C.safe].map((c) => (
          <div key={c} style={{ width: 13, height: 13, borderRadius: 99, background: c, opacity: 0.85 }} />
        ))}
        <div style={{ fontFamily: mono, fontSize: 17, color: C.ink3, marginLeft: 14 }}>forge test</div>
      </div>

      <div style={{ fontFamily: mono, fontSize, lineHeight: 1.62 }}>
        {lines.map((l, i) => {
          const shown = frame - delay - 14 - i * perLine > 0;
          const isHit = highlight && l.includes(highlight);
          const pass = l.startsWith("[PASS]");
          return (
            <div
              key={l + i}
              style={{
                opacity: shown ? 1 : 0,
                color: isHit ? C.safe : pass ? C.ink2 : C.ink,
                fontWeight: isHit ? 600 : 400,
                whiteSpace: "pre",
                transition: "none",
              }}
            >
              {pass ? (
                <>
                  <span style={{ color: C.safe }}>[PASS]</span>
                  {l.slice(6)}
                </>
              ) : (
                l
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

/** Garis horizontal bergradien yang tumbuh — pemisah antar bagian. */
export const Rule: React.FC<{ delay?: number; width?: number }> = ({ delay = 0, width = 520 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
  return (
    <div
      style={{
        width: width * p,
        height: 3,
        borderRadius: 99,
        background: GRADIENT,
        opacity: 0.9,
      }}
    />
  );
};
