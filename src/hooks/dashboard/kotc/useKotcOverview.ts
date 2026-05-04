import { ClipboardCheck, MailCheck, Users, Clock, AlertTriangle } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { StatCardData } from "../p2mpp/useP2mppOverview";

export interface PengumpulanRow {
  jenjang: string;
  target: number;
  terkumpul: number;
  rate: string;
  sisa: number;
}

export function useKotcOverview() {
  const filters = { prodi: "all", jenjang: "all", tahun: "all" };
  const { summary, isLoading } = useDashboardData();

  const hasData = summary && summary.totalAlumni > 0;

  const totalKuesioner = hasData ? summary.totalAlumni : 1692;
  const sudahMengisi = hasData ? summary.totalResponden : 1227;
  const belumMengisi = totalKuesioner - sudahMengisi;
  const responseRate = totalKuesioner > 0
    ? ((sudahMengisi / totalKuesioner) * 100).toFixed(1)
    : "72.5";

  const stats: StatCardData[] = [
    { title: "Total Kuesioner", value: totalKuesioner.toLocaleString(), icon: ClipboardCheck, description: "Kuesioner dikirim", color: "orange" },
    { title: "Sudah Mengisi", value: sudahMengisi.toLocaleString(), icon: MailCheck, description: "Response masuk", color: "cyan" },
    { title: "Response Rate", value: `${responseRate}%`, icon: Users, description: "Tingkat respons", color: "emerald" },
    { title: "Rata-rata Waktu", value: "4.2", icon: Clock, description: "Hari pengisian", color: "amber" },
    { title: "Belum Mengisi", value: belumMengisi.toLocaleString(), icon: AlertTriangle, description: "Follow-up needed", color: "purple" },
  ];

  const pengumpulanRows: PengumpulanRow[] = [
    { jenjang: "D-III", target: 1200, terkumpul: 970, rate: "80.8%", sisa: 230 },
    { jenjang: "D-IV", target: 850, terkumpul: 707, rate: "83.2%", sisa: 143 },
    { jenjang: "S2-Terapan", target: 20, terkumpul: 15, rate: "75.0%", sisa: 5 },
  ];

  return { filters, stats, pengumpulanRows, isLoading };
}
