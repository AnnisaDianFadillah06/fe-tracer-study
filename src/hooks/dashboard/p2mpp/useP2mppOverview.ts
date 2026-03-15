import { Users, Briefcase, Clock, Target, LucideIcon } from "lucide-react";

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

export interface KpiComboData {
  year: string;
  value: number;
}

export interface KpiStackedData {
  name: string;
  positive: number;
  negative: number;
}

export interface KpiDistributionData {
  category: string;
  value: number;
  color: string;
}

export interface LamThreshold {
  name: string;
  threshold: number;
}

// ── Prodi list for drill-down ──
const PRODI_NAMES = [
  "D3 Teknik Informatika",
  "D3 Teknik Elektronika",
  "D4 Teknik Informatika",
  "D4 Teknik Mesin",
  "D3 Akuntansi",
  "D4 Administrasi Bisnis",
  "D3 Teknik Sipil",
  "D4 Teknik Listrik",
  "D3 Teknik Mesin",
  "D4 Teknik Kimia",
];

// ── LAM thresholds per prodi (different per KPI) ──
const lamPartisipasi: LamThreshold[] = PRODI_NAMES.map((name, i) => ({
  name,
  threshold: 65 + ((i * 3) % 15),
}));

const lamWirausaha: LamThreshold[] = PRODI_NAMES.map((name, i) => ({
  name,
  threshold: 3 + ((i * 2) % 8),
}));

const lamMasaTunggu: LamThreshold[] = PRODI_NAMES.map((name, i) => ({
  name,
  threshold: 70 + ((i * 4) % 15),
}));

const lamKesesuaian: LamThreshold[] = PRODI_NAMES.map((name, i) => ({
  name,
  threshold: 60 + ((i * 3) % 20),
}));

// ── Helper: generate prodi stacked data ──
function generateProdiStacked(basePositive: number, seed: number): KpiStackedData[] {
  return PRODI_NAMES.map((name, i) => {
    const positive = Math.min(100, Math.max(10, basePositive + ((i * seed) % 30) - 15));
    return { name, positive: +positive.toFixed(1), negative: +(100 - positive).toFixed(1) };
  });
}

// ── KPI 1: Tingkat Partisipasi Alumni ──
const partisipasiCombo: KpiComboData[] = [
  { year: "2021", value: 67.0 },
  { year: "2022", value: 76.0 },
  { year: "2023", value: 78.0 },
];
const partisipasiThreshold = 70;
const partisipasiPerProdi: Record<string, KpiStackedData[]> = {
  all: generateProdiStacked(73, 7),
  "2021": generateProdiStacked(67, 3),
  "2022": generateProdiStacked(76, 5),
  "2023": generateProdiStacked(78, 11),
};

// ── KPI 2: Lulusan Berwirausaha ──
const wirausahaCombo: KpiComboData[] = [
  { year: "2021", value: 5.2 },
  { year: "2022", value: 7.1 },
  { year: "2023", value: 8.4 },
];
const wirausahaThreshold = 5;
const wirausahaPerProdi: Record<string, KpiStackedData[]> = {
  all: generateProdiStacked(7, 4),
  "2021": generateProdiStacked(5, 2),
  "2022": generateProdiStacked(7, 6),
  "2023": generateProdiStacked(8, 9),
};

// ── KPI 3: Masa Tunggu Kerja ≤ 6 Bulan ──
const masaTungguCombo: KpiComboData[] = [
  { year: "2021", value: 72.0 },
  { year: "2022", value: 78.0 },
  { year: "2023", value: 82.0 },
];
const masaTungguThreshold = 75;
const masaTungguPerProdi: Record<string, KpiStackedData[]> = {
  all: generateProdiStacked(77, 8),
  "2021": generateProdiStacked(72, 5),
  "2022": generateProdiStacked(78, 7),
  "2023": generateProdiStacked(82, 3),
};

const masaTungguDistribution: Record<string, KpiDistributionData[]> = {
  all: [
    { category: "Sebelum Lulus", value: 18.5, color: "#06b6d4" },
    { category: "WT < 3 bulan", value: 34.2, color: "#10b981" },
    { category: "3 ≤ WT ≤ 6 bulan", value: 24.8, color: "#f59e0b" },
    { category: "WT > 6 bulan", value: 22.5, color: "#ef4444" },
  ],
  "2021": [
    { category: "Sebelum Lulus", value: 15.0, color: "#06b6d4" },
    { category: "WT < 3 bulan", value: 30.0, color: "#10b981" },
    { category: "3 ≤ WT ≤ 6 bulan", value: 27.0, color: "#f59e0b" },
    { category: "WT > 6 bulan", value: 28.0, color: "#ef4444" },
  ],
  "2022": [
    { category: "Sebelum Lulus", value: 19.0, color: "#06b6d4" },
    { category: "WT < 3 bulan", value: 35.0, color: "#10b981" },
    { category: "3 ≤ WT ≤ 6 bulan", value: 24.0, color: "#f59e0b" },
    { category: "WT > 6 bulan", value: 22.0, color: "#ef4444" },
  ],
  "2023": [
    { category: "Sebelum Lulus", value: 21.5, color: "#06b6d4" },
    { category: "WT < 3 bulan", value: 37.5, color: "#10b981" },
    { category: "3 ≤ WT ≤ 6 bulan", value: 23.5, color: "#f59e0b" },
    { category: "WT > 6 bulan", value: 17.5, color: "#ef4444" },
  ],
};

// ── KPI 4: Kesesuaian Bidang Kerja ──
const kesesuaianCombo: KpiComboData[] = [
  { year: "2021", value: 65.0 },
  { year: "2022", value: 71.0 },
  { year: "2023", value: 75.0 },
];
const kesesuaianThreshold = 70;
const kesesuaianPerProdi: Record<string, KpiStackedData[]> = {
  all: generateProdiStacked(70, 6),
  "2021": generateProdiStacked(65, 4),
  "2022": generateProdiStacked(71, 8),
  "2023": generateProdiStacked(75, 5),
};

const kesesuaianDistribution: Record<string, KpiDistributionData[]> = {
  all: [
    { category: "Sangat Erat", value: 28.0, color: "#10b981" },
    { category: "Erat", value: 25.5, color: "#06b6d4" },
    { category: "Cukup Erat", value: 21.5, color: "#f59e0b" },
    { category: "Kurang Erat", value: 15.0, color: "#f97316" },
    { category: "Tidak Sama Sekali", value: 10.0, color: "#ef4444" },
  ],
  "2021": [
    { category: "Sangat Erat", value: 24.0, color: "#10b981" },
    { category: "Erat", value: 22.0, color: "#06b6d4" },
    { category: "Cukup Erat", value: 23.0, color: "#f59e0b" },
    { category: "Kurang Erat", value: 18.0, color: "#f97316" },
    { category: "Tidak Sama Sekali", value: 13.0, color: "#ef4444" },
  ],
  "2022": [
    { category: "Sangat Erat", value: 27.0, color: "#10b981" },
    { category: "Erat", value: 25.0, color: "#06b6d4" },
    { category: "Cukup Erat", value: 22.0, color: "#f59e0b" },
    { category: "Kurang Erat", value: 16.0, color: "#f97316" },
    { category: "Tidak Sama Sekali", value: 10.0, color: "#ef4444" },
  ],
  "2023": [
    { category: "Sangat Erat", value: 30.0, color: "#10b981" },
    { category: "Erat", value: 27.0, color: "#06b6d4" },
    { category: "Cukup Erat", value: 20.0, color: "#f59e0b" },
    { category: "Kurang Erat", value: 14.0, color: "#f97316" },
    { category: "Tidak Sama Sekali", value: 9.0, color: "#ef4444" },
  ],
};

// ── Stats cards ──
const stats: StatCardData[] = [
  {
    title: "Partisipasi Alumni (2023)",
    value: "78%",
    change: "+2% vs 2022",
    changeType: "up",
    icon: Users,
    description: "Tahun terakhir (2023)",
    color: "emerald",
    thresholdValue: 70,
    thresholdLabel: "Threshold BAN-PT",
    thresholdMet: true,
  },
  {
    title: "Lulusan Wirausaha (2023)",
    value: "8.4%",
    change: "+1.3% vs 2022",
    changeType: "up",
    icon: Briefcase,
    description: "Tahun terakhir (2023)",
    color: "cyan",
    thresholdValue: 5,
    thresholdLabel: "Threshold BAN-PT",
    thresholdMet: true,
  },
  {
    title: "WT ≤ 6 Bulan (2023)",
    value: "82%",
    change: "+4% vs 2022",
    changeType: "up",
    icon: Clock,
    description: "Tahun terakhir (2023)",
    color: "amber",
    thresholdValue: 75,
    thresholdLabel: "Threshold BAN-PT",
    thresholdMet: true,
  },
  {
    title: "Kesesuaian Bidang (2023)",
    value: "75%",
    change: "+4% vs 2022",
    changeType: "up",
    icon: Target,
    description: "Tahun terakhir (2023)",
    color: "purple",
    thresholdValue: 70,
    thresholdLabel: "Threshold BAN-PT",
    thresholdMet: true,
  },
];

export function useP2mppOverview() {
  return {
    stats,
    kpiPartisipasi: {
      combo: partisipasiCombo,
      threshold: partisipasiThreshold,
      perProdi: partisipasiPerProdi,
      lamThresholds: lamPartisipasi,
    },
    kpiWirausaha: {
      combo: wirausahaCombo,
      threshold: wirausahaThreshold,
      perProdi: wirausahaPerProdi,
      lamThresholds: lamWirausaha,
    },
    kpiMasaTunggu: {
      combo: masaTungguCombo,
      threshold: masaTungguThreshold,
      perProdi: masaTungguPerProdi,
      distribution: masaTungguDistribution,
      lamThresholds: lamMasaTunggu,
    },
    kpiKesesuaian: {
      combo: kesesuaianCombo,
      threshold: kesesuaianThreshold,
      perProdi: kesesuaianPerProdi,
      distribution: kesesuaianDistribution,
      lamThresholds: lamKesesuaian,
    },
  };
}
