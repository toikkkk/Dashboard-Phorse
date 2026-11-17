"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ambilIp, ambilUserAgent, keluarkan, setCookieSesi } from "@/server/akses";
import { ambilDb } from "@/server/db";
import { masuk } from "@/server/otentikasi";

export type StatusLogin = { galat?: string; username?: string; ok?: true; tujuan?: string } | null;

const skema = z.object({ username: z.string().min(1).max(100), sandi: z.string().min(1).max(1024) });

export async function masukAksi(_sebelumnya: StatusLogin, form: FormData): Promise<StatusLogin> {
  const masukan = skema.safeParse({ username: form.get("username"), sandi: form.get("sandi") });
  // Nama pengguna dikembalikan agar kolomnya tidak kosong setelah gagal (React mengosongkan formulir setelah aksi).
  const username = typeof form.get("username") === "string" ? (form.get("username") as string).slice(0, 100) : "";
  if (!masukan.success) return { galat: "Isi nama pengguna dan kata sandi.", username };

  let tujuan: string;
  try {
    const hasil = await masuk(await ambilDb(), {
      username: masukan.data.username, sandi: masukan.data.sandi, ip: await ambilIp(), ua: await ambilUserAgent(),
    });
    if (!hasil.ok) {
      return {
        galat:
          hasil.alasan === "terkunci"
            ? `Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(hasil.sisaDetik / 60))} menit.`
            : "Nama pengguna atau kata sandi salah.",
        username,
      };
    }
    await setCookieSesi(hasil.token);
    tujuan = hasil.pengguna.harusGanti ? "/ganti-sandi" : "/";
  } catch (e) {
    console.error("login gagal karena kesalahan layanan", e);
    return { galat: "Layanan sedang bermasalah. Coba lagi sebentar.", username };
  }
  // Tidak redirect dari server: klien memainkan transisi GSAP lalu berpindah halaman sendiri.
  return { ok: true, tujuan, username };
}

export async function keluarAksi(): Promise<void> {
  await keluarkan();
  redirect("/login");
}
