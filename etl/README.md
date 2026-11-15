# Konversi Data PHORSE (Excel → data bersih)

Mengubah `Data/Identifikasi Data ESG Aspek Enviro JBN (PHORSE).xlsx` menjadi tabel rapi untuk
dashboard. File Excel asli hanya dibaca, tidak pernah diubah.

## Menjalankan

```bash
pip install -r requirements.txt
python -m etl.konversi                         # pakai file .xlsx pertama di Data/
python -m etl.konversi "path/file baru.xlsx"   # kalau client mengirim versi baru
```

Waktu proses sekitar 30–45 detik. Hasilnya ditulis ke `output/`.

## Sumber yang dibaca

| Sheet | Isi | Granularitas |
|---|---|---|
| `2024-2021` | Data input 2021–2024 | tahunan |
| `2025` | Data input 2025 | bulanan |
| `2026` | Data input 2026, dengan rincian per produk BBM | bulanan |
| `Listrik Lokasi` | kWh listrik 2026 per lokasi | bulanan |
| `Grading 2024` | Hanya kolom grade unit (A–F / I–VI) | — |

`Grading 2024` dan `P-HORSE 2024` hanya berisi VLOOKUP/penjumlahan dari `2024-2021`, sehingga tidak dibaca
ulang. Cakupan dibatasi ke 26 lokasi di `etl/lokasi.py`.

## Output

| File | Isi |
|---|---|
| `fakta.csv` | Satu baris per nilai bukan nol, dengan `sheet` + `sel` asal di Excel |
| `metrik.csv` | Kamus metrik: hierarki level, satuan, header asli tiap sheet |
| `lokasi.csv` / `lokasi.json` | 26 lokasi: nama resmi, tipe, provinsi, grade 2024, ketersediaan data |
| `kelengkapan.csv` | Per lokasi × periode × kategori: jumlah sel input yang terisi |
| `listrik_lokasi.csv` | Data sheet Listrik Lokasi (kWh dan alokasi MWh) |
| `validasi.csv` | Semua temuan kualitas data, lengkap dengan alamat sel |
| `laporan_validasi.md` | Ringkasan temuan yang mudah dibaca |

## Aturan memakai `fakta.csv` (penting untuk dashboard)

1. **`metrik_id` berbentuk path**, mis. `Operasional > Penyaluran > MT > Gasoline > Pertalite`.
   Metrik yang sama dari tahun berbeda memakai id yang sama.
2. **Untuk menjumlah, pakai hanya baris `is_subtotal = 0`** dengan awalan path yang diinginkan.
   Contoh total Penyaluran Gasoline: jumlahkan semua `is_subtotal = 0` yang `metrik_id`-nya diawali
   `Operasional > Penyaluran > ` dan mengandung `> Gasoline`. Baris subtotal hanya untuk pengecekan.
3. **"Tidak Terinci"**: jika Total di Excel lebih besar dari jumlah rinciannya, selisihnya disimpan sebagai
   `… > Tidak Terinci` (flag `rincian_kosong` / `selisih_subtotal`). Dengan begitu aturan no. 2 selalu
   menghasilkan nilai Total yang dilaporkan.
4. **Nilai nol tidak disimpan.** Metrik yang tidak ada di `fakta.csv` bernilai 0 jika kategorinya terisi pada
   periode itu (lihat `kelengkapan.csv`), atau "belum diisi" jika kategorinya kosong.
5. **Jangan menjumlah lintas granularitas.** 2021–2024 tahunan, 2025–2026 bulanan.
6. **`satuan` per baris.** Beban pencemaran bisa `ton` atau `mg/L` (konsentrasi). Jangan dijumlah, dan jangan
   dicampur dengan satuan berbeda.
7. **Luas Lahan Hijau** adalah nilai keadaan, bukan aliran. Ambil nilai terakhir, jangan dijumlah per bulan.
8. `dihitung = 1` berarti nilai berasal dari rumus di Excel (mis. Penimbunan 2026 = penerimaan pipa + kapal).

## Pembersihan yang dilakukan

- Nama unit diseragamkan ke 26 lokasi resmi (mis. "IT Tenau" → FT Tenau, "AFT El Tari" → AFT Eltari).
- Placeholder `Note here`, `-`, `N/A` dianggap kosong. `NIHIL` dianggap 0. `#REF!` dianggap kosong dan dicatat.
- Angka dalam teks dikonversi: `"3,5"` → 3,5; `"36 (mg/L)"` → 36 bersatuan mg/L; `"1.6 (B40)"` → 1,6
  dengan keterangan B40; `"22.130 M2"` → 2,213 Ha.
- Teks seperti `"1.800"` (titik desimal atau ribuan?) diputuskan dari median nilai lain di lokasi dan metrik
  yang sama. Keputusannya tercatat di `validasi.csv`.
- Label produk yang salah salin di header 2026 dikoreksi berdasarkan posisi kolom (kolom GB–GD, KM–KP, KX–KZ).
- Kolom header yang tidak dikenali dilaporkan sebagai **error**, supaya tidak ada data yang hilang diam-diam
  ketika format Excel berubah.
