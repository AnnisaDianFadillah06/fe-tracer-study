import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface KesesuaianBarItem {
  nama_prodi: string;
  jenjang: string;
  tahun_lulus: string;
  count_alumni: number;
  count_sesuai_bidang: number;
  count_tidak_sesuai_bidang: number;
  pct_sesuai: number;
  pct_tidak_sesuai: number;
}

export interface KesesuaianBarResponse {
  filters: Record<string, string>;
  data: KesesuaianBarItem[];
}

export interface KesesuaianPieItem {
  label: string;
  count: number;
  pct: number;
}

export interface KesesuaianPieResponse {
  chart_type: string;
  filters: Record<string, string>;
  total: number;
  data: KesesuaianPieItem[];
}

export interface KesesuaianAlasanItem {
  kode_field: string;
  label: string;
  count: number;
}

export interface KesesuaianAlasanResponse {
  filters: Record<string, string>;
  data: KesesuaianAlasanItem[];
}

export interface KesesuaianDrillDownStudent {
  nama: string;
  nim: string;
  nama_prodi: string;
  jenjang: string;
  tahun_lulus: string;
  kesesuaian_bidang: string;
  status: string;
}

export interface KesesuaianDrillDownResponse {
  kesesuaian_label: string;
  filters: Record<string, string>;
  pagination: { page: number; per_page: number; total_on_page: number };
  data: KesesuaianDrillDownStudent[];
}

export interface KesesuaianDrillDownParams {
  kesesuaian_sk: number;
  tahun_lulus?: string;  // override global filter saat klik bar per tahun
  page?: number;
  per_page?: number;
  search?: string;
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
// Hook: useKesesuaianBar  (tidak filter tahun — tahun_lulus adalah sumbu X)
// ─────────────────────────────────────────────────────────────────────────────

export function useKesesuaianBar() {
  const { degree, jurusan, prodi, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  // Bar tidak pakai tahun_lulus — itu sumbu X
  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, "all", weekKey),
    [degree, jurusan, prodi, weekKey]
  );

  const result = useQuery<KesesuaianBarResponse>({
    queryKey: ["kesesuaian", "bar", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/kesesuaian/bar", { params, signal })
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
// Hook: useKesesuaianPie
// ─────────────────────────────────────────────────────────────────────────────

export function useKesesuaianPie() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, tahunLulus, weekKey),
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  const result = useQuery<KesesuaianPieResponse>({
    queryKey: ["kesesuaian", "pie", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/kesesuaian/pie", { params, signal })
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
// Hook: useKesesuaianAlasan
// ─────────────────────────────────────────────────────────────────────────────

export function useKesesuaianAlasan() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, tahunLulus, weekKey),
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  const result = useQuery<KesesuaianAlasanResponse>({
    queryKey: ["kesesuaian", "alasan", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/kesesuaian/alasan", { params, signal })
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
// Hook: useKesesuaianDrillDown  (lazy)
// ─────────────────────────────────────────────────────────────────────────────

export function useKesesuaianDrillDown() {
  const { degree, jurusan, prodi, tahunLulus, weekKey } = useGlobalFilters();

  const [data, setData]       = useState<KesesuaianDrillDownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  const fetch = useCallback(
    (extra: KesesuaianDrillDownParams) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);

      const effectiveTahun = extra.tahun_lulus ?? tahunLulus;
      const params: Record<string, string> = {
        ...buildParams(degree, jurusan, prodi, effectiveTahun, weekKey),
        kesesuaian_sk: String(extra.kesesuaian_sk),
        page:          String(extra.page ?? 1),
        per_page:      String(extra.per_page ?? 15),
        ...(extra.search ? { search: extra.search } : {}),
      };

      apiService
        .get<any>("/dashboard/kesesuaian/drill-down", { params, signal: abortRef.current.signal })
        .then((res) => { setData(res?.data ?? res); setLoading(false); })
        .catch((err: any) => {
          if (err?.name === "CanceledError" || err?.name === "AbortError") return;
          setError(err?.message ?? "Gagal memuat data alumni");
          setLoading(false);
        });
    },
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  return { data, loading, error, fetch };
}
