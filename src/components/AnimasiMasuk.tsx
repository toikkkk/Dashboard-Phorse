"use client";

import gsap from "gsap";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { useStatus } from "@/lib/data";
import { buatOverlayMasuk, hapusOverlayMasuk, KUNCI_MASUK } from "@/lib/masukAnimasi";

const AMAN_MS = 9000;

/**
 * Separuh akhir transisi dari halaman masuk. Bila ada penanda "baru masuk", sebelum layar pertama digambar dibuat
 * lapisan biru yang identik dengan penutup dari halaman masuk (tidak ada kedipan). Begitu data dashboard tiba,
 * lapisan itu menyusut ke bentuk dan posisi menu samping, lalu memudar; kartu-kartu mulai masuk bersamaan.
 */
export function AnimasiMasuk() {
  const { data, galat } = useStatus();
  const overlay = useRef<HTMLDivElement | null>(null);
  const jalan = useRef(false);

  const bersihkan = useCallback(() => {
    try {
      sessionStorage.removeItem(KUNCI_MASUK);
    } catch {
      // abaikan
    }
    delete document.documentElement.dataset.masuk;
    hapusOverlayMasuk(overlay.current);
    overlay.current = null;
  }, []);

  // Dijalankan sebelum layar pertama digambar: lapisan sudah menutupi dashboard yang baru dirender.
  useLayoutEffect(() => {
    let ada = false;
    try {
      ada = sessionStorage.getItem(KUNCI_MASUK) === "1";
    } catch {
      // abaikan
    }
    if (!ada) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      try {
        sessionStorage.removeItem(KUNCI_MASUK);
      } catch {
        // abaikan
      }
      return;
    }
    // Animasi masuk kartu ditahan (opacity 0) sampai lapisan mulai menyusut.
    document.documentElement.dataset.masuk = "tahan";
    overlay.current = buatOverlayMasuk();
    const aman = window.setTimeout(bersihkan, AMAN_MS);
    return () => {
      window.clearTimeout(aman);
      hapusOverlayMasuk(overlay.current);
      overlay.current = null;
      delete document.documentElement.dataset.masuk;
    };
  }, [bersihkan]);

  // Data tiba (atau gagal): menyusutkan lapisan menjadi menu samping.
  useEffect(() => {
    const el = overlay.current;
    if (!el || jalan.current || !(data || galat)) return;
    jalan.current = true;
    // dua bingkai agar tata letak dashboard (termasuk menu samping) sudah final saat diukur
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const menu = document.querySelector("aside");
        const r = menu?.getBoundingClientRect();
        const gaya = menu ? getComputedStyle(menu) : null;
        const rad = gaya
          ? [gaya.borderTopLeftRadius, gaya.borderTopRightRadius, gaya.borderBottomRightRadius, gaya.borderBottomLeftRadius].map((v) => parseFloat(v) || 0)
          : [0, 0, 0, 0];
        const akhir = r
          ? `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px round ${rad[0]}px ${rad[1]}px ${rad[2]}px ${rad[3]}px)`
          : "inset(0px 0px 100% 0px round 0px 0px 0px 0px)";
        gsap
          .timeline({ onComplete: bersihkan })
          .to(el.querySelectorAll("[data-logo-masuk], [data-teks-masuk], [data-titik-masuk]"), { opacity: 0, scale: 0.9, duration: 0.3, ease: "power2.in" }, 0)
          .add(() => {
            delete document.documentElement.dataset.masuk; // kartu mulai masuk
          }, 0.2)
          .fromTo(
            el,
            { clipPath: "inset(0px 0px 0px 0px round 0px 0px 0px 0px)" },
            { clipPath: akhir, duration: 1.05, ease: "power4.inOut" },
            0.18,
          )
          .to(el, { opacity: 0, duration: 0.3, ease: "none" }, ">-0.25");
      }),
    );
  }, [data, galat, bersihkan]);

  return null;
}
