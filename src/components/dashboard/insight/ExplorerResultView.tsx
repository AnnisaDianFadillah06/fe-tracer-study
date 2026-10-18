import { Suspense, lazy, useMemo, useState } from "react";
import { Info, Loader2, MousePointerClick } from "lucide-react";
import ExplorerChart from "./ExplorerChart";
import ExplorerComboChart from "./ExplorerComboChart";
import PointActionDialog from "./PointActionDialog";
import ExplorerDrillDown, { type DrillRequest } from "./ExplorerDrillDown";
import ExplorerFacets from "./ExplorerFacets";
import ExplorerHeatmap from "./ExplorerHeatmap";
import ExplorerNestedChart from "./ExplorerNestedChart";
import ExplorerScatterChart from "./ExplorerScatterChart";
import PivotTable from "./PivotTable";
import VizPicker from "./VizPicker";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  buildNestedPlan,
  buildPivot,
  canHeatmap,
  canScatter,
  chartPivotOf,
  lowerFirst,
  preferHeatmap,
  sortColumns,
  sortRows,
  applyViz,
  availableViz,
  decideChart,
  describeDrillPoint,
  drillFilters,
  drillPointOf,
  canPickPoint,
  selectionOperation,
  formatMeasure,
  presentPivot,
  type CatalogMeasure,
  type DrillPoint,
  type DrillTarget,
  type ExplorerFilter,
  type ExplorerQueryInput,
  type ExplorerResult,
  type Pivot,
  type Viz,
} from "@/lib/olapExplorer";
import { build3DPlan } from "@/lib/olap3d";

// echarts + echarts-gl besar (~1 MB); dimuat hanya saat tampilan 3D dibuka.
const Explorer3DChart = lazy(() => import("./Explorer3DChart"));
const MODE_3D_KEY = "insight.chart3d";

interface Props {
  result: ExplorerResult;
  /** Saringan pertanyaan — ikut dikirim saat drill-through ke daftar alumni. */
  filters: ExplorerFilter[];
  /** Olah hasil yang murni tampilan: persen & selisih kolom. */
  display?: Pick<ExplorerQueryInput, "percent" | "diff" | "viz" | "sort">;
  rowDims: string[];
  colDim: string | null;
  /** Measure yang digambar; null = measure pertama. */
  chartMeasure: string | null;
  onChartMeasureChange: (key: string) => void;
  /** Ada = pemilih visualisasi ditampilkan (halaman Insight). Kosong di kartu Dashboard Saya. */
  onVizChange?: (viz: Viz) => void;
  /**
   * Ada = klik angka/batang membuka pilihan slice/dice/drill-down/roll-up
   * (halaman Insight); kosong = langsung membuka daftar alumni (kartu board).
   */
  onSlice?: (dim: string, value: string) => void;
  /** Drill-down berjenjang menurut hierarki katalog. */
  onDrillDown?: (point: DrillPoint, target: DrillTarget) => void;
  /** Langkah drill-down yang tersedia untuk sebuah titik. */
  drillTargetsOf?: (point: DrillPoint) => (DrillTarget & { toLabel: string })[];
  /** Dice: sub-kubus dari beberapa titik yang dikumpulkan. */
  onDice?: (points: DrillPoint[]) => void;
  /** Roll-up; ada = menu klik menawarkannya dengan label rollUpLabel. */
  onRollUp?: () => void;
  rollUpLabel?: string | null;
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
  onVizChange,
  filters,
  display,
  onSlice,
  onDrillDown,
  drillTargetsOf,
  onDice,
  onRollUp,
  rollUpLabel = null,
  compact = false,
}: Props) => {
  // Titik yang dikumpulkan untuk disaring bersama (slice/dice); hilang saat hasil berganti susunan.
  const [picked, setPicked] = useState<DrillPoint[]>([]);
  const [drill, setDrill] = useState<DrillRequest | null>(null);
  const [pending, setPending] = useState<{ point: DrillPoint; measure: CatalogMeasure; value: number | null } | null>(null);
  // Grafik 3D sebagai pengganti grafik 2D (lihat plan3D di bawah). Diingat
  // selama sesi: komponen ini dipasang ulang setiap susunan berganti, dan
  // pengguna yang sedang menjelajah dalam 3D tidak mau kembali ke 2D.
  const [mode3D, setMode3DState] = useState(() => {
    try {
      return sessionStorage.getItem(MODE_3D_KEY) === "1";
    } catch {
      return false;
    }
  });
  const setMode3D = (on: boolean) => {
    setMode3DState(on);
    try {
      sessionStorage.setItem(MODE_3D_KEY, on ? "1" : "0");
    } catch {
      /* penyimpanan tidak tersedia: cukup untuk tampilan ini */
    }
  };

  /**
   * Klik angka → daftar alumni. Yang dikirim selalu ukuran ASLI: angka
   * persen berasal dari cacah (daftarnya = alumni yang tercacah, jumlahnya
   * tidak diketahui dari persennya), dan angka rumus berasal dari
   * pembilangnya.
   */
  const openDrill = (point: DrillPoint, shown: CatalogMeasure, value: number | null) => {
    // Di halaman Insight klik dulu menawarkan pilihan operasi OLAP.
    if (onSlice) {
      setPending({ point, measure: shown, value });
      return;
    }
    showAlumni(point, shown, value);
  };

  const withPoint = (list: DrillPoint[], point: DrillPoint) =>
    list.some((p) => JSON.stringify(p) === JSON.stringify(point)) ? list : [...list, point];
  const addPicked = (point: DrillPoint) => setPicked((list) => withPoint(list, point));

  const labelOf = (k: string) => result.dimensions.find((d) => d.key === k)?.label ?? k;

  const showAlumni = (point: DrillPoint, shown: CatalogMeasure, value: number | null) => {
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
    measureKey?: string,
  ) => {
    const shown = measureKey ? measures.find((m) => m.key === measureKey) ?? null : activeMeasure;
    const row = source.rows[rowIndex];
    if (!row || !shown) return;
    if (columnKey !== null && source.derivedColumns?.includes(columnKey)) return;

    const point = drillPointOf(dims, row.keys, columnKey === null ? null : colDim, columnKey ?? SINGLE_COLUMN);
    if (point === null) return;

    const value =
      columnKey === null ? row.totals[shown.key] ?? null : row.cells[columnKey]?.[shown.key]?.value ?? null;
    if (shown.format === "integer" && (value === null || value <= 0)) return;

    openDrill({ ...extra, ...point }, shown, value);
  };

  const percent = display?.percent;
  const diff = display?.diff;
  // Urutan dari peladen hanya bermakna bila pengguna memilih urutan.
  const serverOrder = Boolean(display?.sort);

  // Persen & selisih kolom diterapkan SETELAH pivot dibangun dan sebelum apa
  // pun digambar, supaya tabel, chart, dan panel selalu menampilkan angka
  // yang sama.
  const { pivot, measures } = useMemo(() => {
    const base = buildPivot(result, rowDims, colDim);
    return presentPivot(serverOrder ? base : sortRows(base), { percent, diff }, result.measures);
  }, [result, rowDims, colDim, percent, diff, serverOrder]);

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

  // Dua dimensi baris yang muat dalam satu grafik digambar bertingkat di
  // sumbu X, bukan dipecah jadi panel (lihat decideChart). Olahan tampilannya
  // sama dengan panel supaya angka grafik tetap sama dengan tabel.
  const nested = useMemo(() => {
    const raw = buildNestedPlan(result, rowDims, colDim);
    return raw && { ...raw, pivot: chartPivotOf(presentPivot(raw.pivot, { percent, diff }, result.measures).pivot) };
  }, [result, rowDims, colDim, percent, diff]);

  // Heatmap dan sebaran titik memakai pivot utuh tanpa kolom selisih: kolom
  // selisih berskala lain (selisih vs nilai), dan sebaran butuh pasangan X–Y.
  const gridPivot = useMemo(() => {
    const derived = pivot.derivedColumns ?? [];
    return sortColumns(
      derived.length === 0 ? pivot : { ...pivot, columnKeys: pivot.columnKeys.filter((c) => !derived.includes(c)) },
    );
  }, [pivot]);
  const extra = {
    heatmap: canHeatmap(gridPivot, colDim),
    scatter: rowDims.length > 0 && canScatter(gridPivot, measures),
  };

  // Keputusan chart memakai hasil yang sesungguhnya, bukan cuma jumlah dimensi
  // — dua dimensi baris bisa menghasilkan ratusan kelompok. Yang ditolak
  // (seri/panel terlalu banyak) diganti heatmap bila bentuk datanya cocok.
  const base = preferHeatmap(decideChart(rowDims, colDim, plan, nested), extra.heatmap);
  const seriesCount = Math.max(...plan.facets.map((f) => f.pivot.columnKeys.length), 0);
  const categoryCount = Math.max(...plan.facets.map((f) => f.pivot.rows.length), 0);
  const vizOptions = availableViz(base, seriesCount, categoryCount, measures.length, extra);
  const chart = applyViz(base, display?.viz, seriesCount, categoryCount, measures.length, extra);
  const activeViz: Viz = vizOptions.includes(display?.viz ?? "auto") ? display?.viz ?? "auto" : "auto";
  // Grafik yang ditolak hanya punya Otomatis/Tabel -- pemilihnya disembunyikan,
  // kecuali masih ada pilihan lain (mis. sebaran titik).
  const vizPicker =
    onVizChange && !mode3D && vizOptions.length > 1 && (!(base.kind === "none" && base.reason) || vizOptions.length > 2) ? (
      <VizPicker value={activeViz} options={vizOptions} onChange={onVizChange} />
    ) : null;

  // Dimensi panel dipilih otomatis oleh buildFacets (yang nilainya paling
  // sedikit), jadi labelnya dibaca dari rencana itu — bukan dari slot yang
  // dipilih pengguna.
  const facetLabel = result.dimensions.find((d) => d.key === plan.facetDim)?.label ?? "kelompok";

  const activeMeasure = measures.find((m) => m.key === chartMeasure) ?? measures[0] ?? null;

  const drawable = chart.kind !== "number" && chart.kind !== "none" && activeMeasure !== null;

  // Grafik 3D: dua atau tiga dimensi + satu ukuran (lihat build3DPlan). Hanya
  // di halaman Insight; kartu Dashboard Saya tetap 2D. Pilihan 2D/3D tidak
  // disimpan bersama pertanyaan -- grafik 2D tetap tampilan bakunya.
  const plan3D = useMemo(
    () => (activeMeasure ? build3DPlan(gridPivot, rowDims, colDim, activeMeasure.key) : null),
    [gridPivot, rowDims, colDim, activeMeasure],
  );
  const can3D = !compact && onVizChange !== undefined && plan3D?.ok === true;
  const show3D = can3D && mode3D;
  const chartCard = drawable || can3D;

  const combo = chart.kind === "combo";
  const scatter = chart.kind === "scatter";
  // Kedua bentuk ini memakai beberapa ukuran sekaligus, bukan satu yang dipilih.
  // Grafik bar/garis hanya menggambar kolom selisih bila ada (chartPivotOf),
  // jadi judulnya harus menyebut selisih — "Rata-rata skor (1–5)" di atas
  // batang bernilai ±0,04 menyesatkan. Heatmap tetap memakai nilai asli,
  // begitu juga grafik 3D (dibangun dari gridPivot, tanpa kolom selisih).
  const drawsDiff = Boolean(diff && pivot.derivedColumns?.length) && chart.kind !== "heatmap";
  const chartTitle = show3D
    ? activeMeasure?.label
    : combo
    ? "Semua ukuran"
    : scatter
      ? `${measures[1]?.label} terhadap ${lowerFirst(measures[0]?.label ?? "")}`
      : drawsDiff && diff
        ? `Selisih ${lowerFirst(activeMeasure?.label ?? "")}: ${diff.b} − ${diff.a}`
        : activeMeasure?.label;

  const measurePicker = (show3D || (!combo && !scatter)) && measures.length > 1 && activeMeasure && (
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
    (combo ? (
      <ExplorerComboChart
        pivot={chartPivotOf(pivot)}
        measures={measures}
        height={compact ? 240 : undefined}
        onPointClick={(i, measureKey) =>
          drillFromChart(chartPivotOf(pivot), rowDims, i, pivot.columnKeys[0] ?? SINGLE_COLUMN, {}, measureKey)
        }
      />
    ) : chart.kind === "heatmap" ? (
      <ExplorerHeatmap
        pivot={gridPivot}
        measure={activeMeasure}
        rowLabels={rowDims.map(labelOf)}
        columnLabel={colDim ? labelOf(colDim) : ""}
        maxHeight={compact ? 320 : 640}
        onCellClick={(i, col) => drillFromChart(gridPivot, rowDims, i, col)}
      />
    ) : scatter ? (
      <ExplorerScatterChart
        pivot={gridPivot}
        measures={measures}
        height={compact ? 260 : undefined}
        onPointClick={(i, col) => drillFromChart(gridPivot, rowDims, i, col, {}, measures[0].key)}
      />
    ) : chart.kind === "nested-bar" && nested ? (
      <ExplorerNestedChart
        plan={nested}
        measure={activeMeasure}
        height={compact ? 240 : undefined}
        onPointClick={(i, col) => drillFromChart(nested.pivot, [nested.outerDim, nested.innerDim], i, col)}
      />
    ) : chart.faceted ? (
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

  const toggle3D = can3D && (
    <ToggleGroup
      type="single"
      value={show3D ? "3d" : "2d"}
      onValueChange={(v) => v && setMode3D(v === "3d")}
      className="gap-0.5 rounded-lg bg-muted/40 p-0.5"
      aria-label="Grafik 2D atau 3D"
    >
      {(["2d", "3d"] as const).map((v) => (
        <ToggleGroupItem
          key={v}
          value={v}
          className="h-8 rounded-md px-2.5 text-xs font-semibold data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          {v.toUpperCase()}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );

  const body3D = show3D && plan3D?.ok && activeMeasure && (
    <Suspense
      fallback={
        <div className="flex h-[520px] items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat grafik 3D…
        </div>
      }
    >
      <Explorer3DChart
        plan={plan3D.plan}
        measure={activeMeasure}
        xLabel={labelOf(plan3D.plan.xDim)}
        zLabel={labelOf(plan3D.plan.zDim)}
        frameLabel={plan3D.plan.frameDim ? labelOf(plan3D.plan.frameDim) : null}
        onBarClick={(point, value) => openDrill(point, activeMeasure, value)}
        clickAction={onSlice ? "menyaring, merinci, atau melihat alumninya" : "melihat daftar alumninya"}
      />
    </Suspense>
  );

  const table = (
    <PivotTable
      pivot={pivot}
      measures={measures}
      // Urut sesuai rowDims, bukan urutan hasil: kunci baris pivot dan
      // pengelompokan tabel bersarang mengikuti urutan rowDims.
      rowDimensions={rowDims.map((key) => ({ key, label: labelOf(key) }))}
      hasColumnDimension={colDim !== null}
      colDim={colDim}
      onCellClick={openDrill}
    />
  );

  const pickedBar = picked.length > 0 && (
    <p className="flex flex-wrap items-center gap-2 text-xs">
      <span className="font-medium">
        {picked.length} titik dipilih ({selectionOperation(picked)})
      </span>
      <button
        type="button"
        className="underline hover:text-primary"
        onClick={() => {
          onDice?.(picked);
          setPicked([]);
        }}
      >
        Saring ke pilihan
      </button>
      <button type="button" className="text-muted-foreground underline hover:text-primary" onClick={() => setPicked([])}>
        Kosongkan
      </button>
    </p>
  );

  // Kelompok "Tidak ada data" butuh penjelasan: isinya campuran alumni yang
  // tidak mengisi dan yang memang tidak ditanya.
  const hasEmpty = useMemo(
    () => result.rows.some((r) => [...rowDims, colDim].some((d) => d && (r[d] === null || r[d] === undefined))),
    [result, rowDims, colDim],
  );
  const emptyNote = hasEmpty && (
    <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        <b>{EMPTY_VALUE}</b>: alumni tidak mengisi, atau pertanyaannya tidak berlaku baginya (mis. instansi bagi
        yang tidak bekerja). Sembunyikan lewat <b>Batasi</b> → <i>ada nilainya</i>.
      </span>
    </p>
  );

  const hint = (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <MousePointerClick className="h-3.5 w-3.5" />
      {onSlice
        ? "Klik batang, titik, sel, atau angka bergaris bawah untuk menyaring ke kelompok itu, merinci, atau melihat alumninya."
        : "Klik batang, titik, sel, atau angka bergaris bawah untuk melihat daftar alumninya."}
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

      {!drawable && chart.kind === "none" && vizPicker && (
        <div className="flex justify-end">{vizPicker}</div>
      )}

      {chart.kind === "none" && chart.reason && !show3D && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Tidak digambar sebagai chart</AlertTitle>
          <AlertDescription>{chart.reason}</AlertDescription>
        </Alert>
      )}

      {chartCard &&
        (compact ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{chartTitle}</p>
              {measurePicker}
            </div>
            {chartBody}
            {hint}
            {emptyNote}
            {pickedBar}
          </div>
        ) : (
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-base">{chartTitle}</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {measurePicker}
                {vizPicker}
                {toggle3D}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {show3D ? (
                body3D
              ) : drawable ? (
                <>
                  {chartBody}
                  {hint}
                  {emptyNote}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Kombinasi ini tidak bisa digambar sebagai grafik 2D. Pilih <b>3D</b> untuk melihatnya sebagai grafik
                  batang tiga dimensi.
                </p>
              )}
              {pickedBar}
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

      <PointActionDialog
        picked={picked.length}
        pickedOperation={selectionOperation(pending ? withPoint(picked, pending.point) : picked)}
        canPick={pending ? canPickPoint(pending.point) : true}
        onAddPicked={() => {
          if (pending) addPicked(pending.point);
          setPending(null);
        }}
        onDice={() => {
          const all = pending ? withPoint(picked, pending.point) : picked;
          onDice?.(all);
          setPicked([]);
          setPending(null);
        }}
        rollUpLabel={onRollUp ? rollUpLabel : null}
        onRollUp={() => {
          onRollUp?.();
          setPending(null);
        }}
        pending={pending}
        pointLabel={pending ? describeDrillPoint(pending.point, labelOf) : ""}
        pointDims={
          pending
            ? Object.entries(pending.point).map(([key, value]) => ({ key, label: labelOf(key), value }))
            : []
        }
        drillTargets={
          pending && onDrillDown && drillTargetsOf
            ? drillTargetsOf(pending.point).map((t) => ({
                ...t,
                label: `${labelOf(t.from)} ${pending.point[t.from]} → ${t.toLabel}`,
              }))
            : []
        }
        onDrillDown={(target) => {
          if (pending) onDrillDown?.(pending.point, target);
          setPending(null);
        }}
        onClose={() => setPending(null)}
        onSlice={(dim) => {
          if (pending) onSlice?.(dim, pending.point[dim]);
          setPending(null);
        }}
        onDiceAll={() => {
          if (pending) onDice?.([pending.point]);
          setPending(null);
        }}
        onAlumni={() => {
          if (pending) showAlumni(pending.point, pending.measure, pending.value);
          setPending(null);
        }}
      />

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
