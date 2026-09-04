import type { Hex } from "viem";
import { status } from "./commands/status.js";
import { probe } from "./commands/probe.js";
import { prove, submitPosition, submitClaim } from "./commands/prove.js";
import { watch } from "./commands/watch.js";
import { log } from "./log.js";

/**
 * AniWere proof worker.
 *
 * Worker ini kurir, bukan otoritas. Ia tidak memutuskan apa pun: proof yang
 * ia kirim tetap harus lolos Block Prover Precompile, dan `submitLiquidationClaim`
 * permissionless — kalau worker ini mati, siapa pun bisa menyelesaikan klaim
 * dengan perintah yang sama.
 */

const USAGE = `
AniWere proof worker

  npm run worker -- <perintah>

Perintah:
  status                     Cek Sepolia, Proof Builder, dan Creditcoin. Jalankan ini dulu.
  probe <address>            Panggil probe(user) di Sepolia, cetak tx hash-nya.
  prove <txHash> [file]      Bangun proof dan simpan ke JSON. Tidak mengirim apa pun.
  submit-position <txHash>   Bangun proof lalu simpan snapshot di Creditcoin.
  submit-claim <txHash>      Bangun proof lalu bayarkan klaim.
  watch                      Loop: pantau Sepolia, kerjakan otomatis.

Alur normal:
  npm run worker -- status
  npm run worker -- probe 0xUSER
  npm run worker -- submit-position 0xTX
  npm run worker -- watch
`;

function txArg(v: string | undefined): Hex {
  if (!v || !/^0x[0-9a-fA-F]{64}$/.test(v)) throw new Error(`butuh tx hash 32 byte, dapat: ${v ?? "(kosong)"}`);
  return v as Hex;
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);

  switch (cmd) {
    case "status":
      return status();
    case "probe":
      return probe(rest[0] ?? "");
    case "prove":
      return prove(txArg(rest[0]), rest[1]);
    case "submit-position":
      return submitPosition(txArg(rest[0]));
    case "submit-claim":
      return submitClaim(txArg(rest[0]));
    case "watch":
      return watch();
    default:
      console.log(USAGE);
      process.exit(cmd ? 1 : 0);
  }
}

main().catch((e: Error) => {
  log.err(e.message);
  process.exit(1);
});
