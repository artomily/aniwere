import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { getAddress, parseAbiItem, type Address, type Hex } from "viem";
import { ascAddress, config, probeAddress } from "../config.js";
import { ascAbi } from "../abi.js";
import { creditcoinClient, sepoliaClient } from "../clients.js";
import { sleep } from "../attestcoin.js";
import { proveAndSubmit } from "../pipeline.js";
import { log } from "../log.js";

const POSITION_EVENT = parseAbiItem(
  "event PositionProbedForCover(address indexed user, uint256 totalCollateralBase, uint256 totalDebtBase, uint256 healthFactor, uint256 probedAt)",
);
const LIQUIDATION_EVENT = parseAbiItem(
  "event LiquidationCall(address indexed collateralAsset, address indexed debtAsset, address indexed user, uint256 debtToCover, uint256 liquidatedCollateralAmount, address liquidator, bool receiveAToken)",
);

const STATE_FILE = ".watch-state.json";

type State = { lastBlock: string; done: string[] };

function loadState(fallback: bigint): State {
  if (!existsSync(STATE_FILE)) return { lastBlock: fallback.toString(), done: [] };
  return JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
}

function saveState(s: State): void {
  // Simpan jejak yang sudah dikerjakan supaya restart tidak mengulang dari nol.
  // Ini kenyamanan, bukan pengaman: anti-replay yang sebenarnya ada di
  // `usedProofs` on-chain, dan itu yang menentukan.
  writeFileSync(STATE_FILE, JSON.stringify({ ...s, done: s.done.slice(-200) }, null, 2));
}

/**
 * Loop utama.
 *
 * Dua sumber event, satu jalur:
 *
 *   - PositionProbedForCover dari AniWereProbe  → submitPositionProof
 *   - LiquidationCall dari Aave V3 Pool         → submitLiquidationClaim
 *
 * LiquidationCall disaring ke pemegang polis aktif saja. Bukan demi keamanan —
 * kontrak akan menolak sendiri lewat `NoActivePolicy` — tapi supaya worker
 * tidak menghabiskan dua puluh menit menunggu attestation untuk likuidasi
 * orang yang tidak pernah membeli cover.
 */
export async function watch(): Promise<void> {
  const sep = sepoliaClient();
  const cc = creditcoinClient();
  const probeAddr = probeAddress();
  const asc = ascAddress();

  const head = await sep.getBlockNumber();
  const state = loadState(head);
  let cursor = BigInt(state.lastBlock);
  const done = new Set(state.done);

  log.ok(`watch mulai dari blok Sepolia ${cursor}`);
  log.info(`  probe      ${probeAddr}`);
  log.info(`  aave pool  ${config.aavePool}`);
  log.info(`  ASC        ${asc}`);
  log.info("");

  for (;;) {
    try {
      const now = await sep.getBlockNumber();
      if (now > cursor) {
        // Rentang dibatasi supaya satu putaran tidak pernah meminta ribuan blok
        // sekaligus ke RPC publik dan kena rate limit di tengah demo.
        const to = now - cursor > 2_000n ? cursor + 2_000n : now;

        const [positions, liquidations] = await Promise.all([
          sep.getLogs({ address: probeAddr, event: POSITION_EVENT, fromBlock: cursor + 1n, toBlock: to }),
          sep.getLogs({ address: config.aavePool, event: LIQUIDATION_EVENT, fromBlock: cursor + 1n, toBlock: to }),
        ]);

        for (const l of positions) {
          const tx = l.transactionHash;
          if (!tx || done.has(tx)) continue;
          log.step(`probe baru untuk ${l.args.user} di blok ${l.blockNumber}`);
          await handle(tx, "submitPositionProof", done);
        }

        for (const l of liquidations) {
          const tx = l.transactionHash;
          const user = l.args.user;
          if (!tx || !user || done.has(tx)) continue;
          if (!(await hasActivePolicy(cc, asc, getAddress(user)))) {
            log.info(`  likuidasi ${user} dilewati — tidak punya polis aktif`);
            done.add(tx);
            continue;
          }
          log.step(`LIKUIDASI pemegang polis ${user} di blok ${l.blockNumber}`);
          await handle(tx, "submitLiquidationClaim", done);
        }

        cursor = to;
        saveState({ lastBlock: cursor.toString(), done: [...done] });
      }
    } catch (e) {
      // Worker tidak boleh mati karena satu RPC yang ngambek. Kalau ia mati,
      // klaim tetap bisa dikirim siapa pun lewat `submit-claim` — tapi lebih
      // baik ia tetap hidup.
      log.err(`putaran gagal, lanjut: ${(e as Error).message}`);
    }
    await sleep(config.watchIntervalMs);
  }
}

async function handle(tx: Hex, fn: "submitPositionProof" | "submitLiquidationClaim", done: Set<string>) {
  try {
    await proveAndSubmit(tx, fn);
  } catch (e) {
    log.err(`${fn} untuk ${tx} gagal: ${(e as Error).message}`);
  }
  // Ditandai selesai apa pun hasilnya. Percobaan ulang otomatis pada proof yang
  // sudah terpakai hanya akan revert dengan ProofAlreadyUsed; kalau gagalnya
  // karena hal lain, jalankan ulang manual dan biarkan orang yang memutuskan.
  done.add(tx);
}

async function hasActivePolicy(cc: ReturnType<typeof creditcoinClient>, asc: Address, holder: Address) {
  const p = await cc.readContract({ address: asc, abi: ascAbi, functionName: "policies", args: [holder] });
  const [, , , expiresAt, active] = p;
  return active && BigInt(expiresAt) > BigInt(Math.floor(Date.now() / 1000));
}
