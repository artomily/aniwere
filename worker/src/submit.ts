import { encodeFunctionData, type Hex } from "viem";
import { ascAbi } from "./abi.js";
import { ascAddress } from "./config.js";
import { creditcoinClient, creditcoinWallet } from "./clients.js";
import { toContractArgs, type Proof } from "./attestcoin.js";
import { log } from "./log.js";

type Fn = "submitPositionProof" | "submitLiquidationClaim";

/**
 * Batas bawah gas.
 *
 * Contoh resmi Attestcoin memakai fallback `21000 + 5000*jumlahRoot + 20000`
 * ketika estimasi gagal. Angka itu ditulis untuk kontrak yang hanya memanggil
 * precompile; ASC kita masih men-decode receipt dan menelusuri log setelahnya,
 * dan calldata proof sendiri sekitar 6 KB. Jadi fallback resmi dipakai sebagai
 * dasar, lalu dijepit ke batas bawah yang masuk akal untuk pekerjaan itu.
 *
 * Gas berlebih di Creditcoin tidak hangus — yang tidak terpakai dikembalikan.
 * Kesalahan yang mahal di sini adalah gas terlalu sedikit, bukan terlalu banyak.
 */
const GAS_FLOOR = 2_000_000n;

function fallbackGas(p: Proof): bigint {
  const official = 21_000n + 5_000n * BigInt(p.continuityProof.roots.length) + 20_000n;
  return official > GAS_FLOOR ? official : GAS_FLOOR;
}

/**
 * Kirim proof ke ASC.
 *
 * Simulasi dulu, selalu. Proof yang tidak sah membuat precompile revert, dan
 * jauh lebih baik mengetahuinya dari `eth_call` gratis daripada dari transaksi
 * yang sudah membakar gas.
 */
export async function submitProof(fn: Fn, proof: Proof): Promise<Hex> {
  const asc = ascAddress();
  const pub = creditcoinClient();
  const { wallet, address } = creditcoinWallet();

  const args = toContractArgs(proof);
  const data = encodeFunctionData({ abi: ascAbi, functionName: fn, args: args as never });

  log.step(`simulasi ${fn} — height ${proof.height}, calldata ${(data.length - 2) / 2} byte`);
  await pub.simulateContract({
    address: asc,
    abi: ascAbi,
    functionName: fn,
    args: args as never,
    account: address,
  });
  log.ok("simulasi lolos — proof diterima precompile dan polis valid");

  // Estimasi ke precompile sering meleset walaupun call-nya sendiri berhasil.
  // Contoh resmi memakai buffer 35%; kami ikut, dengan fallback kalau estimasi
  // gagal sama sekali.
  let gas: bigint;
  try {
    const estimate = await pub.estimateContractGas({
      address: asc,
      abi: ascAbi,
      functionName: fn,
      args: args as never,
      account: address,
    });
    gas = (estimate * 135n) / 100n;
    log.step(`gas ${estimate} → ${gas} (buffer 35%)`);
  } catch {
    gas = fallbackGas(proof);
    log.warn(`estimasi gas gagal, memakai fallback ${gas}`);
  }

  const hash = await wallet.writeContract({
    address: asc,
    abi: ascAbi,
    functionName: fn,
    args: args as never,
    gas,
    chain: wallet.chain,
    account: wallet.account!,
  });
  log.step(`terkirim ${hash} — menunggu receipt`);

  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`transaksi ${hash} revert di Creditcoin`);

  log.ok(`${fn} sukses di blok Creditcoin ${receipt.blockNumber} (gas terpakai ${receipt.gasUsed})`);
  return hash;
}
