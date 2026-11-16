"""Ekspor data bersih sebagai seed untuk database (data-seed/seed.json).

Berkas ini berisi data client, jadi TIDAK boleh masuk repo (sudah di .gitignore) dan tidak lagi
dilayani sebagai file publik. Dashboard membaca data dari database lewat API yang mewajibkan login.
"""
import json
from collections import Counter
from datetime import datetime

from .lokasi import LOKASI


def ekspor(hasil, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    daun = [f for f in hasil.fakta if not f["is_subtotal"]]

    # Satuan bawaan metrik = satuan pertama yang terlihat pada data (sama seperti aturan dashboard lama).
    satuan_bawaan = {}
    for f in daun:
        satuan_bawaan.setdefault(f["metrik_id"], f["satuan"])

    # Skema Excel 2026 (paling rinci): kolom rincian (bukan Total) dan urutannya.
    leaf_2026, urutan_2026, satuan_skema = set(), {}, {}
    metrik_skema = {}
    for sheet, kolom in hasil.skema.items():
        for k in kolom:
            if k["is_subtotal"]:
                continue
            metrik_skema.setdefault(k["metrik_id"], k["satuan"])
            if sheet == "2026":
                leaf_2026.add(k["metrik_id"])
                urutan_2026.setdefault(k["metrik_id"], k["col"])
                satuan_skema[k["metrik_id"]] = k["satuan"]

    semua = {**metrik_skema, **satuan_bawaan}  # satuan dari data menang atas satuan header
    metrik = []
    for mid in sorted(semua):
        bagian = mid.split(" > ")
        metrik.append({
            "id": mid, "kategori": bagian[0], "level": bagian[1:], "satuan": semua[mid],
            "leaf2026": mid in leaf_2026, "urutan2026": urutan_2026.get(mid),
            "satuanSkema": satuan_skema.get(mid),
        })

    fakta, kunci = [], Counter()
    for f in daun:
        k = (f["lokasi_id"], f["tahun"], f["bulan"] or 0, f["metrik_id"])
        kunci[k] += 1
        sat = f["satuan"] if f["satuan"] != satuan_bawaan[f["metrik_id"]] else ""
        fakta.append([f["lokasi_id"], f["tahun"], f["bulan"] or 0, f["metrik_id"], f["nilai"], sat,
                      int((f["sheet"], f["sel"]) in hasil.sel_cek), int(f["metrik_id"].endswith("Tidak Terinci"))])
    ganda = [k for k, n in kunci.items() if n > 1]
    if ganda:
        raise SystemExit(f"{len(ganda)} kombinasi lokasi/periode/metrik muncul lebih dari sekali, contoh: {ganda[:3]}")

    terisi, kunci_t = [], Counter()
    for k in hasil.kelengkapan_baris:
        if not k["jumlah_terisi"]:
            continue
        key = (k["lokasi_id"], k["tahun"], k["bulan"] or 0, k["kategori"])
        kunci_t[key] += 1
        terisi.append([k["lokasi_id"], k["tahun"], k["bulan"] or 0, k["kategori"], k["jumlah_terisi"], k["jumlah_nonnol"]])
    ganda_t = [k for k, n in kunci_t.items() if n > 1]
    if ganda_t:
        raise SystemExit(f"{len(ganda_t)} kombinasi 'terisi' ganda, contoh: {ganda_t[:3]}")

    data = {
        "meta": {"sumber": hasil.sumber, "dibuat": datetime.now().isoformat(timespec="minutes")},
        "lokasi": [{"id": l["lokasi_id"], "nama": l["nama_resmi"], "singkat": l["nama_singkat"], "tipe": l["tipe"],
                    "provinsi": l["provinsi"], "grade": hasil.grade.get(l["lokasi_id"]), "urutan": i}
                   for i, l in enumerate(LOKASI)],
        "metrik": metrik,
        "fakta": fakta,
        "terisi": terisi,
    }
    teks = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    path.write_text(teks, encoding="utf-8")
    return len(fakta), len(metrik), len(terisi), len(teks)
