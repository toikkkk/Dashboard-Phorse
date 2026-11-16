// Kata sandi: hash scrypt (bawaan Node, tanpa dependensi), pembuatan sandi acak, dan aturan kekuatan sandi.

import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from "node:crypto";

// Parameter scrypt: memori = 128 * N * r = 32 MiB per hash. Tersimpan di dalam hash sehingga bisa dinaikkan nanti.
const N = 2 ** 15;
const R = 8;
const P = 1;
const PANJANG_KUNCI = 64;
const MAKS_MEMORI = 96 * 1024 * 1024;

function turunkan(sandi: string, garam: Buffer, n: number, r: number, p: number, panjang: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(sandi.normalize("NFKC"), garam, panjang, { N: n, r, p, maxmem: MAKS_MEMORI }, (err, kunci) =>
      err ? reject(err) : resolve(kunci),
    );
  });
}

export async function buatHash(sandi: string): Promise<string> {
  const garam = randomBytes(16);
  const kunci = await turunkan(sandi, garam, N, R, P, PANJANG_KUNCI);
  return ["scrypt", Math.log2(N), R, P, garam.toString("base64"), kunci.toString("base64")].join("$");
}

/** Perbandingan waktu-konstan. Hash yang rusak/tidak dikenal dianggap tidak cocok (bukan error). */
export async function periksaSandi(sandi: string, hash: string): Promise<boolean> {
  const bagian = hash.split("$");
  if (bagian.length !== 6 || bagian[0] !== "scrypt") return false;
  const [, logN, r, p, garamB64, kunciB64] = bagian;
  try {
    const garam = Buffer.from(garamB64, "base64");
    const diharapkan = Buffer.from(kunciB64, "base64");
    // Hash yang rusak/dipalsukan TIDAK boleh cocok dengan apa pun: kunci kosong atau garam kosong ditolak,
    // dan parameter dibatasi agar hash palsu tidak bisa dipakai untuk menghabiskan memori/CPU.
    const [n, rr, pp] = [Number(logN), Number(r), Number(p)];
    if (garam.length < 8 || diharapkan.length < 32) return false;
    if (!Number.isInteger(n) || n < 10 || n > 20 || !Number.isInteger(rr) || rr < 1 || rr > 16 || !Number.isInteger(pp) || pp < 1 || pp > 4) {
      return false;
    }
    const hasil = await turunkan(sandi, garam, 2 ** n, rr, pp, diharapkan.length);
    return hasil.length === diharapkan.length && timingSafeEqual(hasil, diharapkan);
  } catch {
    return false;
  }
}

let hashPalsu: Promise<string> | null = null;
/** Hash tiruan untuk akun yang tidak ada, supaya waktu respons login tidak membocorkan keberadaan akun. */
export function ambilHashPalsu(): Promise<string> {
  hashPalsu ??= buatHash(randomBytes(16).toString("hex"));
  return hashPalsu;
}

// Tanpa karakter yang mudah tertukar (0/O, 1/l/I).
const ALFABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function buatSandiAcak(panjang = 16): string {
  let hasil = "";
  for (let i = 0; i < panjang; i++) hasil += ALFABET[randomInt(ALFABET.length)];
  return hasil;
}

const UMUM = new Set([
  "password1234", "kata sandi 1234", "pertamina12345", "pertamina2026", "pertamina2025", "patraniaga123", "123456789012",
  "qwertyuiop12", "admin1234567", "password12345", "passw0rd12345", "indonesia2026", "jatimbalinus1",
]);

export const PANJANG_MIN = 12;
export const PANJANG_MAKS = 128;

/** Mengembalikan pesan kesalahan (bahasa Indonesia) atau null jika sandi baru dapat diterima. */
export function validasiSandiBaru(sandi: string, opsi: { username: string; nama?: string; sandiLama?: string }): string | null {
  if (sandi.length < PANJANG_MIN) return `Kata sandi minimal ${PANJANG_MIN} karakter.`;
  if (sandi.length > PANJANG_MAKS) return `Kata sandi maksimal ${PANJANG_MAKS} karakter.`;
  if (!/[A-Za-z]/.test(sandi) || !/\d/.test(sandi)) return "Kata sandi harus mengandung huruf dan angka.";
  const kecil = sandi.toLowerCase();
  if (kecil.includes(opsi.username.toLowerCase())) return "Kata sandi tidak boleh memuat nama pengguna.";
  if (UMUM.has(kecil) || /^(.)\1+$/.test(sandi)) return "Kata sandi terlalu mudah ditebak.";
  if (/^(?:0123456789|1234567890|abcdefghijkl)/i.test(sandi)) return "Kata sandi tidak boleh berupa urutan angka atau huruf.";
  if (opsi.sandiLama !== undefined && sandi === opsi.sandiLama) return "Kata sandi baru harus berbeda dari yang lama.";
  return null;
}
