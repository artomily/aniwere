import { formatUnits, isAddress, type Address } from "viem";
import { probeAbi } from "../abi.js";
import { probeAddress } from "../config.js";
import { sepoliaClient, sepoliaWallet } from "../clients.js";
import { log } from "../log.js";

/**
 * Panggil `probe(user)` di Sepolia.
 *
 * Permissionless di kontrak, jadi wallet mana pun bisa. Worker melakukannya
 * hanya karena harus ada yang membayar gas — bukan karena ia punya hak khusus.
 */
export async function probe(user: string): Promise<void> {
  if (!isAddress(user)) throw new Error(`bukan alamat EVM: ${user}`);

  const pub = sepoliaClient();
  const { wallet, address } = sepoliaWallet();
  const probeAddr = probeAddress();

  log.step(`probe(${user}) lewat ${probeAddr}`);
  const hash = await wallet.writeContract({
    address: probeAddr,
    abi: probeAbi,
    functionName: "probe",
    args: [user as Address],
    chain: wallet.chain,
    account: wallet.account!,
  });

  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`probe revert: ${hash}`);

  log.ok(`probe masuk blok ${receipt.blockNumber} — ${hash}`);

  // Tampilkan angkanya supaya kelihatan probe memang mengambil posisi nyata,
  // bukan sekadar transaksi yang sukses.
  for (const l of receipt.logs) {
    if (l.address.toLowerCase() !== probeAddr.toLowerCase()) continue;
    const ev = decode(l.data, l.topics);
    if (ev) log.info(`  ${ev}`);
  }

  log.info("");
  log.info("Langkah berikutnya:");
  log.info(`  npm run worker -- submit-position ${hash}`);
}

/** Decode manual — event-nya cuma satu dan bentuknya tetap. */
function decode(data: `0x${string}`, topics: readonly `0x${string}`[]): string | null {
  if (topics.length < 2 || (data.length - 2) / 64 < 4) return null;
  const words = (data.slice(2).match(/.{64}/g) ?? []).map((w) => BigInt(`0x${w}`));
  const [coll, debt, hf] = words;
  if (coll === undefined || debt === undefined || hf === undefined) return null;
  // Aave base currency 8 desimal, health factor 18 desimal.
  const hfText = hf > 2n ** 200n ? "∞ (tanpa hutang)" : formatUnits(hf, 18);
  return `collateral ${formatUnits(coll, 8)} · debt ${formatUnits(debt, 8)} · HF ${hfText}`;
}
