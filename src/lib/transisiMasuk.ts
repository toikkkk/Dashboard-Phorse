"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type RefObject } from "react";
import { buatOverlayMasuk, hapusOverlayMasuk, KUNCI_MASUK } from "./masukAnimasi";

gsap.registerPlugin(useGSAP);

/**
 * Memainkan transisi keluar halaman masuk setelah Server Action berhasil.
 * - Menuju dashboard ("/"): formulir dan ilustrasi memudar, lalu lapisan biru membentang dari tombol hingga menutupi layar;
 *   setelah itu pindah halaman. Dashboard melanjutkan dengan menyusutkan lapisan itu menjadi menu samping (AnimasiMasuk).
 * - Menuju halaman lain (mis. ganti sandi): formulir memudar singkat lalu pindah.
 * Tanpa dukungan gerak (atau pengguna meminta gerak dikurangi): langsung pindah.
 */
export function useTransisiMasuk(ok: boolean | undefined, tujuan: string | undefined, form: RefObject<HTMLFormElement | null>) {
  const router = useRouter();
  const overlay = useRef<HTMLDivElement | null>(null);
  const sudah = useRef(false);

  // Lapisan dibiarkan menutupi layar sampai halaman ini benar-benar dilepas (berganti ke dashboard).
  useEffect(
    () => () => {
      hapusOverlayMasuk(overlay.current);
      overlay.current = null;
    },
    [],
  );

  useGSAP(
    () => {
      if (!ok || !tujuan || sudah.current) return;
      sudah.current = true;
      const pergi = () => router.push(tujuan);
      router.prefetch(tujuan);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return pergi();

      const bentuk = form.current;
      if (tujuan !== "/") {
        gsap.to(bentuk, { opacity: 0, y: -12, duration: 0.35, ease: "power2.in", onComplete: pergi });
        return;
      }

      const tombol = bentuk?.querySelector("button[type=submit]")?.getBoundingClientRect();
      const x = tombol ? tombol.left + tombol.width / 2 : window.innerWidth * 0.75;
      const y = tombol ? tombol.top + tombol.height / 2 : window.innerHeight / 2;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) + 24;

      const el = buatOverlayMasuk();
      overlay.current = el;
      gsap.set(el, { clipPath: `circle(0px at ${x}px ${y}px)` });
      gsap.set(el.querySelectorAll("[data-logo-masuk], [data-teks-masuk], [data-titik-masuk]"), { opacity: 0 });

      gsap
        .timeline({
          onComplete: () => {
            try {
              sessionStorage.setItem(KUNCI_MASUK, "1");
            } catch {
              // tanpa penyimpanan, dashboard tetap tampil biasa (tanpa separuh akhir transisi)
            }
            pergi();
          },
        })
        .to(bentuk?.children ?? [], { y: -14, opacity: 0, duration: 0.35, stagger: 0.04, ease: "power2.in" }, 0)
        .to(".kartu-auth, [data-ilus], [data-merek]", { opacity: 0, scale: 0.96, duration: 0.55, ease: "power2.in" }, 0)
        .to(el, { clipPath: `circle(${radius}px at ${x}px ${y}px)`, duration: 0.95, ease: "power3.inOut" }, 0.12)
        .fromTo(
          el.querySelector("[data-logo-masuk]"),
          { scale: 0.6, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.55, ease: "back.out(1.7)" },
          0.7,
        )
        .to(el.querySelectorAll("[data-teks-masuk], [data-titik-masuk]"), { opacity: 1, duration: 0.35, stagger: 0.08 }, 0.85);
    },
    { dependencies: [ok, tujuan] },
  );
}
