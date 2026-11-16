"use client";

import {
  ChevronsLeft, Droplet, Leaf, LayoutDashboard, LogOut, PencilLine,
  Users, Waves, type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { flushSync } from "react-dom";
import { useStatus } from "@/lib/data";
import { MENU } from "@/lib/menu";
import { useSisi } from "@/lib/sisi";
import { KonfirmasiKeluar } from "./KonfirmasiKeluar";
import { Tip } from "./Tip";
import { jalankanVT, useTransisi } from "./Transisi";

const IKON: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/esg": Leaf,
  "/input": PencilLine,
  "/oil-catcher": Droplet,
  "/ipal-domestik": Waves,
  "/akun": Users,
};

// Geometri dibuat tetap agar ikon tidak bergeser saat menu melebar/menyempit: hanya lebar panel, lebar penanda,
// dan keterbacaan label yang beranimasi (semuanya lewat transform/opacity/width, tanpa lompatan tata letak).
const TINGGI = 44; // px, tinggi satu butir menu
const JEDA = 8; // px, jarak antar butir

/**
 * Menu samping. Layar lebar: panel biru berlabel dengan penanda aktif yang meluncur antar menu dan menyatu dengan
 * halaman; dapat diperkecil menjadi rel ikon putih. Layar kecil: bilah ikon di bawah.
 */
export function Sidebar() {
  const jalur = usePathname();
  const { pengguna } = useStatus();
  const { kecil, ubah } = useSisi();
  // Kolom isi bergeser sebagai satu gambar lewat View Transition; tanpa dukungan browser, langsung berganti.
  const ubahHalus = () => {
    if (!jalankanVT("sisi", () => flushSync(ubah))) ubah();
  };
  const { pindah } = useTransisi();
  const [tanyaKeluar, setTanyaKeluar] = useState(false);
  // Menu yang baru diklik langsung ditandai aktif (tanpa menunggu halaman tiba); gugur sendiri begitu jalur berubah.
  const [tujuan, setTujuan] = useState<{ href: string; dari: string } | null>(null);
  const aktifHref = tujuan && tujuan.dari === jalur ? tujuan.href : jalur;

  const menu = MENU.filter((m) => !m.peran || m.peran === pengguna?.peran);
  const cocok = (href: string) => (href === "/" ? aktifHref === "/" : aktifHref.startsWith(href));
  const idxAktif = menu.findIndex((m) => cocok(m.href));

  const warnaTeks = (aktif: boolean) =>
    aktif
      ? kecil ? "lg:text-[#8ec1ff]" : "lg:text-accent"
      : kecil ? "lg:text-ink-2 lg:hover:text-accent" : "lg:text-white/85 lg:hover:text-white";
  // lebar butir: lingkaran 44px saat diperkecil; saat lebar membentang sampai tepi kanan panel
  const lebarButir = kecil ? "lg:w-11 lg:rounded-[22px]" : "lg:w-[calc(100%-18px)] lg:rounded-[22px_0_0_22px]";
  const dasarButir =
    "relative flex h-11 shrink-0 items-center lg:ml-[18px] lg:transition-[width,border-radius,color,background-color] lg:duration-500 lg:ease-[cubic-bezier(0.22,1,0.36,1)]";
  const label = (tampil: boolean) =>
    `min-w-0 flex-1 truncate pr-6 text-left text-sm font-semibold transition-all duration-300 ${
      tampil ? "opacity-100 delay-150" : "pointer-events-none -translate-x-2 opacity-0"
    }`;

  return (
    <aside
      aria-label="Menu utama"
      className={`fixed inset-x-0 bottom-0 z-40 lg:inset-x-auto lg:inset-y-0 lg:left-0 lg:transition-[width,border-radius] lg:duration-500 lg:ease-[cubic-bezier(0.22,1,0.36,1)] ${
        kecil ? "lg:w-20 lg:rounded-r-[2rem]" : "lg:w-64 lg:rounded-r-[2.5rem]"
      }`}
    >
      {/* latar: biru saat lebar, putih saat diperkecil (dua lapis agar bisa memudar halus) */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--side-1)] to-[var(--side-2)] transition-opacity duration-500 lg:rounded-[inherit] lg:bg-gradient-to-b ${
          kecil ? "lg:opacity-0" : ""
        }`}
      />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 hidden rounded-[inherit] bg-card shadow-[0_18px_40px_-18px_rgba(20,70,150,0.4)] transition-opacity duration-500 lg:block ${
          kecil ? "opacity-100" : "opacity-0"
        }`}
      />

      <div className="relative flex h-full flex-col">
        {/* merek: ikon tetap di tempat, tulisan memudar */}
        <div className="hidden items-center pb-2 pt-6 lg:flex">
          <span
            aria-hidden
            className={`ml-[18px] flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-md transition-colors duration-500 ${
              kecil ? "bg-accent text-on-accent" : "bg-card text-accent"
            }`}
          >
            <Leaf className="size-5" />
          </span>
          <span
            className={`ml-3 min-w-0 whitespace-nowrap leading-tight text-white transition-all duration-300 ${
              kecil ? "pointer-events-none -translate-x-2 opacity-0" : "translate-x-0 opacity-100 delay-150"
            }`}
          >
            <span className="block text-sm font-extrabold">Env Monitor</span>
            <span className="block text-xs text-white/70">Regional JBN</span>
          </span>
        </div>

        <nav className={`px-3 py-2 max-lg:overflow-x-auto lg:flex-1 lg:overflow-x-hidden lg:px-0 lg:py-0 lg:pt-3 ${kecil ? "lg:overflow-visible" : "lg:overflow-y-auto"}`}>
          <div className="relative flex gap-1 lg:flex-col lg:gap-2">
            {/* penanda aktif: satu elemen yang meluncur ke menu terpilih */}
            {idxAktif >= 0 && (
              <span
                aria-hidden
                data-lebar={!kecil}
                style={{ transform: `translateY(${idxAktif * (TINGGI + JEDA)}px)` }}
                className={`sudut-aktif pointer-events-none absolute left-0 top-0 hidden h-11 lg:ml-[18px] lg:block lg:transition-[transform,width,border-radius,background-color] lg:duration-500 lg:ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  kecil ? "w-11 rounded-[22px] bg-ink shadow-md" : "w-[calc(100%-18px)] rounded-[22px_0_0_22px] bg-canvas"
                }`}
              />
            )}

            {menu.map((m, i) => {
              const Ikon = IKON[m.href];
              const aktif = cocok(m.href);
              const kelas = [
                dasarButir,
                lebarButir,
                "fokus-cincin group justify-center max-lg:size-11 max-lg:rounded-2xl lg:justify-start",
                aktif ? "max-lg:bg-card max-lg:text-accent max-lg:shadow-lg" : "max-lg:text-white/80 max-lg:hover:bg-white/15",
                warnaTeks(aktif),
                !aktif && (kecil ? "lg:hover:bg-accent-soft" : "lg:hover:bg-white/10"),
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <Tip
                  key={m.href}
                  sisi="kanan"
                  teks={kecil ? m.label : null}
                  className="masuk block shrink-0 lg:w-full"
                >
                  <Link
                    href={m.href}
                    aria-label={m.label}
                    aria-current={aktif ? "page" : undefined}
                    style={{ "--i": i } as React.CSSProperties}
                    className={kelas}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                      e.preventDefault();
                      setTujuan({ href: m.href, dari: jalur });
                      pindah(m.href);
                    }}
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center">
                      <Ikon className="size-5 transition-transform duration-200 group-hover:scale-110" strokeWidth={2} />
                    </span>
                    <span className={`hidden lg:block ${label(!kecil)}`}>{m.label}</span>
                  </Link>
                </Tip>
              );
            })}
          </div>
        </nav>

        <div className="hidden flex-col gap-2 pb-5 lg:flex">
          <Tip sisi="kanan" teks={kecil ? "Perluas menu" : null} className="block w-full">
            <button
              type="button"
              onClick={ubahHalus}
              aria-label={kecil ? "Perluas menu" : "Perkecil menu"}
              aria-expanded={!kecil}
              className={`fokus-cincin ${dasarButir} ${lebarButir} ${
                kecil ? "bg-accent-soft text-accent hover:bg-accent-kuat" : "text-white/85 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center">
                <ChevronsLeft className={`size-5 transition-transform duration-500 ${kecil ? "rotate-180" : ""}`} aria-hidden />
              </span>
              <span className={label(!kecil)}>Perkecil menu</span>
            </button>
          </Tip>
          <Tip sisi="kanan" teks={kecil ? "Keluar" : null} className="block w-full">
            <button
              type="button"
              onClick={() => setTanyaKeluar(true)}
              aria-label="Keluar"
              className={`fokus-cincin ${dasarButir} ${lebarButir} ${
                kecil ? "text-ink-2 hover:bg-[var(--buruk)]/10 hover:text-[var(--buruk)]" : "text-white/85 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="flex size-11 shrink-0 items-center justify-center">
                <LogOut className="size-5" aria-hidden />
              </span>
              <span className={label(!kecil)}>Keluar</span>
            </button>
          </Tip>
        </div>
      </div>
      <KonfirmasiKeluar buka={tanyaKeluar} onTutup={() => setTanyaKeluar(false)} />
    </aside>
  );
}
