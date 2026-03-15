import { useState } from "react";
import { Briefcase, LucideIcon } from "lucide-react";

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

// ── KPI Keterserapan combo data ──
const keterserapanCombo: KpiComboData[] = [
  { year: "2021", value: 74.0 },
  { year: "2022", value: 80.0 },
  { year: "2023", value: 85.0 },
];
const keterserapanThreshold = 80;
const keterserapanPerProdi: Record<string, KpiStackedData[]> = {
  all: generateProdiStacked(80, 7),
  "2021": generateProdiStacked(74, 3),
  "2022": generateProdiStacked(80, 5),
  "2023": generateProdiStacked(85, 9),
};

// ── Distribusi Keterserapan ──
const distribusiKeterserapan: Record<string, KpiDistributionData[]> = {
  all: [
    { category: "Bekerja", value: 62.5, color: "#10b981" },
    { category: "Wiraswasta", value: 8.4, color: "#06b6d4" },
    { category: "Studi Lanjut", value: 7.2, color: "#8b5cf6" },
    { category: "Mencari Kerja", value: 12.8, color: "#f59e0b" },
    { category: "Belum Memungkinkan", value: 9.1, color: "#ef4444" },
  ],
  "2021": [
    { category: "Bekerja", value: 58.0, color: "#10b981" },
    { category: "Wiraswasta", value: 5.2, color: "#06b6d4" },
    { category: "Studi Lanjut", value: 8.0, color: "#8b5cf6" },
    { category: "Mencari Kerja", value: 16.8, color: "#f59e0b" },
    { category: "Belum Memungkinkan", value: 12.0, color: "#ef4444" },
  ],
  "2022": [
    { category: "Bekerja", value: 63.0, color: "#10b981" },
    { category: "Wiraswasta", value: 7.1, color: "#06b6d4" },
    { category: "Studi Lanjut", value: 7.5, color: "#8b5cf6" },
    { category: "Mencari Kerja", value: 12.4, color: "#f59e0b" },
    { category: "Belum Memungkinkan", value: 10.0, color: "#ef4444" },
  ],
  "2023": [
    { category: "Bekerja", value: 66.5, color: "#10b981" },
    { category: "Wiraswasta", value: 8.4, color: "#06b6d4" },
    { category: "Studi Lanjut", value: 6.1, color: "#8b5cf6" },
    { category: "Mencari Kerja", value: 10.2, color: "#f59e0b" },
    { category: "Belum Memungkinkan", value: 8.8, color: "#ef4444" },
  ],
};

// ── Distribusi Jenis Instansi ──
const distribusiInstansi: Record<string, KpiDistributionData[]> = {
  all: [
    { category: "Perusahaan Swasta", value: 42.5, color: "#3b82f6" },
    { category: "Instansi Pemerintah", value: 12.0, color: "#10b981" },
    { category: "Wiraswasta/Perusahaan", value: 8.4, color: "#06b6d4" },
    { category: "BUMN/BUMD", value: 15.3, color: "#f59e0b" },
    { category: "Organisasi Non-profit", value: 4.8, color: "#8b5cf6" },
    { category: "Institusi/Organisasi", value: 10.5, color: "#ec4899" },
    { category: "Lainnya", value: 6.5, color: "#6b7280" },
  ],
  "2021": [
    { category: "Perusahaan Swasta", value: 40.0, color: "#3b82f6" },
    { category: "Instansi Pemerintah", value: 13.0, color: "#10b981" },
    { category: "Wiraswasta/Perusahaan", value: 5.2, color: "#06b6d4" },
    { category: "BUMN/BUMD", value: 16.0, color: "#f59e0b" },
    { category: "Organisasi Non-profit", value: 5.8, color: "#8b5cf6" },
    { category: "Institusi/Organisasi", value: 12.0, color: "#ec4899" },
    { category: "Lainnya", value: 8.0, color: "#6b7280" },
  ],
  "2022": [
    { category: "Perusahaan Swasta", value: 43.0, color: "#3b82f6" },
    { category: "Instansi Pemerintah", value: 11.5, color: "#10b981" },
    { category: "Wiraswasta/Perusahaan", value: 7.1, color: "#06b6d4" },
    { category: "BUMN/BUMD", value: 15.5, color: "#f59e0b" },
    { category: "Organisasi Non-profit", value: 4.5, color: "#8b5cf6" },
    { category: "Institusi/Organisasi", value: 11.0, color: "#ec4899" },
    { category: "Lainnya", value: 7.4, color: "#6b7280" },
  ],
  "2023": [
    { category: "Perusahaan Swasta", value: 44.5, color: "#3b82f6" },
    { category: "Instansi Pemerintah", value: 11.5, color: "#10b981" },
    { category: "Wiraswasta/Perusahaan", value: 8.4, color: "#06b6d4" },
    { category: "BUMN/BUMD", value: 14.5, color: "#f59e0b" },
    { category: "Organisasi Non-profit", value: 4.1, color: "#8b5cf6" },
    { category: "Institusi/Organisasi", value: 10.5, color: "#ec4899" },
    { category: "Lainnya", value: 6.5, color: "#6b7280" },
  ],
};

// ── Multi-line: Level Perusahaan ──
const levelPerusahaan: MultiLineDataPoint[] = [
  { year: "2021", nasional: 55.0, multinasional: 20.0, lokal: 25.0 },
  { year: "2022", nasional: 52.0, multinasional: 24.0, lokal: 24.0 },
  { year: "2023", nasional: 50.0, multinasional: 28.0, lokal: 22.0 },
];

// ── Stat card ──
const stats: StatCardData[] = [
  {
    title: "Keterserapan Lulusan (2023)",
    value: "85%",
    change: "+5% vs 2022",
    changeType: "up",
    icon: Briefcase,
    description: "Tahun terakhir (2023)",
    color: "emerald",
    thresholdValue: 80,
    thresholdLabel: "Threshold BAN-PT",
    thresholdMet: true,
  },
];

export function useP2mppEmployment() {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  return {
    selectedYear,
    setSelectedYear,
    stats,
    kpiKeterserapan: {
      combo: keterserapanCombo,
      threshold: keterserapanThreshold,
      perProdi: keterserapanPerProdi,
      distribusiKeterserapan,
      distribusiInstansi,
      lamThresholds: lamKeterserapan,
    },
    levelPerusahaan,
  };
}
