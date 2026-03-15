import { useState } from "react";
import { BookOpen, GraduationCap, Target, Award, LucideIcon } from "lucide-react";

export interface EducationMetric {
  title: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

export interface KompetensiRow {
  kompetensi: string;
  dicapai: number;
  dibutuhkan: number;
  gap: number;
}

export function useP2mppEducation() {
  const [selectedProdi, setSelectedProdi] = useState("all");
  const [selectedTahun, setSelectedTahun] = useState("all");
  const [selectedJenjang, setSelectedJenjang] = useState("all");

  const filters = { prodi: selectedProdi, jenjang: selectedJenjang, tahun: selectedTahun };

  const metrics: EducationMetric[] = [
    { title: "IPK Rata-rata", value: "3.41", icon: GraduationCap, color: "text-primary" },
    { title: "Kompetensi Sesuai", value: "78.5%", icon: Target, color: "text-emerald-500" },
    { title: "Lanjut Studi", value: "12.3%", icon: BookOpen, color: "text-cyan-500" },
    { title: "Bersertifikasi", value: "45.2%", icon: Award, color: "text-amber-500" },
  ];

  const kompetensiRows: KompetensiRow[] = [
    { kompetensi: "Pengetahuan Teknis", dicapai: 3.8, dibutuhkan: 4.0, gap: -0.2 },
    { kompetensi: "Kemampuan Analitis", dicapai: 3.6, dibutuhkan: 4.2, gap: -0.6 },
    { kompetensi: "Komunikasi", dicapai: 3.5, dibutuhkan: 4.0, gap: -0.5 },
    { kompetensi: "Kerja Tim", dicapai: 4.0, dibutuhkan: 3.8, gap: 0.2 },
    { kompetensi: "Problem Solving", dicapai: 3.4, dibutuhkan: 4.3, gap: -0.9 },
    { kompetensi: "Digital Literacy", dicapai: 3.9, dibutuhkan: 4.0, gap: -0.1 },
  ];

  return {
    selectedProdi, setSelectedProdi,
    selectedTahun, setSelectedTahun,
    selectedJenjang, setSelectedJenjang,
    filters, metrics, kompetensiRows,
  };
}
