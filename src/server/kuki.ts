// Konstanta cookie sesi (dipakai proxy dan server). Tanpa dependensi Next agar aman diimpor di mana saja.

export const PRODUKSI = process.env.NODE_ENV === "production";

/** Di produksi memakai awalan __Host-: cookie hanya dikirim lewat HTTPS ke host ini, tanpa Domain, Path=/. */
export const NAMA_COOKIE = PRODUKSI ? "__Host-phorse" : "phorse";

export const OPSI_COOKIE = {
  httpOnly: true,
  secure: PRODUKSI,
  sameSite: "lax" as const,
  path: "/",
};
