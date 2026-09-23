import { useMemo, useState } from "react";
import { Info, MousePointerClick } from "lucide-react";
import ExplorerChart from "./ExplorerChart";
import ExplorerDrillDown, { type DrillRequest } from "./ExplorerDrillDown";
import ExplorerFacets from "./ExplorerFacets";
import PivotTable from "./PivotTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EMPTY_VALUE,
  SINGLE_COLUMN,
  buildFacets,
  buildPivot,
  chartPivotOf,
  decideChart,
  describeDrillPoint,
  drillFilters,
  drillPointOf,
  formatMeasure,
  presentPivot,
  type CatalogMeasure,
  type DrillPoint,
  type ExplorerFilter,
  type ExplorerQueryInput,
  type ExplorerResult,
  type Pivot,
} from "@/lib/olapExplorer";

interface Props {
  result: ExplorerResult;
  /** Saringan pertanyaan — ikut dikirim saat drill-down ke daftar alumni. */
  filters: ExplorerFilter[];
  /** Olah hasil yang murni tampilan: persen & selisih kolom. */
  display?: Pick<ExplorerQueryInput, "percent" | "diff">;
  rowDims: string[];
  colDim: string | null;
  /** Measure yang digambar; null = measure pertama. */
  chartMeasure: string | null;
  onChartMeasureChange: (key: string) => void;
  /**
   * Tampilan ringkas untuk kartu Dashboard Saya: chart lebih pendek, tanpa
   * bingkai kartu sendiri, dan tabel hanya muncul kalau chart tidak bisa
   * digambar (angka lengkapnya ada di halaman Insight).
   */
  compact?: boolean;
}

/**
 * Hasil satu pertanyaan: kartu angka, chart (tunggal atau berpanel), dan
 * tabel pivot. Dipakai halaman Insight dan kartu Dashboard Saya supaya
 * keputusan chart-nya selalu sama di kedua tempat.
 */
const ExplorerResultView = ({
  result,
  rowDims,
  colDim,
  chartMeasure,
  onChartMeasureChange,
  filters,
  display,
  compact = false,
}: Props) => {
  const [drill, setDrill] = useState<DrillRequest | null>(null);

  /**
   * Klik angka → daftar alumni. Yang dikirim selalu ukuran ASLI: angka
   * persen berasal dari cacah (daftarnya = alumni yang tercacah, jumlahnya
   * tidak diketahui dari persennya), dan angka rumus berasal dari
   * pembilangnya.
   */
  const openDrill = (point: DrillPoint, shown: CatalogMeasure, value: number | null) => {
    const labelOf = (k: string) => result.dimensions.find((d) => d.key === k)?.label ?? k;
    const original = result.measures.find((m) => m.key === shown.key) ?? shown;

    const measure: CatalogMeasure = original.formula
      ? { key: original.formula.left, label: original.formula.left_label, format: original.formula.left_format }
      : original;
    const sameNumber = !original.formula && shown.format === original.format;

    setDrill({
      cube: result.cube,
      measure,
      filters: drillFilters(filters, point),
      pointLabel: describeDrillPoint(point, labelOf),
      value: sameNumber ? value : null,
    });
  };

  /** Klik di chart: baris pivot (dan kolomnya, kalau diketahui) → titik drill-down. */
  const drillFromChart = (
    source: Pivot,
    dims: string[],
    rowIndex: number,
    columnKey: string | null,
    extra: DrillPoint = {},
  ) => {
    const row = source.rows[rowIndex];
    if (!row || !activeMeasure) return;
    if (columnKey !== null && source.derivedColumns?.includes(columnKey)) return;

    const point = drillPointOf(dims, row.keys, columnKey === null ? null : colDim, columnKey ?? SINGLE_COLUMN);
    if (point === null || Object.values(extra).includes(EMPTY_VALUE)) return;

    const value =
      columnKey === null ? row.totals[activeMeasure.key] ?? null : row.cells[columnKey]?.[activeMeasure.key]?.value ?? null;
    if (activeMeasure.format === "integer" && (value === null || value <= 0)) return;

    openDrill({ ...extra, ...point }, activeMeasure, value);
  };

  const percent = display?.percent;
  const diff = display?.diff;

  // Persen & selisih kolom diterapkan SETELAH pivot dibangun dan sebelum apa
  // pun digambar, supaya tabel, chart, dan panel selalu menampilkan angka
  // yang sama.
  const { pivot, measures } = useMemo(
    () => presentPivot(buildPivot(result, rowDims, colDim), { percent, diff }, result.measures),
    [result, rowDims, colDim, percent, diff],
  );

  // Chart dipecah per nilai dimensi Baris kedua (small multiples). Tabel di
  // bawah tetap memakai pivot utuh — dua dimensi baris terbaca baik di sana
  // sebagai kolom bersarang.
  const plan = useMemo(() => {
    const raw = buildFacets(result, rowDims, colDim);
    return {
      ...raw,
      facets: raw.facets.map((f) => ({
        ...f,
        pivot: chartPivotOf(presentPivot(f.pivot, { percent, diff }, result.measures).pivot),
      })),
    };
  }, [result, rowDims, colDim, percent, diff]);

  // Keputusan chart memakai hasil yang sesungguhnya, bukan cuma jumlah dimensi
  // — dua dimensi baris bisa menghasilkan ratusan kelompok.
  const chart = decideChart(rowDims, colDim, plan);

  // Dimensi panel dipilih otomatis oleh buildFacets (yang nilainya paling
  // sedikit), jadi labelnya dibaca dari rencana itu — bukan dari slot yang
  // dipilih pengguna.
  const facetLabel = result.dimensions.find((d) => d.key === plan.facetDim)?.label ?? "kelompok";

  const activeMeasure = measures.find((m) => m.key === chartMeasure) ?? measures[0] ?? null;

  const drawable = chart.kind !== "number" && chart.kind !== "none" && activeMeasure !== null;

  const measurePicker = measures.length > 1 && activeMeasure && (
    <Select value={activeMeasure.key} onValueChange={onChartMeasureChange}>
      <SelectTrigger className={compact ? "h-8 w-52 text-xs" : "w-64"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {measures.map((m) => (
          <SelectItem key={m.key} value={m.key}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const chartBody =
    drawable &&
    (chart.faceted ? (
      <ExplorerFacets
        kind={chart.kind}
        facets={plan.facets}
        measure={activeMeasure}
        facetLabel={facetLabel}
        onPointClick={(facetKey, i, col) => {
          const facet = plan.facets.find((f) => f.key === facetKey);
          if (facet && plan.facetDim && plan.xDim) {
            drillFromChart(facet.pivot, [plan.xDim], i, col, { [plan.facetDim]: facetKey });
          }
        }}
      />
    ) : (
      <ExplorerChart
        kind={chart.kind}
        pivot={chartPivotOf(pivot)}
        measure={activeMeasure}
        height={compact ? 240 : undefined}
        onPointClick={(i, col) => drillFromChart(chartPivotOf(pivot), rowDims, i, col)}
      />
    ));

  const table = (
    <PivotTable
      pivot={pivot}
      measures={measures}
      rowDimensions={result.dimensions.filter((d) => rowDims.includes(d.key))}
      hasColumnDimension={colDim !== null}
      colDim={colDim}
      onCellClick={openDrill}
    />
  );

  const hint = (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <MousePointerClick className="h-3.5 w-3.5" />
      Klik batang atau angka bergaris bawah untuk melihat daftar alumninya.
    </p>
  );

  return (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      {/* Tanpa dimensi sama sekali, hasilnya satu baris angka — chart tidak
          punya sumbu, jadi ditampilkan sebagai kartu. */}
      {chart.kind === "number" && (
        <div className={`grid gap-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
          {measures.map((m) => (
            <Card key={m.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {m.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <NumberValue
                  value={pivot.rows[0]?.cells[SINGLE_COLUMN]?.[m.key]?.value ?? null}
                  measure={m}
                  onDrill={openDrill}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {chart.kind === "none" && chart.reason && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Tidak digambar sebagai chart</AlertTitle>
          <AlertDescription>{chart.reason}</AlertDescription>
        </Alert>
      )}

      {drawable &&
        (compact ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{activeMeasure.label}</p>
              {measurePicker}
            </div>
            {chartBody}
            {hint}
          </div>
        ) : (
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-base">{activeMeasure.label}</CardTitle>
              {measurePicker}
            </CardHeader>
            <CardContent className="space-y-3">
              {chartBody}
              {hint}
            </CardContent>
          </Card>
        ))}

      {compact ? (
        chart.kind === "none" && <div className="max-h-80 overflow-auto">{table}</div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tabel</CardTitle>
          </CardHeader>
          <CardContent>{table}</CardContent>
        </Card>
      )}

      <ExplorerDrillDown
        key={drill ? JSON.stringify(drill) : "none"}
        request={drill}
        onClose={() => setDrill(null)}
      />
    </div>
  );
};

/** Angka kartu tanpa dimensi — diklik untuk melihat seluruh alumni yang terhitung. */
const NumberValue = ({
  value,
  measure,
  onDrill,
}: {
  value: number | null;
  measure: CatalogMeasure;
  onDrill: (point: DrillPoint, measure: CatalogMeasure, value: number | null) => void;
}) => {
  const text = formatMeasure(value, measure.format);
  const clickable = value !== null && !(measure.format === "integer" && value <= 0);

  return clickable ? (
    <button
      type="button"
      className="text-2xl font-bold tabular-nums underline decoration-dotted underline-offset-4 hover:text-primary"
      title="Lihat daftar alumninya"
      onClick={() => onDrill({}, measure, value)}
    >
      {text}
    </button>
  ) : (
    <p className="text-2xl font-bold tabular-nums">{text}</p>
  );
};

export default ExplorerResultView;
