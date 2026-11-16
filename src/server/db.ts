// Lapisan koneksi database.
// Produksi: Neon Postgres lewat DATABASE_URL (Vercel Marketplace).
// Lokal / uji: PGlite (Postgres sungguhan versi WASM) dengan SQL yang sama.
// Produksi tanpa DATABASE_URL SENGAJA gagal, agar tidak diam-diam memakai database sementara.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export type Baris = Record<string, unknown>;
export type Kueri = <T = Baris>(sql: string, params?: unknown[]) => Promise<T[]>;

export interface Db {
  jenis: "neon" | "pglite";
  kueri: Kueri;
  /** Menjalankan beberapa kueri secara atomik; gagal di tengah = semuanya dibatalkan. */
  transaksi<T>(fn: (kueri: Kueri) => Promise<T>): Promise<T>;
  /** Menjalankan skrip SQL multi-pernyataan tanpa parameter (migrasi). */
  skrip(sql: string): Promise<void>;
  tutup(): Promise<void>;
}

export type OpsiDb = {
  /** URL Postgres. Jika tidak diberikan, dibaca dari DATABASE_URL. */
  url?: string | null;
  /** Folder penyimpanan PGlite. null = di memori (untuk uji). */
  pgliteDir?: string | null;
};

export async function buatDb(opsi: OpsiDb = {}): Promise<Db> {
  const url = opsi.url === undefined ? process.env.DATABASE_URL : opsi.url;
  const sengajaLokal = opsi.pgliteDir !== undefined || opsi.url === null;

  if (url && !sengajaLokal) {
    const { Pool } = await import("@neondatabase/serverless");
    const pool = new Pool({ connectionString: url });
    const bungkus = (c: { query: (s: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }): Kueri =>
      (async (sql: string, params?: unknown[]) => (await c.query(sql, params)).rows) as Kueri;
    return {
      jenis: "neon",
      kueri: bungkus(pool),
      async transaksi(fn) {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const hasil = await fn(bungkus(c));
          await c.query("COMMIT");
          return hasil;
        } catch (e) {
          await c.query("ROLLBACK").catch(() => {});
          throw e;
        } finally {
          c.release();
        }
      },
      async skrip(sql) {
        await pool.query(sql);
      },
      tutup: () => pool.end(),
    };
  }

  if (process.env.NODE_ENV === "production" && !sengajaLokal) {
    throw new Error("DATABASE_URL belum diatur. Hubungkan database Neon di Vercel (Storage → Neon) lalu deploy ulang.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const dir = opsi.pgliteDir === undefined ? (process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pglite")) : opsi.pgliteDir;
  const pg = dir === null ? new PGlite() : new PGlite(/*turbopackIgnore: true*/ dir);
  await pg.waitReady;
  const ke = (c: { query: (s: string, p?: unknown[]) => Promise<{ rows: unknown[] }> }): Kueri =>
    (async (sql: string, params?: unknown[]) => (await c.query(sql, params)).rows) as Kueri;
  return {
    jenis: "pglite",
    kueri: ke(pg),
    transaksi: (fn) => pg.transaction((tx) => fn(ke(tx))),
    async skrip(sql) {
      await pg.exec(sql);
    },
    tutup: () => pg.close(),
  };
}

// Disimpan di globalThis, bukan variabel modul: saat pengembangan, route handler dan Server Action bisa memuat
// salinan modul ini sendiri-sendiri, dan dua instans PGlite pada folder yang sama saling merusak data.
const g = globalThis as typeof globalThis & { __phorseDb?: Promise<Db> | null };

/** Koneksi bersama untuk seluruh aplikasi (dibuat saat pertama dipakai, bukan saat build). */
export function ambilDb(): Promise<Db> {
  g.__phorseDb ??= buatDb().catch((e) => {
    g.__phorseDb = null;
    throw e;
  });
  return g.__phorseDb;
}

/** Menerapkan file db/migrations/*.sql yang belum pernah dijalankan, berurutan. */
export async function jalankanMigrasi(db: Db, folder = path.join(process.cwd(), "db", "migrations")): Promise<string[]> {
  await db.skrip("CREATE TABLE IF NOT EXISTS migrasi (nama text PRIMARY KEY, waktu timestamptz NOT NULL DEFAULT now())");
  const sudah = new Set((await db.kueri<{ nama: string }>("SELECT nama FROM migrasi")).map((r) => r.nama));
  const file = (await readdir(/*turbopackIgnore: true*/ folder)).filter((f) => f.endsWith(".sql")).sort();
  const baru: string[] = [];
  for (const nama of file) {
    if (sudah.has(nama)) continue;
    const sql = await readFile(path.join(/*turbopackIgnore: true*/ folder, nama), "utf8");
    await db.skrip("BEGIN;\n" + sql + "\nCOMMIT;").catch(async (e) => {
      await db.skrip("ROLLBACK").catch(() => {});
      throw e;
    });
    await db.kueri("INSERT INTO migrasi (nama) VALUES ($1)", [nama]);
    baru.push(nama);
  }
  return baru;
}
