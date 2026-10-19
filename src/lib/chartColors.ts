/**
 * chartColors.ts
 *
 * Single source of truth untuk warna segment chart dinamis.
 *
 * Strategi:
 * 1. Label yang sudah dikenal → pakai warna tetap (KNOWN_SEGMENT_COLORS)
 *    Sumber: CHART_CONFIGS lama di ComparePage + label dari BE keterserapan
 * 2. Label baru / tidak dikenal → fallback ke FALLBACK_PALETTE secara berurutan
 */

const KNOWN_SEGMENT_COLORS: Record<string, string> = {
  // ── Keterserapan / Status alumni (label pendek — mock data) ──────────────
  "Bekerja":             "#10b981", // green  (sesuai CHART_CONFIGS status)
  "Mencari Kerja":       "#f59e0b", // amber
  "Studi Lanjut":        "#0ea5e9", // sky
  "Melanjutkan Studi":   "#0ea5e9", // sky    (alias)
  "Berwirausaha":        "#10b981", // green  (alias display KPI4)
  "Wiraswasta":          "#10b981", // green  (OLAP label → tampil sebagai Berwirausaha)
  "Wirausaha":           "#10b981", // green  (alias lama)
  "Studi & Bekerja":     "#3b82f6", // blue
  "Belum Bekerja":       "#6b7280", // slate
  "Tidak Mencari Kerja": "#f97316", // orange

  // ── OLAP long-form labels (dim_status_alumni) ─────────────────────────────
  "Bekerja (full time / part time)":         "#3b82f6", // blue  (design: Bekerja)
  "Melanjutkan Pendidikan":                   "#8b5cf6", // purple (design: Melanjutkan Studi)
  "Tidak kerja tetapi sedang mencari kerja":  "#f59e0b", // amber  (design: Mencari Kerja)
  "Belum memungkinkan bekerja":               "#9ca3af", // gray   (design: Belum Bekerja)

  // aggregate label dari endpoint bar
  "terserap": "#3b82f6",
  "tidak":    "#f59e0b",

  // ── Masa tunggu ───────────────────────────────────────────────────────────
  "< 3 bulan":  "#10b981", // green
  "3-6 bulan":  "#f59e0b", // amber
  "> 6 bulan":  "#ef4444", // red

  // ── Kesesuaian bidang ─────────────────────────────────────────────────────
  "Sangat Erat":       "#10b981", // green  (sesuai CHART_CONFIGS kesesuaian)
  "Erat":              "#22c55e", // lime-green
  "Cukup Erat":        "#f59e0b", // amber
  "Kurang Erat":       "#f97316", // orange
  "Tidak Sama Sekali": "#ef4444", // red
  "Tidak Sesuai":      "#ef4444", // red    (alias lama)

  // ── Jenis / kategori perusahaan ───────────────────────────────────────────
  "Nasional/BBH":    "#f97316", // orange
  "Multinasional":   "#0ea5e9", // sky
  "Lokal/Tidak BBH": "#8b5cf6", // violet

  // ── Pendapatan / UMP ─────────────────────────────────────────────────────
  "≥ 1,2× UMP": "#3b82f6", // blue
  "< 1,2× UMP": "#f97316", // orange

  // ── Kepuasan pengguna ─────────────────────────────────────────────────────
  "Sangat Baik": "#10b981", // green
  "Baik":        "#22c55e", // lime-green
  "Cukup":       "#f59e0b", // amber
  "Kurang":      "#ef4444", // red

  // ── Gender ────────────────────────────────────────────────────────────────
  "Pria":   "#0ea5e9", // sky
  "Wanita": "#f97316", // orange
};

// ─── Fallback untuk label baru yang belum dikenal ─────────────────────────────
// Warna yang belum dipakai di KNOWN_SEGMENT_COLORS di atas.
const FALLBACK_PALETTE = [
  "#ec4899", // pink
  "#eab308", // yellow
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#a855f7", // purple-light
  "#f43f5e", // rose
  "#84cc16", // lime
  "#78716c", // stone
  "#1e40af", // blue-dark
  "#047857", // green-dark
] as const;

// ─── Public API ───────────────────────────────────────────────────────────────

export function getSegmentColor(label: string, fallbackIndex: number): string {
  if (label in KNOWN_SEGMENT_COLORS) return KNOWN_SEGMENT_COLORS[label];
  return FALLBACK_PALETTE[fallbackIndex % FALLBACK_PALETTE.length];
}

export function buildColorMap(labels: string[]): Record<string, string> {
  let fallbackIdx = 0;
  return Object.fromEntries(
    labels.map((label) => {
      if (label in KNOWN_SEGMENT_COLORS) {
        return [label, KNOWN_SEGMENT_COLORS[label]];
      }
      const color = FALLBACK_PALETTE[fallbackIdx % FALLBACK_PALETTE.length];
      fallbackIdx++;
      return [label, color];
    })
  );
}

// ─── Palet seri Insight ───────────────────────────────────────────────────────
// FALLBACK_PALETTE dibuka dengan pink lalu kuning, sehingga grafik satu seri di
// Insight selalu pink dan D3/D4 jadi pink/kuning -- warna tanpa makna yang
// bisa terbaca sebagai status. Insight memakai palet netral sendiri (token
// --viz-n di index.css, nilainya beda untuk mode gelap); dashboard lain tetap
// memakai buildColorMap supaya tampilannya tidak berubah.
const INSIGHT_PALETTE = [1, 2, 3, 4, 5].map((n) => `var(--viz-${n})`);

/**
 * Seperti buildColorMap, tetapi label yang belum dikenal mendapat warna dari
 * palet netral Insight. Label bermakna (status, masa tunggu, kesesuaian)
 * tetap memakai warna tetapnya. Seri tunggal otomatis mendapat warna pertama.
 */
export function buildInsightColorMap(labels: string[]): Record<string, string> {
  let idx = 0;
  return Object.fromEntries(
    labels.map((label) => {
      if (label in KNOWN_SEGMENT_COLORS) return [label, KNOWN_SEGMENT_COLORS[label]];
      return [label, INSIGHT_PALETTE[idx++ % INSIGHT_PALETTE.length]];
    })
  );
}

// ─── Warna nilai bermakna (3D & heatmap Insight) ──────────────────────────────
// Grafik 3D dan heatmap mewarnai batang/sel menurut NILAINYA. Untuk ukuran yang
// punya arah baik-buruk, warnanya mengikuti status dashboard (merah = kurang
// baik, kuning = sedang, hijau = baik; nilai sama dengan C.red/C.yellow/C.green
// di KpiCard). Ukuran tanpa arah (jumlah alumni, UMP) tetap biru netral.

/** "higher" = makin tinggi makin baik; "lower" = makin rendah makin baik; null = netral. */
export type MeasureDirection = "higher" | "lower" | null;

export const STATUS_COLORS = { buruk: "#ef4444", sedang: "#eab308", baik: "#10b981" } as const;

const HIGHER_MEASURES = new Set(["count_terserap", "count_above_ump", "count_masa_tunggu_cepat", "count_sesuai_bidang"]);
const LOWER_MEASURES = new Set(["count_tidak_terserap", "count_below_ump", "count_tidak_sesuai_bidang"]);
/** Kolom angka (rata-rata/nilai tengah/terkecil/terbesar-nya ikut arah kolom). */
const HIGHER_COLUMNS = new Set(["take_home_pay", "skor"]);
const LOWER_COLUMNS = new Set(["masa_tunggu_bekerja", "masa_tunggu_wirausaha", "bulan_sesudah_lulus"]);

/**
 * Arah baik-buruk ukuran Insight dari kuncinya ("FactTracerStudy.count_terserap",
 * "FactTracerStudy.agg_avg_take_home_pay"). Total (sum) selalu netral: besarnya
 * ikut banyaknya alumni, bukan mutunya. Ukuran rumus dan yang belum dikenal netral.
 */
export function measureDirection(measureKey: string): MeasureDirection {
  const name = measureKey.slice(measureKey.lastIndexOf(".") + 1);
  if (HIGHER_MEASURES.has(name)) return "higher";
  if (LOWER_MEASURES.has(name)) return "lower";
  const agg = /^(?:agg_)?(avg|median|min|max|sum)_(.+)$/.exec(name);
  if (!agg || agg[1] === "sum") return null;
  if (HIGHER_COLUMNS.has(agg[2])) return "higher";
  if (LOWER_COLUMNS.has(agg[2])) return "lower";
  return null;
}

/** Warna dari nilai terendah ke tertinggi untuk ukuran berarah; null bila netral. */
export function statusRamp(direction: MeasureDirection): string[] | null {
  const naik = [STATUS_COLORS.buruk, STATUS_COLORS.sedang, STATUS_COLORS.baik];
  if (direction === "higher") return naik;
  if (direction === "lower") return [...naik].reverse();
  return null;
}

/** Interpolasi linear warna hex sepanjang `colors` untuk t di 0..1. */
export function rampColor(t: number, colors: string[]): string {
  const pos = Math.min(1, Math.max(0, t)) * (colors.length - 1);
  const i = Math.min(Math.floor(pos), colors.length - 2);
  const f = pos - i;
  const rgb = (hex: string) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  const [a, b] = [rgb(colors[i]), rgb(colors[i + 1])];
  return `#${a.map((v, k) => Math.round(v + (b[k] - v) * f).toString(16).padStart(2, "0")).join("")}`;
}

// ─── Label pendek untuk OLAP long-form labels ─────────────────────────────────

const OLAP_SHORT_LABELS: Record<string, string> = {
  "Bekerja (full time / part time)":         "Bekerja",
  "Wiraswasta":                              "Berwirausaha",
  "Melanjutkan Pendidikan":                  "Melanjutkan Studi",
  "Tidak kerja tetapi sedang mencari kerja": "Mencari Kerja",
  "Belum memungkinkan bekerja":              "Belum Bekerja",
  "Tidak Sama Sekali":                       "Tidak Sesuai",
};

export function getShortLabel(label: string): string {
  return OLAP_SHORT_LABELS[label] ?? label;
}