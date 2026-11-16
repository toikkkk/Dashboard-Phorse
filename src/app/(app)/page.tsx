"use client";

import { Kelengkapan } from "@/components/Kelengkapan";
import { KartuIndikator } from "@/components/KartuIndikator";
import { Kerangka, usePeriode } from "@/components/Kerangka";
import { PanelGrafik } from "@/components/PanelGrafik";
import { CakupanKategori, LokasiTeratas, RingkasanPerubahan } from "@/components/RingkasanMonitoring";
import { SiapData, useData } from "@/lib/data";
import { INDIKATOR, PANEL } from "@/lib/panel";
import { useEffect, useState, type ReactNode } from "react";

/** Catatan cakupan data: satu baris teks, bukan visual. */
function CatatanData() {
  const { data, filter } = useData();
  const periode = usePeriode();
  const lokasi = new Set<number>();
  for (const r of data.isi) {
    if (r[1] !== filter.tahun || (filter.bulan && r[2] !== filter.bulan)) continue;
    if (filter.lokasi !== null && r[0] !== filter.lokasi) continue;
    lokasi.add(r[0]);
  }
  const dari = filter.lokasi !== null ? 1 : data.lokasi.length;
  return (
    <p className="text-xs leading-relaxed text-ink-2">
      <strong className="text-ink">Catatan data:</strong> {periode} — {lokasi.size} dari {dari} lokasi sudah mengisi sedikitnya satu kategori.
      Perubahan hanya dibandingkan pada lokasi yang melapor di kedua periode. Angka tampil sesuai isian di Excel.
    </p>
  );
}

// Satu grafik per kategori data, supaya Beranda memberi gambaran seluruh data, bukan hanya angka KPI.
const GRAFIK = [
  PANEL.penyaluranProduk,
  PANEL.co2Scope,
  PANEL.listrikKegiatan,
  PANEL.bbmKegiatan,
  PANEL.sampahMetode,
  PANEL.b3Metode,
  PANEL.airSumber,
  PANEL.effluent,
];

/**
 * Menunda gambar bagian yang berada di bawah layar sampai halaman utama tampil. Beranda memuat puluhan grafik
 * dan ribuan sel; menggambar semuanya sekaligus membuat perpindahan halaman tersendat.
 */
function Tunda({ tinggi, children }: { tinggi: number; children: ReactNode }) {
  const [siap, setSiap] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSiap(true), 450);
    return () => window.clearTimeout(t);
  }, []);
  return siap ? <>{children}</> : <div aria-hidden style={{ minHeight: tinggi }} />;
}

function IsiBeranda() {
  const kartu = INDIKATOR.filter((i) => i.beranda !== false);
  return (
    <Kerangka
      judul={
        <>
          Ringkasan lingkungan
          <br />
          Regional Jatimbalinus
        </>
      }
      deskripsi="Bahan memantau seluruh data: angka utama, perubahan semua indikator, cakupan pelaporan, lokasi terbesar, tren per kategori, dan matriks lokasi. Klik kartu untuk menelusuri atau klik grafik untuk memfokuskan halaman."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kartu.map((ind, i) => (
          <KartuIndikator key={ind.id} ind={ind} urut={i + 3} />
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <RingkasanPerubahan />
        <CakupanKategori />
      </div>

      <Tunda tinggi={520}>
        <LokasiTeratas />
      </Tunda>

      <Tunda tinggi={2400}>
      <section aria-labelledby="judul-tren" className="flex flex-col gap-4">
        <h2 id="judul-tren" className="text-lg font-extrabold text-ink">
          Tren dan komposisi per kategori
        </h2>
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
          {GRAFIK.map((p, i) => (
            <PanelGrafik key={p.id} panel={p} urut={i % 2} />
          ))}
        </div>
      </section>

        <Kelengkapan />
      </Tunda>

      <CatatanData />
    </Kerangka>
  );
}

export default function Beranda() {
  return (
    <SiapData>
      <IsiBeranda />
    </SiapData>
  );
}
