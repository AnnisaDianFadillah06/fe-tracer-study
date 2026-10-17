import {
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { buildInsightColorMap } from "@/lib/chartColors";
import {
  formatAxisValue,
  formatMeasure,
  median,
  toScatterPoints,
  type CatalogMeasure,
  type Pivot,
  type ScatterPoint,
} from "@/lib/olapExplorer";

interface Props {
  pivot: Pivot;
  /** Ukuran ke-1 = X, ke-2 = Y, ke-3 (bila ada) = ukuran gelembung. */
  measures: CatalogMeasure[];
  height?: number;
  /** Klik titik → (indeks baris pivot, kunci kolom). */
  onPointClick?: (rowIndex: number, columnKey: string) => void;
}

/** Di atas ini nama kelompok tidak ditulis di samping titik; tetap ada di tooltip. */
const MAX_POINT_LABELS = 30;

const MUTED = "hsl(var(--muted-foreground))";

/**
 * Sebaran titik: satu titik per kelompok (mis. per prodi), X dan Y dari dua
 * ukuran, ukuran gelembung dari ukuran ketiga bila ada. Garis median di kedua
 * sumbu membagi bidang jadi empat kuadran -- "cepat dapat kerja dan bergaji
 * tinggi" vs "lambat dan bergaji rendah" terbaca dari satu gambar, bukan dari
 * dua grafik batang yang dibandingkan bolak-balik.
 */
const ExplorerScatterChart = ({ pivot, measures, height = 380, onPointClick }: Props) => {
  const [mx, my, mz] = measures;
  const points = toScatterPoints(pivot, mx.key, my.key, mz?.key ?? null);
  const series = Array.from(new Set(points.map((p) => p.series)));
  const colors = buildInsightColorMap(series);
  const showLegend = series.length > 1;

  const medianX = median(points.map((p) => p.x));
  const medianY = median(points.map((p) => p.y));
  const tulisLabel = points.length <= MAX_POINT_LABELS;

  const tooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: ScatterPoint }> }) => {
    const p = active ? payload?.[0]?.payload : undefined;
    if (!p) return null;
    return (
      <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
        <p className="mb-1 font-medium">{p.name}</p>
        {showLegend && <p className="text-muted-foreground">{p.series}</p>}
        <p>
          {mx.label}: <span className="tabular-nums">{formatMeasure(p.x, mx.format)}</span>
        </p>
        <p>
          {my.label}: <span className="tabular-nums">{formatMeasure(p.y, my.format)}</span>
        </p>
        {mz && (
          <p>
            {mz.label}: <span className="tabular-nums">{formatMeasure(p.z, mz.format)}</span>
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {showLegend && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {series.map((s) => (
            <span key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[s] }} />
              {s}
            </span>
          ))}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 28, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name={mx.label}
            domain={["auto", "auto"]}
            tick={{ fontSize: 12 }}
            tickFormatter={formatAxisValue}
            label={{ value: mx.label, position: "insideBottom", offset: -16, fontSize: 12, fill: MUTED }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={my.label}
            domain={["auto", "auto"]}
            tick={{ fontSize: 12 }}
            tickFormatter={formatAxisValue}
            label={{ value: my.label, angle: -90, position: "insideLeft", fontSize: 12, fill: MUTED, style: { textAnchor: "middle" } }}
          />
          {/* Tanpa ukuran ketiga semua titik sama besar. */}
          <ZAxis type="number" dataKey="z" range={mz ? [60, 900] : [90, 90]} />
          <Tooltip content={tooltip} cursor={{ strokeDasharray: "3 3" }} />

          {medianX !== null && (
            <ReferenceLine
              x={medianX}
              stroke={MUTED}
              strokeDasharray="4 4"
              label={{ value: "median", position: "top", fontSize: 11, fill: MUTED }}
            />
          )}
          {medianY !== null && (
            <ReferenceLine
              y={medianY}
              stroke={MUTED}
              strokeDasharray="4 4"
              label={{ value: "median", position: "insideTopRight", fontSize: 11, fill: MUTED }}
            />
          )}

          {series.map((s) => (
            <Scatter
              key={s}
              name={s}
              data={points.filter((p) => p.series === s)}
              fill={colors[s]}
              fillOpacity={0.7}
              stroke={colors[s]}
              style={onPointClick ? { cursor: "pointer" } : undefined}
              onClick={
                onPointClick
                  ? (d: { payload?: ScatterPoint } & Partial<ScatterPoint>) => {
                      const p = d.payload ?? d;
                      if (typeof p.rowIndex === "number" && typeof p.columnKey === "string") {
                        onPointClick(p.rowIndex, p.columnKey);
                      }
                    }
                  : undefined
              }
            >
              {tulisLabel && (
                <LabelList
                  dataKey="name"
                  position="top"
                  fontSize={11}
                  fill={MUTED}
                  formatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
                />
              )}
            </Scatter>
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      <p className="text-xs text-muted-foreground">
        Satu titik per kelompok. Garis putus-putus adalah median kedua sumbu; titik di kanan atas punya{" "}
        {mx.label.toLowerCase()} dan {my.label.toLowerCase()} di atas median.
        {mz && ` Besar gelembung menunjukkan ${mz.label.toLowerCase()}.`}
      </p>
    </div>
  );
};

export default ExplorerScatterChart;
