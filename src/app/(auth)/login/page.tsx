"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowRight, Loader2 } from "lucide-react";
import { useActionState, useRef } from "react";
import { KolomAuth } from "@/components/KolomAuth";
import { masukAksi, type StatusLogin } from "./aksi";

gsap.registerPlugin(useGSAP);

export default function HalamanMasuk() {
  const [status, aksi, menunggu] = useActionState<StatusLogin, FormData>(masukAksi, null);
  const form = useRef<HTMLFormElement>(null);

  // Isian masuk satu per satu setelah kartu muncul.
  useGSAP(
    () => {
      gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-anim]", { y: 18, opacity: 0, duration: 0.55, stagger: 0.09, delay: 0.55, ease: "power3.out" });
      });
    },
    { scope: form },
  );

  // Getar singkat saat gagal masuk.
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
      <h1 data-anim className="text-2xl font-extrabold tracking-tight text-ink">
        Masuk
      </h1>

      <KolomAuth nama="username" label="Nama pengguna" autoComplete="username" maxLength={100} defaultValue={status?.username ?? ""} autoFocus />
      <KolomAuth nama="sandi" label="Kata sandi" type="password" autoComplete="current-password" maxLength={1024} />

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
            <Loader2 className="size-4 animate-spin" aria-hidden /> Memeriksa…
          </>
        ) : (
          <>
            Masuk
            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
          </>
        )}
      </button>
      </div>

      <p data-anim className="text-center text-xs text-muted">
        Lupa kata sandi? Hubungi admin regional.
      </p>
    </form>
  );
}
