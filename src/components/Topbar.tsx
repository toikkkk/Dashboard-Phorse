"use client";

import { Leaf, RotateCcw } from "lucide-react";
import { useStatus } from "@/lib/data";
import { CariLokasi } from "./CariLokasi";
import { Tip } from "./Tip";

export function Topbar() {
  const { filter, aturUlang } = useStatus();
  const adaFokus = filter.bulan > 0 || filter.lokasi !== null;


  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-5 sm:px-8">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="flex size-10 items-center justify-center rounded-2xl bg-accent text-on-accent shadow-md">
          <Leaf className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-extrabold text-ink">Env Monitor</p>
          <p className="text-xs text-ink-2">Regional Jatimbalinus</p>
        </div>
      </div>

      <div className="order-last flex w-full justify-start sm:order-0 sm:ml-4 sm:w-auto sm:flex-1">
        <CariLokasi />
      </div>

      <div className="ml-auto flex items-center gap-2.5">
        <Tip teks={adaFokus ? "Hapus fokus bulan dan lokasi (Esc)" : "Klik grafik atau baris lokasi untuk memfokuskan visual lain"} sisi="kiri-bawah">
          <button
            type="button"
            onClick={aturUlang}
            disabled={!adaFokus}
            className="fokus-cincin flex h-11 items-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-canvas transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-35"
          >
            <RotateCcw className="size-4" aria-hidden />
            <span className="hidden md:inline">Atur ulang fokus</span>
            <span className="sr-only md:hidden">Atur ulang fokus</span>
          </button>
        </Tip>
      </div>
    </header>
  );
}
