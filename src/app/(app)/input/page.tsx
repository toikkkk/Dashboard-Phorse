"use client";

import { AlertTriangle, CheckCircle2, Info, Save, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Kartu, Kerangka } from "@/components/Kerangka";
import { Pilihan, type Opsi } from "@/components/Pilihan";
import { SiapData, useData } from "@/lib/data";
import { angka, BULAN_PANJANG } from "@/lib/format";
import type { DataIsian, Janggal, Kolom } from "@/server/input";
import { simpanIsianAksi } from "./aksi";

const TAHUN_MULAI = 2026;

/** Periode berjalan menurut WIB (sama dengan aturan di server). */
function periodeSekarang() {
  const wib = new Date(Date.now() + 7 * 3600_000);
  return { tahun: wib.getUTCFullYear(), bulan: wib.getUTCMonth() + 1 };
}

/** Angka tersimpan → teks isian (koma desimal), tanpa notasi ilmiah. */
function teksAngka(n: number): string {
  let t = String(Number(n.toPrecision(12)));
  if (/e/i.test(t)) t = n.toFixed(12).replace(/0+$/, "").replace(/\.$/, "");
  return t.replace(".", ",");
}

function keAngka(t: string): number | null {
  const s = t.trim();
  return /^\d+(?:[.,]\d+)?$/.test(s) ? Number(s.replace(",", ".")) : null;
}

const MAKS_BARIS_SEKSI = 32;
const satuanTampil = (s: string) => s.replace("m3", "m³");

type Seksi = { kunci: string; label: string; isi: Kolom[]; kedalaman: number };

/**
 * Kategori yang panjang dibagi menjadi bagian-bagian kecil (mis. Operasional → Jalur Pipa, Kapal, MT, …)
 * supaya formulir tidak menjadi satu halaman yang sangat panjang. Kategori pendek tidak dibagi.
 */
function bagiSeksi(kolom: Kolom[]): Seksi[] | null {
  if (kolom.length <= 30) return null;
  const maksDalam = Math.min(...kolom.map((k) => k.level.length - 1));
  for (let d = 1; d <= maksDalam; d++) {
    const peta = new Map<string, Kolom[]>();
    for (const k of kolom) {
      const kunci = k.level.slice(0, d).join(" › ");
      peta.set(kunci, [...(peta.get(kunci) ?? []), k]);
    }
    if (peta.size < 2 || Math.max(...[...peta.values()].map((v) => v.length)) > MAKS_BARIS_SEKSI) continue;
    const jalur = [...peta.values()].map((v) => v[0].level.slice(0, d));
    let umum = 0; // level awal yang sama di semua bagian tidak perlu diulang di label
    while (umum < d - 1 && jalur.every((j) => j[umum] === jalur[0][umum])) umum++;
    return [...peta.entries()].map(([kunci, isi]) => ({ kunci, label: isi[0].level.slice(umum, d).join(" › "), isi, kedalaman: d }));
  }
  return null;
}

type Muat = { kunci: string; data?: DataIsian; galat?: string };
type Pesan = { jenis: "ok" | "galat"; teks: string };

export default function HalamanInput() {
  return (
    <SiapData>
      <Isi />
    </SiapData>
  );
}

function Isi() {
  const { pengguna, data } = useData();
  const lokasi = data.lokasi.find((l) => l.id === pengguna.lokasiId);

  if (pengguna.peran !== "terminal" || !lokasi) {
    return (
      <Kerangka judul="Input Data" filter={false}>
        <Kartu className="flex items-start gap-3">
          <Info className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
          <p className="text-sm leading-relaxed text-ink-2">
            Pengisian data hanya tersedia untuk akun terminal, dan setiap akun hanya dapat mengisi data terminalnya sendiri. Akun admin
            dapat melihat seluruh dashboard dan mengelola akun, tetapi tidak mengubah data.
          </p>
        </Kartu>
      </Kerangka>
    );
  }
  return <Formulir namaLokasi={lokasi.nama} />;
}

function Formulir({ namaLokasi }: { namaLokasi: string }) {
  const { muatUlang } = useData();
  const [kini] = useState(periodeSekarang);
  const [tahun, setTahun] = useState(Math.max(kini.tahun, TAHUN_MULAI));
  const [bulan, setBulan] = useState(kini.bulan);
  const [kategori, setKategori] = useState<string | null>(null);
  const [seksiDipilih, setSeksiDipilih] = useState<string | null>(null);
  const [sunting, setSunting] = useState<Record<string, string>>({});
  const [muat, setMuat] = useState<Muat | null>(null);
  const [versi, setVersi] = useState(0);
  const [galatKolom, setGalatKolom] = useState<Record<string, string>>({});
  const [konfirmasi, setKonfirmasi] = useState<Janggal[] | null>(null);
  const [pesan, setPesan] = useState<Pesan | null>(null);
  const [menyimpan, setMenyimpan] = useState(false);

  const kunci = `${tahun}-${bulan}-${versi}`;

  useEffect(() => {
    let batal = false;
    fetch(`/api/isian?tahun=${tahun}&bulan=${bulan}`, { cache: "no-store", credentials: "same-origin" })
      .then(async (r) => {
        if (r.status === 401) return window.location.replace("/login");
        if (r.status === 403) {
          const j = (await r.json().catch(() => null)) as { galat?: string } | null;
          if (j?.galat === "harus-ganti-sandi") return window.location.replace("/ganti-sandi");
        }
        const j = (await r.json().catch(() => null)) as (DataIsian & { pesan?: string }) | null;
        if (batal) return;
        setMuat(r.ok && j ? { kunci, data: j } : { kunci, galat: j?.pesan ?? "Formulir gagal dimuat." });
      })
      .catch(() => !batal && setMuat({ kunci, galat: "Formulir gagal dimuat. Periksa koneksi Anda." }));
    return () => {
      batal = true;
    };
  }, [tahun, bulan, kunci]);

  const isian = muat?.kunci === kunci ? muat.data : undefined;
  const galatMuat = muat?.kunci === kunci ? muat.galat : undefined;

  const kategoriDaftar = useMemo(() => [...new Set((isian?.skema ?? []).map((k) => k.kategori))], [isian]);
  const aktif = kategori && kategoriDaftar.includes(kategori) ? kategori : (kategoriDaftar[0] ?? null);
  const kolomAktif = useMemo(() => (isian?.skema ?? []).filter((k) => k.kategori === aktif), [isian, aktif]);

  const seksiDaftar = useMemo(() => bagiSeksi(kolomAktif), [kolomAktif]);
  const seksi = seksiDaftar ? (seksiDaftar.find((x) => x.kunci === seksiDipilih) ?? seksiDaftar[0]) : null;
  const kolomTampil = seksi ? seksi.isi : kolomAktif;

  const tersimpan = useCallback((id: string) => (isian && id in isian.nilai ? teksAngka(isian.nilai[id]) : ""), [isian]);
  const nilaiTampil = (id: string) => sunting[id] ?? tersimpan(id);
  const berubah = useCallback((id: string) => id in sunting && sunting[id].trim() !== tersimpan(id), [sunting, tersimpan]);

  const jumlahBerubahDi = (kat: string) => (isian?.skema ?? []).filter((k) => k.kategori === kat && berubah(k.id)).length;
  const jumlahBerubah = kategoriDaftar.reduce((a, k) => a + jumlahBerubahDi(k), 0);

  // Peringatan bila menutup halaman dengan isian yang belum disimpan.
  useEffect(() => {
    if (!jumlahBerubah) return;
    const f = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", f);
    return () => window.removeEventListener("beforeunload", f);
  }, [jumlahBerubah]);

  const bersihkanStatus = () => {
    setGalatKolom({});
    setKonfirmasi(null);
    setPesan(null);
  };

  const pindahPeriode = (t: number, b: number) => {
    if (jumlahBerubah && !window.confirm("Ada isian yang belum disimpan dan akan hilang jika periode diganti. Lanjutkan?")) return;
    const batasBulan = t === kini.tahun ? kini.bulan : 12;
    setTahun(t);
    setBulan(Math.min(b, batasBulan));
    setSunting({});
    bersihkanStatus();
  };

  // Memperlihatkan bagian yang berisi isian bermasalah, karena bagian lain disembunyikan.
  const bukaSeksiDari = (id?: string) => {
    const x = id ? seksiDaftar?.find((b) => b.isi.some((k) => k.id === id)) : undefined;
    if (x) setSeksiDipilih(x.kunci);
  };

  const simpan = async (dikonfirmasi: string[] = []) => {
    if (!aktif || !isian) return;
    setMenyimpan(true);
    setPesan(null);
    // Kolom yang tidak diubah dikirim sebagai angka aslinya agar tidak bergeser oleh pembulatan teks.
    const nilai: Record<string, string | number | null> = {};
    for (const k of kolomAktif) {
      if (k.id in sunting) nilai[k.id] = sunting[k.id].trim() === "" ? null : sunting[k.id].trim();
      else nilai[k.id] = k.id in isian.nilai ? isian.nilai[k.id] : null;
    }
    try {
      const h = await simpanIsianAksi({ tahun, bulan, kategori: aktif, nilai, konfirmasi: dikonfirmasi });
      if (h.ok) {
        setGalatKolom({});
        setKonfirmasi(null);
        setSunting((s) => Object.fromEntries(Object.entries(s).filter(([id]) => !kolomAktif.some((k) => k.id === id))));
        setPesan({
          jenis: "ok",
          teks: h.berubah
            ? `Tersimpan: ${h.ditulis} isian ${aktif} untuk ${BULAN_PANJANG[bulan - 1]} ${tahun}. Dashboard sudah diperbarui.`
            : "Tidak ada perubahan dibanding data yang sudah tersimpan.",
        });
        setVersi((v) => v + 1);
        await muatUlang();
      } else if (h.jenis === "konfirmasi") {
        setKonfirmasi(h.perluKonfirmasi);
        setGalatKolom({});
        bukaSeksiDari(h.perluKonfirmasi[0]?.metrik);
        setPesan({ jenis: "galat", teks: h.pesan });
      } else {
        setKonfirmasi(null);
        setGalatKolom(h.jenis === "validasi" && h.galat ? h.galat : {});
        if (h.jenis === "validasi" && h.galat) bukaSeksiDari(Object.keys(h.galat)[0]);
        setPesan({ jenis: "galat", teks: h.pesan });
      }
    } catch {
      setPesan({ jenis: "galat", teks: "Penyimpanan gagal. Periksa koneksi Anda lalu coba lagi; isian di layar belum hilang." });
    } finally {
      setMenyimpan(false);
    }
  };

  const batalkan = () => {
    setSunting((s) => Object.fromEntries(Object.entries(s).filter(([id]) => !kolomAktif.some((k) => k.id === id))));
    bersihkanStatus();
  };

  const opsiTahun: Opsi[] = Array.from({ length: kini.tahun - TAHUN_MULAI + 1 }, (_, i) => ({ nilai: TAHUN_MULAI + i, label: String(TAHUN_MULAI + i) }));
  const opsiBulan: Opsi[] = Array.from({ length: tahun === kini.tahun ? kini.bulan : 12 }, (_, i) => ({ nilai: i + 1, label: BULAN_PANJANG[i] }));

  const labelMetrik = (id: string) => (isian?.skema.find((k) => k.id === id)?.level ?? [id]).join(" › ");
  const terisiAktif = aktif ? (isian?.terisi[aktif] ?? 0) : 0;

  return (
    <Kerangka
      judul={`Input Data · ${namaLokasi}`}
      deskripsi="Isi angka bulanan seperti di lembar Excel. Setelah disimpan, dashboard langsung memakai angka baru. Kolom kosong = belum ada data, bukan nol."
      filter={false}
    >
      <Kartu className="flex flex-col gap-3 !py-4">
        <div className="flex flex-wrap items-end gap-3">
          <Pilihan label="Tahun" nilai={tahun} opsi={opsiTahun} onPilih={(t) => pindahPeriode(t, bulan)} />
          <Pilihan label="Bulan" nilai={bulan} opsi={opsiBulan} onPilih={(b) => pindahPeriode(tahun, b)} />
          <p className="pb-2 text-xs text-ink-2">Hanya bulan yang sudah berjalan (mulai {TAHUN_MULAI}) yang dapat diisi.</p>
        </div>

        {isian && (
          <div role="tablist" aria-label="Kategori data" className="flex flex-wrap gap-2">
            {kategoriDaftar.map((k) => {
              const n = jumlahBerubahDi(k);
              const dipilih = k === aktif;
              return (
                <button
                  key={k}
                  role="tab"
                  type="button"
                  aria-selected={dipilih}
                  onClick={() => setKategori(k)}
                  className={`fokus-cincin flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                    dipilih ? "bg-accent text-on-accent shadow-md" : "bg-card-2 text-ink-2 hover:bg-accent-soft hover:text-accent"
                  }`}
                >
                  {k}
                  <span className={`text-xs font-medium ${dipilih ? "text-on-accent/80" : "text-muted"}`}>
                    {isian.terisi[k] ?? 0}/{isian.skema.filter((c) => c.kategori === k).length}
                  </span>
                  {n > 0 && <span aria-label={`${n} perubahan belum disimpan`} className="size-2 rounded-full bg-[var(--peringatan)]" />}
                </button>
              );
            })}
          </div>
        )}
      </Kartu>

      {galatMuat && (
        <p role="alert" className="kartu p-5 text-sm text-ink-2">
          {galatMuat}
        </p>
      )}
      {!isian && !galatMuat && (
        <div role="status" className="flex items-center gap-3 p-4 text-sm text-ink-2">
          <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Memuat formulir…
        </div>
      )}

      {isian && aktif && (
        <>
          <p className="-mb-3 text-xs text-ink-2">
            {BULAN_PANJANG[bulan - 1]} {tahun} · {aktif}: <strong className="text-ink">{terisiAktif}</strong>/{kolomAktif.length} terisi · angka abu-abu = nilai bulan lalu ·
            simpan menggantikan seluruh isian {aktif} bulan ini
          </p>

          {seksiDaftar && seksi && (
            <div role="tablist" aria-label={`Bagian ${aktif}`} className="flex flex-wrap gap-1.5">
              {seksiDaftar.map((x) => {
                const dipilih = x.kunci === seksi.kunci;
                const terisiN = x.isi.filter((k) => nilaiTampil(k.id).trim() !== "").length;
                const ubahN = x.isi.filter((k) => berubah(k.id)).length;
                const salahN = x.isi.filter((k) => galatKolom[k.id]).length;
                return (
                  <button
                    key={x.kunci}
                    role="tab"
                    type="button"
                    aria-selected={dipilih}
                    onClick={() => setSeksiDipilih(x.kunci)}
                    className={`fokus-cincin flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
                      dipilih ? "border-accent bg-accent-soft text-accent" : "border-line bg-card text-ink-2 hover:border-accent hover:text-accent"
                    }`}
                  >
                    {x.label}
                    <span className="text-xs font-medium text-muted">
                      {terisiN}/{x.isi.length}
                    </span>
                    {salahN > 0 ? (
                      <span aria-label={`${salahN} isian salah`} className="size-2 rounded-full bg-[var(--buruk)]" />
                    ) : (
                      ubahN > 0 && <span aria-label={`${ubahN} perubahan belum disimpan`} className="size-2 rounded-full bg-[var(--peringatan)]" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <Kelompok
            kolom={kolomTampil}
            awalan={seksi?.kedalaman ?? 0}
            judulCadangan={seksi?.label ?? aktif}
            nilai={nilaiTampil}
            berubah={berubah}
            galat={galatKolom}
            sebelumnya={isian.sebelumnya}
            onUbah={(id, v) => setSunting((s) => ({ ...s, [id]: v }))}
          />

          {pesan && (
            <div
              role={pesan.jenis === "galat" ? "alert" : "status"}
              className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm ${
                pesan.jenis === "ok"
                  ? "border-[var(--baik)]/30 bg-[var(--baik)]/8 text-ink"
                  : "border-[var(--buruk)]/30 bg-[var(--buruk)]/8 text-ink"
              }`}
            >
              {pesan.jenis === "ok" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--baik)]" aria-hidden />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--buruk)]" aria-hidden />
              )}
              <span>{pesan.teks}</span>
            </div>
          )}

          {konfirmasi && (
            <Kartu className="border-[var(--peringatan)]/60">
              <h2 className="text-base font-bold text-ink">Periksa nilai yang berbeda jauh dari biasanya</h2>
              <p className="mt-1 text-sm text-ink-2">
                Nilai berikut sekitar 10 kali lebih besar atau lebih kecil dari median 12 bulan terakhir terminal ini. Pastikan satuan dan tanda koma benar.
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {konfirmasi.map((j) => (
                  <li key={j.metrik} className="rounded-xl bg-card-2 px-3.5 py-2.5">
                    <span className="block font-semibold text-ink">{labelMetrik(j.metrik)}</span>
                    <span className="text-ink-2">
                      Anda mengisi <strong className="text-ink">{angka(j.nilai)}</strong>, biasanya sekitar {angka(j.pembanding)}.
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={menyimpan}
                  onClick={() => simpan(konfirmasi.map((j) => j.metrik))}
                  className="fokus-cincin h-10 rounded-xl bg-accent px-4 text-sm font-bold text-on-accent shadow-md disabled:opacity-60"
                >
                  Nilai sudah benar, simpan
                </button>
                <button type="button" onClick={() => setKonfirmasi(null)} className="fokus-cincin h-10 rounded-xl bg-card-2 px-4 text-sm font-semibold text-ink-2">
                  Kembali memperbaiki
                </button>
              </div>
            </Kartu>
          )}

          <div className="sticky bottom-20 z-30 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-card/95 p-3 shadow-[var(--bayangan-naik)] backdrop-blur lg:bottom-4">
            <p className="flex-1 text-sm text-ink-2" aria-live="polite">
              {jumlahBerubahDi(aktif) ? (
                <>
                  <strong className="text-ink">{jumlahBerubahDi(aktif)}</strong> perubahan {aktif} belum disimpan
                  {jumlahBerubah > jumlahBerubahDi(aktif) ? ` (${jumlahBerubah - jumlahBerubahDi(aktif)} di kategori lain)` : ""}
                </>
              ) : jumlahBerubah ? (
                `Ada ${jumlahBerubah} perubahan belum disimpan di kategori lain.`
              ) : (
                "Belum ada perubahan."
              )}
            </p>
            <button
              type="button"
              onClick={batalkan}
              disabled={!jumlahBerubahDi(aktif) || menyimpan}
              className="fokus-cincin flex h-10 items-center gap-2 rounded-xl bg-card-2 px-3.5 text-sm font-semibold text-ink-2 disabled:opacity-40"
            >
              <Undo2 className="size-4" aria-hidden /> Batalkan
            </button>
            <button
              type="button"
              onClick={() => simpan()}
              disabled={menyimpan || !jumlahBerubahDi(aktif)}
              className="fokus-cincin flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-bold text-on-accent shadow-md transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-50"
            >
              <Save className="size-4" aria-hidden /> {menyimpan ? "Menyimpan…" : `Simpan ${aktif}`}
            </button>
          </div>
        </>
      )}
    </Kerangka>
  );
}

/** Mengelompokkan kolom berurutan yang berbagi induk menjadi kartu-kartu kecil yang tersusun berkolom. */
function Kelompok({
  kolom, awalan, judulCadangan, nilai, berubah, galat, sebelumnya, onUbah,
}: {
  kolom: Kolom[];
  /** jumlah level awal yang sudah ditampilkan oleh tab bagian (tidak diulang di judul kartu) */
  awalan: number;
  judulCadangan: string;
  nilai: (id: string) => string;
  berubah: (id: string) => boolean;
  galat: Record<string, string>;
  sebelumnya: Record<string, number>;
  onUbah: (id: string, v: string) => void;
}) {
  const kelompok = useMemo(() => {
    const hasil: { judul: string; isi: Kolom[] }[] = [];
    for (const k of kolom) {
      const judul = k.level.slice(awalan, -1).join(" › ");
      const akhir = hasil[hasil.length - 1];
      if (akhir && akhir.judul === judul) akhir.isi.push(k);
      else hasil.push({ judul, isi: [k] });
    }
    return hasil;
  }, [kolom, awalan]);

  return (
    <div className={`grid items-start gap-4 ${kelompok.length > 1 ? "md:grid-cols-2 2xl:grid-cols-3" : "max-w-xl"}`}>
      {kelompok.map((g, gi) => {
        const nilaiTerisi = g.isi.map((k) => keAngka(nilai(k.id))).filter((v): v is number => v !== null);
        const jumlahTerisi = g.isi.filter((k) => nilai(k.id).trim() !== "").length;
        const satuanSama = new Set(g.isi.map((k) => k.satuan)).size === 1;
        const jumlah = nilaiTerisi.reduce((a, b) => a + b, 0);
        return (
          <Kartu key={`${g.judul}-${gi}`} urut={Math.min(gi, 6)} className="!p-0">
            <div className="flex items-baseline justify-between gap-3 border-b border-line px-4 py-2.5">
              <h2 className="min-w-0 truncate text-sm font-bold text-ink" title={g.judul || judulCadangan}>
                {g.judul || judulCadangan}
              </h2>
              <span className="shrink-0 text-xs text-muted">
                {jumlahTerisi}/{g.isi.length}
                {g.isi.length > 1 && satuanSama && nilaiTerisi.length > 0 && (
                  <>
                    {" · "}
                    <span className="font-semibold text-ink-2">
                      {angka(jumlah)} {satuanTampil(g.isi[0].satuan)}
                    </span>
                  </>
                )}
              </span>
            </div>
            <ul>
              {g.isi.map((k) => {
                const id = `isian-${k.id}`;
                const lalu = sebelumnya[k.id];
                const salah = galat[k.id];
                const nama = k.level[k.level.length - 1];
                return (
                  <li key={k.id} className="px-4 py-1.5 even:bg-card-2/40">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor={id} className="min-w-0 flex-1 truncate text-sm text-ink" title={nama}>
                        {nama}
                      </label>
                      <div className="relative w-36 shrink-0">
                        <input
                          id={id}
                          inputMode="decimal"
                          autoComplete="off"
                          value={nilai(k.id)}
                          placeholder={lalu !== undefined ? angka(lalu) : ""}
                          title={lalu !== undefined ? `Bulan lalu: ${angka(lalu)} ${satuanTampil(k.satuan)}` : undefined}
                          onChange={(e) => onUbah(k.id, e.target.value)}
                          aria-invalid={salah ? true : undefined}
                          aria-describedby={salah ? `${id}-galat` : undefined}
                          className={`fokus-cincin h-9 w-full rounded-lg border bg-card pl-2.5 pr-9 text-right text-sm tabular-nums text-ink outline-none transition placeholder:text-muted/60 focus:border-accent ${
                            salah ? "border-[var(--buruk)]" : berubah(k.id) ? "border-[var(--peringatan)] bg-[var(--peringatan)]/8" : "border-line"
                          }`}
                        />
                        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[11px] text-muted">
                          {satuanTampil(k.satuan)}
                        </span>
                      </div>
                    </div>
                    {salah && (
                      <p id={`${id}-galat`} className="pt-1 text-xs text-[var(--buruk)]">
                        {salah}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Kartu>
        );
      })}
    </div>
  );
}
