import { LatarAuth } from "@/components/LatarAuth";

/** Kerangka halaman masuk & ganti sandi: tanpa menu dan tanpa memuat data dashboard. */
export default function TataLetakAuth({ children }: { children: React.ReactNode }) {
  return <LatarAuth>{children}</LatarAuth>;
}
