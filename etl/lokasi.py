"""Master 26 lokasi yang masuk cakupan dashboard.

Nama resmi mengikuti daftar dari user. `alias` berisi semua variasi nama yang
dipakai di workbook Excel (sheet 2024-2021, 2025, 2026, Grading, Listrik Lokasi).
Lokasi yang tidak ada di daftar ini (mis. AFT Sultan Muhammad Salahuddin Bima,
region lain) sengaja diabaikan.
"""
import re

PT = "PT Pertamina Patra Niaga"

# (id, nama resmi, tipe, provinsi, [alias di Excel])
_LOKASI = [
    ("it-surabaya", f"{PT} - IT Surabaya", "Integrated Terminal", "Jawa Timur", ["IT Surabaya"]),
    ("it-tanjung-wangi", f"{PT} - IT Tanjung Wangi", "Integrated Terminal", "Jawa Timur", ["IT Tanjung Wangi"]),
    ("it-manggis", f"{PT} - IT Manggis", "Integrated Terminal", "Bali", ["IT Manggis"]),
    ("it-ampenan", f"{PT} - IT Ampenan", "Integrated Terminal", "Nusa Tenggara Barat", ["IT Ampenan"]),
    ("it-bima", f"{PT} - IT Bima", "Integrated Terminal", "Nusa Tenggara Barat", ["IT Bima"]),
    ("ft-tuban", f"{PT} - FT Tuban", "Fuel Terminal", "Jawa Timur", ["FT Tuban"]),
    ("ft-madiun", f"{PT} - FT Madiun", "Fuel Terminal", "Jawa Timur", ["FT Madiun"]),
    ("ft-malang", f"{PT} - FT Malang", "Fuel Terminal", "Jawa Timur", ["FT Malang"]),
    ("ft-camplong", f"{PT} - FT Camplong", "Fuel Terminal", "Jawa Timur", ["FT Camplong"]),
    ("ft-sanggaran", f"{PT} - FT Sanggaran", "Fuel Terminal", "Bali", ["FT Sanggaran"]),
    ("ft-badas", f"{PT} - FT Badas", "Fuel Terminal", "Nusa Tenggara Barat", ["FT Badas"]),
    # Di Excel tertulis "IT Tenau"; nama resmi dari user "FT Tenau".
    ("ft-tenau", f"{PT} - FT Tenau", "Fuel Terminal", "Nusa Tenggara Timur", ["IT Tenau", "FT Tenau"]),
    ("ft-maumere", f"{PT} - FT Maumere", "Fuel Terminal", "Nusa Tenggara Timur", ["FT Maumere"]),
    ("ft-atapupu", f"{PT} - FT Atapupu", "Fuel Terminal", "Nusa Tenggara Timur", ["FT Atapupu"]),
    ("ft-ende", f"{PT} - FT Ende", "Fuel Terminal", "Nusa Tenggara Timur", ["FT Ende"]),
    ("ft-kalabahi", f"{PT} - FT Kalabahi", "Fuel Terminal", "Nusa Tenggara Timur", ["FT Kalabahi"]),
    ("ft-reo", f"{PT} - FT Reo", "Fuel Terminal", "Nusa Tenggara Timur", ["FT Reo"]),
    ("ft-waingapu", f"{PT} - FT Waingapu", "Fuel Terminal", "Nusa Tenggara Timur", ["FT Waingapu"]),
    ("aft-juanda", f"{PT} - AFT Juanda", "Aviation Fuel Terminal", "Jawa Timur", ["AFT Juanda"]),
    ("aft-iswahjudi", f"{PT} - AFT Iswahjudi", "Aviation Fuel Terminal", "Jawa Timur", ["AFT Iswahyudi", "AFT Iswahjudi"]),
    ("aft-ngurah-rai", f"{PT} - AFT Ngurah Rai", "Aviation Fuel Terminal", "Bali", ["AFT Ngurah Rai"]),
    ("aft-bil", f"{PT} - AFT BIL", "Aviation Fuel Terminal", "Nusa Tenggara Barat",
     ["AFT Bandara Internasional Lombok", "AFT BIL"]),
    ("aft-eltari", f"{PT} - AFT Eltari", "Aviation Fuel Terminal", "Nusa Tenggara Timur", ["AFT El Tari", "AFT Eltari"]),
    ("bitumen-plant-gresik", f"{PT} - Bitumen Plant Gresik", "Bitumen Plant", "Jawa Timur",
     ["Bitumen Plant Gresik", "BPG"]),
    ("ft-larantuka", f"{PT} - FT Larantuka", "Fuel Terminal", "Nusa Tenggara Timur", ["FT Larantuka"]),
    # Tidak ada di workbook sama sekali — tetap didaftarkan agar dashboard bisa menampilkan "belum ada data".
    ("depot-lpg-tanjung-perak", "PT. Pertamina (Persero) - MOR V Depot LPG Tanjung Perak", "Depot LPG", "Jawa Timur",
     ["Depot LPG Tanjung Perak"]),
]

LOKASI = [
    {"lokasi_id": i, "nama_resmi": n, "nama_singkat": n.split(" - ", 1)[1].replace("MOR V ", ""),
     "tipe": t, "provinsi": p, "alias_excel": a}
    for i, n, t, p, a in _LOKASI
]


def _kunci(nama: str) -> str:
    """Normalisasi nama untuk pencocokan: buang prefix region, spasi ganda, huruf besar."""
    s = re.sub(r"\s+", " ", str(nama)).strip().lower()
    s = re.sub(r"^(jbn|jatimbalinus)\s*-\s*", "", s)
    return s


_INDEKS = {_kunci(alias): lok["lokasi_id"] for lok in LOKASI for alias in lok["alias_excel"]}


def cari_lokasi(nama_excel):
    """Kembalikan lokasi_id untuk nama unit di Excel, atau None jika di luar cakupan."""
    if not nama_excel:
        return None
    return _INDEKS.get(_kunci(nama_excel))
