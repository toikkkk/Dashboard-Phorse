"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { tahunBulanan, tahunLengkapTerakhir } from "./hitung";
import type { Dataset, Filter } from "./tipe";

/** Identitas akun yang sedang masuk, sebagaimana dikirim server (tanpa data sensitif). */
export type PenggunaKlien = {
  username: string;
  nama: string;
  peran: "admin" | "terminal";
  lokasiId: string | null;
};

export type Status = {
  data: Dataset | null;
  galat: string | null;
  pengguna: PenggunaKlien | null;
  filter: Filter;
  /** id visual yang terakhir diklik untuk memfokuskan visual lain (null = pilihan dari menu filter). */
  sumber: string | null;
  /** Dipakai kontrol filter di atas halaman. */
  ubahFilter: (perubahan: Partial<Filter>) => void;
  /** Dipakai saat sebuah visual diklik: mengubah filter bersama dan menandai visual itu sebagai sumber. */
  fokus: (perubahan: Partial<Filter>, sumber: string) => void;
  /** Menghapus fokus bulan dan lokasi; lokasi kembali ke terminal milik akun (atau semua lokasi untuk admin). */
  aturUlang: () => void;
  /** Indikator yang sedang ditelusuri di halaman Data ESG (dipilih dari kartu Beranda atau pemilih indikator). */
  indikator: string;
  pilihIndikator: (id: string) => void;
  /** Memuat ulang data dari server (dipakai setelah menyimpan isian). */
  muatUlang: () => Promise<void>;
};
export type Siap = Omit<Status, "data" | "galat" | "pengguna"> & { data: Dataset; pengguna: PenggunaKlien };

const KonteksStatus = createContext<Status | null>(null);
const KonteksSiap = createContext<Siap | null>(null);

type HasilMuat =
  | { jenis: "ok"; data: Dataset; pengguna: PenggunaKlien }
  | { jenis: "alihkan"; ke: string }
  | { jenis: "galat"; pesan: string };

async function ambilDariServer(): Promise<HasilMuat> {
  try {
    const r = await fetch("/api/data", { cache: "no-store", credentials: "same-origin" });
    if (r.status === 401) return { jenis: "alihkan", ke: "/login" };
    if (r.status === 403) {
      const j = (await r.json().catch(() => null)) as { galat?: string } | null;
      return j?.galat === "harus-ganti-sandi" ? { jenis: "alihkan", ke: "/ganti-sandi" } : { jenis: "galat", pesan: "Akses ditolak" };
    }
    if (!r.ok) return { jenis: "galat", pesan: `HTTP ${r.status}` };
    const j = (await r.json()) as { pengguna: PenggunaKlien; data: Dataset };
    return { jenis: "ok", data: j.data, pengguna: j.pengguna };
  } catch (e) {
    return { jenis: "galat", pesan: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Memuat data sekali dan menyimpan filter global (tetap saat pindah halaman).
 * `children` selalu dirender; halaman yang butuh data dibungkus <SiapData>.
 */
export function PenyediaData({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Dataset | null>(null);
  const [pengguna, setPengguna] = useState<PenggunaKlien | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [pilihan, setPilihan] = useState<Partial<Filter>>({});
  const [sumber, setSumber] = useState<string | null>(null);
  const [indikator, pilihIndikator] = useState("penyaluran");

  const terapkan = useCallback((h: HasilMuat) => {
    if (h.jenis === "alihkan") window.location.replace(h.ke);
    else if (h.jenis === "galat") setGalat(h.pesan);
    else {
      setData(h.data);
      setPengguna(h.pengguna);
      setGalat(null);
    }
  }, []);

  useEffect(() => {
    let batal = false;
    ambilDariServer().then((h) => {
      if (!batal) terapkan(h);
    });
    return () => {
      batal = true;
    };
  }, [terapkan]);

  const muatUlang = useCallback(async () => terapkan(await ambilDariServer()), [terapkan]);

  const ubahFilter = useCallback((perubahan: Partial<Filter>) => {
    setPilihan((p) => ({ ...p, ...perubahan }));
    setSumber(null);
  }, []);
  const fokus = useCallback((perubahan: Partial<Filter>, dari: string) => {
    setPilihan((p) => ({ ...p, ...perubahan }));
    setSumber(dari);
  }, []);
  const aturUlang = useCallback(() => {
    setPilihan((p) => ({ ...p, bulan: 0, lokasi: undefined }));
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
    // Akun terminal langsung melihat terminalnya sendiri; admin melihat semua. Keduanya bebas mengganti lokasi.
    const idxTerminal = data && pengguna?.lokasiId ? data.lokasi.findIndex((l) => l.id === pengguna.lokasiId) : -1;
    const lokasiAwal = idxTerminal >= 0 ? idxTerminal : null;
    return {
      data,
      galat,
      pengguna,
      filter: { tahun, bulan, lokasi: pilihan.lokasi !== undefined ? pilihan.lokasi : lokasiAwal },
      sumber,
      ubahFilter,
      fokus,
      aturUlang,
      indikator,
      pilihIndikator,
      muatUlang,
    };
  }, [data, galat, pengguna, pilihan, sumber, ubahFilter, fokus, aturUlang, indikator, muatUlang]);

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
  const { data, galat, pengguna, filter, sumber, ubahFilter, fokus, aturUlang, indikator, pilihIndikator, muatUlang } = status;
  const nilai = useMemo<Siap | null>(
    () => (data && pengguna ? { data, pengguna, filter, sumber, ubahFilter, fokus, aturUlang, indikator, pilihIndikator, muatUlang } : null),
    [data, pengguna, filter, sumber, ubahFilter, fokus, aturUlang, indikator, pilihIndikator, muatUlang],
  );

  if (galat) {
    return (
      <p role="alert" className="kartu p-6 text-sm text-ink-2">
        Data dashboard gagal dimuat ({galat}). Muat ulang halaman; jika masih gagal, hubungi admin.
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
