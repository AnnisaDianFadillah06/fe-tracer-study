import { EMPTY_VALUE, SINGLE_COLUMN, drillPointOf, type DrillPoint, type Pivot } from "@/lib/olapExplorer";

// ═══════════════════════════════════════════════════════════
//  Grafik batang 3D
//
//  Grafik 2D hanya punya tiga saluran -- sumbu X, sumbu Y, dan warna -- dan
//  sumbu Y sudah dipakai ukuran. Grafik 3D menambah satu sumbu kedalaman,
//  jadi dua dimensi + ukuran muat dalam satu grafik:
//
//    X (mendatar)  = dimensi pertama
//    kedalaman     = dimensi kedua
//    tinggi        = ukuran (juga diwarnai, lihat Explorer3DChart)
//
//  Dimensi ketiga TIDAK dijadikan warna atau tumpukan: satu titik (x, z)
//  bisa punya beberapa nilai dimensi ketiga, dan menumpuk rata-rata gaji
//  menghasilkan tinggi yang tidak berarti. Dimensi ketiga jadi "bingkai":
//  satu grafik 3D per nilainya, diputar bergantian seperti timeline.
// ═══════════════════════════════════════════════════════════

/** Lebih dari ini label sumbu X saling menimpa walau sudah dimiringkan. */
export const MAX_3D_X = 60;

/** Lebih dari ini baris belakang tidak lagi terbaca dari sudut mana pun. */
export const MAX_3D_DEPTH = 30;

/** Lebih dari ini pemutar bingkai lebih lambat dari membaca tabel. */
export const MAX_3D_FRAMES = 12;

export interface Bar3D {
  /** Indeks kategori di sumbu X dan sumbu kedalaman bingkainya. */
  x: number;
  z: number;
  value: number;
  /** Titik drill (semua dimensi), null bila ada nilai kosong -- tidak bisa diklik. */
  point: DrillPoint | null;
}

export interface Frame3D {
  /** Nilai dimensi bingkai; "" bila tidak ada dimensi ketiga. */
  key: string;
  xCategories: string[];
  zCategories: string[];
  bars: Bar3D[];
}

export interface Plan3D {
  xDim: string;
  zDim: string;
  frameDim: string | null;
  frames: Frame3D[];
  /**
   * Rentang nilai SEMUA bingkai. Sumbu tinggi dan skala warna dikunci ke
   * rentang ini, supaya batang D3 dan D4 bisa dibandingkan saat bingkainya
   * berganti -- skala per bingkai membuat batang 3 jt dan 6 jt sama tinggi.
   */
  min: number;
  max: number;
}

export type Plan3DResult = { ok: true; plan: Plan3D } | { ok: false; reason: string };

const urut = (a: string, b: string) => a.localeCompare(b, "id", { numeric: true });

/**
 * Urutan sumbu kedalaman: indeks 0 paling DEPAN. Kategori teks diurutkan dari
 * jumlah nilai terkecil ke terbesar, supaya batang tinggi berdiri di belakang
 * dan tidak menutupi yang pendek. Kategori angka (tahun lulus) tetap urut
 * naik -- di sana urutan waktu lebih penting daripada menghindari tertutup.
 */
function urutKedalaman(items: { key: string; value: number }[]): string[] {
  const keys = [...new Set(items.map((i) => i.key))];
  if (keys.every((k) => /^\d+(?:[.,]\d+)?$/.test(k))) return keys.sort(urut);

  const total = new Map<string, number>();
  for (const i of items) total.set(i.key, (total.get(i.key) ?? 0) + Math.abs(i.value));
  return keys.sort((a, b) => total.get(a)! - total.get(b)! || urut(a, b));
}

/**
 * Rencana grafik 3D dari pivot yang sudah diolah (persen/selisih sudah
 * diterapkan, kolom selisih sudah dibuang), sehingga angka 3D selalu sama
 * dengan tabel.
 *
 * Urutan sumbu mengikuti slot: Dimensi-1 di X, Dimensi-2 di kedalaman. Bila
 * ada tiga dimensi, yang nilainya paling sedikit jadi bingkai -- aturan yang
 * sama dengan pemilihan dimensi panel di grafik 2D.
 */
export function build3DPlan(
  pivot: Pivot,
  rowDims: string[],
  colDim: string | null,
  measureKey: string,
): Plan3DResult {
  const dims = [...rowDims, ...(colDim ? [colDim] : [])];

  if (dims.length < 2) {
    return { ok: false, reason: "Grafik 3D butuh minimal dua dimensi: satu di sumbu X, satu di kedalaman." };
  }
  if (dims.length > 3) {
    return { ok: false, reason: "Grafik 3D memuat paling banyak tiga dimensi (X, kedalaman, dan pemutar)." };
  }

  // Satu sel pivot = satu kombinasi semua dimensi.
  const cells: { values: Record<string, string>; value: number; point: DrillPoint | null }[] = [];
  const columns = colDim ? pivot.columnKeys.filter((c) => !(pivot.derivedColumns ?? []).includes(c)) : [SINGLE_COLUMN];

  for (const row of pivot.rows) {
    for (const col of columns) {
      const value = row.cells[col]?.[measureKey]?.value ?? null;
      if (value === null) continue;

      const values: Record<string, string> = {};
      rowDims.forEach((d, i) => (values[d] = row.keys[i] ?? EMPTY_VALUE));
      if (colDim) values[colDim] = col;

      cells.push({ values, value, point: drillPointOf(rowDims, row.keys, colDim, col) });
    }
  }

  if (cells.length === 0) return { ok: false, reason: "Tidak ada angka untuk digambar." };

  const distinct = (dim: string) => new Set(cells.map((c) => c.values[dim])).size;

  let frameDim: string | null = null;
  if (dims.length === 3) {
    // Paling sedikit nilainya; seri → yang paling belakang slotnya.
    frameDim = [...dims].reverse().reduce((best, d) => (distinct(d) < distinct(best) ? d : best));
  }
  const [xDim, zDim] = dims.filter((d) => d !== frameDim);

  const frameKeys = frameDim ? [...new Set(cells.map((c) => c.values[frameDim!]))].sort(urut) : [""];
  if (frameKeys.length > MAX_3D_FRAMES) {
    return {
      ok: false,
      reason: `Dimensi pemutar punya ${frameKeys.length} nilai (maks. ${MAX_3D_FRAMES}). Batasi dulu salah satu dimensinya.`,
    };
  }

  const frames: Frame3D[] = [];
  for (const key of frameKeys) {
    const inFrame = frameDim ? cells.filter((c) => c.values[frameDim!] === key) : cells;
    const xCategories = [...new Set(inFrame.map((c) => c.values[xDim]))].sort(urut);
    const zCategories = urutKedalaman(inFrame.map((c) => ({ key: c.values[zDim], value: c.value })));

    if (xCategories.length > MAX_3D_X || zCategories.length > MAX_3D_DEPTH) {
      return {
        ok: false,
        reason:
          `Terlalu banyak kategori untuk grafik 3D (${xCategories.length} × ${zCategories.length}; ` +
          `maks. ${MAX_3D_X} × ${MAX_3D_DEPTH}). Drill-down dari level di atasnya atau batasi datanya dulu.`,
      };
    }

    frames.push({
      key,
      xCategories,
      zCategories,
      bars: inFrame.map((c) => ({
        x: xCategories.indexOf(c.values[xDim]),
        z: zCategories.indexOf(c.values[zDim]),
        value: c.value,
        point: c.point,
      })),
    });
  }

  const values = cells.map((c) => c.value);
  return {
    ok: true,
    plan: { xDim, zDim, frameDim, frames, min: Math.min(...values), max: Math.max(...values) },
  };
}

/**
 * Sorotan saat kursor di atas batang: batang itu, satu baris X-nya, dan satu
 * baris kedalamannya tetap pekat; sisanya transparan. Batang yang tertutup
 * batang depan jadi terlihat tanpa memutar kamera.
 */
export function highlightOpacity(bar: Pick<Bar3D, "x" | "z">, hovered: { x: number; z: number } | null): number {
  if (hovered === null) return 1;
  return bar.x === hovered.x || bar.z === hovered.z ? 1 : 0.12;
}
