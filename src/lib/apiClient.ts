import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
  AxiosResponse,
} from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Create axios instance
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
  const token = localStorage.getItem("sanctum_token");
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
      // Token expired, redirect to login
      localStorage.removeItem("sanctum_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// API Methods
export const apiService = {
  // Auth endpoints
  login: async (email: string, password: string) => {
    const response = await apiClient.post("/auth/login", { email, password });
    if (response.data.token) {
      localStorage.setItem("sanctum_token", response.data.token);
    }
    return response.data;
  },

  logout: async () => {
    await apiClient.post("/auth/logout");
    localStorage.removeItem("sanctum_token");
  },

  getMe: async () => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  },

  // Programs endpoints
  getPrograms: async () => {
    const response = await apiClient.get("/programs");
    return response.data;
  },

  getProgramById: async (id: string | number) => {
    const response = await apiClient.get(`/programs/${id}`);
    return response.data;
  },

  createProgram: async (data: any) => {
    const response = await apiClient.post("/programs", data);
    return response.data;
  },

  updateProgram: async (id: string | number, data: any) => {
    const response = await apiClient.put(`/programs/${id}`, data);
    return response.data;
  },

  deleteProgram: async (id: string | number) => {
    await apiClient.delete(`/programs/${id}`);
  },

  // Generic GET request
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.get<T>(url, config);
    return response.data;
  },

  // Generic POST request
  post: async <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await apiClient.post<T>(url, data, config);
    return response.data;
  },

  // Generic PUT request
  put: async <T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> => {
    const response = await apiClient.put<T>(url, data, config);
    return response.data;
  },

  // Generic DELETE request
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiClient.delete<T>(url, config);
    return response.data;
  },
};

export default apiClient;
