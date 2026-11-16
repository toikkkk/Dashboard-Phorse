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
        className={`peer fokus-cincin h-14 w-full rounded-2xl border border-line bg-card-2 pl-4 pt-4 text-sm text-ink outline-none transition focus:border-accent focus:bg-card focus:shadow-[0_0_0_4px_var(--accent-soft)] ${sandi ? "pr-12" : "pr-4"}`}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-4 top-2 text-[11px] font-semibold text-ink-2 transition-all duration-200 peer-placeholder-shown:top-[1.05rem] peer-placeholder-shown:text-sm peer-placeholder-shown:font-medium peer-placeholder-shown:text-muted peer-focus:top-2 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-accent"
      >
        {label}
      </label>
      {sandi && (
        <button
          type="button"
          onClick={() => setLihat((v) => !v)}
          aria-label={lihat ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          aria-pressed={lihat}
          className="fokus-cincin absolute right-2 top-2.5 flex size-9 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-accent-soft hover:text-accent"
        >
          {lihat ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
        </button>
      )}
    </div>
  );
}
