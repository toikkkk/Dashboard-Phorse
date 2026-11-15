"""Pengecekan konsistensi data dan pembuatan laporan validasi."""
import csv
import statistics
from collections import Counter, defaultdict
from datetime import datetime

from .lokasi import LOKASI

NAMA_BULAN = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
TINGKAT_URUT = {"error": 0, "peringatan": 1, "info": 2}

PENJELASAN = {
    "kolom_tidak_dikenali": "Kolom header tidak dikenali sehingga tidak ikut dikonversi",
    "error_excel": "Sel berisi error Excel (#REF!, dll.)",
    "teks_tidak_terbaca": "Sel berisi teks yang tidak bisa dibaca sebagai angka",
    "angka_dari_teks": "Angka yang tersimpan sebagai teks (koma desimal, satuan mg/L, keterangan B40, dll.)",
    "nilai_negatif": "Nilai negatif",
    "label_header_dikoreksi": "Label produk di header salah posisi dan dikoreksi berdasarkan urutan kolom",
    "header_ganda": "Header yang sama muncul di dua kolom",
    "label_bulan_beda": "Kolom bulan C dan D tidak sama",
    "blok_bulan_tidak_lengkap": "Blok unit tidak berisi tepat 12 bulan",
    "subtotal_tidak_cocok": "Kolom Total tidak sama dengan jumlah rinciannya",
    "sampah_tidak_seimbang": "Total sampah dihasilkan ≠ total sampah dikelola (aturan di Excel: harus sama)",
    "limbah_b3_tidak_seimbang": "Total limbah B3 dihasilkan ≠ dikelola dalam setahun",
    "listrik_tidak_cocok": "Listrik di sheet 'Listrik Lokasi' ≠ listrik di sheet 2026",
    "lonjakan_nilai": "Nilai bulanan > 10× median lokasi tsb (kemungkinan salah satuan/ketik)",
    "skala_tidak_wajar": "Nilai > 20× rata-rata bulanan tahun sebelumnya (kemungkinan liter diisi di kolom kL)",
    "satuan_beban_pencemaran": "Beban pencemaran diisi konsentrasi mg/L padahal header bersatuan ton",
    "bulan_belum_terisi": "Bulan yang belum terisi untuk suatu kategori",
    "kategori_kosong": "Kategori yang tidak terisi sama sekali dalam satu tahun",
    "lokasi_tanpa_data": "Lokasi dalam cakupan yang tidak ada datanya di sheet",
    "unit_di_luar_cakupan": "Unit JBN di Excel yang tidak termasuk 26 lokasi",
}


def _beda(a, b, rel=0.005, abs_=0.01):
    return abs(a - b) > max(abs_, rel * max(abs(a), abs(b)))


def _fmt(x):
    return f"{x:,.4g}" if abs(x) < 1000 else f"{x:,.0f}"


def cek_subtotal(hasil):
    for sheet, kolom in hasil.skema.items():
        huruf = {k["metrik_id"]: k["huruf"] for k in kolom}
        anak = {}
        for s in kolom:
            if not s["is_subtotal"]:
                continue
            n = len(s["segs"])
            daun = [k["metrik_id"] for k in kolom if not k["is_subtotal"] and k["kategori"] == s["kategori"]
                    and len(k["segs"]) > n and k["segs"][:n] == s["segs"]]
            if daun:
                anak[s["metrik_id"]] = daun
        for b in hasil.baris:
            if b["sheet"] != sheet:
                continue
            for sub, daun in anak.items():
                nilai = b["nilai"].get(sub)
                isi = [b["nilai"][d] for d in daun if d in b["nilai"]]
                if nilai is None or not isi:
                    continue
                jml = sum(isi)
                if _beda(nilai, jml):
                    hasil.catat("subtotal_tidak_cocok", "peringatan",
                                f"Total {_fmt(nilai)} ≠ jumlah rincian {_fmt(jml)}.",
                                sheet=sheet, sel=f"{huruf[sub]}{b['row']}", lokasi_id=b["lokasi_id"],
                                tahun=b["tahun"], bulan=b["bulan"], metrik_id=sub, nilai=nilai, pembanding=jml)


def _jumlah_awalan(b, daun_set, awalan):
    return sum(v for m, v in b["nilai"].items() if m in daun_set and m.startswith(awalan))


def cek_sampah_dan_b3(hasil):
    daun = {s: {k["metrik_id"] for k in kol if not k["is_subtotal"]} for s, kol in hasil.skema.items()}
    b3 = defaultdict(lambda: [0.0, 0.0, set()])
    for b in hasil.baris:
        d = daun[b["sheet"]]
        hsl = _jumlah_awalan(b, d, "Sampah > Dihasilkan >")
        klo = _jumlah_awalan(b, d, "Sampah > Dikelola >")
        if (hsl or klo) and _beda(hsl, klo, rel=0.01, abs_=0.001):
            hasil.catat("sampah_tidak_seimbang", "peringatan",
                        f"Sampah dihasilkan {_fmt(hsl)} ton, dikelola {_fmt(klo)} ton.",
                        sheet=b["sheet"], sel=f"baris {b['row']}", lokasi_id=b["lokasi_id"], tahun=b["tahun"],
                        bulan=b["bulan"], nilai=hsl, pembanding=klo)
        x = b3[(b["sheet"], b["lokasi_id"], b["tahun"])]
        x[0] += _jumlah_awalan(b, d, "Limbah B3 > Dihasilkan >")
        x[1] += _jumlah_awalan(b, d, "Limbah B3 > Dikelola >")
    for (sheet, lok, th), (hsl, klo, _) in b3.items():
        if (hsl or klo) and _beda(hsl, klo, rel=0.05, abs_=0.01):
            hasil.catat("limbah_b3_tidak_seimbang", "info",
                        f"Limbah B3 setahun: dihasilkan {_fmt(hsl)} ton, dikelola {_fmt(klo)} ton.",
                        sheet=sheet, lokasi_id=lok, tahun=th, nilai=hsl, pembanding=klo)


def cek_listrik(hasil):
    kol = hasil.skema.get("2026", [])
    listrik = {k["metrik_id"] for k in kol
               if k["kategori"] == "Energi" and k["satuan"] == "MWh" and "Solar Cell" not in k["metrik_id"]}
    per_bulan = {(b["lokasi_id"], b["bulan"]): sum(v for m, v in b["nilai"].items() if m in listrik)
                 for b in hasil.baris if b["sheet"] == "2026"}
    for r in hasil.listrik:
        a = r["mwh"] or 0
        b = per_bulan.get((r["lokasi_id"], r["bulan"]))
        if b is None:
            if a:
                hasil.catat("listrik_tidak_cocok", "peringatan",
                            f"Listrik Lokasi {_fmt(a)} MWh, tetapi lokasi ini tidak ada di sheet 2026.",
                            sheet="Listrik Lokasi", sel=r["sel"], lokasi_id=r["lokasi_id"], tahun=r["tahun"],
                            bulan=r["bulan"], nilai=a)
            continue
        if (a or b) and _beda(a, b, rel=0.01):
            hasil.catat("listrik_tidak_cocok", "peringatan",
                        f"Listrik Lokasi {_fmt(a)} MWh vs sheet 2026 {_fmt(b)} MWh (selisih {_fmt(b - a)}).",
                        sheet="Listrik Lokasi", sel=r["sel"], lokasi_id=r["lokasi_id"], tahun=r["tahun"],
                        bulan=r["bulan"], nilai=a, pembanding=b)


def cek_blok_bulan(hasil):
    for (sheet, lok), daftar in hasil.blok_bulan.items():
        bulan = sorted(b for b, _ in daftar)
        if bulan != list(range(1, 13)):
            ganda = [NAMA_BULAN[b] for b, n in Counter(bulan).items() if n > 1]
            hilang = [NAMA_BULAN[b] for b in range(1, 13) if b not in bulan]
            hasil.catat("blok_bulan_tidak_lengkap", "peringatan",
                        f"{len(bulan)} baris bulan. Hilang: {', '.join(hilang) or '-'}; ganda: {', '.join(ganda) or '-'}.",
                        sheet=sheet, sel=f"baris {daftar[0][1]}", lokasi_id=lok)


def cek_lonjakan(hasil):
    grup = defaultdict(list)
    for f in hasil.fakta:
        if f["granularitas"] == "bulanan" and not f["is_subtotal"] and not f["dihitung"] and f["nilai"] > 0:
            grup[(f["lokasi_id"], f["metrik_id"], f["satuan"])].append(f)
    for daftar in grup.values():
        if len(daftar) < 6:
            continue
        med = statistics.median(f["nilai"] for f in daftar)
        for f in daftar:
            if f["nilai"] > 10 * med:
                hasil.sel_cek.add((f["sheet"], f["sel"]))
                hasil.catat("lonjakan_nilai", "peringatan",
                            f"{_fmt(f['nilai'])} {f['satuan']} = {f['nilai'] / med:.0f}× median ({_fmt(med)}).",
                            sheet=f["sheet"], sel=f["sel"], lokasi_id=f["lokasi_id"], tahun=f["tahun"],
                            bulan=f["bulan"], metrik_id=f["metrik_id"], nilai=f["nilai"], pembanding=med)


def cek_skala_antar_tahun(hasil, faktor=20):
    """Tandai nilai yang skalanya jauh di atas tahun sebelumnya (mis. liter diisi di kolom kL).

    Pembanding: rata-rata per bulan tahun sebelumnya untuk lokasi dan kelompok metrik yang sama.
    Menangkap kasus yang lolos dari cek_lonjakan karena salah satuannya konsisten sepanjang tahun.
    """
    grup = defaultdict(list)  # (lokasi, kelompok, satuan) -> fakta
    for f in hasil.fakta:
        if not f["is_subtotal"] and f["nilai"] > 0:
            kelompok = " > ".join(f["metrik_id"].split(" > ")[:2])
            grup[(f["lokasi_id"], kelompok, f["satuan"])].append(f)
    for (lok, kelompok, satuan), daftar in grup.items():
        per_periode = defaultdict(list)
        for f in daftar:
            per_periode[(f["tahun"], f["bulan"] or 0)].append(f)
        total_tahun, n_bulan = defaultdict(float), defaultdict(set)
        for (th, bln), fs in per_periode.items():
            total_tahun[th] += sum(x["nilai"] for x in fs)
            n_bulan[th].add(bln)
        for (th, bln), fs in sorted(per_periode.items()):
            lalu = max((t for t in total_tahun if t < th), default=None)
            if lalu is None:
                continue
            # Rata-rata per bulan tahun lalu (data tahunan dibagi 12).
            pembanding = total_tahun[lalu] / (12 if 0 in n_bulan[lalu] else len(n_bulan[lalu]))
            jumlah = sum(x["nilai"] for x in fs) / (12 if bln == 0 else 1)
            if pembanding > 0 and jumlah > faktor * pembanding:
                hasil.sel_cek.update((x["sheet"], x["sel"]) for x in fs)
                hasil.catat("skala_tidak_wajar", "peringatan",
                            f"{kelompok}: {_fmt(jumlah)} {satuan} per bulan = {jumlah / pembanding:.0f}× rata-rata "
                            f"bulanan {lalu} ({_fmt(pembanding)}). Kemungkinan salah satuan (mis. liter vs kL).",
                            sheet=fs[0]["sheet"], sel=fs[0]["sel"], lokasi_id=lok, tahun=th, bulan=bln or None,
                            metrik_id=kelompok, nilai=jumlah, pembanding=pembanding)


def cek_beban_pencemaran(hasil):
    hitung = defaultdict(Counter)
    for f in hasil.fakta:
        if f["metrik_id"].startswith("Air > Beban Pencemaran"):
            hitung[(f["sheet"], f["lokasi_id"])][f["satuan"]] += 1
    for (sheet, lok), c in sorted(hitung.items()):
        if c.get("mg/L"):
            hasil.catat("satuan_beban_pencemaran", "peringatan",
                        f"{c['mg/L']} nilai berupa konsentrasi mg/L, {c.get('ton', 0)} nilai bersatuan ton.",
                        sheet=sheet, lokasi_id=lok)


def cek_kelengkapan(hasil):
    data = defaultdict(dict)  # (sheet, tahun, lok, kategori) -> {bulan: terisi}
    pengisi = defaultdict(set)  # (sheet, bulan) -> lokasi yang mengisi apa pun
    for k in hasil.kelengkapan_baris:
        if not k["bulan"]:
            continue
        data[(k["sheet"], k["tahun"], k["lokasi_id"], k["kategori"])][k["bulan"]] = k["jumlah_terisi"]
        if k["jumlah_terisi"]:
            pengisi[(k["sheet"], k["bulan"])].add(k["lokasi_id"])
    # Bulan terakhir = bulan terakhir yang sudah diisi mayoritas lokasi (bulan berjalan/akan datang diabaikan).
    bulan_terakhir = defaultdict(int)
    for (sheet, bulan), loks in pengisi.items():
        if len(loks) * 2 >= len(hasil.lokasi_per_sheet[sheet]):
            bulan_terakhir[sheet] = max(bulan_terakhir[sheet], bulan)
    for (sheet, th, lok, kat), per in sorted(data.items()):
        akhir = bulan_terakhir[sheet]
        kosong = [b for b in range(1, akhir + 1) if not per.get(b)]
        if len(kosong) == akhir:
            hasil.catat("kategori_kosong", "info", f"Kategori {kat} tidak terisi sama sekali (Jan–{NAMA_BULAN[akhir]}).",
                        sheet=sheet, lokasi_id=lok, tahun=th, metrik_id=kat)
        elif kosong:
            hasil.catat("bulan_belum_terisi", "info",
                        f"Kategori {kat} kosong di bulan: {', '.join(NAMA_BULAN[b] for b in kosong)}.",
                        sheet=sheet, lokasi_id=lok, tahun=th, metrik_id=kat)


def cek_cakupan(hasil):
    for lok in LOKASI:
        for sheet in list(hasil.skema) + ["Listrik Lokasi"]:
            if lok["lokasi_id"] not in hasil.lokasi_per_sheet[sheet]:
                hasil.catat("lokasi_tanpa_data", "peringatan", f"{lok['nama_singkat']} tidak ditemukan di sheet ini.",
                            sheet=sheet, lokasi_id=lok["lokasi_id"])
    for sheet, units in hasil.di_luar_cakupan.items():
        for u in sorted(units):
            hasil.catat("unit_di_luar_cakupan", "info", f"'{u}' ada di Excel tetapi bukan bagian dari 26 lokasi; diabaikan.",
                        sheet=sheet)


def _tabel_kelengkapan(hasil, sheet, kategori_list):
    lok_total = len([l for l in LOKASI if l["lokasi_id"] in hasil.lokasi_per_sheet[sheet]])
    isi = defaultdict(set)
    for k in hasil.kelengkapan_baris:
        if k["sheet"] == sheet and k["bulan"] and k["jumlah_terisi"]:
            isi[(k["kategori"], k["bulan"])].add(k["lokasi_id"])
    baris = [f"| Kategori | " + " | ".join(NAMA_BULAN[1:]) + " |", "|---|" + "---:|" * 12]
    for kat in kategori_list:
        baris.append(f"| {kat} | " + " | ".join(str(len(isi[(kat, b)])) for b in range(1, 13)) + " |")
    return lok_total, "\n".join(baris)


def tulis_laporan(hasil, out):
    temuan = sorted(hasil.temuan, key=lambda t: (TINGKAT_URUT[t["tingkat"]], t["jenis"], t.get("sheet") or "",
                                                 t.get("lokasi_id") or "", t.get("tahun") or 0, t.get("bulan") or 0))
    kolom = ["tingkat", "jenis", "sheet", "sel", "lokasi_id", "tahun", "bulan", "metrik_id", "nilai", "pembanding",
             "keterangan"]
    with open(out / "validasi.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=kolom, extrasaction="ignore")
        w.writeheader()
        for t in temuan:
            w.writerow({k: ("" if t.get(k) is None else t.get(k)) for k in kolom})

    nama = {l["lokasi_id"]: l["nama_singkat"] for l in LOKASI}
    hitung = Counter((t["jenis"], t["tingkat"]) for t in temuan)
    L = [f"# Laporan Validasi Data PHORSE — Region JBN",
         "",
         f"Sumber: `{hasil.sumber}`  ",
         f"Dibuat: {datetime.now():%Y-%m-%d %H:%M}  ",
         f"Cakupan: 26 lokasi. Nilai bukan nol yang diekstrak: **{len(hasil.fakta):,}**.",
         "",
         "Detail lengkap tiap temuan (dengan alamat sel Excel) ada di `validasi.csv`.",
         "",
         "## Ringkasan temuan",
         "",
         "| Tingkat | Jenis | Jumlah | Arti |",
         "|---|---|---:|---|"]
    for (jenis, tingkat), n in sorted(hitung.items(), key=lambda x: (TINGKAT_URUT[x[0][1]], -x[1])):
        L.append(f"| {tingkat} | `{jenis}` | {n:,} | {PENJELASAN.get(jenis, '')} |")

    L += ["", "## Cakupan lokasi", "",
          "| Lokasi | Grade 2024 | 2024-2021 | 2025 | 2026 | Listrik Lokasi |", "|---|---|:-:|:-:|:-:|:-:|"]
    for l in LOKASI:
        ada = ["✓" if l["lokasi_id"] in hasil.lokasi_per_sheet[s] else "—"
               for s in ["2024-2021", "2025", "2026", "Listrik Lokasi"]]
        L.append(f"| {l['nama_singkat']} | {hasil.grade.get(l['lokasi_id'], '—')} | " + " | ".join(ada) + " |")

    from .normalisasi import KATEGORI
    for sheet in ["2025", "2026"]:
        n, tabel = _tabel_kelengkapan(hasil, sheet, KATEGORI)
        L += ["", f"## Kelengkapan {sheet}: jumlah lokasi yang mengisi (dari {n})", "", tabel]

    L += ["", "## Contoh temuan per jenis", ""]
    per_jenis = defaultdict(list)
    for t in temuan:
        per_jenis[t["jenis"]].append(t)
    for jenis, daftar in per_jenis.items():
        L.append(f"### `{jenis}` ({len(daftar):,})")
        L.append("")
        for t in daftar[:12]:
            lokasi = nama.get(t.get("lokasi_id"), "")
            periode = " ".join(str(x) for x in [NAMA_BULAN[t["bulan"]] if t.get("bulan") else "", t.get("tahun") or ""]
                               if x)
            tempat = " · ".join(x for x in [f"{t.get('sheet')}!{t.get('sel')}" if t.get("sel") else t.get("sheet"),
                                            lokasi, periode] if x)
            metrik = f" — `{t['metrik_id']}`" if t.get("metrik_id") else ""
            L.append(f"- {tempat}{metrik}: {t['keterangan']}")
        if len(daftar) > 12:
            L.append(f"- … dan {len(daftar) - 12:,} lainnya di `validasi.csv`.")
        L.append("")
    (out / "laporan_validasi.md").write_text("\n".join(L), encoding="utf-8")


def jalankan(hasil, out):
    cek_cakupan(hasil)
    cek_blok_bulan(hasil)
    cek_subtotal(hasil)
    cek_sampah_dan_b3(hasil)
    cek_listrik(hasil)
    cek_lonjakan(hasil)
    cek_skala_antar_tahun(hasil)
    cek_beban_pencemaran(hasil)
    cek_kelengkapan(hasil)
    tulis_laporan(hasil, out)
