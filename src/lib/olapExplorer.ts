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
  /** Penjelasan singkat untuk pengguna non-IT; boleh kosong. */
  description?: string;
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
  if (input.measures.length === 0) return "";

  const measures = input.measures.map(measureLabel);
  let text = joinIndo([measures[0], ...measures.slice(1).map((m) => m.toLowerCase())]);

  const dims = [...input.rowDims, ...(input.colDim ? [input.colDim] : [])];
  if (dims.length > 0) {
    text += ` menurut ${joinIndo(dims.map(dimensionLabel))}`;
  }

  const filters = input.filters.filter((f) => f.values.length > 0);
  if (filters.length > 0) {
    text +=
      ", hanya " +
      joinIndo(filters.map((f) => `${dimensionLabel(f.member)}: ${f.values.join(" / ")}`));
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
];

export function availableStarters(
  catalog: ExplorerCatalog,
  starters: StarterQuestion[] = STARTER_QUESTIONS,
): StarterQuestion[] {
  return starters.filter(({ input }) => {
    const cube = catalog.cubes.find((c) => c.key === input.cube);
    if (!cube) return false;

    const measures = new Set(cube.measures.map((m) => m.key));
    const dims = new Set(cube.dimension_groups.flatMap((g) => g.members.map((m) => m.key)));

    return (
      input.measures.every((m) => measures.has(m)) &&
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
      q.filters.map((f) => [f.member, f.values]),
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
 * Saringan untuk drill-down: saringan pengguna + nilai titik yang diklik.
 * Nilai titik menggantikan saringan pengguna pada dimensi yang sama — titik
 * selalu lebih sempit (satu nilai) daripada pilihan saringannya.
 */
export function drillFilters(filters: ExplorerFilter[], point: DrillPoint): ExplorerFilter[] {
  return [
    ...filters.filter((f) => f.values.length > 0 && !(f.member in point)),
    ...Object.entries(point).map(([member, value]) => ({ member, values: [value] })),
  ];
}

/** "Jurusan Akuntansi · Tahun lulus 2022" — atau "Seluruh data" tanpa dimensi. */
export function describeDrillPoint(point: DrillPoint, dimensionLabel: (key: string) => string): string {
  const parts = Object.entries(point).map(([dim, value]) => `${dimensionLabel(dim)} ${value}`);
  return parts.length > 0 ? parts.join(" · ") : "Seluruh data";
}
