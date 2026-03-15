import { Users, Briefcase, Clock, GraduationCap } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import type { StatCardData } from "../p2mpp/useP2mppOverview";

export interface TahunRow {
  tahun: string;
  responden: number;
  bekerja: string;
  ipk: string;
  tunggu: string;
  gaji: string;
}

export function useKaprodiOverview() {
  const { selectedProdi } = useRole();
  const prodi = selectedProdi || "Teknik Informatika";
  const filters = { prodi, jenjang: "all", tahun: "all" };

  const stats: StatCardData[] = [
    { title: "Total Alumni Prodi", value: "142", icon: Users, description: prodi, color: "orange" },
    { title: "Response Rate", value: "118", icon: Users, description: "Yang isi kuesioner", color: "cyan" },
    { title: "Tingkat Kerja", value: "78.0%", change: "+3.1%", changeType: "up", icon: Briefcase, description: "Sudah bekerja", color: "emerald" },
    { title: "Waktu Tunggu", value: "2.8", icon: Clock, description: "Bulan rata-rata", color: "cyan" },
    { title: "IPK Rata-rata", value: "3.45", icon: GraduationCap, description: "Lulusan prodi", color: "amber" },
  ];

  const tahunRows: TahunRow[] = [
    { tahun: "2023", responden: 45, bekerja: "82.2%", ipk: "3.48", tunggu: "2.5 bulan", gaji: "Rp 5.50M" },
    { tahun: "2022", responden: 42, bekerja: "76.2%", ipk: "3.42", tunggu: "3.0 bulan", gaji: "Rp 5.10M" },
    { tahun: "2021", responden: 31, bekerja: "74.2%", ipk: "3.44", tunggu: "3.1 bulan", gaji: "Rp 4.80M" },
  ];

  return { prodi, filters, stats, tahunRows };
}
