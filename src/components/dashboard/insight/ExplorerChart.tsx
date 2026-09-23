import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { buildColorMap } from "@/lib/chartColors";
import {
  MIN_CATEGORY_WIDTH,
  chartSeriesNames,
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

  // Nama kategori bisa panjang ("Administrasi Bisnis · Prov. Jawa Tengah").
  // Dipendekkan di sumbu saja — tooltip tetap menampilkan nama utuh.
  const batasLabel = height < 260 ? 12 : 22;
  const labelFormatter = (value: string) =>
    value.length > batasLabel ? `${value.slice(0, batasLabel - 1)}…` : value;

  // Makin banyak kategori, makin miring labelnya. Di bawah delapan kategori
  // label mendatar masih muat dan jauh lebih enak dibaca.
  const kecil = height < 260;
  const banyak = data.length > (kecil ? 4 : 8);
  const xAxisProps = banyak
    ? { angle: -35, textAnchor: "end" as const, height: kecil ? 56 : 96 }
    : { height: kecil ? 28 : 40 };

  // Chart diberi lebar minimum per kategori dan dibungkus wadah yang bisa
  // digeser mendatar. Tanpa ini, 67 program studi dipaksa muat di lebar tetap
  // dan batangnya menyempit jadi garis dengan label yang menumpuk — gambarnya
  // ada, tapi tidak memberi tahu apa pun.
  const lebarMinimum = data.length * MIN_CATEGORY_WIDTH * Math.max(series.length, 1);

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: `${Math.max(lebarMinimum, 320)}px` }}>
    <ResponsiveContainer width="100%" height={height}>
      {kind === "line" ? (
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} tickFormatter={labelFormatter} {...xAxisProps} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={axisFormatter} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={(l) => String(l)} />
          {showLegend && <Legend />}
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
      ) : (
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickFormatter={labelFormatter}
            interval={0}
            {...xAxisProps}
          />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={axisFormatter} />
          <Tooltip formatter={tooltipFormatter} labelFormatter={(l) => String(l)} />
          {showLegend && <Legend />}
          {series.map((s) => (
            <Bar key={s} dataKey={s} fill={colors[s]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      )}
    </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ExplorerChart;
