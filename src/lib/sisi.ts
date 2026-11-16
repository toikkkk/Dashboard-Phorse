"use client";

import { useSyncExternalStore } from "react";

// Status menu samping (lebar/diperkecil). Disimpan di localStorage sebagai kenyamanan per perangkat;
// bila penyimpanan tidak tersedia, status tetap berfungsi selama halaman terbuka.
const KUNCI = "phorse-sisi-kecil";
const pendengar = new Set<() => void>();
let nilai: boolean | null = null;

function baca(): boolean {
  if (nilai === null) {
    try {
      nilai = localStorage.getItem(KUNCI) === "1";
    } catch {
      nilai = false;
    }
  }
  return nilai;
}

function atur(v: boolean) {
  nilai = v;
  try {
    localStorage.setItem(KUNCI, v ? "1" : "0");
  } catch {
    // diabaikan: tidak tersimpan, tetapi tampilan tetap berubah
  }
  pendengar.forEach((f) => f());
}

function langganan(f: () => void) {
  pendengar.add(f);
  return () => {
    pendengar.delete(f);
  };
}

export function useSisi() {
  const kecil = useSyncExternalStore(langganan, baca, () => false);
  return { kecil, ubah: () => atur(!kecil) };
}
