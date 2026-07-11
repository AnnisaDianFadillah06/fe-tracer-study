import { useState, useEffect, useRef, useMemo } from "react";
import { apiService } from "@/lib/apiClient";

export const KPI_INDICATOR_MAP: Record<string, string> = {
  waitingTime:      "employment_time",
  entrepreneurship: "entrepreneurship",
  fieldRelevance:   "field_relevance",
  participation:    "tracer_response",
  incomePct:        "salary_above_ump",
  absorption:       "graduate_absorption",
};

export interface DynamicParam {
  value: number | null;
  unit: string; // 'bulan' | 'x_ump' | ...
}

export interface CalculationMeta {
  total_lulusan: number;
  margin_error: number;
  min_responden: number;
  formula: string;
}

export interface ThresholdVersion {
  id: number;
  year: number;
  version_name: string;
  label: string;
  is_active: boolean;
  indicator_name: string;
  thresholds: {
    baik:   { threshold_id: number; value: number };
    unggul: { threshold_id: number; value: number };
  };
  dynamic_param: DynamicParam | null;
  calculation_meta?: CalculationMeta;
}

export interface ThresholdResponse {
  success: boolean;
  context: "prodi" | "all_prodi";
  lam: { id: number; name: string; code: string } | null;
  indicator: {
    key: string;
    name: string;
    unit: string;
    operator: string;
    dynamic_param_unit: string | null;
    is_system_calculated: boolean;
  };
  versions: ThresholdVersion[];
}

export interface UseThresholdsResult {
  data: ThresholdResponse | null;
  loading: boolean;
  error: string | null;
  versionOptions: { id: number; label: string; is_active: boolean }[];
  getThreshold: (versionId: number, level: "baik" | "unggul") => number | null;
}

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

  const versionOptions = useMemo(
    () => (data?.versions ?? []).map((v) => ({ id: v.id, label: v.label, is_active: v.is_active })),
    [data]
  );

  const getThreshold = (versionId: number, level: "baik" | "unggul"): number | null => {
    const ver = data?.versions.find((v) => v.id === versionId);
    return ver ? ver.thresholds[level].value : null;
  };

  return { data, loading, error, versionOptions, getThreshold };
}