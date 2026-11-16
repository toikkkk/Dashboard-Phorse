"use client";

import { AreaTip } from "@/components/AreaTip";
import { KartuIndikator } from "@/components/KartuIndikator";
import { Kerangka } from "@/components/Kerangka";
import { CakupanKategori, KartuLokasiMelapor, LokasiTeratas, RingkasanPerubahan } from "@/components/RingkasanMonitoring";
import { TrenLokasi } from "@/components/TrenLokasi";
import { SiapData } from "@/lib/data";
import { INDIKATOR } from "@/lib/panel";
import { usePerbesar } from "@/lib/perbesar";

/**
 * Beranda dirancang muat dalam satu layar (tanpa menggulir di layar laptop umum): angka utama di atas, lalu empat
 * panel pemantauan berdampingan. Tombol perbesar di tiap panel menjadikannya selebar baris (panel lain turun ke
 * bawahnya) dengan rincian tambahan. Rincian per kategori dan peringkat lengkap ada di Data ESG.
 */
function IsiBeranda() {
  const kartu = INDIKATOR.filter((i) => i.beranda !== false);
  const [lebar, ubahLebar] = usePerbesar();
  const prop = (id: string) => ({
    lebar: lebar === id,
    onLebar: () => ubahLebar(id),
    kelas: lebar === id ? "xl:order-first xl:col-span-3" : "",
  });
  return (
    <Kerangka
      ringkas
      judul="Ringkasan lingkungan"
    >
      <AreaTip className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {kartu.map((ind, i) => (
          <KartuIndikator key={ind.id} ind={ind} urut={i + 1} padat />
        ))}
        <KartuLokasiMelapor urut={kartu.length + 1} />
      </AreaTip>

      <div className={`grid grid-cols-1 gap-2.5 ${lebar ? "xl:grid-cols-3" : "xl:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)_minmax(0,1fr)_minmax(0,1.6fr)]"}`}>
        <RingkasanPerubahan urut={kartu.length + 2} {...prop("perubahan")} />
        <CakupanKategori urut={kartu.length + 3} {...prop("cakupan")} />
        <LokasiTeratas urut={kartu.length + 4} {...prop("teratas")} />
        <TrenLokasi urut={kartu.length + 5} {...prop("tren")} />
      </div>
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
