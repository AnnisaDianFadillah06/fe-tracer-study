import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface InstansiJenisItem {
  jenis: string;
  count: number;
  pct: number;
}

export interface InstansiJenisResponse {
  chart_type: string;
  filters: Record<string, string>;
  total: number;
  data: InstansiJenisItem[];
}

export interface InstansiTingkatItem {
  label: string;
  count: number;
  pct: number;
}

export interface InstansiProdiItem {
  nama_prodi: string;
  jenjang: string;
  tingkat: InstansiTingkatItem[];
}

export interface InstansiTingkatResponse {
  filters: Record<string, string>;
  data: InstansiProdiItem[];
}

export interface InstansiDrillDownStudent {
  nama: string;
  nim: string;
  nama_prodi: string;
  jenjang: string;
  tahun_lulus: string;
  nama_kota: string;
  jenis_instansi: string;
  tingkat_instansi: string;
  status: string;
}

export interface InstansiDrillDownResponse {
  jenis_instansi: string | null;
  tingkat_instansi: string | null;
  filters: Record<string, string>;
  pagination: { page: number; per_page: number; total_on_page: number };
  data: InstansiDrillDownStudent[];
}

export interface InstansiDrillDownParams {
  jenis_instansi?: string | string[];
  tingkat_instansi?: string;
  tahun_lulus?: string;
  page?: number;
  per_page?: number;
  search?: string;
}

export interface InstansiBandingkanProdiItem {
  nama_prodi: string;
  jenjang: string;
  total: number;
  jenis: Array<{ label: string; count: number; pct: number }>;
  tingkat: InstansiTingkatItem[];
}

export interface InstansiBandingkanResponse {
  filters: Record<string, string>;
  prodi_list: string[];
  data: InstansiBandingkanProdiItem[];
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
// Hook: useInstansiJenis
// ─────────────────────────────────────────────────────────────────────────────

export function useInstansiJenis() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, tahunLulus, weekKey),
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  const result = useQuery<InstansiJenisResponse>({
    queryKey: ["instansi", "jenis", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/sebaraninstansi/jenis", { params, signal })
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
// Hook: useInstansiTingkat
// ─────────────────────────────────────────────────────────────────────────────

export function useInstansiTingkat() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, tahunLulus, weekKey),
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  const result = useQuery<InstansiTingkatResponse>({
    queryKey: ["instansi", "tingkat", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/sebaraninstansi/tingkat", { params, signal })
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
// Hook: useInstansiDrillDown  (lazy)
// ─────────────────────────────────────────────────────────────────────────────

export function useInstansiDrillDown() {
  const { degree, jurusan, prodi, tahunLulus, weekKey } = useGlobalFilters();

  const [data, setData]       = useState<InstansiDrillDownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  const fetch = useCallback(
    (extra: InstansiDrillDownParams) => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);

      const baseParams = buildParams(degree, jurusan, prodi, tahunLulus, weekKey);
      if (extra.tahun_lulus) baseParams.tahun_lulus = extra.tahun_lulus;
      const params: Record<string, string> = {
        ...baseParams,
        page:     String(extra.page ?? 1),
        per_page: String(extra.per_page ?? 15),
        ...(extra.tingkat_instansi ? { tingkat_instansi: extra.tingkat_instansi } : {}),
        ...(extra.search           ? { search:           extra.search           } : {}),
      };

      const jenisArr = Array.isArray(extra.jenis_instansi)
        ? extra.jenis_instansi
        : extra.jenis_instansi ? [extra.jenis_instansi] : [];

      const searchParams = new URLSearchParams(params);
      jenisArr.forEach((j) => searchParams.append("jenis_instansi[]", j));

      apiService
        .get<any>(`/dashboard/sebaraninstansi/drill-down?${searchParams.toString()}`, { signal: abortRef.current.signal })
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
// Hook: useInstansiBandingkan  (lazy — aktif hanya saat compare mode)
// ─────────────────────────────────────────────────────────────────────────────

export function useInstansiBandingkan(enabled: boolean) {
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const jenjang    = searchParams.get("jenjang")         ?? "";
  const jurusan    = searchParams.get("jurusan")         ?? "";
  const tahunLulus = searchParams.get("tahun_lulus")     ?? "";
  const weekKey    = searchParams.get("minggu_snapshot") ?? "";

  const paramKey = `${jenjang}|${jurusan}|${tahunLulus}|${weekKey}`;

  const [data, setData]       = useState<InstansiBandingkanResponse | null>(null);
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
      .get<any>("/dashboard/sebaraninstansi/bandingkan", { params, signal: abortRef.current.signal })
      .then((res) => { setData(res?.data ?? res); setLoading(false); })
      .catch((err: any) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data perbandingan instansi");
        setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [enabled, paramKey]);

  return { data, loading, error };
}
