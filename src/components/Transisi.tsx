"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useLayoutEffect, useRef, type ReactNode } from "react";

type Konteks = { pindah: (href: string) => void };
const KonteksTransisi = createContext<Konteks>({ pindah: () => {} });
export const useTransisi = () => useContext(KonteksTransisi);

export type DokumenVT = Document & {
  startViewTransition?: (panggil: () => void | Promise<void>) => {
    finished: Promise<unknown>;
    ready: Promise<unknown>;
    updateCallbackDone: Promise<unknown>;
  };
};
type JenisVT = "halaman" | "sisi";

/** Menjalankan View Transition bernama (gaya animasinya dipilih lewat atribut data-vt di <html>). */
export function jalankanVT(jenis: JenisVT, ubah: () => void | Promise<void>): boolean {
  const dok = document as DokumenVT;
  if (!dok.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  dok.documentElement.dataset.vt = jenis;
  const vt = dok.startViewTransition(ubah);
  // Transisi yang dilewati karena transisi baru dimulai menolak (reject) janjinya; itu wajar, jangan jadi galat.
  const abaikan = () => {};
  vt.ready.catch(abaikan);
  vt.updateCallbackDone.catch(abaikan);
  vt.finished.catch(abaikan).finally(() => {
    delete dok.documentElement.dataset.vt;
  });
  return true;
}


/**
 * Perpindahan antar bagian: halaman berikutnya naik dan menumpuk di atas halaman sebelumnya.
 *
 * Memakai View Transitions API: browser memotret halaman lama dan halaman baru lalu menganimasikan kedua
 * gambar itu di compositor, sehingga tetap mulus (60 fps) walau halamannya berisi banyak grafik. Gaya animasi
 * ada di globals.css (`::view-transition-*(isi)`). Browser tanpa API ini berpindah halaman biasa.
 */
export function PenyediaTransisi({ children }: { children: ReactNode }) {
  const router = useRouter();
  const jalur = usePathname();
  const selesai = useRef<(() => void) | null>(null);
  const sibuk = useRef(false);

  // Halaman baru sudah dirender: izinkan browser memotretnya dan memulai animasi.
  useLayoutEffect(() => {
    if (!selesai.current) return;
    window.scrollTo({ top: 0 });
    const lepas = selesai.current;
    selesai.current = null;
    // Langsung, tanpa requestAnimationFrame: selama menunggu, browser menahan rAF sehingga akan menunggu tanpa akhir.
    lepas();
  }, [jalur]);

  const pindah = useCallback(
    (href: string) => {
      if (href === jalur) return;
      if (sibuk.current) {
        router.push(href);
        return;
      }
      sibuk.current = true;
      const mulai = jalankanVT(
        "halaman",
        () =>
          new Promise<void>((resolve) => {
            selesai.current = resolve;
            router.push(href);
            // Pengaman: jika halaman tidak kunjung berganti, lepaskan agar layar tidak membeku.
            window.setTimeout(() => {
              if (selesai.current === resolve) selesai.current = null;
              resolve();
            }, 2000);
          }),
      );
      if (!mulai) {
        sibuk.current = false;
        router.push(href);
        return;
      }
      // Dilepas setelah animasi selesai (atribut data-vt dihapus oleh jalankanVT).
      window.setTimeout(() => {
        sibuk.current = false;
      }, 1200);
    },
    [jalur, router],
  );

  return <KonteksTransisi.Provider value={{ pindah }}>{children}</KonteksTransisi.Provider>;
}

/** Area isi halaman yang ikut dianimasikan saat berpindah bagian. */
export function AreaIsi({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`area-isi bg-canvas ${className}`}>{children}</div>;
}
