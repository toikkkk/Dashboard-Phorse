// Pembantu untuk uji: database di memori dengan skema penuh dan dua lokasi contoh.
import { buatDb, jalankanMigrasi, type Db } from "./db";
import { buatAkun } from "./otentikasi";

export async function siapkanDb(): Promise<Db> {
  const db = await buatDb({ pgliteDir: null });
  await jalankanMigrasi(db);
  await db.kueri(
    `INSERT INTO lokasi (id, nama, singkat, tipe, provinsi, urutan) VALUES
       ('lok-a', 'Terminal A', 'Terminal A', 'Fuel Terminal', 'Jawa Timur', 0),
       ('lok-b', 'Terminal B', 'Terminal B', 'Fuel Terminal', 'Bali', 1)`,
  );
  return db;
}

export async function buatAkunUji(db: Db) {
  const admin = await buatAkun(db, { username: "admin", nama: "Admin", peran: "admin", lokasiId: null });
  const a = await buatAkun(db, { username: "terminal-a", nama: "Terminal A", peran: "terminal", lokasiId: "lok-a" });
  const b = await buatAkun(db, { username: "terminal-b", nama: "Terminal B", peran: "terminal", lokasiId: "lok-b" });
  return { admin, a, b };
}
