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
  // ── Keterserapan / Status alumni ──────────────────────────────────────────
  "Bekerja":             "#10b981", // green  (sesuai CHART_CONFIGS status)
  "Mencari Kerja":       "#f59e0b", // amber
  "Studi Lanjut":        "#0ea5e9", // sky
  "Melanjutkan Studi":   "#0ea5e9", // sky    (alias BE)
  "Wiraswasta":          "#8b5cf6", // violet
  "Wirausaha":           "#8b5cf6", // violet (alias BE)
  "Studi & Bekerja":     "#3b82f6", // blue
  "Belum Bekerja":       "#6b7280", // slate
  "Tidak Mencari Kerja": "#f97316", // orange

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