/**
 * Susunan video.
 *
 * Aturannya satu: **timing tidak pernah ditulis manual.** Panjang tiap scene
 * dihitung dari durasi audio narasinya di `narration.json`, yang diukur dengan
 * ffprobe setelah `say` selesai. Konsekuensinya, mengubah kalimat narasi cukup
 * `npm run voice` lalu render — tidak ada satu pun angka di sini yang perlu
 * disetel ulang.
 *
 * Yang tetap manual hanya `head`/`tail`: ruang diam sebelum dan sesudah suara,
 * karena itu keputusan ritme, bukan konsekuensi audio.
 */

import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import narration from "./narration.json";
import { FORGE_LINES } from "./forge";
import { Stage } from "./components";
import {
  Close,
  Constraint,
  EmitterCheck,
  Honest,
  Hook,
  NoAdmin,
  ProofChain,
  Prober,
  Problem,
  Product,
  Turn,
} from "./scenes";

/** Jeda antar kalimat di dalam satu scene. */
const GAP = 10;

type Plan = {
  id: string;
  lines: string[];
  head: number;
  tail: number;
};

const PLAN: Plan[] = [
  { id: "hook", lines: ["hook1", "hook2"], head: 20, tail: 22 },
  { id: "problem", lines: ["prob1", "prob2"], head: 14, tail: 26 },
  { id: "turn", lines: ["turn1", "turn2"], head: 12, tail: 26 },
  { id: "constraint", lines: ["how1", "how2"], head: 14, tail: 20 },
  { id: "prober", lines: ["how3"], head: 16, tail: 22 },
  { id: "productHome", lines: ["prod1"], head: 12, tail: 16 },
  { id: "productProof", lines: ["prod2"], head: 10, tail: 18 },
  { id: "chain", lines: ["chain1", "chain2", "chain3"], head: 12, tail: 24 },
  { id: "emitter", lines: ["trust1", "trust2"], head: 12, tail: 22 },
  { id: "noadmin", lines: ["trust3", "trust4"], head: 12, tail: 26 },
  { id: "honest", lines: ["close1"], head: 18, tail: 28 },
  { id: "close", lines: ["close2"], head: 16, tail: 52 },
];

const byId = new Map(narration.lines.map((l) => [l.id, l]));

/**
 * Ubah PLAN jadi jadwal absolut, sekalian catat offset lokal tiap kalimat
 * supaya animasi di dalam scene bisa disinkronkan ke kata yang sedang diucapkan.
 */
function schedule() {
  let cursor = 0;
  return PLAN.map((p) => {
    const clips: { id: string; from: number; frames: number; file: string }[] = [];
    let local = p.head;

    for (const lineId of p.lines) {
      const line = byId.get(lineId);
      if (!line) throw new Error(`Narasi "${lineId}" tidak ada di narration.json`);
      clips.push({ id: lineId, from: local, frames: line.frames, file: line.file });
      local += line.frames + GAP;
    }

    const duration = local - GAP + p.tail;
    const scene = { ...p, start: cursor, duration, clips };
    cursor += duration;
    return scene;
  });
}

const SCENES = schedule();
export const TOTAL = SCENES.reduce((a, s) => a + s.duration, 0);

const at = (sceneId: string, lineId: string) => {
  const s = SCENES.find((x) => x.id === sceneId)!;
  return s.clips.find((c) => c.id === lineId)!.from;
};

const dur = (sceneId: string) => SCENES.find((x) => x.id === sceneId)!.duration;

export const AniWereVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Latar dirender sekali di root supaya potongan antar scene terasa
          seperti hard cut yang disengaja, bukan layar yang berkedip gelap. */}
      <Stage>
        <>
          {SCENES.map((s) => {
            let content: React.ReactNode = null;

            switch (s.id) {
              case "hook":
                content = <Hook second={at("hook", "hook2")} />;
                break;
              case "problem":
                // Coretan mulai menjelang akhir prob2, jadi mendarat tepat saat
                // scene berikutnya mengucapkan "removes all three".
                content = (
                  <Problem
                    strikeAt={at("problem", "prob2") + Math.round(byId.get("prob2")!.frames * 0.72)}
                  />
                );
                break;
              case "turn":
                content = <Turn second={at("turn", "turn2")} />;
                break;
              case "constraint":
                content = <Constraint />;
                break;
              case "prober":
                content = <Prober />;
                break;
              case "productHome":
                content = (
                  <Product
                    shot="shots/home.png"
                    focus={[0.32, 0.2]}
                    caption="Cover is bought on Creditcoin."
                    note="Priced against a snapshot that was proven, not polled."
                  />
                );
                break;
              case "productProof":
                content = (
                  <Product
                    shot="shots/proof.png"
                    focus={[0.5, 0.34]}
                    caption="The position never leaves Ethereum."
                    note="Never bridged. Never wrapped. Never mirrored."
                  />
                );
                break;
              case "chain":
                content = (
                  <ProofChain
                    stepAt={at("chain", "chain2") + 6}
                    stepEvery={Math.floor(byId.get("chain2")!.frames / 6)}
                  />
                );
                break;
              case "emitter":
                content = <EmitterCheck forge={FORGE_LINES} />;
                break;
              case "noadmin":
                content = <NoAdmin closeAt={at("noadmin", "trust4") - 10} />;
                break;
              case "honest":
                content = <Honest />;
                break;
              case "close":
                content = <Close />;
                break;
            }

            return (
              <Sequence key={s.id} from={s.start} durationInFrames={s.duration} name={s.id}>
                {content}
              </Sequence>
            );
          })}

          {/* Audio ditempel di root, bukan di dalam scene: kalau nanti scene
              dipotong lebih pendek dari suaranya, kesalahan itu kedengaran
              langsung daripada diam-diam terpotong. */}
          {SCENES.flatMap((s) =>
            s.clips.map((c) => (
              <Sequence
                key={`${s.id}-${c.id}`}
                from={s.start + c.from}
                durationInFrames={c.frames}
                name={`vo:${c.id}`}
              >
                <Audio src={staticFile(c.file)} />
              </Sequence>
            )),
          )}
        </>
      </Stage>
    </AbsoluteFill>
  );
};

// Dipakai Root.tsx untuk mengatur durasi komposisi.
export { SCENES, dur };
