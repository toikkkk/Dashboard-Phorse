"use client";

import { Check, Copy, KeyRound, Power } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Kartu, Kerangka } from "@/components/Kerangka";
import { SiapData, useData } from "@/lib/data";
import { aturUlangSandiAksi, ubahAktifAksi } from "./aksi";

type Akun = {
  id: string;
  username: string;
  nama: string;
  peran: "admin" | "terminal";
  lokasi: string | null;
  aktif: boolean;
  harusGanti: boolean;
  terakhirLogin: string | null;
  sesiAktif: number;
};

const waktu = (s: string | null) =>
  s ? new Date(s).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }) : "Belum pernah";

export default function HalamanAkun() {
  return (
    <SiapData>
      <Isi />
    </SiapData>
  );
}

function Isi() {
  const { pengguna } = useData();
  const [daftar, setDaftar] = useState<Akun[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [sandiBaru, setSandiBaru] = useState<{ username: string; sandi: string } | null>(null);
  const [salin, setSalin] = useState(false);
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);

  const muat = useCallback(async () => {
    try {
      const r = await fetch("/api/akun", { cache: "no-store", credentials: "same-origin" });
      if (!r.ok) throw new Error(String(r.status));
      setDaftar(((await r.json()) as { akun: Akun[] }).akun);
      setGalat(null);
    } catch {
      setGalat("Daftar akun gagal dimuat.");
    }
  }, []);

  useEffect(() => {
    if (pengguna.peran !== "admin") return;
    let batal = false;
    fetch("/api/akun", { cache: "no-store", credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        const j = (await r.json()) as { akun: Akun[] };
        if (!batal) setDaftar(j.akun);
      })
      .catch(() => !batal && setGalat("Daftar akun gagal dimuat."));
    return () => {
      batal = true;
    };
  }, [pengguna.peran]);

  if (pengguna.peran !== "admin") {
    return (
      <Kerangka judul="Kelola Akun" filter={false}>
        <Kartu>
          <p className="text-sm text-ink-2">Halaman ini hanya untuk admin regional.</p>
        </Kartu>
      </Kerangka>
    );
  }

  const aturUlang = async (a: Akun) => {
    if (!window.confirm(`Atur ulang kata sandi ${a.username}? Semua sesi akun ini akan dikeluarkan.`)) return;
    setSibuk(a.id);
    setPesan(null);
    const h = await aturUlangSandiAksi(a.id);
    setSibuk(null);
    if (h.ok) {
      setSandiBaru({ username: h.username, sandi: h.sandiBaru });
      setSalin(false);
      await muat();
    } else setPesan(h.pesan);
  };

  const ubahAktif = async (a: Akun) => {
    if (a.aktif && !window.confirm(`Nonaktifkan akun ${a.username}? Akun ini tidak bisa masuk sampai diaktifkan lagi.`)) return;
    setSibuk(a.id);
    setPesan(null);
    const h = await ubahAktifAksi(a.id, !a.aktif);
    setSibuk(null);
    if (h.ok) await muat();
    else setPesan(h.pesan);
  };

  return (
    <Kerangka
      judul="Kelola Akun"
      deskripsi="Satu akun untuk setiap terminal. Atur ulang kata sandi bila petugas lupa; kata sandi sementara hanya ditampilkan sekali dan wajib diganti saat masuk."
      filter={false}
    >
      {sandiBaru && (
        <Kartu className="border-[var(--peringatan)]/60">
          <h2 className="text-base font-bold text-ink">Kata sandi sementara untuk {sandiBaru.username}</h2>
          <p className="mt-1 text-sm text-ink-2">Salin dan sampaikan ke petugas lewat jalur yang aman. Kata sandi ini tidak akan ditampilkan lagi.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-xl bg-card-2 px-3.5 py-2.5 font-mono text-sm font-bold tracking-wide text-ink select-all">{sandiBaru.sandi}</code>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(sandiBaru.sandi);
                  setSalin(true);
                } catch {
                  setSalin(false);
                }
              }}
              className="fokus-cincin flex h-10 items-center gap-2 rounded-xl bg-accent px-3.5 text-sm font-bold text-on-accent"
            >
              {salin ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {salin ? "Tersalin" : "Salin"}
            </button>
            <button type="button" onClick={() => setSandiBaru(null)} className="fokus-cincin h-10 rounded-xl bg-card-2 px-3.5 text-sm font-semibold text-ink-2">
              Sudah saya salin
            </button>
          </div>
        </Kartu>
      )}

      {(galat || pesan) && (
        <p role="alert" className="rounded-2xl border border-[var(--buruk)]/30 bg-[var(--buruk)]/8 px-4 py-3 text-sm text-ink">
          {galat ?? pesan}
        </p>
      )}

      <Kartu className="!p-0 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-2">
              <th className="px-5 py-3 font-semibold">Akun</th>
              <th className="px-3 py-3 font-semibold">Terminal</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Terakhir masuk</th>
              <th className="px-5 py-3 text-right font-semibold">Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {(daftar ?? []).map((a) => (
              <tr key={a.id}>
                <td className="px-5 py-2.5">
                  <span className="block font-semibold text-ink">{a.username}</span>
                  <span className="text-xs text-ink-2">{a.peran === "admin" ? "Admin regional" : "Akun terminal"}</span>
                </td>
                <td className="px-3 py-2.5 text-ink-2">{a.lokasi ?? "Semua"}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${a.aktif ? "bg-[var(--baik)]/12 text-[var(--baik)]" : "bg-card-2 text-muted"}`}>
                    {a.aktif ? "Aktif" : "Nonaktif"}
                  </span>
                  {a.harusGanti && <span className="ml-1.5 text-xs text-ink-2">belum ganti sandi</span>}
                </td>
                <td className="px-3 py-2.5 text-ink-2">{waktu(a.terakhirLogin)}</td>
                <td className="px-5 py-2.5">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={sibuk === a.id}
                      onClick={() => aturUlang(a)}
                      className="fokus-cincin flex h-9 items-center gap-1.5 rounded-xl bg-card-2 px-3 text-xs font-semibold text-ink-2 hover:bg-accent-soft hover:text-accent disabled:opacity-50"
                    >
                      <KeyRound className="size-3.5" aria-hidden /> Atur ulang sandi
                    </button>
                    {a.username !== pengguna.username && (
                      <button
                        type="button"
                        disabled={sibuk === a.id}
                        onClick={() => ubahAktif(a)}
                        className="fokus-cincin flex h-9 items-center gap-1.5 rounded-xl bg-card-2 px-3 text-xs font-semibold text-ink-2 hover:bg-accent-soft hover:text-accent disabled:opacity-50"
                      >
                        <Power className="size-3.5" aria-hidden /> {a.aktif ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!daftar && !galat && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-ink-2">
                  Memuat…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Kartu>
    </Kerangka>
  );
}
