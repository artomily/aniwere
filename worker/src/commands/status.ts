import { formatEther } from "viem";
import { attestedHeight } from "../attestcoin.js";
import { chainInfoAbi, ascAbi } from "../abi.js";
import { chainInfoAddress, config, creditcoin } from "../config.js";
import { creditcoinClient, sepoliaClient } from "../clients.js";
import { log } from "../log.js";

/**
 * Cek kesehatan seluruh jalur sebelum demo.
 *
 * Ini juga alat ukur untuk pertanyaan yang masih terbuka di
 * docs/ATTESTCOIN.md bagian 8: seberapa jauh attestation tertinggal dari head,
 * dan apakah ia benar-benar mendahului finality Ethereum. Satu sampel tidak
 * cukup untuk ditaruh di README, jadi jalankan ini beberapa kali.
 */
export async function status(): Promise<void> {
  const sep = sepoliaClient();
  const cc = creditcoinClient();

  const [head, finalized] = await Promise.all([
    sep.getBlock({ blockTag: "latest" }),
    sep.getBlock({ blockTag: "finalized" }).catch(() => null),
  ]);

  log.info("Sepolia");
  log.info(`  head                 ${head.number}`);
  log.info(`  finalized            ${finalized ? finalized.number : "tidak tersedia dari RPC ini"}`);

  let attested: bigint | null = null;
  try {
    attested = await attestedHeight();
    log.info(`  ter-attest (REST)    ${attested}`);
  } catch (e) {
    log.err(`  Proof Builder tidak menjawab: ${(e as Error).message}`);
  }

  if (attested !== null) {
    log.info("");
    log.info("Lag attestation");
    log.info(`  di belakang head     ${head.number! - attested} blok (~${Math.round(Number(head.number! - attested) * 12 / 60)} menit)`);
    if (finalized) {
      const d = attested - finalized.number!;
      log.info(
        d >= 0n
          ? `  di DEPAN finalized   ${d} blok — attestation tidak menunggu finality Ethereum`
          : `  di belakang finalized ${-d} blok`,
      );
    }
  }

  // Precompile Chain Info dipakai sebagai pembanding saja. Signature-nya
  // dugaan, bukan salinan resmi, jadi gagalnya tidak berarti apa-apa.
  try {
    const [h, hash] = await cc.readContract({
      address: chainInfoAddress(),
      abi: chainInfoAbi,
      functionName: "get_latest_attestation_height_and_hash",
      args: [config.chainKey],
    });
    log.info(`  precompile 0x…0FD3   ${h} (${hash.slice(0, 12)}…)`);
  } catch {
    log.info("  precompile 0x…0FD3   tidak terbaca — signature-nya belum diverifikasi, abaikan");
  }

  log.info("");
  log.info(`Creditcoin (chainId ${creditcoin.id})`);
  const ccHead = await cc.getBlockNumber();
  log.info(`  head                 ${ccHead}`);

  const asc = process.env.ASC_ADDRESS;
  if (!asc) {
    log.info("  ASC                  belum di-deploy (ASC_ADDRESS kosong)");
    return;
  }

  const vault = await cc.readContract({ address: asc as `0x${string}`, abi: ascAbi, functionName: "VAULT" });
  const balance = await cc.getBalance({ address: vault });
  log.info(`  ASC                  ${asc}`);
  log.info(`  CoverVault           ${vault} — ${formatEther(balance)} CTC`);
}
