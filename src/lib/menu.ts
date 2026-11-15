// Urutan menu mengikuti situs referensi "Portal Env Monitoring RPM".
// `tersedia` = ada datanya di file Excel sumber.
export const MENU = [
  { href: "/", label: "Beranda", tersedia: true },
  { href: "/esg", label: "Data ESG", tersedia: true },
  { href: "/pelaporan-simpel", label: "Pelaporan SIMPEL", tersedia: false },
  { href: "/risiko-bencana", label: "Risiko Bencana", tersedia: false },
  { href: "/kompatibilitas-b3", label: "Kompatibilitas B3", tersedia: false },
  { href: "/perizinan-lingkungan", label: "Perizinan Lingkungan", tersedia: false },
  { href: "/oil-catcher", label: "Oil Catcher", tersedia: true },
  { href: "/ipal-domestik", label: "IPAL Domestik", tersedia: true },
  { href: "/kedaruratan-b3", label: "Kedaruratan B3", tersedia: false },
] as const;
