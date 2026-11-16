"use client";

import { HalamanMutuAir } from "@/components/HalamanMutuAir";
import { SiapData } from "@/lib/data";
import { MUTU_IPAL } from "@/lib/panel";

export default function HalamanIpal() {
  return (
    <SiapData>
      <HalamanMutuAir
        id="ipal-domestik"
        judul="IPAL Domestik"
        deskripsi="Hasil pemantauan air limbah domestik dari IPAL (COD, BOD, TSS, amonia, minyak & lemak), per lokasi dan per bulan."
        parameter={MUTU_IPAL}
      />
    </SiapData>
  );
}
