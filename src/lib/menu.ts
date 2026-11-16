// Menu hanya memuat halaman yang ada datanya. `peran` = menu hanya untuk peran itu (tanpa = semua).
export type ItemMenu = {
  href: string;
  label: string;
  peran?: "terminal" | "admin";
};

export const MENU: ItemMenu[] = [
  { href: "/", label: "Beranda" },
  { href: "/esg", label: "Data ESG" },
  { href: "/input", label: "Input Data", peran: "terminal" },
  { href: "/oil-catcher", label: "Oil Catcher" },
  { href: "/ipal-domestik", label: "IPAL Domestik" },
  { href: "/akun", label: "Kelola Akun", peran: "admin" },
];
