import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PendapatanBarItem {
  tahun_lulus: string;
  avg_gaji: number;
  min_gaji?: number;
  max_gaji?: number;
  total_alumni_ump: number;
  count_above_ump: number;
  pct_above_ump: number | null;  // null = UMP belum tersedia di OLAP
}

export interface PendapatanBarResponse {
  chart_type: string;
  filters: Record<string, string>;
  available_tahun: string[];
  data: PendapatanBarItem[];
}

export interface PendapatanDistribusiItem {
  tahun_lulus: string;
  total_alumni_ump: number;
  count_below_ump: number;
  count_above_ump: number;
  pct_below_ump: number;
  pct_above_ump: number;
}

export interface PendapatanDistribusiResponse {
  chart_type: string;
  filters: Record<string, string>;
  available_tahun: string[];
  data: PendapatanDistribusiItem[];
}

export interface PendapatanDrillDownStudent {
  nama: string;
  nim: string;
  nama_prodi: string;
  tahun_lulus: string;
  perusahaan: string;
  take_home_pay: number;
  flag_above_ump: number;
}

export interface PendapatanDrillDownResponse {
  segmen: string;
  filters: Record<string, string>;
  pagination: { page: number; per_page: number; total_on_page: number };
  data: PendapatanDrillDownStudent[];
}

export interface PendapatanDrillDownParams {
  segmen_ump?: "above_ump" | "below_ump";
  tahun_lulus?: string;
  nama_prodi?: string;
  page?: number;
  per_page?: number;
  search?: string;
}

export interface PendapatanBandingkanItem {
  nama_prodi: string;
  jenjang: string;
  jurusan: string;
  total: number;
  avg_gaji: number;
  statuses: { label: string; count: number; pct: number }[];
}

export interface PendapatanBandingkanResponse {
  filters: Record<string, string>;
  prodi_list: string[];
  chart: PendapatanBandingkanItem[];
  table: PendapatanBandingkanItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — pendapatan bar/distribusi tidak pakai tahun_lulus (itu sumbu X)
// ─────────────────────────────────────────────────────────────────────────────

function buildParams(
  degree: string,
  jurusan: string,
  prodi: string,
  weekKey: string
): Record<string, string> {
  const p: Record<string, string> = {};
  if (degree  && degree  !== "__all__") p.jenjang         = degree;
  if (jurusan && jurusan !== "__all__") p.jurusan         = jurusan;
  if (prodi   && prodi   !== "__all__") p.nama_prodi      = prodi;
  if (weekKey)                          p.minggu_snapshot = weekKey;
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePendapatanBar
// ─────────────────────────────────────────────────────────────────────────────

export function usePendapatanBar() {
  const { degree, jurusan, prodi, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, weekKey),
    [degree, jurusan, prodi, weekKey]
  );

  const result = useQuery<PendapatanBarResponse>({
    queryKey: ["pendapatan", "bar", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/pendapatan/bar", { params, signal })
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
// Hook: usePendapatanDistribusi
// ─────────────────────────────────────────────────────────────────────────────

export function usePendapatanDistribusi() {
  const { degree, jurusan, prodi, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, weekKey),
    [degree, jurusan, prodi, weekKey]
  );

  const result = useQuery<PendapatanDistribusiResponse>({
    queryKey: ["pendapatan", "distribusi", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/pendapatan/distribusi", { params, signal })
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
// Hook: usePendapatanDrillDown  (lazy)
// ─────────────────────────────────────────────────────────────────────────────

export function usePendapatanDrillDown() {
  const { degree, jurusan, prodi, weekKey } = useGlobalFilters();

  const [data, setData]       = useState<PendapatanDrillDownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  const fetch = useCallback(
    (extra: PendapatanDrillDownParams) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);

      const base = buildParams(degree, jurusan, extra.nama_prodi ?? prodi, weekKey);
      const params: Record<string, string> = {
        ...base,
        page:     String(extra.page     ?? 1),
        per_page: String(extra.per_page ?? 15),
        ...(extra.segmen_ump  ? { segmen_ump:  extra.segmen_ump  } : {}),
        ...(extra.tahun_lulus ? { tahun_lulus: extra.tahun_lulus } : {}),
        ...(extra.search      ? { search:      extra.search      } : {}),
      };

      apiService
        .get<any>("/dashboard/pendapatan/drill-down", { params, signal: abortRef.current.signal })
        .then((res) => {
          const raw = res?.data ?? res;
          if (raw?.data) {
            raw.data = raw.data.map((item: any) => ({
              ...item,
              jenjang: item.jenjang ?? item.nama_prodi?.match(/^[A-Z]-?\d/)?.[0]?.replace("-", "") ?? "",
            }));
          }
          setData(raw);
          setLoading(false);
        })
        .catch((err: any) => {
          if (err?.name === "CanceledError" || err?.name === "AbortError") return;
          setError(err?.message ?? "Gagal memuat data alumni");
          setLoading(false);
        });
    },
    [degree, jurusan, prodi, weekKey]
  );

  return { data, loading, error, fetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePendapatanBandingkan
// ─────────────────────────────────────────────────────────────────────────────

export function usePendapatanKelompokBandingkan(enabled: boolean) {
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const jenjang    = searchParams.get("jenjang")         ?? "";
  const jurusan    = searchParams.get("jurusan")         ?? "";
  const tahunLulus = searchParams.get("tahun_lulus")     ?? "";
  const weekKey    = searchParams.get("minggu_snapshot") ?? "";

  const paramKey = `${jenjang}|${jurusan}|${tahunLulus}|${weekKey}`;

  const [data, setData]       = useState<PendapatanBandingkanResponse | null>(null);
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
      .get<any>("/dashboard/pendapatan/bandingkan", { params, signal: abortRef.current.signal })
      .then((res) => { setData(res?.data ?? res); setLoading(false); })
      .catch((err: any) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data perbandingan kelompok pendapatan");
        setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [enabled, paramKey]);

  return { data, loading, error };
}

export function usePendapatanBandingkan(enabled: boolean) {
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const jenjang    = searchParams.get("jenjang")         ?? "";
  const jurusan    = searchParams.get("jurusan")         ?? "";
  const tahunLulus = searchParams.get("tahun_lulus")     ?? "";
  const weekKey    = searchParams.get("minggu_snapshot") ?? "";

  const paramKey = `${jenjang}|${jurusan}|${tahunLulus}|${weekKey}`;

  const [data, setData]       = useState<PendapatanBandingkanResponse | null>(null);
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
      .get<any>("/dashboard/pendapatan/bandingkan", { params, signal: abortRef.current.signal })
      .then((res) => { setData(res?.data ?? res); setLoading(false); })
      .catch((err: any) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data perbandingan pendapatan");
        setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [enabled, paramKey]);

  return { data, loading, error };
}
