import { http, createConfig, cookieStorage, createStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { creditcoinTestnet, sepolia } from "./chains";

/**
 * Dua chain, dan keduanya memang dibutuhkan:
 *
 * - Sepolia untuk memanggil `probe(user)` di AniWereProbe
 * - Creditcoin untuk membeli cover dan mengirim proof
 *
 * Hanya `injected` sebagai connector. WalletConnect butuh project ID dan satu
 * layanan pihak ketiga lagi yang bisa mati saat demo; untuk hackathon ini,
 * ekstensi browser sudah cukup dan satu titik gagal lebih sedikit.
 */
export const wagmiConfig = createConfig({
  chains: [creditcoinTestnet, sepolia],
  connectors: [injected()],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: {
    [creditcoinTestnet.id]: http(),
    [sepolia.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
