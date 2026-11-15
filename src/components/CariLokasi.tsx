"use client";

import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useStatus } from "@/lib/data";

/** Pencarian lokasi: memilih hasil memfokuskan seluruh dashboard ke lokasi itu. Tekan "/" untuk membuka. */
export function CariLokasi() {
  const { data, fokus } = useStatus();
  const [kata, setKata] = useState("");
  const [buka, setBuka] = useState(false);
  const [aktif, setAktif] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const idList = useId();

  const hasil = useMemo(() => {
    if (!data) return [];
    const q = kata.trim().toLowerCase();
    return data.lokasi
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => !q || `${l.singkat} ${l.tipe} ${l.provinsi}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [data, kata]);

  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      const t = e.target;
      const mengetik = t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName);
      if (e.key === "/" && !mengetik) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, []);

  const pilih = (i: number) => {
    fokus({ lokasi: i }, "cari");
    setKata("");
    setBuka(false);
    input.current?.blur();
  };

  return (
    <div className="relative w-full max-w-xs">
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input
        ref={input}
        type="text"
        role="combobox"
        aria-expanded={buka}
        aria-controls={idList}
        aria-autocomplete="list"
        aria-activedescendant={buka && hasil[aktif] ? `${idList}-${aktif}` : undefined}
        aria-label="Cari lokasi"
        placeholder="Cari lokasi…  ( / )"
        disabled={!data}
        value={kata}
        onChange={(e) => {
          setKata(e.target.value);
          setAktif(0);
          setBuka(true);
        }}
        onFocus={() => setBuka(true)}
        onBlur={() => setTimeout(() => setBuka(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setBuka(true);
            setAktif((a) => Math.min(a + 1, hasil.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAktif((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && buka && hasil[aktif]) {
            e.preventDefault();
            pilih(hasil[aktif].i);
          } else if (e.key === "Escape") {
            setBuka(false);
            input.current?.blur();
          }
        }}
        className="fokus-cincin h-11 w-full rounded-full border border-line bg-card pl-10 pr-4 text-sm text-ink shadow-sm transition-shadow placeholder:text-muted focus:shadow-md disabled:opacity-60"
      />
      {buka && (
        <ul
          id={idList}
          role="listbox"
          aria-label="Hasil pencarian lokasi"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-auto rounded-2xl border border-line bg-card p-1.5 shadow-(--bayangan-naik)"
        >
          {hasil.length === 0 && <li className="px-3 py-2 text-sm text-ink-2">Lokasi tidak ditemukan.</li>}
          {hasil.map(({ l, i }, n) => (
            <li
              key={l.id}
              id={`${idList}-${n}`}
              role="option"
              aria-selected={n === aktif}
              onMouseDown={(e) => {
                e.preventDefault();
                pilih(i);
              }}
              onMouseEnter={() => setAktif(n)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 rounded-xl px-3 py-2 text-sm ${
                n === aktif ? "bg-accent-soft text-ink" : "text-ink-2"
              }`}
            >
              <span className="font-medium text-ink">{l.singkat}</span>
              <span className="text-xs">{l.provinsi}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
