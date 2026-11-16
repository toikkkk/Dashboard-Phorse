"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Kartu } from "@/components/Kerangka";
import { TombolPerlebar } from "@/components/Perlebar";
import { useKurangiGerak } from "@/lib/animasi";
import { useData } from "@/lib/data";
import { angka, BULAN, ringkas } from "@/lib/format";
import { barisUkuran, bulanTerakhirKategori, tahunBulanan } from "@/lib/hitung";
import { INDIKATOR } from "@/lib/panel";
import { useSedangTransisi } from "@/lib/transisiStatus";

const DAFTAR = ["penyaluran", "emisi", "listrik", "sampah", "b3", "air"];
const WARNA = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)", "var(--series-7)"];
const AMBANG_LONJAKAN = 1.5; // kali median total bulanan
const MAKS_GARIS = 7;

const satuanTampil = (s: string) => (s === "m3" ? "m³" : s);
const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const t = Math.floor(s.length / 2);
  return s.length % 2 ? s[t] : (s[t - 1] + s[t]) / 2;
};

type Baris = { label: string; total: number | null; n: number } & Record<string, number | string | null>;

/**
 * Garis per bulan untuk satu indikator, dua cara baca:
 * - Total: kapan lonjakan terjadi (bulan yang ≥ 1,5× median ditandai merah).
 * - Bandingkan lokasi: garis lokasi terbesar (dan lokasi Anda / yang dipilih) pada sumbu yang sama.
 * Bulan yang belum diisi dibiarkan terputus, bukan nol. Klik titik → memfokuskan dashboard ke bulan itu.
 */
export function TrenLokasi({ urut = 0, lebar, onLebar, kelas = "" }: { urut?: number; lebar?: boolean; onLebar?: () => void; kelas?: string }) {
  const { data, filter, fokus, pengguna, sumber } = useData();
  const kurangiGerak = useKurangiGerak();
  const lagiTransisi = useSedangTransisi();
  const [idInd, setIdInd] = useState(DAFTAR[0]);
  const [mode, setMode] = useState<"total" | "lokasi">("total");
  const [sembunyi, setSembunyi] = useState<number[]>([]);

  const daftar = INDIKATOR.filter((i) => DAFTAR.includes(i.id));
  const ind = daftar.find((i) => i.id === idInd) ?? daftar[0];
  const bulanan = tahunBulanan(data, filter.tahun);
  const label = bulanan ? BULAN : data.meta.tahun.map((t) => ((data.meta.bulanTerakhir[String(t)] ?? 12) < 12 ? `${t}*` : String(t)));
  const milik = pengguna.lokasiId ? data.lokasi.findIndex((l) => l.id === pengguna.lokasiId) : -1;
  const satuan = satuanTampil(ind.ukuran.satuan);

  // nilai[lokasi][kolom]; null = belum ada isian (bukan nol)
  const nilai: (number | null)[][] = data.lokasi.map(() => new Array<number | null>(label.length).fill(null));
  for (const f of barisUkuran(data, ind.ukuran)) {
    const k = bulanan ? (f[1] === filter.tahun && f[2] > 0 ? f[2] - 1 : -1) : data.meta.tahun.indexOf(f[1]);
    if (k < 0) continue;
    nilai[f[0]][k] = (nilai[f[0]][k] ?? 0) + f[4];
  }
  // Bulan setelah isian terakhir kategori ini tidak dianggap (kategori bisa berhenti lebih awal dari tahunnya).
  if (bulanan) {
    const akhir = Math.min(data.meta.bulanTerakhir[String(filter.tahun)] ?? 12, bulanTerakhirKategori(data, filter.tahun, ind.kategori));
    for (const baris of nilai) for (let k = akhir; k < baris.length; k++) baris[k] = null;
  }

  const total = label.map((_, k) => {
    const v = nilai.map((b) => b[k]).filter((x): x is number => x !== null);
    return { jumlah: v.length ? v.reduce((a, b) => a + b, 0) : null, n: v.length };
  });
  const totalAda = total.flatMap((t, k) => (t.jumlah !== null && t.jumlah > 0 ? [{ k, v: t.jumlah }] : []));
  const med = totalAda.length >= 4 ? median(totalAda.map((t) => t.v)) : null;
  const lonjakan = med ? totalAda.filter((t) => t.v >= AMBANG_LONJAKAN * med).map((t) => ({ ...t, rasio: t.v / med })) : [];

  // Lokasi yang digambar pada mode bandingkan: 5 terbesar + lokasi Anda + lokasi yang dipilih.
  const jumlahLokasi = nilai.map((b) => b.reduce<number>((a, v) => a + (v ?? 0), 0));
  const urutan = jumlahLokasi.map((v, i) => ({ v, i })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v).map((x) => x.i);
  const dipilih = [...new Set([...(milik >= 0 && jumlahLokasi[milik] > 0 ? [milik] : []), ...(filter.lokasi !== null ? [filter.lokasi] : []), ...urutan.slice(0, 5)])].slice(0, MAKS_GARIS);
  const tampilLokasi = dipilih.filter((i) => !sembunyi.includes(i));
  const warnaLokasi = (i: number) => WARNA[dipilih.indexOf(i) % WARNA.length];

  const baris: Baris[] = label.map((l, k) => {
    const b: Baris = { label: l, total: total[k].jumlah, n: total[k].n };
    for (const i of dipilih) b[`l${i}`] = nilai[i][k];
    if (filter.lokasi !== null) b.pilihan = nilai[filter.lokasi][k];
    return b;
  });
  const kosong = totalAda.length === 0;
  const animasi = !kurangiGerak && !lagiTransisi;

  const klik = (s: { activeTooltipIndex?: number | string | null } | undefined) => {
    const k = Number(s?.activeTooltipIndex);
    if (bulanan && Number.isInteger(k) && k >= 0 && k < 12 && baris[k] && baris[k].total !== null) fokus({ bulan: filter.bulan === k + 1 ? 0 : k + 1 }, "tren");
  };

  return (
    <Kartu urut={urut} vtn="tren" sumber={sumber === "tren"} className={`flex min-w-0 flex-col gap-2.5 ${kelas}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="text-base font-bold text-ink">Tren bulanan</h2>
          <p className="mt-0.5 text-xs text-ink-2">
            {mode === "total" ? "Kapan lonjakan terjadi (semua lokasi)" : "Bandingkan lokasi"} · {satuan}
          </p>
        </div>
        <div className="flex items-center gap-2">
        <div role="group" aria-label="Mode grafik" className="flex gap-1 rounded-xl bg-card-2 p-1">
          {(["total", "lokasi"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`fokus-cincin rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${mode === m ? "bg-card text-accent shadow-sm" : "text-ink-2 hover:text-ink"}`}
            >
              {m === "total" ? "Lonjakan" : "Bandingkan lokasi"}
            </button>
          ))}
        </div>
        {onLebar && (
          <TombolPerlebar perlebar={{ aktif: !!lebar, onToggle: onLebar }} teksAktif="Kecilkan grafik tren" teksNonaktif="Perbesar grafik tren" />
        )}
        </div>
      </div>

      <div role="group" aria-label="Indikator" className="flex flex-wrap gap-1">
        {daftar.map((i) => (
          <button
            key={i.id}
            type="button"
            aria-pressed={i.id === ind.id}
            onClick={() => setIdInd(i.id)}
            className={`fokus-cincin rounded-lg px-2 py-0.5 text-xs font-semibold transition-all ${i.id === ind.id ? "bg-accent text-on-accent shadow-sm" : "bg-card-2 text-ink-2 hover:bg-accent-soft hover:text-accent"}`}
          >
            {i.singkat}
          </button>
        ))}
      </div>

      {kosong ? (
        <p className={`flex items-center justify-center text-sm text-ink-2 ${lebar ? "h-80" : "h-44"}`}>Belum ada data {ind.singkat} pada {bulanan ? filter.tahun : "tahun-tahun ini"}.</p>
      ) : (
        <div className={`w-full cursor-pointer ${lebar ? "h-80" : "h-44"}`} role="img" aria-label={`Grafik garis ${ind.label} per ${bulanan ? "bulan" : "tahun"}. Klik titik untuk memfokuskan bulan.`}>
          <ResponsiveContainer width="100%" height="100%" debounce={150}>
            <LineChart data={baris} margin={{ top: 8, right: 18, bottom: 0, left: 0 }} onClick={klik}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--axis)" }} tick={{ fontSize: 11, fill: "var(--ink-2)" }} interval={0} />
              <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: "var(--ink-2)" }} tickFormatter={(v: number) => ringkas(v)} />
              <Tooltip
                cursor={{ stroke: "var(--accent)", strokeOpacity: 0.25, strokeWidth: 18 }}
                content={({ active, payload, label: lb }) => {
                  if (!active || !payload?.length) return null;
                  const ada = payload.filter((p) => typeof p.value === "number");
                  const n = (payload[0]?.payload as Baris | undefined)?.n ?? 0;
                  return (
                    <div className="rounded-xl bg-ink px-3 py-2 text-xs text-canvas shadow-[var(--bayangan-naik)]">
                      <p className="font-bold">
                        {lb}
                        {bulanan ? ` ${filter.tahun}` : ""}
                      </p>
                      {ada.length === 0 && <p className="text-canvas/80">Belum ada isian</p>}
                      {ada.map((p) => (
                        <p key={String(p.dataKey)} className="flex items-center gap-1.5 font-medium">
                          <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: p.color }} />
                          {p.name}: <strong>{angka(p.value as number)}</strong> {satuan}
                        </p>
                      ))}
                      {mode === "total" && n > 0 && <p className="mt-0.5 text-canvas/70">{n} lokasi melapor</p>}
                    </div>
                  );
                }}
              />
              {mode === "total" && med && <ReferenceLine y={med} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: "median", position: "insideTopLeft", fontSize: 10, fill: "var(--muted)" }} />}
              {mode === "total" && (
                <Line name="Semua lokasi" dataKey="total" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={animasi} connectNulls={false} />
              )}
              {mode === "total" && filter.lokasi !== null && (
                <Line name={data.lokasi[filter.lokasi].singkat} dataKey="pilihan" stroke="var(--series-2)" strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={animasi} connectNulls={false} />
              )}
              {mode === "total" &&
                lonjakan.map((x) => <ReferenceDot key={x.k} x={label[x.k]} y={x.v} r={6} fill="var(--buruk)" stroke="var(--card)" strokeWidth={2} />)}
              {mode === "lokasi" &&
                tampilLokasi.map((i) => (
                  <Line
                    key={i}
                    name={data.lokasi[i].singkat}
                    dataKey={`l${i}`}
                    stroke={warnaLokasi(i)}
                    strokeWidth={i === milik ? 3 : 2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={animasi}
                    connectNulls={false}
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {mode === "total" ? (
        <p className="text-xs leading-snug text-ink-2" aria-live="polite">
          {kosong
            ? ""
            : med === null
              ? "Terlalu sedikit bulan terisi untuk menandai lonjakan."
              : lonjakan.length === 0
                ? `Tidak ada bulan yang ≥ ${angka(AMBANG_LONJAKAN)}× median.`
                : (
                    <>
                      <span aria-hidden className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: "var(--buruk)" }} />
                      Lonjakan (≥ {angka(AMBANG_LONJAKAN)}× median):{" "}
                      <strong className="text-ink">{lonjakan.map((x) => `${label[x.k]} ${angka(Math.round(x.rasio * 10) / 10)}×`).join(", ")}</strong>
                    </>
                  )}
        </p>
      ) : (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Lokasi pada grafik">
          {dipilih.map((i) => {
            const mati = sembunyi.includes(i);
            return (
              <button
                key={i}
                type="button"
                aria-pressed={!mati}
                title={mati ? "Tampilkan garis" : "Sembunyikan garis"}
                onClick={() => setSembunyi((s) => (mati ? s.filter((x) => x !== i) : [...s, i]))}
                className={`fokus-cincin flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs transition-opacity ${mati ? "border-line text-muted opacity-60" : "border-transparent bg-card-2 font-semibold text-ink"} ${i === milik ? "underline decoration-dotted" : ""}`}
              >
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: mati ? "var(--netral)" : warnaLokasi(i) }} />
                {data.lokasi[i].singkat}
                {i === milik && " (Anda)"}
              </button>
            );
          })}
        </div>
      )}
    </Kartu>
  );
}
