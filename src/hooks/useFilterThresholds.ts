import { useState, useEffect, useRef, useMemo } from "react";
import { apiService } from "@/lib/apiClient";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const KPI_INDICATOR_MAP: Record<string, string> = {
  waitingTime:      "employment_time",
  entrepreneurship: "entrepreneurship",
  fieldRelevance:   "field_relevance",
  absorption:       "tracer_response",
  incomePct:        "salary_above_ump",
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ThresholdVersion {
  id: number;
  year: number;
  label: string;
  is_active: boolean;
  thresholds: {
    baik:   { threshold_id: number; value: number };
    unggul: { threshold_id: number; value: number };
  };
}

export interface ThresholdResponse {
  success: boolean;
  context: "prodi" | "all";
  lam: { id: number; name: string; code: string };
  indicator: { key: string; name: string; unit: string; operator: string };
  versions: ThresholdVersion[];
}

export interface UseThresholdsResult {
  data: ThresholdResponse | null;
  loading: boolean;
  error: string | null;
  versionOptions: { id: number; label: string; is_active: boolean }[];
  getThreshold: (versionId: number, level: "baik" | "unggul") => number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useThresholds(
  prodiId: string | number | undefined | null,
  indicator: string,
  enabled = true
): UseThresholdsResult {
  const [data, setData]       = useState<ThresholdResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !indicator) return;

    // Hitung di dalam effect — tidak perlu jadi dependency
    const isAllProdi = !prodiId || prodiId === "all" || prodiId === "__all__";

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    const params: Record<string, string> = { indicator };
    if (!isAllProdi) params.prodi_id = String(prodiId);

    apiService
      .get<any>("/dashboard/thresholds", { params, signal: abortRef.current.signal })
      .then((res) => {
        // Handle kemungkinan wrapper { success, data: ThresholdResponse }
        // atau response langsung sebagai ThresholdResponse
        const payload: ThresholdResponse = res?.versions ? res : res?.data ?? res;
        setData(payload);
        setLoading(false);
      })
      .catch((err: any) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat threshold");
        setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [prodiId, indicator, enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // useMemo → referensi array stabil, tidak trigger re-render anak tiap render
  const versionOptions = useMemo(
    () =>
      (data?.versions ?? []).map((v) => ({
        id:        v.id,
        label:     v.label,
        is_active: v.is_active,
      })),
    [data]
  );

  const getThreshold = (versionId: number, level: "baik" | "unggul"): number | null => {
    const ver = data?.versions.find((v) => v.id === versionId);
    return ver ? ver.thresholds[level].value : null;
  };

  return { data, loading, error, versionOptions, getThreshold };
}