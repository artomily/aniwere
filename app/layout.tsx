import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { Nav } from "./_components/Nav";
import { WALLET } from "@/lib/data";

/** Angka besar dan judul. Dipilih karena figure-nya tegas saat dipakai display size. */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

/** Hash, block number, alamat. Semua yang harus bisa dibaca karakter per karakter. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "AniWere",
  description:
    "Parametric liquidation cover for Aave V3 positions, settled on Creditcoin against cryptographic proof from Ethereum.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-[14px] leading-normal">
        <div className="mx-auto w-full max-w-[1320px] px-5 pt-5 pb-14 sm:px-6">
          <header className="flex flex-wrap items-center gap-3">
            <div className="mr-auto flex items-center gap-2.5">
              <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-ink font-display text-[15px] font-bold text-ground">
                A
              </div>
              <div>
                <b className="block font-display text-[16px] leading-tight font-semibold tracking-[-0.01em]">
                  AniWere
                </b>
                <span className="text-[12px] text-ink-3">
                  Parametric liquidation cover
                </span>
              </div>
            </div>

            <NetworkChip label="Sepolia · synced" tone="safe" />
            <NetworkChip label="Creditcoin CC3" tone="proof" />
            <span className="inline-flex items-center rounded-full border border-line bg-surface px-[11px] py-1.5 font-mono text-[12px] text-ink-2">
              {WALLET}
            </span>
          </header>

          <Nav />

          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}

function NetworkChip({ label, tone }: { label: string; tone: "safe" | "proof" }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-[11px] py-1.5 text-[12px] whitespace-nowrap text-ink-2">
      <i
        aria-hidden
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
          tone === "safe" ? "bg-safe" : "bg-proof"
        }`}
      />
      {label}
    </span>
  );
}
