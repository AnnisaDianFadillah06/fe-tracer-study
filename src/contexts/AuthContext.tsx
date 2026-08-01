// src/contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { apiService } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  program_id: number | null;
  program_name: string | null;
  program_code: string | null;
  program_degree: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

    // useEffect(() => {
    // const checkAuth = async () => {
    //     const payload = await apiService.getMe();
    //     console.log("[Auth] getMe payload:", payload); // cek shape
        
    //     if (!payload) {
    //     setIsLoading(false);
    //     return;
    //     }

    //     try {
    //     const response = await apiService.getMe();
    //     console.log("[Auth] getMe response:", response); // ✅ cek shape response
        
    //     const userData: AuthUser = response.data ?? response;
    //     console.log("[Auth] userData:", userData); // ✅ cek hasil parse
        
    //     setUser(userData);
    //     } catch (error: any) {
    //     console.error("[Auth] checkAuth error:", error.response?.status, error); // ✅ cek error
    //     if (error.response?.status === 401) {
    //         localStorage.removeItem("auth_token");
    //     }
    //     setUser(null);
    //     } finally {
    //     setIsLoading(false);
    //     }
    // };

    useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("auth_token");

      // kalau belum login, jangan hit API
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiService.getMe();

        console.log("[Auth] getMe response:", response);

        const userData: AuthUser = response.data ?? response;

        setUser(userData);
      } catch (error: any) {
        console.error(
          "[Auth] checkAuth error:",
          error.response?.status,
          error
        );

        if (error.response?.status === 401) {
          localStorage.removeItem("auth_token");
        }

        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
        setIsLoading(true);
        try {
        const payload = await apiService.login(email, password);
        // payload sekarang sudah { user, token, token_type }
        setUser(payload.user);
        toast({ title: "Berhasil", description: "Login berhasil" });
        } catch (error: any) {
        const message =
            error.response?.data?.message || "Email atau password salah";
        toast({ title: "Login Gagal", description: message, variant: "destructive" });
        throw error;
        } finally {
        setIsLoading(false);
        }
    },
    [toast]
    );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch {
      // tetap lanjut logout FE
    } finally {
      localStorage.removeItem("auth_token");
      setUser(null);
      toast({ title: "Berhasil", description: "Logout berhasil" });
    }
  }, [toast]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider");
  return ctx;
};