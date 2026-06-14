import { useState, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PembiayaanPieItem {
  sumber_biaya: string;
  count: number;
  pct: number;
}

export interface PembiayaanPieResponse {
  chart_type: string;
  filters: Record<string, string>;
  total: number;
  data: PembiayaanPieItem[];
}

export interface PembiayaanSumberItem {
  label: string;
  count: number;
  pct: number;
}

export interface PembiayaanProdiItem {
  nama_prodi: string;
  jenjang: string;
  total: number;
  sumber: PembiayaanSumberItem[];
}

export interface PembiayaanPerProdiResponse {
  filters: Record<string, string>;
  data: PembiayaanProdiItem[];
}

export interface PembiayaanTahunItem {
  tahun_lulus: string;
  total: number;
  sumber: PembiayaanSumberItem[];
}

export interface PembiayaanAntarPeriodeResponse {
  filters: Record<string, string>;
  available_tahun: string[];
  data: PembiayaanTahunItem[];
}

export interface PembiayaanDrillDownStudent {
  nama: string;
  nim: string;
  nama_prodi: string;
  jenjang: string;
  tahun_lulus: string;
  sumber_biaya: string;
}

export interface PembiayaanDrillDownResponse {
  filters: Record<string, string>;
  pagination: { page: number; per_page: number; total_on_page: number };
  data: PembiayaanDrillDownStudent[];
}

export interface PembiayaanDrillDownParams {
  sumber_biaya?: string;
  tahun_lulus?: string;
  jenjang?: string;
  jurusan?: string;
  nama_prodi?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface PembiayaanBandingkanResponse {
  filters: Record<string, string>;
  prodi_list: string[];
  data: PembiayaanProdiItem[];
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

function buildParamsNoTahun(
  degree: string,
  jurusan: string,
  prodi: string,
  weekKey: string
): Record<string, string> {
  const p: Record<string, string> = {};
  if (degree  && degree  !== "__all__") p.jenjang         = degree;
  if (jurusan && jurusan !== "__all__") p.jurusan         = jurusan;
  if (prodi   && prodi   !== "__all__") p.nama_prodi      = prodi;
  if (weekKey)                         p.minggu_snapshot = weekKey;
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePembiayaanPie
// ─────────────────────────────────────────────────────────────────────────────

export function usePembiayaanPie() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, tahunLulus, weekKey),
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  return useQuery<PembiayaanPieResponse>({
    queryKey: ["pembiayaan", "pie", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/pembiayaan/pie", { params, signal })
        .then((res) => res?.data ?? res),
    staleTime: 5 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePembiayaanAntarPeriode  (antar tahun_lulus — tanpa filter tahun)
// ─────────────────────────────────────────────────────────────────────────────

export function usePembiayaanAntarPeriode() {
  const { degree, jurusan, prodi, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParamsNoTahun(degree, jurusan, prodi, weekKey),
    [degree, jurusan, prodi, weekKey]
  );

  return useQuery<PembiayaanAntarPeriodeResponse>({
    queryKey: ["pembiayaan", "antar-periode", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/pembiayaan/antar-periode", { params, signal })
        .then((res) => res?.data ?? res),
    staleTime: 5 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePembiayaanDrillDown  (lazy)
// ─────────────────────────────────────────────────────────────────────────────

export function usePembiayaanDrillDown() {
  const { degree, jurusan, prodi } = useGlobalFilters();

  const [data, setData]       = useState<PembiayaanDrillDownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  const fetch = useCallback(
    (extra: PembiayaanDrillDownParams) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {
        page:     String(extra.page     ?? 1),
        per_page: String(extra.per_page ?? 15),
      };
      if (degree  && degree  !== "__all__") params.jenjang    = degree;
      if (jurusan && jurusan !== "__all__") params.jurusan    = jurusan;
      if (prodi   && prodi   !== "__all__") params.nama_prodi = prodi;
      if (extra.sumber_biaya) params.sumber_biaya = extra.sumber_biaya;
      if (extra.tahun_lulus)  params.tahun_lulus  = extra.tahun_lulus;
      if (extra.search)       params.search       = extra.search;

      apiService
        .get<any>("/dashboard/pembiayaan/drill-down", { params, signal: abortRef.current.signal })
        .then((res) => { setData(res?.data ?? res); setLoading(false); })
        .catch((err: any) => {
          if (err?.name === "CanceledError" || err?.name === "AbortError") return;
          setError(err?.message ?? "Gagal memuat data alumni");
          setLoading(false);
        });
    },
    [degree, jurusan, prodi]
  );

  return { data, loading, error, fetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePembiayaanPerProdi
// ─────────────────────────────────────────────────────────────────────────────

export function usePembiayaanPerProdi() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, tahunLulus, weekKey),
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  return useQuery<PembiayaanPerProdiResponse>({
    queryKey: ["pembiayaan", "per-prodi", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/pembiayaan/per-prodi", { params, signal })
        .then((res) => res?.data ?? res),
    staleTime: 5 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePembiayaanBandingkan  (lazy — aktif hanya saat compare mode)
// ─────────────────────────────────────────────────────────────────────────────

export function usePembiayaanBandingkan(enabled: boolean) {
  const sp = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const jenjang    = sp.get("jenjang")         ?? "";
  const jurusan    = sp.get("jurusan")         ?? "";
  const tahunLulus = sp.get("tahun_lulus")     ?? "";
  const weekKey    = sp.get("minggu_snapshot") ?? "";

  const params: Record<string, string> = {};
  if (jenjang)    params.jenjang         = jenjang;
  if (jurusan)    params.jurusan         = jurusan;
  if (tahunLulus) params.tahun_lulus     = tahunLulus;
  if (weekKey)    params.minggu_snapshot = weekKey;

  return useQuery<PembiayaanBandingkanResponse>({
    queryKey: ["pembiayaan", "bandingkan", jenjang, jurusan, tahunLulus, weekKey],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/pembiayaan/bandingkan", { params, signal })
        .then((res) => res?.data ?? res),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}
