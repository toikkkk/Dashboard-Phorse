"use client";

import { ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { AreaTip } from "@/components/AreaTip";
import { Kartu } from "@/components/Kerangka";
import { TombolPerlebar } from "@/components/Perlebar";
import { sifatPerubahan, teksPersen } from "@/components/Perubahan";
import { useTransisi } from "@/components/Transisi";
import { useData } from "@/lib/data";
import { angka, BULAN, ringkas } from "@/lib/format";
import { banding, bandingPerLokasi, bulanTerakhirKategori, pelapor, perLokasi, tahunBulanan } from "@/lib/hitung";
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

/** Properti yang sama untuk semua panel Beranda: apakah sedang diperbesar, cara menggantinya, dan kelas tata letak. */
export type PropPanel = { urut?: number; lebar?: boolean; onLebar?: () => void; kelas?: string };

function Judul({ judul, sub, lebar, onLebar, nama }: { judul: string; sub: string; lebar?: boolean; onLebar?: () => void; nama: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-base font-bold text-ink">{judul}</h2>
        <p className="mt-0.5 truncate text-xs text-ink-2" title={sub}>{sub}</p>
      </div>
      {onLebar && (
        <TombolPerlebar
          perlebar={{ aktif: !!lebar, onToggle: onLebar }}
          teksAktif={`Kecilkan ${nama}`}
          teksNonaktif={`Perbesar ${nama}`}
        />
      )}
    </div>
  );
}

/**
 * Perubahan semua indikator utama dibanding periode setara tahun lalu, dalam satu grafik batang dua arah.
 * Satu pandang: indikator mana yang naik/turun paling besar. Klik batang → telusuri di Data ESG.
 * Diperbesar: tampil juga nilai lalu → kini dan jumlah lokasi pembanding.
 */
export function RingkasanPerubahan({ urut = 0, lebar, onLebar, kelas = "" }: PropPanel) {
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
    <Kartu urut={urut} vtn="perubahan" className={`flex flex-col gap-3 ${kelas}`}>
      <Judul
        judul={lebar ? "Perubahan semua indikator" : "Perubahan"}
        sub={`${label ? `vs ${label}` : "Belum ada pembanding"}${adaBanding.length > 0 ? ` · ${naik}/${adaBanding.length} kurang baik` : ""}`}
        lebar={lebar}
        onLebar={onLebar}
        nama="grafik perubahan"
      />

      <AreaTip>
        <ul className={`flex flex-col ${lebar ? "gap-2" : "gap-1.5"}`}>
          {baris.map(({ ind, ban }) => {
            const adaAlasan = "alasan" in ban;
            const persen = adaAlasan ? null : ban.persen;
            const sifat = sifatPerubahan(persen, ind.arah);
            const lebarBatang = persen === null ? 0 : (Math.min(Math.abs(persen), skala) / skala) * 50;
            const ragu = !adaAlasan && ban.ragu;
            const sat = satuanTampil(ind.ukuran.satuan);
            const tip = [
              ind.label,
              adaAlasan ? ban.alasan : `${teksPersen(persen ?? 0)} dibanding ${ban.label}`,
              ...(adaAlasan ? [] : [`Pada ${ban.lokasiSama} lokasi yang melapor di kedua periode: ${angka(ban.lalu)} → ${angka(ban.nilai)} ${sat}`]),
              ...(persen === null
                ? []
                : [sifat === "buruk" ? "Naik: kurang baik" : sifat === "baik" ? "Turun: membaik" : ind.arah === "netral" ? "Konteks aktivitas (tidak dinilai)" : "Relatif stabil"]),
              ...(ragu ? ["Sebagian nilai tampak janggal (perlu dicek)"] : []),
              "Klik untuk menelusuri di Data ESG",
            ].join("\n");
            return (
              <li key={ind.id}>
                <button
                  type="button"
                  data-tip={tip}
                  onClick={() => {
                    pilihIndikator(ind.id);
                    pindah("/esg");
                  }}
                  className={`fokus-cincin group w-full rounded-lg text-left transition-colors hover:bg-accent-soft ${
                    lebar ? "grid grid-cols-[9rem_1fr_5rem_15rem] items-center gap-3 py-1.5" : "block px-1 py-0.5"
                  }`}
                >
                  {lebar ? (
                    <>
                      <span className="truncate pl-1 text-sm font-medium text-ink">{ind.singkat}</span>
                      <span className="relative h-6">
                        <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-[var(--axis)]" />
                        {persen !== null && (
                          <span
                            aria-hidden
                            className="absolute inset-y-0.5 rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                            style={{
                              background: WARNA[sifat],
                              width: siap ? `${lebarBatang}%` : "0%",
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
                        {ragu && <span aria-hidden className="ml-1 inline-block size-2 rounded-full align-middle" style={{ background: "var(--peringatan)" }} />}
                      </span>
                      <span className="truncate text-xs tabular-nums text-ink-2">
                        {adaAlasan ? ban.alasan : `${ringkas(ban.lalu)} → ${ringkas(ban.nilai)} ${sat} · ${ban.lokasiSama} lokasi`}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-xs font-medium text-ink">{ind.singkat}</span>
                        <span className="text-xs font-bold tabular-nums text-ink">
                          {persen === null ? <span className="font-medium text-muted">—</span> : teksPersen(persen)}
                          {ragu && <span aria-hidden className="ml-1 inline-block size-1.5 rounded-full align-middle" style={{ background: "var(--peringatan)" }} />}
                        </span>
                      </span>
                      <span className="relative mt-1 block h-2 rounded-full bg-card-2">
                        <span aria-hidden className="absolute inset-y-[-2px] left-1/2 w-px bg-[var(--axis)]" />
                        {persen !== null && (
                          <span
                            aria-hidden
                            className="absolute inset-y-0 rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                            style={{
                              background: WARNA[sifat],
                              width: siap ? `${lebarBatang}%` : "0%",
                              left: persen >= 0 ? "50%" : undefined,
                              right: persen < 0 ? "50%" : undefined,
                              opacity: ragu ? 0.45 : 1,
                            }}
                          />
                        )}
                      </span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </AreaTip>
      <p className={`mt-auto flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-2 ${lebar ? "flex" : "hidden"}`}>
        <Kunci warna="var(--buruk)" teks="kurang baik" />
        <Kunci warna="var(--baik)" teks="membaik" />
        <Kunci warna="var(--accent)" teks="konteks" />
        <Kunci warna="var(--peringatan)" teks="perlu dicek" bulat />
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
 * Diperbesar: tampil juga nama lokasi yang belum mengisi tiap kategori.
 */
export function CakupanKategori({ urut = 0, lebar, onLebar, kelas = "" }: PropPanel) {
  const { data, filter } = useData();
  const siap = useSiap();
  const bulanan = tahunBulanan(data, filter.tahun);
  const semua = { ...filter, lokasi: null };
  const total = data.lokasi.length;
  const kategori = data.kategori.filter((k) => k !== "Lahan Hijau");
  const baris = kategori.map((k) => {
    const idx = data.kategori.indexOf(k);
    const melapor = new Set<number>();
    for (const r of data.isi) {
      if (r[3] !== idx || r[1] !== filter.tahun || (filter.bulan && r[2] !== filter.bulan)) continue;
      melapor.add(r[0]);
    }
    const belum = data.lokasi.map((l, i) => ({ l, i })).filter(({ i }) => !melapor.has(i)).map(({ l }) => l.singkat);
    return { k, n: pelapor(data, semua, k), belum, akhir: bulanan ? bulanTerakhirKategori(data, filter.tahun, k) : 0 };
  });
  const rata = baris.length ? Math.round((100 * baris.reduce((a, b) => a + b.n, 0)) / (baris.length * total)) : 0;
  const akhirTahun = data.meta.bulanTerakhir[String(filter.tahun)] ?? 12;

  return (
    <Kartu urut={urut} vtn="cakupan" className={`flex flex-col gap-3 ${kelas}`}>
      <Judul
        judul={lebar ? "Cakupan pelaporan per kategori" : "Cakupan"}
        sub={`Rata-rata ${rata}% sudah mengisi`}
        lebar={lebar}
        onLebar={onLebar}
        nama="grafik cakupan"
      />
      <AreaTip>
        <ul className={`flex flex-col ${lebar ? "gap-3.5" : "gap-1.5"}`}>
          {baris.map(({ k, n, akhir, belum }) => {
            const persen = total ? (n / total) * 100 : 0;
            const tip = [
              `${k} · ${n} dari ${total} lokasi`,
              akhir > 0 && akhir < akhirTahun ? `Baru terisi sampai ${BULAN[akhir - 1]}` : "Periode terpilih",
              belum.length === 0 ? "Semua lokasi sudah mengisi" : `Belum: ${belum.slice(0, 8).join(", ")}${belum.length > 8 ? ` dan ${belum.length - 8} lainnya` : ""}`,
            ].join("\n");
            return (
              <li key={k} data-tip={tip} tabIndex={0} className="fokus-cincin rounded-lg">
                {lebar ? (
                  <div className="grid grid-cols-[8rem_1fr_auto] items-center gap-2.5">
                    <span className="truncate text-sm font-medium text-ink">{k}</span>
                    <span className="h-4 overflow-hidden rounded-full bg-card-2" role="img" aria-label={`${k}: ${n} dari ${total} lokasi`}>
                      <span
                        className="block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ width: siap ? `${persen}%` : "0%", background: persen >= 80 ? "var(--accent)" : persen >= 40 ? "color-mix(in srgb, var(--accent) 65%, white)" : "var(--peringatan)" }}
                      />
                    </span>
                    <span className="w-14 text-right text-xs tabular-nums text-ink-2">
                      <strong className="text-sm text-ink">{n}</strong>/{total}
                      {akhir > 0 && akhir < akhirTahun && <span className="block text-[11px] text-muted">s.d. {BULAN[akhir - 1]}</span>}
                    </span>
                  </div>
                ) : (
                  <div className="px-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-xs font-medium text-ink">
                        {k}
                        {akhir > 0 && akhir < akhirTahun && <span className="ml-1 font-normal text-muted">s.d. {BULAN[akhir - 1]}</span>}
                      </span>
                      <span className="text-xs tabular-nums text-ink-2">
                        <strong className="text-xs font-bold text-ink">{n}</strong>/{total}
                      </span>
                    </span>
                    <span className="mt-1 block h-2 overflow-hidden rounded-full bg-card-2" role="img" aria-label={`${k}: ${n} dari ${total} lokasi`}>
                      <span
                        className="block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ width: siap ? `${persen}%` : "0%", background: persen >= 80 ? "var(--accent)" : persen >= 40 ? "color-mix(in srgb, var(--accent) 65%, white)" : "var(--peringatan)" }}
                      />
                    </span>
                  </div>
                )}
                {lebar && belum.length > 0 && (
                  <p className="mt-1 pl-[8.625rem] text-[11px] leading-snug text-ink-2">
                    Belum: {belum.slice(0, 10).join(", ")}
                    {belum.length > 10 ? ` dan ${belum.length - 10} lainnya` : ""}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </AreaTip>
    </Kartu>
  );
}

const TERATAS = ["penyaluran", "emisi", "listrik", "sampah", "b3", "air"];

/**
 * Lokasi terbesar untuk satu indikator (dipilih lewat tombol di atas daftar).
 * Diperbesar: 10 lokasi, lengkap dengan porsi dan perubahan tiap lokasi. Klik lokasi → memfokuskan dashboard.
 */
export function LokasiTeratas({ urut = 0, lebar, onLebar, kelas = "" }: PropPanel) {
  const { data, filter, sumber, fokus, pengguna } = useData();
  const siap = useSiap();
  const [idInd, setIdInd] = useState(TERATAS[0]);
  const milik = pengguna.lokasiId ? data.lokasi.findIndex((l) => l.id === pengguna.lokasiId) : -1;
  const daftar = INDIKATOR.filter((i) => TERATAS.includes(i.id));
  const ind = daftar.find((i) => i.id === idInd) ?? daftar[0];
  const sat = satuanTampil(ind.ukuran.satuan);
  const { nilai } = perLokasi(data, { ...filter, lokasi: null }, ind.ukuran);
  const urutan = nilai.map((v, i) => ({ v, i })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
  const atas = urutan.slice(0, lebar ? 10 : 5);
  const maks = atas[0]?.v ?? 0;
  const jumlah = urutan.reduce((a, b) => a + b.v, 0);
  const ban = lebar ? bandingPerLokasi(data, filter, ind) : null;

  return (
    <Kartu urut={urut} vtn="teratas" sumber={sumber === "teratas"} className={`flex flex-col gap-2.5 ${kelas}`}>
      <Judul
        judul={lebar ? "Sepuluh lokasi terbesar" : "Lokasi terbesar"}
        sub={lebar ? "Klik lokasi untuk memfokuskan dashboard." : "Lima teratas · klik untuk fokus"}
        lebar={lebar}
        onLebar={onLebar}
        nama="daftar lokasi"
      />
      <div role="group" aria-label="Indikator" className="flex flex-wrap gap-1">
        {daftar.map((i) => (
          <button
            key={i.id}
            type="button"
            aria-pressed={i.id === ind.id}
            onClick={() => setIdInd(i.id)}
            className={`fokus-cincin rounded-lg px-2 py-0.5 text-xs font-semibold transition-all ${i.id === ind.id ? "bg-accent text-on-accent shadow-sm" : "bg-card-2 text-ink-2 hover:bg-accent-soft hover:text-accent"}`}
          >
            {i.singkat}
          </button>
        ))}
      </div>
      {atas.length === 0 ? (
        <p className="text-xs text-muted">Belum ada data pada periode ini.</p>
      ) : (
        <AreaTip>
          <ol className="flex flex-col gap-1">
            {atas.map((x, n) => {
              const l = data.lokasi[x.i];
              const terpilih = filter.lokasi === x.i;
              const porsi = jumlah > 0 ? (100 * x.v) / jumlah : 0;
              const persen = ban && !("alasan" in ban) ? ban.persen[x.i] : null;
              const tip = [
                `${n + 1}. ${l.nama}`,
                `${ind.singkat}: ${angka(x.v)} ${sat}`,
                `${porsi.toFixed(1).replace(".", ",")}% dari total semua lokasi`,
                ...(x.i === milik ? ["Ini lokasi Anda"] : []),
                "Klik untuk memfokuskan dashboard",
              ].join("\n");
              return (
                <li key={`${ind.id}-${l.id}`}>
                  <button
                    type="button"
                    data-tip={tip}
                    onClick={() => fokus({ lokasi: terpilih ? null : x.i }, "teratas")}
                    className={`fokus-cincin relative flex w-full items-center gap-2 overflow-hidden rounded-lg px-2 text-left text-xs transition-colors hover:bg-accent-soft ${lebar ? "py-2" : "py-1"} ${terpilih ? "ring-1 ring-accent" : ""}`}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 rounded-lg bg-accent-soft transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{ width: siap ? `${(x.v / maks) * 100}%` : "0%", transitionDelay: `${n * 60}ms` }}
                    />
                    <span className="relative w-5 text-muted tabular-nums">{n + 1}</span>
                    <span className={`relative min-w-0 flex-1 truncate font-semibold ${x.i === milik ? "text-accent" : "text-ink"}`}>
                      {l.singkat}
                      {x.i === milik && <span className="ml-1 font-medium text-ink-2">(Anda)</span>}
                    </span>
                    {lebar && (
                      <>
                        <span className="relative w-14 text-right tabular-nums text-ink-2">{porsi.toFixed(1).replace(".", ",")}%</span>
                        <span className="relative w-16 text-right tabular-nums">
                          {persen === null || persen === undefined ? (
                            <span className="text-muted">—</span>
                          ) : (
                            <span className="font-semibold" style={{ color: WARNA[sifatPerubahan(persen, ind.arah)] === WARNA.netral ? "var(--ink-2)" : WARNA[sifatPerubahan(persen, ind.arah)] }}>
                              {teksPersen(persen)}
                            </span>
                          )}
                        </span>
                      </>
                    )}
                    <span className="relative font-bold tabular-nums text-ink">
                      {ringkas(x.v)} <span className="font-medium text-ink-2">{sat}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </AreaTip>
      )}
    </Kartu>
  );
}

/** Kartu pelengkap deretan angka utama: berapa lokasi yang sudah mengisi pada periode terpilih. */
export function KartuLokasiMelapor({ urut = 0 }: { urut?: number }) {
  const { data, filter } = useData();
  const lokasi = new Set<number>();
  for (const r of data.isi) {
    if (r[1] !== filter.tahun || (filter.bulan && r[2] !== filter.bulan)) continue;
    lokasi.add(r[0]);
  }
  const total = data.lokasi.length;
  return (
    <article style={{ "--i": urut } as React.CSSProperties} className="kartu masuk flex flex-col gap-1.5 p-3.5">
      <div className="flex items-center gap-2.5">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
          <ClipboardCheck className="size-[18px]" />
        </span>
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-2">Lokasi melapor</h3>
      </div>
      <p className="text-2xl font-extrabold leading-none tracking-tight text-ink">
        {lokasi.size}
        <span className="text-base font-bold text-ink-2">/{total}</span>
      </p>
      <p className="text-[11px] leading-tight text-ink-2">sudah mengisi sedikitnya satu kategori pada periode ini.</p>
    </article>
  );
}
