"""Konversi workbook "Identifikasi Data ESG Aspek Enviro JBN (PHORSE).xlsx" menjadi data bersih.

Jalankan dari folder proyek:
    python -m etl.konversi                       # pakai file .xlsx pertama di folder Data/
    python -m etl.konversi path/ke/file.xlsx --out output

File Excel asli hanya dibaca, tidak pernah diubah.
"""
import argparse
import csv
import json
import math
import re
import statistics
import sys
import time
from collections import defaultdict
from pathlib import Path

import openpyxl
from openpyxl.utils import get_column_letter as huruf

from . import ekspor_db, validasi
from .lokasi import LOKASI, cari_lokasi
from .normalisasi import (BUKAN_DATA, KATEGORI, bersihkan, normalisasi_header, parse_bulan, parse_nilai,
                          rapikan_operasional)

ROOT = Path(__file__).resolve().parent.parent

SHEET_INPUT = [
    {"nama": "2024-2021", "header": (4, 8), "data_mulai": 9, "granularitas": "tahunan", "detail_produk": False},
    {"nama": "2025", "header": (4, 7), "data_mulai": 8, "granularitas": "bulanan", "tahun": 2025,
     "detail_produk": False},
    {"nama": "2026", "header": (6, 11), "data_mulai": 12, "granularitas": "bulanan", "tahun": 2026,
     "detail_produk": True},
]
SHEET_LISTRIK = "Listrik Lokasi"
SHEET_GRADING = "Grading 2024"
TAHUN_LISTRIK = 2026  # sheet Listrik Lokasi tidak mencantumkan tahun; isinya cocok dengan sheet 2026 (Jan–Okt)

_REF_RE = re.compile(r"(?<![A-Za-z])\$?[A-Z]{1,3}\$?\d+")


class Hasil:
    def __init__(self):
        self.fakta = []          # nilai bukan nol, satu baris per sel
        self.baris = []          # semua nilai numerik per baris Excel (untuk validasi)
        self.kelengkapan = defaultdict(lambda: [0, 0, 0])  # key -> [kolom_input, terisi, nonnol]
        self.temuan = []
        self.skema = {}          # sheet -> list kolom
        self.lokasi_per_sheet = defaultdict(set)
        self.di_luar_cakupan = defaultdict(set)
        self.blok_bulan = defaultdict(list)  # (sheet, lokasi) -> [bulan…]
        self.listrik = []
        self.grade = {}
        self.sel_cek = set()     # (sheet, sel) yang ditandai "perlu dicek" di dashboard
        self.statistik = defaultdict(int)

    def catat(self, jenis, tingkat, keterangan, **kw):
        self.temuan.append({"jenis": jenis, "tingkat": tingkat, "keterangan": keterangan, **kw})


# ------------------------------------------------------------------ header

def baca_header(ws, r1, r2):
    """Gabungkan header bertingkat (termasuk merged cell) menjadi list label per kolom."""
    grid = {}
    for r, row in enumerate(ws.iter_rows(min_row=r1, max_row=r2, values_only=True), start=r1):
        for c, v in enumerate(row, start=1):
            if v is not None and bersihkan(v):
                grid[(r, c)] = bersihkan(v)
    for m in ws.merged_cells.ranges:
        if not (r1 <= m.min_row <= r2):
            continue
        v = grid.get((m.min_row, m.min_col))
        if v is None:
            continue
        for r in range(m.min_row, min(m.max_row, r2) + 1):
            for c in range(m.min_col, m.max_col + 1):
                grid[(r, c)] = v
    hasil = {}
    for c in range(1, ws.max_column + 1):
        segs = []
        for r in range(r1, r2 + 1):
            v = grid.get((r, c))
            if v and (not segs or segs[-1] != v):
                segs.append(v)
        if segs:
            hasil[c] = segs
    return hasil


def susun_skema(ws, cfg, hasil):
    sheet = cfg["nama"]
    kolom = []
    for c, raw in baca_header(ws, *cfg["header"]).items():
        n = normalisasi_header(raw)
        if not n:
            if not any(bersihkan(x).lower() in BUKAN_DATA for x in raw):
                hasil.catat("kolom_tidak_dikenali", "error",
                            f"Header '{' > '.join(raw)}' tidak dikenali sehingga kolom ini TIDAK ikut dikonversi. "
                            f"Tambahkan aturannya di etl/normalisasi.py.", sheet=sheet, sel=f"{huruf(c)} (header)")
            continue
        kategori, segs, satuan, is_total = n
        raw_last = next((x for x in reversed(raw) if x.lower() != "total"), raw[-1])
        kolom.append({"col": c, "huruf": huruf(c), "kategori": kategori, "segs": segs, "satuan": satuan,
                      "is_total": is_total, "raw_last": raw_last, "header_asli": " > ".join(raw)})

    def catat_koreksi(col, grup, lama, baru):
        hasil.catat("label_header_dikoreksi", "peringatan",
                    f"Label '{lama}' di bawah grup '{grup}' tidak sesuai urutan produk; dibaca sebagai '{baru}' "
                    f"berdasarkan posisi kolom.", sheet=sheet, sel=f"{huruf(col)} (header)")

    rapikan_operasional(kolom, cfg["detail_produk"], catat_koreksi)

    terpakai = set()
    for k in kolom:
        kunci = (k["kategori"], tuple(k["segs"]))
        if kunci in terpakai:
            n = 2
            while (k["kategori"], tuple(k["segs"][:-1] + [f"{k['segs'][-1]} ({n})"])) in terpakai:
                n += 1
            lama = k["segs"][-1]
            k["segs"] = k["segs"][:-1] + [f"{lama} ({n})"]
            kunci = (k["kategori"], tuple(k["segs"]))
            hasil.catat("header_ganda", "info",
                        f"Header '{' > '.join([k['kategori']] + k['segs'][:-1] + [lama])}' muncul lebih dari sekali; "
                        f"kolom ini diberi nama '{k['segs'][-1]}'.", sheet=sheet, sel=f"{k['huruf']} (header)")
        terpakai.add(kunci)

    for k in kolom:
        p = k["segs"]
        k["is_subtotal"] = k["is_total"] or any(
            o is not k and o["kategori"] == k["kategori"] and len(o["segs"]) > len(p) and o["segs"][:len(p)] == p
            for o in kolom)
        k["metrik_id"] = " > ".join([k["kategori"]] + k["segs"])
    return kolom


# ------------------------------------------------------------------ data

def baca_formula_berreferensi(path, nama_sheet):
    """Sel berisi rumus yang merujuk sel lain (nilai turunan, bukan input).

    Rumus konstanta seperti '=22076172/1000' dianggap input manual.
    """
    wb = openpyxl.load_workbook(path, read_only=True)
    hasil = {}
    for nama in nama_sheet:
        s = set()
        for r, row in enumerate(wb[nama].iter_rows(values_only=True), start=1):
            for c, v in enumerate(row, start=1):
                if isinstance(v, str) and v.startswith("=") and _REF_RE.search(re.sub(r'"[^"]*"', "", v)):
                    s.add((r, c))
        hasil[nama] = s
    wb.close()
    return hasil


def baca_sheet(ws, cfg, kolom, formula, hasil):
    sheet = cfg["nama"]
    unit_aktif = None
    for r, row in enumerate(ws.iter_rows(min_row=cfg["data_mulai"], values_only=True), start=cfg["data_mulai"]):
        b = row[1] if len(row) > 1 else None
        if cfg["granularitas"] == "bulanan":
            b_c, b_d = parse_bulan(row[2]), parse_bulan(row[3])
            bulan = b_d or b_c
            if isinstance(b, str) and bersihkan(b):
                unit_aktif = bersihkan(b) if bulan else None
            if not bulan or not unit_aktif:
                continue
            tahun, unit = cfg["tahun"], unit_aktif
        else:
            if not (isinstance(b, str) and isinstance(row[2], (int, float))):
                continue
            tahun, bulan = int(row[2]), None
            unit = re.sub(r"\s*\d{4}\s*$", "", bersihkan(b))
            b_c = b_d = None

        lok = cari_lokasi(unit)
        if not lok:
            if unit.upper().startswith("JBN"):
                hasil.di_luar_cakupan[sheet].add(unit)
            continue
        hasil.lokasi_per_sheet[sheet].add(lok)
        if bulan:
            hasil.blok_bulan[(sheet, lok)].append((bulan, r))
            if b_c and b_d and b_c != b_d:
                hasil.catat("label_bulan_beda", "peringatan",
                            f"Kolom C ('{row[2]}') dan D ('{row[3]}') menunjukkan bulan berbeda; dipakai kolom D.",
                            sheet=sheet, sel=f"C{r}", lokasi_id=lok, tahun=tahun, bulan=bulan)

        nilai_baris = {}
        for k in kolom:
            v = row[k["col"] - 1] if k["col"] - 1 < len(row) else None
            p = parse_nilai(v)
            sel = f"{k['huruf']}{r}"
            dihitung = (r, k["col"]) in formula
            ctx = dict(sheet=sheet, sel=sel, lokasi_id=lok, tahun=tahun, bulan=bulan, metrik_id=k["metrik_id"])

            if not k["is_subtotal"] and not dihitung:
                kel = hasil.kelengkapan[(lok, sheet, tahun, bulan, k["kategori"])]
                kel[0] += 1
                if p["nilai"] is not None:
                    kel[1] += 1
                    if p["nilai"] != 0:
                        kel[2] += 1

            hasil.statistik[f"status_{p['status']}"] += 1
            if p["status"] == "error":
                hasil.catat("error_excel", "error", f"Sel berisi error Excel {p['keterangan']}; dianggap kosong.",
                            nilai=p["keterangan"], **ctx)
            elif p["status"] == "teks":
                hasil.catat("teks_tidak_terbaca", "error" if p["flag"] == "multi_nilai" else "peringatan",
                            ("Sel berisi beberapa angka sekaligus; tidak dipakai." if p["flag"] == "multi_nilai"
                             else "Sel berisi teks yang bukan angka; tidak dipakai."),
                            nilai=repr(v), **ctx)
            elif p["status"] == "teks_angka" and p["flag"] == "m2_ke_ha":
                hasil.catat("angka_dari_teks", "peringatan",
                            f"Teks '{v}' bersatuan m2; dibaca sebagai {p['nilai']:g} Ha (titik = pemisah ribuan).",
                            nilai=repr(v), **ctx)
            elif p["status"] == "teks_angka" and p["flag"] != "titik_ambigu":  # titik_ambigu dicatat belakangan
                hasil.catat("angka_dari_teks", "info",
                            f"Teks '{v}' dibaca sebagai angka {p['nilai']:g}"
                            + (f" {p['satuan']}" if p["satuan"] else "")
                            + (f" (keterangan: {p['keterangan']})" if p["keterangan"] else "") + ".",
                            nilai=repr(v), **ctx)

            if p["nilai"] is None:
                continue
            if p["nilai"] < 0:
                hasil.catat("nilai_negatif", "peringatan", f"Nilai negatif {p['nilai']:g}.", nilai=p["nilai"], **ctx)
            nilai_baris[k["metrik_id"]] = p["nilai"]
            if p["nilai"] == 0:
                continue
            hasil.fakta.append({
                "lokasi_id": lok, "tahun": tahun, "bulan": bulan or "", "granularitas": cfg["granularitas"],
                "kategori": k["kategori"], "metrik_id": k["metrik_id"], "satuan": p["satuan"] or k["satuan"],
                "nilai": p["nilai"], "is_subtotal": int(k["is_subtotal"]), "dihitung": int(dihitung),
                "nilai_asli": v if isinstance(v, str) else "", "keterangan": p["keterangan"], "flag": p["flag"],
                "sheet": sheet, "sel": sel,
            })
        hasil.baris.append({"sheet": sheet, "row": r, "lokasi_id": lok, "tahun": tahun, "bulan": bulan,
                            "nilai": nilai_baris})


def putuskan_titik_ambigu(hasil):
    """Tentukan arti titik pada teks seperti "1.800" dari nilai lain di lokasi & metrik yang sama.

    Dipilih tafsiran (desimal 1,8 atau ribuan 1800) yang paling dekat (skala log) ke median
    nilai pembanding. Tanpa pembanding, tafsiran desimal dipakai dan diberi peringatan.
    """
    pembanding = defaultdict(list)
    for f in hasil.fakta:
        if f["flag"] != "titik_ambigu" and f["nilai"] > 0:
            pembanding[(f["lokasi_id"], f["metrik_id"])].append(f["nilai"])
    baris = {(b["sheet"], b["row"]): b for b in hasil.baris}
    for f in hasil.fakta:
        if f["flag"] != "titik_ambigu":
            continue
        desimal, ribuan = f["nilai"], f["nilai"] * 1000
        ref = pembanding.get((f["lokasi_id"], f["metrik_id"]))
        ctx = dict(sheet=f["sheet"], sel=f["sel"], lokasi_id=f["lokasi_id"], tahun=f["tahun"],
                   bulan=f["bulan"] or None, metrik_id=f["metrik_id"], nilai=repr(f["nilai_asli"]))
        if not ref:
            f["flag"] = "titik_ambigu_desimal"
            hasil.catat("angka_dari_teks", "peringatan",
                        f"Teks '{f['nilai_asli']}' dibaca {desimal:g} (titik = desimal). Tidak ada nilai pembanding; "
                        f"jika titik maksudnya ribuan, nilainya {ribuan:g}.", **ctx)
            continue
        med = statistics.median(ref)
        pakai_ribuan = abs(math.log(ribuan / med)) < abs(math.log(desimal / med))
        f["nilai"] = ribuan if pakai_ribuan else desimal
        f["flag"] = "titik_ambigu_ribuan" if pakai_ribuan else "titik_ambigu_desimal"
        b = baris[(f["sheet"], int(re.sub(r"[A-Z]+", "", f["sel"])))]
        b["nilai"][f["metrik_id"]] = f["nilai"]
        hasil.catat("angka_dari_teks", "info",
                    f"Teks '{f['nilai_asli']}' dibaca {f['nilai']:g} "
                    f"({'titik = ribuan' if pakai_ribuan else 'titik = desimal'}), karena nilai lain di lokasi ini "
                    f"untuk metrik yang sama bermedian {med:g}.", **ctx)


LABEL_TIDAK_TERINCI = "Tidak Terinci"


def rekonsiliasi_subtotal(hasil):
    """Jaga agar jumlah rincian (is_subtotal=0) = nilai Total yang dilaporkan.

    Di Excel sering Total terisi tetapi rinciannya kosong/kurang (mis. Bitumen Plant Gresik:
    total Lube/Bitumen terisi, kolom produk kosong). Jika Total > jumlah rincian, selisihnya
    ditambahkan sebagai metrik "<Total> > Tidak Terinci". Jika Total < jumlah rincian
    (biasanya Total 0/lupa diisi), rincian dipercaya dan tidak ada penyesuaian.
    Subtotal terdalam diproses lebih dulu agar tidak dihitung ganda.
    """
    hasil.metrik_sintetis = {}
    for sheet, kolom in hasil.skema.items():
        daun = {k["metrik_id"] for k in kolom if not k["is_subtotal"]}
        subtotal = sorted((k for k in kolom if k["is_subtotal"]), key=lambda k: -len(k["segs"]))
        for b in (b for b in hasil.baris if b["sheet"] == sheet):
            efektif = {m: v for m, v in b["nilai"].items() if m in daun}
            for s in subtotal:
                total = b["nilai"].get(s["metrik_id"])
                if not total or total <= 0:
                    continue
                awalan = s["metrik_id"] + " > "
                rincian = sum(v for m, v in efektif.items() if m.startswith(awalan))
                selisih = total - rincian
                if selisih <= max(0.01, 0.005 * total):
                    continue
                mid = awalan + LABEL_TIDAK_TERINCI
                efektif[mid] = selisih
                hasil.metrik_sintetis[mid] = s
                hasil.fakta.append({
                    "lokasi_id": b["lokasi_id"], "tahun": b["tahun"], "bulan": b["bulan"] or "",
                    "granularitas": "bulanan" if b["bulan"] else "tahunan", "kategori": s["kategori"],
                    "metrik_id": mid, "satuan": s["satuan"], "nilai": selisih, "is_subtotal": 0, "dihitung": 1,
                    "nilai_asli": "", "flag": "rincian_kosong" if rincian == 0 else "selisih_subtotal",
                    "keterangan": f"Selisih Total ({total:g}) dengan jumlah rincian ({rincian:g})",
                    "sheet": sheet, "sel": f"{s['huruf']}{b['row']}",
                })


def baca_listrik_lokasi(ws, hasil):
    nama_kol = ["kwh", "mwh", "operasi_pompa_produk_mwh", "operasi_ngs_mwh", "operasi_solar_cell_mwh",
                "penunjang_kantor_mwh", "penunjang_penerangan_mwh", "penunjang_peralatan_mwh",
                "penunjang_solar_cell_mwh", "non_operasi_rumah_dinas_mwh", "non_operasi_solar_cell_mwh"]
    lok = None
    for r, row in enumerate(ws.iter_rows(min_row=5, values_only=True), start=5):
        a, b = row[0], row[1]
        if isinstance(a, (int, float)) and isinstance(b, str):
            lok = cari_lokasi(b)
            if not lok:
                hasil.di_luar_cakupan[SHEET_LISTRIK].add(bersihkan(b))
            continue
        bulan = parse_bulan(b)
        if not (lok and bulan):
            continue
        rec = {"lokasi_id": lok, "tahun": TAHUN_LISTRIK, "bulan": bulan, "sel": f"D{r}"}
        for i, nama in enumerate(nama_kol):
            p = parse_nilai(row[3 + i] if 3 + i < len(row) else None)
            rec[nama] = p["nilai"]
        hasil.listrik.append(rec)
        hasil.lokasi_per_sheet[SHEET_LISTRIK].add(lok)


def baca_grading(ws, hasil):
    for row in ws.iter_rows(min_row=10, values_only=True):
        lok = cari_lokasi(row[1]) if isinstance(row[1], str) else None
        if lok and row[3]:
            hasil.grade[lok] = str(row[3]).strip()


# ------------------------------------------------------------------ output

def tulis_csv(path, baris, kolom):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=kolom, extrasaction="ignore")
        w.writeheader()
        for b in baris:
            w.writerow({k: ("" if b.get(k) is None else b.get(k)) for k in kolom})


def tulis_output(hasil, out):
    out.mkdir(parents=True, exist_ok=True)

    tulis_csv(out / "fakta.csv", hasil.fakta,
              ["lokasi_id", "tahun", "bulan", "granularitas", "kategori", "metrik_id", "satuan", "nilai",
               "is_subtotal", "dihitung", "nilai_asli", "keterangan", "flag", "sheet", "sel"])

    # Kamus metrik: gabungan dari semua sheet.
    metrik = {}
    for sheet, kolom in hasil.skema.items():
        for k in kolom:
            m = metrik.setdefault(k["metrik_id"], {
                "metrik_id": k["metrik_id"], "kategori": k["kategori"], "label": k["segs"][-1] if k["segs"] else "",
                "satuan": k["satuan"], "_sheet": [], "_subtotal": [], "_header": [], "segs": k["segs"]})
            m["_sheet"].append(sheet)
            if k["is_subtotal"]:
                m["_subtotal"].append(sheet)
            m["_header"].append(f"{sheet}!{k['huruf']}: {k['header_asli']}")
    for mid, s in hasil.metrik_sintetis.items():
        metrik.setdefault(mid, {
            "metrik_id": mid, "kategori": s["kategori"], "label": LABEL_TIDAK_TERINCI, "satuan": s["satuan"],
            "_sheet": ["(rekonsiliasi)"], "_subtotal": [], "segs": s["segs"] + [LABEL_TIDAK_TERINCI],
            "_header": [f"Selisih Total '{s['metrik_id']}' dengan jumlah rinciannya"]})
    maks = max(len(m["segs"]) for m in metrik.values())
    for m in metrik.values():
        for i in range(maks):
            m[f"level_{i + 1}"] = m["segs"][i] if i < len(m["segs"]) else ""
        m["ada_di_sheet"] = ";".join(m["_sheet"])
        m["subtotal_di_sheet"] = ";".join(m["_subtotal"])
        m["header_asli"] = " | ".join(m["_header"])
    urut = sorted(metrik.values(), key=lambda m: (KATEGORI.index(m["kategori"]), m["metrik_id"]))
    tulis_csv(out / "metrik.csv", urut,
              ["metrik_id", "kategori"] + [f"level_{i + 1}" for i in range(maks)]
              + ["label", "satuan", "ada_di_sheet", "subtotal_di_sheet", "header_asli"])

    lokasi = []
    for lok in LOKASI:
        rec = {k: v for k, v in lok.items() if k != "alias_excel"}
        rec["alias_excel"] = "; ".join(lok["alias_excel"])
        rec["grade_2024"] = hasil.grade.get(lok["lokasi_id"], "")
        for s in [c["nama"] for c in SHEET_INPUT] + [SHEET_LISTRIK]:
            rec[f"ada_data_{s.replace('-', '_').replace(' ', '_').lower()}"] = int(
                lok["lokasi_id"] in hasil.lokasi_per_sheet[s])
        lokasi.append(rec)
    tulis_csv(out / "lokasi.csv", lokasi, list(lokasi[0].keys()))
    with open(out / "lokasi.json", "w", encoding="utf-8") as f:
        json.dump(lokasi, f, ensure_ascii=False, indent=2)

    kel = [{"lokasi_id": k[0], "sheet": k[1], "tahun": k[2], "bulan": k[3] or "", "kategori": k[4],
            "jumlah_kolom_input": v[0], "jumlah_terisi": v[1], "jumlah_nonnol": v[2],
            "persen_terisi": round(100 * v[1] / v[0], 1) if v[0] else 0}
           for k, v in sorted(hasil.kelengkapan.items(), key=lambda x: (x[0][0], x[0][2], x[0][3] or 0, x[0][4]))]
    tulis_csv(out / "kelengkapan.csv", kel, list(kel[0].keys()))
    hasil.kelengkapan_baris = kel

    tulis_csv(out / "listrik_lokasi.csv", hasil.listrik, list(hasil.listrik[0].keys()) if hasil.listrik else [])


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("excel", nargs="?", help="path file .xlsx (default: file .xlsx pertama di folder Data/)")
    ap.add_argument("--out", default=str(ROOT / "output"), help="folder output (default: output/)")
    ap.add_argument("--seed", default=str(ROOT / "data-seed" / "seed.json"),
                    help="file seed database (default: data-seed/seed.json; jangan di-commit)")
    ap.add_argument("--tanpa-seed", action="store_true", help="jangan perbarui file seed database")
    args = ap.parse_args(argv)
    if hasattr(sys.stdout, "reconfigure"):  # konsol Windows default cp1252
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if args.excel:
        path = Path(args.excel)
    else:
        kandidat = sorted(p for p in (ROOT / "Data").glob("*.xlsx") if not p.name.startswith("~$"))
        if not kandidat:
            sys.exit("Tidak ada file .xlsx di folder Data/. Berikan path file sebagai argumen.")
        path = kandidat[0]
    out = Path(args.out)
    t0 = time.time()
    print(f"Membaca {path.name} ...")

    hasil = Hasil()
    hasil.sumber = path.name
    wb = openpyxl.load_workbook(path, data_only=True)
    formula = baca_formula_berreferensi(path, [c["nama"] for c in SHEET_INPUT])
    for cfg in SHEET_INPUT:
        ws = wb[cfg["nama"]]
        kolom = susun_skema(ws, cfg, hasil)
        hasil.skema[cfg["nama"]] = kolom
        baca_sheet(ws, cfg, kolom, formula[cfg["nama"]], hasil)
        print(f"  {cfg['nama']:<10} {len(kolom):>4} kolom data, "
              f"{len(hasil.lokasi_per_sheet[cfg['nama']]):>2} lokasi")
    putuskan_titik_ambigu(hasil)
    rekonsiliasi_subtotal(hasil)
    baca_listrik_lokasi(wb[SHEET_LISTRIK], hasil)
    baca_grading(wb[SHEET_GRADING], hasil)
    wb.close()

    tulis_output(hasil, out)
    validasi.jalankan(hasil, out)
    if not args.tanpa_seed:
        n_f, n_m, n_t, ukuran = ekspor_db.ekspor(hasil, Path(args.seed))
        print(f"  seed database: {n_f:,} nilai, {n_m} metrik, {n_t} periode terisi, {ukuran / 1024:.0f} KB -> {args.seed}")

    n = defaultdict(int)
    for t in hasil.temuan:
        n[t["tingkat"]] += 1
    print(f"Selesai dalam {time.time() - t0:.0f} detik. Output: {out}")
    print(f"  fakta: {len(hasil.fakta):,} nilai | temuan validasi: "
          f"{n['error']} error, {n['peringatan']} peringatan, {n['info']} info")


if __name__ == "__main__":
    main()
