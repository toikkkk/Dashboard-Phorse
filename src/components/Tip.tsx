"use client";

import { cloneElement, useId, type ReactElement, type ReactNode } from "react";

type Sisi = "bawah" | "atas" | "kanan" | "kiri-bawah";

/**
 * Tooltip ringan: muncul saat hover dan saat elemen menerima fokus keyboard.
 * Elemen anak mendapat aria-describedby ke teks tooltip.
 */
export function Tip({
  teks, sisi = "bawah", children, className = "",
}: {
  /** Kosong = tanpa tooltip. */
  teks?: ReactNode;
  sisi?: Sisi;
  children: ReactElement<{ "aria-describedby"?: string }>;
  className?: string;
}) {
  const id = useId();
  if (!teks) return <span className={className}>{children}</span>;
  return (
    <span className={`tip-wrap ${className}`}>
      {cloneElement(children, { "aria-describedby": id })}
      <span id={id} role="tooltip" className={`tip tip-${sisi}`}>
        {teks}
      </span>
    </span>
  );
}
