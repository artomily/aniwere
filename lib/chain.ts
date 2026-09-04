/**
 * Pembacaan on-chain untuk UI.
 *
 * Semuanya dijalankan di server dan tidak butuh wallet, deployment, atau
 * library web3 apa pun — cukup JSON-RPC dan satu endpoint REST. Itu disengaja:
 * bagian dashboard yang paling penting untuk dipercaya, yaitu status
 * attestation, harus tetap nyata walaupun kontraknya belum di-deploy.
 *
 * Kalau jaringan tidak bisa dihubungi, fungsi di sini mengembalikan `null`.
 * Komponen wajib menanganinya dengan mengatakan "tidak terbaca" — jangan
 * pernah menggantinya diam-diam dengan angka contoh.
 */

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const PROOF_BUILDER = (process.env.PROOF_BUILDER_URL ?? "https://prover.cc3-testnet.creditcoin.network").replace(/\/+$/, "");
const CREDITCOIN_RPC = process.env.CREDITCOIN_RPC_URL ?? "https://rpc.cc3-testnet.creditcoin.network";

/** chainKey Sepolia di Creditcoin. BUKAN chain ID 11155111. */
const CHAIN_KEY = Number(process.env.SOURCE_CHAIN_KEY ?? 1);

/** Rata-rata block time Sepolia, dipakai mengubah selisih blok jadi menit. */
const SEPOLIA_BLOCK_SECONDS = 12;

export type NetworkStatus = {
  sepoliaHead: number | null;
  sepoliaFinalized: number | null;
  attestedHeight: number | null;
  /** Selisih attested terhadap head, dalam blok. */
  behindHead: number | null;
  /** Positif berarti attestation berjalan MENDAHULUI finality Ethereum. */
  aheadOfFinalized: number | null;
  lagMinutes: number | null;
  creditcoinHead: number | null;
};

async function rpc(url: string, method: string, params: unknown[]): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      // Status jaringan tidak boleh di-cache. Angka basi di panel yang
      // judulnya "live" lebih buruk daripada tidak ada angka sama sekali.
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { result?: { number?: string } | string };
    if (typeof body.result === "string") return body.result;
    return body.result?.number ?? null;
  } catch {
    return null;
  }
}

async function attested(): Promise<number | null> {
  try {
    const res = await fetch(`${PROOF_BUILDER}/api/v1/attested-height/${CHAIN_KEY}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    // Bentuknya bisa angka telanjang atau objek pembungkus, tergantung versi
    // prover. Worker menangani keduanya; di sini pun sama.
    if (typeof body === "number") return body;
    if (typeof body === "string") return Number(body);
    if (body && typeof body === "object") {
      for (const k of ["height", "attestedHeight", "headerNumber", "latestHeight"]) {
        const v = (body as Record<string, unknown>)[k];
        if (typeof v === "number") return v;
        if (typeof v === "string") return Number(v);
      }
    }
    return null;
  } catch {
    return null;
  }
}

const toNum = (hex: string | null) => (hex ? Number.parseInt(hex, 16) : null);

export async function networkStatus(): Promise<NetworkStatus> {
  const [headHex, finalHex, ccHex, attestedHeight] = await Promise.all([
    rpc(SEPOLIA_RPC, "eth_getBlockByNumber", ["latest", false]),
    rpc(SEPOLIA_RPC, "eth_getBlockByNumber", ["finalized", false]),
    rpc(CREDITCOIN_RPC, "eth_blockNumber", []),
    attested(),
  ]);

  const sepoliaHead = toNum(headHex);
  const sepoliaFinalized = toNum(finalHex);
  const creditcoinHead = toNum(ccHex);

  const behindHead = sepoliaHead !== null && attestedHeight !== null ? sepoliaHead - attestedHeight : null;
  const aheadOfFinalized =
    sepoliaFinalized !== null && attestedHeight !== null ? attestedHeight - sepoliaFinalized : null;

  return {
    sepoliaHead,
    sepoliaFinalized,
    attestedHeight,
    behindHead,
    aheadOfFinalized,
    lagMinutes: behindHead === null ? null : Math.round((behindHead * SEPOLIA_BLOCK_SECONDS) / 60),
    creditcoinHead,
  };
}

/**
 * Apakah kontrak sudah di-deploy.
 *
 * Selama `false`, seluruh angka posisi dan polis di UI adalah data contoh dan
 * harus diberi label seperti itu. Tidak ada jalan tengah: dashboard yang
 * menampilkan angka karangan tanpa label adalah dashboard yang berbohong.
 */
export const ASC_ADDRESS = process.env.NEXT_PUBLIC_ASC_ADDRESS ?? "";
export const isDeployed = ASC_ADDRESS.length === 42;
