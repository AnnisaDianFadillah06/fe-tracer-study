import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ── Request interceptor: sematkan Bearer token ──────────────────────────────
api.interceptors.request.use((config) => {
  // Pemanggil boleh menentukan tokennya sendiri — dipakai endpoint alumni,
  // yang butuh token guard 'alumni' meskipun ada staff yang sedang login di
  // peramban yang sama. Jangan ditimpa.
  if (config.headers.Authorization) return config;

  // Staff (localStorage) didahulukan; kalau tidak ada, pakai token alumni
  // (sessionStorage) supaya halaman kuesioner tetap terautentikasi.
  const token =
    localStorage.getItem("auth_token") ??
    sessionStorage.getItem("tracer_student_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: handle 401 → redirect login ───────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;

      // Halaman kuesioner alumni: yang kedaluwarsa adalah token guard
      // 'alumni', bukan kredensial staff. Draf pengisian sengaja TIDAK
      // dihapus di sini — alumni cukup login ulang, jawabannya dipulihkan.
      if (path.startsWith("/form")) {
        sessionStorage.removeItem("tracer_student_token");
        sessionStorage.removeItem("tracer_student_session");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      // Hanya redirect jika bukan di halaman login/form
      if (path.startsWith("/dashboard")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
