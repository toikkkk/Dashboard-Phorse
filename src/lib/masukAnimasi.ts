"use client";

import gsap from "gsap";

/** Penanda "baru saja masuk": dibaca dashboard untuk memainkan separuh akhir transisi dari halaman masuk. */
export const KUNCI_MASUK = "phorse-baru-masuk";

const DAUN =
  '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>';

/**
 * Lapisan biru layar penuh (warna sama dengan menu samping) berisi logo dan titik pemuat.
 * Halaman masuk membuatnya lalu membentangkannya; dashboard membuat yang identik lalu menyusutkannya menjadi menu samping,
 * sehingga perpindahan antar dua halaman terlihat sebagai satu gerakan tanpa kedipan.
 */
export function buatOverlayMasuk(): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("data-overlay-masuk", "");
  el.setAttribute("aria-hidden", "true");
  Object.assign(el.style, {
    position: "fixed", inset: "0", zIndex: "90", display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: "18px", willChange: "clip-path", pointerEvents: "all",
    background: "linear-gradient(180deg, var(--side-1, #2f7be0), var(--side-2, #1a4fa3))",
  });
  el.innerHTML =
    `<div data-logo-masuk style="width:76px;height:76px;border-radius:24px;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;box-shadow:0 18px 40px -16px rgba(0,0,0,.4)">${DAUN}</div>` +
    '<p data-teks-masuk style="margin:0;color:rgba(255,255,255,.9);font:600 14px/1.2 var(--font-jakarta),system-ui,sans-serif;letter-spacing:.01em">Menyiapkan dashboard…</p>' +
    '<div data-titik-masuk style="display:flex;gap:7px"><i style="width:7px;height:7px;border-radius:50%;background:#fff;display:block"></i><i style="width:7px;height:7px;border-radius:50%;background:#fff;display:block"></i><i style="width:7px;height:7px;border-radius:50%;background:#fff;display:block"></i></div>';
  document.body.appendChild(el);
  gsap.to(el.querySelectorAll("[data-titik-masuk] i"), { y: -6, opacity: 0.45, duration: 0.45, repeat: -1, yoyo: true, stagger: 0.14, ease: "sine.inOut" });
  return el;
}

/** Menghapus lapisan beserta animasi titik pemuatnya. */
export function hapusOverlayMasuk(el: HTMLElement | null) {
  if (!el) return;
  gsap.killTweensOf(el.querySelectorAll("*"));
  gsap.killTweensOf(el);
  el.remove();
}
