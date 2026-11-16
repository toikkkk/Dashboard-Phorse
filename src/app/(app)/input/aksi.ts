"use server";

import { ambilIp, wajibMasuk } from "@/server/akses";
import { ambilDb } from "@/server/db";
import { simpanInput, skemaPayload, type HasilSimpan } from "@/server/input";

/**
 * Menyimpan isian satu kategori pada satu bulan. Lokasi TIDAK dikirim klien:
 * ditentukan dari sesi (lihat src/server/input.ts).
 */
export async function simpanIsianAksi(masukan: unknown): Promise<HasilSimpan> {
  const akses = await wajibMasuk();
  if (!akses.ok) return { ok: false, jenis: "izin", pesan: "Sesi berakhir. Masuk kembali untuk melanjutkan." };

  const parsed = skemaPayload.safeParse(masukan);
  if (!parsed.success) return { ok: false, jenis: "validasi", pesan: "Format isian tidak valid." };

  try {
    return await simpanInput(await ambilDb(), akses.pengguna, parsed.data, { ip: await ambilIp() });
  } catch (e) {
    console.error("simpan isian gagal", e);
    return { ok: false, jenis: "validasi", pesan: "Penyimpanan gagal karena gangguan layanan. Isian Anda belum tersimpan; coba lagi." };
  }
}
