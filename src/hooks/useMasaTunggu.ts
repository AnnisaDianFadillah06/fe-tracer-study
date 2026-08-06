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
  median_masa_tunggu_bekerja: number;
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

// FR-026: pola pencarian kerja — bulan sebelum/sesudah lulus mulai cari kerja + durasi
export interface PolaPencarianKerjaItem {
  nama_prodi: string;
  jenjang: string;
  jurusan: string;
  tahun_lulus: string;
  count_alumni: number;
  avg_bulan_sebelum_lulus: number;
  avg_bulan_sesudah_lulus: number;
  count_mulai_sebelum: number;
  count_mulai_sesudah: number;
  avg_masa_tunggu_bekerja: number;
}

export interface PolaPencarianKerjaResponse {
  filters: Record<string, string>;
  data: PolaPencarianKerjaItem[];
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

/**
 * batasCepatBulan: ambang "cepat" dinamis (dulu selalu 6 bulan) -- sumbernya
 * useLamFilter("waitingTime").dynamicParam?.value (indikator employment_time
 * per LAM version terpilih). undefined = BE pakai default 6 bulan (standar
 * DIKTI, dipakai saat belum ada konteks LAM/prodi terpilih).
 */
export function useMasaTungguBar(batasCepatBulan?: number) {
  const { degree, jurusan, prodi, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (degree  && degree  !== "__all__") p.jenjang         = degree;
    if (jurusan && jurusan !== "__all__") p.jurusan         = jurusan;
    if (prodi   && prodi   !== "__all__") p.nama_prodi      = prodi;
    if (weekKey)                          p.minggu_snapshot = weekKey;
    if (batasCepatBulan != null)          p.batas_cepat_bulan = String(batasCepatBulan);
    return p;
  }, [degree, jurusan, prodi, weekKey, batasCepatBulan]);

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
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt, filterOptions } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  // Distribusi adalah snapshot SATU kohort (subtitle-nya di Kpi5WaitingTimeChart
  // menampilkan "Tahun kelulusan X"), bukan tren lintas tahun -- kalau tidak ada
  // tahun dipilih ("all"), tanpa ini datanya diam-diam menjumlah SEMUA tahun
  // sementara subtitle mengklaim cuma satu tahun (tahun terbaru). Default ke
  // tahun_lulus TERBARU supaya subtitle dan data benar-benar konsisten.
  const effectiveTahun = tahunLulus !== "all" ? tahunLulus : (filterOptions.tahunLulus[0] ?? "all");

  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, effectiveTahun, weekKey),
    [degree, jurusan, prodi, effectiveTahun, weekKey]
  );

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
  /** 'cepat' = <= batas_cepat_bulan dinamis (dipakai bar "% Lulusan <= N Bulan"), BUKAN bucket tetap 0-3. */
  rentang: "cepat" | "0-3" | "3-6" | ">6";
  tahun_lulus?: string;
  nama_prodi?: string;
  page?: number;
  per_page?: number;
  search?: string;
  batas_cepat_bulan?: number;
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
      if (extra.nama_prodi) baseParams.nama_prodi = extra.nama_prodi;
      const params: Record<string, string> = {
        ...baseParams,
        rentang:  extra.rentang,
        page:     String(extra.page ?? 1),
        per_page: String(extra.per_page ?? 15),
        ...(extra.search ? { search: extra.search } : {}),
        ...(extra.batas_cepat_bulan != null ? { batas_cepat_bulan: String(extra.batas_cepat_bulan) } : {}),
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

// ─────────────────────────────────────────────────────────────────────────────
// Hook: usePolaPencarianKerja (FR-026)
// ─────────────────────────────────────────────────────────────────────────────

// FR-027: prediksi tren median masa tunggu periode berikutnya
export interface MasaTungguPrediksiPoint {
  tahun_lulus: string;
  median: number;
  count_alumni?: number;
  is_prediksi: boolean;
}

export interface MasaTungguPrediksiResponse {
  filters: Record<string, string>;
  historis: MasaTungguPrediksiPoint[];
  prediksi: { tahun_lulus: string; median: number; is_prediksi: boolean } | null;
  metodologi: {
    metode: string;
    jumlah_titik_historis: number;
    slope?: number;
    intercept?: number;
    catatan: string;
  };
}

export function useMasaTungguPrediksi() {
  const { degree, jurusan, prodi, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(() => {
    const p: Record<string, string> = {};
    if (degree  && degree  !== "__all__") p.jenjang         = degree;
    if (jurusan && jurusan !== "__all__") p.jurusan         = jurusan;
    if (prodi   && prodi   !== "__all__") p.nama_prodi      = prodi;
    if (weekKey)                          p.minggu_snapshot = weekKey;
    return p;
  }, [degree, jurusan, prodi, weekKey]);

  const result = useQuery<MasaTungguPrediksiResponse>({
    queryKey: ["masa-tunggu", "prediksi", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/masa-tunggu/prediksi", { params, signal })
        .then((res) => res?.data ?? res),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: result.data ?? null,
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

export function usePolaPencarianKerja() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const params = useMemo(
    () => buildParams(degree, jurusan, prodi, tahunLulus, weekKey),
    [degree, jurusan, prodi, tahunLulus, weekKey]
  );

  const result = useQuery<PolaPencarianKerjaResponse>({
    queryKey: ["masa-tunggu", "pola-pencarian", params, updatedTs],
    queryFn: ({ signal }) =>
      apiService.get<any>("/dashboard/masa-tunggu/pola-pencarian", { params, signal })
        .then((res) => res?.data ?? res),
    staleTime: 5 * 60 * 1000,
  });

  return {
    data: result.data ?? null,
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}
