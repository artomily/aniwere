/**
 * Scene-scene video. Tiap komponen mengisi satu potongan waktu penuh dan tidak
 * tahu kapan dirinya dimulai — `useCurrentFrame()` di dalam Sequence sudah
 * relatif terhadap awal scene itu sendiri.
 *
 * Durasi tiap scene dihitung dari panjang audio narasinya di `Video.tsx`, jadi
 * angka delay di sini selalu relatif terhadap awal scene, bukan absolut.
 */

import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, EASE, GRADIENT } from "./theme";
import { Card, Eyebrow, Kinetic, mono, poppins, rise, Rule, Shot, Terminal } from "./components";

const ease = Easing.bezier(...EASE);

const center: React.CSSProperties = {
  justifyContent: "center",
  alignItems: "center",
  padding: 110,
};

/* ── 1 · Hook ─────────────────────────────────────────────────────────── */

export const Hook: React.FC<{ second: number }> = ({ second }) => {
  const frame = useCurrentFrame();
  const out = interpolate(frame, [second - 20, second + 26], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column" }}>
      <div style={{ opacity: 1 - out, position: "absolute", textAlign: "center" }}>
        <Eyebrow delay={6}>Parametric liquidation cover</Eyebrow>
        <Kinetic text="Your lending position lives on Ethereum." size={104} delay={14} />
      </div>

      <div style={{ opacity: out, position: "absolute", textAlign: "center" }}>
        <Kinetic
          text="Your protection does not have to move."
          size={104}
          delay={second - 12}
          gradient
        />
      </div>
    </AbsoluteFill>
  );
};

/* ── 2 · Masalah ──────────────────────────────────────────────────────── */

const COSTS = [
  { title: "A committee", body: "decides whether you get paid" },
  { title: "An oracle", body: "you simply have to believe" },
  { title: "A bridge", body: "you have to move your assets across" },
];

export const Problem: React.FC<{ strikeAt: number }> = ({ strikeAt }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 66 }}>
      <div style={{ textAlign: "center" }}>
        <Eyebrow delay={4} color={C.coral}>
          Today
        </Eyebrow>
        <Kinetic text="Cover always costs you trust." size={82} delay={8} />
      </div>

      <div style={{ display: "flex", gap: 30 }}>
        {COSTS.map((c, i) => {
          const delay = strikeAt + i * 16;
          const struck = interpolate(frame - delay, [0, 26], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          });
          return (
            <div key={c.title} style={{ width: 400, position: "relative" }}>
              <Card delay={44 + i * 12} padding={38}>
                <div
                  style={{
                    fontSize: 40,
                    fontWeight: 600,
                    color: C.ink,
                    letterSpacing: "-0.02em",
                    marginBottom: 12,
                  }}
                >
                  {c.title}
                </div>
                <div style={{ fontSize: 25, color: C.ink2, lineHeight: 1.45 }}>{c.body}</div>
              </Card>

              {/* Coretan: dijalankan saat narasi menyebut ketiganya dibuang. */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 22,
                  height: 4,
                  borderRadius: 99,
                  background: C.coral,
                  width: `calc((100% - 44px) * ${struck})`,
                  boxShadow: `0 0 22px ${C.coral}`,
                }}
              />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ── 3 · Titik balik ──────────────────────────────────────────────────── */

export const Turn: React.FC<{ second: number }> = ({ second }) => {
  const frame = useCurrentFrame();
  const swap = interpolate(frame, [second - 18, second + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column" }}>
      <div style={{ opacity: 1 - swap, position: "absolute", textAlign: "center" }}>
        <Kinetic text="AniWere removes all three." size={104} delay={8} gradient />
      </div>

      <div
        style={{
          opacity: swap,
          position: "absolute",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 34,
        }}
      >
        <Kinetic text="Nobody approves your claim." size={72} delay={second - 14} color={C.ink2} />
        <Kinetic
          text="The claim proves itself."
          size={104}
          delay={second + 4}
          gradient
        />
      </div>
    </AbsoluteFill>
  );
};

/* ── 4 · Kendala inti: event, bukan storage ───────────────────────────── */

export const Constraint: React.FC = () => {
  const frame = useCurrentFrame();

  const Row: React.FC<{ label: string; ok: boolean; delay: number }> = ({ label, ok, delay }) => (
    <div
      style={{
        ...rise(frame, delay, 22),
        display: "flex",
        alignItems: "center",
        gap: 26,
        padding: "26px 38px",
        borderRadius: 16,
        border: `1px solid ${ok ? `${C.safe}55` : `${C.coral}44`}`,
        background: ok ? `${C.safe}12` : `${C.coral}0d`,
        width: 700,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 99,
          display: "grid",
          placeItems: "center",
          background: ok ? C.safe : C.coral,
          color: C.ground,
          fontSize: 27,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {ok ? "✓" : "✕"}
      </div>
      <div style={{ fontSize: 34, fontWeight: 500, color: C.ink, letterSpacing: "-0.01em" }}>
        {label}
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 46 }}>
      <div style={{ textAlign: "center" }}>
        <Eyebrow delay={2}>The constraint that shaped everything</Eyebrow>
        <Kinetic text="Attestcoin proves events." size={78} delay={6} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Row label="Events in receipt logs" ok delay={46} />
        <Row label="Storage slots" ok={false} delay={62} />
      </div>

      <div style={{ ...rise(frame, 96, 20), maxWidth: 1080, textAlign: "center" }}>
        <div style={{ fontSize: 31, color: C.ink2, lineHeight: 1.5 }}>
          Aave keeps position health in <b style={{ color: C.coral }}>storage</b>. So we do not read
          it — <b style={{ color: C.ink }}>we make Aave emit it.</b>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ── 5 · Prober pattern ───────────────────────────────────────────────── */

const FLOW = [
  { k: "AniWereProbe", s: "calls Aave on Ethereum", c: C.accent },
  { k: "PositionProbedForCover", s: "the event we prove", c: C.periwinkle },
  { k: "AniWereASC", s: "verified on Creditcoin", c: C.safe },
];

export const Prober: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 56 }}>
      <Kinetic text="The prober pattern" size={72} delay={4} />

      <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
        {FLOW.map((f, i) => (
          <React.Fragment key={f.k}>
            <div style={{ ...rise(frame, 30 + i * 22, 26), width: 420 }}>
              <Card delay={30 + i * 22} accent={f.c} padding={34}>
                <div
                  style={{
                    fontFamily: mono,
                    fontSize: 26,
                    color: f.c,
                    marginBottom: 12,
                    letterSpacing: "-0.01em",
                    wordBreak: "break-word",
                  }}
                >
                  {f.k}
                </div>
                <div style={{ fontSize: 24, color: C.ink2 }}>{f.s}</div>
              </Card>
            </div>
            {i < FLOW.length - 1 && (
              <div
                style={{
                  ...rise(frame, 44 + i * 22, 0),
                  fontSize: 42,
                  color: C.ink3,
                  flexShrink: 0,
                }}
              >
                →
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div style={{ ...rise(frame, 104, 18), textAlign: "center", maxWidth: 1120 }}>
        <div style={{ fontSize: 31, color: C.ink2, lineHeight: 1.5 }}>
          The health factor that reaches Creditcoin is{" "}
          <b style={{ color: C.ink }}>Aave&rsquo;s own number</b>, unmodified. We never recompute it
          from a price source of our own.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ── 6 · Produk ───────────────────────────────────────────────────────── */

export const Product: React.FC<{ shot: string; focus: [number, number]; caption: string; note?: string }> = ({
  shot,
  focus,
  caption,
  note,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ padding: 88, flexDirection: "row", gap: 62, alignItems: "center" }}>
      <div style={{ width: 620, flexShrink: 0 }}>
        <Kinetic text={caption} size={64} delay={6} align="left" maxWidth={620} />
        {note && (
          <div style={{ ...rise(frame, 40, 18), marginTop: 30 }}>
            <Rule delay={40} width={280} />
            <div style={{ fontSize: 28, color: C.ink2, lineHeight: 1.5, marginTop: 26 }}>{note}</div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, height: 820 }}>
        <Shot src={shot} focus={focus} from={1.08} to={1.24} delay={10} />
      </div>
    </AbsoluteFill>
  );
};

/* ── 7 · Rantai bukti ─────────────────────────────────────────────────── */

const STEPS = [
  "Source event",
  "Emitter check",
  "Attestation",
  "Continuity proof",
  "Merkle proof",
  "Payout",
];

export const ProofChain: React.FC<{ stepAt: number; stepEvery: number }> = ({
  stepAt,
  stepEvery,
}) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 64 }}>
      <div style={{ textAlign: "center" }}>
        <Eyebrow delay={4}>Aave emits · we prove</Eyebrow>
        <Kinetic text="Six links carry it home." size={78} delay={8} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {STEPS.map((s, i) => {
          const d = stepAt + i * stepEvery;
          const on = interpolate(frame - d, [0, 14], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: ease,
          });
          const last = i === STEPS.length - 1;
          return (
            <React.Fragment key={s}>
              <div style={{ textAlign: "center", width: 210 }}>
                <div
                  style={{
                    width: 76,
                    height: 76,
                    margin: "0 auto 20px",
                    borderRadius: 99,
                    display: "grid",
                    placeItems: "center",
                    background: last ? C.safe : `${C.accent}`,
                    opacity: 0.25 + on * 0.75,
                    transform: `scale(${0.82 + on * 0.18})`,
                    boxShadow: on > 0.5 ? `0 0 40px -6px ${last ? C.safe : C.accent}` : undefined,
                    color: C.ground,
                    fontSize: 30,
                    fontWeight: 700,
                  }}
                >
                  {on > 0.5 ? "✓" : i + 1}
                </div>
                <div
                  style={{
                    fontSize: 23,
                    color: on > 0.5 ? C.ink : C.ink3,
                    fontWeight: on > 0.5 ? 600 : 400,
                    lineHeight: 1.3,
                  }}
                >
                  {s}
                </div>
              </div>
              {!last && (
                <div
                  style={{
                    width: 46,
                    height: 3,
                    marginBottom: 44,
                    borderRadius: 99,
                    background: C.line,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: GRADIENT,
                      transform: `scaleX(${interpolate(frame - d - 8, [0, 12], [0, 1], {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      })})`,
                      transformOrigin: "left",
                    }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ ...rise(frame, stepAt + 6 * stepEvery + 16, 20), textAlign: "center" }}>
        <div style={{ fontSize: 33, color: C.ink2 }}>
          Verified and paid inside{" "}
          <b style={{ color: C.ink }}>a single Creditcoin transaction.</b>
        </div>
        <div style={{ fontSize: 27, color: C.ink3, marginTop: 14 }}>
          Either both happen, or neither does.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ── 8 · Cek emitter + test ───────────────────────────────────────────── */

export const EmitterCheck: React.FC<{ forge: string[] }> = ({ forge }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ padding: 96, flexDirection: "row", gap: 70, alignItems: "center" }}>
      <div style={{ width: 700, flexShrink: 0 }}>
        <Eyebrow delay={4} color={C.coral}>
          The check that guards the vault
        </Eyebrow>
        <Kinetic
          text="Emitter and topic0. Both, or nothing."
          size={62}
          delay={8}
          align="left"
          maxWidth={700}
        />
        <div style={{ ...rise(frame, 52, 18), marginTop: 34 }}>
          <div style={{ fontSize: 29, color: C.ink2, lineHeight: 1.52 }}>
            Without it, anyone could deploy a look-alike contract on Ethereum, emit a fake
            liquidation, and drain the vault with a{" "}
            <b style={{ color: C.coral }}>technically valid proof</b>.
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <Terminal
          lines={forge}
          delay={64}
          perLine={3}
          highlight="RejectsLiquidationFromWrongEmitter"
          fontSize={23}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ── 9 · Tidak ada admin ──────────────────────────────────────────────── */

const CANNOT = ["No owner", "No pause", "No upgrade path", "No withdrawal for us"];

export const NoAdmin: React.FC<{ closeAt: number }> = ({ closeAt }) => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 58 }}>
      <Eyebrow delay={2}>What cannot happen</Eyebrow>

      <div style={{ display: "flex", gap: 22 }}>
        {CANNOT.map((c, i) => (
          <div key={c} style={{ ...rise(frame, 12 + i * 13, 26) }}>
            <div
              style={{
                padding: "34px 40px",
                borderRadius: 16,
                border: `1px solid ${C.line}`,
                background: "rgba(33,37,51,0.6)",
                fontSize: 34,
                fontWeight: 600,
                color: C.ink,
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
              }}
            >
              {c}
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...rise(frame, closeAt, 24), textAlign: "center", maxWidth: 1240 }}>
        <div style={{ fontSize: 46, fontWeight: 600, color: C.ink, letterSpacing: "-0.02em", lineHeight: 1.3 }}>
          We cannot stop a valid payout.
          <br />
          And we cannot take the capital.
        </div>
        <div style={{ fontSize: 26, color: C.ink3, marginTop: 26, fontFamily: mono }}>
          CoverVault is deployed by the contract itself, inside its constructor.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ── 10 · Keterbatasan jujur ──────────────────────────────────────────── */

export const Honest: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 52 }}>
      <Eyebrow delay={2} color={C.caution}>
        Said out loud, not buried
      </Eyebrow>

      <div style={{ display: "flex", alignItems: "baseline", gap: 22, ...rise(frame, 14, 30) }}>
        <div
          style={{
            fontSize: 210,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            background: GRADIENT,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            lineHeight: 1,
          }}
        >
          ~8
        </div>
        <div style={{ fontSize: 58, fontWeight: 500, color: C.ink2, letterSpacing: "-0.02em" }}>
          minutes
        </div>
      </div>

      <div style={{ ...rise(frame, 44, 20), textAlign: "center", maxWidth: 1180 }}>
        <div style={{ fontSize: 32, color: C.ink2, lineHeight: 1.5 }}>
          End to end, from the liquidation on Ethereum to CTC in the holder&rsquo;s wallet.
        </div>
        <div style={{ fontSize: 32, color: C.ink, lineHeight: 1.5, marginTop: 18, fontWeight: 500 }}>
          We never call it real time.
        </div>
      </div>

      <div style={{ ...rise(frame, 74, 18), marginTop: 8 }}>
        <div
          style={{
            fontFamily: mono,
            fontSize: 24,
            color: C.ink3,
            padding: "20px 30px",
            border: `1px solid ${C.line}`,
            borderRadius: 14,
            maxWidth: 1080,
            textAlign: "center",
            lineHeight: 1.5,
          }}
        >
          Attestation runs ahead of Ethereum&rsquo;s finalized checkpoint — measured 25 to 54 blocks
          ahead, three times. A reorg is a real residual risk, and it belongs in the limitations.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ── 11 · Penutup ─────────────────────────────────────────────────────── */

export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const mark = interpolate(frame, [0, 30], [0.86, 1], {
    extrapolateRight: "clamp",
    easing: ease,
  });

  return (
    <AbsoluteFill style={{ ...center, flexDirection: "column", gap: 44 }}>
      <Img
        src={staticFile("shots/mark.png")}
        style={{
          ...rise(frame, 0, 20),
          width: 170,
          height: 170,
          transform: `scale(${mark})`,
          filter: `drop-shadow(0 0 48px ${C.accent}88)`,
        }}
      />

      <div style={{ ...rise(frame, 14, 26), textAlign: "center" }}>
        <div style={{ fontSize: 116, fontWeight: 700, letterSpacing: "-0.04em", color: C.ink }}>
          AniWere
        </div>
      </div>

      <div style={{ ...rise(frame, 34, 22), textAlign: "center" }}>
        <div style={{ fontSize: 42, color: C.ink2, letterSpacing: "-0.02em", lineHeight: 1.4 }}>
          Your position lives anywhere.
          <br />
          <b style={{ color: C.ink }}>Your protection lives here.</b>
        </div>
      </div>

      <div style={{ ...rise(frame, 62, 16), marginTop: 26 }}>
        <div style={{ fontFamily: mono, fontSize: 24, color: C.ink3, letterSpacing: "0.08em" }}>
          Built on Attestcoin Protocol · BUIDL CTC 2026 Fall
        </div>
      </div>
    </AbsoluteFill>
  );
};
