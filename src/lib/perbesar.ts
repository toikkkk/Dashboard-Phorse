"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { jalankanVT } from "@/components/Transisi";

type GayaVT = CSSStyleDeclaration & { viewTransitionName: string };

/**
 * Status "visual mana yang sedang diperbesar" (null = tidak ada) dan fungsi untuk menggantinya.
 * Perubahan dianimasikan dengan View Transition: semua elemen ber-`data-vtn` diberi nama sementara supaya browser
 * menggeser dan mengubah ukurannya sebagai gambar (mulus walau isinya berat), lalu nama dilepas lagi.
 */
export function usePerbesar(): [string | null, (id: string) => void] {
  const [lebar, setLebar] = useState<string | null>(null);
  const ubah = (id: string) => {
    const baru = lebar === id ? null : id;
    const el = [...document.querySelectorAll<HTMLElement>("[data-vtn]")];
    const beri = (nama: boolean) => el.forEach((e) => ((e.style as GayaVT).viewTransitionName = nama ? (e.dataset.vtn ?? "") : ""));
    beri(true);
    const mulai = jalankanVT(
      "perbesar",
      () => {
        flushSync(() => setLebar(baru));
        // elemen baru/diganti saat render ulang ikut diberi nama sebelum gambar akhir diambil
        document.querySelectorAll<HTMLElement>("[data-vtn]").forEach((e) => ((e.style as GayaVT).viewTransitionName = e.dataset.vtn ?? ""));
      },
      () => document.querySelectorAll<HTMLElement>("[data-vtn]").forEach((e) => ((e.style as GayaVT).viewTransitionName = "")),
    );
    if (!mulai) {
      beri(false);
      setLebar(baru);
    }
  };
  return [lebar, ubah];
}
