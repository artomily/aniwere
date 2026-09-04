import { defineChain } from "viem";
import { sepolia } from "viem/chains";

/**
 * Creditcoin CC3 Testnet.
 *
 * Nilai-nilainya diverifikasi 27 Agustus lewat pemanggilan live, bukan disalin
 * dari dokumentasi — lihat `docs/ATTESTCOIN.md` bagian 5.
 */
export const creditcoinTestnet = defineChain({
  id: 102031,
  name: "Creditcoin CC3 Testnet",
  nativeCurrency: { name: "Creditcoin", symbol: "CTC", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_CREDITCOIN_RPC_URL ??
          "https://rpc.cc3-testnet.creditcoin.network",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Creditcoin Explorer",
      url: "https://creditcoin-testnet.blockscout.com",
    },
  },
  testnet: true,
});

export { sepolia };

/** Link keluar ke explorer. Tiap angka yang kami tampilkan harus bisa dicek sendiri. */
export function sepoliaTxUrl(hash: string) {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}

export function sepoliaAddressUrl(address: string) {
  return `https://sepolia.etherscan.io/address/${address}`;
}

export function creditcoinTxUrl(hash: string) {
  return `${creditcoinTestnet.blockExplorers.default.url}/tx/${hash}`;
}

export function creditcoinAddressUrl(address: string) {
  return `${creditcoinTestnet.blockExplorers.default.url}/address/${address}`;
}
