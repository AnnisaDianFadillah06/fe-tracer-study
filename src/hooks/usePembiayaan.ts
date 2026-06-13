import { useMemo } from "react";
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

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePembiayaanPie
// Data di-cache 5 menit — tab visit ulang tidak perlu loading lagi
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
