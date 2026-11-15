"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { angka } from "@/lib/format";
import type { Banding } from "@/lib/hitung";
import { Tip } from "./Tip";

export function teksPersen(p: number): string {
  const desimal = Math.abs(p) >= 100 ? 0 : 1;
  return (
    new Intl.NumberFormat("id-ID", { maximumFractionDigits: desimal, signDisplay: "exceptZero" }).format(p).replace("-", "−") + "%"
  );
}

export type Sifat = "baik" | "buruk" | "netral";

/** Perubahan di bawah 1% dianggap stabil. Untuk indikator "turun", turun = baik dan naik = buruk. */
export function sifatPerubahan(persen: number | null, arah: "turun" | "netral"): Sifat {
  if (persen === null || Math.abs(persen) < 1 || arah === "netral") return "netral";
  return persen < 0 ? "baik" : "buruk";
}

const WARNA: Record<Sifat, string> = { baik: "var(--baik)", buruk: "var(--buruk)", netral: "var(--muted)" };

/**
 * Lencana kecil: panah + persen (tidak mengandalkan warna saja).
 * `ragu` = persen didominasi nilai yang tampak janggal: warnanya dinetralkan dan diberi titik kuning.
 */
export function LencanaPerubahan({
  persen, arah, kecil = false, ragu = false,
}: {
  persen: number | null; arah: "turun" | "netral"; kecil?: boolean; ragu?: boolean;
}) {
  const sifat = ragu ? "netral" : sifatPerubahan(persen, arah);
  const Ikon = persen === null || Math.abs(persen) < 1 ? Minus : persen > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold tabular-nums text-ink ${kecil ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs"}`}
      style={{ background: `color-mix(in srgb, ${WARNA[sifat]} 16%, transparent)` }}
    >
      {ragu && <span aria-hidden className="inline-block size-2 rounded-full" style={{ background: "var(--peringatan)" }} />}
      <Ikon aria-hidden className={kecil ? "size-3" : "size-3.5"} style={{ color: WARNA[sifat] }} strokeWidth={3} />
      {persen === null ? "baru" : Math.abs(persen) < 1 ? "stabil" : teksPersen(persen)}
      {ragu && <span className="sr-only"> (perlu dicek)</span>}
    </span>
  );
}

/** Perubahan dibanding periode setara tahun lalu, lengkap dengan penjelasan dasar perhitungannya. */
export function PerubahanIndikator({
  ban, arah, satuan, ringkas = false,
}: {
  ban: Banding | { alasan: string }; arah: "turun" | "netral"; satuan: string; ringkas?: boolean;
}) {
  if ("alasan" in ban) {
    return (
      <Tip teks={ban.alasan} sisi="atas" className="self-start">
        <span tabIndex={0} className="fokus-cincin rounded text-xs text-muted">
          Tanpa pembanding
        </span>
      </Tip>
    );
  }
  const penjelasan = (
    <>
      Dibandingkan dengan <strong>{ban.label}</strong>, hanya pada {ban.lokasiSama} lokasi yang melapor di kedua periode (agar adil).
      <br />
      Pada lokasi-lokasi itu: {angka(ban.lalu)} → {angka(ban.nilai)} {satuan === "m3" ? "m³" : satuan}.
      <br />
      {arah === "turun"
        ? "Untuk indikator ini, lebih rendah lebih baik."
        : "Indikator netral: naik atau turun tidak otomatis baik atau buruk."}
      {ban.ragu && (
        <>
          <br />
          <strong>Hati-hati:</strong> {Math.round(ban.porsiCek * 100)}% dari angka ini berasal dari nilai yang tampak janggal
          (&ldquo;perlu dicek&rdquo;), sehingga persentasenya belum bisa dipercaya.
        </>
      )}
    </>
  );
  return (
    <Tip teks={penjelasan} sisi="atas" className="self-start">
      <span tabIndex={0} className="fokus-cincin inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded">
        <LencanaPerubahan persen={ban.persen} arah={arah} ragu={ban.ragu} />
        {!ringkas && <span className="text-xs text-ink-2">vs {ban.label}</span>}
      </span>
    </Tip>
  );
}
