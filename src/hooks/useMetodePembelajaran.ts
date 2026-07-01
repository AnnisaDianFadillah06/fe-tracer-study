import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MetodeItem {
  kode_field: string;
  label: string;
  avg_skor: number;
  count_responden: number;
}

export interface MetodeResponse {
  filters: Record<string, string>;
  data: MetodeItem[];
}

export interface MetodeBandingkanItem {
  nama_prodi: string;
  jenjang: string;
  metode: MetodeItem[];
}

export interface MetodeBandingkanResponse {
  filters: Record<string, string>;
  prodi_list: string[];
  data: MetodeBandingkanItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────

function buildParams(
  degree: string,
  jurusan: string,
  prodi: string,
  tahunLulus: string,
  weekKey: string
): Record<string, string> {
  const p: Record<string, string> = {};
  if (degree     && degree     !== "__all__") p.jenjang         = degree;
  if (jurusan    && jurusan    !== "__all__") p.jurusan         = jurusan;
  if (prodi      && prodi      !== "__all__") p.nama_prodi      = prodi;
  if (tahunLulus && tahunLulus !== "all")     p.tahun_lulus     = tahunLulus;
  if (weekKey)                               p.minggu_snapshot = weekKey;
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useMetodePembelajaran
// ─────────────────────────────────────────────────────────────────────────────

export function useMetodePembelajaran() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, tahunLulus, weekKey),
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  const result = useQuery<MetodeResponse>({
    queryKey: ["metode-pembelajaran", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/kompetensi/metode", { params, signal })
        .then((res) => res?.data ?? res),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: result.data ?? null,
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useMetodePembelajaranBandingkan  (lazy — aktif hanya saat compare mode)
// ─────────────────────────────────────────────────────────────────────────────

export function useMetodePembelajaranBandingkan(enabled: boolean) {
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const jenjang    = searchParams.get("jenjang")         ?? "";
  const jurusan    = searchParams.get("jurusan")         ?? "";
  const tahunLulus = searchParams.get("tahun_lulus")     ?? "";
  const weekKey    = searchParams.get("minggu_snapshot") ?? "";

  const paramKey = `${jenjang}|${jurusan}|${tahunLulus}|${weekKey}`;

  const [data, setData]       = useState<MetodeBandingkanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    const params: Record<string, string> = {};
    if (jenjang)    params.jenjang         = jenjang;
    if (jurusan)    params.jurusan         = jurusan;
    if (tahunLulus) params.tahun_lulus     = tahunLulus;
    if (weekKey)    params.minggu_snapshot = weekKey;

    apiService
      .get<any>("/dashboard/kompetensi/metode/bandingkan", { params, signal: abortRef.current.signal })
      .then((res) => { setData(res?.data ?? res); setLoading(false); })
      .catch((err: any) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data perbandingan metode pembelajaran");
        setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [enabled, paramKey]);

  return { data, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Types & Hook: DrillDown
// ─────────────────────────────────────────────────────────────────────────────

export interface MetodeDrillDownParams {
  kode_field?: string;
  nama_prodi?: string;
  page?: number;
  per_page?: number;
  search?: string;
}

export interface MetodeDrillDownResponse {
  filters: Record<string, string>;
  pagination: { page: number; per_page: number; total_on_page: number };
  data: Array<{
    nama: string;
    nim: string;
    nama_prodi: string;
    jenjang: string;
    tahun_lulus: string;
    metode: string;
    skor: number;
  }>;
}

export function useMetodePembelajaranDrillDown() {
  const { degree, jurusan, prodi, tahunLulus, weekKey } = useGlobalFilters();

  const [data, setData] = useState<MetodeDrillDownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(
    (extra: MetodeDrillDownParams) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {
        ...buildParams(degree, jurusan, prodi, tahunLulus, weekKey),
        page: String(extra.page ?? 1),
        per_page: String(extra.per_page ?? 15),
        ...(extra.kode_field ? { kode_field: extra.kode_field } : {}),
        ...(extra.nama_prodi ? { nama_prodi: extra.nama_prodi } : {}),
        ...(extra.search ? { search: extra.search } : {}),
      };

      apiService
        .get<any>("/dashboard/kompetensi/metode/drill-down", { params, signal: abortRef.current.signal })
        .then((res) => { setData(res?.data ?? res); setLoading(false); })
        .catch((err: any) => {
          if (err?.name === "CanceledError" || err?.name === "AbortError") return;
          setError(err?.message ?? "Gagal memuat data");
          setLoading(false);
        });
    },
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  return { data, loading, error, fetch };
}
