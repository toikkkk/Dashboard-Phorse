"use client";

import {
  BadgeCheck, Droplet, FileCheck2, FlaskConical, Leaf, LayoutDashboard, Siren, TriangleAlert, Waves,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU } from "@/lib/menu";
import { Tip } from "./Tip";

const IKON: Record<string, LucideIcon> = {
  "/": LayoutDashboard,
  "/esg": Leaf,
  "/pelaporan-simpel": FileCheck2,
  "/risiko-bencana": TriangleAlert,
  "/kompatibilitas-b3": FlaskConical,
  "/perizinan-lingkungan": BadgeCheck,
  "/oil-catcher": Droplet,
  "/ipal-domestik": Waves,
  "/kedaruratan-b3": Siren,
};

/** Sidebar vertikal di layar lebar; berubah menjadi bilah bawah di layar kecil. */
export function Sidebar() {
  const jalur = usePathname();
  return (
    <aside
      aria-label="Menu utama"
      className="fixed inset-x-0 bottom-0 z-40 lg:absolute lg:inset-y-0 lg:left-0 lg:right-auto lg:w-24 lg:rounded-r-[3rem] lg:bg-gradient-to-b lg:from-[var(--side-1)] lg:to-[var(--side-2)] lg:pb-0"
    >
      <nav className="flex gap-1 overflow-x-auto bg-gradient-to-r from-[var(--side-1)] to-[var(--side-2)] px-3 py-2 lg:sticky lg:top-8 lg:flex-col lg:items-center lg:gap-2.5 lg:overflow-visible lg:bg-none lg:px-0 lg:py-0 lg:pt-8">
        {MENU.map((m, i) => {
          const Ikon = IKON[m.href];
          const aktif = m.href === "/" ? jalur === "/" : jalur.startsWith(m.href);
          return (
            <Tip
              key={m.href}
              sisi="kanan"
              teks={m.tersedia ? m.label : `${m.label} · belum ada data`}
              className="masuk shrink-0"
            >
              <Link
                href={m.href}
                aria-label={m.label}
                aria-current={aktif ? "page" : undefined}
                style={{ "--i": i } as React.CSSProperties}
                className={`fokus-cincin group relative flex size-11 items-center justify-center rounded-2xl transition-all duration-200 lg:size-12 ${
                  aktif
                    ? "bg-card text-accent shadow-lg"
                    : "text-white/80 hover:-translate-y-0.5 hover:bg-white/15 hover:text-white"
                }`}
              >
                <Ikon className="size-5 transition-transform duration-200 group-hover:scale-110" strokeWidth={2} />
                {!m.tersedia && (
                  <span
                    aria-hidden
                    className="absolute right-1.5 top-1.5 size-2 rounded-full border border-[var(--side-2)] bg-white/60"
                  />
                )}
              </Link>
            </Tip>
          );
        })}
      </nav>
    </aside>
  );
}
