import { wajibMasuk } from "@/server/akses";
import { ambilDb } from "@/server/db";
import { ambilIsian } from "@/server/input";
import type { NextRequest } from "next/server";

const TANPA_CACHE = { "Cache-Control": "private, no-store" };

/** Skema formulir + nilai tersimpan untuk SATU periode, selalu untuk lokasi milik akun yang masuk. */
export async function GET(request: NextRequest) {
  const akses = await wajibMasuk();
  if (!akses.ok) return Response.json({ galat: akses.galat }, { status: akses.status, headers: TANPA_CACHE });

  const tahun = Number(request.nextUrl.searchParams.get("tahun"));
  const bulan = Number(request.nextUrl.searchParams.get("bulan"));
  try {
    const hasil = await ambilIsian(await ambilDb(), akses.pengguna, tahun, bulan);
    if (!hasil.ok) {
      return Response.json({ galat: hasil.jenis, pesan: hasil.pesan }, { status: hasil.jenis === "izin" ? 403 : 400, headers: TANPA_CACHE });
    }
    return Response.json(hasil.data, { headers: TANPA_CACHE });
  } catch (e) {
    console.error("GET /api/isian gagal", e);
    return Response.json({ galat: "layanan-bermasalah" }, { status: 500, headers: TANPA_CACHE });
  }
}
