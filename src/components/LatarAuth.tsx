"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Leaf } from "lucide-react";
import { useRef, type ReactNode } from "react";

gsap.registerPlugin(useGSAP);

const BLOB = [
  { kelas: "left-[8%] top-[10%] size-[26rem]", warna: "rgba(47,123,224,0.35)", gerak: 0.035 },
  { kelas: "right-[6%] top-[28%] size-[22rem]", warna: "rgba(125,180,245,0.42)", gerak: -0.05 },
  { kelas: "bottom-[2%] left-[34%] size-[24rem]", warna: "rgba(26,79,163,0.25)", gerak: 0.06 },
];

/**
 * Latar halaman masuk: tiga gumpalan biru yang melayang pelan dan mengikuti kursor, kartu yang masuk dengan
 * animasi, dan logo yang memantul saat muncul. Dimatikan bila pengguna meminta gerak dikurangi.
 */
export function LatarAuth({ children }: { children: ReactNode }) {
  const akar = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from("[data-blob]", { scale: 0.5, opacity: 0, duration: 1.6, stagger: 0.18, ease: "power3.out" });
        gsap.utils.toArray<HTMLElement>("[data-melayang]").forEach((el) => {
          gsap.to(el, {
            x: "random(-70, 70)", y: "random(-60, 60)", scale: "random(0.9, 1.12)",
            duration: "random(6, 10)", repeat: -1, repeatRefresh: true, yoyo: true, ease: "sine.inOut",
          });
        });

        gsap
          .timeline({ defaults: { ease: "power3.out" } })
          .from("[data-kartu]", { y: 56, opacity: 0, scale: 0.95, duration: 0.9 })
          .from("[data-logo]", { scale: 0, rotate: -120, duration: 0.8, ease: "back.out(2.2)" }, "-=0.55");

        // Gumpalan bergeser sedikit mengikuti kursor (parallax).
        const penggerak = gsap.utils.toArray<HTMLElement>("[data-blob]").map((el, i) => ({
          x: gsap.quickTo(el, "x", { duration: 1.2, ease: "power3.out" }),
          y: gsap.quickTo(el, "y", { duration: 1.2, ease: "power3.out" }),
          k: BLOB[i]?.gerak ?? 0.04,
        }));
        const gerak = (e: PointerEvent) => {
          const dx = e.clientX - window.innerWidth / 2;
          const dy = e.clientY - window.innerHeight / 2;
          penggerak.forEach((p) => {
            p.x(dx * p.k);
            p.y(dy * p.k);
          });
        };
        window.addEventListener("pointermove", gerak);
        return () => window.removeEventListener("pointermove", gerak);
      });
    },
    { scope: akar },
  );

  return (
    <main ref={akar} className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {BLOB.map((b, i) => (
          <div key={i} data-blob className={`absolute ${b.kelas}`}>
            <div data-melayang className="size-full rounded-full blur-3xl" style={{ background: b.warna }} />
          </div>
        ))}
      </div>

      <div data-kartu className="kartu transition-none relative w-full max-w-sm p-7 sm:p-9">
        <div className="mb-7 flex items-center gap-3">
          <span data-logo aria-hidden className="flex size-12 items-center justify-center rounded-2xl bg-accent text-on-accent shadow-lg">
            <Leaf className="size-6" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-extrabold text-ink">Env Monitor</p>
            <p className="text-xs text-ink-2">Regional Jatimbalinus</p>
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
