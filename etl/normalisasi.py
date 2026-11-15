"""Penyeragaman header kolom dan parsing nilai sel.

Ketiga sheet input (2024-2021, 2025, 2026) memakai header bertingkat dengan ejaan
yang berbeda-beda. Modul ini mengubah setiap kolom menjadi satu `metrik_id`
berbentuk path, mis. "Operasional > Penyaluran > MT > Gasoline > Pertalite",
sehingga metrik yang sama dari tahun berbeda punya id yang sama.
"""
import re

KATEGORI = ["Lahan Hijau", "Operasional", "Energi", "Emisi", "Sampah", "Air", "Limbah B3", "Biaya Lingkungan"]

SATUAN_DEFAULT = {
    "Lahan Hijau": "Ha", "Operasional": "kL", "Emisi": "ton", "Sampah": "ton",
    "Limbah B3": "ton", "Biaya Lingkungan": "Rp",
}

GRUP_LUBE = "Lube Base/Aditif/Bitumen/FAME/Ethanol"

# Urutan produk yang benar per grup BBM (dipakai untuk mengoreksi label yang salah posisi di sheet 2026).
PRODUK_GRUP = {
    "Gasoline": ["Pertalite", "Pertamax", "Pertamax Green", "Pertamax Turbo", "Lainnya"],
    "Gasoil": ["Biosolar", "Dexlite", "Pertamina Dex", "Lainnya", "Lainnya"],
    "Avtur/LPG": ["Avtur", "LPG", "Kerosene", "Lainnya"],
    "Minyak Berat": ["MDF", "LSFO", "HSFO", "Lainnya"],
    GRUP_LUBE: ["Lube Base", "Aditif", "Bitumen", "FAME", "Ethanol", "Lainnya"],
}
AKTIVITAS = {"Penerimaan", "Penimbunan", "Penyaluran"}
MODA = {"Jalur Pipa", "Kapal", "RTW", "MT", "Bunker Kapal", "Drum/Lithos"}
METODE_SAMPAH = {"Reduce", "Reuse & Recycle", "Dibuang ke Pihak Ketiga", "Lainnya"}
PERALATAN_GENSET = {"Genset", "Pompa PMK", "Dapur/Lainnya"}

# Kunci: label header (huruf kecil, satuan sudah dibuang). Nilai: daftar segmen pengganti ([] = buang).
ALIAS = {
    "produksi": ["Operasional"],
    "environment cost": ["Biaya Lingkungan"],
    "environmental management cost": [],
    "type of activity": [],
    "luas lahan hijau": ["Lahan Hijau", "Luas Lahan Hijau"],
    # Operasional
    "gasoline (pertalite, dll)": ["Gasoline"],
    "gasoil (biosolar, dll)": ["Gasoil"],
    "avtur/lpg (avtur, kerosene, dll)": ["Avtur/LPG"],
    "minyak berat (mdf, lsfo, hsfo, dll)": ["Minyak Berat"],
    "miinyak berat": ["Minyak Berat"],
    "lube base, aditif, bitumen, fame, ethanol, dll": [GRUP_LUBE],
    "bitume": ["Bitumen"],
    "bungker kapal": ["Bunker Kapal"],
    "drum, lithos, dll": ["Drum/Lithos"],
    "pertamina dex": ["Pertamina Dex"],
    "px green pg95": ["Pertamax Green"],
    # Energi
    "own used pompa produk, dll": ["Own Use Pompa Produk"],
    "ownuse mt/refueler/dispenser": ["Own Use MT/Refueler/Dispenser"],
    "own used genset/pompa pmk/dapur, dll": ["Own Use Genset/Pompa PMK/Dapur"],
    "own used kendaraan operasional/vacuum truck/fire jeep/fire truck, dll": ["Own Use Kendaraan Operasional"],
    "ownuse alat babat rumput": ["Own Use Alat Babat Rumput"],
    "energi listrik rumah dinas, masjid, sarana penunjang lainnya": ["Energi Listrik Rumah Dinas/Masjid/Sarana Lainnya"],
    "energi listrik solar cell/green energi lainnya": ["Energi Listrik Solar Cell/Energi Hijau"],
    # Emisi
    "emisi kegiatan operasi": ["Kegiatan Operasi"],
    "emisi kegiatan penunjang operasi": ["Kegiatan Penunjang Operasi"],
    "emisi penunjang non operasi": ["Kegiatan Penunjang Non Operasi"],
    "emisi fuel combustion": ["Fuel Combustion"],
    "emisi kegiatan mobile sources": ["Mobile Sources"],
    "emisi kegiatan stationary": ["Stationary"],
    "emisi ghg scope 1": ["GHG Scope 1"],
    "emisi ghg scope 2": ["GHG Scope 2"],
    "emisi non ghg": ["Non GHG"],
    "cfc/halons/ trichloroethane": ["CFC/Halon/Trichloroethane"],
    # Sampah
    "sampah yang dihasilkan": ["Dihasilkan"],
    "sampah yang dikelola": ["Dikelola"],
    "dibuang ke pihak ketiga": ["Dibuang ke Pihak Ketiga"],
    # Air
    "pengambilan kebutuhan air kegiatan operasi": ["Pengambilan Air", "Kegiatan Operasi"],
    "pengambilan kebutuhan air kegiatan penunjang operasi": ["Pengambilan Air", "Kegiatan Penunjang Operasi"],
    "pengambilan kebutuhan air kegiatan penunjang non operasi": ["Pengambilan Air", "Kegiatan Penunjang Non Operasi"],
    "debit effluent air limbah operasional": ["Effluent Air Limbah", "Operasional"],
    "debit effluent air limbah domestik": ["Effluent Air Limbah", "Domestik"],
    "beban pencemaran air limbah": ["Beban Pencemaran"],
    "toc (oil catcher)": ["Oil Catcher", "TOC"],
    "minyak & lemak (oil catcher)": ["Oil Catcher", "Minyak & Lemak"],
    "ammoniak total (ipal domestik)": ["IPAL Domestik", "Amonia Total"],
    "cod (ipal domestik)": ["IPAL Domestik", "COD"],
    "bod (ipal domestik)": ["IPAL Domestik", "BOD"],
    "minyak & lemak (ipal domestik)": ["IPAL Domestik", "Minyak & Lemak"],
    "tss (ipal domestik)": ["IPAL Domestik", "TSS"],
    # Limbah B3
    "limbah b3 yang dihasilkan": ["Dihasilkan"],
    "limbah b3 yang dikelola": ["Dikelola"],
    "pengelolaan lanjutan limbah b3": ["Pengelolaan Lanjutan"],
    "alternatif raw material": ["Alternatif Raw Material"],
    "treatment lainnya, insinerasi, dll": ["Insinerasi/Treatment Lainnya"],
    # Biaya
    "environmantal training": ["Environmental Training"],
}
# Label yang berarti "jumlah dari kolom-kolom di bawahnya".
ALIAS_TOTAL = {
    "total sampah dihasilkan": ["Dihasilkan"],
    "total sampah dikelola": ["Dikelola"],
    "total sampah yang dikelola": ["Dikelola"],
}
# Kolom identitas / pengecekan yang bukan data.
BUKAN_DATA = {"unit operasi", "bulan", "tahun", "grading", "ceklis"}

_SATUAN_RE = re.compile(r"\(\s*(KL[^)]*|kL|MWh|ton|m3|Ha|Rupiah)\s*\)", re.I)


def bersihkan(teks) -> str:
    return re.sub(r"\s+", " ", str(teks).replace("\n", " ")).strip()


def _ambil_satuan(seg):
    m = _SATUAN_RE.search(seg)
    if not m:
        return seg, None
    s = m.group(1).lower()
    satuan = "kL" if s.startswith("kl") else {"mwh": "MWh", "ton": "ton", "m3": "m3", "ha": "Ha", "rupiah": "Rp"}[s]
    return bersihkan(_SATUAN_RE.sub("", seg)), satuan


def normalisasi_header(raw_segs):
    """Ubah daftar label header mentah menjadi (kategori, segs, satuan, is_total).

    Mengembalikan None untuk kolom yang bukan data (Unit Operasi, Bulan, dst).
    """
    segs, satuan, is_total = [], None, False
    for raw in raw_segs:
        seg = bersihkan(raw)
        if not seg:
            continue
        seg, sat = _ambil_satuan(seg)
        satuan = satuan or sat
        key = seg.lower()
        if key in BUKAN_DATA:
            return None
        if key == "total":
            is_total = True
            continue
        if key in ALIAS_TOTAL:
            is_total = True
            segs.extend(ALIAS_TOTAL[key])
            continue
        segs.extend(ALIAS.get(key, [seg]))
    if not segs:
        return None

    kategori = segs[0]
    if kategori in KATEGORI:
        segs = segs[1:]
    elif kategori.startswith("Kegiatan "):  # sheet 2025 tidak punya label "Energi" di level teratas
        kategori = "Energi"
    elif kategori == "Fuel Combustion":  # sheet 2024-2021: grup ini di luar merge "Emisi"
        kategori = "Emisi"
    else:
        return None

    if kategori == "Sampah" and segs and segs[0] in METODE_SAMPAH:
        segs = ["Dikelola"] + segs
    # 2026 memecah own-use genset per peralatan: taruh produk sebelum peralatan agar
    # "… > Own Use Genset/Pompa PMK/Dapur > Biosolar" sejajar dengan sheet 2025/2024.
    if kategori == "Energi" and len(segs) >= 3 and segs[-2] in PERALATAN_GENSET:
        segs[-2], segs[-1] = segs[-1], segs[-2]

    if satuan is None:
        if kategori == "Air":
            satuan = "ton" if segs and segs[0] == "Beban Pencemaran" else "m3"
        else:
            satuan = SATUAN_DEFAULT.get(kategori)
    return kategori, segs, satuan, is_total


def rapikan_operasional(kolom, detail_produk, catat_koreksi):
    """Tetapkan grup BBM untuk kolom Operasional di sheet yang punya rincian produk (2026).

    `kolom`: list dict berurutan (col, kategori, segs, is_total, raw_last). Diubah in-place.
    Di 2026, kolom subtotal grup (mis. "Avtur/LPG … Total") diikuti kolom produk,
    tetapi sebagian produk tidak membawa nama grupnya di header ("Avtur", "LPG"),
    dan beberapa label produk salah salin (mis. "Pertamax Turbo" di bawah Gasoil).
    """
    if not detail_produk:
        return
    grup_aktif = None  # (prefix, grup, [kolom anak])
    semua_grup = []
    for k in kolom:
        if k["kategori"] != "Operasional":
            continue
        prefix = [s for s in k["segs"] if s in AKTIVITAS or s in MODA]
        sisa = [s for s in k["segs"] if s not in AKTIVITAS and s not in MODA]
        label_panjang = "," in k["raw_last"] or "(" in k["raw_last"]
        if sisa and sisa[-1] in PRODUK_GRUP and (k["is_total"] or label_panjang):
            grup_aktif = (prefix, sisa[-1], [])
            semua_grup.append(grup_aktif)
            k["segs"] = prefix + [sisa[-1]]
            k["is_total"] = True
        elif grup_aktif and grup_aktif[0] == prefix and sisa:
            grup_aktif[2].append(k)
            k["_label"] = sisa[-1]
        else:
            grup_aktif = None
    for prefix, grup, anak in semua_grup:
        harapan = PRODUK_GRUP[grup]
        label = [k["_label"] for k in anak]
        cocok = len(label) <= len(harapan) and all(a == b for a, b in zip(label, harapan))
        for i, k in enumerate(anak):
            baru = label[i]
            if not cocok:
                baru = harapan[i] if i < len(harapan) else "Lainnya"
                if baru != label[i]:
                    catat_koreksi(k["col"], " > ".join(prefix + [grup]), label[i], baru)
            k["segs"] = prefix + [grup, baru]


# ---------------------------------------------------------------- nilai sel

_PLACEHOLDER = {"", "-", "--", "note here", "n/a", "na", "#n/a", "tidak ada"}
_NOL = {"nihil", "nil"}
_ERROR_RE = re.compile(r"^#(REF!|VALUE!|DIV/0!|NAME\?|N/A|NUM!|NULL!)", re.I)
_ANGKA_RE = re.compile(r"^['\s]*(-?\d[\d.,]*)\s*(.*)$", re.S)


def _ke_float(s):
    """Konversi string angka. Mengembalikan (nilai, flag)."""
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):  # 1.234,5 (format Indonesia)
            return float(s.replace(".", "").replace(",", ".")), "format_indonesia"
        return float(s.replace(",", "")), "format_inggris"
    if "," in s:
        return float(s.replace(",", ".")), "koma_desimal"
    if re.fullmatch(r"-?[1-9]\d{0,2}(\.\d{3})+", s):
        # Mis. "1.800": bisa 1,8 (titik desimal) atau 1800 (titik ribuan sesuai catatan di Excel).
        # Diputuskan belakangan dari konteks nilai lain (lihat konversi.putuskan_titik_ambigu).
        return float(s), "titik_ambigu"
    return float(s), None


def parse_nilai(v):
    """Kembalikan dict: status, nilai, keterangan, satuan (override), flag.

    status: kosong | angka | teks_angka | nihil | placeholder | error | teks
    """
    hasil = {"status": "kosong", "nilai": None, "keterangan": "", "satuan": None, "flag": ""}
    if v is None:
        return hasil
    if isinstance(v, bool):
        hasil.update(status="teks", keterangan=str(v))
        return hasil
    if isinstance(v, (int, float)):
        hasil.update(status="angka", nilai=float(v))
        return hasil
    teks = str(v).strip()
    low = teks.lower()
    if low in _PLACEHOLDER:
        hasil["status"] = "placeholder"
        return hasil
    if low in _NOL:
        hasil.update(status="nihil", nilai=0.0, keterangan=teks)
        return hasil
    if _ERROR_RE.match(teks):
        hasil.update(status="error", keterangan=teks)
        return hasil
    if len(re.findall(r"\d", teks)) and "\n" in teks.strip() and len(re.findall(r"\d[\d.,]*", teks)) > 1:
        hasil.update(status="teks", keterangan=teks, flag="multi_nilai")
        return hasil
    m = _ANGKA_RE.match(teks)
    if not m:
        hasil.update(status="teks", keterangan=teks)
        return hasil
    try:
        nilai, flag = _ke_float(m.group(1))
    except ValueError:
        hasil.update(status="teks", keterangan=teks)
        return hasil
    sisa = m.group(2).strip()
    if re.search(r"mg\s*/\s*l", sisa, re.I):
        hasil["satuan"] = "mg/L"
        sisa = ""
    elif re.fullmatch(r"m\s*2|m²", sisa, re.I):
        # Luas ditulis dalam m² (mis. "22.130 M2"); angka luas memakai titik ribuan → konversi ke hektar.
        m2 = float(m.group(1).replace(".", "").replace(",", ".")) if flag == "titik_ambigu" else nilai
        hasil.update(status="teks_angka", nilai=m2 / 10000, satuan="Ha", flag="m2_ke_ha",
                     keterangan=f"dikonversi dari {m2:g} m2")
        return hasil
    hasil.update(status="teks_angka", nilai=nilai, flag=flag or "",
                 keterangan=sisa.strip("()' ").strip())
    return hasil


BULAN = {
    "jan": 1, "januari": 1, "feb": 2, "februari": 2, "mar": 3, "maret": 3, "apr": 4, "april": 4,
    "may": 5, "mei": 5, "jun": 6, "june": 6, "juni": 6, "jul": 7, "july": 7, "juli": 7,
    "aug": 8, "agu": 8, "agustus": 8, "agt": 8, "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "okt": 10, "oktober": 10, "nov": 11, "november": 11,
    "dec": 12, "des": 12, "desember": 12,
}


def parse_bulan(v):
    if v is None:
        return None
    return BULAN.get(str(v).strip().lower())
