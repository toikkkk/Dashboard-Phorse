// Membangun dataset dashboard (format src/lib/tipe.ts) dari database.

import type { Dataset, Fakta, Isi } from "../lib/tipe";
import type { Db } from "./db";

export const KATEGORI = [
  "Lahan Hijau", "Operasional", "Energi", "Emisi", "Sampah", "Air", "Limbah B3", "Biaya Lingkungan",
] as const;

type BarisFakta = {
  lokasi_id: string; tahun: number; bulan: number; metrik_id: string; nilai: number; satuan: string | null; cek: boolean;
};
type BarisTerisi = { lokasi_id: string; tahun: number; bulan: number; kategori: string; jumlah: number; nonnol: number };

const urutKode = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export async function bangunDataset(db: Db): Promise<Dataset> {
  const lokasi = await db.kueri<{ id: string; nama: string; singkat: string; tipe: string; provinsi: string; grade: string | null }>(
    "SELECT id, nama, singkat, tipe, provinsi, grade FROM lokasi ORDER BY urutan",
  );
  const idxLokasi = new Map(lokasi.map((l, i) => [l.id, i]));

  const fakta = await db.kueri<BarisFakta>(
    "SELECT lokasi_id, tahun, bulan, metrik_id, nilai, satuan, cek FROM fakta WHERE nilai <> 0",
  );
  const idMetrik = [...new Set(fakta.map((f) => f.metrik_id))].sort(urutKode);
  const metrikRows = idMetrik.length
    ? await db.kueri<{ id: string; kategori: string; level: string[]; satuan: string }>(
        "SELECT id, kategori, level, satuan FROM metrik WHERE id = ANY($1::text[])",
        [idMetrik],
      )
    : [];
  const metrikPerId = new Map(metrikRows.map((m) => [m.id, m]));
  const idxMetrik = new Map(idMetrik.map((id, i) => [id, i]));

  const terisi = await db.kueri<BarisTerisi>(
    "SELECT lokasi_id, tahun, bulan, kategori, jumlah, nonnol FROM terisi WHERE jumlah > 0",
  );

  // Bulan terakhir tiap tahun bulanan: bulan terakhir yang nilainya sudah diisi oleh sedikitnya separuh lokasi.
  const lokasiTahun = new Map<number, Set<string>>();
  const pengisi = new Map<string, Set<string>>();
  for (const t of terisi) {
    if (t.bulan === 0) continue;
    if (!lokasiTahun.has(t.tahun)) lokasiTahun.set(t.tahun, new Set());
    lokasiTahun.get(t.tahun)!.add(t.lokasi_id);
    if (t.nonnol > 0) {
      const k = `${t.tahun}|${t.bulan}`;
      if (!pengisi.has(k)) pengisi.set(k, new Set());
      pengisi.get(k)!.add(t.lokasi_id);
    }
  }
  const bulanTerakhir: Record<string, number> = {};
  for (const [k, loks] of pengisi) {
    const [th, bln] = k.split("|").map(Number);
    if (loks.size * 2 >= (lokasiTahun.get(th)?.size ?? 0)) bulanTerakhir[String(th)] = Math.max(bulanTerakhir[String(th)] ?? 0, bln);
  }
  const tahunBulanan = Object.keys(bulanTerakhir).map(Number).sort((a, b) => a - b);

  return {
    meta: {
      sumber: "Database",
      dibuat: new Date().toISOString().slice(0, 16),
      tahun: [...new Set(fakta.map((f) => f.tahun))].sort((a, b) => a - b),
      tahunBulanan,
      bulanTerakhir: Object.fromEntries(Object.entries(bulanTerakhir).sort(([a], [b]) => Number(a) - Number(b))),
    },
    kategori: [...KATEGORI],
    lokasi: lokasi.map((l) => ({ id: l.id, nama: l.nama, singkat: l.singkat, tipe: l.tipe, provinsi: l.provinsi, grade: l.grade })),
    metrik: idMetrik.map((id) => {
      const m = metrikPerId.get(id)!;
      return { id, k: m.kategori, s: m.level, u: m.satuan };
    }),
    fakta: fakta.map(
      (f): Fakta => [
        idxLokasi.get(f.lokasi_id)!, f.tahun, f.bulan, idxMetrik.get(f.metrik_id)!, Number(f.nilai), f.satuan ?? null, f.cek ? 1 : 0,
      ],
    ),
    isi: terisi.map((t): Isi => [idxLokasi.get(t.lokasi_id)!, t.tahun, t.bulan, KATEGORI.indexOf(t.kategori as (typeof KATEGORI)[number]), t.jumlah]),
  };
}

const tembolok = new WeakMap<Db, { versi: string; data: Dataset }>();

/** Dataset lengkap; dibangun ulang hanya jika versi data di database berubah. */
export async function ambilDataset(db: Db): Promise<Dataset> {
  const [{ versi }] = await db.kueri<{ versi: string }>("SELECT versi::text AS versi FROM versi_data WHERE id = 1");
  const ada = tembolok.get(db);
  if (ada && ada.versi === versi) return ada.data;
  const data = await bangunDataset(db);
  tembolok.set(db, { versi, data });
  return data;
}
