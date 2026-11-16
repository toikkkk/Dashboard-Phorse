import { ambilDataset } from "@/server/dataset";
import { ambilDb } from "@/server/db";
import { wajibMasuk } from "@/server/akses";

const TANPA_CACHE = { "Cache-Control": "private, no-store" };

/** Seluruh dataset dashboard + identitas pengguna. Semua akun yang masuk boleh MELIHAT semua terminal. */
export async function GET() {
  const akses = await wajibMasuk();
  if (!akses.ok) return Response.json({ galat: akses.galat }, { status: akses.status, headers: TANPA_CACHE });
  try {
    const data = await ambilDataset(await ambilDb());
    const { username, nama, peran, lokasiId } = akses.pengguna;
    return Response.json({ pengguna: { username, nama, peran, lokasiId }, data }, { headers: TANPA_CACHE });
  } catch (e) {
    console.error("GET /api/data gagal", e);
    return Response.json({ galat: "layanan-bermasalah" }, { status: 500, headers: TANPA_CACHE });
  }
}
