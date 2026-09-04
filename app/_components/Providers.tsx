"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";

/**
 * QueryClient dibuat di dalam state, bukan di module scope.
 *
 * Di module scope ia akan dibagi antar request saat SSR, dan cache satu user
 * bisa terbawa ke user lain. Untuk aplikasi yang menampilkan posisi utang orang,
 * itu bukan bug yang boleh ditunda.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Angka on-chain di sini berubah per blok, bukan per detik.
            staleTime: 10_000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
