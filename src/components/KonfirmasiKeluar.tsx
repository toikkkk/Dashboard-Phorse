"use client";

import { LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { keluarAksi } from "@/app/(auth)/login/aksi";

/**
 * Dialog konfirmasi keluar. Memakai <dialog> bawaan browser: fokus terkunci di dalam dialog,
 * Esc menutup, dan isi halaman di belakangnya tidak bisa diklik.
 */
export function KonfirmasiKeluar({ buka, onTutup }: { buka: boolean; onTutup: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mengirim, setMengirim] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (buka && !d.open) d.showModal();
    if (!buka && d.open) d.close();
  }, [buka]);

  return (
    <dialog
      ref={dialog}
      onClose={onTutup}
      onClick={(e) => {
        // klik di area gelap (di luar kartu) menutup dialog
        if (e.target === dialog.current) onTutup();
      }}
      aria-labelledby="judul-keluar"
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl border border-line bg-card p-0 text-ink shadow-[0_30px_80px_-20px_rgba(15,27,51,0.5)] backdrop:bg-[#0f1b33]/45 backdrop:backdrop-blur-[2px] open:animate-[dialog-masuk_0.25s_cubic-bezier(0.2,0.7,0.2,1)]"
    >
      <form
        action={keluarAksi}
        onSubmit={() => setMengirim(true)}
        className="flex flex-col items-center gap-4 p-7 text-center"
      >
        <span aria-hidden className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <LogOut className="size-6" />
        </span>
        <div>
          <h2 id="judul-keluar" className="text-lg font-extrabold">
            Keluar dari akun?
          </h2>
          <p className="mt-1 text-sm text-ink-2">Anda perlu masuk lagi untuk melihat dashboard atau mengisi data. Isian yang belum disimpan akan hilang.</p>
        </div>
        <div className="mt-1 grid w-full grid-cols-2 gap-2.5">
          <button
            type="button"
            autoFocus
            onClick={onTutup}
            className="fokus-cincin h-11 rounded-2xl bg-card-2 text-sm font-semibold text-ink transition hover:bg-accent-soft hover:text-accent"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={mengirim}
            className="fokus-cincin h-11 rounded-2xl bg-accent text-sm font-bold text-on-accent shadow-md transition hover:-translate-y-0.5 disabled:opacity-60"
          >
            {mengirim ? "Keluar…" : "Ya, keluar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
