import { useMemo, useState, useEffect, useRef } from "react";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

function buildOverviewParams(
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

function buildEducationParams(
  degree: string,
  prodi: string,
  tahunLulus: string,
): Record<string, string> {
  const p: Record<string, string> = {};
  if (degree && degree !== "__all__") p.jenjang = degree;
  if (prodi && prodi !== "__all__") p.nama_prodi = prodi;
  if (tahunLulus && tahunLulus !== "all") p.tahun_lulus = tahunLulus;
  return p;
}

function extractCards(res: any): any {
  return res?.data?.cards ?? res?.cards ?? null;
}

function useSummaryFetch<T>(url: string, params: Record<string, string>, updatedTs: number) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    apiService
      .get<any>(url, { params, signal: abortRef.current.signal })
      .then((res) => {
        setData(extractCards(res));
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data");
        setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [url, params, updatedTs]);

  return { data, loading, error };
}

// ─── Overview / Monitoring Operasional ────────────────────────────────────────

export interface OverviewSummaryCards {
  total_kuesioner: { value: number; hint: string };
  sudah_mengisi: { value: number; hint: string };
  response_rate: { value: number; hint: string; trend_pp: number | null; trend_direction: "up" | "down" | "flat" };
  rata_rata_waktu: { value_hours: number | null; label: string; hint: string; count_with_duration: number };
  belum_mengisi: { value: number; hint: string };
}

export function useOverviewSummary() {
  const { degree, prodi, tahunLulus, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);
  const params = useMemo(() => buildOverviewParams(degree, prodi, tahunLulus), [degree, prodi, tahunLulus]);
  return useSummaryFetch<OverviewSummaryCards>("/dashboard/overview/summary", params, updatedTs);
}

// ─── Education / Evaluasi Pendidikan ──────────────────────────────────────────

export interface EducationSummaryCards {
  skor_kompetensi: { value: number; hint: string };
  gap_terbesar: { label: string; gap: number; hint: string };
  metode_terbaik: { label: string; skor: number; hint: string };
  avg_persepsi: { value: number; hint: string };
  mandiri_keluarga: { pct: number; hint: string };
  beasiswa: { pct: number; hint: string };
}

export function useEducationSummary() {
  const { degree, prodi, tahunLulus, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);
  const params = useMemo(() => buildEducationParams(degree, prodi, tahunLulus), [degree, prodi, tahunLulus]);
  return useSummaryFetch<EducationSummaryCards>("/dashboard/education/summary", params, updatedTs);
}

// ─── Employment / Luaran Pekerjaan ────────────────────────────────────────────

export interface EmploymentSummaryCards {
  keterserapan: { value: number; hint: string };
  masa_tunggu_cepat: { value: number; hint: string };
  kesesuaian: { value: number; hint: string };
  wirausaha: { value: number; hint: string };
  avg_pendapatan: { value: number; label: string; pct_above_ump: number; hint: string };
  level_nasional: { value: number; hint: string };
}

export function useEmploymentSummary() {
  const { degree, prodi, tahunLulus, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);
  const params = useMemo(() => buildEducationParams(degree, prodi, tahunLulus), [degree, prodi, tahunLulus]);
  return useSummaryFetch<EmploymentSummaryCards>("/dashboard/employment/summary", params, updatedTs);
}
