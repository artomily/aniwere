import type { Metadata } from "next";
import { IBM_Plex_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { Nav } from "./_components/Nav";
import { WALLET } from "@/lib/data";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-ground font-sans text-[14px] leading-normal">
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
                <Dot className="bg-safe" />
                Sepolia · synced
              </Pill>
              <Pill>
                <Dot className="bg-accent" />
                Creditcoin CC3
              </Pill>
              <Pill mono>{WALLET}</Pill>
            </header>

            <Nav />

            <main>{children}</main>
          </div>
        </div>
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

function Dot({ className }: { className: string }) {
  return <i aria-hidden className={`h-[7px] w-[7px] shrink-0 rounded-full ${className}`} />;
}
