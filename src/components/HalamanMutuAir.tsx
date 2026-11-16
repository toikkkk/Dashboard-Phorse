"use client";

import { useState } from "react";
import { useData } from "@/lib/data";
import { angka, BULAN } from "@/lib/format";
import { barisUkuran, satuanFakta, tahunBulanan } from "@/lib/hitung";
import type { ParameterMutu } from "@/lib/panel";
import { usePerbesar } from "@/lib/perbesar";
import { AreaTip } from "./AreaTip";
import { Kartu, Kerangka } from "./Kerangka";
import { TombolPerlebar } from "./Perlebar";
import { Tip } from "./Tip";

type Sel = { nilai: number; cek: boolean; satuan: string };
type Peta = Map<number, (Sel | null)[]>;

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

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const t = Math.floor(s.length / 2);
  return s.length % 2 ? s[t] : (s[t - 1] + s[t]) / 2;
};

/** Warna sel peta panas: makin pekat makin tinggi dibanding rentang lokasi itu sendiri (0–1). */
const warna = (t: number) => `color-mix(in srgb, var(--accent) ${Math.round(14 + t * 86)}%, white)`;

const AMBANG_LONJAKAN = 2; // kali median lokasi itu sendiri
const MIN_BULAN_LONJAKAN = 3;

/**
 * Halaman hasil pemantauan air limbah (Oil Catcher / IPAL Domestik). Nilai ditampilkan apa adanya (tanpa mengubah
 * satuan atau mengisi yang kosong): peta panas per lokasi, daftar lonjakan, dan cakupan parameter per lokasi.
 */
export function HalamanMutuAir({
  id, judul, deskripsi, parameter,
}: {
  id: string; judul: string; deskripsi: string; parameter: ParameterMutu[];
}) {
  const { data, filter, sumber, fokus, pengguna } = useData();
  const [pilih, setPilih] = useState(0);
  const [tampilan, setTampilan] = useState<"peta" | "tabel">("peta");
  const [lebar, ubahLebar] = usePerbesar();
  const tombol = (id: string, nama: string) => (
    <TombolPerlebar perlebar={{ aktif: lebar === id, onToggle: () => ubahLebar(id) }} teksAktif={`Kecilkan ${nama}`} teksNonaktif={`Perbesar ${nama}`} />
  );
  const param = parameter[pilih];
  const bulanan = tahunBulanan(data, filter.tahun);
  const tahunTahunan = data.meta.tahun.filter((t) => !tahunBulanan(data, t));
  const kolom = bulanan ? BULAN : tahunTahunan.map(String);
  const milik = pengguna.lokasiId ? data.lokasi.findIndex((l) => l.id === pengguna.lokasiId) : -1;

  // Nilai per lokasi × kolom untuk satu parameter, tanpa mengubah atau menggabungkan satuan.
  const kumpul = (p: ParameterMutu): Peta => {
    const peta: Peta = new Map();
    for (const f of barisUkuran(data, p.ukuran)) {
      const k = bulanan ? (f[1] === filter.tahun && f[2] > 0 ? f[2] - 1 : -1) : f[2] === 0 ? tahunTahunan.indexOf(f[1]) : -1;
      if (k < 0) continue;
      if (!peta.has(f[0])) peta.set(f[0], new Array<Sel | null>(kolom.length).fill(null));
      peta.get(f[0])![k] = { nilai: f[4], cek: f[6] === 1, satuan: satuanFakta(data, f) };
    }
    return peta;
  };
  const sel = kumpul(param);
  const adaData = data.lokasi.map((l, i) => ({ l, i })).filter(({ i }) => sel.has(i));
  const adaPilihan = filter.lokasi !== null;
  const satuanLokasi = (i: number) => [...new Set(sel.get(i)!.filter((s) => s).map((s) => s!.satuan))];

  // Rentang tiap lokasi (per satuan) untuk menormalkan warna peta panas.
  const rentang = (i: number) => {
    const r = new Map<string, { min: number; maks: number }>();
    for (const s of sel.get(i)!) {
      if (!s) continue;
      const a = r.get(s.satuan);
      r.set(s.satuan, { min: Math.min(a?.min ?? s.nilai, s.nilai), maks: Math.max(a?.maks ?? s.nilai, s.nilai) });
    }
    return r;
  };

  // Lonjakan: nilai yang >= 2x median bulan-bulan lokasi itu sendiri (minimal 3 nilai positif dalam satuan yang sama).
  const lonjakan: { i: number; k: number; nilai: number; median: number; rasio: number; satuan: string; cek: boolean }[] = [];
  for (const { i } of adaData) {
    for (const sat of satuanLokasi(i)) {
      const baris = sel.get(i)!;
      const positif = baris.filter((s) => s && s.satuan === sat && s.nilai > 0).map((s) => s!.nilai);
      if (positif.length < MIN_BULAN_LONJAKAN) continue;
      const m = median(positif);
      baris.forEach((s, k) => {
        if (s && s.satuan === sat && m > 0 && s.nilai >= AMBANG_LONJAKAN * m) {
          lonjakan.push({ i, k, nilai: s.nilai, median: m, rasio: s.nilai / m, satuan: sat, cek: s.cek });
        }
      });
    }
  }
  lonjakan.sort((a, b) => b.rasio - a.rasio);

  // Cakupan: berapa kolom (bulan/tahun) terisi untuk tiap lokasi × parameter.
  const akhir = data.meta.bulanTerakhir[String(filter.tahun)] ?? 12;
  const totalKolom = bulanan ? akhir : tahunTahunan.length;
  const cakupan = parameter.map((p) => ({ p, peta: p === param ? sel : kumpul(p) }));
  const jumlahTerisi = (peta: Peta, i: number) => (peta.get(i) ?? []).filter((s) => s).length;
  const lokasiMelapor = (peta: Peta) => data.lokasi.filter((_, i) => jumlahTerisi(peta, i) > 0).length;

  const ketPeriode = bulanan ? `Per bulan, ${filter.tahun}` : `Per tahun, ${tahunTahunan[0]}–${tahunTahunan.at(-1)}`;

  return (
    <Kerangka judul={judul} deskripsi={deskripsi}>
      <div className={`grid grid-cols-1 items-start gap-4 ${lebar ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_21rem]"}`}>
        <Kartu vtn="peta" className={`flex min-w-0 flex-col gap-4 ${lebar === "peta" ? "xl:order-first" : ""}`} sumber={sumber === id} urut={3}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-ink">
                {tampilan === "peta" ? "Peta panas per lokasi" : "Hasil pemantauan per lokasi"} — {param.label}
              </h2>
              <p className="mt-0.5 text-xs text-ink-2">
                {ketPeriode} · nilai dan satuan sesuai isian di Excel (mg/L = konsentrasi, ton = beban pencemaran)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
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
              <div role="group" aria-label="Tampilan" className="flex gap-1 rounded-2xl bg-card-2 p-1">
                {(["peta", "tabel"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={tampilan === t}
                    onClick={() => setTampilan(t)}
                    className={`fokus-cincin rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      tampilan === t ? "bg-card text-accent shadow-sm" : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    {t === "peta" ? "Peta panas" : "Tabel"}
                  </button>
                ))}
              </div>
              {tombol("peta", "peta panas")}
            </div>
          </div>

          {adaData.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-2">Belum ada data untuk pilihan ini.</p>
          ) : tampilan === "peta" ? (
            <div className="overflow-x-auto pb-1">
              <AreaTip className="min-w-[42rem]">
                <div className="grid items-end gap-x-1 gap-y-1" style={{ gridTemplateColumns: `6.5rem 3.2rem repeat(${kolom.length}, minmax(1.4rem, 1fr)) 8.5rem` }}>
                  <span />
                  <span />
                  {kolom.map((k, i) => {
                    const terpilih = bulanan && filter.bulan === i + 1;
                    return (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={terpilih}
                        onClick={() => bulanan && fokus({ bulan: terpilih ? 0 : i + 1 }, id)}
                        className={`fokus-cincin rounded-md py-1 text-center text-[11px] font-semibold ${terpilih ? "bg-accent-soft text-accent" : "text-ink-2"} ${bulanan ? "hover:text-accent" : ""}`}
                      >
                        {k}
                      </button>
                    );
                  })}
                  <span className="pl-2 text-[11px] font-semibold text-ink-2">Rentang</span>

                  {adaData.map(({ l, i }) => {
                    const terpilih = filter.lokasi === i;
                    const r = rentang(i);
                    const sat = satuanLokasi(i);
                    return (
                      <div key={l.id} className={`contents ${adaPilihan && !terpilih ? "opacity-50" : ""}`}>
                        <button
                          type="button"
                          aria-pressed={terpilih}
                          onClick={() => fokus({ lokasi: terpilih ? null : i }, id)}
                          className={`fokus-cincin truncate rounded-lg px-1.5 py-1 text-left text-xs ${terpilih ? "font-bold text-accent" : i === milik ? "font-bold text-ink" : "font-medium text-ink"} hover:bg-accent-soft`}
                        >
                          {l.singkat}
                        </button>
                        <span className="text-[11px] text-ink-2">{sat.join("/")}</span>
                        {sel.get(i)!.map((s, k) => {
                          if (!s) {
                            return (
                              <span
                                key={k}
                                tabIndex={0}
                                data-tip={`${l.singkat} · ${kolom[k]}${bulanan ? ` ${filter.tahun}` : ""}\nBelum diisi (kosong, bukan nol)`}
                                className={`fokus-cincin rounded-md border border-dashed border-line bg-card-2 ${lebar === "peta" ? "h-12" : "h-8"}`}
                              />
                            );
                          }
                          const rr = r.get(s.satuan)!;
                          const t = rr.maks === rr.min ? 0.25 : (s.nilai - rr.min) / (rr.maks - rr.min);
                          const teks = `${l.singkat} · ${kolom[k]}${bulanan ? ` ${filter.tahun}` : ""}: ${angka(s.nilai)} ${s.satuan}${s.cek ? " (perlu dicek)" : ""}`;
                          const positif = sel.get(i)!.filter((x) => x && x.satuan === s.satuan && x.nilai > 0).map((x) => x!.nilai);
                          const med = positif.length >= MIN_BULAN_LONJAKAN ? median(positif) : null;
                          const tip = [
                            `${l.singkat} · ${kolom[k]}${bulanan ? ` ${filter.tahun}` : ""}`,
                            `${param.label}: ${angka(s.nilai)} ${s.satuan}`,
                            rr.maks === rr.min
                              ? "Nilai sama di semua bulan terisi"
                              : `Posisi di rentang lokasi ini: ${Math.round(t * 100)}% (${angka(rr.min)}–${angka(rr.maks)})`,
                            ...(med && s.nilai > 0 ? [`${angka(Math.round((s.nilai / med) * 10) / 10)}× median lokasi ini`] : []),
                            ...(s.cek ? ["Perlu dicek: jauh di atas pola lokasi ini"] : []),
                            "Klik untuk memfokuskan dashboard",
                          ].join("\n");
                          return (
                            <button
                              key={k}
                              type="button"
                              data-tip={tip}
                              aria-label={teks}
                              onClick={() => fokus(bulanan ? { lokasi: i, bulan: k + 1 } : { lokasi: i }, id)}
                              className={`fokus-cincin relative rounded-md transition-transform hover:scale-110 ${lebar === "peta" ? "h-12" : "h-8"} ${bulanan && filter.bulan === k + 1 ? "ring-2 ring-accent ring-offset-1" : ""}`}
                              style={{ background: warna(t) }}
                            >
                              {lebar === "peta" && (
                                <span className={`block truncate px-0.5 text-[10px] font-semibold tabular-nums ${t > 0.55 ? "text-white" : "text-ink"}`}>{angka(s.nilai)}</span>
                              )}
                              {s.cek && <span aria-hidden className="absolute right-0.5 top-0.5 size-1.5 rounded-full" style={{ background: "var(--peringatan)" }} />}
                            </button>
                          );
                        })}
                        <span className="pl-2 text-[11px] tabular-nums text-ink-2">
                          {sat.length === 1 ? (r.get(sat[0])!.min === r.get(sat[0])!.maks ? `tetap ${angka(r.get(sat[0])!.min)}` : `${angka(r.get(sat[0])!.min)}–${angka(r.get(sat[0])!.maks)}`) : "beragam"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </AreaTip>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-2" aria-hidden>
                <span className="flex items-center gap-1.5">
                  rendah
                  {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                    <span key={v} className="size-3.5 rounded-sm" style={{ background: warna(v) }} />
                  ))}
                  tinggi (dibanding rentang lokasi itu sendiri)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3.5 rounded-sm border border-dashed border-line bg-card-2" /> belum diisi
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: "var(--peringatan)" }} /> perlu dicek
                </span>
              </div>
            </div>
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
                        className={`border-t border-line transition-all hover:bg-accent-soft ${terpilih ? "bg-accent-soft" : ""} ${adaPilihan && !terpilih ? "opacity-50 hover:opacity-100" : ""}`}
                      >
                        <th className="whitespace-nowrap px-1 py-1 text-left font-normal">
                          <Tip teks={terpilih ? "Klik untuk melepas fokus lokasi" : "Fokuskan dashboard ke lokasi ini"} sisi="atas">
                            <button
                              type="button"
                              aria-pressed={terpilih}
                              onClick={() => fokus({ lokasi: terpilih ? null : i }, id)}
                              className={`fokus-cincin rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent-kuat ${terpilih ? "font-bold text-accent" : "font-medium text-ink"}`}
                            >
                              {l.singkat}
                            </button>
                          </Tip>
                        </th>
                        <td className="px-2 py-1.5 text-left text-ink-2">{satuanLokasi(i).join(" / ")}</td>
                        {baris.map((s, k) => (
                          <td key={kolom[k]} className={`px-3 py-1.5 text-ink ${bulanan && filter.bulan === k + 1 ? "bg-accent-soft font-semibold" : ""}`}>
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
        </Kartu>

        <Kartu vtn="lonjakan" className={`flex flex-col gap-3 ${lebar === "lonjakan" ? "xl:order-first" : ""}`} urut={4}>
          <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-ink">Lonjakan {param.label}</h2>
            <p className="mt-0.5 text-xs text-ink-2">
              Nilai yang sedikitnya {AMBANG_LONJAKAN}× median bulan-bulan lokasi itu sendiri (butuh minimal {MIN_BULAN_LONJAKAN} nilai).
              Bukan penilaian baik/buruk; baku mutu belum ada.
            </p>
          </div>
          {tombol("lonjakan", "daftar lonjakan")}
          </div>
          {lonjakan.length === 0 ? (
            <p className="rounded-xl bg-card-2 px-3.5 py-3 text-sm text-ink-2">Tidak ada lonjakan pada pilihan ini.</p>
          ) : (
            <ol className={`gap-1 ${lebar === "lonjakan" ? "grid grid-cols-1 md:grid-cols-2" : "flex flex-col"}`}>
              {lonjakan.slice(0, lebar === "lonjakan" ? 40 : 8).map((x) => (
                <li key={`${x.i}-${x.k}`}>
                  <button
                    type="button"
                    onClick={() => fokus(bulanan ? { lokasi: x.i, bulan: x.k + 1 } : { lokasi: x.i }, id)}
                    className="fokus-cincin flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-accent-soft"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {data.lokasi[x.i].singkat} · {kolom[x.k]}
                        {x.cek && <span className="ml-1.5 inline-block size-1.5 rounded-full align-middle" style={{ background: "var(--peringatan)" }} title="perlu dicek" />}
                      </span>
                      <span className="block truncate text-[11px] text-ink-2">
                        {angka(x.nilai)} {x.satuan} · median {angka(x.median)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[var(--buruk)]/10 px-2 py-0.5 text-xs font-bold tabular-nums text-ink">
                      {x.rasio >= 100 ? Math.round(x.rasio) : angka(Math.round(x.rasio * 10) / 10)}×
                    </span>
                  </button>
                </li>
              ))}
              {lonjakan.length > (lebar === "lonjakan" ? 40 : 8) && <li className="px-2.5 pt-1 text-[11px] text-muted">dan {lonjakan.length - (lebar === "lonjakan" ? 40 : 8)} lonjakan lain</li>}
            </ol>
          )}
        </Kartu>
      </div>

      <Kartu vtn="cakupan-mutu" className="flex flex-col gap-4" urut={5}>
        <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Cakupan parameter per lokasi</h2>
          <p className="mt-0.5 text-xs text-ink-2">
            Siapa sudah melapor parameter apa · {bulanan ? `Jan–${BULAN[akhir - 1]} ${filter.tahun}` : `${tahunTahunan[0]}–${tahunTahunan.at(-1)}`}. Warna lebih pekat = lebih banyak {bulanan ? "bulan" : "tahun"} terisi.
            {" "}
            {cakupan.map(({ p, peta }) => `${p.label}: ${lokasiMelapor(peta)}/${data.lokasi.length}`).join(" · ")} lokasi.
          </p>
        </div>
        {tombol("cakupan-mutu", "matriks cakupan")}
        </div>
        <AreaTip className="overflow-x-auto pb-1">
          <table className="w-full min-w-[56rem] border-separate border-spacing-[3px] text-left">
            <thead>
              <tr>
                <th className="w-32" />
                {data.lokasi.map((l, i) => (
                  <th key={l.id} className="h-24 align-bottom">
                    <span className={`block rotate-180 whitespace-nowrap text-[11px] font-semibold [writing-mode:vertical-rl] ${filter.lokasi === i ? "text-accent" : i === milik ? "text-ink" : "text-ink-2"}`}>
                      {l.singkat}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cakupan.map(({ p, peta }) => (
                <tr key={p.label}>
                  <th scope="row" className="pr-2 text-xs font-semibold text-ink">
                    {p.label}
                  </th>
                  {data.lokasi.map((l, i) => {
                    const n = jumlahTerisi(peta, i);
                    const v = totalKolom ? n / totalKolom : 0;
                    const dim = filter.lokasi !== null && filter.lokasi !== i;
                    const teks = `${l.singkat} · ${p.label}: ${n === 0 ? "belum melapor" : `${n} dari ${totalKolom} ${bulanan ? "bulan" : "tahun"}`}`;
                    const kosong = (peta.get(i) ?? []).map((x, k) => (x ? null : kolom[k])).filter((x): x is string => x !== null).slice(0, totalKolom);
                    const tip = [
                      `${l.singkat} · ${p.label}`,
                      n === 0 ? "Belum melapor sama sekali" : `Terisi ${n} dari ${totalKolom} ${bulanan ? "bulan" : "tahun"}`,
                      ...(n > 0 && kosong.length ? [`Belum: ${kosong.join(", ")}`] : []),
                      "Klik untuk memfokuskan dashboard",
                    ].join("\n");
                    return (
                      <td key={l.id} className="p-0">
                        <button
                          type="button"
                          data-tip={tip}
                          aria-label={teks}
                          onClick={() => fokus({ lokasi: filter.lokasi === i ? null : i }, id)}
                          className={`fokus-cincin block w-full rounded-lg border text-[11px] font-bold transition-all duration-200 hover:scale-110 ${lebar === "cakupan-mutu" ? "h-12" : "h-8"} ${filter.lokasi === i ? "ring-2 ring-accent ring-offset-1" : ""} ${n === 0 ? "border-dashed border-line" : "border-transparent"} ${v > 0.55 ? "text-white" : "text-ink"}`}
                          style={{ background: n === 0 ? "var(--card-2)" : warna(v), opacity: dim ? 0.35 : 1 }}
                        >
                          {lebar === "cakupan-mutu" && n > 0 ? n : null}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </AreaTip>
      </Kartu>
    </Kerangka>
  );
}
