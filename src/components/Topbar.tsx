"use client";

import { Leaf, LogOut, RotateCcw } from "lucide-react";
import { useStatus } from "@/lib/data";
import { useSisi } from "@/lib/sisi";
import { useState } from "react";
import { CariLokasi } from "./CariLokasi";
import { KonfirmasiKeluar } from "./KonfirmasiKeluar";
import { Tip } from "./Tip";

const inisial = (nama: string) =>
  nama.split(/\s+/).filter(Boolean).slice(0, 2).map((k) => k[0]?.toUpperCase()).join("") || "?";

export function Topbar() {
  const { filter, aturUlang, pengguna, data } = useStatus();
  const { kecil } = useSisi();
  const [tanyaKeluar, setTanyaKeluar] = useState(false);
  const idxTerminal = data && pengguna?.lokasiId ? data.lokasi.findIndex((l) => l.id === pengguna.lokasiId) : -1;
  const terminal = idxTerminal >= 0 && data ? data.lokasi[idxTerminal] : null;
  // Tampilan awal: terminal milik akun (atau semua lokasi untuk admin), tanpa fokus bulan.
  const awal = terminal ? idxTerminal : null;
  const bukanAwal = filter.bulan > 0 || filter.lokasi !== awal;

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-5 sm:px-8">
      <div className={`items-center gap-2.5 ${kecil ? "flex" : "flex lg:hidden"}`}>
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
        <Tip
          teks={bukanAwal ? "Kembali ke tampilan awal (Esc)" : "Klik grafik atau baris lokasi untuk memfokuskan visual lain"}
          sisi="kiri-bawah"
        >
          <button
            type="button"
            onClick={aturUlang}
            disabled={!bukanAwal}
            className="fokus-cincin flex h-11 items-center gap-2 rounded-2xl bg-ink px-4 text-sm font-semibold text-canvas transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-35"
          >
            <RotateCcw className="size-4" aria-hidden />
            <span className="hidden md:inline">{terminal ? "Kembali ke terminal saya" : "Atur ulang fokus"}</span>
            <span className="sr-only md:hidden">Atur ulang fokus</span>
          </button>
        </Tip>

        {pengguna && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-line bg-card p-1.5 shadow-sm">
            <span aria-hidden className="flex size-8 items-center justify-center rounded-xl bg-accent-soft text-xs font-extrabold text-accent">
              {inisial(terminal?.singkat ?? pengguna.nama)}
            </span>
            <span className="hidden max-w-40 leading-tight lg:block">
              <span className="block truncate text-xs font-bold text-ink">{terminal?.singkat ?? pengguna.nama}</span>
              <span className="block truncate text-[11px] text-ink-2">{pengguna.peran === "admin" ? "Admin regional" : "Akun terminal"}</span>
            </span>
            <div className="lg:hidden">
              <Tip teks="Keluar" sisi="kiri-bawah">
                <button
                  type="button"
                  onClick={() => setTanyaKeluar(true)}
                  aria-label="Keluar"
                  className="fokus-cincin flex size-8 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-accent-soft hover:text-accent"
                >
                  <LogOut className="size-4" aria-hidden />
                </button>
              </Tip>
            </div>
          </div>
        )}
      </div>
      <KonfirmasiKeluar buka={tanyaKeluar} onTutup={() => setTanyaKeluar(false)} />
    </header>
  );
}
