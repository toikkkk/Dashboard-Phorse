"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { Tip } from "./Tip";

/** Status "diperlebar" sebuah kartu. Memperlebar satu kartu menggeser kartu lain (diatur halaman induk). */
export type Perlebar = { aktif: boolean; onToggle: () => void };

export function TombolPerlebar({
  perlebar, teksAktif, teksNonaktif, hanyaLebar = false,
}: {
  perlebar: Perlebar;
  teksAktif: string;
  teksNonaktif: string;
  /** true = tombol hanya tampil di layar lebar (efek menggeser hanya terjadi saat kartu berdampingan). */
  hanyaLebar?: boolean;
}) {
  const Ikon = perlebar.aktif ? Minimize2 : Maximize2;
  const teks = perlebar.aktif ? teksAktif : teksNonaktif;
  return (
    <Tip teks={teks} sisi="kiri-bawah" className={hanyaLebar ? "max-xl:hidden" : ""}>
      <button
        type="button"
        onClick={perlebar.onToggle}
        aria-pressed={perlebar.aktif}
        aria-label={teks}
        className={`fokus-cincin flex size-9 shrink-0 items-center justify-center rounded-xl transition-all hover:-translate-y-0.5 ${
          perlebar.aktif ? "bg-accent text-on-accent shadow-md" : "bg-accent-soft text-accent hover:bg-accent-kuat"
        }`}
      >
        <Ikon className="size-4" aria-hidden />
      </button>
    </Tip>
  );
}
