import { useAuth } from "@/hooks/auth/useAuth";
import { roleLabels, roleDescriptions, mapBackendRole } from "@/lib/rbac";

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

  // Pakai mapBackendRole supaya kosakata role tunggal dengan RoleContext.
  // Versi lama mencocokkan ke daftar ["p2mpp","kaprodi","kotc"] yang sudah
  // tidak dikirim backend, lalu jatuh ke fallback "p2mpp" -- membuat semua
  // role tampil sebagai Pimpinan di halaman profil.
  const roleKey = mapBackendRole(user.role);

  const profile: ProfileData = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: roleLabels[roleKey],
    roleDescription: roleDescriptions[roleKey],
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
