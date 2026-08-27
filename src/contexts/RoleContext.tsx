import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/auth/useAuth";
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
  /** Cakupan jurusan untuk dekan; null untuk peran lain. */
  jurusanScopeNames: string[] | null;
  /** Nama Fakultas yang dipimpin (role dekan); null untuk peran lain. */
  selectedFakultas: string | null;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  menu: ReturnType<typeof getMenuForRole>;
  defaultRoute: string;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const currentRole: AppRole = mapBackendRole(user?.role);

  const selectedProdi =
    currentRole === "kaprodi" ? (user?.program_name ?? null) : null;

  const selectedProdiId =
    currentRole === "kaprodi" ? (user?.program_id ?? null) : null;

  const selectedJurusan =
    currentRole === "kajur" ? (user?.jurusan_name ?? user?.jurusan ?? null) : null;

  const jurusanScopeNames =
    currentRole === "dekan" ? (user?.fakultas_jurusan_names ?? []) : null;

  const selectedFakultas =
    currentRole === "dekan" ? (user?.fakultas_name ?? null) : null;

  const can = (permission: Permission) => hasPermission(currentRole, permission);
  const canAny = (permissions: Permission[]) => hasAnyPermission(currentRole, permissions);
  const menu = getMenuForRole(currentRole);
  const defaultRoute = getDefaultRoute(currentRole);

  return (
    <RoleContext.Provider
      value={{ currentRole, selectedProdi, selectedProdiId, selectedJurusan, jurusanScopeNames, selectedFakultas, can, canAny, menu, defaultRoute }}
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
