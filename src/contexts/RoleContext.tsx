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
  selectedJurusan: string | null;
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

  const selectedJurusan =
    currentRole === "kajur" ? ((user as any)?.jurusan ?? null) : null;

  const can = (permission: Permission) => hasPermission(currentRole, permission);
  const canAny = (permissions: Permission[]) => hasAnyPermission(currentRole, permissions);
  const menu = getMenuForRole(currentRole);
  const defaultRoute = getDefaultRoute(currentRole);

  return (
    <RoleContext.Provider
      value={{ currentRole, selectedProdi, selectedJurusan, can, canAny, menu, defaultRoute }}
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
