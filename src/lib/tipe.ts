// Bentuk dataset yang dikirim /api/data (dibangun dari database oleh src/server/dataset.ts).

export type Lokasi = {
  id: string;
  nama: string;
  singkat: string;
  tipe: string;
  provinsi: string;
  grade: string | null;
};

/** k = kategori, s = jalur di bawah kategori, u = satuan bawaan. */
export type Metrik = { id: string; k: string; s: string[]; u: string };

/** Satu nilai rincian (bukan subtotal). bulan 0 = data tahunan. satuan null = pakai satuan metrik. */
export type Fakta = [
  lokasi: number,
  tahun: number,
  bulan: number,
  metrik: number,
  nilai: number,
  satuan: string | null,
  cek: 0 | 1,
];

/** Kategori yang sel inputnya terisi (termasuk angka 0) pada suatu lokasi & periode. */
export type Isi = [lokasi: number, tahun: number, bulan: number, kategori: number, terisi: number];

export type Dataset = {
  meta: {
    sumber: string;
    dibuat: string;
    tahun: number[];
    tahunBulanan: number[];
    bulanTerakhir: Record<string, number>;
  };
  kategori: string[];
  lokasi: Lokasi[];
  metrik: Metrik[];
  fakta: Fakta[];
  isi: Isi[];
};

/** bulan 0 = semua bulan; lokasi null = semua lokasi. */
export type Filter = { tahun: number; bulan: number; lokasi: number | null };
