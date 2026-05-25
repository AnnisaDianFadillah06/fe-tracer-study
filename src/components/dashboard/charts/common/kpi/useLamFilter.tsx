import { useState } from "react";

export type LamVersion = "BAN-PT 2.0" | "BAN-PT 3.0";
export type LamLevel = "baik" | "unggul";

/** Threshold table per KPI key, per LAM version, per level. */
export const LAM_THRESHOLDS: Record<
  string,
  Record<LamVersion, { baik: number; unggul: number; unit?: string; label?: string }>
> = {
  participation:    { "BAN-PT 2.0": { baik: 30, unggul: 50 }, "BAN-PT 3.0": { baik: 50, unggul: 75 } },
  absorption:       { "BAN-PT 2.0": { baik: 70, unggul: 80 }, "BAN-PT 3.0": { baik: 80, unggul: 90 } },
  waitingTime:      { "BAN-PT 2.0": { baik: 6, unggul: 3, unit: "bln" }, "BAN-PT 3.0": { baik: 4, unggul: 2, unit: "bln" } },
  fieldRelevance:   { "BAN-PT 2.0": { baik: 70, unggul: 80 }, "BAN-PT 3.0": { baik: 80, unggul: 90 } },
  entrepreneurship: { "BAN-PT 2.0": { baik: 5,  unggul: 10 }, "BAN-PT 3.0": { baik: 8,  unggul: 15 } },
  income:           { "BAN-PT 2.0": { baik: 4.5, unggul: 6.75, unit: "jt" }, "BAN-PT 3.0": { baik: 6, unggul: 9, unit: "jt" } },
};

export interface LamFilterState {
  version: LamVersion;
  level: LamLevel;
  threshold: number;
  unit?: string;
  setVersion: (v: LamVersion) => void;
  setLevel: (l: LamLevel) => void;
}

export function useLamFilter(kpiKey: keyof typeof LAM_THRESHOLDS): LamFilterState {
  const [version, setVersion] = useState<LamVersion>("BAN-PT 3.0");
  const [level, setLevel] = useState<LamLevel>("baik");
  const cfg = LAM_THRESHOLDS[kpiKey][version];
  return { version, level, threshold: cfg[level], unit: cfg.unit, setVersion, setLevel };
}

export const LamFilterControls = ({ lam }: { lam: LamFilterState }) => (
  <div className="flex items-center gap-1.5">
    <select
      value={lam.version}
      onChange={(e) => lam.setVersion(e.target.value as LamVersion)}
      className="text-xs px-2 py-1.5 rounded-md border border-border bg-card"
      title="Standar LAM"
    >
      <option value="BAN-PT 2.0">LAM BAN-PT 2.0</option>
      <option value="BAN-PT 3.0">LAM BAN-PT 3.0</option>
    </select>
    <select
      value={lam.level}
      onChange={(e) => lam.setLevel(e.target.value as LamLevel)}
      className="text-xs px-2 py-1.5 rounded-md border border-border bg-card"
      title="Level Akreditasi"
    >
      <option value="baik">Baik</option>
      <option value="unggul">Unggul</option>
    </select>
  </div>
);

export const lamSubtitle = (lam: LamFilterState) =>
  `Standar: LAM ${lam.version} — Level ${lam.level === "baik" ? "Baik" : "Unggul"} (${lam.threshold}${lam.unit ? ` ${lam.unit}` : "%"})`;