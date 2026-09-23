import { useMemo } from "react";
import { Info } from "lucide-react";
import ExplorerChart from "./ExplorerChart";
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
  buildFacets,
  buildPivot,
  decideChart,
  formatMeasure,
  type ExplorerResult,
} from "@/lib/olapExplorer";

interface Props {
  result: ExplorerResult;
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
  compact = false,
}: Props) => {
  const pivot = useMemo(() => buildPivot(result, rowDims, colDim), [result, rowDims, colDim]);

  // Chart dipecah per nilai dimensi Baris kedua (small multiples). Tabel di
  // bawah tetap memakai pivot utuh — dua dimensi baris terbaca baik di sana
  // sebagai kolom bersarang.
  const plan = useMemo(() => buildFacets(result, rowDims, colDim), [result, rowDims, colDim]);

  // Keputusan chart memakai hasil yang sesungguhnya, bukan cuma jumlah dimensi
  // — dua dimensi baris bisa menghasilkan ratusan kelompok.
  const chart = decideChart(rowDims, colDim, plan);

  // Dimensi panel dipilih otomatis oleh buildFacets (yang nilainya paling
  // sedikit), jadi labelnya dibaca dari rencana itu — bukan dari slot yang
  // dipilih pengguna.
  const facetLabel = result.dimensions.find((d) => d.key === plan.facetDim)?.label ?? "kelompok";

  const activeMeasure =
    result.measures.find((m) => m.key === chartMeasure) ?? result.measures[0] ?? null;

  const drawable = chart.kind !== "number" && chart.kind !== "none" && activeMeasure !== null;

  const measurePicker = result.measures.length > 1 && activeMeasure && (
    <Select value={activeMeasure.key} onValueChange={onChartMeasureChange}>
      <SelectTrigger className={compact ? "h-8 w-52 text-xs" : "w-64"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {result.measures.map((m) => (
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
      />
    ) : (
      <ExplorerChart
        kind={chart.kind}
        pivot={pivot}
        measure={activeMeasure}
        height={compact ? 240 : undefined}
      />
    ));

  const table = (
    <PivotTable
      pivot={pivot}
      measures={result.measures}
      rowDimensions={result.dimensions.filter((d) => rowDims.includes(d.key))}
      hasColumnDimension={colDim !== null}
    />
  );

  return (
    <div className={compact ? "space-y-3" : "space-y-6"}>
      {/* Tanpa dimensi sama sekali, hasilnya satu baris angka — chart tidak
          punya sumbu, jadi ditampilkan sebagai kartu. */}
      {chart.kind === "number" && (
        <div className={`grid gap-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-3"}`}>
          {result.measures.map((m) => (
            <Card key={m.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {m.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {formatMeasure(pivot.rows[0]?.cells[""]?.[m.key]?.value ?? null, m.format)}
                </p>
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
          </div>
        ) : (
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-base">{activeMeasure.label}</CardTitle>
              {measurePicker}
            </CardHeader>
            <CardContent>{chartBody}</CardContent>
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
    </div>
  );
};

export default ExplorerResultView;
