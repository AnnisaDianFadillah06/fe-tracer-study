/** Formatting helpers for KPI tooltips & modal subtitles. */

export const idn = (n: number) => new Intl.NumberFormat("id-ID").format(n);

/** "78% (187/240 lulusan)" */
export const formatPctCount = (pct: number, n: number, total: number) =>
  `${pct}% (${idn(n)}/${idn(total)} lulusan)`;

/** "187 dari 240 lulusan" */
export const formatNTotal = (n: number, total: number) =>
  `${idn(n)} dari ${idn(total)} lulusan`;

/** Estimate n given pct and total. */
export const nFromPct = (pct: number, total: number) =>
  Math.round((pct / 100) * total);

/** Find max value in array; mark each entry with isMax flag. */
export function markMax<T extends Record<string, any>>(arr: T[], key: keyof T): (T & { isMax: boolean })[] {
  if (!arr.length) return [];
  const max = Math.max(...arr.map((d) => Number(d[key]) || 0));
  return arr.map((d) => ({ ...d, isMax: Number(d[key]) === max }));
}