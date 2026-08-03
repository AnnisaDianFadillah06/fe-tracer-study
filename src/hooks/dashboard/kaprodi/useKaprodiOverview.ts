import { Users, Briefcase, Clock, GraduationCap } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useDashboardData } from "@/hooks/dashboard/useDashboardData";
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
  const { summary, isLoading } = useDashboardData();

  const hasData = summary && summary.totalAlumni > 0;
  const prodiData = hasData ? summary.byProdi[prodi] : null;

  const totalProdi = prodiData?.total ?? 142;
  const bekerjaProdi = prodiData?.bekerja ?? 0;
  const wirausahaProdi = prodiData?.wiraswasta ?? 0;
  const bekerjaPersen = totalProdi > 0
    ? (((bekerjaProdi + wirausahaProdi) / totalProdi) * 100).toFixed(1)
    : "78.0";
  const avgWaiting = prodiData?.avgWaiting?.toFixed(1) ?? "2.8";
  const avgSalary = prodiData?.avgSalary
    ? `Rp ${(prodiData.avgSalary / 1_000_000).toFixed(2)}M`
    : "Rp 5.50M";

  const stats: StatCardData[] = [
    { title: "Total Alumni Prodi", value: String(totalProdi), icon: Users, description: prodi, color: "orange" },
    { title: "Response Rate", value: hasData ? String(totalProdi) : "118", icon: Users, description: "Yang isi kuesioner", color: "cyan" },
    { title: "Tingkat Kerja", value: `${bekerjaPersen}%`, icon: Briefcase, description: "Sudah bekerja", color: "emerald" },
    { title: "Waktu Tunggu", value: avgWaiting, icon: Clock, description: "Bulan rata-rata", color: "cyan" },
    { title: "IPK Rata-rata", value: "3.45", icon: GraduationCap, description: "Lulusan prodi", color: "amber" },
  ];

  // Build tahun rows from real year data
  const tahunRows: TahunRow[] = hasData
    ? Object.entries(summary.byYear)
        .filter(([year]) => year !== "unknown")
        .sort(([a], [b]) => b.localeCompare(a)) // newest first
        .slice(0, 5)
        .map(([tahun, data]) => ({
          tahun,
          responden: data.total,
          bekerja: data.total > 0
            ? `${(((data.bekerja + data.wiraswasta) / data.total) * 100).toFixed(1)}%`
            : "0%",
          ipk: "3.45",
          tunggu: `${data.avgWaiting.toFixed(1)} bulan`,
          gaji: avgSalary,
        }))
    : [
        { tahun: "2023", responden: 45, bekerja: "82.2%", ipk: "3.48", tunggu: "2.5 bulan", gaji: "Rp 5.50M" },
        { tahun: "2022", responden: 42, bekerja: "76.2%", ipk: "3.42", tunggu: "3.0 bulan", gaji: "Rp 5.10M" },
        { tahun: "2021", responden: 31, bekerja: "74.2%", ipk: "3.44", tunggu: "3.1 bulan", gaji: "Rp 4.80M" },
      ];

  return { prodi, filters, stats, tahunRows, isLoading };
}
