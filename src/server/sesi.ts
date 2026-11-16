// Sesi: token acak untuk cookie; di database hanya hash SHA-256-nya yang disimpan
// (jika database bocor, token tidak bisa dipakai untuk masuk).

import { createHash, randomBytes } from "node:crypto";
import type { Db } from "./db";

export const SESI_IDLE_MS = 4 * 60 * 60 * 1000; //  4 jam tanpa aktivitas
export const SESI_MAKS_MS = 24 * 60 * 60 * 1000; // 24 jam sejak login, apa pun yang terjadi
const SEGARKAN_SETELAH_MS = 10 * 60 * 1000;

export type Pengguna = {
  id: string;
  username: string;
  nama: string;
  peran: "admin" | "terminal";
  /** id lokasi untuk akun terminal; null untuk admin */
  lokasiId: string | null;
  harusGanti: boolean;
};

export const buatToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function mulaiSesi(
  db: Db, penggunaId: string, info: { ip?: string | null; ua?: string | null; sekarang?: Date } = {},
): Promise<{ token: string; kedaluwarsa: Date }> {
  const sekarang = info.sekarang ?? new Date();
  const token = buatToken();
  const kedaluwarsa = new Date(sekarang.getTime() + SESI_MAKS_MS);
  await db.kueri(
    "INSERT INTO sesi (id_hash, pengguna_id, dibuat, terakhir_aktif, kedaluwarsa, ip, ua) VALUES ($1, $2, $3, $3, $4, $5, $6)",
    [hashToken(token), penggunaId, sekarang.toISOString(), kedaluwarsa.toISOString(), info.ip ?? null, (info.ua ?? "").slice(0, 300) || null],
  );
  return { token, kedaluwarsa };
}

type BarisSesi = {
  terakhir_aktif: Date | string;
  kedaluwarsa: Date | string;
  id: string; username: string; nama: string; peran: "admin" | "terminal"; lokasi_id: string | null; harus_ganti: boolean; aktif: boolean;
};

/**
 * Memeriksa token sesi. Mengembalikan pengguna jika sesi masih berlaku, selain itu null
 * (sesi yang kedaluwarsa, menganggur terlalu lama, atau milik akun nonaktif ikut dihapus).
 */
export async function cariSesi(db: Db, token: string, sekarang = new Date()): Promise<Pengguna | null> {
  if (!token || token.length > 200) return null;
  const idHash = hashToken(token);
  const [s] = await db.kueri<BarisSesi>(
    `SELECT s.terakhir_aktif, s.kedaluwarsa, p.id, p.username, p.nama, p.peran, p.lokasi_id, p.harus_ganti, p.aktif
       FROM sesi s JOIN pengguna p ON p.id = s.pengguna_id WHERE s.id_hash = $1`,
    [idHash],
  );
  if (!s) return null;
  const terakhir = new Date(s.terakhir_aktif).getTime();
  const habis = new Date(s.kedaluwarsa).getTime();
  if (!s.aktif || sekarang.getTime() >= habis || sekarang.getTime() - terakhir >= SESI_IDLE_MS) {
    await db.kueri("DELETE FROM sesi WHERE id_hash = $1", [idHash]);
    return null;
  }
  if (sekarang.getTime() - terakhir >= SEGARKAN_SETELAH_MS) {
    await db.kueri("UPDATE sesi SET terakhir_aktif = $2 WHERE id_hash = $1", [idHash, sekarang.toISOString()]);
  }
  return { id: s.id, username: s.username, nama: s.nama, peran: s.peran, lokasiId: s.lokasi_id, harusGanti: s.harus_ganti };
}

export async function akhiriSesi(db: Db, token: string): Promise<void> {
  await db.kueri("DELETE FROM sesi WHERE id_hash = $1", [hashToken(token)]);
}

/** Menghapus semua sesi pengguna (opsional: kecuali satu sesi yang sedang dipakai). */
export async function akhiriSemuaSesi(db: Db, penggunaId: string, kecualiToken?: string): Promise<void> {
  if (kecualiToken) {
    await db.kueri("DELETE FROM sesi WHERE pengguna_id = $1 AND id_hash <> $2", [penggunaId, hashToken(kecualiToken)]);
  } else {
    await db.kueri("DELETE FROM sesi WHERE pengguna_id = $1", [penggunaId]);
  }
}

/** Membersihkan sesi yang sudah kedaluwarsa (dipanggil sesekali saat login). */
export async function bersihkanSesi(db: Db, sekarang = new Date()): Promise<void> {
  await db.kueri("DELETE FROM sesi WHERE kedaluwarsa < $1 OR terakhir_aktif < $2", [
    sekarang.toISOString(), new Date(sekarang.getTime() - SESI_IDLE_MS).toISOString(),
  ]);
}
