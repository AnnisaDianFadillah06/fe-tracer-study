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

export type MeasureFormat = "integer" | "decimal" | "currency";

export interface CatalogMeasure {
  key: string;
  label: string;
  format: MeasureFormat;
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
  dimension_groups: CatalogDimensionGroup[];
}

export interface ExplorerCatalog {
  cubes: CatalogCube[];
  limits: {
    max_dimensions: number;
    max_measures: number;
    max_rows: number;
  };
}

export interface ExplorerFilter {
  member: string;
  values: string[];
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

export type ChartKind = "number" | "bar" | "line" | "grouped-bar" | "none";

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

export function chartSeriesNames(pivot: Pivot): string[] {
  return pivot.columnKeys.map((c) => (c === SINGLE_COLUMN ? "nilai" : c));
}

// ═══════════════════════════════════════════════════════════
//  Format angka
// ═══════════════════════════════════════════════════════════

export function formatMeasure(value: number | null, format: MeasureFormat): string {
  if (value === null || Number.isNaN(value)) return "—";

  switch (format) {
    case "integer":
      return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
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
}

/**
 * Dimensi baris dan kolom digabung jadi satu daftar untuk backend — Cube.js
 * tidak mengenal konsep baris/kolom, itu murni urusan penyajian. Urutannya
 * dipertahankan supaya pivot di sisi ini bisa membacanya kembali.
 */
export function toRequestBody(input: ExplorerQueryInput) {
  return {
    cube: input.cube,
    measures: input.measures,
    dimensions: [...input.rowDims, ...(input.colDim ? [input.colDim] : [])],
    filters: input.filters.filter((f) => f.values.length > 0),
  };
}

/** Permintaan siap dijalankan? Minimal satu measure; dimensi boleh kosong. */
export function isRunnable(input: ExplorerQueryInput): boolean {
  return input.cube !== "" && input.measures.length > 0;
}
