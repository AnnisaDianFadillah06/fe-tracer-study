import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

function buildParams(
  degree: string,
  prodi: string,
  tahunLulus: string,
): Record<string, string> {
  const p: Record<string, string> = {};
  if (degree && degree !== "__all__") p.jenjang = degree;
  if (prodi && prodi !== "__all__") p.nama_prodi = prodi;
  if (tahunLulus && tahunLulus !== "all") p.graduation_year = tahunLulus;
  return p;
}

// ─── Overview / Monitoring Operasional ────────────────────────────────────────

export interface OverviewSummaryResponse {
  success?: boolean;
  data: {
    filters: Record<string, string>;
    cards: {
      total_kuesioner: { value: number; hint: string };
      sudah_mengisi: { value: number; hint: string };
      response_rate: { value: number; hint: string };
      rata_rata_waktu: { value: number; hint: string };
      belum_mengisi: { value: number; hint: string };
    };
  };
}

export function useOverviewSummary() {
  const { degree, prodi, tahunLulus, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, prodi, tahunLulus),
    [degree, prodi, tahunLulus],
  );

  const result = useQuery<OverviewSummaryResponse>({
    queryKey: ["overview-summary", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService
        .get<any>("/dashboard/response-rate/summary", { params, signal })
        .then((res) => res?.data ? { data: res.data } : res),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: result.data?.data?.cards ?? null,
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

// ─── Education / Evaluasi Pendidikan ──────────────────────────────────────────

export interface EducationSummaryResponse {
  success?: boolean;
  data: {
    filters: Record<string, string> | any[];
    cards: {
      skor_kompetensi: { value: number; hint: string };
      gap_terbesar: { label: string; gap: number; hint: string };
      metode_terbaik: { label: string; skor: number; hint: string };
      avg_persepsi: { value: number; hint: string };
      mandiri_keluarga: { pct: number; hint: string };
      beasiswa: { pct: number; hint: string };
    };
  };
}

export function useEducationSummary() {
  const { degree, prodi, tahunLulus, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, prodi, tahunLulus),
    [degree, prodi, tahunLulus],
  );

  const result = useQuery<EducationSummaryResponse>({
    queryKey: ["education-summary", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService
        .get<any>("/dashboard/education/summary", { params, signal })
        .then((res) => res?.data ? { data: res.data } : res),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: result.data?.data?.cards ?? null,
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

// ─── Employment / Luaran Pekerjaan ────────────────────────────────────────────

export interface EmploymentSummaryResponse {
  success?: boolean;
  data: {
    filters: Record<string, string>;
    cards: {
      keterserapan: { value: number; hint: string };
      kerja_6_bulan: { value: number; hint: string };
      kesesuaian: { value: number; hint: string };
      wirausaha: { value: number; hint: string };
      avg_pendapatan: { value: number; formatted: string; hint: string };
      level_nasional: { value: number; hint: string };
    };
  };
}

export function useEmploymentSummary() {
  const { degree, prodi, tahunLulus, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, prodi, tahunLulus),
    [degree, prodi, tahunLulus],
  );

  const result = useQuery<EmploymentSummaryResponse>({
    queryKey: ["employment-summary", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService
        .get<any>("/dashboard/employment/summary", { params, signal })
        .then((res) => res?.data ? { data: res.data } : res),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: result.data?.data?.cards ?? null,
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}
