import { useMemo, useState, useEffect } from "react";
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
  const [data, setData] = useState<OverviewSummaryCards | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(
    () => buildOverviewParams(degree, prodi, tahunLulus),
    [degree, prodi, tahunLulus],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    apiService
      .get<any>("/dashboard/overview/summary", { params, signal: controller.signal })
      .then((res) => {
        const cards = extractCards(res);
        setData(cards);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data");
        setLoading(false);
      });

    return () => controller.abort();
  }, [params, lastUpdatedAt]);

  return { data, loading, error };
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
  const [data, setData] = useState<EducationSummaryCards | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(
    () => buildEducationParams(degree, prodi, tahunLulus),
    [degree, prodi, tahunLulus],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    apiService
      .get<any>("/dashboard/education/summary", { params, signal: controller.signal })
      .then((res) => {
        const cards = extractCards(res);
        setData(cards);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data");
        setLoading(false);
      });

    return () => controller.abort();
  }, [params, lastUpdatedAt]);

  return { data, loading, error };
}

// ─── Employment / Luaran Pekerjaan ────────────────────────────────────────────

export interface EmploymentSummaryCards {
  keterserapan: { value: number; hint: string };
  kerja_6_bulan: { value: number; hint: string };
  kesesuaian: { value: number; hint: string };
  wirausaha: { value: number; hint: string };
  avg_pendapatan: { value: number; formatted: string; hint: string };
  level_nasional: { value: number; hint: string };
}

export function useEmploymentSummary() {
  const { degree, prodi, tahunLulus, lastUpdatedAt } = useGlobalFilters();
  const [data, setData] = useState<EmploymentSummaryCards | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(
    () => buildOverviewParams(degree, prodi, tahunLulus),
    [degree, prodi, tahunLulus],
  );

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    apiService
      .get<any>("/dashboard/employment/summary", { params, signal: controller.signal })
      .then((res) => {
        const cards = extractCards(res);
        setData(cards);
        setLoading(false);
      })
      .catch((err) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data");
        setLoading(false);
      });

    return () => controller.abort();
  }, [params, lastUpdatedAt]);

  return { data, loading, error };
}
