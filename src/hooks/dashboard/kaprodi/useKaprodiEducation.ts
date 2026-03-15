import { BookOpen, GraduationCap, Target, Award } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import type { EducationMetric, KompetensiRow } from "../p2mpp/useP2mppEducation";

export function useKaprodiEducation() {
  const { selectedProdi } = useRole();
  const prodi = selectedProdi || "Teknik Informatika";
  const filters = { prodi, jenjang: "all", tahun: "all" };

  const metrics: EducationMetric[] = [
    { title: "IPK Rata-rata Prodi", value: "3.45", icon: GraduationCap, color: "text-primary" },
    { title: "Kompetensi Sesuai", value: "82.1%", icon: Target, color: "text-emerald-500" },
    { title: "Lanjut Studi", value: "15.8%", icon: BookOpen, color: "text-cyan-500" },
    { title: "Bersertifikasi", value: "52.3%", icon: Award, color: "text-amber-500" },
  ];

  const kompetensiRows: KompetensiRow[] = [
    { kompetensi: "Pengetahuan Teknis", dicapai: 4.0, dibutuhkan: 4.2, gap: -0.2 },
    { kompetensi: "Kemampuan Analitis", dicapai: 3.8, dibutuhkan: 4.3, gap: -0.5 },
    { kompetensi: "Komunikasi", dicapai: 3.6, dibutuhkan: 3.8, gap: -0.2 },
    { kompetensi: "Kerja Tim", dicapai: 4.1, dibutuhkan: 3.9, gap: 0.2 },
    { kompetensi: "Problem Solving", dicapai: 3.7, dibutuhkan: 4.5, gap: -0.8 },
    { kompetensi: "Digital Literacy", dicapai: 4.2, dibutuhkan: 4.1, gap: 0.1 },
  ];

  return { prodi, filters, metrics, kompetensiRows };
}
