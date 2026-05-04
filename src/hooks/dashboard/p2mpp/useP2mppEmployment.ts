import { useState } from "react";
import { Briefcase, LucideIcon } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";

// ── Types ──
export interface StatCardData {
  title: string;
  value: string;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  description: string;
  color: "amber" | "cyan" | "emerald" | "orange" | "purple";
  thresholdValue?: number;
  thresholdLabel?: string;
  thresholdMet?: boolean;
}

export interface KpiComboData { year: string; value: number; }
export interface KpiStackedData { name: string; positive: number; negative: number; }
export interface KpiDistributionData { category: string; value: number; color: string; }
export interface LamThreshold { name: string; threshold: number; }
export interface MultiLineDataPoint { year: string; [key: string]: string | number; }

// ── Prodi list ──
const PRODI_NAMES = [
  "D3 Teknik Informatika", "D3 Teknik Elektronika", "D4 Teknik Informatika",
  "D4 Teknik Mesin", "D3 Akuntansi", "D4 Administrasi Bisnis",
  "D3 Teknik Sipil", "D4 Teknik Listrik", "D3 Teknik Mesin", "D4 Teknik Kimia",
];

function generateProdiStacked(basePositive: number, seed: number): KpiStackedData[] {
  return PRODI_NAMES.map((name, i) => {
    const positive = Math.min(100, Math.max(10, basePositive + ((i * seed) % 30) - 15));
    return { name, positive: +positive.toFixed(1), negative: +(100 - positive).toFixed(1) };
  });
}

// ── LAM thresholds ──
const lamKeterserapan: LamThreshold[] = PRODI_NAMES.map((name, i) => ({
  name, threshold: 75 + ((i * 3) % 15),
}));

// ── Fallback static data ──
const fallbackKeterserapanCombo: KpiComboData[] = [
  { year: "2021", value: 74.0 },
  { year: "2022", value: 80.0 },
  { year: "2023", value: 85.0 },
];

const fallbackDistribusiKeterserapan: Record<string, KpiDistributionData[]> = {
  all: [
    { category: "Bekerja", value: 62.5, color: "#10b981" },
    { category: "Wiraswasta", value: 8.4, color: "#06b6d4" },
    { category: "Studi Lanjut", value: 7.2, color: "#8b5cf6" },
    { category: "Mencari Kerja", value: 12.8, color: "#f59e0b" },
    { category: "Belum Memungkinkan", value: 9.1, color: "#ef4444" },
  ],
};

const fallbackDistribusiInstansi: Record<string, KpiDistributionData[]> = {
  all: [
    { category: "Perusahaan Swasta", value: 42.5, color: "#3b82f6" },
    { category: "Instansi Pemerintah", value: 12.0, color: "#10b981" },
    { category: "Wiraswasta/Perusahaan", value: 8.4, color: "#06b6d4" },
    { category: "BUMN/BUMD", value: 15.3, color: "#f59e0b" },
    { category: "Organisasi Non-profit", value: 4.8, color: "#8b5cf6" },
    { category: "Institusi/Organisasi", value: 10.5, color: "#ec4899" },
    { category: "Lainnya", value: 6.5, color: "#6b7280" },
  ],
};

const fallbackLevelPerusahaan: MultiLineDataPoint[] = [
  { year: "2021", nasional: 55.0, multinasional: 20.0, lokal: 25.0 },
  { year: "2022", nasional: 52.0, multinasional: 24.0, lokal: 24.0 },
  { year: "2023", nasional: 50.0, multinasional: 28.0, lokal: 22.0 },
];

export function useP2mppEmployment() {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const { summary, isLoading } = useDashboardData();

  const hasData = summary && summary.totalAlumni > 0;

  // Build keterserapan combo from real data
  const keterserapanCombo: KpiComboData[] = hasData
    ? Object.entries(summary.byYear)
        .filter(([year]) => year !== "unknown")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, data]) => ({
          year,
          value: data.total > 0
            ? +((data.bekerja + data.wiraswasta) / data.total * 100).toFixed(1)
            : 0,
        }))
    : fallbackKeterserapanCombo;

  // Build distribusi keterserapan from real data
  const distribusiKeterserapan: Record<string, KpiDistributionData[]> = hasData
    ? {
        all: [
          {
            category: "Bekerja",
            value: +((summary.bekerja / summary.totalAlumni) * 100).toFixed(1),
            color: "#10b981",
          },
          {
            category: "Wiraswasta",
            value: +((summary.wiraswasta / summary.totalAlumni) * 100).toFixed(1),
            color: "#06b6d4",
          },
          {
            category: "Studi Lanjut",
            value: +((summary.studiLanjut / summary.totalAlumni) * 100).toFixed(1),
            color: "#8b5cf6",
          },
          {
            category: "Mencari Kerja",
            value: +((summary.mencariKerja / summary.totalAlumni) * 100).toFixed(1),
            color: "#f59e0b",
          },
          {
            category: "Belum Memungkinkan",
            value: +((summary.belumBekerja / summary.totalAlumni) * 100).toFixed(1),
            color: "#ef4444",
          },
        ],
      }
    : fallbackDistribusiKeterserapan;

  const latestValue = keterserapanCombo.length > 0
    ? keterserapanCombo[keterserapanCombo.length - 1].value
    : 85;

  const stats: StatCardData[] = [
    {
      title: "Keterserapan Lulusan",
      value: `${latestValue}%`,
      change: hasData ? undefined : "+5% vs 2022",
      changeType: hasData ? undefined : "up",
      icon: Briefcase,
      description: hasData
        ? `${summary.bekerja + summary.wiraswasta} dari ${summary.totalAlumni} alumni`
        : "Tahun terakhir (2023)",
      color: "emerald",
      thresholdValue: 80,
      thresholdLabel: "Threshold BAN-PT",
      thresholdMet: latestValue >= 80,
    },
  ];

  return {
    selectedYear,
    setSelectedYear,
    stats,
    isLoading,
    kpiKeterserapan: {
      combo: keterserapanCombo,
      threshold: 80,
      perProdi: {
        all: generateProdiStacked(latestValue, 7),
      },
      distribusiKeterserapan,
      distribusiInstansi: fallbackDistribusiInstansi,
      lamThresholds: lamKeterserapan,
    },
    levelPerusahaan: fallbackLevelPerusahaan,
  };
}
