import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toLoginError } from "@/lib/authErrors";

// ── Types matching backend ResponseAuthDTO & AuthService::me() ────────────
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string; // BE role: "head_tracer" | "tracer_team" | "wadir" | "kajur" | "kaprodi"
  program_id: number | null;
  program_name: string | null;
  program_code: string | null;
  program_degree: string | null;
  jurusan: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ success: true; user: AuthUser }>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Single source of truth untuk state autentikasi.
 *
 * Dibungkus sebagai Context (bukan plain hook) supaya semua consumer
 * (`RoleProvider`, `DashboardLayout`, `ProtectedRoute`, `Login`, dst.)
 * berbagi state yang SAMA — tanpa ini, login/logout di satu komponen
 * tidak merefresh state komponen lain dalam SPA yang sama.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem("auth_token");
    const userRaw = localStorage.getItem("auth_user");
    return {
      token,
      user: userRaw ? JSON.parse(userRaw) : null,
      isAuthenticated: !!token,
      isLoading: false,
    };
  });

  /**
   * Cache React Query WAJIB dikosongkan setiap kali pemilik sesi berganti.
   *
   * Kunci cache hanya berisi nama query dan parameter filter — tidak ada
   * identitas pengguna di dalamnya. Padahal cakupan datanya ditentukan server
   * dari token: permintaan tanpa filter apa pun mengembalikan 15 alumni untuk
   * kaprodi, 29 untuk kajur, 505 untuk kepala tracer, semuanya di bawah kunci
   * yang sama persis. Dengan staleTime 10 menit dan logout yang tidak
   * membersihkan apa-apa, akun berikutnya disuguhi angka milik akun
   * sebelumnya sampai cache basi — tanpa satu pun permintaan ke server.
   *
   * Dibersihkan di dua titik: saat logout (jangan tinggalkan jejak) dan saat
   * login berhasil (jangan percayai apa pun yang tersisa di memori).
   */
  const queryClient = useQueryClient();

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const { data } = await api.post("/auth/login", { email, password });
      // Backend response: data.data = { user: {...}, token: "...", token_type: "Bearer" }
      const { user, token } = data.data;

      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));

      queryClient.clear();

      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true as const, user };
    } catch (error: any) {
      setState((s) => ({ ...s, isLoading: false }));

      // Bentuknya diseragamkan lewat toLoginError: 422 dari ValidationException
      // ({ errors: { email: [...] } }), 429 dari pembatas laju beserta sisa
      // waktunya, dan sisanya jatuh ke pesan umum. Status ikut terbawa supaya
      // pemanggil bisa membedakan — Login.tsx tidak boleh meneruskan 429 ke
      // percobaan rute alumni.
      throw toLoginError(error, "Login gagal. Periksa email dan password.");
    }
  }, [queryClient]);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Tetap logout di frontend meski request gagal (token expired, dll)
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    queryClient.clear();
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, [queryClient]);

  // ── Fetch current user (refresh data) ────────────────────────────────────
  const fetchMe = useCallback(async () => {
    if (!localStorage.getItem("auth_token")) return;
    try {
      const { data } = await api.get("/auth/me");
      const user: AuthUser = data.data;
      localStorage.setItem("auth_user", JSON.stringify(user));
      setState((s) => ({ ...s, user }));
    } catch {
      // Token invalid/expired → clear
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
