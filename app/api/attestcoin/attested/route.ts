import { NextResponse } from "next/server";
import { attestedHeightOf } from "@/lib/proofBuilder";

/**
 * Tinggi blok source chain yang sudah ter-attest.
 *
 * Ada sebagai route server, bukan fetch langsung dari browser, karena Proof
 * Builder tidak mengirim header CORS. Route ini tidak menambahkan wewenang
 * apa pun — ia meneruskan data publik apa adanya.
 */
export async function GET() {
  const height = await attestedHeightOf();
  if (height === null) {
    return NextResponse.json({ error: "proof builder unreachable" }, { status: 502 });
  }
  return NextResponse.json({ height }, { headers: { "cache-control": "no-store" } });
}
