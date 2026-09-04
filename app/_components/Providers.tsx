"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider, type State } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";

/**
 * QueryClient dibuat di dalam state, bukan di module scope.
 *
 * Di module scope ia akan dibagi antar request saat SSR, dan cache satu user
 * bisa terbawa ke user lain. Untuk aplikasi yang menampilkan posisi utang orang,
 * itu bukan bug yang boleh ditunda.
 */
export function Providers({
  children,
  initialState,
}: {
  children: ReactNode;
  /**
   * State wallet yang dibaca dari cookie di server.
   *
   * Tanpa ini, tiap navigasi merender "Connect wallet" lebih dulu lalu berganti
   * begitu wagmi membaca storage di client. Kedipan itu tidak berbahaya, tapi
   * saat demo terlihat seperti wallet-nya putus.
   */
  initialState?: State;
}) {
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
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
