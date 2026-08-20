import { createContext, useContext, useEffect, ReactNode } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
import { apiService } from "@/lib/apiClient";
import {
  type AppRole,
  type Permission,
  roleLabels,
  roleDescriptions,
  hasPermission,
  hasAnyPermission,
  getMenuForRole,
  getDefaultRoute,
  mapBackendRole,
  hydrateRoleRegistryFromApi,
} from "@/lib/rbac";

export type { AppRole };
export { roleLabels, roleDescriptions };

interface RoleContextType {
  currentRole: AppRole;
  selectedProdi: string | null;
  /**
   * Id prodi kaprodi — dipakai untuk MENYARING, sementara `selectedProdi`
   * hanya untuk ditampilkan.
   *
   * Nama prodi tidak unik: tujuh nama dipakai dua prodi sekaligus pada
   * jenjang berbeda (Teknik Informatika D3 dan D4, Akuntansi D3 dan D4, dan
   * seterusnya). Menyaring dengan nama membuat kaprodi D3 ikut melihat
   * kuesioner dan angka milik D4.
   */
  selectedProdiId: number | null;
  selectedJurusan: string | null;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  menu: ReturnType<typeof getMenuForRole>;
  defaultRoute: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const currentRole: AppRole = mapBackendRole(user?.role);

  // DFR-26: sinkronkan label/deskripsi role dari GET /api/roles (tabel
  // `roles` backend, sudah ada -- lihat RoleController::index). Best-effort,
  // non-blocking: gagal fetch tidak menghalangi render, registry statis
  // (enam role existing) tetap dipakai apa adanya sebagai fallback.
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    apiService
      .get<{ success: boolean; data: Array<{ name: string; label: string; description: string | null; scope: string | null }> }>("/roles")
      .then((res) => {
        if (!cancelled && res?.data) {
          hydrateRoleRegistryFromApi(res.data);
        }
      })
      .catch(() => {
        // Diam-diam pakai registry statis -- ini bukan jalur kritis.
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const selectedProdi =
    currentRole === "kaprodi" ? (user?.program_name ?? null) : null;

  const selectedProdiId =
    currentRole === "kaprodi" ? (user?.program_id ?? null) : null;

  const selectedJurusan =
    currentRole === "kajur" ? (user?.jurusan ?? null) : null;

  const can = (permission: Permission) => hasPermission(currentRole, permission);
  const canAny = (permissions: Permission[]) => hasAnyPermission(currentRole, permissions);
  const menu = getMenuForRole(currentRole);
  const defaultRoute = getDefaultRoute(currentRole);

  return (
    <RoleContext.Provider
      value={{ currentRole, selectedProdi, selectedProdiId, selectedJurusan, can, canAny, menu, defaultRoute }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within a RoleProvider");
  return context;
}
