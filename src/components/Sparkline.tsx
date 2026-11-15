/** Mini grafik garis untuk kartu indikator. Titik terakhir (atau bulan yang difokuskan) diberi penanda. */
export function Sparkline({
  nilai, sorot = -1, lebar = 132, tinggi = 36, label,
}: {
  nilai: (number | null)[]; sorot?: number; lebar?: number; tinggi?: number; label: string;
}) {
  const ada = nilai.flatMap((v, i) => (v == null ? [] : [{ i, v }]));
  if (ada.length < 2) return null;
  const min = Math.min(...ada.map((t) => t.v));
  const maks = Math.max(...ada.map((t) => t.v));
  const pad = 5;
  const x = (i: number) => pad + (i / (nilai.length - 1)) * (lebar - 2 * pad);
  const y = (v: number) => (maks === min ? tinggi / 2 : tinggi - pad - ((v - min) / (maks - min)) * (tinggi - 2 * pad));
  const titikAkhir = ada[ada.length - 1];
  const titikSorot = sorot >= 0 ? ada.find((t) => t.i === sorot) : undefined;
  return (
    <svg width={lebar} height={tinggi} viewBox={`0 0 ${lebar} ${tinggi}`} role="img" aria-label={label} className="shrink-0 overflow-visible">
      <polyline
        points={ada.map((t) => `${x(t.i)},${y(t.v)}`).join(" ")}
        fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity={titikSorot ? 0.45 : 1}
      />
      <circle cx={x(titikAkhir.i)} cy={y(titikAkhir.v)} r="3.5" fill="var(--accent)" stroke="var(--card)" strokeWidth="2" opacity={titikSorot ? 0.45 : 1} />
      {titikSorot && <circle cx={x(titikSorot.i)} cy={y(titikSorot.v)} r="5" fill="var(--accent)" stroke="var(--card)" strokeWidth="2" />}
    </svg>
  );
}
