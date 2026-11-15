"use client";

import { KartuIndikator } from "@/components/KartuIndikator";
import { Kerangka, usePeriode } from "@/components/Kerangka";
import { SiapData, useData } from "@/lib/data";
import { INDIKATOR } from "@/lib/panel";

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
      deskripsi="Tujuh indikator utama beserta perubahannya dibanding periode setara tahun lalu. Klik kartu untuk menelusuri kapan terjadi, dari apa, dan di lokasi mana."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kartu.map((ind, i) => (
          <KartuIndikator key={ind.id} ind={ind} urut={i + 3} />
        ))}
      </div>
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
