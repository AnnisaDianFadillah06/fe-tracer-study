import { useRole } from "@/contexts/RoleContext";

export function useKaprodiEmployment() {
  const { selectedProdi } = useRole();
  const prodi = selectedProdi || "Teknik Informatika";
  const filters = { prodi, jenjang: "all", tahun: "all" };

  return { prodi, filters };
}
