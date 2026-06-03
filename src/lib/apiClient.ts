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

export interface ThresholdValue {
  threshold_id: number;
  value: number;
}

export interface ThresholdItem {
  indicator_id: number;
  indicator_name: string;
  baik: ThresholdValue;
  unggul: ThresholdValue;
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
  version_name?: string;
  is_active: boolean;
}

export interface Program {
  id: number;
  name: string;
  code: string;
  degree?: string;
}

export interface ThresholdIndicator {
  id: number;
  key: string;
  name: string;
  unit?: string;
  operator?: string;
}

export interface ThresholdBulkCreateItem {
  indicator_id: number;
  baik: number;
  unggul: number;
}

export interface ThresholdBulkUpdateItem {
  indicator_id: number;
  baik_id: number;
  baik_value: number;
  unggul_id: number;
  unggul_value: number;
}

export interface LamVersionThresholdChart {
  indicator_id: number;
  indicator_key: string;
  unit: string;
  operator: string;
  baik: { value: number };
  unggul: { value: number };
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

  // ── Threshold Indicators ──────────────────

  /**
   * GET /threshold-indicators
   * Fetch 5 indikator (nama statis) — dipakai modal tambah LAM.
   * Di sisi hooks, staleTime di-set panjang karena data ini jarang berubah.
   */
  getThresholdIndicators: async (): Promise<ThresholdIndicator[]> => {
    const response = await apiClient.get("/threshold-indicators");
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