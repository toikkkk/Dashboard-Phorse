import "server-only";

// Pintu masuk otorisasi untuk kode yang berjalan di server Next.js (route handler dan Server Action).
// Setiap handler/aksi WAJIB memanggil salah satu fungsi di sini; jangan percaya apa pun dari klien.

import { cookies, headers } from "next/headers";
import { ambilDb } from "./db";
import { NAMA_COOKIE, OPSI_COOKIE } from "./kuki";
import { akhiriSesi, cariSesi, SESI_MAKS_MS, type Pengguna } from "./sesi";

/** Alamat IP klien. Di Vercel, x-forwarded-for diisi oleh platform (bukan oleh klien). */
export async function ambilIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = (xff ? xff.split(",")[0] : h.get("x-real-ip"))?.trim();
  return ip && ip.length <= 64 ? ip : "tidak-diketahui";
}

export async function ambilUserAgent(): Promise<string> {
  return ((await headers()).get("user-agent") ?? "").slice(0, 300);
}

export async function ambilToken(): Promise<string | null> {
  return (await cookies()).get(NAMA_COOKIE)?.value ?? null;
}

/** Pengguna dari sesi yang sah, atau null. */
export async function ambilPengguna(): Promise<Pengguna | null> {
  const token = await ambilToken();
  if (!token) return null;
  return cariSesi(await ambilDb(), token);
}

export async function setCookieSesi(token: string): Promise<void> {
  (await cookies()).set(NAMA_COOKIE, token, { ...OPSI_COOKIE, maxAge: Math.floor(SESI_MAKS_MS / 1000) });
}

export async function hapusCookieSesi(): Promise<void> {
  (await cookies()).set(NAMA_COOKIE, "", { ...OPSI_COOKIE, maxAge: 0 });
}

export async function keluarkan(): Promise<void> {
  const token = await ambilToken();
  if (token) await akhiriSesi(await ambilDb(), token);
  await hapusCookieSesi();
}

export type HasilAkses = { ok: true; pengguna: Pengguna } | { ok: false; status: 401 | 403; galat: string };

/** Untuk route handler: butuh sesi sah dan sandi awal sudah diganti. */
export async function wajibMasuk(): Promise<HasilAkses> {
  const pengguna = await ambilPengguna();
  if (!pengguna) return { ok: false, status: 401, galat: "belum-masuk" };
  if (pengguna.harusGanti) return { ok: false, status: 403, galat: "harus-ganti-sandi" };
  return { ok: true, pengguna };
}

export async function wajibAdmin(): Promise<HasilAkses> {
  const h = await wajibMasuk();
  if (!h.ok) return h;
  if (h.pengguna.peran !== "admin") return { ok: false, status: 403, galat: "bukan-admin" };
  return h;
}
