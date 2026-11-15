# Dashboard Environment JBN

Dashboard monitoring data lingkungan (ESG aspek Enviro / P-HORSE) untuk 26 lokasi Regional Jatimbalinus.
Next.js 16 + TypeScript + Tailwind + Recharts, siap di-deploy ke Vercel.

## Menjalankan

```bash
npm install
npm run dev          # http://localhost:3000
```

## Memperbarui data dari Excel

```bash
pip install -r requirements.txt
python -m etl.konversi                 # baca Data/*.xlsx → output/ dan public/data/dashboard.json
```

Dashboard hanya membaca `public/data/dashboard.json`. Setelah Excel baru dikonversi, commit file itu dan
deploy ulang; Vercel tidak perlu menjalankan Python. Detail konversi: [etl/README.md](etl/README.md).

## Struktur

| Lokasi | Isi |
|---|---|
| `etl/` | Skrip konversi Excel → data bersih + laporan validasi |
| `public/data/dashboard.json` | Data yang dipakai dashboard (hasil ETL) |
| `src/lib/panel.ts` | Definisi isi dashboard: ukuran, seri grafik, tab kategori |
| `src/lib/hitung.ts` | Fungsi agregasi (per lokasi, per bulan, per tahun) |
| `src/components/` | Kartu KPI, grafik tren, peringkat lokasi, tabel mutu air |
| `src/app/` | 9 halaman, urutan menu mengikuti situs referensi |
| `src/app/globals.css` | Token warna (tampilan sementara; ganti di sini saat desain final ada) |

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
