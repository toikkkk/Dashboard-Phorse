"use client";

import { HalamanMutuAir } from "@/components/HalamanMutuAir";
import { SiapData } from "@/lib/data";
import { MUTU_OIL_CATCHER } from "@/lib/panel";

export default function HalamanOilCatcher() {
  return (
    <SiapData>
      <HalamanMutuAir
        id="oil-catcher"
        judul="Oil Catcher"
        deskripsi="Hasil pemantauan air limbah operasional dari oil catcher (TOC serta minyak & lemak), per lokasi dan per bulan."
        parameter={MUTU_OIL_CATCHER}
      />
    </SiapData>
  );
}
