// Mengisi database dengan data lingkungan dari data-seed/seed.json.
//   npx tsx scripts/seed.mts                # database kosong
//   npx tsx scripts/seed.mts --reset-data   # timpa data lingkungan (akun tidak disentuh)
// DATABASE_URL (Neon) dibaca dari environment; tanpa itu dipakai database lokal di .data/pglite.

import { readFileSync } from "node:fs";
import { buatDb } from "../src/server/db";
import { isiDatabase, type Seed } from "../src/server/seed";

const arg = process.argv.slice(2);
const berkas = arg.includes("--seed") ? arg[arg.indexOf("--seed") + 1] : "data-seed/seed.json";
const seed = JSON.parse(readFileSync(berkas, "utf8")) as Seed;

const db = await buatDb();
console.log(`Database: ${db.jenis}${db.jenis === "neon" ? " (DATABASE_URL)" : " (lokal, .data/pglite)"}`);
await isiDatabase(db, seed, { reset: arg.includes("--reset-data") });
const [h] = await db.kueri<{ fakta: number; terisi: number; metrik: number; input: number }>(
  "SELECT (SELECT count(*) FROM fakta)::int AS fakta, (SELECT count(*) FROM terisi)::int AS terisi, (SELECT count(*) FROM metrik)::int AS metrik, (SELECT count(*) FROM metrik WHERE bisa_input)::int AS input",
);
console.log(`Selesai: ${h.fakta.toLocaleString("id-ID")} nilai, ${h.terisi} periode terisi, ${h.metrik} metrik (${h.input} kolom isian).`);
await db.tutup();
