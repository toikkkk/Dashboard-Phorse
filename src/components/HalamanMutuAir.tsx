"use client";

import { useState } from "react";
import { useData } from "@/lib/data";
import { angka, BULAN } from "@/lib/format";
import { barisUkuran, satuanFakta, tahunBulanan } from "@/lib/hitung";
import type { ParameterMutu } from "@/lib/panel";
import { Kartu, Kerangka } from "./Kerangka";
import { Tip } from "./Tip";

type Sel = { nilai: number; cek: boolean };

function Sparkline({ nilai }: { nilai: (number | null)[] }) {
  const titik = nilai.map((v, i) => (v == null ? null : { x: i, v })).filter((t) => t !== null);
  if (titik.length < 2) return null;
  const min = Math.min(...titik.map((t) => t.v));
  const maks = Math.max(...titik.map((t) => t.v));
  const y = (v: number) => (maks === min ? 12 : 21 - ((v - min) / (maks - min)) * 18);
  const x = (i: number) => 3 + (i / (nilai.length - 1)) * 90;
  return (
    <svg width="96" height="24" viewBox="0 0 96 24" role="img" aria-label="Tren nilai sepanjang tahun">
      <polyline
        points={titik.map((t) => `${x(t.x)},${y(t.v)}`).join(" ")}
        fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
      />
    </svg>
  );
}

/** Halaman hasil pemantauan air limbah (Oil Catcher / IPAL Domestik): nilai per lokasi apa adanya. */
export function HalamanMutuAir({
  id, judul, deskripsi, parameter,
}: {
  id: string; judul: string; deskripsi: string; parameter: ParameterMutu[];
}) {
  const { data, filter, sumber, fokus } = useData();
  const [pilih, setPilih] = useState(0);
  const param = parameter[pilih];
  const bulanan = tahunBulanan(data, filter.tahun);
  const tahunTahunan = data.meta.tahun.filter((t) => !tahunBulanan(data, t));
  const kolom = bulanan ? BULAN : tahunTahunan.map(String);

  // Kumpulkan nilai per lokasi × kolom, tanpa mengubah atau menggabungkan satuan.
  const sel = new Map<number, (Sel | null)[]>();
  const satuan = new Map<number, Set<string>>();
  for (const f of barisUkuran(data, param.ukuran)) {
    const k = bulanan ? (f[1] === filter.tahun && f[2] > 0 ? f[2] - 1 : -1) : f[2] === 0 ? tahunTahunan.indexOf(f[1]) : -1;
    if (k < 0) continue;
    if (!sel.has(f[0])) {
      sel.set(f[0], new Array<Sel | null>(kolom.length).fill(null));
      satuan.set(f[0], new Set());
    }
    sel.get(f[0])![k] = { nilai: f[4], cek: f[6] === 1 };
    satuan.get(f[0])!.add(satuanFakta(data, f));
  }
  const semua = data.lokasi.map((l, i) => ({ l, i }));
  const adaData = semua.filter(({ i }) => sel.has(i));
  const tanpaData = semua.filter(({ i }) => !sel.has(i));
  const adaPilihan = filter.lokasi !== null;

  return (
    <Kerangka judul={judul} deskripsi={deskripsi}>
      <Kartu className="flex flex-col gap-4" sumber={sumber === id} urut={3}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">Hasil pemantauan per lokasi — {param.label}</h2>
            <p className="mt-0.5 text-xs text-ink-2">
              {bulanan ? `Per bulan, ${filter.tahun}` : `Per tahun, ${tahunTahunan[0]}–${tahunTahunan.at(-1)}`} · nilai dan
              satuan sesuai isian di Excel (mg/L = konsentrasi, ton = beban pencemaran)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div role="group" aria-label="Parameter" className="flex flex-wrap gap-1 rounded-2xl bg-card-2 p-1">
              {parameter.map((p, i) => (
                <button
                  key={p.label}
                  type="button"
                  aria-pressed={i === pilih}
                  onClick={() => setPilih(i)}
                  className={`fokus-cincin rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    i === pilih ? "bg-accent text-on-accent shadow-md" : "text-ink-2 hover:bg-accent-soft hover:text-ink"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {adaData.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-2">Belum ada data untuk pilihan ini.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-right text-xs tabular-nums">
              <thead className="bg-card-2 text-ink-2">
                <tr>
                  <th className="px-3 py-2.5 text-left font-semibold">Lokasi</th>
                  <th className="px-2 py-2.5 text-left font-semibold">Satuan</th>
                  {kolom.map((k, i) => {
                    const terpilih = bulanan && filter.bulan === i + 1;
                    return (
                      <th key={k} className={`px-1 py-1 font-semibold ${terpilih ? "bg-accent-soft" : ""}`}>
                        {bulanan ? (
                          <Tip teks={terpilih ? "Klik untuk melepas fokus bulan" : `Fokuskan dashboard ke ${k} ${filter.tahun}`} sisi="bawah">
                            <button
                              type="button"
                              aria-pressed={terpilih}
                              onClick={() => fokus({ bulan: terpilih ? 0 : i + 1 }, id)}
                              className={`fokus-cincin rounded-lg px-2 py-1.5 transition-colors hover:bg-accent-kuat ${terpilih ? "text-accent" : ""}`}
                            >
                              {k}
                            </button>
                          </Tip>
                        ) : (
                          <span className="px-2">{k}</span>
                        )}
                      </th>
                    );
                  })}
                  {bulanan && <th className="px-2 py-2.5 text-left font-semibold">Tren</th>}
                </tr>
              </thead>
              <tbody>
                {adaData.map(({ l, i }) => {
                  const baris = sel.get(i)!;
                  const terpilih = filter.lokasi === i;
                  return (
                    <tr
                      key={l.id}
                      className={`border-t border-line transition-all hover:bg-accent-soft ${terpilih ? "bg-accent-soft" : ""} ${
                        adaPilihan && !terpilih ? "opacity-50 hover:opacity-100" : ""
                      }`}
                    >
                      <th className="whitespace-nowrap px-1 py-1 text-left font-normal">
                        <Tip teks={terpilih ? "Klik untuk melepas fokus lokasi" : "Fokuskan dashboard ke lokasi ini"} sisi="atas">
                          <button
                            type="button"
                            aria-pressed={terpilih}
                            onClick={() => fokus({ lokasi: terpilih ? null : i }, id)}
                            className={`fokus-cincin rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent-kuat ${
                              terpilih ? "font-bold text-accent" : "font-medium text-ink"
                            }`}
                          >
                            {l.singkat}
                          </button>
                        </Tip>
                      </th>
                      <td className="px-2 py-1.5 text-left text-ink-2">{[...satuan.get(i)!].join(" / ")}</td>
                      {baris.map((s, k) => (
                        <td
                          key={kolom[k]}
                          className={`px-3 py-1.5 text-ink ${bulanan && filter.bulan === k + 1 ? "bg-accent-soft font-semibold" : ""}`}
                        >
                          {s ? angka(s.nilai) : <span className="text-muted">—</span>}
                          {s?.cek && (
                            <span
                              className="ml-1 inline-block size-1.5 rounded-full align-middle"
                              style={{ background: "var(--peringatan)" }}
                              role="img"
                              aria-label="perlu dicek"
                              title="Jauh di atas pola lokasi ini. Ditampilkan apa adanya."
                            />
                          )}
                        </td>
                      ))}
                      {bulanan && (
                        <td className="px-2 py-1">
                          <Sparkline nilai={baris.map((s) => s?.nilai ?? null)} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {tanpaData.length > 0 && adaData.length > 0 && (
          <p className="text-xs text-ink-2">
            Belum ada data {param.label} untuk: {tanpaData.map(({ l }) => l.singkat).join(", ")}.
          </p>
        )}
        <p className="rounded-2xl bg-card-2 px-4 py-3 text-xs leading-relaxed text-ink-2">
          <strong className="text-ink">Cara membaca:</strong> klik nama lokasi atau nama bulan untuk memfokuskan dashboard.
          Baku mutu belum tersedia di data sumber, sehingga status memenuhi atau tidak memenuhi baku mutu belum ditampilkan.
          Debit air limbah ada di Data ESG, indikator Pengambilan air.
        </p>
      </Kartu>
    </Kerangka>
  );
}
