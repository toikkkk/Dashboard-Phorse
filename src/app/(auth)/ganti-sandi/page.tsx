"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight, Loader2 } from "lucide-react";
import { useActionState, useRef } from "react";
import { KolomAuth } from "@/components/KolomAuth";
import { gantiSandiAksi, type StatusGanti } from "./aksi";

gsap.registerPlugin(useGSAP);

export default function HalamanGantiSandi() {
  const [status, aksi, menunggu] = useActionState<StatusGanti, FormData>(gantiSandiAksi, null);
  const form = useRef<HTMLFormElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-anim]", { y: 18, opacity: 0, duration: 0.55, stagger: 0.09, delay: 0.3, ease: "power3.out" });
      });
    },
    { scope: form },
  );

  useGSAP(
    () => {
      if (!status?.galat) return;
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo("[data-kartu]", { x: -12 }, { x: 0, duration: 0.7, ease: "elastic.out(1.1, 0.25)" });
        gsap.from("[data-galat]", { y: -8, opacity: 0, duration: 0.35, ease: "power2.out" });
      });
    },
    { dependencies: [status] },
  );

  return (
    <form ref={form} action={aksi} className="space-y-4" noValidate>
      <div data-anim>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">Buat kata sandi baru</h1>
        <p className="mt-1 text-sm text-ink-2">Kata sandi awal hanya untuk masuk pertama kali.</p>
      </div>

      <KolomAuth nama="sandiLama" label="Kata sandi saat ini" type="password" autoComplete="current-password" maxLength={1024} />
      <KolomAuth nama="sandiBaru" label="Kata sandi baru" type="password" autoComplete="new-password" maxLength={1024} />
      <KolomAuth nama="ulang" label="Ulangi kata sandi baru" type="password" autoComplete="new-password" maxLength={1024} />
      <p data-anim className="text-xs text-ink-2">
        Minimal 12 karakter, berisi huruf dan angka, bukan kata sandi umum.
      </p>

      {status?.galat && (
        <p data-galat role="alert" className="rounded-xl bg-[var(--buruk)]/8 px-3.5 py-2.5 text-sm text-[var(--buruk)]">
          {status.galat}
        </p>
      )}

      {/* data-anim di pembungkus: tombol punya transisi CSS sendiri yang bentrok dengan animasi GSAP */}
      <div data-anim>
      <button
        type="submit"
        disabled={menunggu}
        className="fokus-cincin group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-sm font-bold text-on-accent shadow-[0_10px_24px_-10px_var(--accent)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-10px_var(--accent)] active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:opacity-70"
      >
        {menunggu ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden /> Menyimpan…
          </>
        ) : (
          <>
            Simpan dan lanjut
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
          </>
        )}
      </button>
      </div>
    </form>
  );
}
