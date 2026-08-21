import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

function buildOverviewParams(
  degree: string,
  jurusan: string,
  prodi: string,
  tahunLulus: string,
  weekKey: string,
): Record<string, string> {
  const p: Record<string, string> = {};
  if (degree && degree !== "__all__") p.jenjang = degree;
  if (jurusan && jurusan !== "__all__") p.jurusan = jurusan;
  if (prodi && prodi !== "__all__") p.nama_prodi = prodi;
  if (tahunLulus && tahunLulus !== "all") p.graduation_year = tahunLulus;
  if (weekKey) p.minggu_snapshot = weekKey;
  return p;
}

function buildEducationParams(
  degree: string,
  jurusan: string,
  prodi: string,
  tahunLulus: string,
  weekKey: string,
): Record<string, string> {
  const p: Record<string, string> = {};
  if (degree && degree !== "__all__") p.jenjang = degree;
  if (jurusan && jurusan !== "__all__") p.jurusan = jurusan;
  if (prodi && prodi !== "__all__") p.nama_prodi = prodi;
  if (tahunLulus && tahunLulus !== "all") p.tahun_lulus = tahunLulus;
  if (weekKey) p.minggu_snapshot = weekKey;
  return p;
}

function extractCards(res: any): any {
  return res?.data?.cards ?? res?.cards ?? null;
}

// ─── Overview / Monitoring Partisipasi ───────────────────────────────────────

export interface OverviewSummaryCards {
  total_kuesioner: { value: number; hint: string };
  sudah_mengisi: { value: number; hint: string };
  response_rate: { value: number; hint: string; trend_pp: number | null; trend_direction: "up" | "down" | "flat" };
  rata_rata_waktu: { value_hours: number | null; label: string; hint: string; count_with_duration: number };
  belum_mengisi: { value: number; hint: string };
}

export function useOverviewSummary() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);
  const params = useMemo(
    () => buildOverviewParams(degree, jurusan, prodi, tahunLulus, weekKey),
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  const { data, isLoading: loading, error } = useQuery<OverviewSummaryCards | null>({
    queryKey: ["summary", "overview", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService
        .get<any>("/dashboard/overview/summary", { params, signal })
        .then(extractCards),
  });

  return { data: data ?? null, loading, error: error?.message ?? null };
}

// ─── Education / Analisis Capaian Lulusan ────────────────────────────────────

export interface EducationSummaryCards {
  skor_kompetensi: { label: string; value: number; hint: string };
  gap_terbesar: { label: string; gap: number; hint: string };
  metode_terbaik: { label: string; skor: number; hint: string };
  avg_persepsi: { value: number; hint: string };
  mandiri_keluarga: { pct: number; hint: string };
  beasiswa: { pct: number; hint: string };
}

export function useEducationSummary() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);
  const params = useMemo(
    () => buildEducationParams(degree, jurusan, prodi, tahunLulus, weekKey),
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  const { data, isLoading: loading, error } = useQuery<EducationSummaryCards | null>({
    queryKey: ["summary", "education", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService
        .get<any>("/dashboard/education/summary", { params, signal })
        .then(extractCards),
  });

  return { data: data ?? null, loading, error: error?.message ?? null };
}

// ─── Employment / Luaran Pekerjaan ───────────────────────────────────────────

export interface EmploymentSummaryCards {
  keterserapan: { value: number; hint: string };
  masa_tunggu_cepat: { value: number; hint: string };
  kesesuaian: { value: number; hint: string };
  wirausaha: { value: number; hint: string };
  avg_pendapatan: { value: number; label: string; pct_above_ump: number; hint: string };
  level_nasional: { value: number; hint: string };
}

export function useEmploymentSummary() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);
  const params = useMemo(
    () => buildEducationParams(degree, jurusan, prodi, tahunLulus, weekKey),
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  const { data, isLoading: loading, error } = useQuery<EmploymentSummaryCards | null>({
    queryKey: ["summary", "employment", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService
        .get<any>("/dashboard/employment/summary", { params, signal })
        .then(extractCards),
  });

  return { data: data ?? null, loading, error: error?.message ?? null };
}
