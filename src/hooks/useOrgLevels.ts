/**
 * useOrgLevels.ts
 *
 * Fase 5 (DFR-20/DFR-21) — jumlah & label level struktur organisasi aktif,
 * dipakai GlobalFilters.tsx untuk merender N dropdown alih-alih hardcode
 * Jenjang→Jurusan→Prodi.
 *
 * PENTING (lihat cetak-biru-struktur-dinamis.md, gate `role:head_tracer` di
 * routes/api.php): seluruh endpoint `/org-unit-types*` dan `/org-units*`
 * HANYA bisa diakses head_tracer. GlobalFiltersProvider dipasang untuk semua
 * role (termasuk kaprodi/kajur) dan bahkan di halaman publik. Supaya:
 *   1. kaprodi/kajur tidak menembak endpoint yang pasti 403 di setiap page
 *      load (percuma, dan mengotori network tab),
 *   2. dan supaya kegagalan endpoint apa pun (403, network, dll) TIDAK
 *      PERNAH membuat dashboard rusak,
 * hook ini HANYA fetch saat role === "head_tracer", dan degradasi ke
 * `FALLBACK_LEVELS` (1 level "Jurusan", sama seperti struktur Politeknik
 * yang sudah ada) untuk role lain maupun saat fetch gagal apa pun alasannya.
 *
 * `isGeneric` hanya true kalau BE benar-benar mengembalikan >1 level aktif.
 * Untuk seluruh data nyata saat ini (POLBAN, template "politeknik"),
 * `isGeneric` selalu false -- sehingga GlobalFilters.tsx bisa merender
 * JSX lama tanpa perubahan sama sekali di jalur itu.
 */
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuthContext } from "@/contexts/AuthContext";

export interface OrgLevelDef {
  id: number;
  institution_type: string;
  level_index: number;
  label: string;
  is_required: boolean;
}

export interface OrgLevelsState {
  /** Selalu terisi minimal 1 elemen, terurut naik oleh level_index. */
  levels: OrgLevelDef[];
  institutionType: string;
  /** true hanya kalau template aktif BENAR-BENAR >1 level dari BE. */
  isGeneric: boolean;
  loading: boolean;
  error: string | null;
}

const FALLBACK_LEVELS: OrgLevelDef[] = [
  { id: -1, institution_type: "politeknik", level_index: 1, label: "Jurusan", is_required: true },
];

const FALLBACK_STATE: Omit<OrgLevelsState, "loading" | "error"> = {
  levels: FALLBACK_LEVELS,
  institutionType: "politeknik",
  isGeneric: false,
};

const CACHE_KEY = "orgLevels_v1";

function readCache(): OrgLevelDef[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrgLevelDef[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(levels: OrgLevelDef[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(levels));
  } catch {
    // sessionStorage full — silently skip, non-critical cache
  }
}

export function useOrgLevels(): OrgLevelsState {
  const { user, isAuthenticated } = useAuthContext();
  const isHeadTracer = isAuthenticated && user?.role === "head_tracer";

  const [levels, setLevels] = useState<OrgLevelDef[] | null>(() =>
    isHeadTracer ? readCache() : null
  );
  const [institutionType, setInstitutionType] = useState<string>("politeknik");
  const [loading, setLoading] = useState<boolean>(isHeadTracer && !readCache());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Role lain (atau belum login): tidak pernah menembak endpoint
    // head_tracer-only, langsung pakai fallback 1-level (identik POLBAN).
    if (!isHeadTracer) {
      setLevels(null);
      setLoading(false);
      return;
    }
    if (levels) return; // sudah dari cache

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const templateRes = await api.get("/org-unit-types/active-template");
        const activeType: string = templateRes.data?.data?.institution_type ?? "politeknik";
        const levelsRes = await api.get("/org-unit-types", { params: { institution_type: activeType } });
        const rows: OrgLevelDef[] = (levelsRes.data?.data ?? []).slice().sort(
          (a: OrgLevelDef, b: OrgLevelDef) => a.level_index - b.level_index
        );
        if (cancelled) return;
        if (rows.length === 0) {
          // Template belum terisi baris level -- fallback aman, jangan
          // biarkan dashboard tanpa dropdown sama sekali.
          setLevels(null);
          setInstitutionType(activeType);
          return;
        }
        writeCache(rows);
        setLevels(rows);
        setInstitutionType(activeType);
      } catch (err: unknown) {
        // Termasuk kasus 403 (mis. role berubah di tab lain) — degradasi
        // diam-diam ke fallback, JANGAN pernah merusak dashboard karena
        // endpoint admin ini gagal.
        if (!cancelled) {
          setLevels(null);
          setError(err instanceof Error ? err.message : "Gagal memuat struktur level.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHeadTracer]);

  if (!levels || levels.length <= 1) {
    return {
      ...FALLBACK_STATE,
      institutionType: levels && levels.length === 1 ? institutionType : FALLBACK_STATE.institutionType,
      levels: levels && levels.length === 1 ? levels : FALLBACK_LEVELS,
      loading,
      error,
    };
  }

  return {
    levels,
    institutionType,
    isGeneric: true,
    loading,
    error,
  };
}
