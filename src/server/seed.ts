// Mengisi database dari data-seed/seed.json (hasil `python -m etl.konversi`).

import { metrikDipakai } from "../lib/panel";
import { jalankanMigrasi, type Db, type Kueri } from "./db";

export type Seed = {
  lokasi: { id: string; nama: string; singkat: string; tipe: string; provinsi: string; grade: string | null; urutan: number }[];
  metrik: {
    id: string; kategori: string; level: string[]; satuan: string; leaf2026: boolean; urutan2026: number | null; satuanSkema: string | null;
  }[];
  /** [lokasi_id, tahun, bulan, metrik_id, nilai, satuan("" = bawaan), cek, sintetis] */
  fakta: [string, number, number, string, number, string, number, number][];
  /** [lokasi_id, tahun, bulan, kategori, jumlah, nonnol] */
  terisi: [string, number, number, string, number, number][];
};

/** Menyisipkan banyak baris sekaligus (dipecah agar tidak melewati batas parameter Postgres). */
export async function sisipBanyak(
  k: Kueri, tabel: string, kolom: [nama: string, cast?: string][], baris: unknown[][], tambahan = "", ukuranBlok = 3000,
): Promise<void> {
  for (let i = 0; i < baris.length; i += ukuranBlok) {
    const blok = baris.slice(i, i + ukuranBlok);
    const params: unknown[] = [];
    const nilai = blok.map((b) => {
      const ph = b.map((v, j) => {
        params.push(v);
        const cast = kolom[j][1];
        return `$${params.length}${cast ? "::" + cast : ""}`;
      });
      return `(${ph.join(",")})`;
    });
    await k(`INSERT INTO ${tabel} (${kolom.map((c) => c[0]).join(",")}) VALUES ${nilai.join(",")} ${tambahan}`, params);
  }
}

export async function isiDatabase(db: Db, seed: Seed, opsi: { reset?: boolean } = {}) {
  await jalankanMigrasi(db);
  const [{ n }] = await db.kueri<{ n: number }>("SELECT count(*)::int AS n FROM lokasi");
  if (n > 0 && !opsi.reset) {
    throw new Error("Database sudah berisi data. Pakai --reset-data untuk menimpa data lingkungan (akun tidak disentuh).");
  }

  await db.transaksi(async (k) => {
    if (opsi.reset) {
      await k("DELETE FROM riwayat_input");
      await k("DELETE FROM fakta");
      await k("DELETE FROM terisi");
    }
    await sisipBanyak(
      k, "lokasi",
      [["id"], ["nama"], ["singkat"], ["tipe"], ["provinsi"], ["grade"], ["urutan", "int"]],
      seed.lokasi.map((l) => [l.id, l.nama, l.singkat, l.tipe, l.provinsi, l.grade, l.urutan]),
      "ON CONFLICT (id) DO UPDATE SET nama = EXCLUDED.nama, singkat = EXCLUDED.singkat, tipe = EXCLUDED.tipe, provinsi = EXCLUDED.provinsi, grade = EXCLUDED.grade, urutan = EXCLUDED.urutan",
    );

    const metrik = seed.metrik.map((m) => {
      const input = m.leaf2026 && metrikDipakai({ k: m.kategori, s: m.level, u: m.satuan });
      // Beban pencemaran dilaporkan sebagai konsentrasi (mg/L), bukan ton.
      const satuanInput = m.level[0] === "Beban Pencemaran" ? "mg/L" : (m.satuanSkema ?? m.satuan);
      return [m.id, m.kategori, m.level, m.satuan, input, input ? m.urutan2026 : null, input ? satuanInput : null];
    });
    await sisipBanyak(
      k, "metrik",
      [["id"], ["kategori"], ["level", "text[]"], ["satuan"], ["bisa_input", "boolean"], ["urutan_input", "int"], ["satuan_input"]],
      metrik,
      "ON CONFLICT (id) DO UPDATE SET kategori = EXCLUDED.kategori, level = EXCLUDED.level, satuan = EXCLUDED.satuan, bisa_input = EXCLUDED.bisa_input, urutan_input = EXCLUDED.urutan_input, satuan_input = EXCLUDED.satuan_input",
    );

    await sisipBanyak(
      k, "fakta",
      [["lokasi_id"], ["tahun", "int"], ["bulan", "int"], ["metrik_id"], ["nilai", "float8"], ["satuan"], ["cek", "boolean"], ["sintetis", "boolean"]],
      seed.fakta.map((f) => [f[0], f[1], f[2], f[3], f[4], f[5] || null, f[6] === 1, f[7] === 1]),
      "", 3000,
    );
    await sisipBanyak(
      k, "terisi",
      [["lokasi_id"], ["tahun", "int"], ["bulan", "int"], ["kategori"], ["jumlah", "int"], ["nonnol", "int"]],
      seed.terisi,
    );
    await k("UPDATE versi_data SET versi = versi + 1 WHERE id = 1");
  });
}
