/**
 * useOrgUnitTree.ts
 *
 * Fase 5 (DFR-20/21) — pohon unit organisasi lengkap, dipakai GlobalFilters.tsx
 * HANYA saat `orgLevels.isGeneric` true (template aktif >1 level). Endpoint
 * `/org-units/tree` head_tracer-only (lihat catatan di useOrgLevels.ts), jadi
 * hook ini juga di-gate `enabled` dari luar supaya tidak pernah ditembak pada
 * kasus 1-level (POLBAN) atau oleh role selain head_tracer.
 */
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { OrgUnitNode } from "@/lib/orgLevelCascade";

export interface OrgUnitTreeState {
  tree: OrgUnitNode[];
  loading: boolean;
  error: string | null;
}

export function useOrgUnitTree(enabled: boolean): OrgUnitTreeState {
  const [tree, setTree] = useState<OrgUnitNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/org-units/tree");
        if (!cancelled) setTree(res.data?.data ?? []);
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat unit organisasi.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { tree, loading, error };
}
