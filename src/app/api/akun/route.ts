import { wajibAdmin } from "@/server/akses";
import { ambilDb } from "@/server/db";

const TANPA_CACHE = { "Cache-Control": "private, no-store" };

/** Daftar akun untuk admin. Tidak pernah memuat hash sandi. */
export async function GET() {
  const akses = await wajibAdmin();
  if (!akses.ok) return Response.json({ galat: akses.galat }, { status: akses.status, headers: TANPA_CACHE });
  try {
    const akun = await (await ambilDb()).kueri(
      `SELECT p.id, p.username, p.nama, p.peran, l.singkat AS lokasi, p.aktif, p.harus_ganti AS "harusGanti",
              p.terakhir_login AS "terakhirLogin",
              (SELECT count(*)::int FROM sesi s WHERE s.pengguna_id = p.id AND s.kedaluwarsa > now()) AS "sesiAktif"
         FROM pengguna p LEFT JOIN lokasi l ON l.id = p.lokasi_id
        ORDER BY (p.peran = 'admin') DESC, l.urutan NULLS LAST, p.username`,
    );
    return Response.json({ akun }, { headers: TANPA_CACHE });
  } catch (e) {
    console.error("GET /api/akun gagal", e);
    return Response.json({ galat: "layanan-bermasalah" }, { status: 500, headers: TANPA_CACHE });
  }
}
