/**
 * useFilterOptions
 * Fetches /dashboard/meta/filter-options once and caches in sessionStorage.
 * Types live in filterOptions.types.ts to avoid circular deps with api.ts.
 */
import { useEffect, useState } from "react";
import { apiService } from "@/lib/apiClient";

export interface RawJurusan {
  jurusan: string;
  jenjang: string;
}
 
export interface RawProdi {
  id: number;
  nama_prodi: string;
  jurusan: string;
  jenjang: string;
  kode_prodi: string;
}
 
export interface RawFilterOptionsData {
  tahun_lulus: string[];
  snapshot: string[];   // e.g. "2024-W06"
  jenjang: string[];
  jurusan: RawJurusan[];
  prodi: RawProdi[];
}
 
/** Full API response wrapper */
export interface FilterOptionsResponse {
  success: boolean;
  data: RawFilterOptionsData;
}

// ─── Public derived shapes ────────────────────────────────────────────────────

/** jurusan name → list of nama_prodi that belong to it */
export type JurusanMap = Record<string, string[]>;

export interface FilterOptions {
  tahunLulus: string[];     // ["2025", "2024", …]
  weekOptions: string[];    // formatted label  → "2024 Minggu 06"
  weekKeys: string[];       // raw ISO key      → "2024-W06"  (same index)
  jenjang: string[];        // ["D3", "D4"]
  jurusanList: string[];    // ordered unique jurusan names from BE
  jurusanMap: JurusanMap;   // jurusan → prodi[]
  prodiList: RawProdi[];    // full prodi objects
  loading: boolean;
  error: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "2024-W06" → "2024 Minggu 06". Returns raw string on unexpected format. */
function formatSnapshotLabel(raw: string): string {
  const match = raw.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return raw;
  const [, year, week] = match;
  return `${year} Minggu ${week}`;
}

function buildJurusanMap(prodiList: RawProdi[]): JurusanMap {
  return prodiList.reduce<JurusanMap>((acc, p) => {
    if (!acc[p.jurusan]) acc[p.jurusan] = [];
    if (!acc[p.jurusan].includes(p.nama_prodi)) {
      acc[p.jurusan].push(p.nama_prodi);
    }
    return acc;
  }, {});
}

const CACHE_KEY = "filterOptions_v2";

function readCache(): RawFilterOptionsData | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as RawFilterOptionsData) : null;
  } catch {
    sessionStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function writeCache(data: RawFilterOptionsData) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage full — silently skip
  }
}

function deriveOptions(raw: RawFilterOptionsData): Omit<FilterOptions, "loading" | "error"> {
  const weekKeys = raw.snapshot;
  const weekOptions = weekKeys.map(formatSnapshotLabel);
  const jurusanMap = buildJurusanMap(raw.prodi);
  // Preserve BE ordering from the jurusan array
  const jurusanList = raw.jurusan.map((j) => j.jurusan);

  return {
    tahunLulus: raw.tahun_lulus,
    weekOptions,
    weekKeys,
    jenjang: raw.jenjang,
    jurusanList,
    jurusanMap,
    prodiList: raw.prodi,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFilterOptions(): FilterOptions {
  const [derived, setDerived] = useState<Omit<FilterOptions, "loading" | "error"> | null>(
    () => {
      const cached = readCache();
      return cached ? deriveOptions(cached) : null;
    }
  );
  const [loading, setLoading] = useState<boolean>(!readCache());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Already hydrated from cache in initial state — no fetch needed
    if (derived) return;

    let cancelled = false;

    async function fetchOptions() {
      try {
        const res = await apiService.getFilterOptions();
        if (cancelled) return;
        writeCache(res.data);
        setDerived(deriveOptions(res.data));
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? "Gagal memuat opsi filter");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchOptions();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const empty: FilterOptions = {
    tahunLulus: [], weekOptions: [], weekKeys: [],
    jenjang: [], jurusanList: [], jurusanMap: {}, prodiList: [],
    loading, error,
  };

  return derived ? { ...derived, loading, error } : empty;
}

/**
 * Call this after admin actions that modify prodi/jurusan data so the next
 * page load re-fetches fresh options from the server.
 */
export function invalidateFilterOptionsCache() {
  sessionStorage.removeItem(CACHE_KEY);
}