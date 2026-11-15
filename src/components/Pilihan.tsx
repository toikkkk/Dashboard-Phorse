"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type Opsi = {
  nilai: number;
  label: string;
  /** Teks kecil di sisi kanan (mis. "Jan–Okt"). */
  catatan?: string;
  /** Nama grup; opsi berurutan dengan grup sama dikelompokkan di bawah satu judul. */
  grup?: string;
  /** Ditampilkan lebih pudar (tetap bisa dipilih). */
  redup?: boolean;
};

/**
 * Dropdown pilihan tunggal yang mengikuti gaya dashboard (pola ARIA "select-only combobox").
 * Keyboard: Enter/Spasi/↓ membuka, ↑↓ berpindah, Home/End, Enter memilih, Esc menutup.
 */
export function Pilihan({
  label, nilai, opsi, onPilih, disabled = false, title, lebarMaks = "max-w-52",
}: {
  label: string;
  nilai: number;
  opsi: Opsi[];
  onPilih: (nilai: number) => void;
  disabled?: boolean;
  title?: string;
  lebarMaks?: string;
}) {
  const [buka, setBuka] = useState(false);
  const [aktif, setAktif] = useState(0);
  const akar = useRef<HTMLDivElement>(null);
  const daftar = useRef<HTMLUListElement>(null);
  const id = useId();
  const terpilih = opsi.find((o) => o.nilai === nilai);

  // Tutup saat klik di luar.
  useEffect(() => {
    if (!buka) return;
    const luar = (e: PointerEvent) => {
      if (akar.current && !akar.current.contains(e.target as Node)) setBuka(false);
    };
    document.addEventListener("pointerdown", luar);
    return () => document.removeEventListener("pointerdown", luar);
  }, [buka]);

  // Pastikan opsi aktif selalu terlihat saat daftar digulir dengan keyboard.
  useEffect(() => {
    if (buka) daftar.current?.querySelector(`[data-i="${aktif}"]`)?.scrollIntoView({ block: "nearest" });
  }, [buka, aktif]);

  const bukaDaftar = () => {
    setAktif(Math.max(0, opsi.findIndex((o) => o.nilai === nilai)));
    setBuka(true);
  };
  const pilih = (i: number) => {
    onPilih(opsi[i].nilai);
    setBuka(false);
  };

  const tekan = (e: React.KeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!buka) bukaDaftar();
        else setAktif((a) => Math.min(a + 1, opsi.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!buka) bukaDaftar();
        else setAktif((a) => Math.max(a - 1, 0));
        break;
      case "Home":
        if (buka) { e.preventDefault(); setAktif(0); }
        break;
      case "End":
        if (buka) { e.preventDefault(); setAktif(opsi.length - 1); }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (buka) pilih(aktif);
        else bukaDaftar();
        break;
      case "Escape":
        if (buka) { e.preventDefault(); e.stopPropagation(); setBuka(false); }
        break;
      case "Tab":
        setBuka(false);
        break;
    }
  };

  return (
    <div ref={akar} className="relative">
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={buka}
        aria-controls={`${id}-daftar`}
        aria-activedescendant={buka ? `${id}-${aktif}` : undefined}
        aria-label={`${label}: ${terpilih?.label ?? ""}`}
        disabled={disabled}
        title={title}
        onClick={() => (buka ? setBuka(false) : bukaDaftar())}
        onKeyDown={tekan}
        className={`pil fokus-cincin h-11 gap-2.5 px-4 text-sm transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${
          buka ? "shadow-(--bayangan-naik) ring-1 ring-accent" : ""
        }`}
      >
        <span className="text-xs text-ink-2">{label}</span>
        <span className={`truncate font-semibold text-ink ${lebarMaks}`}>{terpilih?.label}</span>
        <ChevronDown
          aria-hidden
          className={`size-4 shrink-0 text-ink-2 transition-transform duration-200 ${buka ? "rotate-180 text-accent" : ""}`}
        />
      </button>

      {buka && (
        <ul
          ref={daftar}
          id={`${id}-daftar`}
          role="listbox"
          aria-label={label}
          className="absolute left-0 top-[calc(100%+8px)] z-50 max-h-80 min-w-full w-max max-w-xs overflow-auto rounded-2xl border border-line bg-card p-1.5 shadow-(--bayangan-naik)"
          style={{ animation: "muncul 0.18s ease-out" }}
        >
          {opsi.map((o, i) => {
            const awalGrup = o.grup && o.grup !== opsi[i - 1]?.grup;
            const dipilih = o.nilai === nilai;
            return (
              <li key={o.nilai} role="presentation">
                {awalGrup && (
                  <div className="px-3 pb-1 pt-2.5 text-[11px] font-bold uppercase tracking-wide text-muted">{o.grup}</div>
                )}
                <div
                  id={`${id}-${i}`}
                  data-i={i}
                  role="option"
                  aria-selected={dipilih}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => pilih(i)}
                  onMouseEnter={() => setAktif(i)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                    i === aktif ? "bg-accent-soft" : ""
                  } ${dipilih ? "font-bold text-ink" : o.redup ? "text-muted" : "text-ink-2"}`}
                >
                  <span className="flex-1 whitespace-nowrap">{o.label}</span>
                  {o.catatan && <span className="text-xs font-normal text-muted">{o.catatan}</span>}
                  <Check aria-hidden className={`size-4 shrink-0 text-accent ${dipilih ? "" : "invisible"}`} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
