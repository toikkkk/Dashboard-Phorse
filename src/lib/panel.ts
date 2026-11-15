// Definisi isi dashboard: indikator utama, panel grafik, dan parameter mutu air.
// Semua pemilihan metrik berbasis jalur metrik_id hasil ETL (lihat etl/README.md).

import { barisUkuran, type Pilih, type Ukuran } from "./hitung";
import type { Dataset, Metrik } from "./tipe";

const WARNA = [
  "var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)",
  "var(--series-5)", "var(--series-6)", "var(--series-7)", "var(--series-8)",
];
export const NETRAL = "var(--netral)";
const LABEL_NETRAL = new Set(["Tidak terinci", "Lainnya", "Lainnya / tidak terinci"]);

export type Seri = { kunci: string; label: string; ukuran: Ukuran; warna: string };
type Dinamis = { dasar: Pilih; label: (m: Metrik) => string; maks: number };
export type Panel = {
  id: string;
  judul: string;
  satuan: string;
  jenis: "tumpuk" | "garis";
  seri: Seri[] | Dinamis;
  catatan?: string;
};

/** Warna diberikan berurutan dan tetap per seri; seri "sisa" selalu abu-abu netral. */
function seri(satuan: string, defs: [label: string, pilih: Pilih][]): Seri[] {
  let slot = 0;
  return defs.map(([label, pilih], i) => ({
    kunci: `s${i}`,
    label,
    ukuran: { pilih, satuan },
    warna: LABEL_NETRAL.has(label) ? NETRAL : WARNA[slot++ % WARNA.length],
  }));
}

const dinamisCache = new WeakMap<Dataset, Map<string, Seri[]>>();

/** Seri panel; untuk panel dinamis, N label terbesar (seluruh periode) + sisanya digabung. */
export function seriPanel(d: Dataset, p: Panel): Seri[] {
  if (Array.isArray(p.seri)) return p.seri;
  let perData = dinamisCache.get(d);
  if (!perData) {
    perData = new Map();
    dinamisCache.set(d, perData);
  }
  const ada = perData.get(p.id);
  if (ada) return ada;
  const { dasar, label, maks } = p.seri;
  const jumlah = new Map<string, number>();
  for (const f of barisUkuran(d, { pilih: dasar, satuan: p.satuan })) {
    const l = label(d.metrik[f[3]]);
    jumlah.set(l, (jumlah.get(l) ?? 0) + f[4]);
  }
  const utama = [...jumlah.entries()]
    .filter(([l]) => l !== "Tidak Terinci")
    .sort((a, b) => b[1] - a[1])
    .slice(0, maks)
    .map(([l]) => l);
  const setUtama = new Set(utama);
  const defs: [string, Pilih][] = utama.map((l) => [l, (m) => dasar(m) && label(m) === l]);
  if (jumlah.size > utama.length) {
    defs.push(["Lainnya / tidak terinci", (m) => dasar(m) && !setUtama.has(label(m))]);
  }
  const hasil = seri(p.satuan, defs);
  perData.set(p.id, hasil);
  return hasil;
}

// ------------------------------------------------------------------ pemilih metrik

const di = (k: string, ...awal: string[]): Pilih => (m) => m.k === k && awal.every((a, i) => m.s[i] === a);
const memuat = (k: string, awal: string, seg: string): Pilih => (m) =>
  m.k === k && m.s[0] === awal && m.s.includes(seg);
const terakhir = (m: Metrik) => m.s[m.s.length - 1];

const KEGIATAN = ["Kegiatan Operasi", "Kegiatan Penunjang Operasi", "Kegiatan Penunjang Non Operasi"];
const LABEL_KEGIATAN = ["Operasi", "Penunjang operasi", "Penunjang non-operasi"];
const solarCell = (m: Metrik) => m.s.some((x) => x.includes("Solar Cell"));
const listrik: Pilih = (m) => m.k === "Energi" && !solarCell(m);
const emisi = (scope: string, gas: (g: string) => boolean): Pilih => (m) =>
  m.k === "Emisi" && m.s[0].startsWith("Kegiatan") && m.s[1] === scope && gas(m.s[2] ?? "");

export const U = {
  penyaluran: { pilih: di("Operasional", "Penyaluran"), satuan: "kL" },
  listrik: { pilih: listrik, satuan: "MWh" },
  bbmOwnUse: { pilih: di("Energi"), satuan: "kL" },
  co2Scope1: { pilih: emisi("GHG Scope 1", (g) => g === "CO2"), satuan: "ton" },
  co2Scope2: { pilih: emisi("GHG Scope 2", (g) => g === "CO2"), satuan: "ton" },
  co2: { pilih: (m) => m.k === "Emisi" && m.s[0].startsWith("Kegiatan") && m.s[2] === "CO2", satuan: "ton" },
  sampahDihasilkan: { pilih: di("Sampah", "Dihasilkan"), satuan: "ton" },
  airDiambil: { pilih: di("Air", "Pengambilan Air"), satuan: "m3" },
  b3Dihasilkan: { pilih: di("Limbah B3", "Dihasilkan"), satuan: "ton" },
  biaya: { pilih: di("Biaya Lingkungan"), satuan: "Rp" },
} satisfies Record<string, Ukuran>;

// ------------------------------------------------------------------ panel grafik

const GRUP_BBM: [string, string][] = [
  ["Gasoline", "Gasoline"],
  ["Gasoil", "Gasoil"],
  ["Avtur/LPG", "Avtur/LPG"],
  ["Minyak berat", "Minyak Berat"],
  ["Lube base, bitumen, dll.", "Lube Base/Aditif/Bitumen/FAME/Ethanol"],
];

const PANEL = {
  penyaluranProduk: {
    id: "penyaluran-produk",
    judul: "Penyaluran BBM per kelompok produk",
    satuan: "kL",
    jenis: "tumpuk",
    seri: seri("kL", GRUP_BBM.map(([label, g]) => [label, memuat("Operasional", "Penyaluran", g)])),
  },
  listrikKegiatan: {
    id: "listrik-kegiatan",
    judul: "Konsumsi listrik per kegiatan",
    satuan: "MWh",
    jenis: "tumpuk",
    seri: seri("MWh", KEGIATAN.map((k, i) => [LABEL_KEGIATAN[i], (m) => listrik(m) && m.s[0] === k])),
    catatan: "Tidak termasuk listrik solar cell / energi hijau.",
  },
  bbmKegiatan: {
    id: "bbm-kegiatan",
    judul: "BBM & pelumas pemakaian sendiri per kegiatan",
    satuan: "kL",
    jenis: "tumpuk",
    seri: seri("kL", KEGIATAN.map((k, i) => [LABEL_KEGIATAN[i], di("Energi", k)])),
  },
  co2Scope: {
    id: "co2-scope",
    judul: "Emisi CO₂ per scope",
    satuan: "ton",
    jenis: "tumpuk",
    seri: seri("ton", [
      ["Scope 1", U.co2Scope1.pilih],
      ["Scope 2", U.co2Scope2.pilih],
    ]),
    catatan: "Nilai emisi sesuai isian di Excel, tidak dihitung ulang.",
  },
  nonGhg: {
    id: "non-ghg",
    judul: "Emisi non-GHG",
    satuan: "ton",
    jenis: "garis",
    seri: seri("ton", [
      ["NOx", emisi("Non GHG", (g) => g === "NOx")],
      ["SOx", emisi("Non GHG", (g) => g === "SOx")],
      ["PM", emisi("Non GHG", (g) => g === "PM")],
      ["VOC", emisi("Non GHG", (g) => g.startsWith("VOC"))],
    ]),
  },
  sampahJenis: {
    id: "sampah-jenis",
    judul: "Sampah dihasilkan per jenis",
    satuan: "ton",
    jenis: "tumpuk",
    seri: seri("ton", [
      ...["Rumput/Daun", "Sisa Makanan", "Kertas", "Plastik", "Logam", "Lainnya/Residu"].map(
        (j): [string, Pilih] => [j === "Lainnya/Residu" ? "Residu & lainnya" : j, di("Sampah", "Dihasilkan", j)],
      ),
      ["Tidak terinci", di("Sampah", "Dihasilkan", "Tidak Terinci")],
    ]),
  },
  sampahMetode: {
    id: "sampah-metode",
    judul: "Sampah dikelola per metode",
    satuan: "ton",
    jenis: "tumpuk",
    seri: seri("ton", [
      ["Reduce", di("Sampah", "Dikelola", "Reduce")],
      ["Reuse & recycle", di("Sampah", "Dikelola", "Reuse & Recycle")],
      ["Dibuang ke pihak ketiga", di("Sampah", "Dikelola", "Dibuang ke Pihak Ketiga")],
      ["Metode lain", di("Sampah", "Dikelola", "Lainnya")],
      ["Tidak terinci", di("Sampah", "Dikelola", "Tidak Terinci")],
    ]),
  },
  airSumber: {
    id: "air-sumber",
    judul: "Pengambilan air per sumber",
    satuan: "m3",
    jenis: "tumpuk",
    seri: seri("m3", ["Air Permukaan", "Air Laut", "Air Tanah", "PDAM/Pihak Ketiga"].map(
      (s): [string, Pilih] => [s, (m) => di("Air", "Pengambilan Air")(m) && m.s[2] === s],
    )),
  },
  effluent: {
    id: "effluent",
    judul: "Debit effluent air limbah",
    satuan: "m3",
    jenis: "tumpuk",
    seri: seri("m3", [
      ["Operasional", di("Air", "Effluent Air Limbah", "Operasional")],
      ["Domestik", di("Air", "Effluent Air Limbah", "Domestik")],
    ]),
  },
  b3Kode: {
    id: "b3-kode",
    judul: "Limbah B3 dihasilkan per kode limbah",
    satuan: "ton",
    jenis: "tumpuk",
    seri: { dasar: U.b3Dihasilkan.pilih, label: terakhir, maks: 6 },
  },
  b3Metode: {
    id: "b3-metode",
    judul: "Limbah B3 dikelola per metode",
    satuan: "ton",
    jenis: "tumpuk",
    seri: seri("ton", [
      ["Reduce", di("Limbah B3", "Dikelola", "Reduce")],
      ["Reuse & recycle", di("Limbah B3", "Dikelola", "Reuse & Recycle")],
      ["Disimpan di TPS LB3", di("Limbah B3", "Dikelola", "Disimpan di TPS LB3")],
      ["Alternatif raw material", memuat("Limbah B3", "Dikelola", "Alternatif Raw Material")],
      ["Alternatif fuel", memuat("Limbah B3", "Dikelola", "Alternatif Fuel")],
      ["Insinerasi / treatment lain", memuat("Limbah B3", "Dikelola", "Insinerasi/Treatment Lainnya")],
      ["Landfill", memuat("Limbah B3", "Dikelola", "Landfill")],
    ]),
  },
  biayaAktivitas: {
    id: "biaya-aktivitas",
    judul: "Biaya pengelolaan lingkungan per aktivitas",
    satuan: "Rp",
    jenis: "tumpuk",
    seri: { dasar: U.biaya.pilih, label: (m) => m.s[0] ?? "Tidak Terinci", maks: 6 },
  },
} satisfies Record<string, Panel>;

// ------------------------------------------------------------------ indikator utama

export type Indikator = {
  id: string;
  label: string;
  /** Nama pendek untuk pemilih indikator. */
  singkat: string;
  kategori: string;
  ukuran: Ukuran;
  /** "turun" = lebih rendah lebih baik (beban lingkungan); "netral" = naik/turun tidak otomatis baik atau buruk. */
  arah: "turun" | "netral";
  /** Penjelasan singkat agar pembaca tahu persis apa yang dihitung. */
  definisi: string;
  /** Dipakai sebagai konteks aktivitas, bukan hasil lingkungan. */
  konteks?: boolean;
  /** Lokasi dianggap melapor hanya jika nilai indikator ini terisi (bukan sekadar kategorinya). */
  laporDariNilai?: boolean;
  /** false = hanya muncul di halaman Data ESG, tidak di kartu Beranda. */
  beranda?: boolean;
  /** Cara lain melihat indikator yang sama (komposisi berbeda), ditampilkan dalam satu kartu. */
  tampilan: { label: string; panel: Panel }[];
};

export const INDIKATOR: Indikator[] = [
  {
    id: "penyaluran", label: "Penyaluran BBM", singkat: "Penyaluran BBM", kategori: "Operasional",
    ukuran: U.penyaluran, arah: "netral", konteks: true,
    definisi: "Volume BBM dan produk lain yang disalurkan (pipa, kapal, RTW, MT, bunker kapal, drum). Dipakai sebagai konteks aktivitas: pemakaian energi, sampah, dan emisi umumnya ikut naik-turun bersama volume ini.",
    tampilan: [{ label: "Per kelompok produk", panel: PANEL.penyaluranProduk }],
  },
  {
    id: "emisi", label: "Emisi CO₂", singkat: "Emisi CO₂", kategori: "Emisi",
    ukuran: U.co2, arah: "turun", laporDariNilai: true,
    definisi: "Total CO₂ Scope 1 dan Scope 2 dari kegiatan operasi, penunjang operasi, dan non-operasi, sesuai isian di Excel (tidak dihitung ulang).",
    tampilan: [
      { label: "CO₂ per scope", panel: PANEL.co2Scope },
      { label: "Emisi non-GHG", panel: PANEL.nonGhg },
    ],
  },
  {
    id: "listrik", label: "Konsumsi listrik", singkat: "Listrik", kategori: "Energi",
    ukuran: U.listrik, arah: "turun",
    definisi: "Listrik yang dipakai untuk pompa produk, NGS, kantor, penerangan, peralatan penunjang, rumah dinas, dan sarana lain. Tidak termasuk listrik solar cell / energi hijau.",
    tampilan: [{ label: "Per kegiatan", panel: PANEL.listrikKegiatan }],
  },
  {
    id: "bbm", label: "BBM & pelumas pemakaian sendiri", singkat: "BBM pakai sendiri", kategori: "Energi",
    ukuran: U.bbmOwnUse, arah: "turun",
    definisi: "BBM dan pelumas yang dipakai sendiri oleh operasi: pompa produk, genset, pompa PMK, dapur, kendaraan operasional, dan alat babat rumput.",
    tampilan: [{ label: "Per kegiatan", panel: PANEL.bbmKegiatan }],
  },
  {
    id: "sampah", label: "Sampah dihasilkan", singkat: "Sampah", kategori: "Sampah",
    ukuran: U.sampahDihasilkan, arah: "turun",
    definisi: "Sampah umum yang dihasilkan: rumput/daun, sisa makanan, kertas, plastik, logam, dan residu. Tampilan kedua menunjukkan bagaimana sampah itu dikelola.",
    tampilan: [
      { label: "Per jenis", panel: PANEL.sampahJenis },
      { label: "Cara pengelolaan", panel: PANEL.sampahMetode },
    ],
  },
  {
    id: "b3", label: "Limbah B3 dihasilkan", singkat: "Limbah B3", kategori: "Limbah B3",
    ukuran: U.b3Dihasilkan, arah: "turun",
    definisi: "Limbah bahan berbahaya dan beracun yang dihasilkan, per kode limbah. Tampilan kedua menunjukkan cara pengelolaannya.",
    tampilan: [
      { label: "Per kode limbah", panel: PANEL.b3Kode },
      { label: "Cara pengelolaan", panel: PANEL.b3Metode },
    ],
  },
  {
    id: "air", label: "Pengambilan air", singkat: "Air", kategori: "Air",
    ukuran: U.airDiambil, arah: "turun",
    definisi: "Air yang diambil dari permukaan, laut, tanah, atau PDAM/pihak ketiga untuk kegiatan operasi dan penunjang. Tampilan kedua menunjukkan debit air limbah (effluent).",
    tampilan: [
      { label: "Per sumber", panel: PANEL.airSumber },
      { label: "Air limbah (effluent)", panel: PANEL.effluent },
    ],
  },
  {
    id: "biaya", label: "Biaya pengelolaan lingkungan", singkat: "Biaya lingkungan", kategori: "Biaya Lingkungan",
    ukuran: U.biaya, arah: "netral", beranda: false,
    definisi: "Biaya pengelolaan lingkungan per jenis aktivitas, dalam Rupiah. Baru sedikit lokasi yang mengisi, sehingga perbandingan antar tahun belum bisa diandalkan.",
    tampilan: [{ label: "Per aktivitas", panel: PANEL.biayaAktivitas }],
  },
];

// ------------------------------------------------------------------ mutu air (Oil Catcher & IPAL)

export type ParameterMutu = { label: string; ukuran: Ukuran };
const mutu = (sumber: string, labels: [string, string][]): ParameterMutu[] =>
  labels.map(([label, seg]) => ({
    label,
    ukuran: { pilih: di("Air", "Beban Pencemaran", sumber, seg), satuan: "*" },
  }));

export const MUTU_OIL_CATCHER = mutu("Oil Catcher", [["TOC", "TOC"], ["Minyak & lemak", "Minyak & Lemak"]]);
export const MUTU_IPAL = mutu("IPAL Domestik", [
  ["COD", "COD"], ["BOD", "BOD"], ["TSS", "TSS"], ["Amonia total", "Amonia Total"], ["Minyak & lemak", "Minyak & Lemak"],
]);
