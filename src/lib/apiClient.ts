import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
} from "axios";
import { FilterOptionsResponse } from "@/hooks/useFilterOptions";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// ─────────────────────────────────────────────
// Types — LAM System
// ─────────────────────────────────────────────

export interface ApiResponse<T> {
  status?: string;
  message?: string;
  data?: T;
  success?: boolean;
}

export type UmpSumber = "BPS_API" | "IMPORT" | "MANUAL" | "GAGAL" | "KOSONG";
 
export interface UmpRow {
  id: number | null;
  tahun: number;
  id_provinsi: number;
  nama_provinsi: string;
  nilai_ump: number | null;
  sumber: UmpSumber;
  error_msg: string | null;
}
 
export interface UmpByTahunResponse {
  success: boolean;
  data: {
    tahun: number;
    sudah_tersimpan: boolean;
    rows: UmpRow[];
  };
}
 
export interface UmpPreviewResponse {
  success: boolean;
  message: string;
  data: {
    tahun: number;
    ok_count: number;
    fail_count: number;
    rows: UmpRow[];
  };
}
 
export interface UmpImportResponse {
  success: boolean;
  message: string;
  data: {
    tahun: number | null;
    ok_count: number;
    unrecognized: string[];
    rows: UmpRow[];
  };
}
 
export interface UmpBulkSavePayloadRow {
  id_provinsi: number;
  nilai_ump: number | null;
  sumber: UmpSumber;
}
 
export interface UmpBulkSaveResponse {
  success: boolean;
  message: string;
  data: {
    tahun: number;
    saved_count: number;
    skipped_count: number;
  };
}
 
export interface UmpUpdateSingleResponse {
  success: boolean;
  message: string;
  data: UmpRow;
}

export interface ThresholdValue {
  threshold_id: number;
  value: number;
}

export interface DynamicParam {
  value: number | null;
  unit: string; // 'bulan' | 'x_ump' | ...
}

export interface CalculationMeta {
  total_lulusan: number;
  margin_error: number;
  min_responden: number;
  formula: string;
}

export interface ThresholdItem {
  indicator_id: number;
  indicator_name: string;          // sudah terinterpolasi dari BE
  baik: ThresholdValue;
  unggul: ThresholdValue;
  dynamic_param: DynamicParam | null;      // baru
  is_system_calculated: boolean;           // baru
  calculation_meta?: CalculationMeta;      // baru — hanya ada kalau is_system_calculated
}

export interface Lam {
  id: number;
  name: string;
  code: string;
  versions: LamVersion[];
  programs: Program[];
  thresholds: ThresholdItem[];
}

export interface LamVersion {
  id: number;
  lam_id?: number;
  year: number;
  year_end: number | null; // null = versi ini masih berlaku sampai sekarang
  version_name?: string;
  is_active: boolean;
}

export interface TracerResponseHistoryItem {
  graduated_year: number;
  threshold_value: number;
  total_lulusan: number;
  min_responden: number;
  margin_error: number;
  calculated_at: string;
}

export interface TracerResponseBreakdown {
  program_id: number;
  program_name: string;
  program_code: string;
  history: TracerResponseHistoryItem[];
}

export interface Program {
  id: number;
  name: string;
  code: string;
  degree?: string;
}

// Ganti nama jadi *Meta biar tidak bentrok konsep dengan ThresholdItem,
// dan tambahkan field baru dari BE.
export interface ThresholdIndicatorMeta {
  id: number;
  key: string;
  name: string;                    // template, bisa mengandung {value}
  unit: string;
  operator: string;
  description: string | null;
  dynamic_param_unit: string | null;  // baru — 'bulan' | 'x_ump' | null
  is_system_calculated: boolean;      // baru
}

/** @deprecated pakai ThresholdIndicatorMeta */
export type ThresholdIndicator = ThresholdIndicatorMeta;

export interface ThresholdBulkCreateItem {
  indicator_id: number;
  // optional sekarang — wajib diisi KECUALI indikator is_system_calculated (tracer_response)
  baik?: number;
  unggul?: number;
  // wajib diisi kalau indikator ini punya dynamic_param_unit (employment_time / salary_above_ump)
  param_value?: number | null;
}

export interface ThresholdBulkUpdateItem {
  indicator_id: number;
  baik_id: number;
  baik_value?: number;
  unggul_id: number;
  unggul_value?: number;
  param_value?: number | null;
}

export interface LamVersionThresholdChart {
  indicator_id: number;
  indicator_key: string;
  indicator_name: string;          // baru — sudah terinterpolasi
  unit: string;
  operator: string;
  baik: { value: number };
  unggul: { value: number };
  dynamic_param: DynamicParam | null;   // baru
  is_system_calculated: boolean;        // baru
  calculation_meta?: CalculationMeta;   // baru
}
// ─────────────────────────────────────────────
// Types — Semantic Role Mapping (Pemetaan Pertanyaan)
// ─────────────────────────────────────────────

export type SemanticExpectedKind =
  | "integer"
  | "decimal"
  | "categorical"
  | "boolean"
  | "text"
  | "date";

export interface SemanticRole {
  role_key: string;
  label: string;
  category: string;
  description: string | null;
  expected_kind: SemanticExpectedKind;
  value_min: number | null;
  value_max: number | null;
  sample_valid_answer: string | null;
  target_table: string;
  target_column: string;
  grain: "narrow" | "wide";
}

export interface QuestionSemanticMapping {
  id: number;
  questionnaire_id: number;
  question_code: string;
  question_text_snapshot: string;
  semantic_role: string;
  grain: "narrow" | "wide";
  effective_date: string;
  is_active: boolean;
  mapped_by: { id: number; name: string } | null;
  deactivated_at: string | null;
  /** ETL otomatis ter-trigger begitu Langkah 1 berubah -- lihat useEtlRunStatus(). */
  etl_run_id?: number;
}

/** GET /etl-runs/{id} -- dipoll setelah simpan/nonaktifkan mapping Langkah 1. */
export interface EtlRunStatus {
  id: number;
  status: "queued" | "running" | "completed" | "failed";
  reason: string;
  id_waktu: number | null;
  summary: { id_waktu: number; stages: Array<{ stage: string; processed: number; inserted: number; skipped: number }> } | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface UnmappedQuestion {
  question_code: string;
  question_text: string;
  question_type: string;
  /** hingga 5 nilai answer_text distinct terbaru — preview, belum masuk OLAP */
  sample_answers: string[];
  /** saran heuristik (keyword match label/description role) — never auto-applied */
  suggested_role: string | null;
}

/**
 * Pasangan (option_code, option_label) NYATA dari questionnaire_options milik
 * kode aktif yang memegang role ini. Satu-satunya sumber sah untuk option_code
 * saat membuat KpiCategoryMapping baru (Langkah 2) — JANGAN pernah mengarang
 * option_code (mis. slug dari label): Cube.js mencocokkan option_code ini
 * persis dengan SPLIT_PART(id_status_alumni, ':', 3), kode karangan tidak akan
 * pernah match apapun dan kategorisasinya gagal senyap.
 */
export interface OptionCandidate {
  option_code: string;
  option_label: string;
}

/** Kuesioner "nasional" (program_id IS NULL) — satu-satunya yang relevan untuk Pemetaan Pertanyaan. */
export interface QuestionnaireOption {
  id: number;
  code: string;
  title: string;
  period_year: number;
}

export interface SimilarQuestion {
  question_code: string;
  question_text: string;
  similarity: number;
  current_semantic_role: string | null;
}

export interface CreateQuestionSemanticMappingPayload {
  questionnaire_id: number;
  question_code: string;
  semantic_role: string;
  /** wajib true untuk retry setelah 409 role_already_mapped (Constraint A) */
  force_replace?: boolean;
}

/** Body respons 409 — Constraint A: role narrow ini sudah dipegang kode aktif lain di kuesioner ini. */
export interface RoleAlreadyMappedError {
  error: "role_already_mapped";
  conflicting_mapping: {
    id: number;
    question_code: string;
    question_text_snapshot: string;
  };
}

/** Body respons 422 — sample jawaban tidak cocok dengan expected_kind role tujuan. Hard block, tidak boleh di-retry diam-diam. */
export interface TypeMismatchError {
  error: "type_mismatch";
  expected_kind: SemanticExpectedKind;
  samples: string[];
}

export interface KpiCategoryMapping {
  id: number;
  semantic_role: string;
  option_code: string;
  option_label_snapshot: string;
  kpi_category: string;
  kpi_category_label: string;
  digunakan_oleh: string;
  is_active: boolean;
  effective_date: string;
}

export interface CreateKpiCategoryMappingPayload {
  semantic_role: string;
  option_code: string;
  option_label_snapshot: string;
  kpi_category: string;
  kpi_category_label: string;
  digunakan_oleh: string;
}

/**
 * Satu grouping (digunakan_oleh) yang PERNAH dikonfigurasi untuk sebuah role —
 * aktif atau tidak. Beda dari KpiCategoryMapping: ini bukan baris data, tapi
 * daftar "section apa saja yang bisa dikelola", supaya grouping yang SEMUA
 * baris aktifnya kebetulan nonaktif (mis. baru dinonaktifkan semua untuk
 * demo ulang) tetap muncul di Langkah 2, bukan hilang total dari tampilan.
 */
export interface KpiCategoryTaxonomyEntry {
  digunakan_oleh: string;
  categories: { id: string; label: string }[];
}

export interface KpiFormulaGroup {
  kpi_category: string;
  kpi_category_label: string;
  options: string[];
}

export interface KpiFormulaResponse {
  semantic_role: string;
  digunakan_oleh: string;
  groups: KpiFormulaGroup[];
}

export interface EtlAnomalyLogEntry {
  id: number;
  etl_run_id: string;
  alumni_nim: string;
  questionnaire_id: number;
  question_code: string;
  semantic_role: string;
  raw_answer: string | null;
  expected_kind: SemanticExpectedKind;
  reason: string;
  detail: string | null;
  occurred_at: string;
}

/** Shape default Laravel paginate() — dipakai apa adanya, tidak dibungkus ApiResponse. */
export interface LaravelPaginated<T> {
  current_page: number;
  data: T[];
  first_page_url: string | null;
  from: number | null;
  last_page: number;
  last_page_url: string | null;
  links: { url: string | null; label: string; active: boolean }[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

// ─────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────
// API Service
// ─────────────────────────────────────────────

export const apiService = {
  // ── Auth ──────────────────────────────────

  login: async (email: string, password: string) => {
    const response = await apiClient.post("/auth/login", { email, password });
    
    // Response shape: { success, message, data: { user, token, token_type } }
    const payload = response.data.data; // ✅ unwrap wrapper dulu
    
    if (payload?.token) {
      localStorage.setItem("auth_token", payload.token);
    }
    return payload;
  },

  logout: async () => {
    await apiClient.post("/auth/logout");
    localStorage.removeItem("auth_token");
  },

  getMe: async () => {
    const response = await apiClient.get("/auth/me");
    return response.data.data ?? response.data;
  },

  // ── UMP ──────────────────────────────────
 
  getUmpYears: async (): Promise<{ success: boolean; data: number[] }> => {
    const response = await apiClient.get("/ump/years");
    return response.data;
  },
 
  getUmpByTahun: async (tahun: number): Promise<UmpByTahunResponse> => {
    const response = await apiClient.get(`/ump/${tahun}`);
    return response.data;
  },
 
  fetchUmpFromBps: async (tahun: number): Promise<UmpPreviewResponse> => {
    const response = await apiClient.get(`/ump/${tahun}/fetch-bps`);
    return response.data;
  },
 
  importUmpFile: async (file: File): Promise<UmpImportResponse> => {
    const form = new FormData();
    form.append("file", file);
    const response = await apiClient.post("/ump/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
 
  bulkSaveUmp: async (
    tahun: number,
    rows: UmpBulkSavePayloadRow[]
  ): Promise<UmpBulkSaveResponse> => {
    const response = await apiClient.post(`/ump/${tahun}/bulk-save`, { rows });
    return response.data;
  },
 
  updateUmpSingle: async (
    tahun: number,
    idProvinsi: number,
    nilaiUmp: number
  ): Promise<UmpUpdateSingleResponse> => {
    const response = await apiClient.patch(`/ump/${tahun}/provinces/${idProvinsi}`, {
      nilai_ump: nilaiUmp,
    });
    return response.data;
  },
 
  downloadUmpTemplate: async (): Promise<Blob> => {
    const response = await apiClient.get("/ump/template", {
      responseType: "blob",
    });
    return response.data;
  },

  // ── Filter Options ────────────────────────

  /**
   * GET /dashboard/meta/filter-options
   * Fetch semua opsi filter global untuk dropdown di DashboardFilters
   * Response: { success, data: { tahun_lulus, snapshot, jenjang, jurusan, prodi } }
   */
  getFilterOptions: async (): Promise<FilterOptionsResponse> => {
    const response = await apiClient.get<FilterOptionsResponse>(
      "/dashboard/meta/filter-options"
    );
    return response.data;
  },

  // ── Programs ──────────────────────────────

  getPrograms: async (): Promise<ApiResponse<Program[]>> => {
    const response = await apiClient.get("/programs");
    return response.data;
  },

  getProgramById: async (id: string | number): Promise<ApiResponse<Program>> => {
    const response = await apiClient.get(`/programs/${id}`);
    return response.data;
  },

  createProgram: async (data: Omit<Program, "id">): Promise<ApiResponse<Program>> => {
    const response = await apiClient.post("/programs", data);
    return response.data;
  },

  updateProgram: async (
    id: string | number,
    data: Partial<Omit<Program, "id">>
  ): Promise<ApiResponse<Program>> => {
    const response = await apiClient.put(`/programs/${id}`, data);
    return response.data;
  },

  deleteProgram: async (id: string | number): Promise<void> => {
    await apiClient.delete(`/programs/${id}`);
  },

  // ── LAMs ──────────────────────────────────

  /**
   * GET /lams?include=versions,programs,thresholds
   * Fetch semua LAM sekaligus — dipakai saat halaman threshold-management mount.
   */
  getLams: async (): Promise<ApiResponse<Lam[]>> => {
    const response = await apiClient.get("/lams", {
      params: { include: "versions,programs,thresholds" },
    });
    return response.data;
  },

  /**
   * POST /lams
   * Step 1/3 modal tambah LAM — buat entitas LAM + assign prodi.
   */
  createLam: async (data: {
    name: string;
    code: string;
    program_ids: number[];
  }): Promise<ApiResponse<Lam>> => {
    const response = await apiClient.post("/lams", data);
    return response.data;
  },

  /**
   * PUT /lams/{id}
   * Update nama / kode LAM dari modal edit.
   */
  updateLam: async (
    id: number,
    data: { name: string; code: string }
  ): Promise<ApiResponse<Lam>> => {
    const response = await apiClient.put(`/lams/${id}`, data);
    return response.data;
  },

  /**
   * DELETE /lams/{id}
   * Hapus LAM (cascade: versions + thresholds ikut terhapus di backend).
   */
  deleteLam: async (id: number): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/lams/${id}`);
    return response.data;
  },

  // ── LAM Programs ──────────────────────────

  /**
   * POST /lam-programs
   * Tambah prodi ke LAM — dipanggil saat checkbox prodi di-centang di modal edit.
   */
  addLamProgram: async (data: {
    lam_id: number;
    program_ids: number[];
  }): Promise<ApiResponse<{ programs: Program[] }>> => {
    const response = await apiClient.post("/lam-programs", data);
    return response.data;
  },

  /**
   * DELETE /lam-programs
   * Hapus satu prodi dari LAM — dipanggil saat checkbox di-uncheck di modal edit.
   */
  removeLamProgram: async (data: {
    lam_id: number;
    program_id: number;
  }): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete("/lam-programs", { data });
    return response.data;
  },

  // ── LAM Versions ──────────────────────────

  /**
   * POST /lam-versions
   * Step 2/3 modal tambah LAM — buat versi/tahun LAM.
   */
  createLamVersion: async (data: {
    lam_id: number;
    year: number;
    version_name: string;
  }): Promise<ApiResponse<LamVersion>> => {
    const response = await apiClient.post("/lam-versions", data);
    return response.data;
  },

  /**
   * PUT /lam-versions/{id}
   * Toggle aktif/nonaktif versi LAM dari baris tabel.
   */
  updateLamVersionStatus: async (
    id: number,
    is_active: boolean
  ): Promise<ApiResponse<Pick<LamVersion, "id" | "is_active">>> => {
    const response = await apiClient.put(`/lam-versions/${id}`, { is_active });
    return response.data;
  },

  deleteLamVersion: async (id: number): Promise<ApiResponse<null>> => {
    const response = await apiClient.delete(`/lam-versions/${id}`);
    return response.data;
  },

  /**
   * GET /lam-versions/{id}/thresholds
   * Ambil garis referensi baik/unggul untuk grafik di halaman overview/employment.
   */
  getLamVersionThresholds: async (
    lamVersionId: number
  ): Promise<{ thresholds: LamVersionThresholdChart[] }> => {
    const response = await apiClient.get(
      `/lam-versions/${lamVersionId}/thresholds`
    );
    return response.data;
  },

  /**
   * POST /lam-versions/{id}/thresholds/bulk
   * Step 3/3 modal tambah LAM — simpan semua nilai threshold sekaligus.
   */
  bulkCreateThresholds: async (
    lamVersionId: number,
    thresholds: ThresholdBulkCreateItem[]
  ): Promise<
    ApiResponse<{
      lam: Pick<Lam, "id" | "name">;
      version: Pick<LamVersion, "id" | "year">;
      thresholds: ThresholdItem[];
    }>
  > => {
    const response = await apiClient.post(
      `/lam-versions/${lamVersionId}/thresholds/bulk`,
      { thresholds }
    );
    return response.data;
  },

  /**
   * PUT /lam-versions/{id}/thresholds/bulk
   * Update threshold dari modal edit — hanya kirim indikator yang berubah.
   * threshold_id (baik_id/unggul_id) sudah diketahui dari data saat modal buka.
   */
  bulkUpdateThresholds: async (
    lamVersionId: number,
    thresholds: ThresholdBulkUpdateItem[]
  ): Promise<ApiResponse<{ thresholds: ThresholdItem[] }>> => {
    const response = await apiClient.put(
      `/lam-versions/${lamVersionId}/thresholds/bulk`,
      { thresholds }
    );
    return response.data;
  },

  // ── Tracer Response (system-calculated, formula Slovin) ───

  /**
   * GET /lams/{lamId}/thresholds/tracer-response
   * Breakdown nilai response-rate per prodi & angkatan di bawah LAM ini.
   * Dihitung otomatis oleh BE (event-driven saat alumni submit + job harian) —
   * endpoint ini hanya baca, tidak ada trigger hitung ulang dari sini.
   */
  getTracerResponseByLam: async (
    lamId: number
  ): Promise<ApiResponse<TracerResponseBreakdown[]>> => {
    const response = await apiClient.get(`/lams/${lamId}/thresholds/tracer-response`);
    return response.data;
  },

  // ── Threshold Indicators ──────────────────

  /**
   * GET /threshold-indicators
   * Fetch master indikator (sekarang termasuk indikator dinamis & system-calculated).
   * FIX: response BE dibungkus { success, data }, bukan array langsung —
   * sebelumnya method ini salah tipe & tidak unwrap .data.
   */
  getThresholdIndicators: async (): Promise<ApiResponse<ThresholdIndicatorMeta[]>> => {
    const response = await apiClient.get("/threshold-indicators");
    return response.data;
  },

  /**
   * PUT /threshold-indicators/{id}
   * Baru — edit template nama/deskripsi/unit/operator indikator (admin only).
   */
  updateThresholdIndicator: async (
    id: number,
    data: Partial<Pick<ThresholdIndicatorMeta, "name" | "unit" | "operator" | "description" | "dynamic_param_unit">>
  ): Promise<ApiResponse<ThresholdIndicatorMeta>> => {
    const response = await apiClient.put(`/threshold-indicators/${id}`, data);
    return response.data;
  },

  // ── Semantic Role Registry ────────────────

  /**
   * GET /semantic-roles
   * Semua role aktif — di-group client-side per `category` (lihat useQuestionMappingManagement)
   * untuk dropdown Langkah 1, supaya admin tidak salah petakan role lintas domain KPI.
   */
  getSemanticRoles: async (): Promise<ApiResponse<SemanticRole[]>> => {
    const response = await apiClient.get("/semantic-roles");
    return response.data;
  },

  // ── Question Semantic Mapping (Langkah 1) ─

  /**
   * GET /question-semantic-mappings?questionnaire_id=&is_active=
   */
  getQuestionSemanticMappings: async (params?: {
    questionnaire_id?: number;
    is_active?: boolean;
  }): Promise<ApiResponse<QuestionSemanticMapping[]>> => {
    const response = await apiClient.get("/question-semantic-mappings", { params });
    return response.data;
  },

  /**
   * GET /question-semantic-mappings/unmapped?questionnaire_id=
   * Kode yang belum termapping di kuesioner ini, lengkap dengan contoh jawaban OLTP
   * & saran role heuristik (tidak pernah auto-apply).
   */
  getUnmappedQuestions: async (
    questionnaire_id: number
  ): Promise<ApiResponse<UnmappedQuestion[]>> => {
    const response = await apiClient.get("/question-semantic-mappings/unmapped", {
      params: { questionnaire_id },
    });
    return response.data;
  },

  /**
   * GET /question-semantic-mappings/questionnaires
   * Kuesioner nasional (program_id IS NULL) untuk selector Langkah 1/2 —
   * satu-satunya yang pernah punya question_code relevan untuk fitur ini.
   */
  getMappableQuestionnaires: async (): Promise<ApiResponse<QuestionnaireOption[]>> => {
    const response = await apiClient.get("/question-semantic-mappings/questionnaires");
    return response.data;
  },

  /**
   * GET /question-semantic-mappings/option-candidates?semantic_role=
   * Pasangan (option_code, option_label) NYATA untuk role ini — satu-satunya
   * sumber sah option_code saat mengelompokkan status baru ke kategori KPI
   * (Langkah 2). Jangan pernah mengarang option_code di klien.
   */
  getOptionCandidates: async (
    semantic_role: string
  ): Promise<ApiResponse<OptionCandidate[]>> => {
    const response = await apiClient.get("/question-semantic-mappings/option-candidates", {
      params: { semantic_role },
    });
    return response.data;
  },

  /**
   * GET /question-semantic-mappings/similar?questionnaire_id=&question_text=&exclude_code=
   * Constraint D helper (pg_trgm similarity) — dipanggil saat admin memilih kode di
   * Langkah 1, sebelum commit, supaya tidak membuat mapping duplikat/pecah.
   */
  getSimilarQuestions: async (params: {
    questionnaire_id: number;
    question_text: string;
    exclude_code?: string;
  }): Promise<ApiResponse<SimilarQuestion[]>> => {
    const response = await apiClient.get("/question-semantic-mappings/similar", { params });
    return response.data;
  },

  /**
   * POST /question-semantic-mappings
   * BE re-validasi constraint A/B & type-compatibility (tidak percaya client). Bisa balas:
   * - 409 { error: 'role_already_mapped', conflicting_mapping } → Constraint A, retry dengan force_replace: true
   * - 422 { error: 'type_mismatch', expected_kind, samples }    → hard block, FE wajib patuh, jangan retry diam-diam
   */
  createQuestionSemanticMapping: async (
    payload: CreateQuestionSemanticMappingPayload
  ): Promise<ApiResponse<QuestionSemanticMapping>> => {
    const response = await apiClient.post("/question-semantic-mappings", payload);
    return response.data;
  },

  /**
   * POST /question-semantic-mappings/{id}/deactivate
   * Tidak pernah DELETE — hanya soft-deactivate (is_active=false, deactivated_at/by).
   */
  deactivateQuestionSemanticMapping: async (
    id: number
  ): Promise<ApiResponse<{ etl_run_id: number }>> => {
    const response = await apiClient.post(`/question-semantic-mappings/${id}/deactivate`);
    return response.data;
  },

  /**
   * GET /etl-runs/{id}
   * Dipoll FE setelah simpan/nonaktifkan mapping Langkah 1 (ETL otomatis
   * ter-trigger di background lewat queue) untuk menampilkan status
   * queued/running/completed/failed alih-alih diam tanpa info.
   */
  getEtlRunStatus: async (id: number): Promise<ApiResponse<EtlRunStatus>> => {
    const response = await apiClient.get(`/etl-runs/${id}`);
    return response.data;
  },

  // ── KPI Category Mapping (Langkah 2) ──────

  /**
   * GET /kpi-category-mappings?semantic_role=&digunakan_oleh=
   */
  getKpiCategoryMappings: async (params?: {
    semantic_role?: string;
    digunakan_oleh?: string;
    /** true = kembalikan SEMUA baris (aktif+nonaktif) — dipakai tab audit "Data Tersimpan". */
    all?: boolean;
  }): Promise<ApiResponse<KpiCategoryMapping[]>> => {
    const response = await apiClient.get("/kpi-category-mappings", { params });
    return response.data;
  },

  /**
   * GET /kpi-category-mappings/taxonomy?semantic_role=
   * Section (digunakan_oleh) apa saja yang PERNAH dikonfigurasi untuk role
   * ini, aktif atau tidak — lihat catatan di KpiCategoryTaxonomyEntry.
   */
  getKpiCategoryTaxonomy: async (
    semantic_role: string
  ): Promise<ApiResponse<KpiCategoryTaxonomyEntry[]>> => {
    const response = await apiClient.get("/kpi-category-mappings/taxonomy", {
      params: { semantic_role },
    });
    return response.data;
  },

  /**
   * GET /kpi-category-mappings/taxonomy-all
   * Sama seperti taxonomy, tapi untuk SEMUA role sekaligus (satu request,
   * bukan N+1) — dipakai selector "role yang sudah aktif" di Langkah 1 supaya
   * admin langsung lihat KPI apa yang dipakai tiap role (mis. status_pekerjaan
   * -> iku2_keterserapan) tanpa perlu menebak istilah digunakan_oleh.
   */
  getKpiCategoryTaxonomyAll: async (): Promise<
    ApiResponse<{ semantic_role: string; digunakan_oleh: string[] }[]>
  > => {
    const response = await apiClient.get("/kpi-category-mappings/taxonomy-all");
    return response.data;
  },

  /**
   * POST /kpi-category-mappings
   * BE pre-check unique index (semantic_role, option_code, digunakan_oleh) WHERE is_active
   * dan balas 409 kalau konflik (bukan 500) — sama semantik dengan is_active=false-then-insert.
   */
  createKpiCategoryMapping: async (
    payload: CreateKpiCategoryMappingPayload
  ): Promise<ApiResponse<KpiCategoryMapping>> => {
    const response = await apiClient.post("/kpi-category-mappings", payload);
    return response.data;
  },

  /**
   * POST /kpi-category-mappings/{id}/deactivate
   */
  deactivateKpiCategoryMapping: async (
    id: number
  ): Promise<ApiResponse<KpiCategoryMapping>> => {
    const response = await apiClient.post(`/kpi-category-mappings/${id}/deactivate`);
    return response.data;
  },

  /**
   * GET /kpi-category-mappings/formula?semantic_role=&digunakan_oleh=&minggu_snapshot=
   * Endpoint tooltip dinamis — dipakai chart KPI hilir (Kpi4Absorption dkk, lewat
   * useKpiFormula) supaya formula di UI selalu sinkron dengan pengelompokan status
   * terbaru tanpa perlu deploy FE baru. Respons SAMA seperti endpoint lain --
   * dibungkus { success, data } oleh KpiCategoryMappingController::formula() --
   * comment lama di sini salah dan menyebabkan `groups` selalu undefined
   * (butuh response.data.data, bukan response.data), sehingga tooltip diam-diam
   * SELALU jatuh ke teks fallback statis walau kategori KPI sudah dipetakan.
   *
   * minggu_snapshot (id_waktu) WAJIB dikirim kalau ada -- endpoint ini
   * point-in-time terhadap snapshot itu (lihat KpiCategoryMappingRepository::
   * formulaRows()), bukan lagi selalu definisi hari ini. Tanpa ini, tooltip
   * tampak "kadang benar kadang salah" tergantung snapshot mana yang sedang
   * dipilih user di filter global, karena chart datanya sendiri point-in-time
   * tapi tooltip-nya dulu tidak.
   */
  getKpiCategoryMappingFormula: async (params: {
    semantic_role: string;
    digunakan_oleh: string;
    minggu_snapshot?: string;
  }): Promise<KpiFormulaResponse> => {
    const response = await apiClient.get("/kpi-category-mappings/formula", { params });
    return response.data.data;
  },

  // ── ETL Anomaly Log ───────────────────────

  /**
   * GET /etl-anomaly-log?etl_run_id=&semantic_role=&nim=&page=
   * Paginated (Laravel default paginate() shape). Semua filter opsional/combinable.
   * Respons TIDAK dibungkus { data } — sudah punya shape paginator sendiri.
   */
  getEtlAnomalyLog: async (params?: {
    etl_run_id?: string;
    semantic_role?: string;
    nim?: string;
    page?: number;
  }): Promise<LaravelPaginated<EtlAnomalyLogEntry>> => {
    const response = await apiClient.get("/etl-anomaly-log", { params });
    return response.data;
  },

  // ── Generic helpers ───────────────────────

  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get<T>(url, config);
    return response.data;
  },

  post: async <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await apiClient.post<T>(url, data, config);
    return response.data;
  },

  put: async <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await apiClient.put<T>(url, data, config);
    return response.data;
  },

  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.delete<T>(url, config);
    return response.data;
  },
};

export default apiClient;