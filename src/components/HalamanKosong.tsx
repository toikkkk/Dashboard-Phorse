import { Inbox } from "lucide-react";
import { Kartu, Kerangka } from "./Kerangka";

/** Halaman menu yang datanya belum tersedia di file Excel sumber. */
export function HalamanKosong({ judul }: { judul: string }) {
  return (
    <Kerangka judul={judul} filter={false}>
      <Kartu className="flex flex-col items-center py-20 text-center" urut={2}>
        <span aria-hidden className="mb-4 flex size-16 items-center justify-center rounded-3xl bg-accent-soft text-accent">
          <Inbox className="size-8" />
        </span>
        <p className="text-lg font-bold text-ink">Belum ada data</p>
        <p className="mt-2 max-w-sm text-sm text-ink-2">
          Data untuk halaman ini tidak ada di file Excel sumber. Halaman akan diisi setelah datanya tersedia.
        </p>
      </Kartu>
    </Kerangka>
  );
}
