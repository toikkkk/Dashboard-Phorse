import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "./db";
import {
  aturUlangSandi, buatAkun, gantiSandi, MAKS_GAGAL_IP, MAKS_GAGAL_PENGGUNA, masuk, ubahAktif,
} from "./otentikasi";
import { buatHash, buatSandiAcak, periksaSandi, validasiSandiBaru } from "./sandi";
import { cariSesi, hashToken, mulaiSesi, SESI_IDLE_MS, SESI_MAKS_MS, type Pengguna } from "./sesi";
import { buatAkunUji, siapkanDb } from "./uji-bantu";

let db: Db;
let akun: Awaited<ReturnType<typeof buatAkunUji>>;
const MENIT = 60_000;
const T0 = new Date("2026-11-15T08:00:00Z");
const menit = (n: number) => new Date(T0.getTime() + n * MENIT);

beforeAll(async () => {
  db = await siapkanDb();
  akun = await buatAkunUji(db);
});
afterAll(async () => db.tutup());

describe("hash kata sandi", () => {
  it("hash berbeda tiap kali (garam acak) tetapi sama-sama dapat diverifikasi", async () => {
    const [h1, h2] = await Promise.all([buatHash("Sandi-Rahasia-123"), buatHash("Sandi-Rahasia-123")]);
    expect(h1).not.toBe(h2);
    expect(await periksaSandi("Sandi-Rahasia-123", h1)).toBe(true);
    expect(await periksaSandi("Sandi-Rahasia-123", h2)).toBe(true);
    expect(h1).not.toContain("Sandi-Rahasia-123");
  });
  it("menolak sandi salah, hash rusak, dan hash kosong tanpa melempar error", async () => {
    const h = await buatHash("Sandi-Rahasia-123");
    expect(await periksaSandi("sandi-rahasia-123", h)).toBe(false);
    expect(await periksaSandi("x", "bukan-hash")).toBe(false);
    expect(await periksaSandi("x", "")).toBe(false);
    expect(await periksaSandi("x", "scrypt$15$8$1$@@@$@@@")).toBe(false); // kunci kosong tidak boleh cocok dengan apa pun
    expect(await periksaSandi("", "scrypt$15$8$1$$")).toBe(false);
    // parameter berbahaya (memori sangat besar) ditolak tanpa dihitung
    expect(await periksaSandi("x", "scrypt$30$8$1$" + Buffer.alloc(16).toString("base64") + "$" + Buffer.alloc(64).toString("base64"))).toBe(false);
  });
  it("sandi acak: panjang benar, tanpa karakter yang mudah tertukar, dan tidak berulang", () => {
    const daftar = new Set(Array.from({ length: 200 }, () => buatSandiAcak(16)));
    expect(daftar.size).toBe(200);
    for (const s of daftar) {
      expect(s).toHaveLength(16);
      expect(s).not.toMatch(/[0OIl1]/);
    }
  });
});

describe("aturan kata sandi baru", () => {
  const opsi = { username: "terminal-a" };
  it("menolak sandi pendek, tanpa angka/huruf, memuat nama pengguna, umum, atau sama dengan yang lama", () => {
    expect(validasiSandiBaru("Pendek1", opsi)).toMatch(/minimal 12/);
    expect(validasiSandiBaru("hanyahurufsemua", opsi)).toMatch(/huruf dan angka/);
    expect(validasiSandiBaru("123456789012345", opsi)).toMatch(/huruf dan angka/);
    expect(validasiSandiBaru("xx-terminal-a-99", opsi)).toMatch(/nama pengguna/);
    expect(validasiSandiBaru("password12345", opsi)).toMatch(/mudah ditebak/);
    expect(validasiSandiBaru("Sandi-Lama-12345", { ...opsi, sandiLama: "Sandi-Lama-12345" })).toMatch(/berbeda/);
  });
  it("menerima sandi yang cukup kuat", () => {
    expect(validasiSandiBaru("Kuda-Biru-Lari-77", opsi)).toBeNull();
  });
});

describe("login", () => {
  it("berhasil dengan sandi awal, dan token TIDAK tersimpan mentah di database", async () => {
    const h = await masuk(db, { username: "terminal-a", sandi: akun.a.sandiAwal, ip: "10.0.0.1" }, menit(0));
    expect(h.ok).toBe(true);
    if (!h.ok) return;
    expect(h.pengguna).toMatchObject({ username: "terminal-a", peran: "terminal", lokasiId: "lok-a", harusGanti: true });
    const baris = await db.kueri<{ id_hash: string }>("SELECT id_hash FROM sesi");
    expect(baris.map((b) => b.id_hash)).toContain(hashToken(h.token));
    expect(baris.map((b) => b.id_hash)).not.toContain(h.token);
  });

  it("nama pengguna tidak membedakan huruf besar/kecil dan spasi di ujung", async () => {
    const h = await masuk(db, { username: "  Terminal-A ", sandi: akun.a.sandiAwal, ip: "10.0.0.2" }, menit(0));
    expect(h.ok).toBe(true);
  });

  it("sandi salah dan akun tidak ada menghasilkan jawaban yang sama (tidak membocorkan keberadaan akun)", async () => {
    const salah = await masuk(db, { username: "terminal-b", sandi: "salah-total-123", ip: "10.0.0.3" }, menit(0));
    const tidakAda = await masuk(db, { username: "tidak-ada", sandi: "salah-total-123", ip: "10.0.0.4" }, menit(0));
    expect(salah).toEqual({ ok: false, alasan: "salah" });
    expect(tidakAda).toEqual({ ok: false, alasan: "salah" });
  });

  it("menolak masukan aneh (kosong, terlalu panjang, karakter tidak sah) tanpa error", async () => {
    for (const username of ["", "a", "x".repeat(500), "terminal-a'; DROP TABLE pengguna;--", "ter minal"]) {
      const h = await masuk(db, { username, sandi: "apa-saja-123", ip: "10.0.0.5" }, menit(0));
      expect(h.ok).toBe(false);
    }
    const [{ n }] = await db.kueri<{ n: number }>("SELECT count(*)::int AS n FROM pengguna");
    expect(n).toBe(3);
  });

  it(`terkunci setelah ${MAKS_GAGAL_PENGGUNA} kali gagal, bahkan dengan sandi yang benar, lalu terbuka setelah 15 menit`, async () => {
    for (let i = 0; i < MAKS_GAGAL_PENGGUNA; i++) {
      const h = await masuk(db, { username: "terminal-b", sandi: "tebakan-" + i + "-abc", ip: `10.1.0.${i}` }, menit(100 + i));
      expect(h.ok).toBe(false);
    }
    const terkunci = await masuk(db, { username: "terminal-b", sandi: akun.b.sandiAwal, ip: "10.1.0.99" }, menit(106));
    expect(terkunci).toMatchObject({ ok: false, alasan: "terkunci" });
    if (!terkunci.ok && terkunci.alasan === "terkunci") expect(terkunci.sisaDetik).toBeGreaterThan(0);

    const masihTerkunci = await masuk(db, { username: "terminal-b", sandi: akun.b.sandiAwal, ip: "10.1.0.98" }, menit(110));
    expect(masihTerkunci).toMatchObject({ ok: false, alasan: "terkunci" });

    const terbuka = await masuk(db, { username: "terminal-b", sandi: akun.b.sandiAwal, ip: "10.1.0.97" }, menit(125));
    expect(terbuka.ok).toBe(true);
  });

  it("penguncian juga berlaku untuk nama pengguna yang tidak ada (tidak bisa dipakai menebak akun)", async () => {
    for (let i = 0; i < MAKS_GAGAL_PENGGUNA; i++) await masuk(db, { username: "hantu", sandi: "x-" + i + "-abcdefg", ip: `10.2.0.${i}` }, menit(200));
    const h = await masuk(db, { username: "hantu", sandi: "apa-pun-1234", ip: "10.2.0.50" }, menit(201));
    expect(h).toMatchObject({ ok: false, alasan: "terkunci" });
  });

  it(`satu alamat IP dikunci setelah ${MAKS_GAGAL_IP} kegagalan walau nama penggunanya berganti-ganti`, async () => {
    for (let i = 0; i < MAKS_GAGAL_IP; i++) await masuk(db, { username: `penebak-${i}`, sandi: "tebak-123-abcd", ip: "203.0.113.9" }, menit(300));
    const h = await masuk(db, { username: "terminal-a", sandi: akun.a.sandiAwal, ip: "203.0.113.9" }, menit(301));
    expect(h).toMatchObject({ ok: false, alasan: "terkunci" });
    // IP lain tidak terpengaruh
    const lain = await masuk(db, { username: "terminal-a", sandi: akun.a.sandiAwal, ip: "203.0.113.10" }, menit(301));
    expect(lain.ok).toBe(true);
  });

  it("akun nonaktif tidak bisa masuk, dan sesinya yang sedang berjalan ikut berakhir", async () => {
    const admin = (await masuk(db, { username: "admin", sandi: akun.admin.sandiAwal, ip: "10.3.0.1" }, menit(400)));
    expect(admin.ok).toBe(true);
    if (!admin.ok) return;
    const b = await masuk(db, { username: "terminal-b", sandi: akun.b.sandiAwal, ip: "10.3.0.2" }, menit(401));
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    await ubahAktif(db, admin.pengguna, b.pengguna.id, false);
    expect(await cariSesi(db, b.token, menit(402))).toBeNull();
    expect(await masuk(db, { username: "terminal-b", sandi: akun.b.sandiAwal, ip: "10.3.0.3" }, menit(403))).toEqual({ ok: false, alasan: "salah" });
    await ubahAktif(db, admin.pengguna, b.pengguna.id, true);
    expect((await masuk(db, { username: "terminal-b", sandi: akun.b.sandiAwal, ip: "10.3.0.4" }, menit(404))).ok).toBe(true);
  });
});

describe("sesi", () => {
  let p: Pengguna;
  beforeAll(async () => {
    const h = await masuk(db, { username: "terminal-a", sandi: akun.a.sandiAwal, ip: "10.9.0.1" }, menit(1000));
    if (!h.ok) throw new Error("login uji gagal");
    p = h.pengguna;
  });

  it("token acak dan tidak dapat ditebak: token sembarang ditolak", async () => {
    for (const t of ["", "abc", "x".repeat(300), "' OR '1'='1"]) expect(await cariSesi(db, t, menit(1001))).toBeNull();
  });

  it("berakhir setelah menganggur terlalu lama, dan baris sesinya dihapus", async () => {
    const { token } = await mulaiSesi(db, p.id, { sekarang: menit(1000) });
    expect(await cariSesi(db, token, menit(1000 + 60))).not.toBeNull();
    // aktivitas terakhir tercatat di menit 1060; idle dihitung dari situ
    expect(await cariSesi(db, token, new Date(menit(1060).getTime() + SESI_IDLE_MS + MENIT))).toBeNull();
    const sisa = await db.kueri("SELECT 1 FROM sesi WHERE id_hash = $1", [hashToken(token)]);
    expect(sisa).toHaveLength(0);
  });

  it("berakhir pada batas mutlak 24 jam walau terus aktif", async () => {
    const { token } = await mulaiSesi(db, p.id, { sekarang: menit(2000) });
    let t = menit(2000);
    for (let i = 0; i < 6; i++) {
      t = new Date(t.getTime() + 3.9 * 60 * MENIT); // tiap 3,9 jam: tidak pernah menganggur 4 jam
      if (t.getTime() - menit(2000).getTime() >= SESI_MAKS_MS) break;
      expect(await cariSesi(db, token, t)).not.toBeNull();
    }
    expect(await cariSesi(db, token, new Date(menit(2000).getTime() + SESI_MAKS_MS + MENIT))).toBeNull();
  });
});

describe("ganti sandi dan atur ulang", () => {
  it("ganti sandi: sandi lama wajib benar, aturan kekuatan berlaku, sesi lain berakhir, wajib-ganti dicabut", async () => {
    const dibuat = await buatAkun(db, { username: "terminal-uji", nama: "Uji", peran: "admin", lokasiId: null });
    const s1 = await masuk(db, { username: "terminal-uji", sandi: dibuat.sandiAwal, ip: "10.8.0.1" }, menit(3000));
    const s2 = await masuk(db, { username: "terminal-uji", sandi: dibuat.sandiAwal, ip: "10.8.0.2" }, menit(3000));
    if (!s1.ok || !s2.ok) throw new Error("login uji gagal");

    expect(await gantiSandi(db, s1.pengguna, { sandiLama: "salah-banget-123", sandiBaru: "Kuda-Biru-Lari-77", token: s1.token }))
      .toEqual({ ok: false, pesan: "Kata sandi saat ini salah." });
    expect((await gantiSandi(db, s1.pengguna, { sandiLama: dibuat.sandiAwal, sandiBaru: "pendek1", token: s1.token })).ok).toBe(false);

    expect(await gantiSandi(db, s1.pengguna, { sandiLama: dibuat.sandiAwal, sandiBaru: "Kuda-Biru-Lari-77", token: s1.token })).toEqual({ ok: true });
    expect(await cariSesi(db, s1.token, menit(3001))).toMatchObject({ harusGanti: false }); // sesi yang dipakai tetap hidup
    expect(await cariSesi(db, s2.token, menit(3001))).toBeNull(); // sesi lain berakhir
    expect((await masuk(db, { username: "terminal-uji", sandi: dibuat.sandiAwal, ip: "10.8.0.3" }, menit(3002))).ok).toBe(false);
    expect((await masuk(db, { username: "terminal-uji", sandi: "Kuda-Biru-Lari-77", ip: "10.8.0.4" }, menit(3002))).ok).toBe(true);
  });

  it("atur ulang oleh admin: sandi baru acak, wajib ganti, semua sesi akun itu berakhir; non-admin ditolak", async () => {
    const admin = await masuk(db, { username: "admin", sandi: akun.admin.sandiAwal, ip: "10.7.0.1" }, menit(4000));
    const a = await masuk(db, { username: "terminal-a", sandi: akun.a.sandiAwal, ip: "10.7.0.2" }, menit(4000));
    if (!admin.ok || !a.ok) throw new Error("login uji gagal");

    await expect(aturUlangSandi(db, a.pengguna, admin.pengguna.id)).rejects.toThrow(/Hanya admin/);
    await expect(ubahAktif(db, a.pengguna, admin.pengguna.id, false)).rejects.toThrow(/Hanya admin/);
    await expect(ubahAktif(db, admin.pengguna, admin.pengguna.id, false)).rejects.toThrow(/sendiri/);

    const hasil = await aturUlangSandi(db, admin.pengguna, a.pengguna.id);
    expect(hasil.sandiBaru).toHaveLength(16);
    expect(await cariSesi(db, a.token, menit(4001))).toBeNull();
    expect((await masuk(db, { username: "terminal-a", sandi: akun.a.sandiAwal, ip: "10.7.0.3" }, menit(4002))).ok).toBe(false);
    const baru = await masuk(db, { username: "terminal-a", sandi: hasil.sandiBaru, ip: "10.7.0.4" }, menit(4002));
    expect(baru.ok && baru.pengguna.harusGanti).toBe(true);
  });
});

describe("batasan database pada akun", () => {
  it("akun terminal wajib punya lokasi, admin tidak boleh punya lokasi, dan satu lokasi hanya satu akun", async () => {
    await expect(buatAkun(db, { username: "tanpa-lokasi", nama: "x", peran: "terminal", lokasiId: null })).rejects.toThrow();
    await expect(buatAkun(db, { username: "admin-berlokasi", nama: "x", peran: "admin", lokasiId: "lok-a" })).rejects.toThrow();
    await expect(buatAkun(db, { username: "terminal-a-kedua", nama: "x", peran: "terminal", lokasiId: "lok-a" })).rejects.toThrow();
    await expect(buatAkun(db, { username: "ada spasi", nama: "x", peran: "admin", lokasiId: null })).rejects.toThrow(/tidak valid/);
  });
  it("jejak audit mencatat login berhasil dan gagal tanpa menyimpan sandi", async () => {
    const baris = await db.kueri<{ aksi: string; detail: unknown }>("SELECT aksi, detail FROM audit");
    expect(baris.some((b) => b.aksi === "login")).toBe(true);
    expect(baris.some((b) => b.aksi === "login_gagal")).toBe(true);
    expect(JSON.stringify(baris)).not.toMatch(/tebakan|salah-total|sandi_awal/i);
  });
});
