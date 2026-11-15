"use client";

import { ChevronsDown } from "lucide-react";
import { useData } from "@/lib/data";
import { angka } from "@/lib/format";
import { bandingPerLokasi, kategoriUkuran, perLokasi } from "@/lib/hitung";
import type { Indikator } from "@/lib/panel";
import { Kartu, TanpaData, usePeriode } from "./Kerangka";
import { LencanaPerubahan } from "./Perubahan";
import { TombolPerlebar, type Perlebar } from "./Perlebar";
import { Tip } from "./Tip";

/** Jumlah lokasi yang tampil saat kartu belum diperlebar. */
const JUMLAH_RINGKAS = 8;

type BarisData = {
  lokasi: { id: string; nama: string; singkat: string };
  i: number;
  nilai: number;
  cek: number;
  persen: number | null;
  peringkat: number;
};

/**
 * Lokasi penyumbang terbesar untuk satu indikator, dengan porsi dan perubahan tiap lokasi
 * dibanding periode setara tahun lalu. Awalnya hanya 8 teratas; tombol perlebar menampilkan semua
 * (dua kolom bila kartunya cukup lebar). Klik baris → memfokuskan dashboard ke lokasi itu.
 */
export function Peringkat({
  id, ind, nomor, pertanyaan, urut = 0, perlebar,
}: {
  id: string; ind: Indikator; nomor?: number; pertanyaan?: string; urut?: number; perlebar: Perlebar;
}) {
  const { data, filter, sumber, fokus } = useData();
  const periode = usePeriode();
  const ukuran = ind.ukuran;
  const { nilai, cek } = perLokasi(data, { ...filter, lokasi: null }, ukuran);
  const ban = bandingPerLokasi(data, filter, ind);
  const baris: BarisData[] = data.lokasi
    .map((l, i) => ({ lokasi: l, i, nilai: nilai[i], cek: cek[i], persen: "alasan" in ban ? null : ban.persen[i], peringkat: 0 }))
    .filter((b) => b.nilai !== 0)
    .sort((a, b) => b.nilai - a.nilai)
    .map((b, n) => ({ ...b, peringkat: n + 1 }));
  const maks = Math.max(...baris.map((b) => b.nilai), 0);
  const jumlah = baris.reduce((a, b) => a + b.nilai, 0);
  const tanpaNilai = data.lokasi.length - baris.length;
  const satuan = ukuran.satuan === "m3" ? "m³" : ukuran.satuan;
  const adaPilihan = filter.lokasi !== null;
  const nTeratas = Math.min(3, baris.length);
  const porsiTeratas = jumlah > 0 ? (100 * baris.slice(0, nTeratas).reduce((a, b) => a + b.nilai, 0)) / jumlah : 0;
  const persenId = (p: number) => `${p.toFixed(1).replace(".", ",")}%`;

  const lebar = perlebar.aktif;
  const tampil = lebar ? baris : baris.slice(0, JUMLAH_RINGKAS);
  // Lokasi yang dipilih dari tempat lain tetap terlihat walau peringkatnya di luar 8 teratas.
  const terpilihLuar = !lebar ? baris.find((b) => b.i === filter.lokasi && b.peringkat > JUMLAH_RINGKAS) : undefined;
  const tersembunyi = baris.length - tampil.length - (terpilihLuar ? 1 : 0);

  const renderBaris = (b: BarisData, n: number, animasi: boolean) => {
    const terpilih = filter.lokasi === b.i;
    const redup = adaPilihan && !terpilih;
    return (
      <li key={b.lokasi.id} className={animasi ? "baris-masuk" : undefined} style={animasi ? ({ "--i": n } as React.CSSProperties) : undefined}>
        <Tip
          sisi="atas"
          className="w-full"
          teks={
            <>
              <strong>{b.lokasi.nama.replace("PT Pertamina Patra Niaga - ", "")}</strong>
              <br />
              Peringkat {b.peringkat} dari {baris.length} · {angka(b.nilai)} {satuan}
              {jumlah > 0 && ` (${persenId((100 * b.nilai) / jumlah)} dari total)`}
              <br />
              {terpilih ? "Klik untuk melepas fokus" : "Klik untuk memfokuskan dashboard ke lokasi ini"}
            </>
          }
        >
          <button
            type="button"
            aria-pressed={terpilih}
            onClick={() => fokus({ lokasi: terpilih ? null : b.i }, id)}
            className={`fokus-cincin grid w-full grid-cols-[1.1rem_6.25rem_1fr_auto_4rem] items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-xs transition-all duration-200 hover:bg-accent-soft @max-sm:grid-cols-[1.1rem_minmax(0,1fr)_auto_4rem] ${
              terpilih ? "bg-accent-soft ring-1 ring-accent" : ""
            } ${redup ? "opacity-45 hover:opacity-100" : ""}`}
          >
            <span className="text-[11px] font-semibold tabular-nums text-muted">{b.peringkat}</span>
            <span className={`truncate ${terpilih ? "font-bold text-ink" : "font-medium text-ink-2"}`}>{b.lokasi.singkat}</span>
            <span className="block h-2.5 overflow-hidden rounded-full bg-card-2 @max-sm:hidden">
              <span
                className="tumbuh block h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${Math.max((b.nilai / maks) * 100, 1)}%`, ["--i" as string]: n }}
              />
            </span>
            <span className="min-w-14 text-right font-semibold tabular-nums text-ink">
              {angka(b.nilai)}
              {b.cek > 0 && (
                <span
                  className="ml-1.5 inline-block size-2 rounded-full align-middle"
                  style={{ background: "var(--peringatan)" }}
                  role="img"
                  aria-label="perlu dicek"
                />
              )}
            </span>
            <span className="flex justify-end">
              {b.persen === null ? <span className="text-muted">—</span> : <LencanaPerubahan persen={b.persen} arah={ind.arah} kecil />}
            </span>
          </button>
        </Tip>
      </li>
    );
  };

  return (
    <Kartu className="@container flex flex-col gap-4" sumber={sumber === id} urut={urut}>
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
          <h2 className="text-base font-bold text-ink">Lokasi penyumbang terbesar</h2>
          <p className="mt-0.5 text-xs text-ink-2">
            {satuan} · {periode}
            {!("alasan" in ban) && <> · panah kanan = perubahan vs {ban.label}</>}
            {baris.length > 2 && jumlah > 0 && (
              <>
                {" · "}
                <strong className="text-ink">{nTeratas} lokasi teratas = {persenId(porsiTeratas)} dari total</strong>
              </>
            )}
          </p>
        </div>
        {baris.length > JUMLAH_RINGKAS && (
          <TombolPerlebar
            perlebar={perlebar}
            teksNonaktif="Perlebar dan tampilkan semua lokasi"
            teksAktif="Kembalikan ke 8 lokasi teratas"
          />
        )}
      </div>

      {baris.length === 0 ? (
        <TanpaData kategori={kategoriUkuran(data, ukuran)} kelas="py-6 items-center" />
      ) : (
        <>
          <ol className={`grid grid-cols-1 gap-x-4 gap-y-1 ${lebar ? "@2xl:grid-cols-2" : ""}`}>
            {tampil.map((b, n) => renderBaris(b, n, lebar && n >= JUMLAH_RINGKAS))}
            {terpilihLuar && (
              <>
                <li aria-hidden className="px-2.5 text-center text-xs leading-none text-muted">⋯</li>
                {renderBaris(terpilihLuar, 0, false)}
              </>
            )}
          </ol>
          {!lebar && tersembunyi > 0 && (
            <button
              type="button"
              onClick={perlebar.onToggle}
              className="fokus-cincin flex items-center justify-center gap-1.5 rounded-xl bg-accent-soft py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent-kuat"
            >
              <ChevronsDown className="size-4" aria-hidden />
              Tampilkan {tersembunyi} lokasi lainnya
            </button>
          )}
        </>
      )}
      {tanpaNilai > 0 && baris.length > 0 && (
        <p className="text-xs text-ink-2">{tanpaNilai} lokasi lain tidak memiliki nilai pada periode ini.</p>
      )}
      {"alasan" in ban && baris.length > 0 && <p className="text-xs text-muted">Perubahan per lokasi tidak ditampilkan: {ban.alasan}.</p>}
    </Kartu>
  );
}
