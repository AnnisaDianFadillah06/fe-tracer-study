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

  // Dipilih berdasarkan RUTE tab ini, bukan precedence tetap. Sebelum
  // perbaikan ini, token staff (localStorage, dibagikan lintas SEMUA tab)
  // selalu didahulukan — begitu tab lain login sebagai staff, tab alumni
  // yang sedang mengisi kuesioner ikut mengirim token staff itu ke endpoint
  // guard 'alumni', ditolak 401, dan dipaksa keluar tanpa peringatan (bug
  // #19 — HASIL_TESTING_2026-08-23.md §T.8). Halaman kuesioner (/form)
  // sekarang SELALU memakai token alumni miliknya sendiri (sessionStorage,
  // sudah per-tab), sehingga login staff di tab lain tidak pernah menyentuhnya.
  const path = window.location.pathname;
  const token = path.startsWith("/form")
    ? sessionStorage.getItem("tracer_student_token")
    : localStorage.getItem("auth_token") ??
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
