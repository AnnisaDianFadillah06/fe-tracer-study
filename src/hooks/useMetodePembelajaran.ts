import { useState, useEffect, useMemo, useRef } from "react";
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

  const [data, setData]       = useState<MetodeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    apiService
      .get<any>("/dashboard/kompetensi/metode", {
        params: buildParams(degree, jurusan, prodi, tahunLulus, weekKey),
        signal: abortRef.current.signal,
      })
      .then((res) => { setData(res?.data ?? res); setLoading(false); })
      .catch((err: any) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data metode pembelajaran");
        setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [degree, jurusan, prodi, tahunLulus, weekKey, updatedTs]);

  return { data, loading, error };
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
