"use client";

import { useSyncExternalStore } from "react";

// Penanda "sedang ada View Transition". Selama itu, animasi berbasis JavaScript (angka berjalan, animasi masuk grafik)
// ditahan: halaman baru dianimasikan sebagai satu lapisan oleh browser, dan perubahan per bingkai di dalamnya
// membuat lapisan besar itu digambar ulang terus sehingga geseran terasa patah.
let aktif = false;
const pendengar = new Set<() => void>();

export const sedangTransisi = () => aktif;

export function aturTransisi(v: boolean) {
  if (aktif === v) return;
  aktif = v;
  pendengar.forEach((f) => f());
}

export function useSedangTransisi(): boolean {
  return useSyncExternalStore(
    (f) => {
      pendengar.add(f);
      return () => {
        pendengar.delete(f);
      };
    },
    () => aktif,
    () => false,
  );
}
