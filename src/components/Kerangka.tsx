"use client";

import { ArrowRight, X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useData } from "@/lib/data";
import { BULAN, BULAN_PANJANG } from "@/lib/format";
import { sarankanData, tahunBulanan } from "@/lib/hitung";
import { Pilihan, type Opsi } from "./Pilihan";
import { Tip } from "./Tip";

/** Kartu dasar. `sumber` = kartu ini adalah visual yang baru diklik; `urut` mengatur jeda animasi masuk. */
export function Kartu({
  children, className = "", sumber = false, urut = 0, naik = false,
}: {
  children: ReactNode; className?: string; sumber?: boolean; urut?: number; naik?: boolean;
}) {
  return (
    <section
      style={{ "--i": urut } as CSSProperties}
      className={`kartu masuk p-5 sm:p-6 ${naik ? "kartu-naik" : ""} ${sumber ? "kartu-sumber" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

/** Teks periode yang sedang dipilih, mis. "Januari 2026" atau "2026 (Jan–Okt)". */
export function usePeriode(): string {
  const { data, filter } = useData();
  if (filter.bulan) return `${BULAN_PANJANG[filter.bulan - 1]} ${filter.tahun}`;
  const akhir = data.meta.bulanTerakhir[String(filter.tahun)];
  return akhir && akhir < 12 ? `${filter.tahun} (Jan–${BULAN[akhir - 1]})` : String(filter.tahun);
}

/** Satu baris filter di atas semua visual; berlaku untuk seluruh halaman. */
export function BarisFilter() {
  const { data, filter, ubahFilter } = useData();
  const bulanan = tahunBulanan(data, filter.tahun);
  const akhir = data.meta.bulanTerakhir[String(filter.tahun)] ?? 12;

  const opsiTahun: Opsi[] = data.meta.tahun.map((t) => {
    const a = data.meta.bulanTerakhir[String(t)];
    return {
      nilai: t,
      label: String(t),
      catatan: a && a < 12 ? `baru Jan–${BULAN[a - 1]}` : tahunBulanan(data, t) ? undefined : "data tahunan",
    };
  });
  const opsiBulan: Opsi[] = [
    { nilai: 0, label: bulanan ? "Semua bulan" : "Data tahunan" },
    ...(bulanan
      ? BULAN_PANJANG.map((b, i): Opsi => ({
          nilai: i + 1, label: b, redup: i >= akhir, catatan: i >= akhir ? "belum terisi" : undefined,
        }))
      : []),
  ];
  const opsiLokasi: Opsi[] = [
    { nilai: -1, label: `Semua lokasi (${data.lokasi.length})` },
    ...[...new Set(data.lokasi.map((l) => l.tipe))].flatMap((t) =>
      data.lokasi.flatMap((l, i): Opsi[] => (l.tipe === t ? [{ nilai: i, label: l.singkat, grup: t }] : [])),
    ),
  ];

  return (
    <div className="relative z-20 flex flex-wrap items-center gap-2.5">
      <Pilihan label="Tahun" nilai={filter.tahun} opsi={opsiTahun} onPilih={(t) => ubahFilter({ tahun: t })} />
      <Pilihan
        label="Bulan"
        nilai={filter.bulan}
        opsi={opsiBulan}
        disabled={!bulanan}
        title={bulanan ? undefined : `Data ${filter.tahun} hanya tersedia per tahun`}
        onPilih={(b) => ubahFilter({ bulan: b })}
      />
      <Pilihan
        label="Lokasi"
        nilai={filter.lokasi ?? -1}
        opsi={opsiLokasi}
        lebarMaks="max-w-40"
        onPilih={(l) => ubahFilter({ lokasi: l < 0 ? null : l })}
      />
    </div>
  );
}

function Chip({ teks, hapus }: { teks: string; hapus?: () => void }) {
  if (!hapus) {
    return <span className="rounded-full bg-card-2 px-3 py-1.5 text-xs font-semibold text-ink">{teks}</span>;
  }
  return (
    <Tip teks="Klik untuk melepas fokus ini" sisi="bawah">
      <button
        type="button"
        onClick={hapus}
        className="fokus-cincin inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-on-accent shadow-md transition-transform hover:-translate-y-0.5"
        style={{ animation: "muncul 0.25s ease-out" }}
      >
        {teks}
        <X className="size-3.5" aria-label="lepas" />
      </button>
    </Tip>
  );
}

/**
 * Selalu menunjukkan apa yang sedang diterapkan ke semua visual di halaman
 * (indikator, periode, lokasi), dan yang berasal dari klik bisa dilepas dari sini.
 */
function BarisTampil({ indikator }: { indikator?: string }) {
  const { data, filter, ubahFilter } = useData();
  const periode = usePeriode();
  return (
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      <span className="text-xs font-semibold text-ink-2">Sedang menampilkan:</span>
      {indikator && <Chip teks={indikator} />}
      <Chip teks={periode} hapus={filter.bulan ? () => ubahFilter({ bulan: 0 }) : undefined} />
      <Chip
        teks={filter.lokasi !== null ? data.lokasi[filter.lokasi].singkat : "Semua lokasi"}
        hapus={filter.lokasi !== null ? () => ubahFilter({ lokasi: null }) : undefined}
      />
      <span className="text-xs text-muted">semua visual di halaman ini mengikuti pilihan ini</span>
    </div>
  );
}

export function Kerangka({
  judul, deskripsi, filter = true, tampil, children,
}: {
  judul: ReactNode;
  deskripsi?: string;
  filter?: boolean;
  /** Nama indikator yang sedang ditelusuri (halaman Data ESG), ditampilkan di bilah "Sedang menampilkan". */
  tampil?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="masuk">
        <h1 className="text-balance text-3xl font-extrabold leading-[1.15] tracking-tight text-ink sm:text-4xl">{judul}</h1>
        {deskripsi && <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-2">{deskripsi}</p>}
      </div>
      {filter && (
        <div className="masuk flex flex-col gap-3" style={{ "--i": 2 } as CSSProperties}>
          <BarisFilter />
          <BarisTampil indikator={tampil} />
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * Keterangan "Belum ada data" yang membantu: menunjuk tahun terdekat yang datanya ada
 * (atau bulan lain) dan menyediakan tombol untuk langsung ke sana.
 */
export function TanpaData({ kategori, kelas = "" }: { kategori: string | null; kelas?: string }) {
  const { data, filter, ubahFilter } = useData();
  const saran = kategori ? sarankanData(data, filter, kategori) : null;
  const tombol =
    "fokus-cincin inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent transition-colors hover:bg-accent-kuat";
  return (
    <div className={`flex flex-col items-start gap-1.5 text-xs text-ink-2 ${kelas}`}>
      <span>Belum ada data{filter.lokasi !== null ? " untuk lokasi ini" : ""} pada periode ini.</span>
      {saran?.jenis === "tahun" && (
        <button type="button" onClick={() => ubahFilter({ tahun: saran.tahun, bulan: 0 })} className={tombol}>
          Data tersedia di {saran.tahun} — lihat
          <ArrowRight className="size-3" aria-hidden />
        </button>
      )}
      {saran?.jenis === "semuaBulan" && (
        <button type="button" onClick={() => ubahFilter({ bulan: 0 })} className={tombol}>
          Ada data di bulan lain — tampilkan semua bulan
          <ArrowRight className="size-3" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Penanda untuk nilai yang ditandai ETL sebagai tidak wajar (jauh di luar pola lokasinya). */
export function PerluDicek({ jumlah }: { jumlah: number }) {
  if (!jumlah) return null;
  return (
    <Tip
      teks="Nilai di Excel jauh di atas pola lokasi ini (bulan lain atau tahun sebelumnya). Ditampilkan apa adanya."
      sisi="atas"
      className="self-start"
    >
      <span
        tabIndex={0}
        className="fokus-cincin inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-ink-2"
      >
        <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: "var(--peringatan)" }} />
        {jumlah} nilai perlu dicek
      </span>
    </Tip>
  );
}
