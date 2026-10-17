import {
  Bar,
  BarChart,
  CartesianGrid,
  Customized,
  DefaultTooltipContent,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildInsightColorMap } from "@/lib/chartColors";
import {
  SINGLE_COLUMN,
  chartSeriesNames,
  filledSeriesPerBar,
  formatAxisValue,
  formatMeasure,
  minChartWidth,
  toNestedChartData,
  type CatalogMeasure,
  type NestedDatum,
  type NestedPlan,
} from "@/lib/olapExplorer";

interface Props {
  plan: NestedPlan;
  measure: CatalogMeasure;
  height?: number;
  /** Klik batang → (indeks baris di plan.pivot, kunci kolom). */
  onPointClick?: (rowIndex: number, columnKey: string) => void;
}

/** Ruang di bawah sumbu dalam untuk kurung siku dan label kelompok luar. */
const OUTER_LABEL_SPACE = 36;

/** Perkiraan lebar satu huruf label 12px, untuk memotong label luar. */
const CHAR_WIDTH = 6.5;

const MUTED = "hsl(var(--muted-foreground))";

interface AxisScale {
  (value: string): number | undefined;
  bandwidth?: () => number;
}

interface CustomizedProps {
  xAxisMap?: Record<string, { scale: AxisScale; height: number }>;
  offset?: { top: number; height: number };
}

/**
 * Grafik batang dengan dua dimensi bertingkat di sumbu X: label dalam di
 * bawah tiap batang, label luar di bawahnya sebagai kurung siku per kelompok
 * -- pola cross-tab berhierarki (jurusan › prodi) dalam bentuk grafik.
 * Dimensi kolom menjadi warna batang, dan seluruh batang berbagi satu sumbu
 * Y sehingga bisa dibandingkan langsung, tidak seperti panel.
 */
const ExplorerNestedChart = ({ plan, measure, height = 340, onPointClick }: Props) => {
  const data = toNestedChartData(plan, measure.key);
  const series = chartSeriesNames(plan.pivot);
  const colors = buildInsightColorMap(series);
  const byId = new Map(data.map((d) => [d.id, d]));

  const showLegend = series.length > 1;
  const columnKeyOf = (s: string) => (s === "nilai" ? SINGLE_COLUMN : s);
  const clickable = onPointClick ? { cursor: "pointer" } : undefined;

  const kecil = height < 260;
  const batasLabel = kecil ? 12 : 22;
  const potong = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

  // Aturan label miring sama dengan ExplorerChart, dihitung dari batang saja.
  const bars = data.filter((d) => d.rowIndex >= 0);
  const labelTerpanjang = Math.max(...bars.map((d) => d.inner.length), 0);
  const banyak = bars.length > (kecil ? 4 : 8) || (bars.length > 3 && labelTerpanjang > (kecil ? 8 : 12));
  const xAxisProps = banyak
    ? { angle: -35, textAnchor: "end" as const, height: kecil ? 56 : 96 }
    : { height: kecil ? 28 : 40 };

  // Warna ditentukan batangnya (mis. prodi → jurusan): tiap kategori hanya
  // punya satu seri terisi. Batang ditumpuk supaya yang satu itu selebar
  // kategori -- tidak ada yang benar-benar dijumlahkan, jadi tetap sah untuk
  // rata-rata -- dan lebar grafik dihitung dari satu seri.
  const solo = filledSeriesPerBar(data, series) <= 1;
  const lebarMinimum = minChartWidth(data.length, solo ? 1 : series.length);

  const labelOf = (id: string) => {
    const d = byId.get(id);
    return d && d.rowIndex >= 0 ? `${d.outer} › ${d.inner}` : "";
  };

  const groupLabels = ({ xAxisMap, offset }: CustomizedProps) => {
    const axis = xAxisMap ? Object.values(xAxisMap)[0] : undefined;
    if (!axis || !offset) return null;

    const band = axis.scale.bandwidth?.() ?? 0;
    const y = offset.top + offset.height + axis.height + 4;

    return (
      <g>
        {plan.groups.map((g) => {
          const start = axis.scale(g.firstId);
          const end = axis.scale(g.lastId);
          if (start === undefined || end === undefined) return null;

          const x1 = start + 2;
          const x2 = end + band - 2;
          const muat = Math.max(1, Math.floor((x2 - x1 + 24) / CHAR_WIDTH));

          return (
            <g key={g.key}>
              <path d={`M${x1},${y} v5 H${x2} v-5`} stroke={MUTED} strokeOpacity={0.6} fill="none" />
              <text x={(x1 + x2) / 2} y={y + 19} textAnchor="middle" fontSize={12} fontWeight={500} fill={MUTED}>
                <title>{g.key}</title>
                {potong(g.key, muat)}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  return (
    <div className="space-y-2">
      {/* Legenda di luar area geser: legenda Recharts diletakkan di tengah
          grafik selebar lebarMinimum, sehingga pada grafik yang harus digeser
          ia jatuh di luar layar. */}
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
      <div className="w-full overflow-x-auto">
        <div style={{ minWidth: `${lebarMinimum}px` }}>
          <ResponsiveContainer width="100%" height={height + OUTER_LABEL_SPACE}>
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: OUTER_LABEL_SPACE, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <Tooltip
                // Spacer antar kelompok tidak punya isi; tanpa ini tooltip kosong
                // muncul saat kursor melewati celah.
                content={(props) => (labelOf(String(props.label ?? "")) ? <DefaultTooltipContent {...props} /> : null)}
                formatter={(value: number | string) =>
                  formatMeasure(typeof value === "number" ? value : Number(value), measure.format)
                }
                labelFormatter={(id) => labelOf(String(id))}
              />
              <XAxis
                dataKey="id"
                interval={0}
                tick={{ fontSize: 12 }}
                tickLine={false}
                tickFormatter={(id: string) => potong(byId.get(id)?.inner ?? "", batasLabel)}
                {...xAxisProps}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAxisValue} />
              <Customized component={groupLabels} />
              {series.map((s) => (
                <Bar
                  key={s}
                  dataKey={s}
                  fill={colors[s]}
                  stackId={solo ? "solo" : undefined}
                  radius={[3, 3, 0, 0]}
                  style={clickable}
                  onClick={
                    onPointClick
                      ? (bar: { payload?: NestedDatum }) => {
                          const rowIndex = bar.payload?.rowIndex ?? -1;
                          if (rowIndex >= 0) onPointClick(rowIndex, columnKeyOf(s));
                        }
                      : undefined
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ExplorerNestedChart;
