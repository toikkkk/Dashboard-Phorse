"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { Leaf } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Ilustrasi } from "./Ilustrasi";

gsap.registerPlugin(useGSAP, MorphSVGPlugin);

// Dua bentuk pembatas panel putih (kiri) dan panel biru (kanan); GSAP melenturkan satu ke yang lain terus-menerus.
const BENTUK_A = "M0,0 L690,0 C770,120 600,236 650,384 C700,532 862,600 760,762 C700,858 744,940 700,1000 L0,1000 Z";
const BENTUK_B = "M0,0 L724,0 C650,146 762,246 702,384 C642,522 744,642 792,762 C832,862 652,952 722,1000 L0,1000 Z";

/**
 * Halaman masuk dua panel: kiri putih berbentuk organik berisi ilustrasi, kanan biru tua berisi formulir.
 * Animasi GSAP: bentuk pembatas melentur pelan, ilustrasi tumbuh lalu melayang dan mengikuti kursor (parallax),
 * formulir masuk dari kanan. Dimatikan bila pengguna meminta gerak dikurangi.
 */
export function LatarAuth({ children }: { children: ReactNode }) {
  const akar = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
        tl.from("[data-bentuk]", { xPercent: -30, opacity: 0, duration: 1.1, ease: "power4.out" })
          .from("[data-merek]", { y: -16, opacity: 0, duration: 0.6 }, 0.35)
          .from("[data-ilus]", { scale: 0.88, opacity: 0, duration: 0.9 }, 0.2)
          .from("[data-tumbuh]", { scaleY: 0, transformOrigin: "50% 100%", duration: 0.8, stagger: 0.13, ease: "back.out(1.4)" }, 0.55)
          .from("[data-par='1'], [data-par='1.2'], [data-par='0.9'], [data-par='1.1']", { scale: 0, transformOrigin: "50% 50%", duration: 0.7, stagger: 0.12, ease: "back.out(2)" }, 0.9)
          .from("[data-goyang]", { opacity: 0, duration: 0.9 }, 1)
          .from("[data-panel]", { x: 70, opacity: 0, duration: 0.9 }, 0.3)
          .from("[data-kaki]", { opacity: 0, duration: 0.8 }, 1);

        // Pembatas melentur terus-menerus.
        gsap.to("[data-morph]", { morphSVG: BENTUK_B, duration: 7, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.to("[data-morph-bayang]", { morphSVG: BENTUK_B, duration: 7, delay: 0.5, repeat: -1, yoyo: true, ease: "sine.inOut" });

        // Benda melayang pelan, daun bergoyang, gelembung hanyut.
        gsap.utils.toArray<SVGElement>("[data-float]").forEach((el, i) => {
          const a = Number(el.dataset.float) || 6;
          gsap.to(el, { y: `+=${a}`, duration: 2.4 + i * 0.35, repeat: -1, yoyo: true, ease: "sine.inOut", delay: i * 0.2 });
        });
        gsap.to("[data-goyang]", { rotation: 4, svgOrigin: "120 446", duration: 2.6, repeat: -1, yoyo: true, ease: "sine.inOut" });
        gsap.utils.toArray<SVGElement>("[data-gelembung]").forEach((el, i) => {
          gsap.to(el, { x: "random(-14, 14)", y: "random(-18, 18)", duration: "random(3, 5.5)", repeat: -1, repeatRefresh: true, yoyo: true, ease: "sine.inOut", delay: i * 0.15 });
        });

        // Ilustrasi bergeser sedikit mengikuti kursor; benda yang lebih "dekat" bergeser lebih jauh.
        const lapis = gsap.utils.toArray<SVGElement>("[data-par]").map((el) => ({
          k: Number(el.dataset.par) || 0.5,
          x: gsap.quickTo(el, "xPercent", { duration: 1.1, ease: "power3.out" }),
          y: gsap.quickTo(el, "yPercent", { duration: 1.1, ease: "power3.out" }),
        }));
        const gerak = (e: PointerEvent) => {
          const dx = (e.clientX / window.innerWidth - 0.5) * 2;
          const dy = (e.clientY / window.innerHeight - 0.5) * 2;
          lapis.forEach((l) => {
            l.x(dx * l.k * -3);
            l.y(dy * l.k * -3);
          });
        };
        window.addEventListener("pointermove", gerak);
        return () => window.removeEventListener("pointermove", gerak);
      });
    },
    { scope: akar },
  );

  return (
    <main ref={akar} className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#1c58ad_0%,#123a7e_55%,#0b2552_100%)] text-white">
      {/* lingkaran dekoratif di panel biru */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/[0.05]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 right-[18%] size-[26rem] rounded-full bg-white/[0.04]" />

      {/* bentuk putih organik (layar lebar) */}
      <svg aria-hidden data-bentuk className="pointer-events-none absolute inset-y-0 left-0 hidden h-full w-[68%] lg:block" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        <path data-morph-bayang d={BENTUK_A} transform="translate(26 0)" fill="#ffffff" opacity="0.14" />
        <path data-morph d={BENTUK_A} fill="#f7faff" />
      </svg>

      {/* merek */}
      <div data-merek className="absolute left-6 top-6 z-20 hidden items-center gap-3 lg:left-10 lg:top-8 lg:flex">
        <span aria-hidden className="flex size-11 items-center justify-center rounded-2xl bg-accent text-on-accent shadow-lg">
          <Leaf className="size-5" />
        </span>
        <div className="leading-tight text-ink">
          <p className="text-sm font-extrabold">Env Monitor</p>
          <p className="text-xs text-ink-2">Regional Jatimbalinus</p>
        </div>
      </div>

      {/* ilustrasi */}
      <div data-ilus className="pointer-events-none absolute left-[3%] top-1/2 z-10 hidden w-[46%] max-w-[780px] -translate-y-1/2 lg:block">
        <Ilustrasi />
      </div>

      {/* formulir */}
      <section data-panel className="relative z-20 flex min-h-screen items-center justify-center px-6 py-12 lg:ml-auto lg:w-[38%] lg:px-10 xl:px-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span aria-hidden className="flex size-11 items-center justify-center rounded-2xl bg-white text-accent shadow-lg">
              <Leaf className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-extrabold">Env Monitor</p>
              <p className="text-xs text-white/70">Regional Jatimbalinus</p>
            </div>
          </div>
          {children}
        </div>
      </section>

      <p data-kaki className="absolute bottom-5 left-6 z-20 hidden text-[11px] text-ink-2 lg:left-10 lg:block">
        © 2026 Env Monitor · Regional Jatimbalinus
      </p>
      <p data-kaki className="absolute bottom-5 right-6 z-20 hidden text-[11px] text-white/60 lg:right-10 lg:block">
        Ada kendala? Hubungi admin regional.
      </p>
    </main>
  );
}
