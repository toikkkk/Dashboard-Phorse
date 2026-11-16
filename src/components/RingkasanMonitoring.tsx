"use client";

import { useEffect, useState } from "react";
import { Kartu } from "@/components/Kerangka";
import { sifatPerubahan, teksPersen } from "@/components/Perubahan";
import { useTransisi } from "@/components/Transisi";
import { useData } from "@/lib/data";
import { BULAN, ringkas } from "@/lib/format";
import { banding, bulanTerakhirKategori, pelapor, perLokasi, tahunBulanan } from "@/lib/hitung";
import { INDIKATOR } from "@/lib/panel";

const WARNA = { baik: "var(--baik)", buruk: "var(--buruk)", netral: "var(--accent)" } as const;
const satuanTampil = (s: string) => (s === "m3" ? "m³" : s);

/** Menyalakan animasi lebar batang setelah komponen tampil (lebar naik dari 0). */
function useSiap() {
  const [siap, setSiap] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setSiap(true));
    return () => cancelAnimationFrame(r);
  }, []);
  return siap;
}

/**
 * Perubahan semua indikator utama dibanding periode setara tahun lalu, dalam satu grafik batang dua arah.
 * Satu pandang: indikator mana yang naik/turun paling besar. Klik batang → telusuri di Data ESG.
 */
export function RingkasanPerubahan({ urut = 0 }: { urut?: number }) {
  const { data, filter, pilihIndikator } = useData();
  const { pindah } = useTransisi();
  const siap = useSiap();
  const baris = INDIKATOR.filter((i) => i.beranda !== false).map((ind) => ({ ind, ban: banding(data, filter, ind) }));
  const adaBanding = baris.filter((b) => !("alasan" in b.ban) && b.ban.persen !== null);
  const maks = Math.max(20, ...adaBanding.map((b) => Math.abs((b.ban as { persen: number }).persen)));
  const skala = Math.min(maks, 100); // batang dipotong di 100% agar satu lonjakan tidak menggilas yang lain
  const label = adaBanding.length ? (adaBanding[0].ban as { label: string }).label : null;
  const naik = adaBanding.filter((b) => sifatPerubahan((b.ban as { persen: number }).persen, b.ind.arah) === "buruk").length;

  return (
    <Kartu urut={urut} className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-bold text-ink">Perubahan semua indikator</h2>
        <p className="mt-0.5 text-xs text-ink-2">
          {label ? `Dibanding ${label}` : "Belum ada pembanding pada pilihan ini"}
          {adaBanding.length > 0 && ` · ${naik} dari ${adaBanding.length} indikator bergerak ke arah yang kurang baik`}
        </p>
      </div>

      <ul className="flex flex-col gap-2.5">
        {baris.map(({ ind, ban }) => {
          const persen = "alasan" in ban ? null : ban.persen;
          const sifat = sifatPerubahan(persen, ind.arah);
          const lebar = persen === null ? 0 : (Math.min(Math.abs(persen), skala) / skala) * 50;
          const ragu = !("alasan" in ban) && ban.ragu;
          return (
            <li key={ind.id}>
              <button
                type="button"
                onClick={() => {
                  pilihIndikator(ind.id);
                  pindah("/esg");
                }}
                title={"alasan" in ban ? ban.alasan : `${ind.label}: ${teksPersen(persen ?? 0)} (pada ${ban.lokasiSama} lokasi yang melapor di kedua periode)`}
                className="fokus-cincin group grid w-full grid-cols-[9rem_1fr_4.5rem] items-center gap-3 rounded-xl py-1 text-left transition-colors hover:bg-accent-soft"
              >
                <span className="truncate pl-1 text-sm font-medium text-ink">{ind.singkat}</span>
                <span className="relative h-5">
                  <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-[var(--axis)]" />
                  {persen !== null && (
                    <span
                      aria-hidden
                      className="absolute inset-y-0.5 rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{
                        background: WARNA[sifat],
                        width: siap ? `${lebar}%` : "0%",
                        left: persen >= 0 ? "50%" : undefined,
                        right: persen < 0 ? "50%" : undefined,
                        opacity: ragu ? 0.45 : 1,
                        borderRadius: persen >= 0 ? "0 9999px 9999px 0" : "9999px 0 0 9999px",
                      }}
                    />
                  )}
                </span>
                <span className="pr-1 text-right text-sm font-bold tabular-nums text-ink">
                  {persen === null ? <span className="text-xs font-medium text-muted">—</span> : teksPersen(persen)}
                  {ragu && <span aria-hidden className="ml-1 inline-block size-2 rounded-full align-middle" style={{ background: "var(--peringatan)" }} title="Sebagian nilai tampak janggal (perlu dicek)" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-2">
        <Kunci warna="var(--buruk)" teks="kurang baik" />
        <Kunci warna="var(--baik)" teks="membaik" />
        <Kunci warna="var(--accent)" teks="konteks aktivitas (tidak dinilai)" />
        <Kunci warna="var(--peringatan)" teks="sebagian nilai perlu dicek" bulat />
      </p>
    </Kartu>
  );
}

function Kunci({ warna, teks, bulat = false }: { warna: string; teks: string; bulat?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span aria-hidden className={`inline-block size-2.5 ${bulat ? "rounded-full" : "rounded-sm"}`} style={{ background: warna }} />
      {teks}
    </span>
  );
}

/**
 * Cakupan pelaporan per kategori: berapa lokasi yang sudah mengisi dan sampai bulan apa.
 * Bahan utama memantau kedisiplinan input.
 */
export function CakupanKategori({ urut = 0 }: { urut?: number }) {
  const { data, filter } = useData();
  const siap = useSiap();
  const bulanan = tahunBulanan(data, filter.tahun);
  const semua = { ...filter, lokasi: null };
  const total = data.lokasi.length;
  const kategori = data.kategori.filter((k) => k !== "Lahan Hijau");
  const baris = kategori.map((k) => ({ k, n: pelapor(data, semua, k), akhir: bulanan ? bulanTerakhirKategori(data, filter.tahun, k) : 0 }));
  const rata = baris.length ? Math.round((100 * baris.reduce((a, b) => a + b.n, 0)) / (baris.length * total)) : 0;

  return (
    <Kartu urut={urut} className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-bold text-ink">Cakupan pelaporan per kategori</h2>
        <p className="mt-0.5 text-xs text-ink-2">
          Lokasi yang sudah mengisi pada periode terpilih · rata-rata <strong className="text-ink">{rata}%</strong> dari {total} lokasi
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {baris.map(({ k, n, akhir }) => {
          const persen = total ? (n / total) * 100 : 0;
          return (
            <li key={k} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3">
              <span className="truncate text-sm font-medium text-ink">{k}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-card-2" role="img" aria-label={`${k}: ${n} dari ${total} lokasi`}>
                <span
                  className="block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{
                    width: siap ? `${persen}%` : "0%",
                    background: persen >= 80 ? "var(--accent)" : persen >= 40 ? "color-mix(in srgb, var(--accent) 65%, white)" : "var(--peringatan)",
                  }}
                />
              </span>
              <span className="w-24 text-right text-xs tabular-nums text-ink-2">
                <strong className="text-sm text-ink">{n}</strong>/{total}
                {akhir > 0 && akhir < (data.meta.bulanTerakhir[String(filter.tahun)] ?? 12) && <span className="block text-[11px] text-muted">s.d. {BULAN[akhir - 1]}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </Kartu>
  );
}

const TERATAS = ["penyaluran", "emisi", "listrik", "sampah", "b3", "air"];

/**
 * Lima lokasi terbesar untuk tiap indikator utama (bahan memantau siapa yang dominan).
 * Klik baris → memfokuskan seluruh dashboard ke lokasi itu.
 */
export function LokasiTeratas({ urut = 0 }: { urut?: number }) {
  const { data, filter, sumber, fokus, pengguna } = useData();
  const siap = useSiap();
  const milik = pengguna.lokasiId ? data.lokasi.findIndex((l) => l.id === pengguna.lokasiId) : -1;
  const daftar = INDIKATOR.filter((i) => TERATAS.includes(i.id));

  return (
    <Kartu urut={urut} sumber={sumber === "teratas"} className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-bold text-ink">Lima lokasi terbesar per indikator</h2>
        <p className="mt-0.5 text-xs text-ink-2">Seluruh lokasi pada periode terpilih, tidak terpengaruh pilihan lokasi. Klik lokasi untuk memfokuskan dashboard.</p>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
        {daftar.map((ind) => {
          const { nilai } = perLokasi(data, { ...filter, lokasi: null }, ind.ukuran);
          const urutan = nilai.map((v, i) => ({ v, i })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
          const atas = urutan.slice(0, 5);
          const maks = atas[0]?.v ?? 0;
          const jumlah = urutan.reduce((a, b) => a + b.v, 0);
          return (
            <section key={ind.id} aria-label={ind.label}>
              <h3 className="mb-2 flex items-baseline justify-between text-sm font-bold text-ink">
                {ind.singkat}
                <span className="text-[11px] font-medium text-muted">{satuanTampil(ind.ukuran.satuan)}</span>
              </h3>
              {atas.length === 0 ? (
                <p className="text-xs text-muted">Belum ada data pada periode ini.</p>
              ) : (
                <ol className="flex flex-col gap-1">
                  {atas.map((x, n) => {
                    const l = data.lokasi[x.i];
                    const terpilih = filter.lokasi === x.i;
                    return (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => fokus({ lokasi: terpilih ? null : x.i }, "teratas")}
                          title={`${l.nama}: ${ringkas(x.v)} ${satuanTampil(ind.ukuran.satuan)} (${((100 * x.v) / jumlah).toFixed(1).replace(".", ",")}% dari total)`}
                          className={`fokus-cincin relative flex w-full items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent-soft ${terpilih ? "ring-1 ring-accent" : ""}`}
                        >
                          <span
                            aria-hidden
                            className="absolute inset-y-0 left-0 rounded-lg bg-accent-soft transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                            style={{ width: siap ? `${(x.v / maks) * 100}%` : "0%", transitionDelay: `${n * 60}ms` }}
                          />
                          <span className="relative w-4 text-muted tabular-nums">{n + 1}</span>
                          <span className={`relative min-w-0 flex-1 truncate font-semibold ${x.i === milik ? "text-accent" : "text-ink"}`}>
                            {l.singkat}
                            {x.i === milik && <span className="ml-1 font-medium text-ink-2">(Anda)</span>}
                          </span>
                          <span className="relative font-bold tabular-nums text-ink">{ringkas(x.v)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
          );
        })}
      </div>
    </Kartu>
  );
}
