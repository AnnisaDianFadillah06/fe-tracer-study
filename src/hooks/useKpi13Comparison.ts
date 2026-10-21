import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types — cocok dengan Kpi13ChartDTO (tracer-study-backend)
// ─────────────────────────────────────────────────────────────────────────────

export type Kpi13ThresholdStatus = "unggul" | "baik" | "kurang" | null;

export type Kpi13Metric = "keterserapan" | "masa_tunggu" | "kesesuaian" | "wirausaha" | "pendapatan";

/** Standar aktif LAM prodi untuk satu metrik; semua null = belum ada threshold. */
export interface Kpi13Threshold {
  lam: string | null;
  baik: number | null;
  unggul: number | null;
  /** Batas bulan (masa tunggu) atau kelipatan UMP (pendapatan) bila LAM menetapkannya. */
  param: number | null;
}

export interface Kpi13ProdiRow {
  /** programs.id (OLTP) -- kunci lam_programs, bukan prodi_sk DW. */
  id_prodi: number;
  prodi: string;
  jenjang: string;
  jurusan: string;
  total_alumni: number;
  keterserapan: number;
  wirausaha: number;
  masa_tunggu: number;
  kesesuaian: number;
  pendapatan: number;
  threshold_status: Record<Kpi13Metric, Kpi13ThresholdStatus>;
  thresholds: Record<Kpi13Metric, Kpi13Threshold>;
  raw: Record<string, number>;
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

/**
 * @param overrideParams filter eksplisit (mis. dari query string halaman
 *   Bandingkan per Prodi). Tanpa ini, tahun lulus dan snapshot diambil dari
 *   filter global. Snapshot wajib ikut -- BE memakai snapshot terbaru bila
 *   kosong, tapi FE harus konsisten dengan snapshot yang sedang dilihat.
 */
export function useKpi13Comparison(overrideParams?: Record<string, string>) {
  const { tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(() => {
    if (overrideParams) return overrideParams;
    const p: Record<string, string> = {};
    if (tahunLulus && tahunLulus !== "all") p.tahun_lulus = tahunLulus;
    if (weekKey) p.minggu_snapshot = weekKey;
    return p;
  }, [overrideParams, tahunLulus, weekKey]);

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
