/**
 * src/hooks/useKpiFormula.ts
 *
 * Hook kecil dipakai lintas chart KPI (Kpi4Absorption, Kpi5WaitingTime,
 * Kpi6FieldRelevance, ...) untuk menggantikan teks formula statis ("A + B + C")
 * dengan label opsi status yang benar-benar aktif saat ini di kpi_category_mapping.
 * Sengaja dipisah dari useQuestionMappingManagement.ts (hook admin yang berat)
 * supaya chart-chart dashboard tidak ikut menyeret dependency yang tidak dipakai.
 *
 * GET /kpi-category-mappings/formula?semantic_role=&digunakan_oleh=
 */

import { useQuery } from "@tanstack/react-query";
import { apiService, type KpiFormulaGroup, type KpiFormulaResponse } from "@/lib/apiClient";

export function useKpiFormula(semanticRole: string, digunakanOleh: string) {
  const result = useQuery<KpiFormulaResponse>({
    queryKey: ["kpi-category-mappings", "formula", semanticRole, digunakanOleh],
    queryFn: () =>
      apiService.getKpiCategoryMappingFormula({
        semantic_role: semanticRole,
        digunakan_oleh: digunakanOleh,
      }),
    enabled: !!semanticRole && !!digunakanOleh,
    staleTime: 5 * 60 * 1000,
  });

  return {
    groups: result.data?.groups ?? [],
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

/** Cari satu grup berdasarkan kpi_category (mis. "terserap" / "sesuai" / "valid"). */
export const findFormulaGroup = (
  groups: KpiFormulaGroup[],
  kpiCategory: string,
): KpiFormulaGroup | null => groups.find((g) => g.kpi_category === kpiCategory) ?? null;

/** "Bekerja + Wiraswasta + Melanjutkan Pendidikan" dari sebuah grup, fallback kalau belum ada data. */
export const joinOptions = (group: KpiFormulaGroup | null, fallback: string): string =>
  group && group.options.length > 0 ? group.options.join(" + ") : fallback;
