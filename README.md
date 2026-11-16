# Dashboard Environment JBN

Dashboard monitoring data lingkungan (ESG aspek Enviro / P-HORSE) untuk 26 lokasi Regional Jatimbalinus.
Next.js 16 + TypeScript + Tailwind + Recharts, siap di-deploy ke Vercel.

## Menjalankan (lokal)

```bash
npm install
npm run db:seed      # isi database lokal (.data/pglite) dari data-seed/seed.json
npm run db:akun      # buat 1 akun admin + 1 akun per terminal (26); sandi awal → .data/kredensial-awal.csv
npm run dev          # http://localhost:3000
npm test             # uji otentikasi dan input
```

Tanpa `DATABASE_URL`, aplikasi memakai database lokal PGlite di `.data/pglite` (hanya untuk pengembangan;
jangan menjalankan `db:seed` saat `npm run dev` hidup). Di produksi `DATABASE_URL` **wajib**; tanpa itu aplikasi
menolak berjalan, bukan diam-diam memakai database lokal.

## Login, akun terminal, dan input data

- **Satu akun per terminal** (username = id lokasi, mis. `it-surabaya`) + satu akun `admin`. Sandi awal acak dan
  **wajib diganti** saat masuk pertama (min. 12 karakter, huruf + angka, bukan sandi umum).
- **Tampilan awal** akun terminal = terminalnya sendiri. Semua akun tetap bebas melihat seluruh dashboard atau terminal lain.
- **Input Data** (menu hanya untuk akun terminal): isian bulanan sesuai kolom Excel 2026 (311 kolom: operasional,
  energi, emisi, sampah, air, limbah B3, biaya). Lokasi **selalu diambil dari sesi di server**, tidak pernah dari
  kiriman browser, jadi akun terminal lain atau admin tidak dapat menulis ke terminal ini. Hanya bulan yang sudah
  berjalan dan mulai 2026 yang dapat diisi. Kolom kosong = belum ada data (tidak dianggap nol). Nilai yang berbeda
  ≥10× dari median 12 bulan terakhir meminta konfirmasi dan ditandai "perlu dicek".
- **Admin** melihat semua dan mengelola akun (atur ulang sandi, nonaktifkan), tetapi tidak mengubah data.
- Keamanan: sandi di-hash scrypt; token sesi acak dan hanya hash-nya disimpan; cookie `HttpOnly`, `SameSite=Lax`,
  `Secure` + prefiks `__Host-` di produksi; sesi habis setelah 4 jam menganggur / 24 jam; pembatasan percobaan
  login (5 per akun, 20 per IP / 15 menit); seluruh perubahan data dan akun tercatat di tabel `riwayat_input` dan `audit`;
  semua API dan Server Action memeriksa sesi sendiri (tidak mengandalkan `proxy.ts` saja).

## Deploy ke Vercel

1. Vercel → **Storage → Create → Neon (Postgres)**, hubungkan ke proyek ini (mengisi `DATABASE_URL`).
2. Tarik variabel ke lokal: `vercel env pull .env.local`.
3. Dari komputer Anda, terhadap database Neon itu: `npm run db:seed` lalu `npm run db:akun`.
4. Serahkan sandi awal dari `.data/kredensial-awal.csv` ke tiap petugas lewat jalur aman, lalu hapus berkas itu.
5. Deploy.

Data klien **tidak** ada di repositori: `Data/`, `output/`, `data-seed/`, dan `.data/` diabaikan git.

## Memperbarui data dari Excel (impor ulang)

```bash
pip install -r requirements.txt
python -m etl.konversi                 # baca Data/*.xlsx → output/ dan data-seed/seed.json
npm run db:seed -- --reset-data        # timpa data lingkungan di database (akun tidak disentuh)
```

Setelah login diaktifkan, petugas mengisi langsung di dashboard; impor ulang hanya untuk koreksi massal.
Detail konversi: [etl/README.md](etl/README.md).

## Struktur

| Lokasi | Isi |
|---|---|
| `etl/` | Konversi Excel → data bersih, laporan validasi, dan `data-seed/seed.json` |
| `db/migrations/` | Skema Postgres (data, akun, sesi, audit) |
| `src/server/` | Database, otentikasi, sesi, aturan input, pembentuk dataset (hanya berjalan di server) |
| `src/app/api/` | `/api/data` (dataset), `/api/isian` (formulir), `/api/akun` (admin); semua butuh sesi |
| `src/app/(auth)/`, `src/app/(app)/` | Halaman masuk/ganti sandi dan halaman dashboard (termasuk Input Data, Kelola Akun) |
| `src/proxy.ts` | Pengalihan awal ke /login (lapis pertama; otorisasi sebenarnya di tiap handler) |
| `src/lib/panel.ts` | Definisi isi dashboard: ukuran, seri grafik, tab kategori |
| `src/lib/hitung.ts` | Fungsi agregasi (per lokasi, per bulan, per tahun) |
| `src/components/` | Kartu KPI, grafik tren, peringkat lokasi, tabel mutu air |
| `src/app/globals.css` | Token warna |

## Halaman

| Menu | Isi |
|---|---|
| Beranda | 7 indikator utama: angka, perubahan dibanding periode setara tahun lalu, mini-tren, cakupan data. Klik kartu untuk menelusuri. |
| Data ESG | Satu alur: pilih indikator → kapan dan dari apa (grafik + garis total tahun lalu) → di mana (peringkat lokasi dengan porsi dan perubahan). |
| Oil Catcher, IPAL Domestik | Hasil pemantauan per lokasi per bulan (satuan asli: mg/L atau ton). Baku mutu belum ada, jadi status memenuhi/tidak belum ditampilkan. |
| Pelaporan SIMPEL, Risiko Bencana, Kompatibilitas B3, Perizinan Lingkungan, Kedaruratan B3 | Belum ada data di Excel |

## Cara perubahan dihitung

Perubahan dibanding periode setara tahun lalu (`src/lib/hitung.ts`, fungsi `banding`):

- Periode setara: satu bulan → bulan yang sama tahun lalu; tahun berjalan (Jan–Okt) → Jan–Okt tahun lalu; tahun penuh → tahun lalu penuh.
- **Hanya lokasi yang melapor di kedua periode** yang dihitung, supaya perubahan tidak sekadar akibat jumlah lokasi pengisi berubah.
- Batas bulan mengikuti **kategori**, bukan tahunnya (mis. Emisi 2025 hanya terisi sampai Agustus). Jika tahun lalu hanya tersedia per tahun, perubahan tidak ditampilkan beserta alasannya.
- Jika lebih dari 20% angkanya berasal dari nilai "perlu dicek", persen diberi tanda kuning dan warnanya dinetralkan.
- Hasil ini sudah dicocokkan dengan hitungan terpisah di Python (12 dari 12 sama).

## Fitur interaksi

- **Klik untuk memfokuskan.** Klik kolom bulan di grafik mana pun, baris lokasi di peringkat, atau baris
  lokasi di daftar/tabel → seluruh dashboard (KPI, kartu sorotan, grafik lain, peringkat) ikut memakai bulan
  atau lokasi itu. Kolom lain meredup, kartu yang diklik diberi cincin, dan muncul chip "Fokus aktif".
  Klik lagi atau tekan `Esc` untuk melepas. Klik kolom tahun pada tampilan tahunan untuk berpindah tahun.
- **Perlebar visual.** Peringkat lokasi awalnya hanya 8 teratas. Tombol perlebar (atau "Tampilkan N lokasi lainnya")
  menampilkan semua lokasi dalam dua kolom, sementara grafik di sebelahnya menyempit dengan animasi. Grafik juga
  punya tombol perlebar; peringkat lalu menyempit menjadi daftar ringkas. Lokasi yang dipilih dari tempat lain
  tetap terlihat walau di luar 8 teratas.
- **Legenda grafik** bisa diklik untuk menyorot satu seri (berlaku di grafik itu saja).
- **Pencarian lokasi** di bilah atas (tekan `/`), dan **Export data (CSV)**
  sesuai tahun, bulan, dan lokasi yang dipilih.
- **Tooltip** di grafik, ikon sidebar, tombol, kartu KPI, dan penanda "perlu dicek". Animasi mengikuti
  pengaturan "kurangi gerak" di sistem.

## Tampilan

Warna dan bayangan ada di `src/app/globals.css` (token `--accent`, `--canvas`, `--card`, dst.; tampilan selalu terang, tidak ada mode gelap). Aksen UI adalah biru; warna grafik memakai palet kategorikal yang sudah divalidasi.

## Prinsip tampilan data

- Angka ditampilkan sesuai isian di Excel. Tidak ada nilai yang diperkirakan, dihitung ulang, atau dikonversi.
- Data yang belum diisi tampil sebagai "Belum ada data", bukan nol.
- Titik kuning "perlu dicek" menandai nilai yang jauh di luar pola lokasinya (bulan lain atau tahun
  sebelumnya). Nilainya tetap ditampilkan apa adanya.
- Satuan berbeda tidak pernah dijumlahkan (mis. mg/L dan ton pada beban pencemaran).
