import { createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type UserRole = "p2mpp" | "kaprodi" | "kotc";

interface RoleContextType {
  currentRole: UserRole;
  selectedProdi: string | null;
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

export function RoleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Derive role from authenticated user; fallback to p2mpp if unknown
  const currentRole: UserRole =
    user?.role && ["p2mpp", "kaprodi", "kotc"].includes(user.role)
      ? (user.role as UserRole)
      : "p2mpp";

  // For kaprodi, use program_name from the real user data
  const selectedProdi =
    currentRole === "kaprodi" ? (user?.program_name ?? null) : null;

  return (
    <RoleContext.Provider
      value={{
        currentRole,
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