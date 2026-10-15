import {
  SINGLE_COLUMN,
  formatAxisValue,
  formatMeasure,
  heatIntensity,
  heatScale,
  type CatalogMeasure,
  type Pivot,
} from "@/lib/olapExplorer";

interface Props {
  pivot: Pivot;
  measure: CatalogMeasure;
  /** Label dimensi baris, mis. ["Jurusan", "Program studi"]. */
  rowLabels: string[];
  /** Label dimensi kolom, ditampilkan di atas judul kolom. */
  columnLabel: string;
  /** Tinggi maksimum area geser; kosong = setinggi isinya. */
  maxHeight?: number;
  /** Klik sel → (indeks baris pivot, kunci kolom). */
  onCellClick?: (rowIndex: number, columnKey: string) => void;
}

/** Warna seri negatif pada skala divergen: biru, kontras dengan oranye primer. */
const NEGATIVE = "217 91% 60%";

/** Kepekatan minimum & maksimum: sel terendah tetap sedikit berwarna, tertinggi tidak menutupi teks. */
const ALPHA_MIN = 0.06;
const ALPHA_RANGE = 0.84;

/** Di atas ini teks sel ditulis dengan warna kontras primer. */
const ALPHA_TEXT_FLIP = 0.55;

/**
 * Angka sel diringkas: rupiah dan angka besar jadi "4,3 jt"; sisanya format
 * ukuran biasa. Nilai lengkapnya ada di tooltip sel dan di tabel.
 */
function ringkas(value: number, measure: CatalogMeasure): string {
  return measure.format === "currency" || Math.abs(value) >= 10_000
    ? formatAxisValue(value)
    : formatMeasure(value, measure.format);
}

/**
 * Heatmap: pivot dua arah yang selnya diwarnai menurut nilai. Pola (prodi
 * mana yang memburuk dari tahun ke tahun, ke provinsi mana lulusan tiap prodi
 * pergi) terbaca dari warna sekilas, dan angkanya tetap tertulis di sel.
 * Tahan terhadap banyak kategori di kedua arah, tidak seperti batang.
 */
const ExplorerHeatmap = ({ pivot, measure, rowLabels, columnLabel, maxHeight, onCellClick }: Props) => {
  const scale = heatScale(pivot, measure.key);
  if (!scale) return null;

  const warna = (value: number) => {
    const t = heatIntensity(value, scale);
    const alpha = ALPHA_MIN + ALPHA_RANGE * Math.abs(t);
    const hue = t < 0 ? NEGATIVE : "var(--primary)";
    return {
      backgroundColor: `hsl(${hue} / ${alpha.toFixed(3)})`,
      color: alpha > ALPHA_TEXT_FLIP ? "hsl(var(--primary-foreground))" : undefined,
    };
  };

  const bisaKlik = (value: number | null) =>
    onCellClick !== undefined && value !== null && !(measure.format === "integer" && value <= 0);

  const legendaKiri = scale.diverging ? -Math.max(Math.abs(scale.min), Math.abs(scale.max)) : scale.min;
  const legendaKanan = scale.diverging ? -legendaKiri : scale.max;
  const gradien = scale.diverging
    ? `linear-gradient(to right, hsl(${NEGATIVE} / 0.9), hsl(var(--primary) / ${ALPHA_MIN}), hsl(var(--primary) / 0.9))`
    : `linear-gradient(to right, hsl(var(--primary) / ${ALPHA_MIN}), hsl(var(--primary) / 0.9))`;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="tabular-nums">{formatMeasure(legendaKiri, measure.format)}</span>
        <span className="h-2.5 w-40 rounded-full" style={{ background: gradien }} />
        <span className="tabular-nums">{formatMeasure(legendaKanan, measure.format)}</span>
      </div>

      <div className="w-full overflow-auto rounded-md border" style={maxHeight ? { maxHeight } : undefined}>
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th
                className="sticky left-0 top-0 z-20 border-b bg-card px-3 py-2 text-left font-medium text-muted-foreground"
                scope="col"
              >
                {rowLabels.join(" › ")}
                <span className="block font-normal">{columnLabel} →</span>
              </th>
              {pivot.columnKeys.map((c) => (
                <th
                  key={c}
                  scope="col"
                  title={c}
                  className="sticky top-0 z-10 min-w-[72px] max-w-[140px] border-b bg-card px-2 py-2 text-center font-medium"
                >
                  <span className="line-clamp-2">{c === SINGLE_COLUMN ? "—" : c}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pivot.rows.map((row, rowIndex) => {
              const label = row.keys.join(" › ") || "Total";
              return (
                <tr key={label}>
                  <th
                    scope="row"
                    title={label}
                    className="sticky left-0 z-10 max-w-[260px] truncate border-b bg-card px-3 py-1.5 text-left font-normal"
                  >
                    {label}
                  </th>
                  {pivot.columnKeys.map((c) => {
                    const value = row.cells[c]?.[measure.key]?.value ?? null;
                    const isi = value === null ? "—" : ringkas(value, measure);
                    const judul = `${label} · ${c}: ${formatMeasure(value, measure.format)}`;

                    if (value === null) {
                      return (
                        <td key={c} title={judul} className="border-b px-2 py-1.5 text-center text-muted-foreground">
                          {isi}
                        </td>
                      );
                    }

                    return (
                      <td key={c} className="border-b border-background p-0" style={warna(value)}>
                        {bisaKlik(value) ? (
                          <button
                            type="button"
                            title={judul}
                            className="h-full w-full px-2 py-1.5 text-center tabular-nums hover:outline hover:outline-2 hover:-outline-offset-2 hover:outline-primary"
                            onClick={() => onCellClick?.(rowIndex, c)}
                          >
                            {isi}
                          </button>
                        ) : (
                          <span title={judul} className="block px-2 py-1.5 text-center tabular-nums">
                            {isi}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExplorerHeatmap;
