import { RangkaAplikasi } from "@/components/RangkaAplikasi";
import { PenyediaData } from "@/lib/data";

/** Kerangka aplikasi untuk pengguna yang sudah masuk. Data dimuat dari API yang mewajibkan login. */
export default function TataLetakAplikasi({ children }: { children: React.ReactNode }) {
  return (
    <PenyediaData>
      <RangkaAplikasi>{children}</RangkaAplikasi>
    </PenyediaData>
  );
}
