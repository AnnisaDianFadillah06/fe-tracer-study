import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WirausahaBarItem {
  nama_prodi: string;
  jenjang: string;
  tahun_lulus: string;
  count_alumni: number;
  count_wirausaha: number;
  pct_wirausaha: number;
  avg_masa_tunggu_wirausaha: number;
}

export interface WirausahaBarResponse {
  filters: Record<string, string>;
  data: WirausahaBarItem[];
}

export interface WirausahaTingkatItem {
  label: string;
  count: number;
  pct: number;
  sub_labels?: string[];
}

export interface WirausahaSebaranKotaItem {
  nama_kota: string;
  nama_provinsi: string;
  count: number;
}

export interface WirausahaPieResponse {
  chart_type: string;
  filters: Record<string, string>;
  total: number;
  posisi: WirausahaTingkatItem[];       // field dari BE adalah "posisi" bukan "tingkat"
  sebaran_kota: WirausahaSebaranKotaItem[];
}

export interface WirausahaDrillDownStudent {
  nama: string;
  nim: string;
  nama_prodi: string;
  jenjang: string;
  tahun_lulus: string;
  jabatan: string;
  nama_kota: string;
  nama_provinsi: string;
  tingkat_instansi: string;
  masa_tunggu_wirausaha: number;
}

export interface WirausahaDrillDownResponse {
  tingkat: string;
  filters: Record<string, string>;
  pagination: { page: number; per_page: number; total_on_page: number };
  data: WirausahaDrillDownStudent[];
}

export interface WirausahaDrillDownParams {
  tingkat?: string;
  jabatan?: string;
  jabatan_values?: string[];
  tahun_lulus?: string;
  page?: number;
  per_page?: number;
  search?: string;
}

export interface WirausahaBandingkanTingkat {
  label: string;
  count: number;
  pct: number;
}

export interface WirausahaBandingkanItem {
  nama_prodi: string;
  jenjang: string;
  total_alumni: number;
  count_wirausaha: number;
  pct_wirausaha: number;
  avg_masa_tunggu_wirausaha: number;
  tingkat: WirausahaBandingkanTingkat[];
}

export interface WirausahaBandingkanResponse {
  filters: Record<string, string>;
  prodi_list: string[];
  chart: WirausahaBandingkanItem[];
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
// Hook: useWirausahaBar  (tidak filter tahun — tahun_lulus adalah sumbu X)
// ─────────────────────────────────────────────────────────────────────────────

export function useWirausahaBar() {
  const { degree, jurusan, prodi, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  // Bar tidak pakai tahun_lulus — itu sumbu X
  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, "all", weekKey),
    [degree, jurusan, prodi, weekKey]
  );

  const result = useQuery<WirausahaBarResponse>({
    queryKey: ["wirausaha", "bar", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/wirausaha/bar", { params, signal })
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
// Hook: useWirausahaPie
// ─────────────────────────────────────────────────────────────────────────────

export function useWirausahaPie() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, tahunLulus, weekKey),
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  const result = useQuery<WirausahaPieResponse>({
    queryKey: ["wirausaha", "pie", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/wirausaha/pie", { params, signal })
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
// Hook: useWirausahaDrillDown  (lazy)
// ─────────────────────────────────────────────────────────────────────────────

export function useWirausahaDrillDown() {
  const { degree, jurusan, prodi, tahunLulus, weekKey } = useGlobalFilters();

  const [data, setData]       = useState<WirausahaDrillDownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  const fetch = useCallback(
    (extra: WirausahaDrillDownParams) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {
        ...buildParams(degree, jurusan, prodi, extra.tahun_lulus ?? tahunLulus, weekKey),
        ...(extra.tingkat ? { tingkat: extra.tingkat } : {}),
        ...(extra.jabatan ? { jabatan: extra.jabatan } : {}),
        ...(extra.jabatan_values?.length ? { jabatan_values: extra.jabatan_values.join(',') } : {}),
        page:     String(extra.page ?? 1),
        per_page: String(extra.per_page ?? 15),
        ...(extra.search ? { search: extra.search } : {}),
      };

      apiService
        .get<any>("/dashboard/wirausaha/drill-down", { params, signal: abortRef.current.signal })
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
// Hook: useWirausahaBandingkan
// ─────────────────────────────────────────────────────────────────────────────

export function useWirausahaBandingkan(enabled: boolean) {
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const jenjang    = searchParams.get("jenjang")         ?? "";
  const jurusan    = searchParams.get("jurusan")         ?? "";
  const tahunLulus = searchParams.get("tahun_lulus")     ?? "";
  const weekKey    = searchParams.get("minggu_snapshot") ?? "";

  const paramKey = `${jenjang}|${jurusan}|${tahunLulus}|${weekKey}`;

  const [data, setData]       = useState<WirausahaBandingkanResponse | null>(null);
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
      .get<any>("/dashboard/wirausaha/bandingkan", { params, signal: abortRef.current.signal })
      .then((res) => { setData(res?.data ?? res); setLoading(false); })
      .catch((err: any) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data perbandingan wirausaha");
        setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [enabled, paramKey]);

  return { data, loading, error };
}
