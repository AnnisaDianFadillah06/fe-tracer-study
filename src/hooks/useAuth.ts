import { useState, useCallback } from "react";
import api from "@/lib/api";

// ── Types matching backend ResponseAuthDTO & AuthService::me() ────────────
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string; // "admin" | "kaprodi" | "kotc"
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

/**
 * Hook untuk autentikasi admin/kaprodi/kotc via Sanctum token.
 *
 * Backend endpoints:
 *   POST /api/auth/login   → { success, data: { user, token, token_type } }
 *   POST /api/auth/logout   → { success, message }
 *   GET  /api/auth/me       → { success, data: { id, name, email, role, ... } }
 */
export const useAuth = () => {
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

  // ── Login ───────────────────────────────────────────────────────────────────
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

      return { success: true, user };
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

  // ── Logout ──────────────────────────────────────────────────────────────────
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

  // ── Fetch current user (refresh data) ───────────────────────────────────────
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

  return { ...state, login, logout, fetchMe };
};
