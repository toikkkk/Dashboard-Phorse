"use client";

import { Lightbulb } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { ChipIndikator, tampilSatuan } from "@/components/KartuIndikator";
import { Kartu, Kerangka, usePeriode } from "@/components/Kerangka";
import { PanelGrafik } from "@/components/PanelGrafik";
import { Peringkat } from "@/components/Peringkat";
import { teksPersen } from "@/components/Perubahan";
import { SiapData, useData } from "@/lib/data";
import { angka, BULAN } from "@/lib/format";
import { banding, bulanTerakhirKategori, jumlahPelapor, perLokasi, tahunBulanan, total } from "@/lib/hitung";
import { INDIKATOR, type Indikator } from "@/lib/panel";

/** Satu paragraf pendek yang menjelaskan apa arti angka di bawahnya, disusun dari data yang sedang ditampilkan. */
function Ringkasan({ ind, urut }: { ind: Indikator; urut: number }) {
  const { data, filter } = useData();
  const periode = usePeriode();
  const melapor = jumlahPelapor(data, filter, ind);
  const hasil = total(data, filter, ind.ukuran);
  const ban = banding(data, filter, ind);
  const satuan = tampilSatuan(ind.ukuran.satuan);
  const dari = filter.lokasi !== null ? 1 : data.lokasi.length;
  const tempat = filter.lokasi !== null ? ` di ${data.lokasi[filter.lokasi].singkat}` : "";

  const kalimat: string[] = [];
  if (melapor === 0) {
    kalimat.push(`${ind.label}${tempat} belum ada datanya untuk ${periode}.`);
  } else {
    kalimat.push(`${ind.label}${tempat} pada ${periode}: ${angka(hasil.nilai)} ${satuan}.`);
    if (!("alasan" in ban)) {
      if (ban.persen === null) {
        kalimat.push(`Tahun lalu pada lokasi yang sama nilainya nol.`);
      } else if (Math.abs(ban.persen) < 1) {
        kalimat.push(`Hampir sama dengan ${ban.label} (selisih di bawah 1%).`);
      } else {
        kalimat.push(
          `${ban.persen > 0 ? "Naik" : "Turun"} ${teksPersen(Math.abs(ban.persen)).replace("+", "")} dibanding ${ban.label}, dihitung pada ${ban.lokasiSama} lokasi yang melapor di kedua periode.`,
        );
      }
      if (ban.ragu) {
        kalimat.push(
          `Hati-hati: sekitar ${Math.round(ban.porsiCek * 100)}% angkanya berasal dari nilai yang tampak janggal (tanda kuning), jadi persentase ini belum bisa dipercaya.`,
        );
      }
    } else {
      kalimat.push(`${ban.alasan}.`);
    }
    if (filter.lokasi === null) {
      const { nilai } = perLokasi(data, filter, ind.ukuran);
      const urut = nilai.filter((v) => v > 0).sort((a, b) => b - a);
      const jumlah = urut.reduce((a, b) => a + b, 0);
      if (urut.length >= 4 && jumlah > 0) {
        const porsi = (100 * urut.slice(0, 3).reduce((a, b) => a + b, 0)) / jumlah;
        kalimat.push(`Tiga lokasi teratas menyumbang ${porsi.toFixed(1).replace(".", ",")}% dari total.`);
      }
    }
    const akhirKat = bulanTerakhirKategori(data, filter.tahun, ind.kategori);
    if (!filter.bulan && tahunBulanan(data, filter.tahun) && akhirKat < 12) {
      kalimat.push(`Kategori ini baru terisi sampai ${BULAN[akhirKat - 1]} ${filter.tahun}.`);
    }
    kalimat.push(`Data dari ${filter.lokasi !== null ? "lokasi ini" : `${melapor} dari ${dari} lokasi`}.`);
  }

  return (
    <Kartu className="flex gap-4 bg-accent-soft" urut={urut}>
      <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent text-on-accent shadow-md">
        <Lightbulb className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm leading-relaxed text-ink">{kalimat.join(" ")}</p>
        <p className="mt-2 text-xs leading-relaxed text-ink-2">
          <strong className="text-ink">Arti indikator ini:</strong> {ind.definisi}
        </p>
      </div>
    </Kartu>
  );
}

type Lebar = "seimbang" | "grafik" | "lokasi";
const KOLOM: Record<Lebar, string> = {
  seimbang: "minmax(0, 7fr) minmax(0, 5fr)",
  grafik: "minmax(0, 9fr) minmax(0, 3fr)",
  lokasi: "minmax(0, 4fr) minmax(0, 8fr)",
};

function IsiEsg() {
  const { indikator, pilihIndikator } = useData();
  const [lebar, setLebar] = useState<Lebar>("seimbang");
  const ind = INDIKATOR.find((i) => i.id === indikator) ?? INDIKATOR[0];
  const [pilihanTampilan, setPilihanTampilan] = useState<Record<string, number>>({});
  const idx = Math.min(pilihanTampilan[ind.id] ?? 0, ind.tampilan.length - 1);
  const panel = ind.tampilan[idx].panel;

  const kontrol =
    ind.tampilan.length > 1 ? (
      <div role="group" aria-label="Tampilan grafik" className="flex w-fit flex-wrap gap-1 rounded-2xl bg-card-2 p-1">
        {ind.tampilan.map((t, i) => (
          <button
            key={t.label}
            type="button"
            aria-pressed={i === idx}
            onClick={() => setPilihanTampilan((p) => ({ ...p, [ind.id]: i }))}
            className={`fokus-cincin rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
              i === idx ? "bg-accent text-on-accent shadow-md" : "text-ink-2 hover:bg-accent-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    ) : null;

  return (
    <Kerangka
      judul="Data ESG"
      deskripsi="Pilih indikator, lihat kapan dan dari apa perubahannya terjadi, lalu temukan lokasi yang paling berpengaruh."
      tampil={ind.singkat}
    >
      <div role="group" aria-label="Pilih indikator" className="masuk -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-3 pt-1" style={{ "--i": 3 } as CSSProperties}>
        {INDIKATOR.map((i) => (
          <ChipIndikator key={i.id} ind={i} aktif={i.id === ind.id} onPilih={() => pilihIndikator(i.id)} />
        ))}
      </div>

      {/* key = ganti indikator mengulang animasi masuk */}
      <div key={ind.id} className="flex flex-col gap-5">
        <Ringkasan ind={ind} urut={0} />
        {/* Memperlebar satu kartu menggeser kolom (dianimasikan); kartu lain menyempit memberi ruang. */}
        <div
          className="grid grid-cols-1 items-start gap-5 xl:transition-[grid-template-columns] xl:duration-500 xl:ease-[cubic-bezier(0.2,0.7,0.2,1)] xl:grid-cols-(--kolom)"
          style={{ "--kolom": KOLOM[lebar] } as CSSProperties}
        >
          <PanelGrafik
            key={`${ind.id}-${idx}`}
            panel={panel}
            urut={1}
            nomor={1}
            pertanyaan="Kapan dan dari apa?"
            kontrol={kontrol}
            perlebar={{ aktif: lebar === "grafik", onToggle: () => setLebar((l) => (l === "grafik" ? "seimbang" : "grafik")) }}
          />
          <Peringkat
            id={`peringkat-${ind.id}`}
            ind={ind}
            urut={2}
            nomor={2}
            pertanyaan="Di mana?"
            perlebar={{ aktif: lebar === "lokasi", onToggle: () => setLebar((l) => (l === "lokasi" ? "seimbang" : "lokasi")) }}
          />
        </div>
      </div>
    </Kerangka>
  );
}

export default function HalamanEsg() {
  return (
    <SiapData>
      <IsiEsg />
    </SiapData>
  );
}
