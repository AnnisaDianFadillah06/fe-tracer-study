import { useMemo, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

export interface ResponseRateBarItem {
  prodi: string;
  jenjang: string;
  responded: number;
  notResponded: number;
  total: number;
  breakdown: {
    selesai: number;
    on_going: number;
    belum_mengisi: number;
  };
}

export interface ResponseRateBarResponse {
  filters: Record<string, string>;
  sort: string;
  data: ResponseRateBarItem[];
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Types: Pie (KPI 2 — Status Pengisian)
// ─────────────────────────────────────────────────────────────────────────────

export interface ResponseRatePieItem {
  name: string;
  value: number;
  pct: number;
}

export interface ResponseRatePieResponse {
  filters: Record<string, string>;
  total: number;
  data: ResponseRatePieItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useResponseRatePie
// ─────────────────────────────────────────────────────────────────────────────

export function useResponseRatePie() {
  const { degree, prodi, tahunLulus, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, prodi, tahunLulus),
    [degree, prodi, tahunLulus],
  );

  const result = useQuery<ResponseRatePieResponse>({
    queryKey: ["response-rate", "pie", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService
        .get<any>("/dashboard/response-rate/pie", { params, signal })
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
// Types & Hook: Trend (KPI 3)
// ─────────────────────────────────────────────────────────────────────────────

export interface ResponseRateTrendItem {
  year: number;
  rate: number;
  total: number;
  breakdown: { selesai: number; on_going: number; belum_mengisi: number };
}

export interface ResponseRateTrendResponse {
  filters: Record<string, string>;
  data: ResponseRateTrendItem[];
}

export function useResponseRateTrend() {
  const { degree, prodi, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (degree && degree !== "__all__") p.jenjang = degree;
    if (prodi && prodi !== "__all__") p.nama_prodi = prodi;
    return p;
  }, [degree, prodi]);

  const result = useQuery<ResponseRateTrendResponse>({
    queryKey: ["response-rate", "trend", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService
        .get<any>("/dashboard/response-rate/trend", { params, signal })
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
// Hook: useResponseRateBandingkan (for ComparePage — reads URL search params)
// ─────────────────────────────────────────────────────────────────────────────

export function useResponseRateBandingkan(enabled: boolean) {
  const sp =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  const jenjang = sp.get("jenjang") ?? "";
  const namaProdi = sp.get("nama_prodi") ?? "";
  const graduationYear =
    sp.get("graduation_year") ?? sp.get("tahun_lulus") ?? "";

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (jenjang) p.jenjang = jenjang;
    if (namaProdi) p.nama_prodi = namaProdi;
    if (graduationYear) p.graduation_year = graduationYear;
    return p;
  }, [jenjang, namaProdi, graduationYear]);

  const result = useQuery<ResponseRateBarResponse>({
    queryKey: ["response-rate", "bandingkan", params],
    queryFn: ({ signal }) =>
      apiService
        .get<any>("/dashboard/response-rate/bar", { params, signal })
        .then((res) => res?.data ?? res),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: result.data ?? null,
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useResponseRateBar
// ─────────────────────────────────────────────────────────────────────────────

export function useResponseRateBar() {
  const { degree, prodi, tahunLulus, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, prodi, tahunLulus),
    [degree, prodi, tahunLulus],
  );

  const result = useQuery<ResponseRateBarResponse>({
    queryKey: ["response-rate", "bar", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService
        .get<any>("/dashboard/response-rate/bar", { params, signal })
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
// Types & Hook: DrillDown
// ─────────────────────────────────────────────────────────────────────────────

export interface ResponseRateDrillDownParams {
  status: string;
  page?: number;
  per_page?: number;
  search?: string;
}

export interface ResponseRateDrillDownResponse {
  filters: Record<string, string>;
  pagination: { page: number; per_page: number; total_on_page: number };
  data: Array<{
    nama: string;
    nim: string;
    nama_prodi: string;
    jenjang: string;
    graduation_year: string;
    status: string;
  }>;
}

const STATUS_NAME_TO_KEY: Record<string, string> = {
  Selesai: "submitted",
  "Sedang Mengisi": "ongoing",
  "Belum Mengisi": "started",
  "Sudah Merespons": "submitted",
  "Belum Merespons": "started",
};

export function statusNameToKey(name: string): string {
  return STATUS_NAME_TO_KEY[name] ?? name;
}

export function useResponseRateDrillDown() {
  const { degree, prodi, tahunLulus } = useGlobalFilters();

  const [data, setData] = useState<ResponseRateDrillDownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(
    (extra: ResponseRateDrillDownParams) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);

      const searchUpper = extra.search?.toUpperCase().trim();
      const params: Record<string, string> = {
        status: extra.status,
        page: String(extra.page ?? 1),
        per_page: String(extra.per_page ?? 15),
        ...(searchUpper ? { search: searchUpper } : {}),
      };
      if (degree && degree !== "__all__") params.jenjang = degree;
      if (prodi && prodi !== "__all__") params.nama_prodi = prodi;
      if (tahunLulus && tahunLulus !== "all")
        params.graduation_year = tahunLulus;

      apiService
        .get<any>("/dashboard/response-rate/drill-down", {
          params,
          signal: abortRef.current.signal,
        })
        .then((res) => {
          const raw = res?.data ?? res;
          if (raw?.data) {
            raw.data = raw.data.map((item: any) => ({
              ...item,
              tahun_lulus: item.tahun_lulus ?? item.graduation_year ?? "",
            }));
          }
          setData(raw);
          setLoading(false);
        })
        .catch((err: any) => {
          if (err?.name === "CanceledError" || err?.name === "AbortError")
            return;
          setError(err?.message ?? "Gagal memuat data");
          setLoading(false);
        });
    },
    [degree, prodi, tahunLulus],
  );

  return { data, loading, error, fetch };
}
