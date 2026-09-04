import type { Metadata } from "next";
import { IBM_Plex_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { Nav } from "./_components/Nav";
import { networkStatus } from "@/lib/chain";
import { isDeployed } from "@/lib/contracts";
import { Providers } from "./_components/Providers";
import { ConnectButton } from "./_components/ConnectButton";

/** Geometric sans, mengikuti referensi. Dipakai untuk judul maupun teks. */
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Dibaca langsung dari Sepolia dan Proof Builder di setiap request.
  // Dua pill di header dulunya bertuliskan "synced" tanpa dasar apa pun;
  // sekarang keduanya menunjukkan angka yang bisa dicek orang lain.
  const net = await networkStatus();

  return (
    <html
      lang="en"
      className={`${poppins.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ground font-sans text-[14px] leading-normal">
        <Providers>
        <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6">
          {/* Satu panel besar membulat, seperti di referensi. */}
          <div className="rounded-[28px] bg-panel px-5 py-6 shadow-soft sm:px-8 sm:py-7">
            <header className="flex flex-wrap items-center gap-3">
              <div className="mr-auto flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-accent font-display text-[17px] font-semibold text-white">
                  A
                </div>
                <div>
                  <b className="block font-display text-[19px] leading-tight font-semibold tracking-[-0.01em]">
                    AniWere
                  </b>
                  <span className="text-[12.5px] text-ink-3">
                    Parametric liquidation cover
                  </span>
                </div>
              </div>

              <Pill>
                <Dot className={net.sepoliaHead ? "bg-safe" : "bg-ink-3"} />
                {net.sepoliaHead
                  ? `Sepolia · ${net.sepoliaHead.toLocaleString("en-US")}`
                  : "Sepolia · unreachable"}
              </Pill>
              <Pill>
                <Dot className={net.creditcoinHead ? "bg-accent" : "bg-ink-3"} />
                {net.creditcoinHead
                  ? `Creditcoin CC3 · ${net.creditcoinHead.toLocaleString("en-US")}`
                  : "Creditcoin CC3 · unreachable"}
              </Pill>
              <ConnectButton />
            </header>

            <Nav />

            {!isDeployed && <SampleDataNotice />}

            <main>{children}</main>
          </div>
        </div>
        </Providers>
      </body>
    </html>
  );
}

function Pill({
  children,
  mono = false,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-surface px-4 py-2.5 text-[12.5px] whitespace-nowrap text-ink-2 shadow-card ${
        mono ? "font-mono" : ""
      }`}
    >
      {children}
    </span>
  );
}

/**
 * Selama kontrak belum di-deploy, angka posisi dan polis di bawah adalah data
 * contoh. Ini dikatakan di muka, bukan di footer.
 *
 * Yang TIDAK termasuk data contoh: dua pill blok di header dan panel
 * attestation di Proof Explorer. Keduanya dibaca dari jaringan asli.
 */
function SampleDataNotice() {
  return (
    <p className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-line-strong bg-surface-2 px-4 py-3 text-[12.5px] text-ink-2">
      <b className="font-semibold">Sample data.</b>
      <span className="text-ink-3">
        Contracts are not deployed to testnet yet, so position and policy figures below
        are illustrative. Block heights and attestation status are read live from Sepolia
        and Creditcoin.
      </span>
    </p>
  );
}

function Dot({ className }: { className: string }) {
  return <i aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-full ${className}`} />;
}
