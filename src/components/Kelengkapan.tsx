"use client";

import { useState } from "react";
import { Kartu } from "@/components/Kerangka";
import { sifatPerubahan, teksPersen } from "@/components/Perubahan";
import { useData } from "@/lib/data";
import { BULAN } from "@/lib/format";
import { bandingPerLokasi, tahunBulanan } from "@/lib/hitung";
import { INDIKATOR } from "@/lib/panel";

// Lahan Hijau hanya data tahunan dan tidak diisi per bulan; tidak ikut matriks kelengkapan.
const ABAIKAN = new Set(["Lahan Hijau"]);

/** Kepala kolom lokasi (teks vertikal) yang dipakai bersama oleh kedua matriks. */
function KepalaLokasi() {
  const { data, filter, pengguna } = useData();
  const milik = pengguna.lokasiId ? data.lokasi.findIndex((l) => l.id === pengguna.lokasiId) : -1;
  return (
    <tr>
      <th className="w-32" />
      {data.lokasi.map((l, i) => (
        <th key={l.id} className="h-24 align-bottom">
          <span
            className={`block rotate-180 whitespace-nowrap text-[11px] font-semibold [writing-mode:vertical-rl] ${
              filter.lokasi === i ? "text-accent" : i === milik ? "text-ink" : "text-ink-2"
            }`}
          >
            {l.singkat}
          </span>
        </th>
      ))}
    </tr>
  );
}

/** Siapa (lokasi) sudah mengisi apa (kategori) pada periode terpilih; warna lebih pekat = lebih banyak bulan terisi. */
function MatriksKelengkapan() {
  const { data, filter, fokus } = useData();
  const kategori = data.kategori.map((nama, i) => ({ nama, i })).filter((k) => !ABAIKAN.has(k.nama));
  const bulanan = tahunBulanan(data, filter.tahun);
  const akhir = data.meta.bulanTerakhir[String(filter.tahun)] ?? 12;
  const bulanDicek = !bulanan ? [0] : filter.bulan ? [filter.bulan] : Array.from({ length: akhir }, (_, i) => i + 1);

  const terisi = data.lokasi.map(() => new Array<number>(data.kategori.length).fill(0));
  const dicek = new Set(bulanDicek);
  for (const r of data.isi) {
    if (r[1] !== filter.tahun || !dicek.has(r[2])) continue;
    terisi[r[0]][r[3]] += 1;
  }
  const total = bulanDicek.length;
  const lengkap = data.lokasi.filter((_, l) => kategori.every((k) => terisi[l][k.i] === total)).length;
  const adaIsi = data.lokasi.filter((_, l) => kategori.some((k) => terisi[l][k.i] > 0)).length;
  const ket = bulanan ? (filter.bulan ? `${BULAN[filter.bulan - 1]} ${filter.tahun}` : `Jan–${BULAN[akhir - 1]} ${filter.tahun}`) : String(filter.tahun);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p className="text-xs text-ink-2">
          {ket}: {adaIsi} dari {data.lokasi.length} lokasi sudah mengisi, {lengkap} lokasi mengisi semua kategori.
        </p>
        <div className="flex items-center gap-2 text-[11px] text-ink-2" aria-hidden>
          Belum
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <span key={v} className="size-4 rounded-md border border-line" style={{ background: v === 0 ? "var(--card-2)" : `color-mix(in srgb, var(--accent) ${Math.round(v * 100)}%, white)` }} />
          ))}
          Semua bulan
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <table className="w-full min-w-[56rem] border-separate border-spacing-[3px] text-left">
          <thead>
            <KepalaLokasi />
          </thead>
          <tbody>
            {kategori.map((k) => (
              <tr key={k.nama}>
                <th scope="row" className="pr-2 text-xs font-semibold text-ink">
                  {k.nama}
                </th>
                {data.lokasi.map((l, i) => {
                  const n = terisi[i][k.i];
                  const v = n / total;
                  const dim = filter.lokasi !== null && filter.lokasi !== i;
                  const teks = `${l.singkat} · ${k.nama}: ${n === 0 ? "belum diisi" : total === 1 ? "sudah diisi" : `${n} dari ${total} bulan`}`;
                  return (
                    <td key={l.id} className="p-0">
                      <button
                        type="button"
                        title={teks}
                        aria-label={teks}
                        onClick={() => fokus({ lokasi: filter.lokasi === i ? null : i }, "kelengkapan")}
                        className={`fokus-cincin block h-8 w-full rounded-lg border transition-all duration-200 hover:scale-110 ${filter.lokasi === i ? "ring-2 ring-accent ring-offset-1" : ""} ${n === 0 ? "border-dashed border-line" : "border-transparent"}`}
                        style={{ background: n === 0 ? "var(--card-2)" : `color-mix(in srgb, var(--accent) ${Math.round(18 + v * 82)}%, white)`, opacity: dim ? 0.35 : 1 }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Perubahan tiap lokasi dibanding periode setara tahun lalu, per indikator: peta panas untuk menemukan lokasi yang perlu dicek. */
function MatriksPerubahan() {
  const { data, filter, fokus, pilihIndikator } = useData();
  const daftar = INDIKATOR.filter((i) => i.beranda !== false);
  const hasil = daftar.map((ind) => ({ ind, ban: bandingPerLokasi(data, filter, ind) }));
  const label = hasil.map((h) => ("alasan" in h.ban ? null : h.ban.label)).find(Boolean);

  const warna = (persen: number | null, arah: "turun" | "netral") => {
    if (persen === null) return null;
    const sifat = sifatPerubahan(persen, arah);
    const kekuatan = Math.round(20 + Math.min(Math.abs(persen) / 60, 1) * 80);
    if (sifat === "netral") return `color-mix(in srgb, var(--accent) ${arah === "netral" ? Math.min(kekuatan, 55) : 10}%, white)`;
    return `color-mix(in srgb, var(${sifat === "buruk" ? "--buruk" : "--baik"}) ${kekuatan}%, white)`;
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p className="text-xs text-ink-2">{label ? `Dibanding ${label}. Kotak kosong = lokasi belum melapor di kedua periode.` : "Belum ada pembanding pada pilihan ini."}</p>
        <div className="flex items-center gap-3 text-[11px] text-ink-2" aria-hidden>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-sm" style={{ background: "color-mix(in srgb, var(--baik) 70%, white)" }} /> turun / membaik
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-sm" style={{ background: "color-mix(in srgb, var(--buruk) 70%, white)" }} /> naik / kurang baik
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3.5 rounded-sm" style={{ background: "color-mix(in srgb, var(--accent) 35%, white)" }} /> konteks aktivitas
          </span>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <table className="w-full min-w-[56rem] border-separate border-spacing-[3px] text-left">
          <thead>
            <KepalaLokasi />
          </thead>
          <tbody>
            {hasil.map(({ ind, ban }) => (
              <tr key={ind.id}>
                <th scope="row" className="pr-2 text-xs font-semibold text-ink">
                  <button type="button" onClick={() => pilihIndikator(ind.id)} className="fokus-cincin text-left hover:text-accent">
                    {ind.singkat}
                  </button>
                </th>
                {data.lokasi.map((l, i) => {
                  const persen = "alasan" in ban ? null : ban.persen[i];
                  const bg = warna(persen, ind.arah);
                  const dim = filter.lokasi !== null && filter.lokasi !== i;
                  const teks = `${l.singkat} · ${ind.singkat}: ${persen === null ? "tidak ada pembanding" : teksPersen(persen)}`;
                  return (
                    <td key={l.id} className="p-0">
                      <button
                        type="button"
                        title={teks}
                        aria-label={teks}
                        onClick={() => fokus({ lokasi: filter.lokasi === i ? null : i }, "perubahan")}
                        className={`fokus-cincin block h-8 w-full rounded-lg border transition-all duration-200 hover:scale-110 ${filter.lokasi === i ? "ring-2 ring-accent ring-offset-1" : ""} ${bg ? "border-transparent" : "border-dashed border-line"}`}
                        style={{ background: bg ?? "var(--card-2)", opacity: dim ? 0.35 : 1 }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const TAB = [
  { id: "kelengkapan", label: "Kelengkapan pelaporan", sub: "siapa sudah mengisi apa" },
  { id: "perubahan", label: "Perubahan per lokasi", sub: "siapa naik atau turun" },
] as const;

/** Dua matriks lokasi × kategori/indikator dalam satu kartu bertab. */
export function Kelengkapan({ urut = 0 }: { urut?: number }) {
  const { sumber } = useData();
  const [tab, setTab] = useState<(typeof TAB)[number]["id"]>("kelengkapan");
  return (
    <Kartu urut={urut} sumber={sumber === "kelengkapan" || sumber === "perubahan"} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-ink">Matriks lokasi</h2>
        <div role="tablist" aria-label="Jenis matriks" className="flex gap-1 rounded-xl bg-card-2 p-1">
          {TAB.map((t) => (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              title={t.sub}
              className={`fokus-cincin rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${tab === t.id ? "bg-card text-accent shadow-sm" : "text-ink-2 hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      {tab === "kelengkapan" ? <MatriksKelengkapan /> : <MatriksPerubahan />}
    </Kartu>
  );
}
