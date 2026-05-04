import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth, type AuthUser } from "@/hooks/useAuth";

export type UserRole = "p2mpp" | "kaprodi" | "kotc";

interface RoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  selectedProdi: string | null; // For Kaprodi role
  roleLabels: Record<UserRole, string>;
  roleDescriptions: Record<UserRole, string>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const roleLabels: Record<UserRole, string> = {
  p2mpp: "P2MPP",
  kaprodi: "Kaprodi",
  kotc: "KoTC",
};

export const roleDescriptions: Record<UserRole, string> = {
  p2mpp: "Pusat Pengembangan Mutu Pendidikan & Pembelajaran",
  kaprodi: "Kepala Program Studi",
  kotc: "Koordinator Tracer Study",
};

/**
 * Map backend role string → frontend UserRole type.
 * Backend uses: "admin", "kaprodi", "kotc"
 */
const mapBackendRole = (backendRole?: string): UserRole => {
  switch (backendRole) {
    case "admin":
      return "p2mpp";
    case "kaprodi":
      return "kaprodi";
    case "kotc":
      return "kotc";
    default:
      return "p2mpp";
  }
};

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [currentRole, setCurrentRole] = useState<UserRole>(
    mapBackendRole(user?.role)
  );

  // Sync role when user changes (login/logout)
  useEffect(() => {
    if (user?.role) {
      setCurrentRole(mapBackendRole(user.role));
    }
  }, [user?.role]);

  // For Kaprodi, use the program name from the authenticated user
  const selectedProdi =
    currentRole === "kaprodi"
      ? user?.program_name ?? "Teknik Informatika"
      : null;

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        selectedProdi,
        roleLabels,
        roleDescriptions,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
}
