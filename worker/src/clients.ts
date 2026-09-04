import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { config, creditcoin, privateKey } from "./config.js";

export function sepoliaClient(): PublicClient {
  return createPublicClient({ chain: sepolia, transport: http(config.sepoliaRpc) });
}

export function creditcoinClient(): PublicClient {
  return createPublicClient({ chain: creditcoin, transport: http(config.creditcoinRpc) });
}

/** Wallet worker. Dibuat malas supaya perintah read-only jalan tanpa PRIVATE_KEY. */
export function creditcoinWallet(): { wallet: WalletClient; address: `0x${string}` } {
  const account = privateKeyToAccount(privateKey());
  const wallet = createWalletClient({ account, chain: creditcoin, transport: http(config.creditcoinRpc) });
  return { wallet, address: account.address };
}

export function sepoliaWallet(): { wallet: WalletClient; address: `0x${string}` } {
  const account = privateKeyToAccount(privateKey());
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(config.sepoliaRpc) });
  return { wallet, address: account.address };
}
