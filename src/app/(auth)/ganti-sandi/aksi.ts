"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ambilIp, ambilPengguna, ambilToken } from "@/server/akses";
import { ambilDb } from "@/server/db";
import { gantiSandi } from "@/server/otentikasi";

export type StatusGanti = { galat?: string; ok?: true; tujuan?: string } | null;

const skema = z.object({
  sandiLama: z.string().min(1).max(1024),
  sandiBaru: z.string().max(1024),
  ulang: z.string().max(1024),
});

export async function gantiSandiAksi(_sebelumnya: StatusGanti, form: FormData): Promise<StatusGanti> {
  // Sengaja tidak memakai wajibMasuk(): halaman ini justru untuk akun yang WAJIB ganti sandi.
  const pengguna = await ambilPengguna();
  if (!pengguna) redirect("/login");

  const masukan = skema.safeParse({ sandiLama: form.get("sandiLama"), sandiBaru: form.get("sandiBaru"), ulang: form.get("ulang") });
  if (!masukan.success) return { galat: "Lengkapi semua kolom." };
  if (masukan.data.sandiBaru !== masukan.data.ulang) return { galat: "Kata sandi baru dan pengulangannya tidak sama." };

  try {
    const hasil = await gantiSandi(await ambilDb(), pengguna, {
      sandiLama: masukan.data.sandiLama, sandiBaru: masukan.data.sandiBaru, token: (await ambilToken()) ?? undefined, ip: await ambilIp(),
    });
    if (!hasil.ok) return { galat: hasil.pesan };
  } catch (e) {
    console.error("ganti sandi gagal karena kesalahan layanan", e);
    return { galat: "Layanan sedang bermasalah. Coba lagi sebentar." };
  }
  // Klien memainkan transisi GSAP lalu berpindah ke dashboard.
  return { ok: true, tujuan: "/" };
}
