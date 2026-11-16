// Pembuktian impor: dataset yang dibangun dari database harus identik dengan dashboard.json lama
// (yang dihasilkan langsung oleh ETL dan sudah diverifikasi). Memakai database di memori.

import { readFileSync } from "node:fs";
import { buatDb } from "../src/server/db";
import { bangunDataset } from "../src/server/dataset";
import { isiDatabase, type Seed } from "../src/server/seed";
import type { Dataset } from "../src/lib/tipe";

const seed = JSON.parse(readFileSync("data-seed/seed.json", "utf8")) as Seed;
const lama = JSON.parse(readFileSync("data-seed/dashboard-lama.json", "utf8")) as Dataset;

const db = await buatDb({ pgliteDir: null });
await isiDatabase(db, seed);
const baru = await bangunDataset(db);

let gagal = 0;
const cek = (nama: string, a: unknown, b: unknown) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (!ok) gagal++;
  console.log(`${ok ? "OK    " : "BEDA  "} ${nama}`);
  if (!ok) console.log("   lama:", JSON.stringify(a).slice(0, 300), "\n   baru:", JSON.stringify(b).slice(0, 300));
};

cek("kategori", lama.kategori, baru.kategori);
cek("lokasi", lama.lokasi, baru.lokasi);
cek("meta.tahun", lama.meta.tahun, baru.meta.tahun);
cek("meta.tahunBulanan", lama.meta.tahunBulanan, baru.meta.tahunBulanan);
cek("meta.bulanTerakhir", lama.meta.bulanTerakhir, baru.meta.bulanTerakhir);
cek("metrik (id, kategori, jalur, satuan)", lama.metrik, baru.metrik);

// Fakta dan isi dibandingkan sebagai himpunan (urutan baris tidak penting). Dashboard lama membulatkan ke 6 desimal;
// database menyimpan presisi penuh, jadi nilai dibandingkan pada 6 desimal.
const kunciFakta = (d: Dataset) =>
  d.fakta.map((f) => `${d.lokasi[f[0]].id}|${f[1]}|${f[2]}|${d.metrik[f[3]].id}|${f[4].toFixed(6)}|${f[5] ?? ""}|${f[6]}`).sort();
const kunciIsi = (d: Dataset) => d.isi.map((i) => `${d.lokasi[i[0]].id}|${i[1]}|${i[2]}|${d.kategori[i[3]]}|${i[4]}`).sort();
cek(`fakta (${lama.fakta.length} vs ${baru.fakta.length} nilai)`, kunciFakta(lama), kunciFakta(baru));
cek(`isi (${lama.isi.length} vs ${baru.isi.length} baris)`, kunciIsi(lama), kunciIsi(baru));

console.log(gagal === 0 ? "\nSEMUA SAMA: impor ke database tidak mengubah satu angka pun." : `\n${gagal} bagian berbeda.`);
await db.tutup();
process.exit(gagal === 0 ? 0 : 1);
