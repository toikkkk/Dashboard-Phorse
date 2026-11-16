"use client";

import { useSisi } from "@/lib/sisi";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AreaIsi, PenyediaTransisi } from "./Transisi";

/**
 * Kerangka aplikasi layar penuh. Menu samping tetap; kolom isi (bilah atas + halaman) adalah wadah gulir sendiri
 * setinggi layar. Dengan begitu elemen yang dianimasikan saat berpindah halaman hanya seukuran layar (bukan seukuran
 * halaman yang bisa ribuan piksel), dan posisi gulir ikut terekam dalam gambar halaman lama.
 */
export function RangkaAplikasi({ children }: { children: React.ReactNode }) {
  const { kecil } = useSisi();
  return (
    <PenyediaTransisi>
      <div className="h-dvh overflow-hidden bg-canvas">
        <Sidebar />
        <div className={`konten h-dvh overflow-y-auto overflow-x-hidden bg-canvas ${kecil ? "lg:ml-24" : "lg:ml-68"}`}>
          <Topbar />
          <AreaIsi className="px-4 pb-28 pt-3 sm:px-8 lg:pb-6">
            <main>{children}</main>
          </AreaIsi>
        </div>
      </div>
    </PenyediaTransisi>
  );
}
