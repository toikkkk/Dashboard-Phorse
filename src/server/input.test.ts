import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { bangunDataset } from "./dataset";
import type { Db } from "./db";
import { ambilIsian, periodeBolehDiisi, simpanInput, uraiAngka, type PayloadSimpan } from "./input";
import type { Pengguna } from "./sesi";
import { buatAkunUji, siapkanDb } from "./uji-bantu";

let db: Db;
let A: Pengguna;
let B: Pengguna;
let ADMIN: Pengguna;
const SEKARANG = new Date("2026-11-15T03:00:00Z"); // November 2026 (WIB)

const M = {
  plastik: "Sampah > Dihasilkan > Plastik",
  kertas: "Sampah > Dihasilkan > Kertas",
  reduce: "Sampah > Dikelola > Reduce > Plastik",
  sisa: "Sampah > Dihasilkan > Tidak Terinci",
  biosolar: "Energi > Kegiatan Operasi > Own Use Pompa Produk > Biosolar",
  cod: "Air > Beban Pencemaran > IPAL Domestik > COD",
  penerimaan: "Operasional > Penerimaan > Jalur Pipa > Gasoline",
};

async function pengguna(username: string): Promise<Pengguna> {
  const [p] = await db.kueri<{ id: string; username: string; nama: string; peran: "admin" | "terminal"; lokasi_id: string | null; harus_ganti: boolean }>(
    "SELECT id, username, nama, peran, lokasi_id, harus_ganti FROM pengguna WHERE username = $1", [username],
  );
  return { id: p.id, username: p.username, nama: p.nama, peran: p.peran, lokasiId: p.lokasi_id, harusGanti: p.harus_ganti };
}

const payload = (nilai: Record<string, string | number | null>, ekstra: Partial<PayloadSimpan> = {}): PayloadSimpan => ({
  tahun: 2026, bulan: 10, kategori: "Sampah", nilai, ...ekstra,
});
const faktaLokasi = (lok: string) => db.kueri<{ metrik_id: string; bulan: number; nilai: number; satuan: string | null; cek: boolean }>(
  "SELECT metrik_id, bulan, nilai, satuan, cek FROM fakta WHERE lokasi_id = $1 ORDER BY bulan, metrik_id", [lok],
);

beforeAll(async () => {
  db = await siapkanDb();
  await buatAkunUji(db);
  await db.kueri("UPDATE pengguna SET harus_ganti = false"); // anggap sandi awal sudah diganti
  await db.kueri(
    `INSERT INTO metrik (id, kategori, level, satuan, bisa_input, urutan_input, satuan_input) VALUES
      ($1,'Sampah',ARRAY['Dihasilkan','Plastik'],'ton',true,1,'ton'),
      ($2,'Sampah',ARRAY['Dihasilkan','Kertas'],'ton',true,2,'ton'),
      ($3,'Sampah',ARRAY['Dikelola','Reduce','Plastik'],'ton',true,3,'ton'),
      ($4,'Sampah',ARRAY['Dihasilkan','Tidak Terinci'],'ton',false,NULL,NULL),
      ($5,'Energi',ARRAY['Kegiatan Operasi','Own Use Pompa Produk','Biosolar'],'kL',true,4,'kL'),
      ($6,'Air',ARRAY['Beban Pencemaran','IPAL Domestik','COD'],'ton',true,5,'mg/L'),
      ($7,'Operasional',ARRAY['Penerimaan','Jalur Pipa','Gasoline'],'kL',false,NULL,NULL)`,
    [M.plastik, M.kertas, M.reduce, M.sisa, M.biosolar, M.cod, M.penerimaan],
  );
  A = await pengguna("terminal-a");
  B = await pengguna("terminal-b");
  ADMIN = await pengguna("admin");
});
afterAll(async () => db.tutup());
beforeEach(async () => {
  await db.kueri("DELETE FROM riwayat_input");
  await db.kueri("DELETE FROM fakta");
  await db.kueri("DELETE FROM terisi");
  await db.kueri("DELETE FROM audit");
});

describe("hak akses penulisan", () => {
  it("akun A menulis ke lokasi A saja; lokasi B tidak tersentuh", async () => {
    const h = await simpanInput(db, A, payload({ [M.plastik]: "1,5", [M.kertas]: 2 }), { sekarang: SEKARANG });
    expect(h).toMatchObject({ ok: true, ditulis: 2 });
    expect((await faktaLokasi("lok-a")).map((f) => [f.metrik_id, f.nilai])).toEqual([[M.kertas, 2], [M.plastik, 1.5]]);
    expect(await faktaLokasi("lok-b")).toHaveLength(0);
  });

  it("muatan yang menyelipkan 'lokasi' lain diabaikan: tetap hanya menulis ke lokasi akun", async () => {
    const jahat = { ...payload({ [M.plastik]: 9 }), lokasi: "lok-b", lokasiId: "lok-b", lokasi_id: "lok-b" } as PayloadSimpan;
    await simpanInput(db, A, jahat, { sekarang: SEKARANG });
    expect(await faktaLokasi("lok-b")).toHaveLength(0);
    expect(await faktaLokasi("lok-a")).toHaveLength(1);
  });

  it("objek sesi yang dipalsukan (A mengaku lokasi B) ditolak karena dicek ulang ke database", async () => {
    const palsu: Pengguna = { ...A, lokasiId: "lok-b" };
    const h = await simpanInput(db, palsu, payload({ [M.plastik]: 9 }), { sekarang: SEKARANG });
    expect(h).toMatchObject({ ok: false, jenis: "izin" });
    expect(await faktaLokasi("lok-b")).toHaveLength(0);
    expect(await faktaLokasi("lok-a")).toHaveLength(0);
  });

  it("admin tidak boleh mengisi data, termasuk dengan objek yang menyebut lokasi", async () => {
    expect(await simpanInput(db, ADMIN, payload({ [M.plastik]: 1 }), { sekarang: SEKARANG })).toMatchObject({ ok: false, jenis: "izin" });
    const mengaku: Pengguna = { ...ADMIN, peran: "terminal", lokasiId: "lok-a" };
    expect(await simpanInput(db, mengaku, payload({ [M.plastik]: 1 }), { sekarang: SEKARANG })).toMatchObject({ ok: false, jenis: "izin" });
    expect(await faktaLokasi("lok-a")).toHaveLength(0);
  });

  it("akun yang belum mengganti sandi awal atau sudah dinonaktifkan tidak boleh menulis", async () => {
    await db.kueri("UPDATE pengguna SET harus_ganti = true WHERE username = 'terminal-a'");
    expect(await simpanInput(db, A, payload({ [M.plastik]: 1 }), { sekarang: SEKARANG })).toMatchObject({ ok: false, jenis: "izin" });
    await db.kueri("UPDATE pengguna SET harus_ganti = false, aktif = false WHERE username = 'terminal-a'");
    expect(await simpanInput(db, A, payload({ [M.plastik]: 1 }), { sekarang: SEKARANG })).toMatchObject({ ok: false, jenis: "izin" });
    await db.kueri("UPDATE pengguna SET aktif = true WHERE username = 'terminal-a'");
    expect(await faktaLokasi("lok-a")).toHaveLength(0);
  });

  it("pembacaan formulir juga hanya untuk akun terminal pemilik lokasinya", async () => {
    expect((await ambilIsian(db, ADMIN, 2026, 10, SEKARANG)).ok).toBe(false);
    expect((await ambilIsian(db, { ...A, lokasiId: "lok-b" }, 2026, 10, SEKARANG)).ok).toBe(false);
    const ok = await ambilIsian(db, A, 2026, 10, SEKARANG);
    expect(ok.ok && ok.data.lokasiId).toBe("lok-a");
  });

  it("dua terminal mengisi bergantian tanpa saling menimpa", async () => {
    await simpanInput(db, A, payload({ [M.plastik]: 1 }), { sekarang: SEKARANG });
    await simpanInput(db, B, payload({ [M.plastik]: 7 }), { sekarang: SEKARANG });
    await simpanInput(db, A, payload({ [M.plastik]: 2 }), { sekarang: SEKARANG });
    expect((await faktaLokasi("lok-a"))[0].nilai).toBe(2);
    expect((await faktaLokasi("lok-b"))[0].nilai).toBe(7);
  });
});

describe("aturan periode", () => {
  it("hanya 2026 ke atas dan hanya sampai bulan berjalan (zona waktu WIB)", () => {
    expect(periodeBolehDiisi(2025, 12, SEKARANG)).toMatch(/mulai 2026/);
    expect(periodeBolehDiisi(2026, 11, SEKARANG)).toBeNull();
    expect(periodeBolehDiisi(2026, 1, SEKARANG)).toBeNull();
    expect(periodeBolehDiisi(2026, 12, SEKARANG)).toMatch(/belum berjalan/);
    expect(periodeBolehDiisi(2027, 1, SEKARANG)).toMatch(/belum berjalan/);
    expect(periodeBolehDiisi(2026, 0, SEKARANG)).toMatch(/tidak valid/);
    expect(periodeBolehDiisi(2026, 13, SEKARANG)).toMatch(/tidak valid/);
    expect(periodeBolehDiisi(2026.5, 3, SEKARANG)).toMatch(/tidak valid/);
    // 31 Okt pukul 20.00 UTC sudah 1 Nov di WIB
    expect(periodeBolehDiisi(2026, 11, new Date("2026-10-31T20:00:00Z"))).toBeNull();
    expect(periodeBolehDiisi(2026, 11, new Date("2026-10-31T16:00:00Z"))).toMatch(/belum berjalan/);
  });
  it("periode terlarang ditolak dan tidak menulis apa pun", async () => {
    for (const [tahun, bulan] of [[2025, 12], [2026, 12], [2027, 1]]) {
      expect(await simpanInput(db, A, payload({ [M.plastik]: 1 }, { tahun, bulan }), { sekarang: SEKARANG })).toMatchObject({ ok: false, jenis: "periode" });
    }
    expect(await faktaLokasi("lok-a")).toHaveLength(0);
  });
});

describe("validasi angka", () => {
  it("mengurai koma/titik desimal, kosong, dan menolak pemisah ribuan, negatif, huruf, dan nilai tak wajar", () => {
    expect(uraiAngka("3,5")).toEqual({ ok: true, nilai: 3.5 });
    expect(uraiAngka("3.5")).toEqual({ ok: true, nilai: 3.5 });
    expect(uraiAngka(" 12 ")).toEqual({ ok: true, nilai: 12 });
    expect(uraiAngka("0")).toEqual({ ok: true, nilai: 0 });
    expect(uraiAngka("")).toEqual({ ok: true, nilai: null });
    expect(uraiAngka(null)).toEqual({ ok: true, nilai: null });
    for (const buruk of ["1.234,5", "1,234.5", "1.000.000", "-3", "abc", "1e5", "NaN", "Infinity", "12 34", "0x10", "1,", ",5", "९९", "1".repeat(40), "99999999999999"]) {
      expect(uraiAngka(buruk).ok, buruk).toBe(false);
    }
    expect(uraiAngka(Infinity).ok).toBe(false);
    expect(uraiAngka(NaN).ok).toBe(false);
    expect(uraiAngka(-1).ok).toBe(false);
    expect(uraiAngka({}).ok).toBe(false);
    expect(uraiAngka(true).ok).toBe(false);
  });

  it("satu isian salah = seluruh permintaan ditolak dan tidak ada yang tersimpan (atomik)", async () => {
    const h = await simpanInput(db, A, payload({ [M.plastik]: "5", [M.kertas]: "1.234,5" }), { sekarang: SEKARANG });
    expect(h).toMatchObject({ ok: false, jenis: "validasi" });
    if (!h.ok && h.jenis === "validasi") expect(Object.keys(h.galat ?? {})).toEqual([M.kertas]);
    expect(await faktaLokasi("lok-a")).toHaveLength(0);
  });

  it("kunci yang bukan bagian kategori (kategori lain, bukan kolom isian, atau injeksi SQL) menolak seluruh permintaan", async () => {
    for (const asing of [M.biosolar, M.sisa, M.penerimaan, "tidak ada", "x'; DROP TABLE fakta;--"]) {
      const h = await simpanInput(db, A, payload({ [M.plastik]: 1, [asing]: 1 }), { sekarang: SEKARANG });
      expect(h, asing).toMatchObject({ ok: false, jenis: "validasi" });
    }
    expect(await faktaLokasi("lok-a")).toHaveLength(0);
    expect(await simpanInput(db, A, payload({ [M.plastik]: 1 }, { kategori: "Kategori Rekaan" }), { sekarang: SEKARANG })).toMatchObject({ ok: false, jenis: "validasi" });
  });
});

describe("penyimpanan", () => {
  it("nol disimpan sebagai isian nol (kategori tercatat terisi), kosong tidak disimpan", async () => {
    await simpanInput(db, A, payload({ [M.plastik]: "0", [M.kertas]: "" }), { sekarang: SEKARANG });
    const f = await faktaLokasi("lok-a");
    expect(f.map((x) => [x.metrik_id, x.nilai])).toEqual([[M.plastik, 0]]);
    const t = await db.kueri<{ jumlah: number; nonnol: number }>("SELECT jumlah, nonnol FROM terisi WHERE lokasi_id = 'lok-a' AND kategori = 'Sampah'");
    expect(t).toEqual([{ jumlah: 1, nonnol: 0 }]);
  });

  it("menyimpan ulang mengganti nilai; mengosongkan isian menghapusnya; kosong semua menghapus status terisi", async () => {
    await simpanInput(db, A, payload({ [M.plastik]: 1, [M.kertas]: 2 }), { sekarang: SEKARANG });
    await simpanInput(db, A, payload({ [M.plastik]: 4, [M.kertas]: null }), { sekarang: SEKARANG });
    expect((await faktaLokasi("lok-a")).map((x) => [x.metrik_id, x.nilai])).toEqual([[M.plastik, 4]]);
    const h = await simpanInput(db, A, payload({}), { sekarang: SEKARANG });
    expect(h).toMatchObject({ ok: true, dihapus: 1 });
    expect(await faktaLokasi("lok-a")).toHaveLength(0);
    expect(await db.kueri("SELECT 1 FROM terisi WHERE lokasi_id = 'lok-a'")).toHaveLength(0);
  });

  it("isian satu kategori tidak menyentuh kategori lain pada periode yang sama", async () => {
    await simpanInput(db, A, { ...payload({ [M.biosolar]: 3 }), kategori: "Energi" }, { sekarang: SEKARANG });
    await simpanInput(db, A, payload({ [M.plastik]: 1 }), { sekarang: SEKARANG });
    await simpanInput(db, A, payload({}), { sekarang: SEKARANG }); // mengosongkan Sampah
    expect((await faktaLokasi("lok-a")).map((x) => x.metrik_id)).toEqual([M.biosolar]);
  });

  it("satuan khusus (konsentrasi mg/L) tersimpan pada barisnya; satuan bawaan tidak disimpan ulang", async () => {
    await simpanInput(db, A, { ...payload({ [M.cod]: 36 }), kategori: "Air" }, { sekarang: SEKARANG });
    await simpanInput(db, A, payload({ [M.plastik]: 1 }), { sekarang: SEKARANG });
    const f = await faktaLokasi("lok-a");
    expect(f.find((x) => x.metrik_id === M.cod)?.satuan).toBe("mg/L");
    expect(f.find((x) => x.metrik_id === M.plastik)?.satuan).toBeNull();
  });

  it("sisa 'Tidak Terinci' dipertahankan jika tidak ada nilai berubah, dan dibuang jika ada yang berubah", async () => {
    await db.kueri("INSERT INTO fakta (lokasi_id, tahun, bulan, metrik_id, nilai, sintetis) VALUES ('lok-a',2026,10,$1,0.7,true), ('lok-a',2026,10,$2,1,false)", [M.sisa, M.plastik]);
    await simpanInput(db, A, payload({ [M.plastik]: 1 }), { sekarang: SEKARANG }); // sama persis
    expect((await faktaLokasi("lok-a")).map((x) => x.metrik_id)).toContain(M.sisa);
    await simpanInput(db, A, payload({ [M.plastik]: 2 }), { sekarang: SEKARANG }); // berubah
    expect((await faktaLokasi("lok-a")).map((x) => x.metrik_id)).not.toContain(M.sisa);
  });

  it("mencatat riwayat nilai lama dan baru, jejak audit, dan menaikkan versi data", async () => {
    const [{ versi: v0 }] = await db.kueri<{ versi: string }>("SELECT versi::text FROM versi_data");
    await simpanInput(db, A, payload({ [M.plastik]: 1 }), { sekarang: SEKARANG, ip: "10.0.0.7" });
    await simpanInput(db, A, payload({ [M.plastik]: 3 }), { sekarang: SEKARANG });
    const r = await db.kueri<{ nilai_lama: number | null; nilai_baru: number | null }>("SELECT nilai_lama, nilai_baru FROM riwayat_input ORDER BY id");
    expect(r).toEqual([{ nilai_lama: null, nilai_baru: 1 }, { nilai_lama: 1, nilai_baru: 3 }]);
    const a = await db.kueri<{ aksi: string; ip: string | null }>("SELECT aksi, ip FROM audit ORDER BY id");
    expect(a[0]).toEqual({ aksi: "simpan_input", ip: "10.0.0.7" });
    const [{ versi: v1 }] = await db.kueri<{ versi: string }>("SELECT versi::text FROM versi_data");
    expect(Number(v1)).toBe(Number(v0) + 2);
  });

  it("hasilnya langsung terlihat di dataset dashboard (nilai, status terisi, dan bulan terakhir)", async () => {
    await simpanInput(db, A, payload({ [M.plastik]: 2.5 }, { bulan: 3 }), { sekarang: SEKARANG });
    await simpanInput(db, B, payload({ [M.plastik]: 1 }, { bulan: 3 }), { sekarang: SEKARANG });
    const d = await bangunDataset(db);
    const baris = d.fakta.filter((f) => d.lokasi[f[0]].id === "lok-a");
    expect(baris).toHaveLength(1);
    expect(baris[0].slice(1, 5)).toEqual([2026, 3, 0 + d.metrik.findIndex((m) => m.id === M.plastik), 2.5]);
    expect(d.isi.some((i) => d.lokasi[i[0]].id === "lok-a" && i[1] === 2026 && i[2] === 3 && d.kategori[i[3]] === "Sampah")).toBe(true);
    expect(d.meta.tahunBulanan).toEqual([2026]);
    expect(d.meta.bulanTerakhir["2026"]).toBe(3);
  });
});

describe("deteksi nilai janggal (salah satuan / salah koma)", () => {
  beforeEach(async () => {
    for (const bln of [6, 7, 8, 9]) {
      await db.kueri("INSERT INTO fakta (lokasi_id, tahun, bulan, metrik_id, nilai) VALUES ('lok-a', 2026, $1, $2, 1.0)", [bln, M.plastik]);
    }
  });

  it("nilai 10x lebih besar ditahan sampai dikonfirmasi, lalu disimpan dengan penanda 'perlu dicek'", async () => {
    const tahan = await simpanInput(db, A, payload({ [M.plastik]: 1500 }), { sekarang: SEKARANG });
    expect(tahan).toMatchObject({ ok: false, jenis: "konfirmasi" });
    if (tahan.ok === false && tahan.jenis === "konfirmasi") expect(tahan.perluKonfirmasi).toEqual([{ metrik: M.plastik, nilai: 1500, pembanding: 1 }]);
    expect((await faktaLokasi("lok-a")).some((f) => f.bulan === 10)).toBe(false);

    const sah = await simpanInput(db, A, payload({ [M.plastik]: 1500 }, { konfirmasi: [M.plastik] }), { sekarang: SEKARANG });
    expect(sah).toMatchObject({ ok: true });
    expect((await faktaLokasi("lok-a")).find((f) => f.bulan === 10)).toMatchObject({ nilai: 1500, cek: true });
  });

  it("nilai 10x lebih kecil (mis. '1.900' yang dimaksud 1900) juga ditahan", async () => {
    expect(await simpanInput(db, A, payload({ [M.plastik]: "0,05" }), { sekarang: SEKARANG })).toMatchObject({ ok: false, jenis: "konfirmasi" });
  });

  it("nilai wajar, nol, dan kolom tanpa riwayat memadai tidak ditahan", async () => {
    expect(await simpanInput(db, A, payload({ [M.plastik]: 3, [M.kertas]: 5000 }), { sekarang: SEKARANG })).toMatchObject({ ok: true });
    expect(await simpanInput(db, A, payload({ [M.plastik]: 0 }), { sekarang: SEKARANG })).toMatchObject({ ok: true });
  });

  it("konfirmasi untuk kolom lain tidak meloloskan nilai janggal; nilai yang tidak berubah tidak diminta konfirmasi lagi", async () => {
    expect(await simpanInput(db, A, payload({ [M.plastik]: 1500 }, { konfirmasi: [M.kertas] }), { sekarang: SEKARANG })).toMatchObject({ ok: false, jenis: "konfirmasi" });
    await simpanInput(db, A, payload({ [M.plastik]: 1500 }, { konfirmasi: [M.plastik] }), { sekarang: SEKARANG });
    const ulang = await simpanInput(db, A, payload({ [M.plastik]: 1500, [M.kertas]: 2 }), { sekarang: SEKARANG });
    expect(ulang).toMatchObject({ ok: true });
    expect((await faktaLokasi("lok-a")).find((f) => f.bulan === 10 && f.metrik_id === M.plastik)?.cek).toBe(true); // penanda lama dipertahankan
  });

  it("riwayat dihitung hanya dari lokasi sendiri: data terminal lain tidak mempengaruhi", async () => {
    await db.kueri("INSERT INTO fakta (lokasi_id, tahun, bulan, metrik_id, nilai) SELECT 'lok-b', 2026, b, $1, 1500 FROM generate_series(6,9) b", [M.plastik]);
    expect(await simpanInput(db, A, payload({ [M.plastik]: 1500 }), { sekarang: SEKARANG })).toMatchObject({ ok: false, jenis: "konfirmasi" });
  });
});

describe("pembacaan formulir", () => {
  it("mengembalikan skema, nilai tersimpan, petunjuk bulan sebelumnya, dan jumlah terisi", async () => {
    await db.kueri("INSERT INTO fakta (lokasi_id, tahun, bulan, metrik_id, nilai) VALUES ('lok-a',2026,9,$1,4),('lok-a',2026,10,$1,5),('lok-b',2026,10,$1,99)", [M.plastik]);
    const h = await ambilIsian(db, A, 2026, 10, SEKARANG);
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.data.nilai).toEqual({ [M.plastik]: 5 });
    expect(h.data.sebelumnya).toEqual({ [M.plastik]: 4 });
    expect(h.data.terisi).toEqual({ Sampah: 1 });
    expect(h.data.skema.map((k) => k.id)).toEqual([M.plastik, M.kertas, M.reduce, M.biosolar, M.cod]); // urutan Excel; tanpa kolom non-isian
    expect(h.data.skema.find((k) => k.id === M.cod)?.satuan).toBe("mg/L");
  });
});
