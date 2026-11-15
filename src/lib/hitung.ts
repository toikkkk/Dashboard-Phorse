import { BULAN } from "./format";
import type { Dataset, Fakta, Filter, Metrik } from "./tipe";

export type Pilih = (m: Metrik) => boolean;

/**
 * Definisi satu ukuran: metrik mana yang dijumlah dan dalam satuan apa.
 * satuan "*" = semua satuan (hanya untuk menampilkan nilai apa adanya, jangan dijumlah).
 */
export type Ukuran = { pilih: Pilih; satuan: string };

const tembolok = new WeakMap<Dataset, WeakMap<Ukuran, Fakta[]>>();

export function satuanFakta(d: Dataset, f: Fakta): string {
  return f[5] ?? d.metrik[f[3]].u;
}

/** Baris fakta yang termasuk ukuran ini (di-cache per dataset). */
export function barisUkuran(d: Dataset, u: Ukuran): Fakta[] {
  let perData = tembolok.get(d);
  if (!perData) {
    perData = new WeakMap();
    tembolok.set(d, perData);
  }
  let baris = perData.get(u);
  if (!baris) {
    const cocok = d.metrik.map((m) => u.pilih(m));
    baris = d.fakta.filter((f) => cocok[f[3]] && (u.satuan === "*" || satuanFakta(d, f) === u.satuan));
    perData.set(u, baris);
  }
  return baris;
}

export type Hasil = { nilai: number; cek: number };

/**
 * Nilai per lokasi untuk filter tahun/bulan. `cek` = jumlah nilai yang ditandai "perlu dicek".
 * `sampaiBulan` membatasi penjumlahan setahun penuh ke Jan..sampaiBulan (untuk pembanding setara).
 */
export function perLokasi(
  d: Dataset, f: Filter, u: Ukuran, opsi: { sampaiBulan?: number } = {},
): { nilai: number[]; cek: number[]; nilaiCek: number[] } {
  const n = d.lokasi.length;
  const nilai = new Array<number>(n).fill(0);
  const cek = new Array<number>(n).fill(0);
  const nilaiCek = new Array<number>(n).fill(0);
  for (const r of barisUkuran(d, u)) {
    if (r[1] !== f.tahun || (f.lokasi !== null && r[0] !== f.lokasi)) continue;
    if (f.bulan && r[2] !== f.bulan) continue;
    if (!f.bulan && opsi.sampaiBulan && r[2] > opsi.sampaiBulan) continue;
    nilai[r[0]] += r[4];
    cek[r[0]] += r[6];
    if (r[6]) nilaiCek[r[0]] += r[4];
  }
  return { nilai, cek, nilaiCek };
}

export function total(d: Dataset, f: Filter, u: Ukuran): Hasil {
  const p = perLokasi(d, f, u);
  return { nilai: p.nilai.reduce((a, b) => a + b, 0), cek: p.cek.reduce((a, b) => a + b, 0) };
}

/** 12 nilai (Jan–Des) untuk satu tahun bulanan. `lokasiBoleh` membatasi lokasi yang dijumlah. */
export function perBulan(
  d: Dataset, tahun: number, lokasi: number | null, u: Ukuran, lokasiBoleh?: Set<number>,
): Hasil[] {
  const out: Hasil[] = Array.from({ length: 12 }, () => ({ nilai: 0, cek: 0 }));
  for (const r of barisUkuran(d, u)) {
    if (r[1] !== tahun || r[2] === 0 || (lokasi !== null && r[0] !== lokasi)) continue;
    if (lokasiBoleh && !lokasiBoleh.has(r[0])) continue;
    out[r[2] - 1].nilai += r[4];
    out[r[2] - 1].cek += r[6];
  }
  return out;
}

/** Satu nilai per tahun, sejajar dengan d.meta.tahun. */
export function perTahun(d: Dataset, lokasi: number | null, u: Ukuran): Hasil[] {
  return d.meta.tahun.map((tahun) => total(d, { tahun, bulan: 0, lokasi }, u));
}

/** Jumlah lokasi yang sel input kategorinya terisi pada periode ini. */
export function pelapor(d: Dataset, f: Filter, kategori: string): number {
  const k = d.kategori.indexOf(kategori);
  const lokasi = new Set<number>();
  for (const r of d.isi) {
    if (r[3] !== k || r[1] !== f.tahun) continue;
    if (f.bulan && r[2] !== f.bulan) continue;
    if (f.lokasi !== null && r[0] !== f.lokasi) continue;
    lokasi.add(r[0]);
  }
  return lokasi.size;
}

const tembolokAkhir = new WeakMap<Dataset, Map<string, number>>();

/**
 * Bulan terakhir yang benar-benar sudah diisi untuk satu kategori pada tahun bulanan.
 * Tahun penuh bisa saja punya kategori yang berhenti di tengah jalan (mis. Emisi 2025 hanya sampai Agustus).
 * Aturan: bulan terakhir yang jumlah lokasi pengisinya lebih dari 20% dari puncak tahun itu.
 */
export function bulanTerakhirKategori(d: Dataset, tahun: number, kategori: string): number {
  const akhirTahun = d.meta.bulanTerakhir[String(tahun)] ?? 12;
  if (!tahunBulanan(d, tahun)) return 12;
  let perData = tembolokAkhir.get(d);
  if (!perData) {
    perData = new Map();
    tembolokAkhir.set(d, perData);
  }
  const kunci = `${tahun}|${kategori}`;
  const ada = perData.get(kunci);
  if (ada !== undefined) return ada;
  const k = d.kategori.indexOf(kategori);
  const perBln: Set<number>[] = Array.from({ length: 13 }, () => new Set<number>());
  for (const r of d.isi) if (r[3] === k && r[1] === tahun && r[2] > 0) perBln[r[2]].add(r[0]);
  const jumlah = perBln.map((s) => s.size);
  const puncak = Math.max(...jumlah.slice(1, akhirTahun + 1), 0);
  let akhir = akhirTahun;
  if (puncak > 0) {
    akhir = 0;
    for (let m = 1; m <= akhirTahun; m++) if (jumlah[m] > 0.2 * puncak) akhir = m;
  }
  perData.set(kunci, akhir);
  return akhir;
}

/** Lokasi yang mengisi kategori ini di tahun tersebut (bulan mana pun). */
export function lokasiMelaporTahun(d: Dataset, tahun: number, kategori: string): Set<number> {
  const k = d.kategori.indexOf(kategori);
  const s = new Set<number>();
  for (const r of d.isi) if (r[3] === k && r[1] === tahun) s.add(r[0]);
  return s;
}

/** Tahun terakhir yang sudah terisi penuh (tahun berjalan yang baru sebagian diabaikan). */
export function tahunLengkapTerakhir(d: Dataset): number {
  const lengkap = d.meta.tahun.filter((t) => (d.meta.bulanTerakhir[String(t)] ?? 12) >= 12);
  return lengkap.length ? Math.max(...lengkap) : Math.max(...d.meta.tahun);
}

/** Kategori data dari metrik pertama yang cocok dengan ukuran ini. */
export function kategoriUkuran(d: Dataset, u: Ukuran): string | null {
  for (const m of d.metrik) if (u.pilih(m)) return m.k;
  return null;
}

export type Saran = { jenis: "semuaBulan" } | { jenis: "tahun"; tahun: number };

/**
 * Petunjuk saat suatu kategori kosong pada filter sekarang:
 * - kategori terisi di tahun ini tetapi tidak di bulan yang dipilih → "tampilkan semua bulan";
 * - selain itu → tahun terdekat (paling baru) yang ada isinya untuk lokasi ini.
 */
export function sarankanData(d: Dataset, f: Filter, kategori: string): Saran | null {
  const k = d.kategori.indexOf(kategori);
  if (k < 0) return null;
  const tahunIsi = new Set<number>();
  let tahunIniAda = false;
  for (const r of d.isi) {
    if (r[3] !== k || (f.lokasi !== null && r[0] !== f.lokasi)) continue;
    if (r[1] === f.tahun) tahunIniAda = true;
    else tahunIsi.add(r[1]);
  }
  if (f.bulan && tahunIniAda) return { jenis: "semuaBulan" };
  if (!tahunIsi.size) return null;
  return { jenis: "tahun", tahun: Math.max(...tahunIsi) };
}

export function tahunBulanan(d: Dataset, tahun: number): boolean {
  return d.meta.tahunBulanan.includes(tahun);
}

// ------------------------------------------------------------------ perbandingan antar-periode

type Periode = { tahunLalu: number; bulan: number; sampaiCur: number; sampaiLalu: number; label: string };

/**
 * Periode pembanding yang setara dengan filter sekarang:
 * - satu bulan → bulan yang sama tahun lalu;
 * - tahun berjalan (Jan–Okt) → Jan–Okt tahun lalu;
 * - tahun penuh → tahun lalu penuh.
 * Mengembalikan alasan jika tidak ada pembanding yang adil (mis. tahun lalu hanya tersedia per tahun).
 */
export function periodePembanding(d: Dataset, f: Filter, kategori: string): Periode | { alasan: string } {
  const tahunLalu = f.tahun - 1;
  if (!d.meta.tahun.includes(tahunLalu)) return { alasan: `Belum ada data ${tahunLalu} untuk dibandingkan` };
  const laluBulanan = tahunBulanan(d, tahunLalu);
  const curBulanan = tahunBulanan(d, f.tahun);
  // Batas bulan mengikuti kategori ini, bukan sekadar tahunnya (kategori bisa berhenti lebih awal).
  const akhir = Math.min(d.meta.bulanTerakhir[String(f.tahun)] ?? 12, bulanTerakhirKategori(d, f.tahun, kategori));
  if (f.bulan > 0) {
    if (!laluBulanan) return { alasan: `Data ${tahunLalu} hanya tersedia per tahun, tidak bisa dibandingkan per bulan` };
    return { tahunLalu, bulan: f.bulan, sampaiCur: 0, sampaiLalu: 0, label: `${BULAN[f.bulan - 1]} ${tahunLalu}` };
  }
  if (curBulanan && !laluBulanan && akhir < 12) {
    return { alasan: `${f.tahun} baru terisi sampai ${BULAN[akhir - 1]}, sedangkan ${tahunLalu} hanya tersedia per tahun` };
  }
  const sampai = curBulanan && laluBulanan && akhir < 12 ? akhir : 0;
  return {
    tahunLalu, bulan: 0, sampaiCur: sampai, sampaiLalu: sampai,
    label: sampai ? `Jan–${BULAN[sampai - 1]} ${tahunLalu}` : String(tahunLalu),
  };
}

function himpunanMelapor(d: Dataset, tahun: number, bulan: number, sampai: number, kategori: number): Set<number> {
  const s = new Set<number>();
  for (const r of d.isi) {
    if (r[3] !== kategori || r[1] !== tahun) continue;
    if (r[2] !== 0) {
      if (bulan && r[2] !== bulan) continue;
      if (!bulan && sampai && r[2] > sampai) continue;
    }
    s.add(r[0]);
  }
  return s;
}

type IndUkur = {
  ukuran: Ukuran;
  kategori: string;
  /** True = lokasi dianggap melapor hanya jika ada nilai bukan nol pada ukuran ini (untuk kategori yang kolomnya terpisah-pisah, mis. Emisi). */
  laporDariNilai?: boolean;
};

function himpunanBernilai(d: Dataset, u: Ukuran, tahun: number, bulan: number, sampai: number): Set<number> {
  const s = new Set<number>();
  for (const r of barisUkuran(d, u)) {
    if (r[1] !== tahun || r[4] === 0) continue;
    if (r[2] !== 0) {
      if (bulan && r[2] !== bulan) continue;
      if (!bulan && sampai && r[2] > sampai) continue;
    }
    s.add(r[0]);
  }
  return s;
}

function himpunan(d: Dataset, ind: IndUkur, tahun: number, bulan: number, sampai: number): Set<number> {
  return ind.laporDariNilai
    ? himpunanBernilai(d, ind.ukuran, tahun, bulan, sampai)
    : himpunanMelapor(d, tahun, bulan, sampai, d.kategori.indexOf(ind.kategori));
}

/** Jumlah lokasi yang melapor untuk indikator ini pada filter sekarang. */
export function jumlahPelapor(d: Dataset, f: Filter, ind: IndUkur): number {
  if (!ind.laporDariNilai) return pelapor(d, f, ind.kategori);
  const s = himpunanBernilai(d, ind.ukuran, f.tahun, f.bulan, 0);
  return f.lokasi !== null ? (s.has(f.lokasi) ? 1 : 0) : s.size;
}

export type Banding = {
  /** Total periode ini dan periode pembanding, hanya pada lokasi yang melapor di keduanya. */
  nilai: number;
  lalu: number;
  persen: number | null;
  lokasiSama: number;
  label: string;
  /** True jika lebih dari 20% total berasal dari nilai yang ditandai "perlu dicek" — persen sebaiknya tidak dipercaya begitu saja. */
  ragu: boolean;
  /** Porsi (0–1) nilai "perlu dicek" terhadap total kedua periode. */
  porsiCek: number;
};

/**
 * Perubahan dibanding periode setara tahun lalu. Dihitung hanya pada lokasi yang melapor di
 * kedua periode, supaya kenaikan/penurunan tidak sekadar akibat jumlah lokasi yang mengisi berubah.
 */
export function banding(d: Dataset, f: Filter, ind: IndUkur): Banding | { alasan: string } {
  const p = periodePembanding(d, f, ind.kategori);
  if ("alasan" in p) return p;
  const sekarang = himpunan(d, ind, f.tahun, f.bulan, p.sampaiCur);
  const lalu = himpunan(d, ind, p.tahunLalu, p.bulan, p.sampaiLalu);
  const sama = [...sekarang].filter((l) => lalu.has(l) && (f.lokasi === null || l === f.lokasi));
  if (!sama.length) return { alasan: "Tidak ada lokasi yang melapor di kedua periode" };
  const a = perLokasi(d, { ...f, lokasi: null }, ind.ukuran, { sampaiBulan: p.sampaiCur });
  const b = perLokasi(d, { tahun: p.tahunLalu, bulan: p.bulan, lokasi: null }, ind.ukuran, { sampaiBulan: p.sampaiLalu });
  let x = 0;
  let y = 0;
  let cek = 0;
  for (const l of sama) {
    x += a.nilai[l];
    y += b.nilai[l];
    cek += a.nilaiCek[l] + b.nilaiCek[l];
  }
  const porsiCek = x + y > 0 ? cek / (x + y) : 0;
  return {
    nilai: x, lalu: y, persen: y > 0 ? ((x - y) / y) * 100 : null, lokasiSama: sama.length, label: p.label,
    ragu: porsiCek > 0.2, porsiCek,
  };
}

/** Perubahan persen per lokasi (null jika lokasi tidak melapor di kedua periode atau pembanding nol). */
export function bandingPerLokasi(
  d: Dataset, f: Filter, ind: IndUkur,
): { persen: (number | null)[]; label: string } | { alasan: string } {
  const p = periodePembanding(d, f, ind.kategori);
  if ("alasan" in p) return p;
  const sekarang = himpunan(d, ind, f.tahun, f.bulan, p.sampaiCur);
  const lalu = himpunan(d, ind, p.tahunLalu, p.bulan, p.sampaiLalu);
  const a = perLokasi(d, { ...f, lokasi: null }, ind.ukuran, { sampaiBulan: p.sampaiCur }).nilai;
  const b = perLokasi(d, { tahun: p.tahunLalu, bulan: p.bulan, lokasi: null }, ind.ukuran, { sampaiBulan: p.sampaiLalu }).nilai;
  return {
    persen: d.lokasi.map((_, i) => (sekarang.has(i) && lalu.has(i) && b[i] > 0 ? ((a[i] - b[i]) / b[i]) * 100 : null)),
    label: p.label,
  };
}
