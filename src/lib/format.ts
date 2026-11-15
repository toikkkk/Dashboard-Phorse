export const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const pemformat = new Map<number, Intl.NumberFormat>();
const kompak = new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 });

/** Angka lengkap format Indonesia; jumlah desimal menyesuaikan besar nilai. */
export function angka(n: number): string {
  const a = Math.abs(n);
  const desimal = a >= 100 ? 0 : a >= 1 ? 2 : a >= 0.01 ? 3 : 6;
  let f = pemformat.get(desimal);
  if (!f) {
    f = new Intl.NumberFormat("id-ID", { maximumFractionDigits: desimal });
    pemformat.set(desimal, f);
  }
  return f.format(n);
}

/** Angka ringkas untuk kartu & sumbu: 12,9 rb · 4,2 jt · 1,3 M. */
export function ringkas(n: number): string {
  return Math.abs(n) < 1000 ? angka(n) : kompak.format(n);
}
