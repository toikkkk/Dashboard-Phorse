"use client";

import { Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";

/**
 * Kolom isian bergaya "label mengambang": label naik saat kolom difokuskan atau terisi.
 * Kolom sandi punya tombol lihat/sembunyikan.
 */
export function KolomAuth({
  nama, label, type = "text", autoComplete, defaultValue, maxLength, autoFocus,
}: {
  nama: string;
  label: string;
  type?: "text" | "password";
  autoComplete: string;
  defaultValue?: string;
  maxLength: number;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [lihat, setLihat] = useState(false);
  const sandi = type === "password";
  return (
    <div data-anim className="relative">
      <input
        id={id}
        name={nama}
        type={sandi && lihat ? "text" : type}
        autoComplete={autoComplete}
        defaultValue={defaultValue}
        maxLength={maxLength}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        placeholder=" "
        className={`peer h-14 w-full rounded-2xl border border-white/20 bg-white/10 pl-4 pt-4 text-sm text-white outline-none transition focus:border-white/70 focus:bg-white/15 focus:shadow-[0_0_0_4px_rgba(255,255,255,0.12)] focus-visible:outline-none autofill:[-webkit-text-fill-color:#fff] autofill:shadow-[inset_0_0_0_1000px_rgba(40,90,170,0.9)] ${sandi ? "pr-12" : "pr-4"}`}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-2 text-[11px] font-semibold text-white/70 transition-all duration-200 peer-placeholder-shown:top-[1.05rem] peer-placeholder-shown:text-sm peer-placeholder-shown:font-medium peer-placeholder-shown:text-white/55 peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-white"
      >
        {label}
      </label>
      {sandi && (
        <button
          type="button"
          onClick={() => setLihat((v) => !v)}
          aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          aria-pressed={lihat}
          className="absolute right-2 top-2.5 flex size-9 items-center justify-center rounded-xl text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
        >
          {lihat ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
        </button>
      )}
    </div>
  );
}
