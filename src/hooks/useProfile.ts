import { useAuth } from "@/contexts/AuthContext";
import { roleLabels, roleDescriptions } from "@/contexts/RoleContext";
import type { UserRole } from "@/contexts/RoleContext";

export interface ProfileData {
  id: number;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  roleDescription: string;
  programName: string | null;
  programDegree: string | null;
  programCode: string | null;
  initials: string;
}

export function useProfile(): { profile: ProfileData | null; isLoading: boolean } {
  const { user, isLoading } = useAuth();

  if (!user) return { profile: null, isLoading };

  const knownRole = ["p2mpp", "kaprodi", "kotc"].includes(user.role);
  const roleKey = knownRole ? (user.role as UserRole) : "p2mpp";

  const profile: ProfileData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: knownRole ? roleLabels[roleKey] : user.role,
    roleDescription: knownRole ? roleDescriptions[roleKey] : user.role,
    programName: user.program_name,
    programDegree: user.program_degree,
    programCode: user.program_code,
    initials: user.name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .substring(0, 2)
      .toUpperCase(),
  };

  return { profile, isLoading };
}
