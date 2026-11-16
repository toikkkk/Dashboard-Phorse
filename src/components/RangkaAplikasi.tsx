"use client";

import { useSisi } from "@/lib/sisi";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AreaIsi, PenyediaTransisi } from "./Transisi";

/** Kerangka aplikasi layar penuh: menu samping setinggi layar, bilah atas, dan area isi dengan transisi. */
export function RangkaAplikasi({ children }: { children: React.ReactNode }) {
  const { kecil } = useSisi();
  return (
    <PenyediaTransisi>
      <div className="min-h-screen bg-canvas">
        <Sidebar />
        <div className={`pb-24 lg:pb-8 ${kecil ? "lg:pl-24" : "lg:pl-68"}`}>
          <Topbar />
          <AreaIsi className="px-4 pb-6 sm:px-8">
            <main>{children}</main>
          </AreaIsi>
        </div>
      </div>
    </PenyediaTransisi>
  );
}
