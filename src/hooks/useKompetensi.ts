import { useState, useEffect, useMemo, useRef } from "react";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface KompetensiGapItem {
  kode_field: string;
  label: string;
  skor_lulus: number;
  skor_dibutuhkan: number;
  gap: number;           // BE: skor_dibutuhkan - skor_lulus (positif = perlu ditingkatkan)
  count_responden: number;
}

export interface KompetensiGapResponse {
  filters: Record<string, string>;
  data: KompetensiGapItem[];
}

export interface KompetensiIndikatorItem {
  kode_field: string;
  label: string;
  skor_lulus: number;
  skor_dibutuhkan: number;
  gap: number;
  count_responden: number;
}

export interface KompetensiGapBandingkanItem {
  nama_prodi: string;
  jenjang: string;
  indikator: KompetensiIndikatorItem[];
}

export interface KompetensiGapBandingkanResponse {
  filters: Record<string, string>;
  prodi_list: string[];
  data: KompetensiGapBandingkanItem[];
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
// Hook: useKompetensiGap
// ─────────────────────────────────────────────────────────────────────────────

export function useKompetensiGap() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const [data, setData]       = useState<KompetensiGapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const abortRef              = useRef<AbortController | null>(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    apiService
      .get<any>("/dashboard/kompetensi/gap", {
        params: buildParams(degree, jurusan, prodi, tahunLulus, weekKey),
        signal: abortRef.current.signal,
      })
      .then((res) => { setData(res?.data ?? res); setLoading(false); })
      .catch((err: any) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data kompetensi");
        setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [degree, jurusan, prodi, tahunLulus, weekKey, updatedTs]);

  return { data, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useKompetensiGapBandingkan  (lazy — aktif hanya saat compare mode)
// ─────────────────────────────────────────────────────────────────────────────

export function useKompetensiGapBandingkan(enabled: boolean) {
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const jenjang    = searchParams.get("jenjang")         ?? "";
  const jurusan    = searchParams.get("jurusan")         ?? "";
  const tahunLulus = searchParams.get("tahun_lulus")     ?? "";
  const weekKey    = searchParams.get("minggu_snapshot") ?? "";

  const paramKey = `${jenjang}|${jurusan}|${tahunLulus}|${weekKey}`;

  const [data, setData]       = useState<KompetensiGapBandingkanResponse | null>(null);
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
      .get<any>("/dashboard/kompetensi/gap/bandingkan", { params, signal: abortRef.current.signal })
      .then((res) => { setData(res?.data ?? res); setLoading(false); })
      .catch((err: any) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data perbandingan kompetensi");
        setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [enabled, paramKey]);

  return { data, loading, error };
}
