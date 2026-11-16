"use client";

import { useEffect, useState, type ReactNode } from "react";

type Tip = { x: number; y: number; bawah: boolean; baris: string[] };

/**
 * Tooltip mengambang untuk banyak sel kecil (peta panas, matriks). Elemen di dalamnya cukup memberi atribut
 * `data-tip` (baris dipisah \n; baris pertama dicetak tebal). Posisinya `fixed`, jadi tidak terpotong oleh
 * wadah yang bisa digulir, dan otomatis pindah ke bawah sel bila terlalu dekat tepi atas layar.
 */
export function AreaTip({ children, className = "" }: { children: ReactNode; className?: string }) {
  const [tip, setTip] = useState<Tip | null>(null);

  const tampil = (sasaran: EventTarget | null) => {
    const el = sasaran instanceof Element ? sasaran.closest<HTMLElement>("[data-tip]") : null;
    if (!el || !el.dataset.tip) return setTip(null);
    const r = el.getBoundingClientRect();
    const bawah = r.top < 130;
    setTip({
      x: Math.min(Math.max(r.left + r.width / 2, 150), window.innerWidth - 150),
      y: bawah ? r.bottom + 8 : r.top - 8,
      bawah,
      baris: el.dataset.tip.split("\n"),
    });
  };

  // Menggulir (di kolom isi atau jendela) membuat posisi sel berubah; tutup saja.
  useEffect(() => {
    if (!tip) return;
    const tutup = () => setTip(null);
    window.addEventListener("scroll", tutup, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", tutup, { capture: true });
  }, [tip]);

  return (
    <div
      className={className}
      onPointerOver={(e) => tampil(e.target)}
      onPointerLeave={() => setTip(null)}
      onFocus={(e) => tampil(e.target)}
      onBlur={() => setTip(null)}
    >
      {children}
      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-[70] w-max max-w-[18rem] rounded-xl bg-ink px-3 py-2 text-xs leading-snug text-canvas shadow-[var(--bayangan-naik)]"
          style={{ left: tip.x, top: tip.y, transform: `translate(-50%, ${tip.bawah ? "0" : "-100%"})`, animation: "muncul 0.15s ease-out" }}
        >
          {tip.baris.map((b, i) => (
            <span key={i} className={`block ${i === 0 ? "font-bold" : "font-medium text-canvas/85"}`}>
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
