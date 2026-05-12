import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import api from "@/lib/api";

// ── Types matching backend ResponseAuthDTO & AuthService::me() ────────────
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string; // BE role: "admin" | "p2mpp" | "kaprodi" | "head_tracer" | "tracer_team" | "wadir"
  program_id: number | null;
  program_name: string | null;
  program_code: string | null;
  program_degree: string | null;
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

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true }));
    try {
      const { data } = await api.post("/auth/login", { email, password });
      // Backend response: data.data = { user: {...}, token: "...", token_type: "Bearer" }
      const { user, token } = data.data;

      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));

      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true as const, user };
    } catch (error: any) {
      setState((s) => ({ ...s, isLoading: false }));

      // Backend throws ValidationException → response 422 with { errors: { email: [...] } }
      const message =
        error.response?.data?.errors?.email?.[0] ||
        error.response?.data?.message ||
        "Login gagal. Periksa email dan password.";
      throw new Error(message);
    }
  }, []);

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Tetap logout di frontend meski request gagal (token expired, dll)
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

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
