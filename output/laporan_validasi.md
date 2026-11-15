# Laporan Validasi Data PHORSE — Region JBN

Sumber: `Identifikasi Data ESG Aspek Enviro JBN (PHORSE).xlsx`  
Dibuat: 2026-11-15 17:46  
Cakupan: 26 lokasi. Nilai bukan nol yang diekstrak: **29,509**.

Detail lengkap tiap temuan (dengan alamat sel Excel) ada di `validasi.csv`.

## Ringkasan temuan

| Tingkat | Jenis | Jumlah | Arti |
|---|---|---:|---|
| error | `error_excel` | 9 | Sel berisi error Excel (#REF!, dll.) |
| error | `teks_tidak_terbaca` | 1 | Sel berisi teks yang tidak bisa dibaca sebagai angka |
| peringatan | `skala_tidak_wajar` | 260 | Nilai > 20× rata-rata bulanan tahun sebelumnya (kemungkinan liter diisi di kolom kL) |
| peringatan | `subtotal_tidak_cocok` | 203 | Kolom Total tidak sama dengan jumlah rinciannya |
| peringatan | `listrik_tidak_cocok` | 119 | Listrik di sheet 'Listrik Lokasi' ≠ listrik di sheet 2026 |
| peringatan | `sampah_tidak_seimbang` | 104 | Total sampah dihasilkan ≠ total sampah dikelola (aturan di Excel: harus sama) |
| peringatan | `lonjakan_nilai` | 86 | Nilai bulanan > 10× median lokasi tsb (kemungkinan salah satuan/ketik) |
| peringatan | `label_header_dikoreksi` | 10 | Label produk di header salah posisi dan dikoreksi berdasarkan urutan kolom |
| peringatan | `nilai_negatif` | 10 | Nilai negatif |
| peringatan | `angka_dari_teks` | 4 | Angka yang tersimpan sebagai teks (koma desimal, satuan mg/L, keterangan B40, dll.) |
| peringatan | `lokasi_tanpa_data` | 4 | Lokasi dalam cakupan yang tidak ada datanya di sheet |
| peringatan | `satuan_beban_pencemaran` | 3 | Beban pencemaran diisi konsentrasi mg/L padahal header bersatuan ton |
| info | `angka_dari_teks` | 305 | Angka yang tersimpan sebagai teks (koma desimal, satuan mg/L, keterangan B40, dll.) |
| info | `bulan_belum_terisi` | 146 | Bulan yang belum terisi untuk suatu kategori |
| info | `kategori_kosong` | 113 | Kategori yang tidak terisi sama sekali dalam satu tahun |
| info | `limbah_b3_tidak_seimbang` | 22 | Total limbah B3 dihasilkan ≠ dikelola dalam setahun |
| info | `header_ganda` | 7 | Header yang sama muncul di dua kolom |
| info | `unit_di_luar_cakupan` | 4 | Unit JBN di Excel yang tidak termasuk 26 lokasi |

## Cakupan lokasi

| Lokasi | Grade 2024 | 2024-2021 | 2025 | 2026 | Listrik Lokasi |
|---|---|:-:|:-:|:-:|:-:|
| IT Surabaya | A | ✓ | ✓ | ✓ | ✓ |
| IT Tanjung Wangi | D | ✓ | ✓ | ✓ | ✓ |
| IT Manggis | B | ✓ | ✓ | ✓ | ✓ |
| IT Ampenan | D | ✓ | ✓ | ✓ | ✓ |
| IT Bima | F | ✓ | ✓ | ✓ | ✓ |
| FT Tuban | B | ✓ | ✓ | ✓ | ✓ |
| FT Madiun | E | ✓ | ✓ | ✓ | ✓ |
| FT Malang | E | ✓ | ✓ | ✓ | ✓ |
| FT Camplong | F | ✓ | ✓ | ✓ | ✓ |
| FT Sanggaran | E | ✓ | ✓ | ✓ | ✓ |
| FT Badas | F | ✓ | ✓ | ✓ | ✓ |
| FT Tenau | D | ✓ | ✓ | ✓ | ✓ |
| FT Maumere | E | ✓ | ✓ | ✓ | ✓ |
| FT Atapupu | F | ✓ | ✓ | ✓ | ✓ |
| FT Ende | F | ✓ | ✓ | ✓ | ✓ |
| FT Kalabahi | F | ✓ | ✓ | ✓ | ✓ |
| FT Reo | F | ✓ | ✓ | ✓ | ✓ |
| FT Waingapu | F | ✓ | ✓ | ✓ | ✓ |
| AFT Juanda | I | ✓ | ✓ | ✓ | ✓ |
| AFT Iswahjudi | V | ✓ | ✓ | ✓ | ✓ |
| AFT Ngurah Rai | I | ✓ | ✓ | ✓ | ✓ |
| AFT BIL | V | ✓ | ✓ | ✓ | ✓ |
| AFT Eltari | V | ✓ | ✓ | ✓ | ✓ |
| Bitumen Plant Gresik | — | ✓ | ✓ | ✓ | ✓ |
| FT Larantuka | — | ✓ | ✓ | ✓ | ✓ |
| Depot LPG Tanjung Perak | — | — | — | — | — |

## Kelengkapan 2025: jumlah lokasi yang mengisi (dari 25)

| Kategori | Jan | Feb | Mar | Apr | Mei | Jun | Jul | Agu | Sep | Okt | Nov | Des |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lahan Hijau | 18 | 17 | 17 | 17 | 17 | 17 | 17 | 17 | 17 | 17 | 17 | 17 |
| Operasional | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 |
| Energi | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 |
| Emisi | 17 | 17 | 17 | 17 | 17 | 17 | 17 | 17 | 1 | 0 | 0 | 0 |
| Sampah | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 |
| Air | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 |
| Limbah B3 | 7 | 7 | 7 | 8 | 8 | 8 | 11 | 9 | 10 | 9 | 8 | 4 |
| Biaya Lingkungan | 3 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 |

## Kelengkapan 2026: jumlah lokasi yang mengisi (dari 25)

| Kategori | Jan | Feb | Mar | Apr | Mei | Jun | Jul | Agu | Sep | Okt | Nov | Des |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lahan Hijau | 17 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 6 | 3 |
| Operasional | 25 | 25 | 25 | 25 | 25 | 25 | 24 | 24 | 24 | 24 | 2 | 2 |
| Energi | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 5 | 2 |
| Emisi | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Sampah | 25 | 25 | 25 | 25 | 25 | 24 | 23 | 23 | 23 | 23 | 4 | 2 |
| Air | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 25 | 24 | 25 | 1 | 1 |
| Limbah B3 | 9 | 9 | 9 | 8 | 8 | 11 | 10 | 10 | 9 | 7 | 1 | 1 |
| Biaya Lingkungan | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 4 | 1 | 1 |

## Contoh temuan per jenis

### `error_excel` (9)

- 2026!PI127 · IT Manggis · Okt 2026 — `Sampah > Dikelola`: Sel berisi error Excel #REF!; dianggap kosong.
- 2026!PK127 · IT Manggis · Okt 2026 — `Sampah > Dikelola > Reduce > Sisa Makanan`: Sel berisi error Excel #REF!; dianggap kosong.
- 2026!QH127 · IT Manggis · Okt 2026 — `Sampah > Dikelola > Reduce`: Sel berisi error Excel #REF!; dianggap kosong.
- 2026!PI128 · IT Manggis · Nov 2026 — `Sampah > Dikelola`: Sel berisi error Excel #REF!; dianggap kosong.
- 2026!PK128 · IT Manggis · Nov 2026 — `Sampah > Dikelola > Reduce > Sisa Makanan`: Sel berisi error Excel #REF!; dianggap kosong.
- 2026!QH128 · IT Manggis · Nov 2026 — `Sampah > Dikelola > Reduce`: Sel berisi error Excel #REF!; dianggap kosong.
- 2026!PI129 · IT Manggis · Des 2026 — `Sampah > Dikelola`: Sel berisi error Excel #REF!; dianggap kosong.
- 2026!PK129 · IT Manggis · Des 2026 — `Sampah > Dikelola > Reduce > Sisa Makanan`: Sel berisi error Excel #REF!; dianggap kosong.
- 2026!QH129 · IT Manggis · Des 2026 — `Sampah > Dikelola > Reduce`: Sel berisi error Excel #REF!; dianggap kosong.

### `teks_tidak_terbaca` (1)

- 2025!BO872 · AFT Iswahjudi · Jan 2025 — `Energi > Kegiatan Operasi > Own Use MT/Refueler/Dispenser > Pertamina Dex`: Sel berisi beberapa angka sekaligus; tidak dipakai.

### `angka_dari_teks` (309)

- 2024-2021!D395 · FT Atapupu · 2021 — `Lahan Hijau > Luas Lahan Hijau`: Teks '22.130 M2 ' bersatuan m2; dibaca sebagai 2.213 Ha (titik = pemisah ribuan).
- 2024-2021!D396 · FT Atapupu · 2022 — `Lahan Hijau > Luas Lahan Hijau`: Teks '22.130 M2 ' bersatuan m2; dibaca sebagai 2.213 Ha (titik = pemisah ribuan).
- 2024-2021!D397 · FT Atapupu · 2023 — `Lahan Hijau > Luas Lahan Hijau`: Teks '22.130 M2 ' bersatuan m2; dibaca sebagai 2.213 Ha (titik = pemisah ribuan).
- 2024-2021!D398 · FT Atapupu · 2024 — `Lahan Hijau > Luas Lahan Hijau`: Teks '22.130 M2 ' bersatuan m2; dibaca sebagai 2.213 Ha (titik = pemisah ribuan).
- 2024-2021!D360 · AFT Ngurah Rai · 2021 — `Lahan Hijau > Luas Lahan Hijau`: Teks '0,72' dibaca sebagai angka 0.72.
- 2024-2021!D361 · AFT Ngurah Rai · 2022 — `Lahan Hijau > Luas Lahan Hijau`: Teks '0,72' dibaca sebagai angka 0.72.
- 2024-2021!D362 · AFT Ngurah Rai · 2023 — `Lahan Hijau > Luas Lahan Hijau`: Teks '0,72' dibaca sebagai angka 0.72.
- 2024-2021!D363 · AFT Ngurah Rai · 2024 — `Lahan Hijau > Luas Lahan Hijau`: Teks '0,72' dibaca sebagai angka 0.72.
- 2024-2021!D335 · FT Camplong · 2021 — `Lahan Hijau > Luas Lahan Hijau`: Teks '3,5' dibaca sebagai angka 3.5.
- 2024-2021!D336 · FT Camplong · 2022 — `Lahan Hijau > Luas Lahan Hijau`: Teks '3,5' dibaca sebagai angka 3.5.
- 2024-2021!D337 · FT Camplong · 2023 — `Lahan Hijau > Luas Lahan Hijau`: Teks '3,5' dibaca sebagai angka 3.5.
- 2024-2021!D338 · FT Camplong · 2024 — `Lahan Hijau > Luas Lahan Hijau`: Teks '3,5' dibaca sebagai angka 3.5.
- … dan 297 lainnya di `validasi.csv`.

### `label_header_dikoreksi` (10)

- 2026!GB (header): Label 'Pertamina Dex' di bawah grup 'Penyaluran > Kapal > Gasoil' tidak sesuai urutan produk; dibaca sebagai 'Dexlite' berdasarkan posisi kolom.
- 2026!GC (header): Label 'Pertamax Green' di bawah grup 'Penyaluran > Kapal > Gasoil' tidak sesuai urutan produk; dibaca sebagai 'Pertamina Dex' berdasarkan posisi kolom.
- 2026!GD (header): Label 'Pertamax Turbo' di bawah grup 'Penyaluran > Kapal > Gasoil' tidak sesuai urutan produk; dibaca sebagai 'Lainnya' berdasarkan posisi kolom.
- 2026!KM (header): Label 'Pertalite' di bawah grup 'Penyaluran > Drum/Lithos > Gasoil' tidak sesuai urutan produk; dibaca sebagai 'Biosolar' berdasarkan posisi kolom.
- 2026!KN (header): Label 'Pertamax' di bawah grup 'Penyaluran > Drum/Lithos > Gasoil' tidak sesuai urutan produk; dibaca sebagai 'Dexlite' berdasarkan posisi kolom.
- 2026!KO (header): Label 'Pertamax Green' di bawah grup 'Penyaluran > Drum/Lithos > Gasoil' tidak sesuai urutan produk; dibaca sebagai 'Pertamina Dex' berdasarkan posisi kolom.
- 2026!KP (header): Label 'Pertamax Turbo' di bawah grup 'Penyaluran > Drum/Lithos > Gasoil' tidak sesuai urutan produk; dibaca sebagai 'Lainnya' berdasarkan posisi kolom.
- 2026!KX (header): Label 'Avtur' di bawah grup 'Penyaluran > Drum/Lithos > Minyak Berat' tidak sesuai urutan produk; dibaca sebagai 'MDF' berdasarkan posisi kolom.
- 2026!KY (header): Label 'LPG' di bawah grup 'Penyaluran > Drum/Lithos > Minyak Berat' tidak sesuai urutan produk; dibaca sebagai 'LSFO' berdasarkan posisi kolom.
- 2026!KZ (header): Label 'Kerosene' di bawah grup 'Penyaluran > Drum/Lithos > Minyak Berat' tidak sesuai urutan produk; dibaca sebagai 'HSFO' berdasarkan posisi kolom.

### `listrik_tidak_cocok` (119)

- Listrik Lokasi!D188 · AFT BIL · Jan 2026: Listrik Lokasi 15.83 MWh vs sheet 2026 0 MWh (selisih -15.83).
- Listrik Lokasi!D189 · AFT BIL · Feb 2026: Listrik Lokasi 10.38 MWh vs sheet 2026 0 MWh (selisih -10.38).
- Listrik Lokasi!D190 · AFT BIL · Mar 2026: Listrik Lokasi 11.02 MWh vs sheet 2026 0 MWh (selisih -11.02).
- Listrik Lokasi!D191 · AFT BIL · Apr 2026: Listrik Lokasi 15.69 MWh vs sheet 2026 0 MWh (selisih -15.69).
- Listrik Lokasi!D192 · AFT BIL · Mei 2026: Listrik Lokasi 14.18 MWh vs sheet 2026 0 MWh (selisih -14.18).
- Listrik Lokasi!D193 · AFT BIL · Jun 2026: Listrik Lokasi 13.42 MWh vs sheet 2026 0 MWh (selisih -13.42).
- Listrik Lokasi!D194 · AFT BIL · Jul 2026: Listrik Lokasi 13.45 MWh vs sheet 2026 0 MWh (selisih -13.45).
- Listrik Lokasi!D195 · AFT BIL · Agu 2026: Listrik Lokasi 13.15 MWh vs sheet 2026 0 MWh (selisih -13.15).
- Listrik Lokasi!D196 · AFT BIL · Sep 2026: Listrik Lokasi 13.55 MWh vs sheet 2026 0 MWh (selisih -13.55).
- Listrik Lokasi!D197 · AFT BIL · Okt 2026: Listrik Lokasi 13.37 MWh vs sheet 2026 0 MWh (selisih -13.37).
- Listrik Lokasi!D89 · AFT Juanda · Jun 2026: Listrik Lokasi 14.64 MWh vs sheet 2026 14.91 MWh (selisih 0.2639).
- Listrik Lokasi!D90 · AFT Juanda · Jul 2026: Listrik Lokasi 13.52 MWh vs sheet 2026 9.46 MWh (selisih -4.055).
- … dan 107 lainnya di `validasi.csv`.

### `lokasi_tanpa_data` (4)

- 2024-2021 · Depot LPG Tanjung Perak: Depot LPG Tanjung Perak tidak ditemukan di sheet ini.
- 2025 · Depot LPG Tanjung Perak: Depot LPG Tanjung Perak tidak ditemukan di sheet ini.
- 2026 · Depot LPG Tanjung Perak: Depot LPG Tanjung Perak tidak ditemukan di sheet ini.
- Listrik Lokasi · Depot LPG Tanjung Perak: Depot LPG Tanjung Perak tidak ditemukan di sheet ini.

### `lonjakan_nilai` (86)

- 2025!GO964 · AFT BIL · Feb 2025 — `Air > Beban Pencemaran > IPAL Domestik > Amonia Total`: 3.05 ton = 30× median (0.1).
- 2025!GO970 · AFT BIL · Agu 2025 — `Air > Beban Pencemaran > IPAL Domestik > Amonia Total`: 1.29 ton = 13× median (0.1).
- 2025!BY1107 · Bitumen Plant Gresik · Feb 2025 — `Energi > Kegiatan Penunjang Operasi > Own Use Genset/Pompa PMK/Dapur > Pertamax`: 1 kL = 29× median (0.035).
- 2025!BR1015 · FT Ende · Jan 2025 — `Energi > Kegiatan Operasi > Energi Listrik Pompa Produk`: 272.5 MWh = 25× median (10.88).
- 2025!CG1015 · FT Ende · Jan 2025 — `Energi > Kegiatan Penunjang Operasi > Energi Listrik Kantor`: 116.8 MWh = 22× median (5.352).
- 2025!FV1086 · FT Larantuka · Jul 2025 — `Air > Pengambilan Air > Kegiatan Operasi > PDAM/Pihak Ketiga`: 332 m3 = 12× median (27.5).
- 2025!GM810 · FT Malang · Apr 2025 — `Air > Beban Pencemaran > Oil Catcher > TOC`: 0.00015 ton = 62× median (2.4e-06).
- 2025!CL1052 · FT Maumere · Des 2025 — `Energi > Kegiatan Penunjang Non Operasi > Own Use Alat Babat Rumput > Pertalite`: 0.8 kL = 11× median (0.0725).
- 2025!AZ996 · FT Tenau · Agu 2025 — `Operasional > Penyaluran > Bunker Kapal > Gasoil`: 9,056 kL = 12× median (777.9).
- 2025!BT950 · IT Bima · Jan 2025 — `Energi > Kegiatan Operasi > Energi Listrik Solar Cell/Energi Hijau`: 3.657 MWh = 3657× median (0.001).
- 2025!BT951 · IT Bima · Feb 2025 — `Energi > Kegiatan Operasi > Energi Listrik Solar Cell/Energi Hijau`: 2.568 MWh = 2568× median (0.001).
- 2025!BT952 · IT Bima · Mar 2025 — `Energi > Kegiatan Operasi > Energi Listrik Solar Cell/Energi Hijau`: 0.19 MWh = 190× median (0.001).
- … dan 74 lainnya di `validasi.csv`.

### `nilai_negatif` (10)

- 2024-2021!FB395 · FT Atapupu · 2021 — `Sampah > Dikelola > Dibuang ke Pihak Ketiga > Kertas`: Nilai negatif -0.18.
- 2024-2021!FC395 · FT Atapupu · 2021 — `Sampah > Dikelola > Dibuang ke Pihak Ketiga > Plastik`: Nilai negatif -0.18.
- 2024-2021!FB396 · FT Atapupu · 2022 — `Sampah > Dikelola > Dibuang ke Pihak Ketiga > Kertas`: Nilai negatif -0.21.
- 2024-2021!FC396 · FT Atapupu · 2022 — `Sampah > Dikelola > Dibuang ke Pihak Ketiga > Plastik`: Nilai negatif -0.13.
- 2024-2021!FA397 · FT Atapupu · 2023 — `Sampah > Dikelola > Dibuang ke Pihak Ketiga > Sisa Makanan`: Nilai negatif -0.01.
- 2024-2021!FB397 · FT Atapupu · 2023 — `Sampah > Dikelola > Dibuang ke Pihak Ketiga > Kertas`: Nilai negatif -0.29.
- 2024-2021!FC397 · FT Atapupu · 2023 — `Sampah > Dikelola > Dibuang ke Pihak Ketiga > Plastik`: Nilai negatif -0.19.
- 2024-2021!FB398 · FT Atapupu · 2024 — `Sampah > Dikelola > Dibuang ke Pihak Ketiga > Kertas`: Nilai negatif -0.29.
- 2024-2021!FC398 · FT Atapupu · 2024 — `Sampah > Dikelola > Dibuang ke Pihak Ketiga > Plastik`: Nilai negatif -0.09.
- 2024-2021!FN398 · FT Atapupu · 2024 — `Sampah > Dikelola > Dibuang ke Pihak Ketiga`: Nilai negatif -0.08.

### `sampah_tidak_seimbang` (104)

- 2024-2021!baris 431 · AFT Eltari · 2022: Sampah dihasilkan 0.193 ton, dikelola 0.146 ton.
- 2024-2021!baris 360 · AFT Ngurah Rai · 2021: Sampah dihasilkan 0.53 ton, dikelola 0.488 ton.
- 2024-2021!baris 362 · AFT Ngurah Rai · 2023: Sampah dihasilkan 0.328 ton, dikelola 0.769 ton.
- 2024-2021!baris 435 · Bitumen Plant Gresik · 2021: Sampah dihasilkan 50.5 ton, dikelola 52.1 ton.
- 2024-2021!baris 436 · Bitumen Plant Gresik · 2022: Sampah dihasilkan 45.42 ton, dikelola 46.57 ton.
- 2024-2021!baris 437 · Bitumen Plant Gresik · 2023: Sampah dihasilkan 39.25 ton, dikelola 42.56 ton.
- 2024-2021!baris 438 · Bitumen Plant Gresik · 2024: Sampah dihasilkan 83.36 ton, dikelola 62.1 ton.
- 2024-2021!baris 370 · FT Badas · 2021: Sampah dihasilkan 7.67 ton, dikelola 8.48 ton.
- 2024-2021!baris 335 · FT Camplong · 2021: Sampah dihasilkan 2.54 ton, dikelola 2.22 ton.
- 2024-2021!baris 336 · FT Camplong · 2022: Sampah dihasilkan 1.68 ton, dikelola 1.728 ton.
- 2024-2021!baris 337 · FT Camplong · 2023: Sampah dihasilkan 2.29 ton, dikelola 2.346 ton.
- 2024-2021!baris 405 · FT Kalabahi · 2021: Sampah dihasilkan 0.95 ton, dikelola 1.03 ton.
- … dan 92 lainnya di `validasi.csv`.

### `satuan_beban_pencemaran` (3)

- 2025 · FT Malang: 1 nilai berupa konsentrasi mg/L, 26 nilai bersatuan ton.
- 2025 · IT Surabaya: 79 nilai berupa konsentrasi mg/L, 0 nilai bersatuan ton.
- 2026 · IT Surabaya: 70 nilai berupa konsentrasi mg/L, 0 nilai bersatuan ton.

### `skala_tidak_wajar` (260)

- 2024-2021!GJ382 · AFT BIL · 2023 — `Air > Beban Pencemaran`: Air > Beban Pencemaran: 0.0004686 ton per bulan = 48× rata-rata bulanan 2022 (9.773e-06). Kemungkinan salah satuan (mis. liter vs kL).
- 2024-2021!DT343 · AFT Juanda · 2024 — `Emisi > Fuel Combustion`: Emisi > Fuel Combustion: 240.9 ton per bulan = 26× rata-rata bulanan 2023 (9.177). Kemungkinan salah satuan (mis. liter vs kL).
- 2024-2021!BV436 · Bitumen Plant Gresik · 2022 — `Energi > Kegiatan Penunjang Operasi`: Energi > Kegiatan Penunjang Operasi: 0.2675 kL per bulan = 21× rata-rata bulanan 2021 (0.0125). Kemungkinan salah satuan (mis. liter vs kL).
- 2024-2021!GJ396 · FT Atapupu · 2022 — `Air > Beban Pencemaran`: Air > Beban Pencemaran: 4.04e-05 ton per bulan = 780581× rata-rata bulanan 2021 (5.175e-11). Kemungkinan salah satuan (mis. liter vs kL).
- 2024-2021!GR402 · FT Ende · 2023 — `Limbah B3 > Dihasilkan`: Limbah B3 > Dihasilkan: 0.3883 ton per bulan = 23× rata-rata bulanan 2022 (0.01667). Kemungkinan salah satuan (mis. liter vs kL).
- 2024-2021!HX402 · FT Ende · 2023 — `Limbah B3 > Dikelola`: Limbah B3 > Dikelola: 0.3883 ton per bulan = 23× rata-rata bulanan 2022 (0.01667). Kemungkinan salah satuan (mis. liter vs kL).
- 2024-2021!GF406 · FT Kalabahi · 2022 — `Air > Effluent Air Limbah`: Air > Effluent Air Limbah: 5.31 m3 per bulan = 1062001× rata-rata bulanan 2021 (5e-06). Kemungkinan salah satuan (mis. liter vs kL).
- 2024-2021!GJ406 · FT Kalabahi · 2022 — `Air > Beban Pencemaran`: Air > Beban Pencemaran: 5.315e-05 ton per bulan = 833789× rata-rata bulanan 2021 (6.375e-11). Kemungkinan salah satuan (mis. liter vs kL).
- 2024-2021!HX327 · FT Madiun · 2023 — `Limbah B3 > Dikelola`: Limbah B3 > Dikelola: 1.217 ton per bulan = 27× rata-rata bulanan 2022 (0.04475). Kemungkinan salah satuan (mis. liter vs kL).
- 2024-2021!CZ328 · FT Madiun · 2024 — `Emisi > Kegiatan Penunjang Operasi`: Emisi > Kegiatan Penunjang Operasi: 12.79 ton per bulan = 21× rata-rata bulanan 2023 (0.6154). Kemungkinan salah satuan (mis. liter vs kL).
- 2024-2021!GR331 · FT Tuban · 2022 — `Limbah B3 > Dihasilkan`: Limbah B3 > Dihasilkan: 15.21 ton per bulan = 22× rata-rata bulanan 2021 (0.6933). Kemungkinan salah satuan (mis. liter vs kL).
- 2024-2021!IE331 · FT Tuban · 2022 — `Limbah B3 > Dikelola`: Limbah B3 > Dikelola: 15.21 ton per bulan = 22× rata-rata bulanan 2021 (0.6932). Kemungkinan salah satuan (mis. liter vs kL).
- … dan 248 lainnya di `validasi.csv`.

### `subtotal_tidak_cocok` (203)

- 2025!FO873 · AFT Iswahjudi · Feb 2025 — `Sampah > Dikelola > Reduce`: Total 0.53 ≠ jumlah rincian 0.02.
- 2025!FO880 · AFT Iswahjudi · Sep 2025 — `Sampah > Dikelola > Reduce`: Total 0.54 ≠ jumlah rincian 0.02.
- 2025!FP864 · AFT Juanda · Jun 2025 — `Sampah > Dikelola > Reuse & Recycle`: Total 0.54 ≠ jumlah rincian 0.52.
- 2025!FQ864 · AFT Juanda · Jun 2025 — `Sampah > Dikelola > Dibuang ke Pihak Ketiga`: Total 0.87 ≠ jumlah rincian 0.89.
- 2025!FQ870 · AFT Juanda · Des 2025 — `Sampah > Dikelola > Dibuang ke Pihak Ketiga`: Total 0.87 ≠ jumlah rincian 0.57.
- 2025!EP1041 · FT Maumere · Jan 2025 — `Sampah > Dikelola`: Total 0.12 ≠ jumlah rincian 0.67.
- 2025!FO1041 · FT Maumere · Jan 2025 — `Sampah > Dikelola > Reduce`: Total 0.08 ≠ jumlah rincian 0.55.
- 2025!EP1042 · FT Maumere · Feb 2025 — `Sampah > Dikelola`: Total 0.12 ≠ jumlah rincian 0.16.
- 2025!FO1042 · FT Maumere · Feb 2025 — `Sampah > Dikelola > Reduce`: Total 0.1 ≠ jumlah rincian 0.04.
- 2025!EP1043 · FT Maumere · Mar 2025 — `Sampah > Dikelola`: Total 0.11 ≠ jumlah rincian 0.15.
- 2025!FO1043 · FT Maumere · Mar 2025 — `Sampah > Dikelola > Reduce`: Total 0.1 ≠ jumlah rincian 0.04.
- 2025!EP1044 · FT Maumere · Apr 2025 — `Sampah > Dikelola`: Total 0.11 ≠ jumlah rincian 0.15.
- … dan 191 lainnya di `validasi.csv`.

### `bulan_belum_terisi` (146)

- 2025 · AFT BIL · 2025 — `Limbah B3`: Kategori Limbah B3 kosong di bulan: Jan, Feb, Mar, Jul, Agu, Sep, Okt, Des.
- 2025 · AFT Iswahjudi · 2025 — `Biaya Lingkungan`: Kategori Biaya Lingkungan kosong di bulan: Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des.
- 2025 · AFT Ngurah Rai · 2025 — `Limbah B3`: Kategori Limbah B3 kosong di bulan: Jan, Feb, Mar, Apr, Mei, Jun, Okt, Nov, Des.
- 2025 · FT Atapupu · 2025 — `Emisi`: Kategori Emisi kosong di bulan: Sep, Okt, Nov, Des.
- 2025 · FT Atapupu · 2025 — `Limbah B3`: Kategori Limbah B3 kosong di bulan: Jan, Feb, Mar, Apr, Mei, Jun, Okt, Nov, Des.
- 2025 · FT Badas · 2025 — `Emisi`: Kategori Emisi kosong di bulan: Sep, Okt, Nov, Des.
- 2025 · FT Badas · 2025 — `Limbah B3`: Kategori Limbah B3 kosong di bulan: Jan, Feb, Mar, Apr, Mei, Jun, Agu, Sep, Okt, Nov, Des.
- 2025 · FT Camplong · 2025 — `Emisi`: Kategori Emisi kosong di bulan: Sep, Okt, Nov, Des.
- 2025 · FT Ende · 2025 — `Emisi`: Kategori Emisi kosong di bulan: Sep, Okt, Nov, Des.
- 2025 · FT Madiun · 2025 — `Biaya Lingkungan`: Kategori Biaya Lingkungan kosong di bulan: Feb, Mar, Apr, Mei, Jun, Jul, Agu, Sep, Okt, Nov, Des.
- 2025 · FT Madiun · 2025 — `Emisi`: Kategori Emisi kosong di bulan: Sep, Okt, Nov, Des.
- 2025 · FT Madiun · 2025 — `Limbah B3`: Kategori Limbah B3 kosong di bulan: Jan, Feb, Mar, Apr, Jul, Agu, Sep, Okt, Nov, Des.
- … dan 134 lainnya di `validasi.csv`.

### `header_ganda` (7)

- 2026!CW (header): Header 'Operasional > Penerimaan > MT > Gasoil > Lainnya' muncul lebih dari sekali; kolom ini diberi nama 'Lainnya (2)'.
- 2026!FB (header): Header 'Operasional > Penyaluran > Jalur Pipa > Gasoil > Lainnya' muncul lebih dari sekali; kolom ini diberi nama 'Lainnya (2)'.
- 2026!GE (header): Header 'Operasional > Penyaluran > Kapal > Gasoil > Lainnya' muncul lebih dari sekali; kolom ini diberi nama 'Lainnya (2)'.
- 2026!HH (header): Header 'Operasional > Penyaluran > RTW > Gasoil > Lainnya' muncul lebih dari sekali; kolom ini diberi nama 'Lainnya (2)'.
- 2026!IK (header): Header 'Operasional > Penyaluran > MT > Gasoil > Lainnya' muncul lebih dari sekali; kolom ini diberi nama 'Lainnya (2)'.
- 2026!JN (header): Header 'Operasional > Penyaluran > Bunker Kapal > Gasoil > Lainnya' muncul lebih dari sekali; kolom ini diberi nama 'Lainnya (2)'.
- 2026!KQ (header): Header 'Operasional > Penyaluran > Drum/Lithos > Gasoil > Lainnya' muncul lebih dari sekali; kolom ini diberi nama 'Lainnya (2)'.

### `kategori_kosong` (113)

- 2025 · AFT BIL · 2025 — `Biaya Lingkungan`: Kategori Biaya Lingkungan tidak terisi sama sekali (Jan–Des).
- 2025 · AFT BIL · 2025 — `Emisi`: Kategori Emisi tidak terisi sama sekali (Jan–Des).
- 2025 · AFT Eltari · 2025 — `Biaya Lingkungan`: Kategori Biaya Lingkungan tidak terisi sama sekali (Jan–Des).
- 2025 · AFT Eltari · 2025 — `Emisi`: Kategori Emisi tidak terisi sama sekali (Jan–Des).
- 2025 · AFT Eltari · 2025 — `Limbah B3`: Kategori Limbah B3 tidak terisi sama sekali (Jan–Des).
- 2025 · AFT Iswahjudi · 2025 — `Emisi`: Kategori Emisi tidak terisi sama sekali (Jan–Des).
- 2025 · AFT Iswahjudi · 2025 — `Limbah B3`: Kategori Limbah B3 tidak terisi sama sekali (Jan–Des).
- 2025 · AFT Juanda · 2025 — `Biaya Lingkungan`: Kategori Biaya Lingkungan tidak terisi sama sekali (Jan–Des).
- 2025 · AFT Juanda · 2025 — `Emisi`: Kategori Emisi tidak terisi sama sekali (Jan–Des).
- 2025 · AFT Juanda · 2025 — `Limbah B3`: Kategori Limbah B3 tidak terisi sama sekali (Jan–Des).
- 2025 · AFT Ngurah Rai · 2025 — `Biaya Lingkungan`: Kategori Biaya Lingkungan tidak terisi sama sekali (Jan–Des).
- 2025 · AFT Ngurah Rai · 2025 — `Emisi`: Kategori Emisi tidak terisi sama sekali (Jan–Des).
- … dan 101 lainnya di `validasi.csv`.

### `limbah_b3_tidak_seimbang` (22)

- 2024-2021 · Bitumen Plant Gresik · 2024: Limbah B3 setahun: dihasilkan 93.1 ton, dikelola 65.07 ton.
- 2024-2021 · FT Larantuka · 2021: Limbah B3 setahun: dihasilkan 5.4 ton, dikelola 0 ton.
- 2024-2021 · FT Larantuka · 2022: Limbah B3 setahun: dihasilkan 2.2 ton, dikelola 0 ton.
- 2024-2021 · FT Larantuka · 2023: Limbah B3 setahun: dihasilkan 1.1 ton, dikelola 0 ton.
- 2024-2021 · FT Larantuka · 2024: Limbah B3 setahun: dihasilkan 3.35 ton, dikelola 0 ton.
- 2024-2021 · FT Madiun · 2021: Limbah B3 setahun: dihasilkan 1.533 ton, dikelola 2.803 ton.
- 2024-2021 · FT Madiun · 2022: Limbah B3 setahun: dihasilkan 0.493 ton, dikelola 0.537 ton.
- 2024-2021 · FT Madiun · 2023: Limbah B3 setahun: dihasilkan 7.3 ton, dikelola 14.6 ton.
- 2024-2021 · FT Madiun · 2024: Limbah B3 setahun: dihasilkan 15 ton, dikelola 29.74 ton.
- 2024-2021 · FT Malang · 2021: Limbah B3 setahun: dihasilkan 6.665 ton, dikelola 16.01 ton.
- 2024-2021 · FT Malang · 2022: Limbah B3 setahun: dihasilkan 3.659 ton, dikelola 10.32 ton.
- 2024-2021 · FT Waingapu · 2021: Limbah B3 setahun: dihasilkan 11.5 ton, dikelola 0.07 ton.
- … dan 10 lainnya di `validasi.csv`.

### `unit_di_luar_cakupan` (4)

- 2024-2021: 'JBN - AFT Sultan Muhammad Salahuddin Bima' ada di Excel tetapi bukan bagian dari 26 lokasi; diabaikan.
- 2025: 'JBN - AFT Sultan Muhammad Salahuddin Bima' ada di Excel tetapi bukan bagian dari 26 lokasi; diabaikan.
- 2026: 'JBN - AFT Sultan Muhammad Salahuddin Bima' ada di Excel tetapi bukan bagian dari 26 lokasi; diabaikan.
- Listrik Lokasi: 'AFT Salahuddin Bima' ada di Excel tetapi bukan bagian dari 26 lokasi; diabaikan.
