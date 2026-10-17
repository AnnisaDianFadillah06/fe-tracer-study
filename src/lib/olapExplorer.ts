/**
 * olapExplorer.ts
 *
 * Tipe dan seluruh logika murni halaman Insight (OLAP Explorer): menyusun
 * hasil query jadi pivot, memilih tipe chart, dan memformat angka.
 *
 * Sengaja dipisahkan dari komponen supaya bisa diuji tanpa merender apa pun —
 * kesalahan pivot menghasilkan angka yang keliru, bukan tampilan yang jelek,
 * jadi ia perlu tes.
 */

// ═══════════════════════════════════════════════════════════
//  Tipe — cerminan response backend
// ═══════════════════════════════════════════════════════════

export type MeasureFormat = "integer" | "decimal" | "currency" | "percent" | "ratio";

/** Asal-usul ukuran hasil rumus (dikirim peladen di result.measures). */
export interface FormulaRef {
  left: string;
  op: FormulaOp;
  right: string;
  left_label: string;
  left_format: MeasureFormat;
}

export interface CatalogMeasure {
  key: string;
  label: string;
  format: MeasureFormat;
  /** Penjelasan singkat untuk pengguna non-IT; boleh kosong. */
  description?: string;
  /** Hanya pada ukuran hasil rumus. */
  formula?: FormulaRef;
}

/**
 * Kolom angka yang bisa diolah dengan beberapa fungsi — "[Rata-rata] dari
 * [Gaji]". Dibangkitkan di model Cube dan dibaca peladen dari /meta, jadi
 * kolom baru muncul di sini tanpa mengubah kode.
 */
export interface NumericColumn {
  column: string;
  label: string;
  format: MeasureFormat;
  functions: { fn: string; label: string; key: string }[];
}

export interface CatalogDimension {
  key: string;
  label: string;
}

export interface CatalogDimensionGroup {
  group: string;
  members: CatalogDimension[];
}

/** Jenjang dimensi untuk roll-up / drill-down, level ringkas → rinci. */
export interface CatalogHierarchy {
  name: string;
  levels: string[];
}

export interface CatalogCube {
  key: string;
  label: string;
  description: string;
  measures: CatalogMeasure[];
  numeric_columns?: NumericColumn[];
  /** Cacah dasar sumber data ini; dasar "sembunyikan kelompok < n". */
  count_measure?: string | null;
  /** Batas dimensi sekaligus untuk cube ini (lihat maxDimensionsOf). */
  max_dimensions?: number;
  dimension_groups: CatalogDimensionGroup[];
  /** Peladen lama tidak mengirimnya → tidak ada drill-down berjenjang. */
  hierarchies?: CatalogHierarchy[];
}

/**
 * Batas dimensi sekaligus untuk satu sumber data. Peladen menghitungnya dari
 * jumlah tabel dimensi cube itu; peladen lama hanya mengirim batas global.
 */
export function maxDimensionsOf(cube: CatalogCube, catalog: ExplorerCatalog): number {
  return cube.max_dimensions ?? catalog.limits.max_dimensions;
}

export interface ExplorerCatalog {
  cubes: CatalogCube[];
  limits: {
    max_dimensions: number;
    max_measures: number;
    max_formulas?: number;
    max_rows: number;
  };
}

export type FilterOperator = "equals" | "notEquals" | "set" | "notSet";

export const FILTER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "equals", label: "adalah" },
  { value: "notEquals", label: "bukan" },
  { value: "set", label: "ada nilainya" },
  { value: "notSet", label: "kosong" },
];

export interface ExplorerFilter {
  member: string;
  /** Tanpa operator = "adalah" (bentuk lama pertanyaan tersimpan). */
  operator?: FilterOperator;
  values: string[];
  /**
   * "drill" = dipasang drill-down, jadi boleh dilepas roll-up. Saringan
   * buatan pengguna tidak punya penanda ini dan tidak pernah dilepas
   * roll-up. Hanya di sisi ini; tidak dikirim ke peladen.
   */
  origin?: "drill";
  /**
   * Posisi dimensi yang dikeluarkan dari tampilan saat saringan ini menjadi
   * slice (satu nilai). Dipakai untuk mengembalikannya bila slice dibatalkan.
   */
  slicedFrom?: SliceOrigin;
}

/** Bekas posisi dimensi yang di-slice: urutan ke-n di Baris, atau Kolom. */
export type SliceOrigin = { slot: "row"; index: number } | { slot: "col" };

/** "adalah"/"bukan" baru berlaku setelah ada nilai; "ada nilainya"/"kosong" langsung berlaku. */
export function filterIsActive(f: ExplorerFilter): boolean {
  return f.operator === "set" || f.operator === "notSet" || f.values.length > 0;
}

export type FormulaOp = "div" | "sub" | "add" | "mul";

export const FORMULA_OPS: { value: FormulaOp; symbol: string; label: string }[] = [
  { value: "div", symbol: "÷", label: "dibagi" },
  { value: "sub", symbol: "−", label: "dikurangi" },
  { value: "add", symbol: "+", label: "ditambah" },
  { value: "mul", symbol: "×", label: "dikali" },
];

/** Dua ukuran digabung — dihitung peladen dari hasil agregasi. */
export interface Formula {
  /** rumus_1, rumus_2, … */
  key: string;
  label: string;
  left: string;
  op: FormulaOp;
  right: string;
  format: MeasureFormat;
}

/** Persen dihitung di sisi ini dari pivot: hanya untuk cacah (boleh dijumlah). */
export type PercentMode = "none" | "row" | "column" | "all";

export interface SortOption {
  by: string;
  direction: "asc" | "desc";
  /** null = semua. */
  limit: number | null;
}

/** Kolom tambahan "B − A" di pivot, mis. gap kompetensi. */
export interface ColumnDiff {
  a: string;
  b: string;
}

export type ExplorerRow = Record<string, string | number | null>;

export interface ExplorerResult {
  cube: string;
  measures: CatalogMeasure[];
  dimensions: CatalogDimension[];
  rows: ExplorerRow[];
  row_count: number;
  truncated: boolean;
}

// ═══════════════════════════════════════════════════════════
//  Pemilihan tipe chart
// ═══════════════════════════════════════════════════════════

export type ChartKind =
  | "number"
  | "bar"
  | "line"
  | "grouped-bar"
  | "area"
  | "row"
  | "stacked"
  | "pie"
  | "combo"
  /** Dua dimensi baris bertingkat di sumbu X (luar › dalam), lihat buildNestedPlan. */
  | "nested-bar"
  /** Pivot sebagai grid berwarna menurut nilai, lihat canHeatmap. */
  | "heatmap"
  /** Satu titik per kelompok, X dan Y dari dua ukuran, lihat toScatterPoints. */
  | "scatter"
  | "none";

/**
 * Pilihan visualisasi pengguna. "auto"
 * menyerahkan bentuknya ke `chooseChartKind`; yang lain memaksa bentuk itu
 * selama datanya memungkinkan (lihat `availableViz`).
 */
export type Viz =
  | "auto"
  | "combo"
  | "table"
  | "bar"
  | "row"
  | "line"
  | "area"
  | "stacked"
  | "pie"
  | "panels"
  | "heatmap"
  | "scatter";

export const VIZ_LABELS: Record<Viz, string> = {
  auto: "Otomatis",
  combo: "Semua ukuran",
  table: "Tabel",
  bar: "Batang",
  row: "Batang mendatar",
  line: "Garis",
  area: "Area",
  stacked: "Batang bertumpuk",
  pie: "Pai",
  panels: "Panel terpisah",
  heatmap: "Peta panas",
  scatter: "Sebaran titik",
};

/**
 * Bentuk yang kelayakannya bergantung pada hasil, bukan pada keputusan chart:
 * heatmap butuh dimensi kolom (canHeatmap), sebaran titik butuh dua ukuran
 * (canScatter). Dihitung pemanggil lalu diteruskan ke availableViz/applyViz.
 */
export interface ExtraViz {
  heatmap?: boolean;
  scatter?: boolean;
}

/** Lebih dari ini irisan pai tidak lagi bisa dibedakan. */
export const MAX_PIE_SLICES = 12;

/**
 * Dimensi yang nilainya berurutan dan enak dibaca sebagai garis. Hanya tahun
 * lulus — tahun UMP menyertai nilai UMP, bukan deret waktu yang diamati.
 */
const TIME_LIKE_DIMENSIONS = ["DimAlumni.tahun_lulus"];

export function isTimeLike(dimension: string): boolean {
  return TIME_LIKE_DIMENSIONS.includes(dimension);
}

/**
 * Tiga dimensi tidak digambar: chart-nya butuh sumbu ketiga yang tidak ada,
 * dan memaksakannya jadi legenda gabungan menghasilkan puluhan seri yang tidak
 * terbaca. Pivot table menanganinya dengan baik, jadi chart-nya dilewati.
 */
export function chooseChartKind(rowDims: string[], colDim: string | null): ChartKind {
  const total = rowDims.length + (colDim ? 1 : 0);

  if (total === 0) return "number";
  if (total >= 3) return "none";

  if (total === 1) {
    const only = colDim ?? rowDims[0];
    return isTimeLike(only) ? "line" : "bar";
  }

  return "grouped-bar";
}

/**
 * Batas gambar.
 *
 * Banyak kategori BUKAN alasan untuk menolak menggambar — chart dengan 67
 * program studi tetap terbaca kalau diberi lebar yang cukup dan bisa
 * digeser mendatar. Yang dulu jadi gumpalan tak terbaca bukan jumlah
 * kategorinya, tapi memaksa semuanya muat di lebar tetap. Jadi batas di sini
 * tinggal batas kewarasan: di atas ini gambarnya memang tidak lagi bisa
 * dipakai untuk apa pun, dan tabel jauh lebih berguna.
 */
export const MAX_CHART_CATEGORIES = 200;

/** Seri dibedakan lewat warna, dan mata berhenti bisa membedakannya jauh lebih cepat. */
export const MAX_CHART_SERIES = 12;

/** Panel dibandingkan berdampingan; lebih dari ini tidak lagi bisa dibandingkan. */
export const MAX_FACETS = 12;

/** Dimensi baris terbanyak yang masih bisa digambar sebagai batang/garis. */
export const MAX_CHART_ROW_DIMENSIONS = 2;

/** Lebar minimum per kategori, dipakai menghitung lebar chart yang bisa digeser. */
export const MIN_CATEGORY_WIDTH = 32;

/** Lebar minimum satu batang di dalam kelompok. */
export const MIN_BAR_WIDTH = 12;

/**
 * Lebar minimum chart sebelum ia boleh digeser mendatar.
 *
 * Yang butuh ruang adalah BATANGNYA, bukan seluruh kelompok dikali jumlah
 * seri. Rumus lama (kategori × 32px × seri) membuat 6 tahun × 6 status
 * meminta 1152px, sehingga tahun terakhir tersembunyi di balik gulir yang
 * tidak disadari pengguna. Sekarang tiap kelompok cukup selebar batang-
 * batangnya plus sela, dengan batas bawah MIN_CATEGORY_WIDTH untuk label.
 */
export function minChartWidth(categories: number, series: number): number {
  const perKategori = Math.max(MIN_CATEGORY_WIDTH, MIN_BAR_WIDTH * Math.max(series, 1) + 8);
  return Math.max(categories * perKategori, 320);
}

export interface ChartDecision {
  kind: ChartKind;
  /** true = digambar sebagai beberapa panel kecil, satu per nilai dimensi panel. */
  faceted: boolean;
  /** Diisi hanya kalau kind === "none": alasan yang ditampilkan ke pengguna. */
  reason?: string;
  /**
   * Hanya pada "nested-bar": keputusan jalur panel untuk hasil yang sama.
   * Dipakai saat pengguna memilih "Panel terpisah" atau bentuk yang tidak
   * bisa bertingkat (garis, area, bertumpuk, batang mendatar).
   */
  panels?: ChartDecision;
}

/**
 * Keputusan akhir soal chart — memakai hasil yang sesungguhnya, bukan cuma
 * jumlah dimensi.
 *
 * DIMENSI KETIGA JADI PANEL, bukan dijejalkan ke sumbu yang sama. Menggabung
 * dua dimensi pada satu sumbu menghasilkan satu batang per kombinasi — ratusan
 * batang yang menumpuk jadi gumpalan. Dipecah jadi panel, tiap panel tetap
 * chart dua dimensi yang normal. Ini berlaku untuk semua measure, termasuk
 * rata-rata; menumpuk rata-rata (stacked bar) akan menghasilkan tinggi batang
 * yang tidak berarti apa pun.
 *
 * KECUALI kombinasinya cukup kecil untuk satu grafik: dua dimensi baris lalu
 * ditaruh bertingkat di sumbu X (lihat buildNestedPlan). Satu grafik berarti
 * satu sumbu Y bersama, sedangkan panel menskalakan sumbu Y-nya sendiri-sendiri.
 * Keputusan panelnya tetap dihitung dan dibawa di `panels`.
 */
export function decideChart(
  rowDims: string[],
  colDim: string | null,
  plan: FacetPlan,
  nested: NestedPlan | null = null,
): ChartDecision {
  // Batang, garis, bertingkat, dan panel paling banyak memuat dua dimensi
  // baris. Lebih dari itu ditolak dengan alasan; pemanggil menggantinya
  // dengan peta panas bila ada dimensi kolom (preferHeatmap), dan tabel
  // bersarang selalu ada. Tanpa ini buildFacets diam-diam membuang dimensi
  // baris ketiga dan grafiknya menggambar angka yang salah dikelompokkan.
  if (rowDims.length > MAX_CHART_ROW_DIMENSIONS) {
    return {
      kind: "none",
      faceted: false,
      reason:
        `${rowDims.length} dimensi baris terlalu banyak untuk grafik batang atau garis. ` +
        "Angkanya ada di tabel bersarang di bawah; pilih \"Dibandingkan antar\" untuk melihatnya juga sebagai peta panas.",
    };
  }

  const panels = decidePanels(rowDims, colDim, plan);

  if (nested && canNest(nested)) return { kind: "nested-bar", faceted: false, panels };

  return panels;
}

function decidePanels(
  rowDims: string[],
  colDim: string | null,
  plan: FacetPlan,
): ChartDecision {
  const total = rowDims.length + (colDim ? 1 : 0);

  if (total === 0) return { kind: "number", faceted: false };

  const faceted = plan.facetDim !== null;

  // Saat berpanel, dimensi yang menentukan bentuk chart tinggal dua: dimensi
  // sumbu X dan dimensi kolom. Yang ketiga sudah "dipakai" oleh panelnya.
  const kind = chooseChartKind(plan.xDim ? [plan.xDim] : [], colDim);

  if (kind === "none" || kind === "number") {
    return { kind, faceted: false };
  }

  const series = Math.max(...plan.facets.map((f) => f.pivot.columnKeys.length), 0);

  if (series > MAX_CHART_SERIES) {
    return {
      kind: "none",
      faceted: false,
      reason:
        `Dimensi Kolom menghasilkan ${series} seri — terlalu banyak untuk dibedakan warnanya. ` +
        "Saring nilainya, atau pindahkan dimensi itu ke Baris. Angkanya lengkap di tabel di bawah.",
    };
  }

  if (faceted && plan.facets.length > MAX_FACETS) {
    return {
      kind: "none",
      faceted: false,
      reason:
        `Kombinasi ini menghasilkan ${plan.facets.length} panel — terlalu banyak untuk dibandingkan berdampingan. ` +
        "Saring dimensi itu, atau pindahkan salah satunya ke Kolom. Angkanya lengkap di tabel di bawah.",
    };
  }

  const terbanyak = Math.max(...plan.facets.map((f) => f.pivot.rows.length), 0);

  if (terbanyak > MAX_CHART_CATEGORIES) {
    return {
      kind: "none",
      faceted: false,
      reason:
        `Kombinasi ini menghasilkan ${terbanyak} kelompok — terlalu banyak untuk digambar. ` +
        "Tambahkan filter supaya kelompoknya lebih sedikit. Angkanya lengkap di tabel di bawah.",
    };
  }

  return { kind, faceted };
}

/**
 * Chart "semua ukuran" hanya bila ada ≥2 ukuran dan satu seri (tanpa dimensi
 * kolom, tanpa panel): kolom + panel + ukuran akan jadi tiga sumbu perbedaan
 * sekaligus dan tidak lagi terbaca.
 */
export function canCombo(decision: ChartDecision, series: number, measures: number): boolean {
  return (
    measures > 1 &&
    series <= 1 &&
    !decision.faceted &&
    decision.kind !== "none" &&
    decision.kind !== "number" &&
    decision.kind !== "pie"
  );
}

/**
 * Visualisasi yang boleh dipilih untuk hasil ini. Kosong bila tidak ada yang
 * bisa dipilih (angka tunggal, atau terlalu banyak dimensi untuk digambar).
 *
 * - Pai hanya untuk satu seri: pai berseri banyak tidak punya arti.
 * - Bertumpuk hanya bila ada lebih dari satu seri; itu satu-satunya cara ia
 *   berbeda dari batang biasa.
 * - Heatmap dan sebaran titik bergantung pada hasil (lihat ExtraViz), dan
 *   tetap ditawarkan walau grafik batang/garis ditolak -- justru di situ
 *   keduanya paling berguna.
 */
export function availableViz(
  decision: ChartDecision,
  series: number,
  categories: number,
  measures = 1,
  extra: ExtraViz = {},
): Viz[] {
  if (decision.kind === "number") return [];

  const tambahan: Viz[] = [];
  // Heatmap otomatis (pengganti grafik yang ditolak) sudah tampil lewat "Otomatis".
  if (extra.heatmap && decision.kind !== "heatmap") tambahan.push("heatmap");
  if (extra.scatter) tambahan.push("scatter");

  return ["auto", ...chartViz(decision, series, categories, measures), ...tambahan, "table"];
}

/** Pilihan batang/garis/area/pai untuk keputusan ini, tanpa Otomatis dan Tabel. */
function chartViz(decision: ChartDecision, series: number, categories: number, measures: number): Viz[] {
  // Bertingkat: pilihannya pilihan jalur panel, ditambah "Panel terpisah".
  // "Batang" di sini berarti bertingkat (lihat applyViz).
  if (decision.kind === "nested-bar" && decision.panels) {
    const viaPanels = chartViz(decision.panels, series, categories, measures);
    return viaPanels.includes("bar") ? [...viaPanels, "panels"] : [];
  }

  // Ditolak, atau sudah diganti heatmap karena ditolak.
  if ((decision.kind === "none" && decision.reason) || decision.kind === "heatmap") return [];

  const out: Viz[] = [];
  if (canCombo(decision, series, measures)) out.push("combo");
  out.push("bar", "row", "line", "area");
  if (series > 1) out.push("stacked");
  if (series <= 1 && categories <= MAX_PIE_SLICES) out.push("pie");

  return out;
}

/**
 * Terapkan pilihan pengguna ke keputusan otomatis. Pilihan yang tidak lagi
 * tersedia (mis. pai setelah dimensi kolom ditambah) diabaikan diam-diam dan
 * jatuh ke otomatis, supaya pertanyaan tersimpan tidak pernah rusak.
 */
export function applyViz(
  decision: ChartDecision,
  viz: Viz | undefined,
  series: number,
  categories: number,
  measures = 1,
  extra: ExtraViz = {},
): ChartDecision {
  // "Semua ukuran" hanya lewat pilihan manual; otomatis tetap seperti semula
  // supaya tampilan hasil lama tidak berubah.
  if (!viz || viz === "auto") return decision;
  if (!availableViz(decision, series, categories, measures, extra).includes(viz)) return decision;

  if (viz === "heatmap") return { kind: "heatmap", faceted: false };
  if (viz === "scatter") return { kind: "scatter", faceted: false };

  if (decision.kind === "nested-bar" && decision.panels) {
    if (viz === "bar") return decision;
    if (viz === "panels") return decision.panels;
    return applyViz(decision.panels, viz, series, categories, measures, extra);
  }

  if (viz === "combo") return { kind: "combo", faceted: false };

  if (viz === "table") return { kind: "none", faceted: false };

  // Tidak pernah ditawarkan di luar grafik bertingkat (lihat availableViz).
  if (viz === "panels") return decision;

  const kind: ChartKind =
    viz === "bar" ? (series > 1 ? "grouped-bar" : "bar") : viz;

  return { kind, faceted: decision.faceted };
}

// ═══════════════════════════════════════════════════════════
//  Pivot
// ═══════════════════════════════════════════════════════════

export interface PivotCell {
  /** null berarti kombinasi baris × kolom ini memang tidak ada di hasil. */
  value: number | null;
}

export interface PivotRow {
  /** Nilai tiap dimensi baris, urut sesuai rowDims. */
  keys: string[];
  /** cells[kolom][measure] — kolom "" dipakai saat tidak ada dimensi kolom. */
  cells: Record<string, Record<string, PivotCell>>;
  /** Total baris per measure, null kalau measure-nya tidak boleh dijumlahkan. */
  totals: Record<string, number | null>;
}

export interface Pivot {
  columnKeys: string[];
  /** Kolom hasil hitungan (selisih kolom) — bukan kelompok data, jadi tidak bisa di-drill. */
  derivedColumns?: string[];
  rows: PivotRow[];
  /** Total kolom per measure, null kalau measure-nya tidak boleh dijumlahkan. */
  columnTotals: Record<string, Record<string, number | null>>;
  grandTotals: Record<string, number | null>;
}

/** Penanda kolom tunggal saat pengguna tidak memilih dimensi kolom. */
export const SINGLE_COLUMN = "";

/**
 * Hanya cacah yang boleh dijumlahkan.
 *
 * Menjumlahkan rata-rata menghasilkan angka yang tidak berarti apa-apa, dan
 * merata-ratakan rata-rata per kelompok juga salah kecuali tiap kelompok sama
 * besar — bobotnya tidak ada di hasil agregat, jadi tidak bisa dihitung di
 * sisi ini. Subtotalnya dikosongkan, bukan ditebak.
 */
export function canTotal(format: MeasureFormat): boolean {
  return format === "integer";
}

export function buildPivot(
  result: ExplorerResult,
  rowDims: string[],
  colDim: string | null,
): Pivot {
  const measures = result.measures;

  const columnKeys: string[] = [];
  const rowOrder: string[] = [];
  const rowMap = new Map<string, PivotRow>();

  const cellOf = (row: ExplorerRow, dim: string): string =>
    row[dim] === null || row[dim] === undefined ? "(kosong)" : String(row[dim]);

  for (const row of result.rows) {
    const keys = rowDims.map((d) => cellOf(row, d));
    const rowId = keys.join("\u0000");
    const colKey = colDim ? cellOf(row, colDim) : SINGLE_COLUMN;

    if (!columnKeys.includes(colKey)) columnKeys.push(colKey);

    let pivotRow = rowMap.get(rowId);
    if (!pivotRow) {
      pivotRow = { keys, cells: {}, totals: {} };
      rowMap.set(rowId, pivotRow);
      rowOrder.push(rowId);
    }

    if (!pivotRow.cells[colKey]) pivotRow.cells[colKey] = {};

    for (const m of measures) {
      const raw = row[m.key];
      pivotRow.cells[colKey][m.key] = {
        value: raw === null || raw === undefined ? null : Number(raw),
      };
    }
  }

  const rows = rowOrder.map((id) => rowMap.get(id)!);

  // Subtotal baris
  for (const pivotRow of rows) {
    for (const m of measures) {
      pivotRow.totals[m.key] = canTotal(m.format)
        ? sumCells(columnKeys.map((c) => pivotRow.cells[c]?.[m.key]?.value ?? null))
        : null;
    }
  }

  // Subtotal kolom + total keseluruhan
  const columnTotals: Record<string, Record<string, number | null>> = {};
  const grandTotals: Record<string, number | null> = {};

  for (const colKey of columnKeys) {
    columnTotals[colKey] = {};
    for (const m of measures) {
      columnTotals[colKey][m.key] = canTotal(m.format)
        ? sumCells(rows.map((r) => r.cells[colKey]?.[m.key]?.value ?? null))
        : null;
    }
  }

  for (const m of measures) {
    grandTotals[m.key] = canTotal(m.format)
      ? sumCells(rows.map((r) => r.totals[m.key]))
      : null;
  }

  return { columnKeys, rows, columnTotals, grandTotals };
}

/**
 * Menjumlahkan sambil membedakan "tidak ada nilai sama sekali" dari "nol".
 * Baris yang seluruh selnya kosong menghasilkan null, bukan 0 — 0 akan terbaca
 * sebagai fakta (tidak ada alumni), padahal artinya datanya tidak ada.
 */
function sumCells(values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null && !Number.isNaN(v));
  if (present.length === 0) return null;
  return present.reduce((a, b) => a + b, 0);
}

// ═══════════════════════════════════════════════════════════
//  Tabulasi silang bersarang (baris berkelompok + subtotal)
// ═══════════════════════════════════════════════════════════

export interface TableKeyCell {
  text: string;
  /** Jumlah baris tabel yang dicakup sel ini (termasuk subtotal di dalamnya). */
  rowSpan: number;
}

export interface TableLine {
  kind: "data" | "subtotal";
  /**
   * Hanya baris data: sel kunci yang DIMULAI di baris ini per tingkat;
   * undefined = tingkat itu tertutup rowSpan sel di atasnya.
   */
  keyCells: Array<TableKeyCell | undefined>;
  /** Kunci titik yang bisa diklik: seluruh kunci (data) atau prefiks kelompok (subtotal). */
  path: string[];
  /**
   * Hanya subtotal: tingkat kelompoknya (= panjang path). Sel labelnya
   * dimulai di kolom kunci ke-(labelLevel - 1) dan membentang ke kanan.
   */
  labelLevel?: number;
  /** values[kolom][measure] */
  values: Record<string, Record<string, number | null>>;
  /** Total baris lintas kolom per measure; null untuk yang tak boleh dijumlah. */
  totals: Record<string, number | null>;
}

/**
 * Susunan tabel pivot dengan dimensi baris bertingkat, seperti cross-tab
 * berhierarki (kategori › barang): baris dikelompokkan per kunci luar, sel
 * kunci yang berulang digabung (rowSpan), dan setiap kelompok yang berisi
 * lebih dari satu baris diberi baris subtotal di tiap tingkat.
 *
 * Kelompok disusun menurut urutan kemunculan pertama, bukan abjad, supaya
 * pengurutan dan "N teratas" dari peladen tetap berlaku di dalam kelompok.
 * Subtotal hanya untuk cacah (canTotal) -- rata-rata dikosongkan dengan
 * alasan yang sama seperti total di buildPivot. Tanpa satu pun cacah, tidak
 * ada baris subtotal sama sekali: baris yang seluruhnya kosong hanya bising.
 */
export function buildTableLayout(pivot: Pivot, measures: CatalogMeasure[], depth: number): TableLine[] {
  const withSubtotals = depth > 1 && measures.some((m) => canTotal(m.format));
  const lines: TableLine[] = [];

  const dataLine = (row: PivotRow): TableLine => ({
    kind: "data",
    keyCells: [],
    path: row.keys,
    values: Object.fromEntries(
      pivot.columnKeys.map((c) => [c, Object.fromEntries(measures.map((m) => [m.key, row.cells[c]?.[m.key]?.value ?? null]))]),
    ),
    totals: row.totals,
  });

  const subtotalLine = (rows: PivotRow[], path: string[]): TableLine => {
    const sum = (m: CatalogMeasure, pick: (r: PivotRow) => number | null) =>
      canTotal(m.format) ? sumCells(rows.map(pick)) : null;

    return {
      kind: "subtotal",
      keyCells: [],
      path,
      labelLevel: path.length,
      values: Object.fromEntries(
        pivot.columnKeys.map((c) => [
          c,
          Object.fromEntries(measures.map((m) => [m.key, sum(m, (r) => r.cells[c]?.[m.key]?.value ?? null)])),
        ]),
      ),
      totals: Object.fromEntries(measures.map((m) => [m.key, sum(m, (r) => r.totals[m.key] ?? null)])),
    };
  };

  /** Menyusun baris untuk satu kelompok; mengembalikan jumlah baris tabel yang dibuat. */
  const emit = (rows: PivotRow[], level: number): number => {
    if (level >= depth - 1) {
      for (const row of rows) {
        const line = dataLine(row);
        line.keyCells[level] = { text: row.keys[level] ?? "", rowSpan: 1 };
        lines.push(line);
      }
      return rows.length;
    }

    const order: string[] = [];
    const groups = new Map<string, PivotRow[]>();
    for (const row of rows) {
      const key = row.keys[level] ?? "";
      if (!groups.has(key)) {
        groups.set(key, []);
        order.push(key);
      }
      groups.get(key)!.push(row);
    }

    let made = 0;
    for (const key of order) {
      const members = groups.get(key)!;
      const first = lines.length;
      const span = emit(members, level + 1);
      lines[first].keyCells[level] = { text: key, rowSpan: span };
      made += span;

      if (withSubtotals && members.length > 1) {
        lines.push(subtotalLine(members, members[0].keys.slice(0, level + 1)));
        made += 1;
      }
    }
    return made;
  };

  emit(pivot.rows, 0);
  return lines;
}

// ═══════════════════════════════════════════════════════════
//  Panel (small multiples)
// ═══════════════════════════════════════════════════════════

export interface Facet {
  /** Nilai dimensi panel; string kosong kalau chart-nya tidak berpanel. */
  key: string;
  pivot: Pivot;
}

export interface FacetPlan {
  /** Dimensi yang jadi sumbu X. */
  xDim: string | null;
  /** Dimensi yang jadi panel, atau null kalau chart-nya tunggal. */
  facetDim: string | null;
  facets: Facet[];
}

function jumlahNilaiUnik(rows: ExplorerRow[], dim: string): number {
  return new Set(rows.map((r) => String(r[dim] ?? "(kosong)"))).size;
}

/**
 * Menyusun rencana panel dari dua dimensi baris.
 *
 * DIMENSI PANEL DIPILIH OTOMATIS: yang nilainya paling sedikit. Kalau slot
 * "Baris kedua" selalu jadi panel, memilih Program Studi di sana menghasilkan
 * 67 panel dan chart-nya ditolak — padahal kombinasi yang sama persis bisa
 * digambar dengan baik kalau perannya ditukar: 67 program studi di sumbu X
 * (bisa digeser mendatar) dan segelintir panel. Pengguna tidak punya alasan
 * untuk menebak urutan slot mana yang "benar", jadi urusannya diselesaikan di
 * sini, bukan dibebankan ke mereka lewat pesan galat.
 *
 * Kalau dimensi barisnya cuma satu (atau tidak ada), hasilnya satu panel
 * tunggal berkunci string kosong, sehingga pemanggil tidak perlu membedakan
 * kedua kasus.
 */
export function buildFacets(
  result: ExplorerResult,
  rowDims: string[],
  colDim: string | null,
): FacetPlan {
  if (rowDims.length < 2) {
    return {
      xDim: rowDims[0] ?? null,
      facetDim: null,
      facets: [{ key: SINGLE_COLUMN, pivot: buildPivot(result, rowDims, colDim) }],
    };
  }

  const [a, b] = rowDims;
  const facetDim = jumlahNilaiUnik(result.rows, b) <= jumlahNilaiUnik(result.rows, a) ? b : a;
  const xDim = facetDim === b ? a : b;

  const order: string[] = [];
  const grouped = new Map<string, ExplorerRow[]>();

  for (const row of result.rows) {
    const raw = row[facetDim];
    const key = raw === null || raw === undefined ? "(kosong)" : String(raw);

    if (!grouped.has(key)) {
      grouped.set(key, []);
      order.push(key);
    }

    grouped.get(key)!.push(row);
  }

  return {
    xDim,
    facetDim,
    facets: order
      .slice()
      .sort((x, y) => x.localeCompare(y, "id"))
      .map((key) => ({
        key,
        // Di dalam panel, dimensi panel sudah tetap nilainya — jadi barisnya
        // dipecah hanya oleh dimensi sumbu X.
        pivot: buildPivot({ ...result, rows: grouped.get(key)! }, [xDim], colDim),
      })),
  };
}

// ═══════════════════════════════════════════════════════════
//  Sumbu X bertingkat (dua dimensi baris dalam satu grafik)
// ═══════════════════════════════════════════════════════════

/** Lebih dari ini label dalam saling menimpa; jatuh ke panel. */
export const MAX_NESTED_CATEGORIES = 40;

/** Lebih dari ini label luar tidak lagi terbaca sebagai kelompok. */
export const MAX_NESTED_GROUPS = 12;

export interface NestedGroup {
  /** Nilai dimensi luar. */
  key: string;
  /** id batang pertama dan terakhir kelompok, untuk menggambar label luar. */
  firstId: string;
  lastId: string;
}

export interface NestedPlan {
  outerDim: string;
  innerDim: string;
  /** true bila setiap nilai dalam hanya dimiliki satu nilai luar (jurusan → prodi). */
  hierarchical: boolean;
  /** Pivot dengan baris [luar, dalam], sudah dikelompokkan per luar. */
  pivot: Pivot;
  groups: NestedGroup[];
}

export interface NestedDatum {
  /** Kunci unik batang (lihat nestedId); spacer diberi kunci sendiri. */
  id: string;
  outer: string;
  inner: string;
  /** Indeks baris di NestedPlan.pivot; -1 untuk spacer antar kelompok. */
  rowIndex: number;
  [series: string]: string | number | null;
}

const keyOfValue = (v: ExplorerRow[string] | undefined): string =>
  v === null || v === undefined ? EMPTY_VALUE : String(v);

/**
 * Kunci batang = luar + dalam. Nama dalam saja tidak cukup: dengan Jenjang di
 * luar, prodi bernama sama bisa muncul di kelompok D3 dan D4, dan Recharts
 * menganggap kategori bernama sama sebagai satu kategori.
 */
export function nestedId(outer: string, inner: string): string {
  return `${outer}\u0000${inner}`;
}

/** B bergantung pada A: setiap nilai B hanya muncul bersama satu nilai A. */
export function isNestedIn(rows: ExplorerRow[], a: string, b: string): boolean {
  const parentOf = new Map<string, string>();

  for (const row of rows) {
    const parent = keyOfValue(row[a]);
    const child = keyOfValue(row[b]);
    const seen = parentOf.get(child);
    if (seen !== undefined && seen !== parent) return false;
    parentOf.set(child, parent);
  }

  return true;
}

/**
 * Rencana grafik bertingkat dari dua dimensi baris; null untuk jumlah dimensi
 * baris lainnya.
 *
 * MANA YANG DI LUAR dibaca dari hasil query, bukan dari urutan slot: induk
 * hierarki selalu di luar (jurusan › prodi, bukan prodi › jurusan). Tanpa
 * hierarki, dimensi bernilai lebih sedikit yang di luar -- aturan yang sama
 * dengan pemilihan dimensi panel di buildFacets. Data yang sudah disaring bisa
 * membentuk hierarki walau dimensinya secara umum tidak, jadi hasil query
 * adalah satu-satunya sumber yang pasti benar untuk grafik ini.
 *
 * Kelompok luar diurutkan (angka sebagai angka, jadi tahun lulus naik); urutan
 * di dalam kelompok mengikuti hasil query, sehingga pengurutan/N teratas dari
 * peladen tetap berlaku per kelompok.
 */
export function buildNestedPlan(
  result: ExplorerResult,
  rowDims: string[],
  colDim: string | null,
): NestedPlan | null {
  if (rowDims.length !== 2) return null;

  const [a, b] = rowDims;
  let outerDim: string;
  let hierarchical = true;

  if (isNestedIn(result.rows, a, b)) {
    outerDim = a;
  } else if (isNestedIn(result.rows, b, a)) {
    outerDim = b;
  } else {
    hierarchical = false;
    outerDim = jumlahNilaiUnik(result.rows, b) < jumlahNilaiUnik(result.rows, a) ? b : a;
  }

  const innerDim = outerDim === a ? b : a;
  const pivot = buildPivot(result, [outerDim, innerDim], colDim);

  const groupOrder: string[] = [];
  for (const row of pivot.rows) {
    if (!groupOrder.includes(row.keys[0])) groupOrder.push(row.keys[0]);
  }
  groupOrder.sort((x, y) => x.localeCompare(y, "id", { numeric: true }));

  const rows = groupOrder.flatMap((g) => pivot.rows.filter((r) => r.keys[0] === g));

  const groups = groupOrder.map((key) => {
    const members = rows.filter((r) => r.keys[0] === key);
    return {
      key,
      firstId: nestedId(key, members[0].keys[1]),
      lastId: nestedId(key, members[members.length - 1].keys[1]),
    };
  });

  return { outerDim, innerDim, hierarchical, pivot: { ...pivot, rows }, groups };
}

/** Muat dalam satu grafik? Di luar batas ini grafiknya jatuh ke panel. */
export function canNest(plan: NestedPlan): boolean {
  return (
    plan.pivot.rows.length <= MAX_NESTED_CATEGORIES &&
    plan.groups.length <= MAX_NESTED_GROUPS &&
    plan.pivot.columnKeys.length <= MAX_CHART_SERIES
  );
}

/**
 * Data Recharts untuk satu measure: satu datum per batang, dengan satu datum
 * kosong (spacer) di antara kelompok supaya kelompoknya terlihat terpisah.
 * Klik memakai `rowIndex`, bukan indeks array -- spacer menggeser indeks itu.
 */
export function toNestedChartData(plan: NestedPlan, measureKey: string): NestedDatum[] {
  const data: NestedDatum[] = [];

  plan.pivot.rows.forEach((row, rowIndex) => {
    const [outer, inner] = row.keys;

    if (rowIndex > 0 && plan.pivot.rows[rowIndex - 1].keys[0] !== outer) {
      data.push({ id: `\u0000spacer\u0000${rowIndex}`, outer: "", inner: "", rowIndex: -1 });
    }

    const datum: NestedDatum = { id: nestedId(outer, inner), outer, inner, rowIndex };
    for (const colKey of plan.pivot.columnKeys) {
      const series = colKey === SINGLE_COLUMN ? "nilai" : colKey;
      datum[series] = row.cells[colKey]?.[measureKey]?.value ?? null;
    }
    data.push(datum);
  });

  return data;
}

// ═══════════════════════════════════════════════════════════
//  Heatmap (peta panas)
// ═══════════════════════════════════════════════════════════

/** Di atas ini grid tidak lagi bisa dibaca per sel; tabel lebih jujur. */
export const MAX_HEATMAP_ROWS = 300;
export const MAX_HEATMAP_COLUMNS = 60;

/**
 * Heatmap = pivot yang selnya diwarnai menurut nilai, jadi bentuknya harus
 * benar-benar dua arah: ada dimensi kolom dengan minimal dua nilai. Batasnya
 * jauh lebih longgar dari batang -- 34 provinsi × 40 prodi tetap terbaca
 * sebagai pola warna, sedangkan sebagai batang sudah jadi gumpalan.
 */
export function canHeatmap(pivot: Pivot, colDim: string | null): boolean {
  return (
    colDim !== null &&
    pivot.rows.length >= 1 &&
    pivot.rows.length <= MAX_HEATMAP_ROWS &&
    pivot.columnKeys.length >= 2 &&
    pivot.columnKeys.length <= MAX_HEATMAP_COLUMNS
  );
}

/**
 * Kolom diurutkan (angka sebagai angka). Urutan kolom pivot mengikuti baris
 * pertama yang muncul di hasil query, jadi tahun lulus bisa tersusun 2020,
 * 2021, 2023, 2019 -- di heatmap pola dari tahun ke tahun justru yang dibaca,
 * dan urutan acak membuatnya tidak terbaca.
 */
export function sortColumns(pivot: Pivot): Pivot {
  return {
    ...pivot,
    columnKeys: [...pivot.columnKeys].sort((a, b) => a.localeCompare(b, "id", { numeric: true })),
  };
}

/**
 * Baris diurutkan per tingkat kunci (jurusan › prodi › tahun naik). Tanpa
 * pengurutan dari pengguna, urutan baris dari Cube.js tidak bermakna, dan
 * dengan banyak dimensi baris tahun-tahun satu prodi tercecer di mana-mana.
 * Pemanggil TIDAK memakai ini bila pengguna memilih urutan ("N teratas"):
 * di situ urutan dari peladen justru isinya.
 */
export function sortRows(pivot: Pivot): Pivot {
  const compare = (a: PivotRow, b: PivotRow) => {
    for (let i = 0; i < Math.max(a.keys.length, b.keys.length); i++) {
      const c = (a.keys[i] ?? "").localeCompare(b.keys[i] ?? "", "id", { numeric: true });
      if (c !== 0) return c;
    }
    return 0;
  };
  return { ...pivot, rows: [...pivot.rows].sort(compare) };
}

export interface HeatScale {
  min: number;
  max: number;
  /** Nilai bertanda campuran (mis. kolom selisih): warna dua arah di sekitar nol. */
  diverging: boolean;
}

/** Rentang nilai seluruh grid untuk satu ukuran; null bila tidak ada nilai. */
export function heatScale(pivot: Pivot, measureKey: string): HeatScale | null {
  const values = pivot.rows.flatMap((r) =>
    pivot.columnKeys
      .map((c) => r.cells[c]?.[measureKey]?.value ?? null)
      .filter((v): v is number => v !== null && !Number.isNaN(v)),
  );
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max, diverging: min < 0 && max > 0 };
}

/**
 * Kepekatan warna sel.
 *
 * Berurutan (semua bertanda sama): 0..1 dari nilai TERKECIL ke terbesar,
 * bukan dari nol. Rata-rata gaji 4–5 juta yang diskalakan dari nol akan
 * tampil seragam pekat; justru selisih di antara merekalah yang dicari.
 *
 * Divergen: -1..1 terhadap nilai mutlak terbesar, nol di tengah, sehingga
 * selisih +2 dan -2 sama pekatnya dengan warna berbeda.
 */
export function heatIntensity(value: number, scale: HeatScale): number {
  if (scale.diverging) {
    const span = Math.max(Math.abs(scale.min), Math.abs(scale.max));
    return value / span;
  }
  if (scale.max === scale.min) return 1;
  return (value - scale.min) / (scale.max - scale.min);
}

/**
 * Grafik yang ditolak (seri atau panel terlalu banyak) diganti heatmap bila
 * bentuk datanya memungkinkan, daripada hanya menyisakan tabel. Keputusan
 * lain tidak disentuh: tampilan otomatis yang sudah ada tidak berubah.
 */
export function preferHeatmap(decision: ChartDecision, heatmap: boolean): ChartDecision {
  return heatmap && decision.kind === "none" && decision.reason
    ? { kind: "heatmap", faceted: false }
    : decision;
}

// ═══════════════════════════════════════════════════════════
//  Sebaran titik (scatter / bubble)
// ═══════════════════════════════════════════════════════════

/** Lebih dari ini titiknya menumpuk jadi awan tanpa label. */
export const MAX_SCATTER_POINTS = 500;

export interface ScatterPoint {
  /** Label kelompok, mis. "D-3 Akuntansi". */
  name: string;
  x: number;
  y: number;
  /** Ukuran gelembung (ukuran ketiga); null = semua titik sama besar. */
  z: number | null;
  /** Indeks baris pivot dan kunci kolomnya, untuk aksi klik titik. */
  rowIndex: number;
  columnKey: string;
  /** Nama seri (nilai dimensi kolom), "nilai" bila tanpa dimensi kolom. */
  series: string;
}

/**
 * Satu titik per kelompok (baris × kolom pivot): X dan Y dari dua ukuran.
 *
 * Titiknya KELOMPOK, bukan alumni -- Explorer hanya menerima hasil agregasi.
 * Kelompok yang X atau Y-nya kosong dibuang: menaruhnya di nol akan terbaca
 * sebagai "masa tunggu nol bulan", padahal artinya tidak ada datanya.
 */
export function toScatterPoints(
  pivot: Pivot,
  xKey: string,
  yKey: string,
  zKey: string | null,
): ScatterPoint[] {
  const points: ScatterPoint[] = [];

  pivot.rows.forEach((row, rowIndex) => {
    for (const columnKey of pivot.columnKeys) {
      const cells = row.cells[columnKey];
      const x = cells?.[xKey]?.value ?? null;
      const y = cells?.[yKey]?.value ?? null;
      if (x === null || y === null || Number.isNaN(x) || Number.isNaN(y)) continue;

      points.push({
        name: row.keys.join(" · ") || "Total",
        x,
        y,
        z: zKey ? cells?.[zKey]?.value ?? null : null,
        rowIndex,
        columnKey,
        series: columnKey === SINGLE_COLUMN ? "nilai" : columnKey,
      });
    }
  });

  return points;
}

/**
 * Butuh dua ukuran (X dan Y) dan minimal dua titik. Kolom selisih ditolak:
 * isinya hanya satu ukuran yang sudah dikurangkan, bukan pasangan X–Y.
 */
export function canScatter(pivot: Pivot, measures: CatalogMeasure[]): boolean {
  if (measures.length < 2 || (pivot.derivedColumns?.length ?? 0) > 0) return false;
  if (pivot.columnKeys.length > MAX_CHART_SERIES) return false;

  const n = toScatterPoints(pivot, measures[0].key, measures[1].key, null).length;
  return n >= 2 && n <= MAX_SCATTER_POINTS;
}

/** Median untuk garis pembagi kuadran; tidak tertarik pencilan seperti rata-rata. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// ═══════════════════════════════════════════════════════════
//  Bentuk data untuk Recharts
// ═══════════════════════════════════════════════════════════

export interface ChartDatum {
  name: string;
  [series: string]: string | number | null;
}

/**
 * Chart menampilkan SATU measure. Dengan dua dimensi, sumbu X dipakai dimensi
 * baris dan legendanya dimensi kolom; sisanya tidak muat tanpa membuat
 * grafiknya menyesatkan.
 */
export function toChartData(pivot: Pivot, measureKey: string): ChartDatum[] {
  return pivot.rows.map((row) => {
    const datum: ChartDatum = { name: row.keys.join(" · ") || "Total" };

    for (const colKey of pivot.columnKeys) {
      const series = colKey === SINGLE_COLUMN ? "nilai" : colKey;
      datum[series] = row.cells[colKey]?.[measureKey]?.value ?? null;
    }

    return datum;
  });
}

export interface ComboSeries {
  /** Kunci aman di data chart (kunci measure asli memuat titik). */
  dataKey: string;
  measure: CatalogMeasure;
  axis: "left" | "right";
  shape: "bar" | "line";
}

/**
 * Menaruh ukuran-ukuran berbeda satuan pada sumbu Y yang berbeda. Ukuran
 * dengan format sama seperti ukuran pertama memakai sumbu kiri (batang);
 * sisanya sumbu kanan (garis). Jumlah alumni dan rata-rata gaji pada satu
 * sumbu akan membuat salah satunya rata di dasar.
 */
export function comboSeries(measures: CatalogMeasure[]): ComboSeries[] {
  const first = measures[0]?.format;

  return measures.map((measure, i) => {
    const left = measure.format === first;
    return { dataKey: `m${i}`, measure, axis: left ? "left" : "right", shape: left ? "bar" : "line" };
  });
}

/** Satu baris per kelompok, satu kolom data per ukuran (lihat ComboSeries.dataKey). */
export function toComboData(pivot: Pivot, series: ComboSeries[]): ChartDatum[] {
  const column = pivot.columnKeys[0] ?? SINGLE_COLUMN;

  return pivot.rows.map((row) => {
    const datum: ChartDatum = { name: row.keys.join(" · ") || "Total" };
    for (const s of series) datum[s.dataKey] = row.cells[column]?.[s.measure.key]?.value ?? null;
    return datum;
  });
}

/** Label sumbu Y: ribuan jadi "rb", jutaan jadi "jt". */
export function formatAxisValue(value: number): string {
  return Math.abs(value) >= 1_000_000
    ? `${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`
    : Math.abs(value) >= 1_000
      ? `${(value / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb`
      : value.toLocaleString("id-ID");
}

/**
 * Jumlah seri terisi terbanyak dalam satu batang/kategori.
 *
 * Bernilai 1 bila dimensi warna ditentukan oleh kategorinya (prodi → jurusan:
 * tiap prodi hanya punya satu jurusan). Batang berkelompok lalu menyediakan
 * slot untuk SETIAP seri di setiap kategori, padahal hanya satu yang terisi --
 * batangnya menyusut jadi garis tipis di pinggir slot. Pemanggil memakai
 * angka ini untuk menggambar satu batang selebar kategori dan menghitung
 * lebar grafik dari satu seri, bukan dari seluruh seri.
 */
export function filledSeriesPerBar(
  data: Array<Record<string, string | number | null | undefined>>,
  series: string[],
): number {
  return Math.max(
    0,
    ...data.map((d) => series.filter((s) => typeof d[s] === "number").length),
  );
}

export function chartSeriesNames(pivot: Pivot): string[] {
  return pivot.columnKeys.map((c) => (c === SINGLE_COLUMN ? "nilai" : c));
}

// ═══════════════════════════════════════════════════════════
//  Format angka
// ═══════════════════════════════════════════════════════════

export function formatMeasure(value: number | null, format: MeasureFormat): string {
  if (value === null || Number.isNaN(value)) return "—";

  // Selisih yang sangat kecil (mis. -0,004) jangan tampil sebagai "-0,0".
  if (Math.abs(value) < 0.005) value = 0;

  switch (format) {
    case "integer":
      return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
    case "percent":
      return `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)}%`;
    case "ratio":
      return `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}×`;
    case "currency":
      return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(value);
    case "decimal":
    default:
      return new Intl.NumberFormat("id-ID", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 2,
      }).format(value);
  }
}

// ═══════════════════════════════════════════════════════════
//  Penyusunan permintaan
// ═══════════════════════════════════════════════════════════

export interface ExplorerQueryInput {
  cube: string;
  measures: string[];
  rowDims: string[];
  colDim: string | null;
  filters: ExplorerFilter[];
  formulas?: Formula[];
  /** Sembunyikan kelompok dengan responden kurang dari n. */
  minN?: number | null;
  sort?: SortOption | null;
  /** Tampilan saja — diolah di sisi ini, tidak dikirim. */
  percent?: PercentMode;
  /** Tampilan saja — diolah di sisi ini, tidak dikirim. */
  diff?: ColumnDiff | null;
  /** Bentuk visualisasi pilihan pengguna; kosong = otomatis. */
  viz?: Viz;
}

/**
 * Dimensi baris dan kolom digabung jadi satu daftar untuk backend — Cube.js
 * tidak mengenal konsep baris/kolom, itu murni urusan penyajian. Urutannya
 * dipertahankan supaya pivot di sisi ini bisa membacanya kembali; dimensi
 * kolom tetap disebut terpisah karena urutan "N teratas" dihitung per
 * kelompok baris.
 */
export function toRequestBody(input: ExplorerQueryInput) {
  return {
    cube: input.cube,
    measures: input.measures,
    dimensions: [...input.rowDims, ...(input.colDim ? [input.colDim] : [])],
    filters: input.filters.filter(filterIsActive).map((f) => ({
      member: f.member,
      operator: f.operator ?? "equals",
      values: f.operator === "set" || f.operator === "notSet" ? [] : f.values,
    })),
    formulas: input.formulas ?? [],
    min_n: input.minN ?? null,
    sort: input.sort ?? null,
    column_dimension: input.colDim,
  };
}

/**
 * Tukar dimensi Baris pertama dengan dimensi Kolom (pivot/rotate). Tidak
 * melakukan apa-apa bila salah satunya kosong.
 */
export function swapRowsColumns(input: ExplorerQueryInput): ExplorerQueryInput {
  if (input.colDim === null || input.rowDims.length === 0) return input;

  return { ...input, rowDims: [input.colDim, ...input.rowDims.slice(1)], colDim: input.rowDims[0] };
}

/** Permintaan siap dijalankan? Minimal satu ukuran atau rumus; dimensi boleh kosong. */
export function isRunnable(input: ExplorerQueryInput): boolean {
  return input.cube !== "" && (input.measures.length > 0 || (input.formulas?.length ?? 0) > 0);
}

/** "Gaji" → "gaji", tapi "UMP provinsi" tetap "UMP provinsi" (sama dengan peladen). */
export function lowerFirst(s: string): string {
  return /^\p{Lu}\p{Ll}/u.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

/**
 * Label satu ukuran dari katalog: siap pakai, dari kolom angka
 * ("Rata-rata gaji"), atau rumus milik pertanyaan ini.
 */
export function measureLabelOf(
  cube: CatalogCube | null | undefined,
  key: string,
  formulas: Formula[] = [],
): string {
  const curated = cube?.measures.find((m) => m.key === key);
  if (curated) return curated.label;

  for (const col of cube?.numeric_columns ?? []) {
    const fn = col.functions.find((f) => f.key === key);
    if (fn) return `${fn.label} ${lowerFirst(col.label)}`;
  }

  return formulas.find((f) => f.key === key)?.label ?? key;
}

/** Format ukuran dari katalog (dipakai memilih tampilan rumus yang wajar). */
export function measureFormatOf(cube: CatalogCube | null | undefined, key: string): MeasureFormat {
  const curated = cube?.measures.find((m) => m.key === key);
  if (curated) return curated.format;

  return cube?.numeric_columns?.find((c) => c.functions.some((f) => f.key === key))?.format ?? "decimal";
}

// ═══════════════════════════════════════════════════════════
//  Bahasa sehari-hari
// ═══════════════════════════════════════════════════════════

function joinIndo(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} dan ${items[items.length - 1]}`;
}

/**
 * Judul hasil dalam kalimat biasa — "Jumlah alumni menurut Jurusan dan Tahun
 * lulus, hanya Jenjang: D3". Pengguna non-IT membaca pertanyaannya kembali,
 * bukan susunan baris/kolom yang ia klik.
 */
export function describeQuestion(
  input: ExplorerQueryInput,
  measureLabel: (key: string) => string,
  dimensionLabel: (key: string) => string,
): string {
  const formulas = input.formulas ?? [];
  if (input.measures.length === 0 && formulas.length === 0) return "";

  const measures = [...input.measures.map(measureLabel), ...formulas.map((f) => f.label)];
  let text = joinIndo([measures[0], ...measures.slice(1).map(lowerFirst)]);

  if (input.percent && input.percent !== "none") text += " (dalam persen)";

  const dims = [...input.rowDims, ...(input.colDim ? [input.colDim] : [])];
  if (dims.length > 0) {
    text += ` menurut ${joinIndo(dims.map(dimensionLabel))}`;
  }

  const active = input.filters.filter(filterIsActive);
  const only = active.filter((f) => (f.operator ?? "equals") === "equals");
  const other = active.filter((f) => (f.operator ?? "equals") !== "equals");

  if (only.length > 0) {
    text +=
      ", hanya " +
      joinIndo(only.map((f) => `${dimensionLabel(f.member)}: ${f.values.join(" / ")}`));
  }

  for (const f of other) {
    // "UMP provinsi tempat kerja per Rp 1 jt" → cukup nama kolomnya.
    const label = dimensionLabel(f.member).replace(/ per .+$/, "");
    text +=
      f.operator === "notEquals"
        ? `, ${label} bukan ${f.values.join(" / ")}`
        : f.operator === "set"
          ? `, hanya yang punya data ${lowerFirst(label)}`
          : `, hanya yang tanpa data ${lowerFirst(label)}`;
  }

  if (input.minN) text += `, kelompok dengan responden < ${input.minN} disembunyikan`;

  if (input.sort) {
    const by = lowerFirst(measureLabel(input.sort.by) === input.sort.by
      ? formulas.find((f) => f.key === input.sort!.by)?.label ?? input.sort.by
      : measureLabel(input.sort.by));
    text += input.sort.limit
      ? `, ${input.sort.limit} ${input.sort.direction === "desc" ? "tertinggi" : "terendah"} menurut ${by}`
      : `, diurutkan dari ${input.sort.direction === "desc" ? "terbesar" : "terkecil"} menurut ${by}`;
  }

  return text;
}

// ═══════════════════════════════════════════════════════════
//  Unduh CSV
// ═══════════════════════════════════════════════════════════

function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Hasil mentah (baris datar) sebagai CSV berjudul label, bukan nama member
 * Cube.js — supaya langsung terbaca saat dibuka di Excel. Angka dibiarkan
 * mentah (tanpa format rupiah/pemisah ribuan) agar tetap bisa dihitung ulang.
 */
export function toCsv(result: ExplorerResult): string {
  const cols = [...result.dimensions, ...result.measures];
  const header = cols.map((c) => csvCell(c.label)).join(",");
  const body = result.rows.map((row) => cols.map((c) => csvCell(row[c.key])).join(","));
  return [header, ...body].join("\n");
}

// ═══════════════════════════════════════════════════════════
//  Contoh pertanyaan
// ═══════════════════════════════════════════════════════════

export interface StarterQuestion {
  title: string;
  input: ExplorerQueryInput;
}

/**
 * Titik mulai untuk pengguna yang belum tahu harus mengklik apa. Setiap contoh
 * hanya ditawarkan kalau SEMUA member-nya ada di katalog — katalog bisa
 * berubah di peladen, dan contoh yang ditolak 422 lebih buruk daripada tidak
 * ada contoh sama sekali.
 */
export const STARTER_QUESTIONS: StarterQuestion[] = [
  {
    title: "Berapa alumni di tiap jurusan?",
    input: {
      cube: "FactTracerStudy",
      measures: ["FactTracerStudy.count_alumni"],
      rowDims: ["DimProdi.jurusan"],
      colDim: null,
      filters: [],
    },
  },
  {
    title: "Status alumni per tahun lulus",
    input: {
      cube: "FactTracerStudy",
      measures: ["FactTracerStudy.count_alumni"],
      rowDims: ["DimAlumni.tahun_lulus"],
      colDim: "DimStatusAlumni.label",
      filters: [],
    },
  },
  {
    title: "Rata-rata gaji tiap program studi",
    input: {
      cube: "FactTracerStudy",
      measures: ["FactTracerStudy.avg_take_home_pay"],
      rowDims: ["DimProdi.prodi_jenjang"],
      colDim: null,
      filters: [],
    },
  },
  {
    title: "Berapa lama alumni menunggu kerja, per tahun lulus?",
    input: {
      cube: "FactTracerStudy",
      measures: ["FactTracerStudy.avg_masa_tunggu_bekerja"],
      rowDims: ["DimAlumni.tahun_lulus"],
      colDim: null,
      filters: [],
    },
  },
  {
    title: "Kesesuaian bidang kerja per jurusan",
    input: {
      cube: "FactTracerStudy",
      measures: ["FactTracerStudy.count_alumni"],
      rowDims: ["DimProdi.jurusan"],
      colDim: "DimKesesuaianBidang.label",
      filters: [],
    },
  },
  {
    title: "Di jenis instansi apa alumni bekerja?",
    input: {
      cube: "FactTracerStudy",
      measures: ["FactTracerStudy.count_alumni"],
      rowDims: ["DimPerusahaan.label_jenis_perusahaan"],
      colDim: null,
      filters: [],
    },
  },
  {
    title: "Gaji vs UMP di tiap provinsi tempat kerja",
    input: {
      cube: "FactTracerStudy",
      measures: ["FactTracerStudy.agg_avg_take_home_pay", "FactTracerStudy.agg_avg_nilai_ump"],
      rowDims: ["DimPerusahaan.nama_provinsi"],
      colDim: null,
      filters: [{ member: "FactTracerStudy.rentang_nilai_ump_1", operator: "set", values: [] }],
      minN: 30,
      sort: { by: "FactTracerStudy.agg_avg_take_home_pay", direction: "desc", limit: null },
    },
  },
  {
    title: "Berapa kali lipat gaji alumni dibanding UMP?",
    input: {
      cube: "FactTracerStudy",
      measures: [],
      rowDims: ["DimPerusahaan.nama_provinsi"],
      colDim: null,
      filters: [{ member: "FactTracerStudy.rentang_nilai_ump_1", operator: "set", values: [] }],
      formulas: [
        {
          key: "rumus_1",
          label: "Kelipatan gaji terhadap UMP",
          left: "FactTracerStudy.agg_avg_take_home_pay",
          op: "div",
          right: "FactTracerStudy.agg_avg_nilai_ump",
          format: "ratio",
        },
      ],
      minN: 30,
      sort: { by: "rumus_1", direction: "desc", limit: null },
    },
  },
  {
    title: "Persentase status alumni di tiap jurusan",
    input: {
      cube: "FactTracerStudy",
      measures: ["FactTracerStudy.count_alumni"],
      rowDims: ["DimProdi.jurusan"],
      colDim: "DimStatusAlumni.label",
      filters: [],
      percent: "row",
    },
  },
  {
    title: "Gap kompetensi: dikuasai saat lulus vs dibutuhkan di kerja",
    input: {
      cube: "FactRangeEvaluasi",
      measures: ["FactRangeEvaluasi.avg_skor"],
      rowDims: ["DimIndikatorEvaluasi.grup_gap"],
      colDim: "DimIndikatorEvaluasi.kategori_label",
      filters: [
        {
          member: "DimIndikatorEvaluasi.kategori_label",
          operator: "equals",
          values: ["Kompetensi dikuasai saat lulus", "Kompetensi dibutuhkan di pekerjaan"],
        },
      ],
      // Dikuasai − dibutuhkan, searah KPI 9 di dashboard Pendidikan: di bawah 0
      // berarti lulusan kurang dari yang dibutuhkan pekerjaan.
      diff: { a: "Kompetensi dibutuhkan di pekerjaan", b: "Kompetensi dikuasai saat lulus" },
    },
  },
  {
    title: "Profil tiap jurusan: jumlah, gaji, dan masa tunggu sekaligus",
    input: {
      cube: "FactTracerStudy",
      measures: [
        "FactTracerStudy.count_alumni",
        "FactTracerStudy.avg_take_home_pay",
        "FactTracerStudy.avg_masa_tunggu_bekerja",
      ],
      rowDims: ["DimProdi.jurusan"],
      colDim: null,
      filters: [],
    },
  },
  {
    title: "Apakah menunggu kerja lebih lama berarti gaji lebih kecil?",
    input: {
      cube: "FactTracerStudy",
      measures: ["FactTracerStudy.agg_avg_take_home_pay", "FactTracerStudy.count_alumni"],
      rowDims: ["FactTracerStudy.rentang_masa_tunggu_bekerja_3"],
      colDim: null,
      filters: [],
    },
  },
];

export function availableStarters(
  catalog: ExplorerCatalog,
  starters: StarterQuestion[] = STARTER_QUESTIONS,
): StarterQuestion[] {
  return starters.filter(({ input }) => {
    const cube = catalog.cubes.find((c) => c.key === input.cube);
    if (!cube) return false;

    const measures = new Set([
      ...cube.measures.map((m) => m.key),
      ...(cube.numeric_columns ?? []).flatMap((c) => c.functions.map((f) => f.key)),
    ]);
    const dims = new Set(cube.dimension_groups.flatMap((g) => g.members.map((m) => m.key)));
    const formulas = input.formulas ?? [];

    return (
      input.measures.every((m) => measures.has(m)) &&
      formulas.every((f) => measures.has(f.left) && measures.has(f.right)) &&
      (!input.minN || !!cube.count_measure) &&
      [...input.rowDims, ...(input.colDim ? [input.colDim] : []), ...input.filters.map((f) => f.member)]
        .every((d) => dims.has(d))
    );
  });
}

/**
 * Dua susunan pertanyaan sama isinya? Tidak memakai JSON.stringify objek
 * langsung: PostgreSQL jsonb menyusun ulang urutan kunci saat menyimpan,
 * sehingga pertanyaan yang baru dibuka akan selalu tampak "diubah".
 */
export function sameQuestion(a: ExplorerQueryInput, b: ExplorerQueryInput): boolean {
  const canon = (q: ExplorerQueryInput) =>
    JSON.stringify([
      q.cube,
      q.measures,
      q.rowDims,
      q.colDim ?? null,
      q.filters.map((f) => [f.member, f.operator ?? "equals", f.values]),
      (q.formulas ?? []).map((f) => [f.key, f.label, f.left, f.op, f.right, f.format]),
      q.minN ?? null,
      q.sort ? [q.sort.by, q.sort.direction, q.sort.limit ?? null] : null,
      q.percent ?? "none",
      q.diff ? [q.diff.a, q.diff.b] : null,
      q.viz ?? "auto",
    ]);

  return canon(a) === canon(b);
}

// ═══════════════════════════════════════════════════════════
//  Titik & drill-through: dari satu angka ke daftar alumninya
// ═══════════════════════════════════════════════════════════

/** Nilai tiap dimensi pada titik yang diklik: { "DimProdi.jurusan": "Akuntansi", ... }. */
export type DrillPoint = Record<string, string>;

/** Label pengganti nilai kosong di pivot (lihat buildPivot). */
export const EMPTY_VALUE = "(kosong)";

/**
 * Titik yang diklik, dari posisi di pivot. Mengembalikan null kalau salah satu
 * nilainya kosong: kelompok "(kosong)" berasal dari NULL di gudang data, dan
 * penyaring `equals` tidak bisa mencocokkan NULL — daftarnya akan selalu
 * kosong, jadi lebih jujur tidak menawarkan klik sama sekali.
 */
export function drillPointOf(
  rowDims: string[],
  rowKeys: string[],
  colDim: string | null,
  colKey: string,
): DrillPoint | null {
  const point: DrillPoint = {};

  rowDims.forEach((dim, i) => {
    point[dim] = rowKeys[i];
  });

  if (colDim && colKey !== SINGLE_COLUMN) point[colDim] = colKey;

  return Object.values(point).some((v) => v === undefined || v === EMPTY_VALUE) ? null : point;
}

/** Level di atas `dim` pada hierarkinya; null bila level teratas / tanpa hierarki. */
export function parentOf(cube: CatalogCube, dim: string): string | null {
  for (const h of cube.hierarchies ?? []) {
    const i = h.levels.indexOf(dim);
    if (i > 0) return h.levels[i - 1];
  }
  return null;
}

/** Level di bawah `dim` pada hierarkinya; null bila level terbawah / tanpa hierarki. */
export function childOf(cube: CatalogCube, dim: string): string | null {
  for (const h of cube.hierarchies ?? []) {
    const i = h.levels.indexOf(dim);
    if (i >= 0 && i < h.levels.length - 1) return h.levels[i + 1];
  }
  return null;
}

function usedDims(input: ExplorerQueryInput): string[] {
  return [...input.rowDims, ...(input.colDim ? [input.colDim] : [])];
}

function sliceOriginOf(input: ExplorerQueryInput, dim: string): SliceOrigin | null {
  if (input.colDim === dim) return { slot: "col" };
  const index = input.rowDims.indexOf(dim);
  return index >= 0 ? { slot: "row", index } : null;
}

function withoutDim(input: ExplorerQueryInput, dim: string): ExplorerQueryInput {
  return {
    ...input,
    rowDims: input.rowDims.filter((d) => d !== dim),
    colDim: input.colDim === dim ? null : input.colDim,
  };
}

/**
 * Slice: kunci SATU dimensi ke satu nilai, lalu dimensi itu keluar dari
 * tampilan — sisa kubusnya berdimensi satu lebih sedikit (TIME = day 1).
 * Mengunci beberapa dimensi sekaligus adalah dice (diceInput).
 */
export function sliceInput(input: ExplorerQueryInput, dim: string, value: string): ExplorerQueryInput {
  const slicedFrom = sliceOriginOf(input, dim) ?? undefined;
  return {
    ...withoutDim(input, dim),
    filters: [
      ...input.filters.filter((f) => f.member !== dim),
      { member: dim, operator: "equals", values: [value], slicedFrom },
    ],
  };
}

/** Saringan "adalah" tepat satu nilai = slice pada dimensi itu. */
function isSlice(f: ExplorerFilter): boolean {
  return (f.operator ?? "equals") === "equals" && f.values.length === 1;
}

/**
 * Ubah (next) atau hapus (next = null) saringan pada `member` dari panel
 * Batasi, dengan aturan slice yang sama seperti klik "Slice: hanya …":
 *  - saringan jadi tepat satu nilai pada dimensi yang sedang tampil →
 *    dimensi itu keluar dari tampilan dan posisinya dicatat;
 *  - slice itu dibatalkan (jadi beberapa nilai, dikosongkan, atau dihapus) →
 *    dimensi kembali ke posisinya, bila masih muat di batas dimensi.
 * Saringan hasil drill-down tidak disentuh: induknya memang tetap tampil.
 */
export function applyFilterChange(
  input: ExplorerQueryInput,
  member: string,
  next: ExplorerFilter | null,
  maxDimensions: number,
): ExplorerQueryInput {
  const prev = input.filters.find((f) => f.member === member);
  const replace = (f: ExplorerFilter | null) => ({
    ...input,
    filters: f ? input.filters.map((x) => (x.member === member ? f : x)) : input.filters.filter((x) => x.member !== member),
  });

  if (next && next.origin !== "drill" && isSlice(next)) {
    const origin = sliceOriginOf(input, member);
    if (origin) return withoutDim(replace({ ...next, slicedFrom: origin }), member);
    return replace(next);
  }

  const origin = prev?.slicedFrom;
  if (!origin) return replace(next);

  const out = replace(next ? { ...next, slicedFrom: undefined } : null);
  if (usedDims(out).includes(member) || usedDims(out).length >= maxDimensions) return out;
  if (origin.slot === "col") return out.colDim === null ? { ...out, colDim: member } : out;

  const rowDims = [...out.rowDims];
  rowDims.splice(Math.min(origin.index, rowDims.length), 0, member);
  return { ...out, rowDims };
}

/**
 * Dice: sub-kubus dari beberapa titik. Tiap dimensi yang muncul disaring ke
 * himpunan nilai dari semua titik (A ∈ {…}, B ∈ {…}); saringan lama pada
 * dimensi yang sama digantikan.
 */
export function diceInput(input: ExplorerQueryInput, points: DrillPoint[]): ExplorerQueryInput {
  const values = new Map<string, string[]>();
  for (const point of points) {
    for (const [dim, value] of Object.entries(point)) {
      const list = values.get(dim) ?? [];
      if (!list.includes(value)) list.push(value);
      values.set(dim, list);
    }
  }

  return {
    ...input,
    filters: [
      ...input.filters.filter((f) => !values.has(f.member)),
      ...[...values.entries()].map(([member, vals]) => ({
        member,
        operator: "equals" as const,
        values: vals,
      })),
    ],
  };
}

/**
 * Nama operasi untuk menyaring ke titik-titik terpilih. Patokannya jumlah
 * DIMENSI yang dikunci, bukan jumlah nilai: satu dimensi (berapa pun
 * nilainya) = slice, dua dimensi atau lebih = dice (Silberschatz 11.68).
 */
export function selectionOperation(points: DrillPoint[]): "Slice" | "Dice" {
  return new Set(points.flatMap((p) => Object.keys(p))).size >= 2 ? "Dice" : "Slice";
}

/** Satu langkah drill-down yang bisa ditawarkan: dari level `from` ke anaknya `to`. */
export interface DrillTarget {
  from: string;
  to: string;
}

/** Langkah drill-down untuk titik yang diklik: tiap dimensinya yang punya level anak belum tampil. */
export function drillTargets(cube: CatalogCube, input: ExplorerQueryInput, point: DrillPoint): DrillTarget[] {
  const used = usedDims(input);
  return Object.keys(point).flatMap((from) => {
    const to = childOf(cube, from);
    return to && used.includes(from) && !used.includes(to) ? [{ from, to }] : [];
  });
}

/**
 * Drill-down: kunci `from` ke nilai titik (saringan berpenanda drill), lalu
 * tampilkan level anaknya tepat setelah `from` — induk tetap tampil supaya
 * nama anak yang kembar antar-induk (kota, pertanyaan) tidak ambigu. Bila
 * batas dimensi penuh, atau `from` adalah dimensi kolom, `from` diganti
 * anaknya; konteksnya tetap terbaca dari saringan.
 */
export function drillDownInput(
  input: ExplorerQueryInput,
  point: DrillPoint,
  { from, to }: DrillTarget,
  maxDimensions: number,
): ExplorerQueryInput {
  const filters: ExplorerFilter[] = [
    ...input.filters.filter((f) => f.member !== from),
    { member: from, operator: "equals", values: [point[from]], origin: "drill" },
  ];

  if (input.colDim === from) return { ...input, colDim: to, filters };

  const i = input.rowDims.indexOf(from);
  const rowDims =
    usedDims(input).length < maxDimensions
      ? [...input.rowDims.slice(0, i + 1), to, ...input.rowDims.slice(i + 1)]
      : input.rowDims.map((d) => (d === from ? to : d));

  return { ...input, rowDims, filters };
}

/**
 * Langkah roll-up berikutnya, diturunkan dari susunan saat ini (tanpa riwayat):
 *  - collapse: anak tampil tepat setelah induknya → lepas anak;
 *  - climb:    anak tampil tanpa induknya → ganti dengan induknya;
 *  - remove:   level teratas / tanpa hierarki → lepas dimensi (agregasi
 *              sampai total, sale(*,*,*)).
 * Dimensi yang induknya disaring drill-down didahulukan, supaya roll-up
 * membalik drill-down terakhir — juga bila drill-down itu di kolom.
 */
export type RollUpStep =
  | { kind: "collapse" | "climb"; dim: string; parent: string }
  | { kind: "remove"; dim: string };

export function rollUpStep(input: ExplorerQueryInput, cube: CatalogCube): RollUpStep | null {
  const dims = [...[...input.rowDims].reverse(), ...(input.colDim ? [input.colDim] : [])];
  if (dims.length === 0) return null;

  const drilled = (d: string) => {
    const parent = parentOf(cube, d);
    return parent !== null && input.filters.some((f) => f.member === parent && f.origin === "drill");
  };
  const dim = dims.find(drilled) ?? dims[0];
  const parent = parentOf(cube, dim);

  if (parent === null) return { kind: "remove", dim };

  const i = input.rowDims.indexOf(dim);
  if (i > 0 && input.rowDims[i - 1] === parent) return { kind: "collapse", dim, parent };
  if (!usedDims(input).includes(parent)) return { kind: "climb", dim, parent };
  return { kind: "remove", dim };
}

/**
 * Roll-up: kebalikan drill-down (lihat rollUpStep). Hanya saringan
 * berpenanda drill pada induk yang ikut dilepas — saringan pengguna tidak
 * pernah disentuh. Null bila sudah di total.
 */
export function rollUpInput(input: ExplorerQueryInput, cube: CatalogCube): ExplorerQueryInput | null {
  const step = rollUpStep(input, cube);
  if (!step) return null;

  if (step.kind === "remove") {
    return {
      ...input,
      rowDims: input.rowDims.filter((d) => d !== step.dim),
      colDim: input.colDim === step.dim ? null : input.colDim,
    };
  }

  const filters = input.filters.filter((f) => !(f.member === step.parent && f.origin === "drill"));

  if (step.kind === "collapse") {
    return { ...input, rowDims: input.rowDims.filter((d) => d !== step.dim), filters };
  }

  return {
    ...input,
    rowDims: input.rowDims.map((d) => (d === step.dim ? step.parent : d)),
    colDim: input.colDim === step.dim ? step.parent : input.colDim,
    filters,
  };
}

/** "Roll-up ke Jurusan", "Roll-up ke total", atau "Roll-up: lepas Status alumni". */
export function rollUpLabel(
  input: ExplorerQueryInput,
  cube: CatalogCube,
  dimensionLabel: (key: string) => string,
): string | null {
  const step = rollUpStep(input, cube);
  if (!step) return null;
  if (step.kind !== "remove") return `Roll-up ke ${dimensionLabel(step.parent)}`;
  return usedDims(input).length === 1 ? "Roll-up ke total" : `Roll-up: lepas ${dimensionLabel(step.dim)}`;
}

/**
 * Saringan untuk drill-through: saringan pengguna + nilai titik yang diklik.
 * Nilai titik menggantikan saringan pengguna pada dimensi yang sama — titik
 * selalu lebih sempit (satu nilai) daripada pilihan saringannya.
 */
export function drillFilters(filters: ExplorerFilter[], point: DrillPoint): ExplorerFilter[] {
  return [
    ...filters
      .filter((f) => filterIsActive(f) && !(f.member in point))
      .map((f) => ({ member: f.member, operator: f.operator ?? "equals", values: f.values })),
    ...Object.entries(point).map(([member, value]) => ({
      member,
      operator: "equals" as const,
      values: [value],
    })),
  ];
}

/** "Jurusan Akuntansi · Tahun lulus 2022" — atau "Seluruh data" tanpa dimensi. */
export function describeDrillPoint(point: DrillPoint, dimensionLabel: (key: string) => string): string {
  const parts = Object.entries(point).map(([dim, value]) => `${dimensionLabel(dim)} ${value}`);
  return parts.length > 0 ? parts.join(" · ") : "Seluruh data";
}

// ═══════════════════════════════════════════════════════════
//  Olah hasil (tampilan): persen & selisih kolom
// ═══════════════════════════════════════════════════════════

/**
 * Ubah cacah jadi persen dari total baris, kolom, atau keseluruhan.
 *
 * Hanya ukuran cacah (integer) yang diubah: persen dari rata-rata tidak
 * berarti apa-apa. Pembaginya total yang sudah dihitung buildPivot, jadi
 * hasilnya sama dengan `COUNT / SUM(COUNT) OVER (…)` di SQL. Totalnya
 * dikosongkan — jumlah persen per baris selalu 100 dan tidak memberi
 * informasi baru.
 */
export function applyPercent(
  pivot: Pivot,
  mode: PercentMode | undefined,
  measures: CatalogMeasure[],
): { pivot: Pivot; measures: CatalogMeasure[] } {
  const target = new Set(measures.filter((m) => m.format === "integer").map((m) => m.key));
  if (!mode || mode === "none" || target.size === 0) return { pivot, measures };

  const pct = (v: number | null, total: number | null | undefined) =>
    v === null || !total ? null : (v / total) * 100;

  const rows = pivot.rows.map((row) => {
    const cells: PivotRow["cells"] = {};

    for (const col of pivot.columnKeys) {
      cells[col] = { ...(row.cells[col] ?? {}) };
      for (const key of target) {
        const v = row.cells[col]?.[key]?.value ?? null;
        const total =
          mode === "row" ? row.totals[key] : mode === "column" ? pivot.columnTotals[col]?.[key] : pivot.grandTotals[key];
        cells[col][key] = { value: pct(v, total) };
      }
    }

    const totals = { ...row.totals };
    for (const key of target) totals[key] = null;

    return { ...row, cells, totals };
  });

  const columnTotals: Pivot["columnTotals"] = {};
  for (const col of pivot.columnKeys) {
    columnTotals[col] = { ...(pivot.columnTotals[col] ?? {}) };
    for (const key of target) columnTotals[col][key] = null;
  }

  const grandTotals = { ...pivot.grandTotals };
  for (const key of target) grandTotals[key] = null;

  return {
    pivot: { ...pivot, rows, columnTotals, grandTotals },
    measures: measures.map((m) => (target.has(m.key) ? { ...m, format: "percent" as const } : m)),
  };
}

/**
 * Tambah kolom "B − A" di ujung pivot — misalnya kompetensi yang dibutuhkan
 * di pekerjaan dikurangi yang dikuasai saat lulus (gap kompetensi). Kolom
 * ini hasil hitungan, bukan kelompok data: ditandai derivedColumns supaya
 * tidak bisa diklik. Tanpa kedua kolom, pivot dikembalikan
 * apa adanya.
 */
export function addColumnDifference(
  pivot: Pivot,
  diff: ColumnDiff | null | undefined,
  measures: CatalogMeasure[],
): Pivot {
  if (!diff || !pivot.columnKeys.includes(diff.a) || !pivot.columnKeys.includes(diff.b)) return pivot;

  const key = columnDifferenceKey(diff);
  const rows = pivot.rows.map((row) => {
    const cell: Record<string, PivotCell> = {};
    for (const m of measures) {
      const a = row.cells[diff.a]?.[m.key]?.value ?? null;
      const b = row.cells[diff.b]?.[m.key]?.value ?? null;
      cell[m.key] = { value: a === null || b === null ? null : b - a };
    }
    return { ...row, cells: { ...row.cells, [key]: cell } };
  });

  const blank = Object.fromEntries(measures.map((m) => [m.key, null]));

  return {
    ...pivot,
    columnKeys: [...pivot.columnKeys, key],
    derivedColumns: [...(pivot.derivedColumns ?? []), key],
    rows,
    columnTotals: { ...pivot.columnTotals, [key]: blank },
  };
}

export function columnDifferenceKey(diff: ColumnDiff): string {
  return `Selisih: ${diff.b} − ${diff.a}`;
}

/** buildPivot + persen + selisih kolom — urutan yang sama untuk tabel, chart, dan panel. */
export function presentPivot(
  pivot: Pivot,
  input: Pick<ExplorerQueryInput, "percent" | "diff">,
  measures: CatalogMeasure[],
): { pivot: Pivot; measures: CatalogMeasure[] } {
  const pct = applyPercent(pivot, input.percent, measures);
  return { pivot: addColumnDifference(pct.pivot, input.diff, pct.measures), measures: pct.measures };
}

/**
 * Pivot untuk chart: bila ada kolom hasil hitungan (selisih), chart hanya
 * menggambar kolom itu. Selisih ±0,03 yang ditumpuk di samping skor 3,0 pada
 * satu sumbu tidak terlihat sama sekali, padahal selisih itulah yang ingin
 * dibaca pengguna saat menyalakannya. Kolom asalnya tetap lengkap di tabel.
 */
export function chartPivotOf(pivot: Pivot): Pivot {
  const derived = pivot.derivedColumns ?? [];
  if (derived.length === 0) return pivot;

  return {
    ...pivot,
    columnKeys: pivot.columnKeys.filter((c) => derived.includes(c)),
  };
}
