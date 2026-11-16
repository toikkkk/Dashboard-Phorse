"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { sedangTransisi } from "./transisiStatus";

const QUERY = "(prefers-reduced-motion: reduce)";

function langganan(cb: () => void) {
  const m = window.matchMedia(QUERY);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
}

/** True jika pengguna meminta animasi dikurangi. */
export function useKurangiGerak(): boolean {
  return useSyncExternalStore(
    langganan,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

/** Angka yang berjalan dari nilai sebelumnya ke `target` (easing keluar). */
export function useAngkaBerjalan(target: number, ms = 800): number {
  const kurang = useKurangiGerak();
  const [nilai, setNilai] = useState(0);
  const dari = useRef(0);

  useEffect(() => {
    // Saat halaman sedang digeser masuk (View Transition), angka langsung tampil utuh.
    if (sedangTransisi()) {
      dari.current = target;
      const r = requestAnimationFrame(() => setNilai(target));
      return () => cancelAnimationFrame(r);
    }
    const mulai = performance.now();
    const awal = dari.current;
    let raf = 0;
    const langkah = (t: number) => {
      const p = kurang ? 1 : Math.min(1, (t - mulai) / ms);
      const v = awal + (target - awal) * (1 - Math.pow(1 - p, 3));
      dari.current = v;
      setNilai(v);
      if (p < 1) raf = requestAnimationFrame(langkah);
    };
    raf = requestAnimationFrame(langkah);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, kurang]);

  return nilai;
}
