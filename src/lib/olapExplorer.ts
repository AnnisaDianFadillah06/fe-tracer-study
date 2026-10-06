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

export interface CatalogCube {
  key: string;
  label: string;
  description: string;
  measures: CatalogMeasure[];
  numeric_columns?: NumericColumn[];
  /** Cacah dasar sumber data ini; dasar "sembunyikan kelompok < n". */
  count_measure?: string | null;
  dimension_groups: CatalogDimensionGroup[];
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
}

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
  | "none";

/**
 * Pilihan visualisasi pengguna. "auto"
 * menyerahkan bentuknya ke `chooseChartKind`; yang lain memaksa bentuk itu
 * selama datanya memungkinkan (lihat `availableViz`).
 */
export type Viz = "auto" | "combo" | "table" | "bar" | "row" | "line" | "area" | "stacked" | "pie";

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
};

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
 */
export function decideChart(
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
 */
export function availableViz(
  decision: ChartDecision,
  series: number,
  categories: number,
  measures = 1,
): Viz[] {
  if (decision.kind === "number") return [];
  if (decision.kind === "none" && decision.reason) return ["auto", "table"];

  const out: Viz[] = ["auto"];
  if (canCombo(decision, series, measures)) out.push("combo");
  out.push("bar", "row", "line", "area");
  if (series > 1) out.push("stacked");
  if (series <= 1 && categories <= MAX_PIE_SLICES) out.push("pie");
  out.push("table");

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
): ChartDecision {
  // "Semua ukuran" hanya lewat pilihan manual; otomatis tetap seperti semula
  // supaya tampilan hasil lama tidak berubah.
  if (!viz || viz === "auto") return decision;
  if (!availableViz(decision, series, categories, measures).includes(viz)) return decision;

  if (viz === "combo") return { kind: "combo", faceted: false };

  if (viz === "table") return { kind: "none", faceted: false };

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
      rowDims: ["DimProdi.nama_prodi"],
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
      measures: ["FactRangeEvaluasi.agg_avg_skor"],
      rowDims: ["DimIndikatorEvaluasi.grup_gap"],
      colDim: "DimIndikatorEvaluasi.kategori_label",
      filters: [
        {
          member: "DimIndikatorEvaluasi.kategori_label",
          operator: "equals",
          values: ["Kompetensi dikuasai saat lulus", "Kompetensi dibutuhkan di pekerjaan"],
        },
      ],
      diff: { a: "Kompetensi dikuasai saat lulus", b: "Kompetensi dibutuhkan di pekerjaan" },
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
//  Drill-down: dari satu angka ke daftar alumninya
// ═══════════════════════════════════════════════════════════

/** Nilai tiap dimensi pada titik yang diklik: { "DimProdi.jurusan": "Akuntansi", ... }. */
export type DrillPoint = Record<string, string>;

/** Label pengganti nilai kosong di pivot (lihat buildPivot). */
export const EMPTY_VALUE = "(kosong)";

/**
 * Titik drill-down dari posisi di pivot. Mengembalikan null kalau salah satu
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

/**
 * Slice: saring ke SATU titik (satu nilai per dimensi pada titik itu).
 */
export function sliceInput(input: ExplorerQueryInput, point: DrillPoint): ExplorerQueryInput {
  return { ...input, filters: drillFilters(input.filters, point) };
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
 * Roll-up: kebalikan drill-down, turunan dari susunan saat ini (tanpa riwayat).
 * Dengan ≥2 dimensi baris, dimensi terakhir dilepas beserta saringan pada
 * dimensi di atasnya (titik yang tadi dirinci). Selain itu, saringan aktif
 * terakhir dilepas. Null bila tak ada yang bisa dilepas.
 */
export function rollUpInput(input: ExplorerQueryInput): ExplorerQueryInput | null {
  if (input.rowDims.length >= 2) {
    const rowDims = input.rowDims.slice(0, -1);
    const parent = rowDims[rowDims.length - 1];
    return { ...input, rowDims, filters: input.filters.filter((f) => f.member !== parent) };
  }

  const active = input.filters.filter(filterIsActive);
  if (active.length === 0) return null;

  const last = active[active.length - 1];
  return { ...input, filters: input.filters.filter((f) => f !== last) };
}

/**
 * Saringan untuk drill-down: saringan pengguna + nilai titik yang diklik.
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
 * tidak ditawarkan untuk drill-down. Tanpa kedua kolom, pivot dikembalikan
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
