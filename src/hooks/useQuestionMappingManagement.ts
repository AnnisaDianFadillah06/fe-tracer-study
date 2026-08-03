/**
 * src/hooks/useQuestionMappingManagement.ts
 *
 * React-query hooks untuk fitur Pemetaan Data Pertanyaan (QuestionMappingPage) &
 * halaman ETL Anomaly Log — mirror struktur useThresholdManagement.ts (query key
 * per resource, useMutation + invalidateQueries on success, useToast utk feedback),
 * tapi dipecah jadi hook-hook kecil (gaya useKeterserapanBar/Pie/DrillDown) karena
 * halaman ini adalah wizard multi-langkah dengan banyak state lokal UI yang tetap
 * lebih pas hidup di komponen halaman, bukan di satu hook raksasa.
 *
 * Endpoint-endpoint di sini mengacu ke kontrak semantic-mapping (lihat apiClient.ts):
 * - GET  /semantic-roles
 * - GET  /question-semantic-mappings[?questionnaire_id&is_active]
 * - GET  /question-semantic-mappings/unmapped?questionnaire_id
 * - GET  /question-semantic-mappings/similar?questionnaire_id&question_text&exclude_code
 * - POST /question-semantic-mappings
 * - POST /question-semantic-mappings/{id}/deactivate
 * - GET  /kpi-category-mappings[?semantic_role&digunakan_oleh]
 * - POST /kpi-category-mappings
 * - POST /kpi-category-mappings/{id}/deactivate
 * - GET  /etl-anomaly-log[?etl_run_id&semantic_role&nim&page]
 */

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/common/use-toast";
import {
  apiService,
  type SemanticRole,
  type QuestionSemanticMapping,
  type UnmappedQuestion,
  type SimilarQuestion,
  type CreateQuestionSemanticMappingPayload,
  type KpiCategoryMapping,
  type CreateKpiCategoryMappingPayload,
  type EtlAnomalyLogEntry,
  type LaravelPaginated,
  type EtlRunStatus,
} from "@/lib/apiClient";

// ─────────────────────────────────────────────
// Label tampilan Indonesia untuk `category` semantic_role_registry.
// API hanya mengembalikan raw string (keterserapan, waktu_tunggu, ...) — dipetakan
// di sini supaya SelectGroup/SelectLabel di Langkah 1 enak dibaca. Fallback ke
// title-case dari raw string kalau ada category baru yang belum masuk daftar ini.
// ─────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  keterserapan: "Keterserapan",
  waktu_tunggu: "Waktu Tunggu",
  pendapatan: "Pendapatan",
  kesesuaian_bidang: "Kesesuaian Bidang",
  kesesuaian_level: "Kesesuaian Level",
  studi_lanjut: "Studi Lanjut",
  lokasi_kerja: "Lokasi Kerja",
  perusahaan: "Perusahaan",
  biaya_studi: "Biaya Studi",
  kompetensi: "Kompetensi",
  metode_pembelajaran: "Metode Pembelajaran",
  ketidaksesuaian_kerja: "Ketidaksesuaian Kerja",
};

export const categoryLabel = (category: string): string =>
  CATEGORY_LABELS[category] ??
  category
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

/** Group semantic roles by `category` — urutan mengikuti kemunculan pertama di data API. */
export const groupRolesByCategory = (
  roles: SemanticRole[]
): { category: string; roles: SemanticRole[] }[] => {
  const order: string[] = [];
  const map = new Map<string, SemanticRole[]>();
  for (const r of roles) {
    if (!map.has(r.category)) {
      map.set(r.category, []);
      order.push(r.category);
    }
    map.get(r.category)!.push(r);
  }
  return order.map((category) => ({ category, roles: map.get(category)! }));
};

/** "integer (bulan) · 0–120" / "categorical" — dipakai badge tipe di dropdown role. */
export const formatExpectedKind = (role: Pick<SemanticRole, "expected_kind" | "value_min" | "value_max" | "target_column">): string => {
  const hasRange = role.value_min != null || role.value_max != null;
  if (!hasRange) return role.expected_kind;
  const min = role.value_min ?? "…";
  const max = role.value_max ?? "…";
  return `${role.expected_kind} · ${min}–${max}`;
};

/** Label tampilan Indonesia untuk `digunakan_oleh` yang sudah diseed (lihat kontrak). */
const DIGUNAKAN_OLEH_LABELS: Record<string, string> = {
  iku2_keterserapan: "IKU 2 — Keterserapan Lulusan",
  masa_tunggu_valid_status: "Validitas Status untuk Masa Tunggu",
  kesesuaian_bidang_employed_status: "Validitas Status untuk Kesesuaian Bidang",
  kesesuaian_bidang_relevance: "Kesesuaian Bidang Kerja",
};

export const digunakanOlehLabel = (key: string): string => DIGUNAKAN_OLEH_LABELS[key] ?? categoryLabel(key);

// ─────────────────────────────────────────────
// Semantic Roles
// ─────────────────────────────────────────────

export function useSemanticRoles() {
  const result = useQuery({
    queryKey: ["semantic-roles"],
    queryFn: () => apiService.getSemanticRoles(),
    staleTime: 5 * 60 * 1000,
  });

  const rawRoles = result.data?.data;
  const roles = useMemo(() => rawRoles ?? [], [rawRoles]);

  return {
    roles,
    groupedRoles: useMemo(() => groupRolesByCategory(roles), [roles]),
    roleByKey: useMemo(
      () => Object.fromEntries(roles.map((r) => [r.role_key, r])) as Record<string, SemanticRole>,
      [roles],
    ),
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

/** Kuesioner nasional untuk selector Langkah 1/2 — lihat catatan apiClient.ts. */
export function useMappableQuestionnaires() {
  const result = useQuery({
    queryKey: ["question-semantic-mappings", "questionnaires"],
    queryFn: () => apiService.getMappableQuestionnaires(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    questionnaires: result.data?.data ?? [],
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

// ─────────────────────────────────────────────
// Question Semantic Mapping (Langkah 1)
// ─────────────────────────────────────────────

export function useQuestionSemanticMappings(params?: {
  questionnaire_id?: number;
  is_active?: boolean;
}) {
  const result = useQuery({
    queryKey: ["question-semantic-mappings", params ?? {}],
    queryFn: () => apiService.getQuestionSemanticMappings(params),
    staleTime: 60 * 1000,
  });

  return {
    mappings: result.data?.data ?? [],
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
    refetch: result.refetch,
  };
}

export function useUnmappedQuestions(questionnaireId: number | null) {
  const result = useQuery({
    queryKey: ["question-semantic-mappings", "unmapped", questionnaireId],
    queryFn: () => apiService.getUnmappedQuestions(questionnaireId as number),
    enabled: questionnaireId != null,
    staleTime: 30 * 1000,
  });

  return {
    unmapped: result.data?.data ?? [],
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

/**
 * Pasangan (option_code, option_label) NYATA untuk role ini — satu-satunya
 * sumber sah option_code saat membuat KpiCategoryMapping baru (Langkah 2).
 * Jangan pernah mengarang option_code (mis. slug dari label) di komponen
 * pemanggil — lihat catatan di apiClient.ts.
 */
export function useOptionCandidates(roleKey: string | null) {
  const result = useQuery({
    queryKey: ["question-semantic-mappings", "option-candidates", roleKey],
    queryFn: () => apiService.getOptionCandidates(roleKey as string),
    enabled: roleKey != null,
    staleTime: 60 * 1000,
  });

  return {
    candidates: result.data?.data ?? [],
    loading: roleKey != null && result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

/** Constraint D helper — hanya jalan kalau questionnaire_id & question_text tersedia (kode terpilih). */
export function useSimilarQuestions(params: {
  questionnaire_id?: number | null;
  question_text?: string;
  exclude_code?: string;
}) {
  const enabled = !!params.questionnaire_id && !!params.question_text;
  const result = useQuery({
    queryKey: [
      "question-semantic-mappings",
      "similar",
      params.questionnaire_id ?? null,
      params.question_text ?? "",
      params.exclude_code ?? "",
    ],
    queryFn: () =>
      apiService.getSimilarQuestions({
        questionnaire_id: params.questionnaire_id as number,
        question_text: params.question_text as string,
        exclude_code: params.exclude_code,
      }),
    enabled,
    staleTime: 60 * 1000,
  });

  return {
    similar: result.data?.data ?? [],
    loading: enabled && result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

export function useCreateQuestionSemanticMapping() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateQuestionSemanticMappingPayload) =>
      apiService.createQuestionSemanticMapping(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["question-semantic-mappings"] });
      toast({
        title: "Mapping diaktifkan",
        description: `${res.data?.question_code} → ${res.data?.semantic_role}. ETL berjalan otomatis di background.`,
      });
    },
    onError: (err: any) => {
      const status = err?.response?.status;
      // 409 (role_already_mapped) & 422 (type_mismatch) ditangani inline oleh pemanggil
      // (dialog konflik Constraint A / hard-block pesan type mismatch) — jangan toast
      // generik di sini supaya tidak dobel dengan penanganan khusus di halaman.
      if (status !== 409 && status !== 422) {
        const msg = err?.response?.data?.message ?? err?.message ?? "Gagal menyimpan mapping";
        toast({ title: "Gagal menyimpan mapping", description: msg, variant: "destructive" });
      }
    },
  });
}

export function useDeactivateQuestionSemanticMapping() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => apiService.deactivateQuestionSemanticMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question-semantic-mappings"] });
      toast({ title: "Mapping dinonaktifkan" });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? "Gagal menonaktifkan mapping";
      toast({ title: "Gagal menonaktifkan mapping", description: msg, variant: "destructive" });
    },
  });
}

/**
 * Poll status ETL yang otomatis ter-trigger setelah simpan/nonaktifkan
 * mapping Langkah 1 (RunEtlJob di backend, lihat QuestionSemanticMappingService).
 * Berhenti polling begitu status jadi completed/failed. Dipakai untuk
 * menampilkan UI loading "ETL sedang berjalan..." alih-alih diam tanpa info.
 */
export function useEtlRunStatus(etlRunId: number | null) {
  const result = useQuery({
    queryKey: ["etl-runs", etlRunId],
    queryFn: () => apiService.getEtlRunStatus(etlRunId as number),
    enabled: etlRunId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      return status === "completed" || status === "failed" ? false : 2000;
    },
  });

  const status: EtlRunStatus | undefined = result.data?.data;

  return {
    status: status?.status ?? null,
    summary: status?.summary ?? null,
    errorMessage: status?.error_message ?? null,
    isDone: status?.status === "completed" || status?.status === "failed",
  };
}

// ─────────────────────────────────────────────
// KPI Category Mapping (Langkah 2)
// ─────────────────────────────────────────────

export function useKpiCategoryMappings(params?: {
  semantic_role?: string;
  digunakan_oleh?: string;
}) {
  const result = useQuery({
    queryKey: ["kpi-category-mappings", params ?? {}],
    queryFn: () => apiService.getKpiCategoryMappings(params),
    enabled: !!params?.semantic_role,
    staleTime: 60 * 1000,
  });

  return {
    mappings: result.data?.data ?? [],
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

/**
 * Semua baris kpi_category_mapping (semua semantic_role/digunakan_oleh),
 * AKTIF + NONAKTIF — dipakai tab "Data Tersimpan". all:true wajib di sini:
 * tanpa itu, baris yang dinonaktifkan (mis. lewat tombol Edit) akan hilang
 * dari tampilan audit padahal masih ada di database (forward-only artinya
 * baris tidak pernah dihapus, tapi kalau API selalu memfilter is_active,
 * efeknya sama saja dengan hilang dari sudut pandang admin).
 */
export function useAllKpiCategoryMappings() {
  const result = useQuery({
    queryKey: ["kpi-category-mappings", "all"],
    queryFn: () => apiService.getKpiCategoryMappings({ all: true }),
    staleTime: 60 * 1000,
  });

  return {
    mappings: result.data?.data ?? [],
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

/**
 * Section (digunakan_oleh) apa saja yang PERNAH dikonfigurasi untuk role ini,
 * aktif atau tidak — dipakai Langkah 2 supaya grouping yang semua baris
 * aktifnya kebetulan nonaktif tetap tampil sebagai section yang bisa
 * dikelola, bukan menghilang total (lihat KpiCategoryTaxonomyEntry).
 */
export function useKpiCategoryTaxonomy(semanticRole: string | null) {
  const result = useQuery({
    queryKey: ["kpi-category-mappings", "taxonomy", semanticRole],
    queryFn: () => apiService.getKpiCategoryTaxonomy(semanticRole as string),
    enabled: semanticRole != null,
    staleTime: 60 * 1000,
  });

  return {
    taxonomy: result.data?.data ?? [],
    loading: semanticRole != null && result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

/**
 * Taksonomi SEMUA role sekaligus -> Map<semantic_role, digunakan_oleh[]>.
 * Dipakai selector "role yang sudah aktif" di Langkah 1 supaya admin langsung
 * lihat KPI apa yang dipakai tiap role (mis. status_pekerjaan -> IKU 2
 * Keterserapan) — ini yang menjawab kebingungan "f8 sudah termapping ke
 * status_pekerjaan, saya mau petakan ke keterserapan": keterserapan bukan
 * role terpisah, dia salah satu KPI yang dipakai status_pekerjaan.
 */
export function useKpiCategoryTaxonomyAll() {
  const result = useQuery({
    queryKey: ["kpi-category-mappings", "taxonomy-all"],
    queryFn: () => apiService.getKpiCategoryTaxonomyAll(),
    staleTime: 60 * 1000,
  });

  const byRole = useMemo(() => {
    const map = new Map<string, string[]>();
    (result.data?.data ?? []).forEach((t) => map.set(t.semantic_role, t.digunakan_oleh));
    return map;
  }, [result.data]);

  return {
    byRole,
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

export function useCreateKpiCategoryMapping() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (payload: CreateKpiCategoryMappingPayload) =>
      apiService.createKpiCategoryMapping(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-category-mappings"] });
      // Formula tooltip di chart KPI (Kpi4Absorption dkk) harus ikut refresh —
      // lihat useKpiFormula.ts, query key-nya diawali sama.
      queryClient.invalidateQueries({ queryKey: ["kpi-category-mappings", "formula"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? "Gagal menyimpan kategori KPI";
      toast({ title: "Gagal menyimpan kategori KPI", description: msg, variant: "destructive" });
    },
  });
}

export function useDeactivateKpiCategoryMapping() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => apiService.deactivateKpiCategoryMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-category-mappings"] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? "Gagal menonaktifkan kategori";
      toast({ title: "Gagal menonaktifkan kategori", description: msg, variant: "destructive" });
    },
  });
}

// ─────────────────────────────────────────────
// ETL Anomaly Log
// ─────────────────────────────────────────────

export function useEtlAnomalyLog(params: {
  etl_run_id?: string;
  semantic_role?: string;
  nim?: string;
  page?: number;
}) {
  const result = useQuery<LaravelPaginated<EtlAnomalyLogEntry>>({
    queryKey: ["etl-anomaly-log", params],
    queryFn: () => apiService.getEtlAnomalyLog(params),
    staleTime: 30 * 1000,
  });

  return {
    entries: result.data?.data ?? [],
    total: result.data?.total ?? 0,
    currentPage: result.data?.current_page ?? 1,
    lastPage: result.data?.last_page ?? 1,
    perPage: result.data?.per_page ?? 15,
    loading: result.isLoading,
    error: (result.error as Error | null)?.message ?? null,
  };
}

export type {
  SemanticRole,
  QuestionSemanticMapping,
  UnmappedQuestion,
  SimilarQuestion,
  KpiCategoryMapping,
  EtlAnomalyLogEntry,
};
