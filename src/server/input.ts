// Isian data bulanan oleh akun terminal.
//
// ATURAN KEAMANAN (tidak boleh dilonggarkan):
//  - Lokasi yang ditulis SELALU berasal dari akun yang sedang masuk (dicek ulang ke database), tidak pernah dari
//    masukan klien. Permintaan isian sengaja tidak punya kolom "lokasi".
//  - Hanya akun terminal yang aktif, sudah mengganti sandi awal, dan terikat ke lokasi tersebut yang boleh menulis.
//  - Kunci isian dicocokkan ke daftar kolom resmi (bisa_input); kunci asing menolak seluruh permintaan.
//  - Penyimpanan atomik: semua berhasil atau tidak sama sekali.

import { z } from "zod";
import type { Db } from "./db";
import { catatAudit } from "./otentikasi";
import type { Pengguna } from "./sesi";

export const TAHUN_MULAI_INPUT = 2026; // format Excel 2026 (rincian per produk). Tahun sebelumnya hanya baca.
export const BATAS_NILAI = 1e13;
export const RASIO_JANGGAL = 10;
export const MIN_RIWAYAT_JANGGAL = 3;

export type Kolom = {
  id: string;
  kategori: string;
  level: string[];
  /** satuan yang diminta di formulir */
  satuan: string;
  /** satuan bawaan metrik (dipakai untuk menentukan perlu-tidaknya menyimpan satuan khusus) */
  satuanMetrik: string;
  urutan: number;
};

const tembolokSkema = new WeakMap<Db, Kolom[]>();

export async function ambilSkema(db: Db): Promise<Kolom[]> {
  const ada = tembolokSkema.get(db);
  if (ada) return ada;
  const baris = await db.kueri<{ id: string; kategori: string; level: string[]; satuan: string; satuan_input: string | null; urutan_input: number | null }>(
    "SELECT id, kategori, level, satuan, satuan_input, urutan_input FROM metrik WHERE bisa_input ORDER BY urutan_input NULLS LAST, id",
  );
  const skema = baris.map((b) => ({
    id: b.id, kategori: b.kategori, level: b.level, satuan: b.satuan_input ?? b.satuan, satuanMetrik: b.satuan, urutan: b.urutan_input ?? 0,
  }));
  tembolokSkema.set(db, skema);
  return skema;
}

// ------------------------------------------------------------------ periode

/** Tahun dan bulan sekarang menurut waktu Jakarta (WIB, UTC+7). */
export function periodeSekarang(sekarang = new Date()): { tahun: number; bulan: number } {
  const wib = new Date(sekarang.getTime() + 7 * 60 * 60 * 1000);
  return { tahun: wib.getUTCFullYear(), bulan: wib.getUTCMonth() + 1 };
}

export function periodeBolehDiisi(tahun: number, bulan: number, sekarang = new Date()): string | null {
  if (!Number.isInteger(tahun) || !Number.isInteger(bulan) || bulan < 1 || bulan > 12) return "Periode tidak valid.";
  if (tahun < TAHUN_MULAI_INPUT) return `Isian hanya tersedia mulai ${TAHUN_MULAI_INPUT}. Data sebelumnya hanya dapat dilihat.`;
  const kini = periodeSekarang(sekarang);
  if (tahun > kini.tahun || (tahun === kini.tahun && bulan > kini.bulan)) return "Bulan yang belum berjalan tidak dapat diisi.";
  return null;
}

// ------------------------------------------------------------------ angka

export type HasilAngka = { ok: true; nilai: number | null } | { ok: false; pesan: string };

/**
 * Mengurai isian angka. Kosong = tidak diisi. Pemisah desimal boleh koma atau titik; PEMISAH RIBUAN DITOLAK,
 * karena "1.900" ambigu (1,9 atau 1900) dan itulah sumber kesalahan angka di Excel.
 */
export function uraiAngka(masukan: unknown): HasilAngka {
  if (masukan === null || masukan === undefined) return { ok: true, nilai: null };
  if (typeof masukan === "number") {
    if (!Number.isFinite(masukan)) return { ok: false, pesan: "Angka tidak valid." };
    if (masukan < 0) return { ok: false, pesan: "Nilai tidak boleh negatif." };
    if (masukan > BATAS_NILAI) return { ok: false, pesan: "Nilai terlalu besar." };
    return { ok: true, nilai: masukan };
  }
  if (typeof masukan !== "string") return { ok: false, pesan: "Isian harus berupa angka." };
  const teks = masukan.trim();
  if (teks === "") return { ok: true, nilai: null };
  if (teks.length > 30) return { ok: false, pesan: "Angka terlalu panjang." };
  if (teks.startsWith("-")) return { ok: false, pesan: "Nilai tidak boleh negatif." };
  if (/[.,].*[.,]/.test(teks)) return { ok: false, pesan: "Jangan memakai pemisah ribuan. Tulis angka biasa, mis. 1234,5." };
  if (!/^\d+(?:[.,]\d+)?$/.test(teks)) return { ok: false, pesan: "Tulis angka saja (boleh memakai koma desimal)." };
  const nilai = Number(teks.replace(",", "."));
  if (!Number.isFinite(nilai) || nilai > BATAS_NILAI) return { ok: false, pesan: "Nilai terlalu besar." };
  return { ok: true, nilai };
}

// ------------------------------------------------------------------ payload

export const skemaPayload = z.object({
  tahun: z.number().int(),
  bulan: z.number().int(),
  kategori: z.string().min(1).max(60),
  nilai: z.record(z.string().max(300), z.union([z.string().max(40), z.number(), z.null()])),
  /** id metrik yang nilainya janggal tetapi sudah dikonfirmasi benar oleh pengguna */
  konfirmasi: z.array(z.string().max(300)).max(400).optional(),
});
export type PayloadSimpan = z.infer<typeof skemaPayload>;

export type Janggal = { metrik: string; nilai: number; pembanding: number };

export type HasilSimpan =
  | { ok: true; ditulis: number; dihapus: number; berubah: number }
  | { ok: false; jenis: "izin" | "periode" | "validasi"; pesan: string; galat?: Record<string, string> }
  | { ok: false; jenis: "konfirmasi"; pesan: string; perluKonfirmasi: Janggal[] };

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const t = Math.floor(s.length / 2);
  return s.length % 2 ? s[t] : (s[t - 1] + s[t]) / 2;
};

/** Memastikan akun masih berhak menulis (dicek ke database, bukan hanya dari objek sesi). */
async function periksaHak(db: Db, pengguna: Pengguna): Promise<{ ok: true; lokasiId: string } | { ok: false; pesan: string }> {
  const [akun] = await db.kueri<{ peran: string; lokasi_id: string | null; aktif: boolean; harus_ganti: boolean }>(
    "SELECT peran, lokasi_id, aktif, harus_ganti FROM pengguna WHERE id = $1", [pengguna.id],
  );
  if (!akun || !akun.aktif) return { ok: false, pesan: "Akun tidak aktif." };
  if (akun.peran !== "terminal" || !akun.lokasi_id) return { ok: false, pesan: "Hanya akun terminal yang dapat mengisi data." };
  if (akun.lokasi_id !== pengguna.lokasiId) return { ok: false, pesan: "Akun tidak berhak mengisi data lokasi ini." };
  if (akun.harus_ganti) return { ok: false, pesan: "Ganti kata sandi awal terlebih dahulu." };
  return { ok: true, lokasiId: akun.lokasi_id };
}

export async function simpanInput(
  db: Db, pengguna: Pengguna, payload: PayloadSimpan, opsi: { sekarang?: Date; ip?: string | null } = {},
): Promise<HasilSimpan> {
  const hak = await periksaHak(db, pengguna);
  if (!hak.ok) return { ok: false, jenis: "izin", pesan: hak.pesan };
  const lokasiId = hak.lokasiId; // satu-satunya sumber lokasi

  const sekarang = opsi.sekarang ?? new Date();
  const galatPeriode = periodeBolehDiisi(payload.tahun, payload.bulan, sekarang);
  if (galatPeriode) return { ok: false, jenis: "periode", pesan: galatPeriode };

  const skema = await ambilSkema(db);
  const kolom = skema.filter((k) => k.kategori === payload.kategori);
  if (!kolom.length) return { ok: false, jenis: "validasi", pesan: "Kategori tidak dikenal." };
  const petaKolom = new Map(kolom.map((k) => [k.id, k]));

  const asing = Object.keys(payload.nilai).filter((id) => !petaKolom.has(id));
  if (asing.length) {
    return { ok: false, jenis: "validasi", pesan: `Ada ${asing.length} isian yang bukan bagian dari kategori ${payload.kategori}. Permintaan ditolak.` };
  }

  // Urai dan validasi semua angka; satu saja salah, tidak ada yang disimpan.
  const baru = new Map<string, number>();
  const galat: Record<string, string> = {};
  for (const [id, mentah] of Object.entries(payload.nilai)) {
    const h = uraiAngka(mentah);
    if (!h.ok) galat[id] = h.pesan;
    else if (h.nilai !== null) baru.set(id, h.nilai);
  }
  if (Object.keys(galat).length) {
    return { ok: false, jenis: "validasi", pesan: `${Object.keys(galat).length} isian tidak valid.`, galat };
  }

  const idKolom = kolom.map((k) => k.id);
  const lama = new Map<string, { nilai: number; cek: boolean }>();
  for (const r of await db.kueri<{ metrik_id: string; nilai: number; cek: boolean }>(
    "SELECT metrik_id, nilai, cek FROM fakta WHERE lokasi_id = $1 AND tahun = $2 AND bulan = $3 AND metrik_id = ANY($4::text[])",
    [lokasiId, payload.tahun, payload.bulan, idKolom],
  )) lama.set(r.metrik_id, { nilai: Number(r.nilai), cek: r.cek });

  // Nilai yang berubah (baru, diubah, atau dikosongkan).
  const berubah: { id: string; lama: number | null; baru: number | null }[] = [];
  for (const id of idKolom) {
    const a = lama.get(id)?.nilai ?? null;
    const b = baru.get(id) ?? null;
    if (a !== b) berubah.push({ id, lama: a, baru: b });
  }

  // Deteksi nilai janggal terhadap riwayat bulanan lokasi ini (salah satuan / salah koma).
  const kandidat = berubah.filter((b) => b.baru !== null && b.baru > 0);
  const janggal: Janggal[] = [];
  if (kandidat.length) {
    const riwayat = new Map<string, number[]>();
    for (const r of await db.kueri<{ metrik_id: string; nilai: number }>(
      `SELECT metrik_id, nilai FROM fakta
        WHERE lokasi_id = $1 AND metrik_id = ANY($2::text[]) AND bulan > 0 AND nilai > 0
          AND (tahun < $3 OR (tahun = $3 AND bulan < $4))
        ORDER BY tahun DESC, bulan DESC`,
      [lokasiId, kandidat.map((k) => k.id), payload.tahun, payload.bulan],
    )) {
      const daftar = riwayat.get(r.metrik_id) ?? [];
      if (daftar.length < 12) daftar.push(Number(r.nilai));
      riwayat.set(r.metrik_id, daftar);
    }
    for (const k of kandidat) {
      const h = riwayat.get(k.id) ?? [];
      if (h.length < MIN_RIWAYAT_JANGGAL) continue;
      const m = median(h);
      if (m > 0 && (k.baru! >= m * RASIO_JANGGAL || k.baru! <= m / RASIO_JANGGAL)) janggal.push({ metrik: k.id, nilai: k.baru!, pembanding: m });
    }
  }
  const dikonfirmasi = new Set(payload.konfirmasi ?? []);
  const belumDikonfirmasi = janggal.filter((j) => !dikonfirmasi.has(j.metrik));
  if (belumDikonfirmasi.length) {
    return {
      ok: false, jenis: "konfirmasi", perluKonfirmasi: belumDikonfirmasi,
      pesan: `${belumDikonfirmasi.length} nilai jauh berbeda dari biasanya. Periksa satuan dan tanda koma, lalu konfirmasi jika sudah benar.`,
    };
  }
  const idJanggal = new Set(janggal.map((j) => j.metrik));

  const ditulis = [...baru.entries()];
  const dihapus = idKolom.filter((id) => lama.has(id) && !baru.has(id)).length;

  await db.transaksi(async (k) => {
    // 1) hapus isian lama kategori ini; sisa "Tidak Terinci" ikut dihapus HANYA jika ada nilai yang berubah
    await k(
      `DELETE FROM fakta WHERE lokasi_id = $1 AND tahun = $2 AND bulan = $3
         AND (metrik_id = ANY($4::text[]) OR ($5::boolean AND sintetis AND starts_with(metrik_id, $6)))`,
      [lokasiId, payload.tahun, payload.bulan, idKolom, berubah.length > 0, payload.kategori + " > "],
    );
    // 2) tulis ulang (nilai nol tersimpan sebagai isian nol); nilai yang tidak berubah mempertahankan penanda lamanya
    if (ditulis.length) {
      const params: unknown[] = [lokasiId, payload.tahun, payload.bulan];
      const baris = ditulis.map(([id, nilai]) => {
        const kol = petaKolom.get(id)!;
        const berubahIni = berubah.some((b) => b.id === id);
        const cek = berubahIni ? idJanggal.has(id) : (lama.get(id)?.cek ?? false);
        params.push(id, nilai, kol.satuan !== kol.satuanMetrik ? kol.satuan : null, cek);
        const n = params.length;
        return `($1, $2::int, $3::int, $${n - 3}, $${n - 2}::float8, $${n - 1}, $${n}::boolean)`;
      });
      await k(`INSERT INTO fakta (lokasi_id, tahun, bulan, metrik_id, nilai, satuan, cek) VALUES ${baris.join(",")}`, params);
    }
    // 3) catat riwayat perubahan
    if (berubah.length) {
      const params: unknown[] = [pengguna.id, lokasiId, payload.tahun, payload.bulan];
      const baris = berubah.map((b) => {
        params.push(b.id, b.lama, b.baru, idJanggal.has(b.id));
        const n = params.length;
        return `($1::uuid, $2, $3::int, $4::int, $${n - 3}, $${n - 2}::float8, $${n - 1}::float8, $${n}::boolean)`;
      });
      await k(
        `INSERT INTO riwayat_input (pengguna_id, lokasi_id, tahun, bulan, metrik_id, nilai_lama, nilai_baru, dikonfirmasi) VALUES ${baris.join(",")}`,
        params,
      );
    }
    // 4) hitung ulang status "terisi" kategori ini
    const [h] = await k<{ jumlah: number; nonnol: number }>(
      `SELECT count(*)::int AS jumlah, (count(*) FILTER (WHERE f.nilai <> 0))::int AS nonnol
         FROM fakta f JOIN metrik m ON m.id = f.metrik_id
        WHERE f.lokasi_id = $1 AND f.tahun = $2 AND f.bulan = $3 AND m.kategori = $4`,
      [lokasiId, payload.tahun, payload.bulan, payload.kategori],
    );
    if (h.jumlah > 0) {
      await k(
        `INSERT INTO terisi (lokasi_id, tahun, bulan, kategori, jumlah, nonnol) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (lokasi_id, tahun, bulan, kategori) DO UPDATE SET jumlah = EXCLUDED.jumlah, nonnol = EXCLUDED.nonnol`,
        [lokasiId, payload.tahun, payload.bulan, payload.kategori, h.jumlah, h.nonnol],
      );
    } else {
      await k("DELETE FROM terisi WHERE lokasi_id = $1 AND tahun = $2 AND bulan = $3 AND kategori = $4", [lokasiId, payload.tahun, payload.bulan, payload.kategori]);
    }
    await k("UPDATE versi_data SET versi = versi + 1 WHERE id = 1");
    await k("INSERT INTO audit (pengguna_id, aksi, detail, ip) VALUES ($1, 'simpan_input', $2::jsonb, $3)", [
      pengguna.id, JSON.stringify({ lokasi: lokasiId, tahun: payload.tahun, bulan: payload.bulan, kategori: payload.kategori, berubah: berubah.length }), opsi.ip ?? null,
    ]);
  });

  return { ok: true, ditulis: ditulis.length, dihapus, berubah: berubah.length };
}

// ------------------------------------------------------------------ pembacaan untuk formulir

export type DataIsian = {
  lokasiId: string;
  skema: Kolom[];
  /** nilai tersimpan untuk periode yang dipilih */
  nilai: Record<string, number>;
  /** nilai bulan sebelumnya (petunjuk di formulir) */
  sebelumnya: Record<string, number>;
  /** jumlah kolom terisi per kategori pada periode yang dipilih */
  terisi: Record<string, number>;
};

export async function ambilIsian(
  db: Db, pengguna: Pengguna, tahun: number, bulan: number, sekarang = new Date(),
): Promise<{ ok: true; data: DataIsian } | { ok: false; jenis: "izin" | "periode"; pesan: string }> {
  const hak = await periksaHak(db, pengguna);
  if (!hak.ok) return { ok: false, jenis: "izin", pesan: hak.pesan };
  const galat = periodeBolehDiisi(tahun, bulan, sekarang);
  if (galat) return { ok: false, jenis: "periode", pesan: galat };

  const skema = await ambilSkema(db);
  const id = skema.map((k) => k.id);
  const baca = async (th: number, bl: number) => {
    const peta: Record<string, number> = {};
    for (const r of await db.kueri<{ metrik_id: string; nilai: number }>(
      "SELECT metrik_id, nilai FROM fakta WHERE lokasi_id = $1 AND tahun = $2 AND bulan = $3 AND metrik_id = ANY($4::text[])",
      [hak.lokasiId, th, bl, id],
    )) peta[r.metrik_id] = Number(r.nilai);
    return peta;
  };
  const nilai = await baca(tahun, bulan);
  const sebelumnya = bulan === 1 ? await baca(tahun - 1, 12) : await baca(tahun, bulan - 1);

  const terisi: Record<string, number> = {};
  const kategoriDariId = new Map(skema.map((k) => [k.id, k.kategori]));
  for (const mid of Object.keys(nilai)) terisi[kategoriDariId.get(mid)!] = (terisi[kategoriDariId.get(mid)!] ?? 0) + 1;
  return { ok: true, data: { lokasiId: hak.lokasiId, skema, nilai, sebelumnya, terisi } };
}

export { catatAudit };
