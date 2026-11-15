"""Ekspor data bersih ke satu file JSON ringkas untuk dashboard Next.js (public/data/dashboard.json).

Hanya baris rincian (is_subtotal = 0) yang diekspor, sehingga dashboard cukup menjumlahkan
tanpa risiko hitung ganda. Baris "Tidak Terinci" ikut diekspor (lihat etl/README.md).
"""
import json
import re
from collections import defaultdict
from datetime import datetime

from .lokasi import LOKASI
from .normalisasi import KATEGORI


def ekspor(hasil, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    daun = [f for f in hasil.fakta if not f["is_subtotal"]]

    metrik_ids = sorted({f["metrik_id"] for f in daun})
    m_idx = {m: i for i, m in enumerate(metrik_ids)}
    satuan_default = {}
    for f in daun:
        satuan_default.setdefault(f["metrik_id"], f["satuan"])

    l_idx = {l["lokasi_id"]: i for i, l in enumerate(LOKASI)}
    k_idx = {k: i for i, k in enumerate(KATEGORI)}

    # Sel yang ditandai lonjakan (kemungkinan salah ketik/satuan) → tampil sebagai "perlu dicek".
    cek = hasil.sel_cek

    fakta = []
    for f in daun:
        sat = f["satuan"] if f["satuan"] != satuan_default[f["metrik_id"]] else None
        fakta.append([l_idx[f["lokasi_id"]], f["tahun"], f["bulan"] or 0, m_idx[f["metrik_id"]],
                      round(f["nilai"], 6), sat, int((f["sheet"], f["sel"]) in cek)])

    # Kategori dianggap "dilaporkan" pada suatu periode jika ada sel input yang terisi (termasuk 0).
    isi = [[l_idx[k["lokasi_id"]], k["tahun"], k["bulan"] or 0, k_idx[k["kategori"]], k["jumlah_terisi"]]
           for k in hasil.kelengkapan_baris if k["jumlah_terisi"]]

    # Bulan terakhir = bulan terakhir yang sudah diisi oleh mayoritas lokasi.
    pengisi, lokasi_tahun = defaultdict(set), defaultdict(set)
    for k in hasil.kelengkapan_baris:
        if k["bulan"]:
            lokasi_tahun[k["tahun"]].add(k["lokasi_id"])
            if k["jumlah_nonnol"]:
                pengisi[(k["tahun"], k["bulan"])].add(k["lokasi_id"])
    bulan_terakhir = {}
    for (th, bln), loks in pengisi.items():
        if len(loks) * 2 >= len(lokasi_tahun[th]):
            bulan_terakhir[th] = max(bulan_terakhir.get(th, 0), bln)
    tahun = sorted({f["tahun"] for f in daun})

    data = {
        "meta": {
            "sumber": hasil.sumber,
            "dibuat": datetime.now().isoformat(timespec="minutes"),
            "tahun": tahun,
            "tahunBulanan": sorted(bulan_terakhir),
            "bulanTerakhir": {str(k): v for k, v in sorted(bulan_terakhir.items())},
        },
        "kategori": KATEGORI,
        "lokasi": [{"id": l["lokasi_id"], "nama": l["nama_resmi"], "singkat": l["nama_singkat"],
                    "tipe": l["tipe"], "provinsi": l["provinsi"], "grade": hasil.grade.get(l["lokasi_id"])}
                   for l in LOKASI],
        "metrik": [{"id": m, "k": m.split(" > ")[0], "s": m.split(" > ")[1:], "u": satuan_default[m]}
                   for m in metrik_ids],
        "fakta": fakta,
        "isi": isi,
    }
    teks = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    teks = re.sub(r"(\d)\.0(?=[,\]])", r"\1", teks)  # 12.0 → 12 (hemat ukuran)
    path.write_text(teks, encoding="utf-8")
    return len(fakta), len(teks)
