"use client";

import { BarChart3, MousePointerClick, Table2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import {
  Bar, CartesianGrid, ComposedChart, Line, LineChart, Rectangle, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
  type BarShapeProps,
} from "recharts";
import { useKurangiGerak } from "@/lib/animasi";
import { useData } from "@/lib/data";
import { angka, BULAN, ringkas } from "@/lib/format";
import { bulanTerakhirKategori, kategoriUkuran, lokasiMelaporTahun, perBulan, perTahun, tahunBulanan } from "@/lib/hitung";
import { seriPanel, type Panel, type Seri } from "@/lib/panel";
import { Kartu, PerluDicek, TanpaData } from "./Kerangka";
import { TombolPerlebar, type Perlebar } from "./Perlebar";
import { Tip } from "./Tip";

type Baris = { label: string } & Record<string, number | string | null>;

const satuanTampil = (s: string) => (s === "m3" ? "m³" : s);
const REDUP_KOLOM = 0.32;
const REDUP_SERI = 0.22;
const KUNCI_LALU = "_lalu";

function Legenda({
  seri, aktif, onPilih, onSorot, garis,
}: {
  seri: Seri[]; aktif: string | null; onPilih: (k: string) => void; onSorot: (k: string | null) => void; garis?: string;
}) {
  if (seri.length < 2 && !garis) return null;
  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {seri.length >= 2 &&
        seri.map((s) => (
          <li key={s.kunci}>
            <Tip teks={aktif === s.kunci ? "Klik lagi untuk menampilkan semua seri" : "Klik untuk menyorot seri ini"} sisi="atas">
              <button
                type="button"
                aria-pressed={aktif === s.kunci}
                onClick={() => onPilih(s.kunci)}
                onMouseEnter={() => onSorot(s.kunci)}
                onMouseLeave={() => onSorot(null)}
                onFocus={() => onSorot(s.kunci)}
                onBlur={() => onSorot(null)}
                className={`fokus-cincin flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                  aktif === s.kunci ? "bg-accent-kuat text-ink" : "text-ink-2 hover:bg-accent-soft hover:text-ink"
                }`}
              >
                <span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: s.warna }} />
                {s.label}
              </button>
            </Tip>
          </li>
        ))}
      {garis && (
        <li className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-ink-2">
          <span aria-hidden className="relative inline-block h-0.5 w-4 bg-ink">
            <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" />
          </span>
          {garis}
        </li>
      )}
    </ul>
  );
}

type IsiTip = { dataKey?: unknown; value?: unknown };

function TipGrafik({
  aktif, isi, label, seri, satuan, tumpuk, laluLabel,
}: {
  aktif?: boolean; isi?: readonly IsiTip[]; label?: unknown; seri: Seri[]; satuan: string; tumpuk: boolean; laluLabel?: string;
}) {
  if (!aktif || !isi?.length) return null;
  const nilai = new Map(isi.map((p) => [String(p.dataKey), typeof p.value === "number" ? p.value : null]));
  const baris = seri.filter((s) => nilai.get(s.kunci) != null);
  const jumlah = baris.reduce((a, s) => a + (nilai.get(s.kunci) ?? 0), 0);
  const lalu = nilai.get(KUNCI_LALU);
  return (
    <div className="min-w-44 rounded-2xl border border-line bg-card px-3.5 py-3 text-xs shadow-(--bayangan-naik)">
      <div className="mb-1.5 font-bold text-ink">{String(label)}</div>
      {baris.map((s) => (
        <div key={s.kunci} className="flex items-center justify-between gap-5 py-0.5 text-ink-2">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-2.5 rounded-sm" style={{ background: s.warna }} />
            {s.label}
          </span>
          <span className="font-semibold tabular-nums text-ink">{angka(nilai.get(s.kunci) ?? 0)}</span>
        </div>
      ))}
      {tumpuk && baris.length > 1 && (
        <div className="mt-1.5 flex justify-between gap-5 border-t border-line pt-1.5 font-semibold text-ink">
          <span>Total</span>
          <span className="tabular-nums">{angka(jumlah)}</span>
        </div>
      )}
      {lalu != null && laluLabel && (
        <div className="mt-1 flex justify-between gap-5 text-ink-2">
          <span>{laluLabel}</span>
          <span className="font-semibold tabular-nums text-ink">{angka(lalu)}</span>
        </div>
      )}
      <div className="mt-1.5 text-muted">dalam {satuan} · klik untuk memfokuskan</div>
    </div>
  );
}

function Tabel({ baris, seri, satuan, laluLabel }: { baris: Baris[]; seri: Seri[]; satuan: string; laluLabel?: string }) {
  return (
    <div className="max-h-72 overflow-auto rounded-2xl border border-line">
      <table className="w-full text-right text-xs tabular-nums">
        <caption className="sr-only">Nilai dalam {satuan}</caption>
        <thead className="sticky top-0 bg-card-2 text-ink-2">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">Periode</th>
            {seri.map((s) => (
              <th key={s.kunci} className="px-3 py-2 font-semibold">{s.label}</th>
            ))}
            {laluLabel && <th className="px-3 py-2 font-semibold">{laluLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {baris.map((b) => (
            <tr key={b.label} className="border-t border-line transition-colors hover:bg-accent-soft">
              <th className="px-3 py-2 text-left font-medium text-ink-2">{b.label}</th>
              {seri.map((s) => (
                <td key={s.kunci} className="px-3 py-2 text-ink">
                  {typeof b[s.kunci] === "number" ? angka(b[s.kunci] as number) : "—"}
                </td>
              ))}
              {laluLabel && (
                <td className="px-3 py-2 text-ink">{typeof b[KUNCI_LALU] === "number" ? angka(b[KUNCI_LALU] as number) : "—"}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Grafik waktu satu panel: per bulan untuk tahun bulanan, per tahun untuk tahun lainnya.
 * Klik kolom → memfokuskan seluruh dashboard ke bulan (atau tahun) itu.
 * Klik legenda → menyorot satu seri di grafik ini.
 * Pada tampilan bulanan, garis hitam = total tahun lalu (pada lokasi yang melapor di tahun ini) sebagai pembanding.
 */
export function PanelGrafik({
  panel, urut = 0, nomor, pertanyaan, kontrol, perlebar,
}: {
  panel: Panel; urut?: number; nomor?: number; pertanyaan?: string; kontrol?: ReactNode; perlebar?: Perlebar;
}) {
  const { data, filter, sumber, fokus } = useData();
  const kurangiGerak = useKurangiGerak();
  const [tabel, setTabel] = useState(false);
  const [sorot, setSorot] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const seri = seriPanel(data, panel);
  const bulanan = tahunBulanan(data, filter.tahun);
  const akhir = data.meta.bulanTerakhir[String(filter.tahun)] ?? 12;
  const satuan = satuanTampil(panel.satuan);
  const seriAktif = hover ?? sorot;
  const kategori = kategoriUkuran(data, seri[0].ukuran);
  // Batas bulan mengikuti kategori panel ini (mis. Emisi 2025 hanya sampai Agustus).
  const akhirKat = Math.min(akhir, kategori ? bulanTerakhirKategori(data, filter.tahun, kategori) : akhir);

  const label = bulanan
    ? BULAN
    : data.meta.tahun.map((t) => {
        const a = data.meta.bulanTerakhir[String(t)];
        return a && a < 12 ? `${t}*` : String(t);
      });
  const baris: Baris[] = label.map((l) => ({ label: l }));
  let cek = 0;
  for (const s of seri) {
    const nilai = bulanan ? perBulan(data, filter.tahun, filter.lokasi, s.ukuran) : perTahun(data, filter.lokasi, s.ukuran);
    nilai.forEach((h, i) => {
      // Bulan yang belum berjalan dibiarkan kosong, bukan nol.
      baris[i][s.kunci] = bulanan && i >= akhirKat && h.nilai === 0 ? null : h.nilai;
      cek += h.cek;
    });
  }

  // Garis pembanding: total tahun lalu, hanya lokasi yang melapor di tahun ini (agar sebanding).
  const tahunLalu = filter.tahun - 1;
  const bisaBanding = bulanan && panel.jenis === "tumpuk" && data.meta.tahunBulanan.includes(tahunLalu);
  if (bisaBanding) {
    const boleh = kategori ? lokasiMelaporTahun(data, filter.tahun, kategori) : undefined;
    const tot = new Array<number>(12).fill(0);
    for (const s of seri) perBulan(data, tahunLalu, filter.lokasi, s.ukuran, boleh).forEach((h, i) => (tot[i] += h.nilai));
    baris.forEach((b, i) => (b[KUNCI_LALU] = tot[i] || null));
  }
  const tampilLalu = bisaBanding && baris.some((b) => typeof b[KUNCI_LALU] === "number");
  const laluLabel = tampilLalu ? `Total ${tahunLalu}` : undefined;

  const kosong = baris.every((b) => seri.every((s) => !b[s.kunci]));

  // Kolom yang sedang menjadi fokus (bulan terpilih, atau tahun yang dipilih pada tampilan tahunan).
  const idxFokus = bulanan ? (filter.bulan > 0 ? filter.bulan - 1 : -1) : data.meta.tahun.indexOf(filter.tahun);
  const redupKolom = (i: number) => (bulanan && idxFokus >= 0 && i !== idxFokus ? REDUP_KOLOM : 1);
  const redupSeri = (k: string) => (seriAktif && seriAktif !== k ? REDUP_SERI : 1);

  const klikKolom = (indeks: unknown) => {
    const i = typeof indeks === "number" ? indeks : Number(indeks);
    if (!Number.isInteger(i) || i < 0 || i >= baris.length) return;
    if (bulanan) {
      if (i >= akhirKat) return;
      fokus({ bulan: filter.bulan === i + 1 ? 0 : i + 1 }, panel.id);
    } else {
      fokus({ tahun: data.meta.tahun[i] }, panel.id);
    }
  };

  const tahunBerjalan = data.meta.tahun.filter((t) => (data.meta.bulanTerakhir[String(t)] ?? 12) < 12);
  const catatan = [
    panel.catatan,
    tampilLalu ? `Garis hitam: total ${tahunLalu} pada lokasi yang melapor di ${filter.tahun}, sebagai pembanding.` : null,
    !bulanan && tahunBerjalan.length
      ? `*${tahunBerjalan.join(", ")}: tahun berjalan, baru terisi sampai ${BULAN[(data.meta.bulanTerakhir[String(tahunBerjalan[0])] ?? 1) - 1]}.`
      : null,
    bulanan && akhirKat < 12 ? `Data kategori ini baru terisi sampai ${BULAN[akhirKat - 1]} ${filter.tahun}.` : null,
  ].filter(Boolean);

  const sumbuX = (
    <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--axis)" }} tick={{ fill: "var(--muted)", fontSize: 12 }} />
  );
  const sumbuY = (
    <YAxis width={52} tickLine={false} axisLine={false} tickFormatter={ringkas} tick={{ fill: "var(--muted)", fontSize: 12 }} />
  );
  const grid = <CartesianGrid vertical={false} stroke="var(--grid)" />;
  const sorotKolom =
    idxFokus >= 0 && (bulanan ? filter.bulan > 0 : true) ? (
      <ReferenceArea x1={baris[idxFokus].label} x2={baris[idxFokus].label} fill="var(--accent)" fillOpacity={0.1} stroke="none" />
    ) : null;
  const tip = (kursor: object) => (
    <Tooltip
      cursor={kursor}
      isAnimationActive={false}
      content={(p) => (
        <TipGrafik aktif={p.active} isi={p.payload as readonly IsiTip[] | undefined} label={p.label}
          seri={seri} satuan={satuan} tumpuk={panel.jenis === "tumpuk"} laluLabel={laluLabel} />
      )}
    />
  );
  const margin = { top: 8, right: 8, left: 0, bottom: 0 };
  const animasi = !kurangiGerak;

  return (
    <Kartu className="flex flex-col gap-4" sumber={sumber === panel.id} urut={urut}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {pertanyaan && (
            <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-accent">
              {nomor && (
                <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] text-on-accent">
                  {nomor}
                </span>
              )}
              {pertanyaan}
            </p>
          )}
          <h2 className="text-base font-bold text-ink">{panel.judul}</h2>
          <p className="mt-0.5 text-xs text-ink-2">
            {satuan} · {bulanan ? `per bulan, ${filter.tahun}` : "per tahun"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {perlebar && (
            <TombolPerlebar
              perlebar={perlebar}
              hanyaLebar
              teksNonaktif="Perlebar grafik (kartu lain bergeser)"
              teksAktif="Kembalikan ukuran grafik"
            />
          )}
          <Tip teks={tabel ? "Kembali ke grafik" : "Lihat angka dalam tabel"} sisi="kiri-bawah">
            <button
              type="button"
              onClick={() => setTabel((t) => !t)}
              aria-pressed={tabel}
              aria-label={tabel ? "Lihat grafik" : "Lihat tabel"}
              className="fokus-cincin flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition-all hover:-translate-y-0.5 hover:bg-accent-kuat"
            >
              {tabel ? <BarChart3 className="size-4" /> : <Table2 className="size-4" />}
            </button>
          </Tip>
        </div>
      </div>

      {kontrol}

      <Legenda seri={seri} aktif={seriAktif} onPilih={(k) => setSorot((s) => (s === k ? null : k))} onSorot={setHover} garis={laluLabel} />

      {kosong ? (
        <TanpaData kategori={kategori} kelas="h-40 items-center justify-center" />
      ) : tabel ? (
        <Tabel baris={baris} seri={seri} satuan={satuan} laluLabel={laluLabel} />
      ) : (
        <div className="h-64 w-full cursor-pointer" aria-label={`Grafik ${panel.judul}. Klik kolom untuk memfokuskan.`}>
          <ResponsiveContainer width="100%" height="100%" debounce={150}>
            {panel.jenis === "tumpuk" ? (
              <ComposedChart data={baris} margin={margin} onClick={(st) => klikKolom(st.activeTooltipIndex)}>
                {grid}
                {sumbuX}
                {sumbuY}
                {sorotKolom}
                {tip({ fill: "var(--accent)", fillOpacity: 0.06 })}
                {seri.map((s, n) => (
                  <Bar
                    key={s.kunci}
                    dataKey={s.kunci}
                    name={s.label}
                    stackId="a"
                    fill={s.warna}
                    maxBarSize={24}
                    radius={n === seri.length - 1 ? [4, 4, 0, 0] : 0}
                    isAnimationActive={animasi}
                    animationDuration={650}
                    animationEasing="ease-out"
                    shape={(p: BarShapeProps) => (
                      <Rectangle
                        x={p.x} y={p.y} width={p.width} height={p.height} radius={p.radius} fill={p.fill}
                        fillOpacity={redupKolom(p.index) * redupSeri(s.kunci)}
                        stroke="var(--card)" strokeWidth={1}
                        style={{ transition: "fill-opacity 0.25s ease" }}
                      />
                    )}
                  />
                ))}
                {tampilLalu && (
                  <Line
                    dataKey={KUNCI_LALU}
                    name={laluLabel}
                    type="linear"
                    stroke="var(--ink)"
                    strokeWidth={2}
                    connectNulls
                    dot={{ r: 3.5, fill: "var(--ink)", stroke: "var(--card)", strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: "var(--ink)", stroke: "var(--card)", strokeWidth: 2 }}
                    isAnimationActive={animasi}
                    animationDuration={800}
                  />
                )}
              </ComposedChart>
            ) : (
              <LineChart data={baris} margin={margin} onClick={(st) => klikKolom(st.activeTooltipIndex)}>
                {grid}
                {sumbuX}
                {sumbuY}
                {sorotKolom}
                {tip({ stroke: "var(--axis)" })}
                {seri.map((s) => (
                  <Line
                    key={s.kunci}
                    dataKey={s.kunci}
                    name={s.label}
                    type="linear"
                    stroke={s.warna}
                    strokeWidth={2}
                    strokeOpacity={redupSeri(s.kunci)}
                    dot={{ r: 4, fill: s.warna, stroke: "var(--card)", strokeWidth: 2, fillOpacity: redupSeri(s.kunci) }}
                    activeDot={{ r: 6, fill: s.warna, stroke: "var(--card)", strokeWidth: 2 }}
                    isAnimationActive={animasi}
                    animationDuration={750}
                    animationEasing="ease-out"
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-ink-2">
        <PerluDicek jumlah={cek} />
        {!kosong && !tabel && (
          <span className="inline-flex items-center gap-1.5 text-muted">
            <MousePointerClick className="size-3.5" aria-hidden />
            {bulanan ? "Klik kolom bulan untuk memfokuskan dashboard" : "Klik kolom tahun untuk beralih ke tahun itu"}
          </span>
        )}
        {catatan.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>
    </Kartu>
  );
}
