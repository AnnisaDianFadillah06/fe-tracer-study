import { useRole } from "@/contexts/RoleContext";

export function useKaprodiAnalytics() {
  const { selectedProdi } = useRole();
  const prodi = selectedProdi || "Teknik Informatika";
  const description = `Clustering & Survival Analysis untuk ${prodi}`;

  return { prodi, description };
}
