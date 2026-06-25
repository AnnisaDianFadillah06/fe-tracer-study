import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MasaTungguBarItem {
  nama_prodi: string;
  jenjang: string;
  jurusan: string;
  tahun_lulus: string;
  count_alumni: number;
  count_terserap: number;
  count_masa_tunggu_cepat: number;
  pct_cepat: number;
  avg_masa_tunggu_bekerja: number;
}

export interface MasaTungguBarResponse {
  filters: Record<string, string>;
  data: MasaTungguBarItem[];
}

export interface MasaTungguDistribusiItem {
  nama_prodi: string;
  jenjang: string;
  tahun_lulus: string;
  count_tunggu_0_3_bulan: number;
  count_tunggu_3_6_bulan: number;
  count_tunggu_lebih_6_bulan: number;
  avg_masa_tunggu_bekerja: number;
  min_masa_tunggu_bekerja: number;
  max_masa_tunggu_bekerja: number;
}

export interface MasaTungguDistribusiResponse {
  filters: Record<string, string>;
  data: MasaTungguDistribusiItem[];
}

export interface MasaTungguDrillDownStudent {
  nama: string;
  nim: string;
  nama_prodi: string;
  jenjang: string;
  tahun_lulus: string;
  masa_tunggu_bekerja: number;
  status: string;
}

export interface MasaTungguDrillDownResponse {
  rentang: string;
  filters: Record<string, string>;
  pagination: { page: number; per_page: number; total_on_page: number };
  data: MasaTungguDrillDownStudent[];
}

export interface MasaTungguBandingkanItem {
  nama_prodi: string;
  jenjang: string;
  tahun_lulus: string;
  count_tunggu_0_3_bulan: number;
  count_tunggu_3_6_bulan: number;
  count_tunggu_lebih_6_bulan: number;
  avg_masa_tunggu_bekerja: number;
  min_masa_tunggu_bekerja: number;
  max_masa_tunggu_bekerja: number;
  pct_cepat: number;
}

export interface MasaTungguBandingkanResponse {
  filters: Record<string, string>;
  prodi_list: string[];
  data: MasaTungguBandingkanItem[];
}

const BE_READY = true;

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder kosong — dipakai saat BE_READY = false (endpoint belum tersedia)
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_BAR:       MasaTungguBarResponse       = { filters: {}, data: [] };
const EMPTY_DISTRIBUSI: MasaTungguDistribusiResponse = { filters: {}, data: [] };
const EMPTY_BANDINGKAN: MasaTungguBandingkanResponse = { filters: {}, prodi_list: [], data: [] };

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
  if (degree    && degree    !== "__all__") p.jenjang         = degree;
  if (jurusan   && jurusan   !== "__all__") p.jurusan         = jurusan;
  if (prodi     && prodi     !== "__all__") p.nama_prodi      = prodi;
  if (tahunLulus && tahunLulus !== "all")   p.tahun_lulus     = tahunLulus;
  if (weekKey)                              p.minggu_snapshot = weekKey;
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useMasaTungguBar
// ─────────────────────────────────────────────────────────────────────────────

export function useMasaTungguBar() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (degree  && degree  !== "__all__") p.jenjang         = degree;
    if (jurusan && jurusan !== "__all__") p.jurusan         = jurusan;
    if (prodi   && prodi   !== "__all__") p.nama_prodi      = prodi;
    if (tahunLulus && tahunLulus !== "all") p.tahun_lulus    = tahunLulus;
    else p.tahun_lulus = "2024";
    if (weekKey)                          p.minggu_snapshot = weekKey;
    return p;
  }, [degree, jurusan, prodi, tahunLulus, weekKey]);

  const result = useQuery<MasaTungguBarResponse>({
    queryKey: ["masa-tunggu", "bar", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/masa-tunggu/bar", { params, signal })
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
// Hook: useMasaTungguDistribusi
// ─────────────────────────────────────────────────────────────────────────────

export function useMasaTungguDistribusi() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(() => {
    const p = buildParams(degree, jurusan, prodi, tahunLulus, weekKey);
    if (!p.tahun_lulus) p.tahun_lulus = "2024";
    return p;
  }, [degree, jurusan, prodi, tahunLulus, weekKey]);

  const result = useQuery<MasaTungguDistribusiResponse>({
    queryKey: ["masa-tunggu", "distribusi", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/masa-tunggu/distribusi", { params, signal })
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
// Hook: useMasaTungguDrillDown  (lazy)
// ─────────────────────────────────────────────────────────────────────────────

export interface MasaTungguDrillDownParams {
  rentang: "0-3" | "3-6" | ">6";
  tahun_lulus?: string;
  page?: number;
  per_page?: number;
  search?: string;
}

export function useMasaTungguDrillDown() {
  const { degree, jurusan, prodi, tahunLulus, weekKey } = useGlobalFilters();

  const [data, setData]       = useState<MasaTungguDrillDownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  const fetch = useCallback(
    (extra: MasaTungguDrillDownParams) => {
      if (!BE_READY) {
        setData({ rentang: extra.rentang, filters: {}, pagination: { page: 1, per_page: 15, total_on_page: 0 }, data: [] });
        setLoading(false);
        return;
      }

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);

      const baseParams = buildParams(degree, jurusan, prodi, tahunLulus, weekKey);
      if (extra.tahun_lulus) baseParams.tahun_lulus = extra.tahun_lulus;
      const params: Record<string, string> = {
        ...baseParams,
        rentang:  extra.rentang,
        page:     String(extra.page ?? 1),
        per_page: String(extra.per_page ?? 15),
        ...(extra.search ? { search: extra.search } : {}),
      };

      apiService
        .get<any>("/dashboard/masa-tunggu/drill-down", { params, signal: abortRef.current.signal })
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

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useMasaTungguBandingkan
// ─────────────────────────────────────────────────────────────────────────────

export function useMasaTungguBandingkan(enabled: boolean) {
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const jenjang    = searchParams.get("jenjang")         ?? "";
  const jurusan    = searchParams.get("jurusan")         ?? "";
  const tahunLulus = searchParams.get("tahun_lulus")     ?? "";
  const weekKey    = searchParams.get("minggu_snapshot") ?? "";

  const paramKey = `${jenjang}|${jurusan}|${tahunLulus}|${weekKey}`;

  const [data, setData]       = useState<MasaTungguBandingkanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (!BE_READY) { setData(EMPTY_BANDINGKAN); setLoading(false); return; }

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
      .get<any>("/dashboard/masa-tunggu/bandingkan", { params, signal: abortRef.current.signal })
      .then((res) => { setData(res?.data ?? res); setLoading(false); })
      .catch((err: any) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data perbandingan");
        setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [enabled, paramKey]);

  return { data, loading, error };
}
