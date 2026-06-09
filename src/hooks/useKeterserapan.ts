import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { apiService } from "@/lib/apiClient";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BreakdownItem {
  status: string;
  count: number;
  pct: number;
  kategori?: "terserap" | "tidak";
}

export interface BarDataItem {
  tahun_lulus: number;
  total: number;
  count_terserap: number;
  pct_terserap: number;
  count_tidak: number;
  pct_tidak: number;
  breakdown: BreakdownItem[];
}

export interface BarResponse {
  chart_type: string;
  filters: Record<string, string>;
  available_tahun: string[];
  status_terserap: string[];
  data: BarDataItem[];
}

export interface PieDataItem {
  status: string;
  count: number;
  pct: number;
}

export interface PieResponse {
  chart_type: string;
  filters: Record<string, string>;
  total: number;
  data: PieDataItem[];
  /** Tahun aktual yang dipakai BE (selalu satu tahun) */
  tahun_aktif?: number | string;
}

export interface DrillDownStudent {
  nama: string;
  nim: string;
  nama_prodi: string;
  jenjang: string;
  tahun_lulus: string;
  status?: string;
}

export interface DrillDownPagination {
  page: number;
  per_page: number;
  total_on_page: number;
  total?: number;
}

export interface DrillDownResponse {
  status: string;
  filters: Record<string, string>;
  pagination: DrillDownPagination;
  data: DrillDownStudent[];
}

export interface BandingkanProdiItem {
  nama_prodi: string;
  jenjang: string;
  jurusan: string;
  total: number;
  statuses: { label: string; count: number; pct: number }[];
}

export interface BandingkanResponse {
  filters: Record<string, string>;
  prodi_list: string[];
  chart: BandingkanProdiItem[];
  table: BandingkanProdiItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build params — stable (tidak buat object baru tiap render)
// ─────────────────────────────────────────────────────────────────────────────

function buildBaseParams(
  degree: string,
  jurusan: string,
  prodi: string,
  tahunLulus: string,
  weekKey: string
): Record<string, string> {
  const p: Record<string, string> = {};
  if (degree && degree !== "__all__") p.jenjang = degree;
  if (jurusan && jurusan !== "__all__") p.jurusan = jurusan;
  if (prodi && prodi !== "__all__") p.nama_prodi = prodi;
  if (tahunLulus && tahunLulus !== "all") p.tahun_lulus = tahunLulus;
  if (weekKey) p.minggu_snapshot = weekKey;
  return p;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useKeterserapanBar
// ─────────────────────────────────────────────────────────────────────────────

export function useKeterserapanBar() {
  const { degree, jurusan, prodi, weekKey, lastUpdatedAt } = useGlobalFilters();
  // Stabilkan lastUpdatedAt jadi timestamp number supaya tidak trigger ulang
  // setiap kali GlobalFiltersContext re-render dengan new Date()
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  const [data, setData] = useState<BarResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    // Bar tidak pakai tahun_lulus — itu sumbu X
    const params = buildBaseParams(degree, jurusan, prodi, "all", weekKey);

    apiService
      .get<any>("/dashboard/keterserapan/bar", { params, signal: abortRef.current.signal })
      .then((res) => {
        setData(res?.data ?? res);
        setLoading(false);
      })
      .catch((err: any) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat data keterserapan");
        setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [degree, jurusan, prodi, weekKey, updatedTs]);

  return { data, loading, error };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useKeterserapanPie
// ─────────────────────────────────────────────────────────────────────────────

export function useKeterserapanPie() {
  const { degree, jurusan, prodi, tahunLulus, weekKey, lastUpdatedAt, filterOptions } = useGlobalFilters();
  const updatedTs = useMemo(() => lastUpdatedAt.getTime(), [lastUpdatedAt]);

  // Tahun yang benar-benar dikirim ke BE:
  // - jika user pilih tahun → pakai itu
  // - jika "all" → kirim tahun terakhir dari filterOptions (default BE = tampilkan 1 tahun)
  const tahunEfektif = useMemo(() => {
    if (tahunLulus && tahunLulus !== "all") return tahunLulus;
    if (filterOptions.tahunLulus.length > 0) return filterOptions.tahunLulus[0]; // sudah urut desc
    return "";
  }, [tahunLulus, filterOptions.tahunLulus]);

  const [data, setData] = useState<PieResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Tunggu filterOptions selesai load dulu sebelum fetch
    if (filterOptions.loading) return;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    const params = buildBaseParams(degree, jurusan, prodi, tahunEfektif, weekKey);

    apiService
      .get<any>("/dashboard/keterserapan/pie", { params, signal: abortRef.current.signal })
      .then((res) => {
        const payload: PieResponse = res?.data ?? res;
        // Simpan tahun efektif ke dalam data supaya subtitle bisa pakai
        payload.tahun_aktif = tahunEfektif;
        setData(payload);
        setLoading(false);
      })
      .catch((err: any) => {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setError(err?.message ?? "Gagal memuat distribusi status");
        setLoading(false);
      });

    return () => { abortRef.current?.abort(); };
  }, [degree, jurusan, prodi, tahunEfektif, weekKey, updatedTs, filterOptions.loading]);

  return { data, loading, error, tahunEfektif };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook: useKeterserapanDrillDown  (lazy)
// ─────────────────────────────────────────────────────────────────────────────

export interface DrillDownParams {
  status?: string;
  tahun_lulus?: string | number;
  page?: number;
  per_page?: number;
  search?: string;
}

export function useKeterserapanDrillDown() {
  const { degree, jurusan, prodi, weekKey } = useGlobalFilters();

  const [data, setData] = useState<DrillDownResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetch = useCallback(
    (extra: DrillDownParams) => {
      if (!extra.status && !extra.tahun_lulus) return;
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();
      setLoading(true);
      setError(null);

      const base = buildBaseParams(degree, jurusan, prodi, "all", weekKey);
      const params: Record<string, string> = {
        ...base,
        // default selalu terserap kecuali di-override eksplisit
        status: extra.status ?? "terserap",
        ...(extra.tahun_lulus ? { tahun_lulus: String(extra.tahun_lulus) } : {}),
        page: String(extra.page ?? 1),
        per_page: String(extra.per_page ?? 15),
        ...(extra.search ? { search: extra.search } : {}),
      };

      apiService
        .get<any>("/dashboard/keterserapan/drill-down", { params, signal: abortRef.current.signal })
        .then((res) => {
          setData(res?.data ?? res);
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
// Hook: useKeterserapanBandingkan
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hook untuk halaman compare — baca filter dari URL params bukan dari context,
 * karena GlobalFiltersProvider mungkin tidak membungkus halaman compare.
 * Filter di-encode ke URL saat tombol Bandingkan diklik (lihat KpiCard.tsx).
 */
export function useKeterserapanBandingkan(enabled: boolean) {
  // Baca filter dari URL — ini yang reliabel di halaman compare
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : new URLSearchParams();

  const jenjang    = searchParams.get("jenjang")        ?? "";
  const jurusan    = searchParams.get("jurusan")        ?? "";
  const tahunLulus = searchParams.get("tahun_lulus")    ?? "";
  const weekKey    = searchParams.get("minggu_snapshot") ?? "";

  const [data, setData] = useState<BandingkanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Stable key dari URL params supaya useEffect tidak loop
  const paramKey = `${jenjang}|${jurusan}|${tahunLulus}|${weekKey}`;

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
      .get<any>("/dashboard/keterserapan/bandingkan", { params, signal: abortRef.current.signal })
      .then((res) => {
        const payload: BandingkanResponse = res?.chart ? res : res?.data ?? res;
        setData(payload);
        setLoading(false);
      })
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
// NOTE untuk useKeterserapanBandingkan — serialisasi prodi[]
//
// Axios by default serialisasi array sebagai:
//   prodi[]=D3+Teknik+Informatika&prodi[]=D4+Teknik+Informatika  ✓
//
// Tapi beberapa versi Axios pakai format berbeda tergantung config.
// Kalau BE tidak menerima, tambahkan paramsSerializer ke apiClient:
//
//   import qs from "qs";
//   paramsSerializer: (params) => qs.stringify(params, { arrayFormat: "brackets" })
//
// Format yang BE terima (dari contoh URL): prodi[]=X&prodi[]=Y → "brackets"
// ─────────────────────────────────────────────────────────────────────────────