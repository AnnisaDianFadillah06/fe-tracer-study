import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildColorMap } from "@/lib/chartColors";
import {
  SINGLE_COLUMN,
  chartSeriesNames,
  minChartWidth,
  formatMeasure,
  toChartData,
  type CatalogMeasure,
  type ChartKind,
  type Pivot,
} from "@/lib/olapExplorer";

interface Props {
  kind: ChartKind;
  pivot: Pivot;
  measure: CatalogMeasure;
  /** Tinggi chart. Dipendekkan saat dipakai sebagai panel kecil. */
  height?: number;
  /**
   * Menyembunyikan legenda. Dipakai chart berpanel: seluruh panel memakai seri
   * dan warna yang sama, jadi legendanya cukup ditampilkan sekali di luar.
   */
  hideLegend?: boolean;
  /**
   * Peta warna seri yang dipaksakan dari luar. Wajib diisi chart berpanel:
   * kalau tiap panel memetakan warnanya sendiri, seri yang sama bisa tampil
   * berbeda warna antar panel dan perbandingannya jadi menyesatkan.
   */
  colors?: Record<string, string>;
  /**
   * Klik titik/batang → (indeks baris pivot, kunci kolom). Kunci kolom null
   * berarti "seluruh baris": dipakai chart garis berseri banyak, yang
   * klik-nya tidak bisa membedakan garis mana yang dimaksud.
   */
  onPointClick?: (rowIndex: number, columnKey: string | null) => void;
}

/**
 * Chart untuk satu measure.
 *
 * Hanya satu measure yang digambar sekaligus. Menumpuk beberapa measure dengan
 * satuan berbeda (bulan, rupiah, jumlah orang) pada satu sumbu Y menghasilkan
 * gambar yang salah baca; measure lain tetap terlihat lengkap di pivot table.
 */
const ExplorerChart = ({
  kind,
  pivot,
  measure,
  height = 340,
  hideLegend = false,
  colors: colorsProp,
  onPointClick,
}: Props) => {
  if (kind === "none") return null;

  const data = toChartData(pivot, measure.key);
  const series = chartSeriesNames(pivot);
  const colors = colorsProp ?? buildColorMap(series);

  const tooltipFormatter = (value: number | string) =>
    formatMeasure(typeof value === "number" ? value : Number(value), measure.format);

  // Nilai measure bisa besar (rupiah) — sumbu Y dipendekkan supaya labelnya
  // tidak memakan lebar chart.
  const axisFormatter = (value: number) =>
    Math.abs(value) >= 1_000_000
      ? `${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`
      : Math.abs(value) >= 1_000
        ? `${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb`
        : value.toLocaleString("id-ID");

  const showLegend = series.length > 1 && !hideLegend;

  // Nama seri "nilai" adalah kolom tunggal (tanpa dimensi kolom).
  const columnKeyOf = (s: string) => (s === "nilai" ? SINGLE_COLUMN : s);
  const clickable = onPointClick ? { cursor: "pointer" } : undefined;

  // Nama kategori bisa panjang ("Administrasi Bisnis · Prov. Jawa Tengah").
  // Dipendekkan di sumbu saja — tooltip tetap menampilkan nama utuh.
  const batasLabel = height < 260 ? 12 : 22;
  const labelFormatter = (value: string) =>
    value.length > batasLabel ? `${value.slice(0, batasLabel - 1)}…` : value;

  // Makin banyak kategori, makin miring labelnya. Di bawah delapan kategori
  // label mendatar masih muat dan jauh lebih enak dibaca.
  // Label panjang ("Organisasi non-profit/Lembaga Swadaya Masyarakat") ikut
  // dihitung: delapan kategori berlabel panjang sudah saling menimpa.
  const kecil = height < 260;
  const labelTerpanjang = Math.max(...data.map((d) => d.name.length), 0);
  const banyak = data.length > (kecil ? 4 : 8) || (data.length > 3 && labelTerpanjang > (kecil ? 8 : 12));
  const xAxisProps = banyak
    ? { angle: -35, textAnchor: "end" as const, height: kecil ? 56 : 96 }
    : { height: kecil ? 28 : 40 };

  // Chart diberi lebar minimum per kategori dan dibungkus wadah yang bisa
  // digeser mendatar. Tanpa ini, 67 program studi dipaksa muat di lebar tetap
  // dan batangnya menyempit jadi garis dengan label yang menumpuk — gambarnya
  // ada, tapi tidak memberi tahu apa pun.
  const lebarMinimum = minChartWidth(data.length, series.length);

  const margin = { top: 8, right: 16, bottom: 8, left: 8 };
  // Legenda kecil dengan teks netral dan hanya penanda berwarna, seperti
  // Metabase — teks berwarna seri sulit dibaca dan berebut perhatian dengan chart.
  const legend = (
    <Legend
      iconType="circle"
      iconSize={8}
      wrapperStyle={{ fontSize: 12 }}
      formatter={(value) => <span className="text-muted-foreground">{value}</span>}
    />
  );
  const gridAndTooltip = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <Tooltip formatter={tooltipFormatter} labelFormatter={(l) => String(l)} />
      {showLegend && legend}
    </>
  );

  // ── Pai: satu seri, satu irisan per kategori ────────────────
  if (kind === "pie") {
    const first = series[0] ?? "nilai";
    const slices = data
      .map((d) => ({ name: d.name, value: Number(d[first] ?? 0) }))
      .filter((d) => d.value > 0);
    const sliceColors = buildColorMap(slices.map((d) => d.name));
    const total = slices.reduce((sum, d) => sum + d.value, 0);

    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Tooltip
            formatter={(value, name) => {
              const n = typeof value === "number" ? value : Number(value);
              const pct = total > 0 ? ` (${((n / total) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%)` : "";
              return [`${tooltipFormatter(n)}${pct}`, name];
            }}
          />
          {legend}
          <Pie
            data={slices}
            dataKey="value"
            nameKey="name"
            innerRadius="45%"
            outerRadius="80%"
            paddingAngle={1}
            style={clickable}
            onClick={
              onPointClick
                ? (_d, index) => {
                    const original = data.findIndex((x) => x.name === slices[index]?.name);
                    if (original >= 0) onPointClick(original, columnKeyOf(first));
                  }
                : undefined
            }
          >
            {slices.map((d) => (
              <Cell key={d.name} fill={sliceColors[d.name]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // ── Batang mendatar: label panjang terbaca utuh ─────────────
  if (kind === "row") {
    const tinggi = Math.max(height, data.length * (series.length * 18 + 10) + 48);

    return (
      <ResponsiveContainer width="100%" height={tinggi}>
        <BarChart data={data} layout="vertical" margin={{ ...margin, left: 16 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={axisFormatter} />
          <YAxis
            type="category"
            dataKey="name"
            width={150}
            interval={0}
            tick={{ fontSize: 12 }}
            tickFormatter={(v: string) => (v.length > 24 ? `${v.slice(0, 23)}…` : v)}
          />
          <Tooltip formatter={tooltipFormatter} labelFormatter={(l) => String(l)} />
          {showLegend && legend}
          {series.map((s) => (
            <Bar
              key={s}
              dataKey={s}
              fill={colors[s]}
              radius={[0, 3, 3, 0]}
              style={clickable}
              onClick={onPointClick ? (_d, index) => onPointClick(index, columnKeyOf(s)) : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: `${lebarMinimum}px` }}>
        <ResponsiveContainer width="100%" height={height}>
          {kind === "line" ? (
            <LineChart
              data={data}
              margin={margin}
              style={clickable}
              onClick={(state) => {
                const i = state?.activeTooltipIndex;
                if (onPointClick && typeof i === "number") {
                  onPointClick(i, series.length === 1 ? columnKeyOf(series[0]) : null);
                }
              }}
            >
              {gridAndTooltip}
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickFormatter={labelFormatter} {...xAxisProps} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={axisFormatter} />
              {series.map((s) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={colors[s]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  // Titik tanpa data disambung, bukan diputus — memutus garis pada
                  // kelompok yang kebetulan kosong membuat tren tampak terhenti.
                  connectNulls
                />
              ))}
            </LineChart>
          ) : kind === "area" ? (
            <AreaChart
              data={data}
              margin={margin}
              style={clickable}
              onClick={(state) => {
                const i = state?.activeTooltipIndex;
                if (onPointClick && typeof i === "number") {
                  onPointClick(i, series.length === 1 ? columnKeyOf(series[0]) : null);
                }
              }}
            >
              {gridAndTooltip}
              <XAxis dataKey="name" tick={{ fontSize: 12 }} tickFormatter={labelFormatter} {...xAxisProps} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={axisFormatter} />
              {series.map((s) => (
                <Area
                  key={s}
                  type="monotone"
                  dataKey={s}
                  stroke={colors[s]}
                  fill={colors[s]}
                  fillOpacity={0.22}
                  strokeWidth={2}
                  connectNulls
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={data} margin={margin}>
              {gridAndTooltip}
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickFormatter={labelFormatter}
                interval={0}
                {...xAxisProps}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={axisFormatter} />
              {series.map((s) => (
                <Bar
                  key={s}
                  dataKey={s}
                  fill={colors[s]}
                  stackId={kind === "stacked" ? "total" : undefined}
                  radius={kind === "stacked" ? 0 : [3, 3, 0, 0]}
                  style={clickable}
                  onClick={onPointClick ? (_d, index) => onPointClick(index, columnKeyOf(s)) : undefined}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ExplorerChart;
