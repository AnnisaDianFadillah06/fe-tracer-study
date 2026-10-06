import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildColorMap } from "@/lib/chartColors";
import { tooltipStyle } from "../charts/common/KpiCard";
import {
  comboSeries,
  formatAxisValue,
  formatMeasure,
  minChartWidth,
  toComboData,
  type CatalogMeasure,
  type Pivot,
} from "@/lib/olapExplorer";

interface Props {
  pivot: Pivot;
  measures: CatalogMeasure[];
  height?: number;
  /** Klik batang/titik → (indeks baris pivot, kunci measure). */
  onPointClick?: (rowIndex: number, measureKey: string) => void;
}

/**
 * Semua ukuran dari satu eksekusi dalam satu chart. Ukuran berformat sama
 * dengan yang pertama dibatang pada sumbu kiri; ukuran berbeda satuan
 * (mis. rupiah vs jumlah orang) digaris pada sumbu kanan, supaya tidak ada
 * yang rata di dasar karena skalanya berbeda.
 */
const ExplorerComboChart = ({ pivot, measures, height = 340, onPointClick }: Props) => {
  const series = comboSeries(measures);
  const data = toComboData(pivot, series);
  const colors = buildColorMap(series.map((s) => s.measure.label));
  const hasRight = series.some((s) => s.axis === "right");
  const clickable = onPointClick ? { cursor: "pointer" } : undefined;

  const leftFormat = series.find((s) => s.axis === "left")?.measure.format;
  const rightFormat = series.find((s) => s.axis === "right")?.measure.format;

  // Angka di dalam batang hanya terbaca bila batangnya sedikit dan lebar.
  const labelDalam = data.length <= 8 && series.filter((x) => x.shape === "bar").length <= 2;
  const kecil = height < 260;
  const labelTerpanjang = Math.max(...data.map((d) => d.name.length), 0);
  const banyak = data.length > (kecil ? 4 : 8) || (data.length > 3 && labelTerpanjang > (kecil ? 8 : 12));
  const batas = kecil ? 12 : 22;

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: `${minChartWidth(data.length, series.length)}px` }}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
            <XAxis
              dataKey="name"
              interval={0}
              stroke="hsl(var(--muted-foreground))"
              tickLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={(v: string) => (v.length > batas ? `${v.slice(0, batas - 1)}…` : v)}
              {...(banyak
                ? { angle: -35, textAnchor: "end" as const, height: kecil ? 56 : 96 }
                : { height: kecil ? 28 : 40 })}
            />
            <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" tickLine={false} tick={{ fontSize: 12 }} tickFormatter={formatAxisValue} />
            {hasRight && (
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="hsl(var(--muted-foreground))"
                tickLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={formatAxisValue}
              />
            )}
            <Tooltip
              contentStyle={tooltipStyle}
              labelFormatter={(l) => String(l)}
              formatter={(value, _name, item) => {
                const s = series.find((x) => x.dataKey === item?.dataKey);
                const n = typeof value === "number" ? value : Number(value);
                return s ? formatMeasure(n, s.measure.format) : String(value);
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => <span className="text-muted-foreground">{value}</span>}
            />
            {series.map((s) =>
              s.shape === "bar" ? (
                <Bar
                  key={s.dataKey}
                  yAxisId="left"
                  dataKey={s.dataKey}
                  name={s.measure.label}
                  fill={colors[s.measure.label]}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={60}
                  style={clickable}
                  onClick={onPointClick ? (_d, index) => onPointClick(index, s.measure.key) : undefined}
                >
                  {labelDalam && (
                    <LabelList
                      dataKey={s.dataKey}
                      position="center"
                      formatter={(v: number) => formatMeasure(v, s.measure.format)}
                      style={{ fontSize: 11, fontWeight: 600, fill: "#fff" }}
                    />
                  )}
                </Bar>
              ) : (
                <Line
                  key={s.dataKey}
                  yAxisId="right"
                  type="monotone"
                  dataKey={s.dataKey}
                  name={s.measure.label}
                  stroke={colors[s.measure.label]}
                  strokeWidth={2}
                  dot={{ r: 5, fill: colors[s.measure.label], strokeWidth: 2, stroke: "hsl(var(--card))" }}
                  activeDot={{
                    r: 6,
                    style: clickable,
                    onClick: (_e: unknown, payload: unknown) => {
                      const i = (payload as { index?: number } | undefined)?.index;
                      if (onPointClick && typeof i === "number") onPointClick(i, s.measure.key);
                    },
                  }}
                  connectNulls
                />
              ),
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {hasRight && leftFormat && rightFormat && (
        <p className="mt-1 text-xs text-muted-foreground">
          Sumbu kiri: batang ({series.filter((s) => s.axis === "left").map((s) => s.measure.label).join(", ")}). Sumbu
          kanan: garis ({series.filter((s) => s.axis === "right").map((s) => s.measure.label).join(", ")}).
        </p>
      )}
    </div>
  );
};

export default ExplorerComboChart;
