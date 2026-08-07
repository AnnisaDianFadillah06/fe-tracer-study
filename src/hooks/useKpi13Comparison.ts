import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types — cocok dengan Kpi13ChartDTO (tracer-study-backend)
// ─────────────────────────────────────────────────────────────────────────────

export type Kpi13ThresholdStatus = "unggul" | "baik" | "kurang" | null;

export interface Kpi13ProdiRow {
  id_prodi: number;
  prodi: string;
  jurusan: string;
  total_alumni: number;
  keterserapan: number;
  wirausaha: number;
  masa_tunggu: number;
  kesesuaian: number;
  pendapatan: number;
  threshold_status: {
    keterserapan: Kpi13ThresholdStatus;
    wirausaha: Kpi13ThresholdStatus;
    masa_tunggu: Kpi13ThresholdStatus;
    kesesuaian: Kpi13ThresholdStatus;
    pendapatan: Kpi13ThresholdStatus;
  };
  raw: {
    bekerja: number;
    cepat: number;
    sesuai: number;
    wirausaha: number;
    avg_gaji: number;
    ambang_ump_multiplier: number;
  };
}

export interface Kpi13ChartResponse {
  kpi: { id: number; name: string };
  filters: Record<string, string>;
  available_years: string[];
  data: Kpi13ProdiRow[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useKpi13Comparison — Perbandingan KPI Lintas Program Studi (FR-020)
// ─────────────────────────────────────────────────────────────────────────────

export function useKpi13Comparison() {
  const { tahunLulus, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (tahunLulus && tahunLulus !== "all") p.tahun = tahunLulus;
    return p;
  }, [tahunLulus]);

  const result = useQuery<Kpi13ChartResponse>({
    queryKey: ["kpi13", "chart", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/kpi/13/chart", { params, signal })
        .then((res) => res?.data ?? res),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: result.data ?? null,
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}
