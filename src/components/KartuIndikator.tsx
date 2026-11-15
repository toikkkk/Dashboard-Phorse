"use client";

import {
  ArrowUpRight, Cloud, Droplets, Flame, FlaskConical, Fuel, Info, Trash2, Wallet, Zap, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { useAngkaBerjalan } from "@/lib/animasi";
import { useData } from "@/lib/data";
import { angka, BULAN, ringkas } from "@/lib/format";
import { banding, bulanTerakhirKategori, jumlahPelapor, perBulan, perTahun, tahunBulanan, total } from "@/lib/hitung";
import type { Indikator } from "@/lib/panel";
import { PerluDicek, TanpaData } from "./Kerangka";
import { LencanaPerubahan, PerubahanIndikator } from "./Perubahan";
import { Sparkline } from "./Sparkline";
import { Tip } from "./Tip";

export const IKON_INDIKATOR: Record<string, LucideIcon> = {
  penyaluran: Fuel,
  emisi: Cloud,
  listrik: Zap,
  bbm: Flame,
  sampah: Trash2,
  b3: FlaskConical,
  air: Droplets,
  biaya: Wallet,
};

export const tampilSatuan = (s: string) => (s === "m3" ? "m³" : s);

function useHitungan(ind: Indikator) {
  const { data, filter } = useData();
  return {
    melapor: jumlahPelapor(data, filter, ind),
    dari: filter.lokasi !== null ? 1 : data.lokasi.length,
    hasil: total(data, filter, ind.ukuran),
    ban: banding(data, filter, ind),
  };
}

/** Kartu ringkasan satu indikator di Beranda: angka, perubahan vs periode setara, mini-tren, cakupan data. */
export function KartuIndikator({ ind, urut }: { ind: Indikator; urut: number }) {
  const { data, filter, pilihIndikator } = useData();
  const { melapor, dari, hasil, ban } = useHitungan(ind);
  const berjalan = useAngkaBerjalan(melapor === 0 ? 0 : hasil.nilai);
  const Ikon = IKON_INDIKATOR[ind.id];
  const satuan = tampilSatuan(ind.ukuran.satuan);
  const kosong = melapor === 0;

  const bulanan = tahunBulanan(data, filter.tahun);
  // Batas bulan mengikuti kategori ini (kategori bisa berhenti lebih awal dari tahunnya).
  const akhir = Math.min(data.meta.bulanTerakhir[String(filter.tahun)] ?? 12, bulanTerakhirKategori(data, filter.tahun, ind.kategori));
  const deret = bulanan
    ? perBulan(data, filter.tahun, filter.lokasi, ind.ukuran).map((h, i) => (i >= akhir ? null : h.nilai))
    : perTahun(data, filter.lokasi, ind.ukuran).map((h, i) => ((data.meta.bulanTerakhir[String(data.meta.tahun[i])] ?? 12) < 12 ? null : h.nilai));
  const sorot = bulanan ? (filter.bulan ? filter.bulan - 1 : -1) : data.meta.tahun.indexOf(filter.tahun);

  const router = useRouter();
  const telusuri = () => {
    pilihIndikator(ind.id);
    router.push("/esg");
  };

  return (
    <article
      style={{ "--i": urut } as CSSProperties}
      // Seluruh kartu bisa diklik; tautan di judul tetap ada untuk keyboard dan pembaca layar.
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("a,button")) telusuri();
      }}
      className="kartu kartu-naik masuk group relative flex cursor-pointer flex-col gap-3 p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <span
          aria-hidden
          className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"
        >
          <Ikon className="size-5" />
        </span>
        <Tip teks={ind.definisi} sisi="kiri-bawah">
          <button
            type="button"
            aria-label={`Arti ${ind.label}`}
            className="fokus-cincin relative z-10 flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-accent-soft hover:text-accent"
          >
            <Info className="size-4" aria-hidden />
          </button>
        </Tip>
      </div>

      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-ink-2">
          <Link
            href="/esg"
            onClick={() => pilihIndikator(ind.id)}
            className="fokus-cincin inline-flex items-center gap-1 transition-colors group-hover:text-accent"
          >
            {ind.label}
            <ArrowUpRight className="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" aria-hidden />
          </Link>
        </h3>
        {ind.konteks && <p className="text-[11px] font-medium text-muted">konteks aktivitas</p>}
        {kosong ? (
          <>
            <p className="mt-1 text-3xl font-extrabold text-muted">—</p>
            <TanpaData kategori={ind.kategori} />
          </>
        ) : (
          <Tip teks={`${angka(hasil.nilai)} ${satuan}`} sisi="atas" className="mt-1">
            <p tabIndex={0} className="fokus-cincin truncate text-3xl font-extrabold tracking-tight text-ink">
              {ringkas(berjalan)} <span className="text-sm font-semibold text-ink-2">{satuan}</span>
            </p>
          </Tip>
        )}
      </div>

      {!kosong && (
        <>
          <PerubahanIndikator ban={ban} arah={ind.arah} satuan={ind.ukuran.satuan} />
          <div className="mt-auto flex items-end justify-between gap-3 pt-1">
            <Sparkline
              nilai={deret} sorot={sorot}
              label={`Tren ${ind.label} ${bulanan ? `per bulan ${filter.tahun}` : "per tahun"}`}
            />
            <span className="text-right text-[11px] leading-tight text-ink-2">
              {filter.lokasi !== null ? "lokasi ini" : `${melapor} dari ${dari} lokasi`}
              <br />
              {bulanan && !filter.bulan && akhir < 12 ? (
                <span className="font-semibold text-ink">baru terisi sampai {BULAN[akhir - 1]}</span>
              ) : (
                "yang mengisi"
              )}
            </span>
          </div>
          <div className="min-h-0 empty:hidden">
            <PerluDicek jumlah={hasil.cek} />
          </div>
        </>
      )}
    </article>
  );
}

/** Pemilih indikator di halaman Data ESG: angka dan perubahan ringkas, supaya pembaca bisa membandingkan sebelum memilih. */
export function ChipIndikator({ ind, aktif, onPilih }: { ind: Indikator; aktif: boolean; onPilih: () => void }) {
  const { melapor, hasil, ban } = useHitungan(ind);
  const Ikon = IKON_INDIKATOR[ind.id];
  const kosong = melapor === 0;
  return (
    <button
      type="button"
      aria-pressed={aktif}
      onClick={onPilih}
      className={`fokus-cincin flex min-w-40 flex-col gap-1.5 rounded-2xl border px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 ${
        aktif ? "border-accent bg-card shadow-(--bayangan-naik) ring-1 ring-accent" : "border-line bg-card-2 hover:bg-card"
      }`}
    >
      <span className={`flex items-center gap-2 text-xs font-semibold ${aktif ? "text-ink" : "text-ink-2"}`}>
        <Ikon className="size-4 text-accent" aria-hidden />
        {ind.singkat}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className={`text-lg font-extrabold tracking-tight ${kosong ? "text-muted" : "text-ink"}`}>{kosong ? "—" : ringkas(hasil.nilai)}</span>
        {!kosong && <span className="text-xs font-semibold text-ink-2">{tampilSatuan(ind.ukuran.satuan)}</span>}
      </span>
      {kosong ? (
        <span className="text-[11px] text-ink-2">Belum ada data</span>
      ) : "alasan" in ban ? (
        <span className="text-[11px] text-muted">Tanpa pembanding</span>
      ) : (
        <LencanaPerubahan persen={ban.persen} arah={ind.arah} kecil ragu={ban.ragu} />
      )}
    </button>
  );
}
