import { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "p2mpp" | "kaprodi" | "kotc";

interface RoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  selectedProdi: string | null; // For Kaprodi role, hardcoded for demo
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
  const [currentRole, setCurrentRole] = useState<UserRole>("p2mpp");

  // For Kaprodi, hardcode prodi for demo
  const selectedProdi = currentRole === "kaprodi" ? "Teknik Informatika" : null;

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
