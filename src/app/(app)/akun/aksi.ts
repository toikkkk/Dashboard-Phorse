"use server";

import { z } from "zod";
import { ambilIp, wajibAdmin } from "@/server/akses";
import { ambilDb } from "@/server/db";
import { aturUlangSandi, ubahAktif } from "@/server/otentikasi";

const uuid = z.string().uuid();

export type HasilAturUlang = { ok: true; username: string; sandiBaru: string } | { ok: false; pesan: string };
export type HasilUbahAktif = { ok: true } | { ok: false; pesan: string };

export async function aturUlangSandiAksi(penggunaId: unknown): Promise<HasilAturUlang> {
  const akses = await wajibAdmin();
  if (!akses.ok) return { ok: false, pesan: "Hanya admin yang dapat melakukan ini." };
  const id = uuid.safeParse(penggunaId);
  if (!id.success) return { ok: false, pesan: "Akun tidak valid." };
  try {
    const h = await aturUlangSandi(await ambilDb(), akses.pengguna, id.data, await ambilIp());
    return { ok: true, ...h };
  } catch (e) {
    return { ok: false, pesan: e instanceof Error ? e.message : "Gagal mengatur ulang sandi." };
  }
}

export async function ubahAktifAksi(penggunaId: unknown, aktif: unknown): Promise<HasilUbahAktif> {
  const akses = await wajibAdmin();
  if (!akses.ok) return { ok: false, pesan: "Hanya admin yang dapat melakukan ini." };
  const id = uuid.safeParse(penggunaId);
  if (!id.success || typeof aktif !== "boolean") return { ok: false, pesan: "Permintaan tidak valid." };
  try {
    await ubahAktif(await ambilDb(), akses.pengguna, id.data, aktif, await ambilIp());
    return { ok: true };
  } catch (e) {
    return { ok: false, pesan: e instanceof Error ? e.message : "Gagal mengubah status akun." };
  }
}
