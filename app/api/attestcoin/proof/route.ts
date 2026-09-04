import { NextResponse } from "next/server";
import { fetchProofJson } from "@/lib/proofBuilder";

/**
 * Proof untuk satu transaksi source chain, diteruskan apa adanya.
 *
 * Perhatikan apa yang TIDAK dilakukan route ini: ia tidak menandatangani,
 * tidak menyimpan, dan tidak memilih log. Proof yang lewat sini tetap harus
 * lolos Block Prover Precompile di kontrak, jadi server ini tidak lebih
 * dipercaya daripada worker — yaitu tidak sama sekali.
 */
export async function GET(request: Request) {
  const tx = new URL(request.url).searchParams.get("tx");

  if (!tx || !/^0x[0-9a-fA-F]{64}$/.test(tx)) {
    return NextResponse.json({ error: "butuh tx hash 32 byte" }, { status: 400 });
  }

  const result = await fetchProofJson(tx);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json(result, { headers: { "cache-control": "no-store" } });
}
