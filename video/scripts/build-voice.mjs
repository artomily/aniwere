/**
 * Bikin voice-over pakai TTS bawaan macOS (`say`), lalu ukur durasi tiap klip.
 *
 * Kenapa durasinya diukur dan bukan ditebak: seluruh timing video digerakkan
 * dari panjang audio yang sebenarnya. Ganti satu kalimat narasi, jalankan ulang
 * script ini, dan scene-nya ikut menyesuaikan sendiri — tidak ada angka durasi
 * yang perlu disetel manual di komponen.
 *
 * Output:
 *   public/audio/<id>.wav
 *   src/narration.json   <- dibaca Remotion untuk menghitung durasi scene
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const AUDIO_DIR = join(ROOT, "public", "audio");
const FPS = 30;

/** Suara macOS. Ganti lewat: VOICE="Daniel" npm run voice */
const VOICE = process.env.VOICE ?? "Samantha";
/** Kata per menit. Default `say` 175 terlalu cepat untuk VO iklan. */
const RATE = Number(process.env.RATE ?? 168);

/**
 * Narasi. `id` dipakai sebagai nama file dan sebagai kunci di scene.
 * Urutannya menentukan urutan video.
 */
const LINES = [
  { id: "hook1", text: "Your lending position lives on Ethereum." },
  { id: "hook2", text: "Your protection does not have to move." },

  { id: "prob1", text: "Today, cover always costs you trust." },
  { id: "prob2", text: "A committee that decides whether you get paid. An oracle you have to believe. Or a bridge you have to cross." },

  { id: "turn1", text: "AniWere removes all three." },
  { id: "turn2", text: "Nobody approves your claim, because the claim proves itself." },

  { id: "how1", text: "Attestcoin proves events in receipt logs. It cannot prove storage." },
  { id: "how2", text: "Aave keeps position health in storage. So we do not read it. We make Aave emit it." },
  { id: "how3", text: "A prober contract calls Aave, and emits the answer as an event. That event is what we prove. The number is Aave's own, unmodified." },

  { id: "prod1", text: "Buy cover on Creditcoin. Your position never leaves Ethereum." },
  { id: "prod2", text: "Never bridged. Never wrapped. Never mirrored." },

  { id: "chain1", text: "When Aave's own liquidation event fires, six links carry it home." },
  { id: "chain2", text: "Source event. Emitter check. Attestation. Continuity proof. Merkle proof. Payout." },
  { id: "chain3", text: "Verified and paid inside a single Creditcoin transaction. Either both happen, or neither does." },

  { id: "trust1", text: "We match the emitting contract and the topic. Without that check, a look-alike contract could drain the vault." },
  { id: "trust2", text: "That is a test. Not a comment." },
  { id: "trust3", text: "No owner. No pause. No upgrade path. No withdrawal for us." },
  { id: "trust4", text: "We cannot stop a valid payout. And we cannot take the capital." },

  { id: "close1", text: "About eight minutes, end to end. We never call it real time." },
  { id: "close2", text: "AniWere. Your position lives anywhere. Your protection lives here." },
];

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function durationSeconds(file) {
  const out = sh("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  return Number.parseFloat(out.trim());
}

rmSync(AUDIO_DIR, { recursive: true, force: true });
mkdirSync(AUDIO_DIR, { recursive: true });

console.log(`Voice: ${VOICE} @ ${RATE} wpm\n`);

const manifest = [];

for (const line of LINES) {
  const aiff = join(AUDIO_DIR, `${line.id}.aiff`);
  const wav = join(AUDIO_DIR, `${line.id}.wav`);

  sh("say", ["-v", VOICE, "-r", String(RATE), "-o", aiff, line.text]);

  // 48 kHz stereo: format yang paling mulus buat Remotion, dan
  // headroom -1 dB supaya tidak clipping saat digabung musik nanti.
  sh("ffmpeg", [
    "-y", "-loglevel", "error",
    "-i", aiff,
    "-ar", "48000", "-ac", "2",
    "-af", "highpass=f=80,dynaudnorm=p=0.9:s=5,alimiter=limit=0.89",
    wav,
  ]);
  rmSync(aiff, { force: true });

  const seconds = durationSeconds(wav);
  const frames = Math.ceil(seconds * FPS);
  manifest.push({ ...line, file: `audio/${line.id}.wav`, seconds, frames });

  console.log(`  ${line.id.padEnd(8)} ${seconds.toFixed(2)}s  ${String(frames).padStart(4)}f  "${line.text.slice(0, 52)}${line.text.length > 52 ? "…" : ""}"`);
}

const total = manifest.reduce((a, l) => a + l.seconds, 0);
writeFileSync(
  join(ROOT, "src", "narration.json"),
  JSON.stringify({ fps: FPS, voice: VOICE, rate: RATE, lines: manifest }, null, 2) + "\n",
);

console.log(`\n${manifest.length} klip · total narasi ${total.toFixed(1)}s`);
console.log("src/narration.json ditulis. Lanjut: npm run render");
