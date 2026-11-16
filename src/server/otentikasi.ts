// Login, pembatas percobaan, ganti sandi, dan pengelolaan akun oleh admin.

import type { Db } from "./db";
import { ambilHashPalsu, buatHash, buatSandiAcak, periksaSandi, validasiSandiBaru } from "./sandi";
import { akhiriSemuaSesi, bersihkanSesi, mulaiSesi, type Pengguna } from "./sesi";

export const MAKS_GAGAL_PENGGUNA = 5;
export const MAKS_GAGAL_IP = 20;
export const JENDELA_DETIK = 15 * 60;
export const KUNCI_DETIK = 15 * 60;

export const POLA_USERNAME = /^[a-z0-9][a-z0-9._-]{2,63}$/;

export async function catatAudit(
  db: Db, aksi: string, info: { penggunaId?: string | null; detail?: Record<string, unknown>; ip?: string | null } = {},
): Promise<void> {
  await db.kueri("INSERT INTO audit (pengguna_id, aksi, detail, ip) VALUES ($1, $2, $3::jsonb, $4)", [
    info.penggunaId ?? null, aksi, JSON.stringify(info.detail ?? {}), info.ip ?? null,
  ]);
}

// ------------------------------------------------------------------ pembatas percobaan

async function sisaKunci(db: Db, kunci: string[], sekarang: Date): Promise<number> {
  const baris = await db.kueri<{ terkunci_sampai: Date | string | null }>(
    "SELECT terkunci_sampai FROM percobaan_login WHERE kunci = ANY($1::text[])", [kunci],
  );
  let sisa = 0;
  for (const b of baris) {
    if (!b.terkunci_sampai) continue;
    sisa = Math.max(sisa, Math.ceil((new Date(b.terkunci_sampai).getTime() - sekarang.getTime()) / 1000));
  }
  return Math.max(0, sisa);
}

/** Menambah hitungan gagal secara atomik; terkunci jika mencapai batas dalam jendela waktu. */
async function catatGagal(db: Db, kunci: string, maks: number, sekarang: Date): Promise<void> {
  await db.kueri(
    `INSERT INTO percobaan_login AS p (kunci, jumlah, jendela_mulai, terkunci_sampai)
     VALUES ($1, 1, $2::timestamptz, CASE WHEN 1 >= $3 THEN $2::timestamptz + make_interval(secs => $5) END)
     ON CONFLICT (kunci) DO UPDATE SET
       jumlah = CASE WHEN p.jendela_mulai + make_interval(secs => $4) < $2::timestamptz THEN 1 ELSE p.jumlah + 1 END,
       jendela_mulai = CASE WHEN p.jendela_mulai + make_interval(secs => $4) < $2::timestamptz THEN $2::timestamptz ELSE p.jendela_mulai END,
       terkunci_sampai = CASE
         WHEN (CASE WHEN p.jendela_mulai + make_interval(secs => $4) < $2::timestamptz THEN 1 ELSE p.jumlah + 1 END) >= $3
           THEN $2::timestamptz + make_interval(secs => $5)
         WHEN p.terkunci_sampai IS NOT NULL AND p.terkunci_sampai > $2::timestamptz THEN p.terkunci_sampai
         ELSE NULL END`,
    [kunci, sekarang.toISOString(), maks, JENDELA_DETIK, KUNCI_DETIK],
  );
}

// ------------------------------------------------------------------ login

export type HasilLogin =
  | { ok: true; token: string; kedaluwarsa: Date; pengguna: Pengguna }
  | { ok: false; alasan: "salah" }
  | { ok: false; alasan: "terkunci"; sisaDetik: number };

export function normalisasiUsername(masukan: string): string {
  return masukan.normalize("NFKC").trim().toLowerCase();
}

export async function masuk(
  db: Db,
  masukan: { username: string; sandi: string; ip?: string | null; ua?: string | null },
  sekarang = new Date(),
): Promise<HasilLogin> {
  const username = normalisasiUsername(masukan.username);
  const ip = masukan.ip && masukan.ip !== "tidak-diketahui" ? masukan.ip : null;
  const kunciPengguna = `u:${username.slice(0, 64)}`;
  const kunci = ip ? [kunciPengguna, `ip:${ip}`] : [kunciPengguna];

  // Penguncian berlaku untuk nama pengguna mana pun (ada atau tidak), sehingga tidak membocorkan keberadaan akun.
  const sisa = await sisaKunci(db, kunci, sekarang);
  if (sisa > 0) {
    await catatAudit(db, "login_ditolak_terkunci", { detail: { username: username.slice(0, 64) }, ip });
    return { ok: false, alasan: "terkunci", sisaDetik: sisa };
  }

  const polaValid = POLA_USERNAME.test(username) && masukan.sandi.length > 0 && masukan.sandi.length <= 1024;
  const [akun] = polaValid
    ? await db.kueri<{ id: string; username: string; nama: string; peran: "admin" | "terminal"; lokasi_id: string | null; hash_sandi: string; aktif: boolean; harus_ganti: boolean }>(
        "SELECT id, username, nama, peran, lokasi_id, hash_sandi, aktif, harus_ganti FROM pengguna WHERE username = $1", [username],
      )
    : [];

  // Selalu menghitung satu hash, juga untuk akun yang tidak ada: waktu respons tidak membedakan keduanya.
  const cocok = await periksaSandi(masukan.sandi.slice(0, 1024), akun ? akun.hash_sandi : await ambilHashPalsu());

  if (!akun || !cocok || !akun.aktif) {
    await catatGagal(db, kunciPengguna, MAKS_GAGAL_PENGGUNA, sekarang);
    if (ip) await catatGagal(db, `ip:${ip}`, MAKS_GAGAL_IP, sekarang);
    await catatAudit(db, "login_gagal", { penggunaId: akun?.id ?? null, detail: { username: username.slice(0, 64), nonaktif: akun ? !akun.aktif : undefined }, ip });
    return { ok: false, alasan: "salah" };
  }

  await db.kueri("DELETE FROM percobaan_login WHERE kunci = $1", [kunciPengguna]);
  const { token, kedaluwarsa } = await mulaiSesi(db, akun.id, { ip, ua: masukan.ua, sekarang });
  await db.kueri("UPDATE pengguna SET terakhir_login = $2 WHERE id = $1", [akun.id, sekarang.toISOString()]);
  await catatAudit(db, "login", { penggunaId: akun.id, ip });
  if (Math.random() < 0.05) await bersihkanSesi(db, sekarang);
  return {
    ok: true, token, kedaluwarsa,
    pengguna: { id: akun.id, username: akun.username, nama: akun.nama, peran: akun.peran, lokasiId: akun.lokasi_id, harusGanti: akun.harus_ganti },
  };
}

// ------------------------------------------------------------------ ganti sandi

export type HasilGantiSandi = { ok: true } | { ok: false; pesan: string };

export async function gantiSandi(
  db: Db,
  pengguna: Pengguna,
  masukan: { sandiLama: string; sandiBaru: string; token?: string; ip?: string | null },
): Promise<HasilGantiSandi> {
  const [akun] = await db.kueri<{ hash_sandi: string }>("SELECT hash_sandi FROM pengguna WHERE id = $1 AND aktif", [pengguna.id]);
  if (!akun || !(await periksaSandi(masukan.sandiLama.slice(0, 1024), akun.hash_sandi))) {
    await catatAudit(db, "ganti_sandi_gagal", { penggunaId: pengguna.id, ip: masukan.ip });
    return { ok: false, pesan: "Kata sandi saat ini salah." };
  }
  const galat = validasiSandiBaru(masukan.sandiBaru, { username: pengguna.username, sandiLama: masukan.sandiLama });
  if (galat) return { ok: false, pesan: galat };
  await db.kueri("UPDATE pengguna SET hash_sandi = $2, harus_ganti = false WHERE id = $1", [pengguna.id, await buatHash(masukan.sandiBaru)]);
  await akhiriSemuaSesi(db, pengguna.id, masukan.token); // sesi lain (mis. di komputer lain) ikut keluar
  await catatAudit(db, "ganti_sandi", { penggunaId: pengguna.id, ip: masukan.ip });
  return { ok: true };
}

// ------------------------------------------------------------------ pengelolaan akun (admin)

export async function buatAkun(
  db: Db,
  data: { username: string; nama: string; peran: "admin" | "terminal"; lokasiId: string | null },
): Promise<{ id: string; sandiAwal: string }> {
  const username = normalisasiUsername(data.username);
  if (!POLA_USERNAME.test(username)) throw new Error(`Nama pengguna tidak valid: ${data.username}`);
  const sandiAwal = buatSandiAcak(16);
  const [baris] = await db.kueri<{ id: string }>(
    "INSERT INTO pengguna (username, nama, peran, lokasi_id, hash_sandi, harus_ganti) VALUES ($1, $2, $3, $4, $5, true) RETURNING id",
    [username, data.nama, data.peran, data.lokasiId, await buatHash(sandiAwal)],
  );
  return { id: baris.id, sandiAwal };
}

/** Admin mengatur ulang sandi akun: sandi acak baru (ditampilkan sekali), wajib diganti, semua sesi akun itu berakhir. */
export async function aturUlangSandi(db: Db, admin: Pengguna, penggunaId: string, ip?: string | null): Promise<{ username: string; sandiBaru: string }> {
  if (admin.peran !== "admin") throw new Error("Hanya admin yang boleh mengatur ulang sandi.");
  const sandiBaru = buatSandiAcak(16);
  const [akun] = await db.kueri<{ username: string }>(
    "UPDATE pengguna SET hash_sandi = $2, harus_ganti = true WHERE id = $1 RETURNING username", [penggunaId, await buatHash(sandiBaru)],
  );
  if (!akun) throw new Error("Akun tidak ditemukan.");
  await akhiriSemuaSesi(db, penggunaId);
  await db.kueri("DELETE FROM percobaan_login WHERE kunci = $1", [`u:${akun.username}`]);
  await catatAudit(db, "atur_ulang_sandi", { penggunaId: admin.id, detail: { sasaran: akun.username }, ip });
  return { username: akun.username, sandiBaru };
}

export async function ubahAktif(db: Db, admin: Pengguna, penggunaId: string, aktif: boolean, ip?: string | null): Promise<void> {
  if (admin.peran !== "admin") throw new Error("Hanya admin yang boleh mengubah status akun.");
  if (penggunaId === admin.id && !aktif) throw new Error("Admin tidak dapat menonaktifkan akunnya sendiri.");
  const [akun] = await db.kueri<{ username: string }>("UPDATE pengguna SET aktif = $2 WHERE id = $1 RETURNING username", [penggunaId, aktif]);
  if (!akun) throw new Error("Akun tidak ditemukan.");
  if (!aktif) await akhiriSemuaSesi(db, penggunaId);
  await catatAudit(db, aktif ? "akun_diaktifkan" : "akun_dinonaktifkan", { penggunaId: admin.id, detail: { sasaran: akun.username }, ip });
}
