import "dotenv/config";
import { defineChain, isAddress, type Address, type Hex } from "viem";

/**
 * Konfigurasi worker.
 *
 * Aturannya: env yang salah harus mati di sini, bukan tiga langkah kemudian
 * saat sudah menghabiskan dua puluh menit menunggu attestation.
 */

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`env ${name} belum diisi — lihat worker/.env.example`);
  return v;
}

function addr(name: string): Address {
  const v = req(name);
  if (!isAddress(v)) throw new Error(`env ${name} bukan alamat EVM yang sah: ${v}`);
  return v;
}

function opt(name: string, fallback: number): number {
  const v = process.env[name];
  return v ? Number(v) : fallback;
}

/** Creditcoin CC3 Testnet. Terverifikasi 27 Agustus, lihat docs/ATTESTCOIN.md bagian 5. */
export const creditcoin = defineChain({
  id: opt("CREDITCOIN_CHAIN_ID", 102031),
  name: "Creditcoin CC3 Testnet",
  nativeCurrency: { name: "Creditcoin", symbol: "CTC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [process.env.CREDITCOIN_RPC_URL ?? "https://rpc.cc3-testnet.creditcoin.network"],
    },
  },
  blockExplorers: {
    default: { name: "Creditcoin Explorer", url: "https://creditcoin-testnet.blockscout.com" },
  },
});

export const config = {
  sepoliaRpc: req("SEPOLIA_RPC_URL"),
  creditcoinRpc: req("CREDITCOIN_RPC_URL"),
  proofBuilderUrl: req("PROOF_BUILDER_URL").replace(/\/+$/, ""),

  /**
   * Identifier Sepolia di jaringan Creditcoin.
   *
   * BUKAN chain ID. Sepolia punya chainKey 1 dan chain ID 11155111, dan
   * menukar keduanya adalah bug yang paling gampang terjadi di proyek ini —
   * proof-nya akan dibangun untuk chain yang salah lalu revert tanpa
   * penjelasan yang berguna.
   */
  chainKey: BigInt(process.env.SOURCE_CHAIN_KEY ?? 1),

  aavePool: addr("AAVE_POOL_SEPOLIA"),

  attestPollMs: opt("ATTEST_POLL_MS", 15_000),
  attestTimeoutMs: opt("ATTEST_TIMEOUT_MS", 1_200_000),
  watchIntervalMs: opt("WATCH_INTERVAL_MS", 30_000),
};

/** Alamat yang baru ada setelah deploy. Diminta hanya oleh perintah yang butuh. */
export function probeAddress(): Address {
  return addr("PROBE_ADDRESS");
}

export function ascAddress(): Address {
  return addr("ASC_ADDRESS");
}

export function chainInfoAddress(): Address {
  const v = process.env.ATTESTCOIN_CHAIN_INFO ?? "0x0000000000000000000000000000000000000FD3";
  if (!isAddress(v)) throw new Error(`ATTESTCOIN_CHAIN_INFO bukan alamat sah: ${v}`);
  return v;
}

/**
 * Private key worker.
 *
 * Worker adalah kurir, bukan otoritas. Proof yang dia kirim tetap harus lolos
 * precompile, jadi key yang bocor tidak bisa dipakai memalsukan apa pun —
 * paling jauh membakar gas milik sendiri.
 */
export function privateKey(): Hex {
  const v = req("PRIVATE_KEY");
  const hex = (v.startsWith("0x") ? v : `0x${v}`) as Hex;
  if (hex.length !== 66) throw new Error("PRIVATE_KEY harus 32 byte");
  return hex;
}
