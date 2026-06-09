import { useState, useMemo } from "react";
import { useThresholds, KPI_INDICATOR_MAP, ThresholdVersion } from "@/hooks/useFilterThresholds";
import { useGlobalFilters, ALL } from "@/contexts/GlobalFiltersContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type LamLevel = "baik" | "unggul";

export interface LamFilterState {
  versionId: number | null;
  versionLabel: string;
  level: LamLevel;
  threshold: number;
  unit?: string;
  versionOptions: { id: number; label: string; is_active: boolean }[];
  setVersionId: (id: number) => void;
  setLevel: (l: LamLevel) => void;
  isDisabled: boolean;
  isLoading: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve prodi ID dari filter global.
 *
 * Aturan:
 * 1. Prodi dipilih eksplisit (bukan ALL) → cari ID-nya di prodiList
 * 2. prodiList hanya punya 1 item (kaprodi/scope server) → pakai otomatis
 * 3. Selain itu → null (mode multi-prodi, controls disabled)
 *
 * PENTING: kembalikan null kalau prodiList masih loading (length === 0 dan prodi = ALL)
 * supaya tidak salah trigger fetch.
 */
function resolveProdiId(
  prodi: string,
  prodiList: { id: number; nama_prodi: string }[]
): number | null {
  // Eksplisit dipilih
  if (prodi && prodi !== ALL && prodi !== "") {
    const found = prodiList.find(
      (p) => p.nama_prodi === prodi || String(p.id) === String(prodi)
    );
    return found?.id ?? null;
  }
  // Auto-scope kaprodi: hanya 1 prodi tersedia
  if (prodiList.length === 1) return prodiList[0].id;
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useLamFilter(kpiKey: string): LamFilterState {
  const { prodi, filterOptions } = useGlobalFilters();

  const indicatorKey = KPI_INDICATOR_MAP[kpiKey] ?? null;

  const prodiId = useMemo(
    () =>
      resolveProdiId(
        prodi,
        filterOptions.prodiList as { id: number; nama_prodi: string }[]
      ),
    [prodi, filterOptions.prodiList]
  );

  const isDisabled = prodiId === null;

  const { data, loading, versionOptions } = useThresholds(
    prodiId,
    indicatorKey ?? "",
    !isDisabled && !!indicatorKey
  );

  // Versi aktif dari BE sebagai default
  const defaultVersionId = useMemo(() => {
    if (!versionOptions.length) return null;
    const active = versionOptions.find((v) => v.is_active);
    return active ? active.id : versionOptions[versionOptions.length - 1].id;
  }, [versionOptions]);

  // null = user belum pernah pilih → pakai defaultVersionId
  const [userSelectedVersionId, setUserSelectedVersionId] = useState<number | null>(null);
  const [level, setLevel] = useState<LamLevel>("baik");

  // Derived — tidak butuh useEffect sama sekali
  const versionId = useMemo(() => {
    if (!versionOptions.length) return null;
    if (userSelectedVersionId !== null) {
      const valid = versionOptions.some((v) => v.id === userSelectedVersionId);
      if (valid) return userSelectedVersionId;
    }
    return defaultVersionId;
  }, [userSelectedVersionId, defaultVersionId, versionOptions]);

  const selectedVersion: ThresholdVersion | null = useMemo(() => {
    if (!data || versionId === null) return null;
    return data.versions.find((v) => v.id === versionId) ?? null;
  }, [data, versionId]);

  const threshold = selectedVersion?.thresholds[level]?.value ?? 0;
  const versionLabel = selectedVersion?.label ?? versionOptions[0]?.label ?? "—";

  return {
    versionId,
    versionLabel,
    level,
    threshold,
    unit: data?.indicator?.unit,
    versionOptions,
    setVersionId: setUserSelectedVersionId,
    setLevel,
    isDisabled,
    isLoading: loading,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// UI Components
// ─────────────────────────────────────────────────────────────────────────────

const TOOLTIP_TEXT =
  "Pilih satu program studi untuk menampilkan garis referensi threshold akreditasi.";

function TooltipWrapper({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(false);
  if (!show) return <>{children}</>;
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                     w-56 rounded-md bg-popover text-popover-foreground
                     border border-border shadow-md px-3 py-2 text-xs text-center leading-snug"
        >
          {TOOLTIP_TEXT}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2
                       border-4 border-transparent border-t-border"
          />
        </div>
      )}
    </div>
  );
}

export const LamFilterControls = ({ lam }: { lam: LamFilterState }) => (
  <TooltipWrapper show={lam.isDisabled}>
    <div className="flex items-center gap-1.5">
      <select
        value={lam.versionId ?? ""}
        onChange={(e) => lam.setVersionId(Number(e.target.value))}
        disabled={lam.isDisabled || lam.isLoading || lam.versionOptions.length === 0}
        className="text-xs px-2 py-1.5 rounded-md border border-border bg-card
                   disabled:opacity-40 disabled:cursor-not-allowed"
        title="Standar LAM"
      >
        {lam.isLoading && <option value="">Memuat…</option>}
        {!lam.isLoading && lam.versionOptions.length === 0 && (
          <option value="">—</option>
        )}
        {lam.versionOptions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
            {v.is_active ? " ✓" : ""}
          </option>
        ))}
      </select>

      <select
        value={lam.level}
        onChange={(e) => lam.setLevel(e.target.value as LamLevel)}
        disabled={lam.isDisabled || lam.isLoading}
        className="text-xs px-2 py-1.5 rounded-md border border-border bg-card
                   disabled:opacity-40 disabled:cursor-not-allowed"
        title="Level Akreditasi"
      >
        <option value="baik">Baik</option>
        <option value="unggul">Unggul</option>
      </select>
    </div>
  </TooltipWrapper>
);

export const lamSubtitle = (lam: LamFilterState): string => {
  if (lam.isDisabled) return "Pilih satu prodi untuk melihat threshold akreditasi";
  if (lam.isLoading) return "Memuat threshold…";
  if (!lam.threshold) return `Standar: ${lam.versionLabel}`;
  return `Standar: ${lam.versionLabel} — Level ${
    lam.level === "baik" ? "Baik" : "Unggul"
  } (${lam.threshold}${lam.unit ? ` ${lam.unit}` : "%"})`;
};