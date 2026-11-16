// Membuat akun awal: satu akun terminal untuk setiap lokasi, ditambah satu akun admin.
//   npx tsx scripts/buat-akun.mts
// Aman dijalankan berulang: hanya akun yang belum ada yang dibuat. Sandi awal acak (16 karakter),
// wajib diganti saat masuk pertama, dan HANYA ditulis ke .data/kredensial-awal.csv (jangan di-commit).
// DATABASE_URL (Neon) dibaca dari environment; tanpa itu dipakai database lokal di .data/pglite.

import { appendFileSync, chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { buatDb } from "../src/server/db";
import { buatAkun } from "../src/server/otentikasi";

const BERKAS = process.env.KREDENSIAL_BERKAS || ".data/kredensial-awal.csv";
const db = await buatDb();
console.log(`Database: ${db.jenis}${db.jenis === "neon" ? " (DATABASE_URL)" : " (lokal, .data/pglite)"}`);

const lokasi = await db.kueri<{ id: string; nama: string }>("SELECT id, nama FROM lokasi ORDER BY urutan");
if (!lokasi.length) throw new Error("Tabel lokasi kosong. Jalankan `npm run db:seed` lebih dulu.");

const ada = new Set((await db.kueri<{ username: string }>("SELECT username FROM pengguna")).map((r) => r.username));
const calon = [
  { username: "admin", nama: "Admin Regional Jatimbalinus", peran: "admin" as const, lokasiId: null as string | null },
  ...lokasi.map((l) => ({ username: l.id, nama: `Terminal ${l.nama}`, peran: "terminal" as const, lokasiId: l.id as string | null })),
];

const baru: string[] = [];
for (const c of calon) {
  if (ada.has(c.username)) continue;
  // Satu akun terminal per lokasi (dijaga juga oleh indeks unik di database).
  const { sandiAwal } = await buatAkun(db, c);
  baru.push(`${c.username},${c.peran},"${c.nama.replace(/"/g, '""')}",${sandiAwal}`);
}

if (baru.length) {
  mkdirSync(".data", { recursive: true });
  if (!existsSync(BERKAS)) writeFileSync(BERKAS, "username,peran,nama,sandi_awal\n", { mode: 0o600 });
  appendFileSync(BERKAS, baru.join("\n") + "\n");
  try {
    chmodSync(BERKAS, 0o600);
  } catch {
    // Windows tidak mengenal mode ini; pastikan folder .data tidak dibagikan.
  }
}
console.log(`${baru.length} akun baru dibuat, ${calon.length - baru.length} sudah ada.`);
if (baru.length) console.log(`Sandi awal ada di ${BERKAS}. Serahkan ke tiap petugas lewat jalur aman lalu hapus berkas itu.`);
await db.tutup();
