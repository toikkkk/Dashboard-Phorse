"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { tahunBulanan, tahunLengkapTerakhir } from "./hitung";
import type { Dataset, Filter } from "./tipe";

export type Status = {
  data: Dataset | null;
  galat: string | null;
  filter: Filter;
  /** id visual yang terakhir diklik untuk memfokuskan visual lain (null = pilihan dari menu filter). */
  sumber: string | null;
  /** Dipakai kontrol filter di atas halaman. */
  ubahFilter: (perubahan: Partial<Filter>) => void;
  /** Dipakai saat sebuah visual diklik: mengubah filter bersama dan menandai visual itu sebagai sumber. */
  fokus: (perubahan: Partial<Filter>, sumber: string) => void;
  /** Menghapus fokus bulan dan lokasi (tahun dipertahankan). */
  aturUlang: () => void;
  /** Indikator yang sedang ditelusuri di halaman Data ESG (dipilih dari kartu Beranda atau pemilih indikator). */
  indikator: string;
  pilihIndikator: (id: string) => void;
};
export type Siap = Omit<Status, "data" | "galat"> & { data: Dataset };

const KonteksStatus = createContext<Status | null>(null);
const KonteksSiap = createContext<Siap | null>(null);

/**
 * Memuat data sekali dan menyimpan filter global (tetap saat pindah halaman).
 * `children` selalu dirender; halaman yang butuh data dibungkus <SiapData>.
 */
export function PenyediaData({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dataset | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [pilihan, setPilihan] = useState<Partial<Filter>>({});
  const [sumber, setSumber] = useState<string | null>(null);
  const [indikator, pilihIndikator] = useState("penyaluran");

  useEffect(() => {
    let batal = false;
    fetch("/data/dashboard.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Dataset>;
      })
      .then((d) => {
        if (!batal) setData(d);
      })
      .catch((e: unknown) => {
        if (!batal) setGalat(e instanceof Error ? e.message : String(e));
      });
    return () => {
      batal = true;
    };
  }, []);

  const ubahFilter = useCallback((perubahan: Partial<Filter>) => {
    setPilihan((p) => ({ ...p, ...perubahan }));
    setSumber(null);
  }, []);
  const fokus = useCallback((perubahan: Partial<Filter>, dari: string) => {
    setPilihan((p) => ({ ...p, ...perubahan }));
    setSumber(dari);
  }, []);
  const aturUlang = useCallback(() => {
    setPilihan((p) => ({ ...p, bulan: 0, lokasi: null }));
    setSumber(null);
  }, []);

  // Esc menghapus fokus (kecuali saat sedang mengetik / memilih di kontrol formulir).
  useEffect(() => {
    const tekan = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const t = e.target;
      if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
      aturUlang();
    };
    window.addEventListener("keydown", tekan);
    return () => window.removeEventListener("keydown", tekan);
  }, [aturUlang]);

  const nilai = useMemo<Status>(() => {
    // Sebelum data tiba, filter berisi nilai sementara dan tidak dipakai (halaman belum dirender).
    const tahun = pilihan.tahun ?? (data ? tahunLengkapTerakhir(data) : 0);
    // Filter bulan hanya berlaku untuk tahun yang datanya bulanan.
    const bulan = data && tahunBulanan(data, tahun) ? (pilihan.bulan ?? 0) : 0;
    return {
      data,
      galat,
      filter: { tahun, bulan, lokasi: pilihan.lokasi ?? null },
      sumber,
      ubahFilter,
      fokus,
      aturUlang,
      indikator,
      pilihIndikator,
    };
  }, [data, galat, pilihan, sumber, ubahFilter, fokus, aturUlang, indikator]);

  return <KonteksStatus.Provider value={nilai}>{children}</KonteksStatus.Provider>;
}

/** Status mentah (data bisa belum tiba). Untuk komponen di luar halaman, mis. bilah atas. */
export function useStatus(): Status {
  const k = useContext(KonteksStatus);
  if (!k) throw new Error("useStatus harus dipakai di dalam <PenyediaData>");
  return k;
}

/** Membungkus isi halaman: menampilkan status muat/galat, lalu menyediakan data yang pasti ada. */
export function SiapData({ children }: { children: ReactNode }) {
  const status = useStatus();
  const { data, galat, filter, sumber, ubahFilter, fokus, aturUlang, indikator, pilihIndikator } = status;
  const nilai = useMemo<Siap | null>(
    () => (data ? { data, filter, sumber, ubahFilter, fokus, aturUlang, indikator, pilihIndikator } : null),
    [data, filter, sumber, ubahFilter, fokus, aturUlang, indikator, pilihIndikator],
  );

  if (galat) {
    return (
      <p role="alert" className="kartu p-6 text-sm text-ink-2">
        Data dashboard gagal dimuat ({galat}). Jalankan <code>python -m etl.konversi</code> lalu muat ulang halaman.
      </p>
    );
  }
  if (!nilai) {
    return (
      <div role="status" className="flex items-center gap-3 p-6 text-sm text-ink-2">
        <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        Memuat data…
      </div>
    );
  }
  return <KonteksSiap.Provider value={nilai}>{children}</KonteksSiap.Provider>;
}

export function useData(): Siap {
  const k = useContext(KonteksSiap);
  if (!k) throw new Error("useData harus dipakai di dalam <SiapData>");
  return k;
}
