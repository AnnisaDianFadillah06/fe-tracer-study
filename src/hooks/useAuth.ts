import { useState, useEffect, useCallback } from "react";
import { apiService } from "@/lib/apiClient";
import { useToast } from "@/hooks/use-toast";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register?: (email: string, password: string, name: string) => Promise<void>;
}

export const useAuth = (): UseAuthReturn => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("sanctum_token");
        if (token) {
          const userData = await apiService.getMe();
          setUser(userData.data || userData);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("sanctum_token");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setIsLoading(true);
        const response = await apiService.login(email, password);
        const userData = response.data || response;

        setUser(userData);
        toast({
          title: "Berhasil",
          description: "Login berhasil",
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.response?.data?.message || "Login gagal",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const logout = useCallback(async () => {
    try {
      await apiService.logout();
      setUser(null);
      toast({
        title: "Berhasil",
        description: "Logout berhasil",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Logout gagal",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
  };
};
