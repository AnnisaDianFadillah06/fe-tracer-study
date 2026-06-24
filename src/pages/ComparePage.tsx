/**
 * ComparePage.tsx
 *
 * Halaman perbandingan multi-prodi.
 *
 * chartType === "absorption" → data dari BE (useKeterserapanBandingkan)
 * chartType lainnya          → logika mock yang sudah ada sebelumnya
 *
 * Segment untuk absorption sepenuhnya dinamis dari BE.
 * Segment untuk KPI lain hardcode seperti semula (akan diganti saat BE tersedia).
 */

import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Info, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tooltip as UITooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import DrillDownModal from "@/components/dashboard/DrillDownModal";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import {
  useKeterserapanBandingkan,
  useKeterserapanDrillDown,
  BandingkanProdiItem,
} from "@/hooks/useKeterserapan";
import {
  useKesesuaianBandingkan,
  useKesesuaianDrillDown,
} from "@/hooks/useKesesuaian";
import {
  useMasaTungguBandingkan,
  useMasaTungguDrillDown,
} from "@/hooks/useMasaTunggu";
import {
  useWirausahaBandingkan,
  useWirausahaDrillDown,
} from "@/hooks/useWirausaha";
import {
  usePendapatanBandingkan,
  usePendapatanKelompokBandingkan,
  usePendapatanDrillDown,
  PendapatanBandingkanItem,
} from "@/hooks/usePendapatan";
import { useInstansiBandingkan, useInstansiDrillDown } from "@/hooks/useInstansi";
import { usePembiayaanBandingkan, usePembiayaanDrillDown } from "@/hooks/usePembiayaan";
import { useMetodePembelajaranBandingkan, useMetodePembelajaranDrillDown } from "@/hooks/useMetodePembelajaran";
import { useKompetensiGapBandingkan, useKompetensiGapDrillDown } from "@/hooks/useKompetensi";
import { useResponseRateBandingkan, useResponseRateDrillDown, statusNameToKey } from "@/hooks/useResponseRate";
import { buildColorMap, getShortLabel } from "@/lib/chartColors";
import {
  MOCK_STUDENTS, Student,
  SUMBER_BIAYA_OPTIONS, CARA_MENDAPAT_KERJA_OPTIONS, JENIS_INSTANSI_OPTIONS,
} from "@/lib/mockData";

// ─────────────────────────────────────────────────────────────────────────────
// CHART_CONFIGS — mock (KPI yang belum ada BE-nya)
// ─────────────────────────────────────────────────────────────────────────────

const CHART_CONFIGS: Record<string, {
  title: string;
  description: string;
  getCategories: () => { key: string; name: string; color: string; filter: (s: any) => boolean }[];
}> = {
  gender: {
    title: "Perbandingan Distribusi Gender per Prodi",
    description: "Persentase mahasiswa berdasarkan gender untuk setiap program studi",
    getCategories: () => [
      { key: "pria",   name: "Pria",   color: "#0ea5e9", filter: (s) => s.gender === "Pria" },
      { key: "wanita", name: "Wanita", color: "#f97316", filter: (s) => s.gender === "Wanita" },
    ],
  },
  status: {
    title: "Perbandingan Status Alumni per Prodi",
    description: "Distribusi status pekerjaan alumni untuk setiap program studi",
    getCategories: () => [
      { key: "bekerja",      name: "Bekerja",        color: "#10b981", filter: (s) => s.status === "Bekerja" },
      { key: "cariKerja",    name: "Mencari Kerja",  color: "#f59e0b", filter: (s) => s.status === "Mencari Kerja" },
      { key: "studiLanjut",  name: "Studi Lanjut",   color: "#0ea5e9", filter: (s) => s.status === "Studi Lanjut" },
      { key: "wiraswasta",   name: "Wiraswasta",     color: "#8b5cf6", filter: (s) => s.status === "Wiraswasta" },
      { key: "studiBekerja", name: "Studi & Bekerja",color: "#3b82f6", filter: (s) => s.status === "Studi & Bekerja" },
      { key: "belumBekerja", name: "Belum Bekerja",  color: "#6b7280", filter: (s) => s.status === "Belum Bekerja" },
    ],
  },
  kesesuaian: {
    title: "Perbandingan Kesesuaian Bidang per Prodi",
    description: "Tingkat kesesuaian pekerjaan dengan bidang studi",
    getCategories: () => [
      { key: "sangatErat", name: "Sangat Erat",       color: "#10b981", filter: (s) => s.kesesuaianBidang === "Sangat Erat" },
      { key: "erat",       name: "Erat",              color: "#22c55e", filter: (s) => s.kesesuaianBidang === "Erat" },
      { key: "cukup",      name: "Cukup Erat",        color: "#f59e0b", filter: (s) => s.kesesuaianBidang === "Cukup Erat" },
      { key: "kurang",     name: "Kurang Erat",       color: "#f97316", filter: (s) => s.kesesuaianBidang === "Kurang Erat" },
      { key: "tidak",      name: "Tidak Sesuai",      color: "#ef4444", filter: (s) => s.kesesuaianBidang === "Tidak Sesuai" },
    ],
  },
  perusahaan: {
    title: "Perbandingan Kategori Perusahaan per Prodi",
    description: "Distribusi jenis perusahaan tempat alumni bekerja",
    getCategories: () => [
      { key: "nasional",      name: "Nasional/BBH",    color: "#f97316", filter: (s) => s.kategoriPerusahaan === "Nasional/BBH" },
      { key: "multinasional", name: "Multinasional",   color: "#0ea5e9", filter: (s) => s.kategoriPerusahaan === "Multinasional" },
      { key: "lokal",         name: "Lokal/Tidak BBH", color: "#8b5cf6", filter: (s) => s.kategoriPerusahaan === "Lokal/Tidak BBH" },
    ],
  },
  kepuasan: {
    title: "Perbandingan Kepuasan Pengguna per Prodi",
    description: "Penilaian stakeholder terhadap kompetensi alumni",
    getCategories: () => [
      { key: "sangatBaik", name: "Sangat Baik", color: "#10b981", filter: () => Math.random() > 0.5 },
      { key: "baik",       name: "Baik",        color: "#22c55e", filter: () => Math.random() > 0.5 },
      { key: "cukup",      name: "Cukup",       color: "#f59e0b", filter: () => Math.random() > 0.5 },
      { key: "kurang",     name: "Kurang",      color: "#ef4444", filter: () => Math.random() > 0.5 },
    ],
  },
  sumberBiaya: {
    title: "Perbandingan Sumber Biaya Kuliah per Prodi",
    description: "Distribusi sumber pembiayaan kuliah mahasiswa",
    getCategories: () => SUMBER_BIAYA_OPTIONS.map((opt, idx) => ({
      key: opt.replace(/[^a-zA-Z]/g, "").toLowerCase(),
      name: opt,
      color: ["#f97316","#0ea5e9","#8b5cf6","#10b981","#f59e0b","#ec4899","#6b7280"][idx % 7],
      filter: (s: any) => s.sumberBiayaKuliah === opt,
    })),
  },
  caraMendapatKerja: {
    title: "Perbandingan Cara Mendapat Pekerjaan per Prodi",
    description: "Distribusi metode pencarian kerja (multiple response)",
    getCategories: () => CARA_MENDAPAT_KERJA_OPTIONS.slice(0, 8).map((opt, idx) => ({
      key: opt.key,
      name: opt.label.length > 18 ? opt.label.substring(0, 16) + "..." : opt.label,
      color: ["#f97316","#0ea5e9","#8b5cf6","#10b981","#f59e0b","#ec4899","#6366f1","#14b8a6"][idx % 8],
      filter: (s: any) => s.caraMendapatKerja?.includes(opt.key),
    })),
  },
  jenisInstansi: {
    title: "Perbandingan Jenis Instansi per Prodi",
    description: "Distribusi jenis instansi tempat alumni bekerja",
    getCategories: () => JENIS_INSTANSI_OPTIONS.map((opt, idx) => ({
      key: opt.replace(/[^a-zA-Z]/g, "").toLowerCase(),
      name: opt.length > 20 ? opt.substring(0, 18) + "..." : opt,
      color: ["#0ea5e9","#8b5cf6","#f97316","#10b981","#f59e0b","#ec4899","#6b7280"][idx % 7],
      filter: (s: any) => s.jenisInstansi === opt,
    })),
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Trend / heatmap (mock)
// ─────────────────────────────────────────────────────────────────────────────

const SATISFACTION_INDICATORS = [
  { key: "etika",        name: "Etika" },
  { key: "kompetensi",   name: "Keahlian Bidang Ilmu" },
  { key: "bahasa",       name: "Kemampuan Bahasa Asing" },
  { key: "ti",           name: "Penggunaan TI" },
  { key: "komunikasi",   name: "Kemampuan Komunikasi" },
  { key: "kerjasama",    name: "Kerjasama" },
  { key: "pengembangan", name: "Pengembangan Diri" },
];

const TREND_CATEGORIES: Record<string, { key: string; name: string; filter: (s: any) => boolean; isPositive: boolean }[]> = {
  kesesuaian: [
    { key: "sesuai", name: "Sesuai",       filter: (s) => s.kesesuaianBidang === "Sangat Erat" || s.kesesuaianBidang === "Erat", isPositive: true },
    { key: "cukup",  name: "Cukup Sesuai", filter: (s) => s.kesesuaianBidang === "Cukup Erat", isPositive: true },
    { key: "tidak",  name: "Tidak Sesuai", filter: (s) => s.kesesuaianBidang === "Kurang Erat" || s.kesesuaianBidang === "Tidak Sesuai", isPositive: false },
  ],
  jenisPerusahaan: [
    { key: "lokal",         name: "Lokal",         filter: (s) => s.kategoriPerusahaan === "Lokal/Tidak BBH", isPositive: true },
    { key: "nasional",      name: "Nasional",      filter: (s) => s.kategoriPerusahaan === "Nasional/BBH",    isPositive: true },
    { key: "multinasional", name: "Multinasional", filter: (s) => s.kategoriPerusahaan === "Multinasional",   isPositive: true },
  ],
  gaji: [
    { key: "tinggi", name: "Tinggi (>7jt)", filter: (s) => s.gaji > 7000000,                                isPositive: true },
    { key: "sedang", name: "Sedang (4-7jt)",filter: (s) => s.gaji >= 4000000 && s.gaji <= 7000000,          isPositive: true },
    { key: "rendah", name: "Rendah (<4jt)", filter: (s) => s.gaji > 0 && s.gaji < 4000000,                  isPositive: false },
  ],
  status: [
    { key: "bekerja",     name: "Bekerja",      filter: (s) => s.status === "Bekerja Full-time" || s.status === "Bekerja Part-time", isPositive: true },
    { key: "wiraswasta",  name: "Wiraswasta",   filter: (s) => s.status === "Wiraswasta",   isPositive: true },
    { key: "studiLanjut", name: "Studi Lanjut", filter: (s) => s.status === "Studi Lanjut", isPositive: true },
    { key: "mencariKerja",name: "Mencari Kerja",filter: (s) => s.status === "Mencari Kerja",isPositive: false },
  ],
};

const YEARS = ["2020", "2021", "2022", "2023", "2024"];

const getHeatmapColor = (value: number, isPositive = true) => {
  const v = isPositive ? value : 100 - value;
  if (v >= 80) return "hsl(142, 70%, 45%)";
  if (v >= 60) return "hsl(80, 60%, 45%)";
  if (v >= 40) return "hsl(40, 80%, 50%)";
  if (v >= 20) return "hsl(20, 70%, 45%)";
  return "hsl(0, 65%, 40%)";
};

// ─────────────────────────────────────────────────────────────────────────────
// Util: transform BandingkanProdiItem[] → Recharts rows (untuk absorption BE)
// ─────────────────────────────────────────────────────────────────────────────

function buildBeChartData(items: BandingkanProdiItem[]) {
  return items.map((item) => {
    const row: Record<string, any> = {
      prodi:     item.nama_prodi.length > 28 ? item.nama_prodi.slice(0, 26) + "…" : item.nama_prodi,
      fullProdi: item.nama_prodi,
      total:     item.total,
    };
    item.statuses.forEach((s) => {
      row[s.label] = s.pct;
      row[`${s.label}Count`] = s.count;
    });
    return row;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const ComparePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // GlobalFilters dipakai oleh hooks child (useKeterserapanBandingkan, dll)

  const chartType      = searchParams.get("type")      || "gender";
  const indicatorParam = searchParams.get("indicator") || "kesesuaian";

  const isAbsorption      = chartType === "absorption";
  const isStatusDistrib   = chartType === "status";           // distribusi status per prodi (BE)
  const isKesesuaian      = chartType === "kesesuaian";       // kesesuaian bidang per prodi (BE)
  const isWaktuTunggu     = chartType === "waktuTunggu";
  const isWirausaha       = chartType === "entrepreneurship";
  const isIncome          = chartType === "income";
  const isIncomeKelompok  = chartType === "income-kelompok";
  const isJenisInstansi   = chartType === "jenisInstansi";
  const isTingkatInstansi = chartType === "tingkatInstansi";
  const isSumberBiaya     = chartType === "sumberBiaya";
  const isLearning        = chartType === "learning";
  const isCompetency      = chartType === "competency";
  const isCompletion      = chartType === "completion";
  const isParticipation   = chartType === "participation-trend";
  const isTrendType       = chartType === "trend";
  const isKepuasanType    = chartType === "kepuasan";
  const isKeterserapanBE  = isAbsorption || isStatusDistrib;
  const isBeType          = isKeterserapanBE || isKesesuaian || isWaktuTunggu || isWirausaha || isIncome || isIncomeKelompok || isJenisInstansi || isTingkatInstansi || isSumberBiaya || isCompletion || isParticipation || isLearning || isCompetency;

  // selectedProdi hanya untuk tampilan chip — tidak dipakai untuk fetch
  // (fetch dilakukan berdasarkan filter aktif di GlobalFiltersContext)
  const selectedProdi: string[] = [];

  // ── Data BE ───────────────────────────────────────────────────────────────
  const bandingkanHook        = useKeterserapanBandingkan(isKeterserapanBE);
  const drillHook             = useKeterserapanDrillDown();
  const ksBandingkanHook      = useKesesuaianBandingkan(isKesesuaian);
  const ksDrillHook           = useKesesuaianDrillDown();
  const mtBandingkanHook      = useMasaTungguBandingkan(isWaktuTunggu);
  const mtDrillHook           = useMasaTungguDrillDown();
  const wsBandingkanHook      = useWirausahaBandingkan(isWirausaha);
  const wsDrillHook           = useWirausahaDrillDown();
  const incomeBandingkanHook         = usePendapatanBandingkan(isIncome);
  const incomeKelompokBandingkanHook = usePendapatanKelompokBandingkan(isIncomeKelompok);
  const incomeDrillHook              = usePendapatanDrillDown();
  const instansiBandingkanHook       = useInstansiBandingkan(isJenisInstansi || isTingkatInstansi);
  const instansiDrillHook            = useInstansiDrillDown();
  const pembiayaanBandingkanHook     = usePembiayaanBandingkan(isSumberBiaya);
  const metodeBandingkanHook         = useMetodePembelajaranBandingkan(isLearning);
  const metodeDrillHook              = useMetodePembelajaranDrillDown();
  const kompetensiGapHook            = useKompetensiGapBandingkan(isCompetency);
  const kompetensiDrillHook          = useKompetensiGapDrillDown();
  const pembiayaanDrillHook          = usePembiayaanDrillDown();
  const responseRateBarHook          = useResponseRateBandingkan(isCompletion || isParticipation);
  const responseRateDrillHook        = useResponseRateDrillDown();

  // ── Segment & warna dinamis dari BE ───────────────────────────────────────
  const { allLabels: beLabels, colorMap: beColorMap } = useMemo(() => {
    if (!bandingkanHook.data?.chart) return { allLabels: [] as string[], colorMap: {} as Record<string, string> };
    const set = new Set<string>();
    bandingkanHook.data.chart.forEach((item) => item.statuses.forEach((s) => set.add(s.label)));
    const labels = [...set];
    return { allLabels: labels, colorMap: buildColorMap(labels) };
  }, [bandingkanHook.data]);

  const beChartData = useMemo(
    () => (isKeterserapanBE && bandingkanHook.data?.chart)
      ? buildBeChartData(bandingkanHook.data.chart)
      : [],
    [bandingkanHook.data, isKeterserapanBE]
  );
  const beTableData = bandingkanHook.data?.table ?? [];

  // Kesesuaian — stacked bar distribusi tingkat kesesuaian per prodi
  const KESESUAIAN_SK_MAP: Record<string, number> = {
    "Sangat Erat": 1, "Erat": 2, "Cukup Erat": 3, "Kurang Erat": 4, "Tidak Sama Sekali": 5,
  };
  const ksLabels = ["Sesuai Bidang", "Tidak Sesuai"];
  const ksColorMap: Record<string, string> = { "Sesuai Bidang": "#10b981", "Tidak Sesuai": "#f59e0b" };
  const ksChartData = useMemo(() => {
    if (!isKesesuaian || !ksBandingkanHook.data?.data) return [];
    return ksBandingkanHook.data.data.map((d) => {
      const shortProdi = d.nama_prodi.length > 28 ? d.nama_prodi.slice(0, 26) + "…" : d.nama_prodi;
      return {
        prodi: shortProdi,
        fullProdi: d.nama_prodi,
        total: d.total,
        "Sesuai Bidang": d.pct_sesuai,
        "Sesuai BidangCount": Math.round(d.total * d.pct_sesuai / 100),
        "Tidak Sesuai": d.pct_tidak_sesuai,
        "Tidak SesuaiCount": Math.round(d.total * d.pct_tidak_sesuai / 100),
      };
    });
  }, [ksBandingkanHook.data, isKesesuaian]);
  const ksTableData = ksBandingkanHook.data?.data ?? [];

  // Masa Tunggu — transform data BE ke stacked bar per prodi
  const mtChartData = useMemo(() => {
    if (!isWaktuTunggu || !mtBandingkanHook.data?.data) return [];
    return mtBandingkanHook.data.data.map((d) => {
      const total = d.count_tunggu_0_3_bulan + d.count_tunggu_3_6_bulan + d.count_tunggu_lebih_6_bulan || 1;
      return {
        prodi:            d.nama_prodi.length > 28 ? d.nama_prodi.slice(0, 26) + "…" : d.nama_prodi,
        fullProdi:        d.nama_prodi,
        total,
        "< 3 bulan":     Math.round(d.count_tunggu_0_3_bulan    / total * 100 * 10) / 10,
        "3-6 bulan":     Math.round(d.count_tunggu_3_6_bulan    / total * 100 * 10) / 10,
        "> 6 bulan":     Math.round(d.count_tunggu_lebih_6_bulan / total * 100 * 10) / 10,
        "< 3 bulanCount": d.count_tunggu_0_3_bulan,
        "3-6 bulanCount": d.count_tunggu_3_6_bulan,
        "> 6 bulanCount": d.count_tunggu_lebih_6_bulan,
        avg: Math.round(d.avg_masa_tunggu_bekerja),
      };
    });
  }, [isWaktuTunggu, mtBandingkanHook.data]);

  const mtLabels   = ["< 3 bulan", "3-6 bulan", "> 6 bulan"];
  const mtColorMap = buildColorMap(mtLabels);

  // Income — transform data BE ke stacked bar per prodi
  const incomeChartData = useMemo(() => {
    if (!isIncome || !incomeBandingkanHook.data?.chart) return [];
    return (incomeBandingkanHook.data.chart as PendapatanBandingkanItem[]).map((item) => {
      const row: Record<string, any> = {
        prodi:    item.nama_prodi.length > 28 ? item.nama_prodi.slice(0, 26) + "…" : item.nama_prodi,
        fullProdi: item.nama_prodi,
        total:    item.total,
        avg_gaji: item.avg_gaji,
      };
      item.statuses.forEach((s) => {
        row[s.label] = s.pct;
        row[`${s.label}Count`] = s.count;
      });
      return row;
    });
  }, [isIncome, incomeBandingkanHook.data]);

  const incomeTableData = incomeBandingkanHook.data?.table ?? [];
  const incomeLabels = useMemo(() => {
    if (!incomeBandingkanHook.data?.chart?.length) return [];
    const set = new Set<string>();
    (incomeBandingkanHook.data.chart as PendapatanBandingkanItem[]).forEach((item) =>
      item.statuses.forEach((s) => set.add(s.label))
    );
    return [...set];
  }, [incomeBandingkanHook.data]);
  const incomeColorMap = buildColorMap(incomeLabels);

  // Income Kelompok — distribusi kelompok jt per prodi
  const incomeKelompokChartData = useMemo(() => {
    if (!isIncomeKelompok || !incomeKelompokBandingkanHook.data?.chart) return [];
    return (incomeKelompokBandingkanHook.data.chart as PendapatanBandingkanItem[]).map((item) => {
      const row: Record<string, any> = {
        prodi:    item.nama_prodi.length > 28 ? item.nama_prodi.slice(0, 26) + "…" : item.nama_prodi,
        fullProdi: item.nama_prodi,
        total:    item.total,
        avg_gaji: item.avg_gaji,
      };
      item.statuses.forEach((s) => {
        row[s.label] = s.pct;
        row[`${s.label}Count`] = s.count;
      });
      return row;
    });
  }, [isIncomeKelompok, incomeKelompokBandingkanHook.data]);

  const incomeKelompokTableData = incomeKelompokBandingkanHook.data?.table ?? [];
  const incomeKelompokLabels = useMemo(() => {
    if (!incomeKelompokBandingkanHook.data?.chart?.length) return [] as string[];
    const set = new Set<string>();
    (incomeKelompokBandingkanHook.data.chart as PendapatanBandingkanItem[]).forEach((item) =>
      item.statuses.forEach((s) => set.add(s.label))
    );
    return [...set];
  }, [incomeKelompokBandingkanHook.data]);
  const incomeKelompokColorMap = buildColorMap(incomeKelompokLabels);

  // Jenis Instansi — transform data BE ke stacked bar per prodi (top N + Lainnya)
  const MAX_JENIS_SLICES = 8;
  const instansiJenisLabels = useMemo(() => {
    if (!instansiBandingkanHook.data?.data) return [] as string[];
    const totals: Record<string, number> = {};
    instansiBandingkanHook.data.data.forEach((d) =>
      d.jenis.forEach((j) => { totals[j.label] = (totals[j.label] ?? 0) + j.count; })
    );
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, MAX_JENIS_SLICES).map(([l]) => l);
    if (sorted.length > MAX_JENIS_SLICES) top.push("Lainnya");
    return top;
  }, [instansiBandingkanHook.data]);

  const instansiJenisColorMap = useMemo(
    () => buildColorMap(instansiJenisLabels),
    [instansiJenisLabels]
  );

  const instansiJenisChartData = useMemo(() => {
    if (!isJenisInstansi || !instansiBandingkanHook.data?.data) return [];
    const topSet = new Set(instansiJenisLabels.filter((l) => l !== "Lainnya"));
    return instansiBandingkanHook.data.data.map((d) => {
      const row: Record<string, any> = {
        prodi:    d.nama_prodi.length > 28 ? d.nama_prodi.slice(0, 26) + "…" : d.nama_prodi,
        fullProdi: d.nama_prodi,
        total:    d.total,
      };
      let lainnyaPct = 0, lainnyaCount = 0;
      d.jenis.forEach((j) => {
        if (topSet.has(j.label)) {
          row[j.label] = +(j.pct).toFixed(1);
          row[`${j.label}Count`] = j.count;
        } else {
          lainnyaPct += j.pct;
          lainnyaCount += j.count;
        }
      });
      if (instansiJenisLabels.includes("Lainnya")) {
        row["Lainnya"] = +(lainnyaPct).toFixed(1);
        row["LainnyaCount"] = lainnyaCount;
      }
      return row;
    });
  }, [isJenisInstansi, instansiBandingkanHook.data, instansiJenisLabels]);

  // Tingkat Instansi — transform data BE ke stacked bar per prodi
  const instansiTingkatLabels = ["Lokal", "Nasional", "Internasional"];
  const instansiTingkatColorMap: Record<string, string> = {
    "Lokal":         "#6ee7b7",
    "Nasional":      "#3b82f6",
    "Internasional": "#1e3a8a",
  };

  const instansiTingkatChartData = useMemo(() => {
    if (!isTingkatInstansi || !instansiBandingkanHook.data?.data) return [];
    return instansiBandingkanHook.data.data.map((d) => {
      const row: Record<string, any> = {
        prodi:    d.nama_prodi.length > 28 ? d.nama_prodi.slice(0, 26) + "…" : d.nama_prodi,
        fullProdi: d.nama_prodi,
        total:    d.total,
      };
      d.tingkat.forEach((t) => {
        row[t.label] = +(t.pct).toFixed(1);
        row[`${t.label}Count`] = t.count;
      });
      return row;
    });
  }, [isTingkatInstansi, instansiBandingkanHook.data]);

  // Sumber Biaya — transform data BE ke stacked bar per prodi (top N + Lainnya)
  const MAX_BIAYA_SLICES = 8;
  const pembiayaanLabels = useMemo(() => {
    if (!pembiayaanBandingkanHook.data?.data) return [] as string[];
    const totals: Record<string, number> = {};
    const fixBiayaLabel = (l: string) => (l === "0" || l === "" ? "Tidak Mengisi" : l);
    pembiayaanBandingkanHook.data.data.forEach((d) =>
      d.sumber.forEach((s) => { const l = fixBiayaLabel(s.label); totals[l] = (totals[l] ?? 0) + s.count; })
    );
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, MAX_BIAYA_SLICES).map(([l]) => l);
    if (sorted.length > MAX_BIAYA_SLICES) top.push("Lainnya");
    return top;
  }, [pembiayaanBandingkanHook.data]);

  const pembiayaanColorMap = useMemo(
    () => buildColorMap(pembiayaanLabels),
    [pembiayaanLabels]
  );

  const pembiayaanChartData = useMemo(() => {
    if (!isSumberBiaya || !pembiayaanBandingkanHook.data?.data) return [];
    const topSet = new Set(pembiayaanLabels.filter((l) => l !== "Lainnya"));
    return pembiayaanBandingkanHook.data.data.map((d) => {
      const shortProdi = d.nama_prodi.length > 28 ? d.nama_prodi.slice(0, 26) + "…" : d.nama_prodi;
      const row: Record<string, any> = {
        prodi: shortProdi,
        fullProdi: d.nama_prodi,
        total: d.total,
      };
      let lainnyaPct = 0, lainnyaCount = 0;
      d.sumber.forEach((s) => {
        const label = s.label === "0" || s.label === "" ? "Tidak Mengisi" : s.label;
        if (topSet.has(label)) {
          row[label] = +(s.pct).toFixed(1);
          row[`${label}Count`] = s.count;
        } else {
          lainnyaPct += s.pct;
          lainnyaCount += s.count;
        }
      });
      if (pembiayaanLabels.includes("Lainnya")) {
        row["Lainnya"] = +(lainnyaPct).toFixed(1);
        row["LainnyaCount"] = lainnyaCount;
      }
      return row;
    });
  }, [isSumberBiaya, pembiayaanBandingkanHook.data, pembiayaanLabels]);

  const [pembiayaanModal, setPembiayaanModal] = useState<{ open: boolean; title: string; sumber_biaya?: string }>({ open: false, title: "" });

  // Gap Kompetensi — stacked bar per prodi (level distribution based on gap)
  const competencyLevels = ["Tinggi (>4)", "Sedang (3-4)", "Rendah (<3)"];
  const competencyColorMap: Record<string, string> = { "Tinggi (>4)": "#10b981", "Sedang (3-4)": "#f59e0b", "Rendah (<3)": "#ef4444" };
  const competencyChartData = useMemo(() => {
    if (!isCompetency || !kompetensiGapHook.data?.data) return [];
    return kompetensiGapHook.data.data.map((d) => {
      const total = d.indikator.length || 1;
      const tinggi = d.indikator.filter((m) => m.skor_lulus > 4).length;
      const sedang = d.indikator.filter((m) => m.skor_lulus >= 3 && m.skor_lulus <= 4).length;
      const rendah = d.indikator.filter((m) => m.skor_lulus < 3).length;
      const shortProdi = d.nama_prodi.length > 28 ? d.nama_prodi.slice(0, 26) + "…" : d.nama_prodi;
      return {
        prodi: shortProdi,
        fullProdi: d.nama_prodi,
        total,
        "Tinggi (>4)": +(tinggi / total * 100).toFixed(1),
        "Tinggi (>4)Count": tinggi,
        "Sedang (3-4)": +(sedang / total * 100).toFixed(1),
        "Sedang (3-4)Count": sedang,
        "Rendah (<3)": +(rendah / total * 100).toFixed(1),
        "Rendah (<3)Count": rendah,
      };
    });
  }, [isCompetency, kompetensiGapHook.data]);

  // Persepsi Metode Pembelajaran — avg skor per metode per prodi → stacked bar (level distribution)
  const learningLevels = ["Tinggi (>4)", "Sedang (3-4)", "Rendah (<3)"];
  const learningColorMap: Record<string, string> = { "Tinggi (>4)": "#10b981", "Sedang (3-4)": "#f59e0b", "Rendah (<3)": "#ef4444" };
  const learningChartData = useMemo(() => {
    if (!isLearning || !metodeBandingkanHook.data?.data) return [];
    return metodeBandingkanHook.data.data.map((d) => {
      const total = d.metode.length || 1;
      const tinggi = d.metode.filter((m) => m.avg_skor > 4).length;
      const sedang = d.metode.filter((m) => m.avg_skor >= 3 && m.avg_skor <= 4).length;
      const rendah = d.metode.filter((m) => m.avg_skor < 3).length;
      const shortProdi = d.nama_prodi.length > 28 ? d.nama_prodi.slice(0, 26) + "…" : d.nama_prodi;
      return {
        prodi: shortProdi,
        fullProdi: d.nama_prodi,
        total,
        "Tinggi (>4)": +(tinggi / total * 100).toFixed(1),
        "Tinggi (>4)Count": tinggi,
        "Sedang (3-4)": +(sedang / total * 100).toFixed(1),
        "Sedang (3-4)Count": sedang,
        "Rendah (<3)": +(rendah / total * 100).toFixed(1),
        "Rendah (<3)Count": rendah,
      };
    });
  }, [isLearning, metodeBandingkanHook.data]);

  const [metodeModal, setMetodeModal] = useState<{ open: boolean; title: string; kode_field?: string }>({ open: false, title: "" });
  const [kompModal, setKompModal] = useState<{ open: boolean; title: string; grup_gap?: string }>({ open: false, title: "" });

  // Response Rate — for completion (KPI2) and participation-trend (KPI3)
  const rrLabels = isCompletion
    ? ["Selesai", "Sedang Mengisi", "Belum Mengisi"]
    : ["Sudah Merespons", "Belum Merespons"];
  const rrColorMap: Record<string, string> = {
    "Selesai": "#10b981", "Sedang Mengisi": "#f59e0b", "Belum Mengisi": "#ef4444",
    "Sudah Merespons": "#3b82f6", "Belum Merespons": "#9ca3af",
  };
  const rrChartData = useMemo(() => {
    if ((!isCompletion && !isParticipation) || !responseRateBarHook.data?.data) return [];
    return responseRateBarHook.data.data.map((d) => {
      const shortProdi = d.prodi.length > 20 ? d.prodi.slice(0, 18) + "…" : d.prodi;
      const row: Record<string, any> = {
        prodi: shortProdi,
        fullProdi: d.prodi,
        total: d.total,
      };
      if (isCompletion) {
        const b = d.breakdown ?? {} as any;
        const t = d.total || 1;
        const submitted = b.submitted ?? b.selesai ?? 0;
        const ongoing = b.ongoing ?? b.on_going ?? 0;
        const started = b.started ?? b.belum_mengisi ?? 0;
        row["Selesai"] = +(submitted / t * 100).toFixed(1);
        row["SelesaiCount"] = submitted;
        row["Sedang Mengisi"] = +(ongoing / t * 100).toFixed(1);
        row["Sedang MengisiCount"] = ongoing;
        row["Belum Mengisi"] = +(started / t * 100).toFixed(1);
        row["Belum MengisiCount"] = started;
      } else {
        row["Sudah Merespons"] = d.responded;
        row["Sudah MeresponsCount"] = Math.round(d.responded / 100 * d.total);
        row["Belum Merespons"] = d.notResponded;
        row["Belum MeresponsCount"] = Math.round(d.notResponded / 100 * d.total);
      }
      return row;
    });
  }, [isCompletion, isParticipation, responseRateBarHook.data]);

  const [rrModal, setRrModal] = useState<{ open: boolean; title: string; status: string }>({ open: false, title: "", status: "" });

  // Wirausaha — transform data BE ke stacked bar per prodi
  const wsLabels = useMemo(() => {
    if (!wsBandingkanHook.data?.chart) return [] as string[];
    const set = new Set<string>();
    wsBandingkanHook.data.chart.forEach((d) =>
      (d.jabatan ?? []).forEach((t: any) => { set.add(t.label || "Lainnya"); })
    );
    return [...set];
  }, [wsBandingkanHook.data]);

  const wsColorMap = useMemo(() => buildColorMap(wsLabels), [wsLabels]);

  const wsChartData = useMemo(() => {
    if (!isWirausaha || !wsBandingkanHook.data?.chart) return [];
    return wsBandingkanHook.data.chart.map((d: any) => {
      const row: Record<string, any> = {
        prodi:           d.nama_prodi.length > 28 ? d.nama_prodi.slice(0, 26) + "…" : d.nama_prodi,
        fullProdi:       d.nama_prodi,
        total:           d.count_wirausaha,
        pct_wirausaha:   d.pct_wirausaha,
        count_wirausaha: d.count_wirausaha,
      };
      (d.jabatan ?? []).forEach((t: any) => {
        const lbl = t.label || "Lainnya";
        row[lbl]           = +((row[lbl] ?? 0) + t.pct).toFixed(1);
        row[`${lbl}Count`] = (row[`${lbl}Count`] ?? 0) + t.count;
      });
      return row;
    });
  }, [isWirausaha, wsBandingkanHook.data]);

  // ── Modal absorption (BE — DrillDownModal) ────────────────────────────────
  const [beModal, setBeModal] = useState<{ open: boolean; title: string; status?: string }>({ open: false, title: "" });
  const [ksModal, setKsModal] = useState<{ open: boolean; title: string; kesesuaian_sk?: number }>({ open: false, title: "" });
  const [mtModal, setMtModal] = useState<{ open: boolean; title: string; rentang?: "0-3" | "3-6" | ">6" }>({ open: false, title: "" });
  const [wsModal, setWsModal]         = useState<{ open: boolean; title: string; tingkat?: string }>({ open: false, title: "" });
  const [incomeModal, setIncomeModal] = useState<{ open: boolean; title: string; segmen?: "above_ump" | "below_ump"; tahun_lulus?: string; namaProdi?: string }>({ open: false, title: "" });
  const [instansiModal, setInstansiModal] = useState<{ open: boolean; title: string; jenis_instansi?: string; tingkat_instansi?: string }>({ open: false, title: "" });

  const handleBeBarClick = (barData: any, statusLabel: string) => {
    setBeModal({ open: true, title: `${barData.fullProdi ?? barData.prodi} — ${getShortLabel(statusLabel)}`, status: statusLabel });
    drillHook.fetch({ status: statusLabel });
  };

  const handleBePageChange = (page: number, search?: string) => {
    drillHook.fetch({ status: beModal.status, page, search });
  };

  const beModalData = useMemo(() => {
    if (!drillHook.data) return null;
    const statusDisplay = getShortLabel(beModal.status ?? '');
    return {
      ...drillHook.data,
      data: drillHook.data.data.map((row) => ({ ...row, status: statusDisplay })),
    };
  }, [drillHook.data, beModal.status]);

  const handleInstansiJenisClick = (barData: any, jenisLabel: string) => {
    const prodi = barData.fullProdi ?? barData.prodi;
    setInstansiModal({ open: true, title: `${prodi} — ${jenisLabel}`, jenis_instansi: jenisLabel });
    instansiDrillHook.fetch({ jenis_instansi: jenisLabel, page: 1 });
  };

  const handleInstansiTingkatClick = (barData: any, tingkatLabel: string) => {
    const prodi = barData.fullProdi ?? barData.prodi;
    setInstansiModal({ open: true, title: `${prodi} — ${tingkatLabel}`, tingkat_instansi: tingkatLabel });
    instansiDrillHook.fetch({ tingkat_instansi: tingkatLabel, page: 1 });
  };

  const handleInstansiPageChange = (page: number, search?: string) => {
    instansiDrillHook.fetch({
      jenis_instansi: instansiModal.jenis_instansi,
      tingkat_instansi: instansiModal.tingkat_instansi,
      page,
      search,
    });
  };

  // ── Mock data (KPI selain BE) ─────────────────────────────────────────────
  const config     = !isBeType && !isTrendType ? (CHART_CONFIGS[chartType] ?? CHART_CONFIGS.gender) : null;
  const categories = config ? config.getCategories() : [];

  const [selectedCategory, setSelectedCategory]               = useState("");
  const [selectedKepuasanIndicator, setSelectedKepuasanIndicator] = useState(SATISFACTION_INDICATORS[0].key);
  const [mockModalOpen, setMockModalOpen]                     = useState(false);
  const [mockModalData, setMockModalData]                     = useState<{
    title: string; students: Student[];
    segments: { key: string; name: string }[];
    selectedSegment: string;
  }>({ title: "", students: [], segments: [], selectedSegment: "all" });

  const trendCategories  = TREND_CATEGORIES[indicatorParam] ?? TREND_CATEGORIES.kesesuaian;
  const currentTrendCat  = trendCategories.find((c) => c.key === selectedCategory) ?? trendCategories[0];

  const mockChartData = useMemo(() => {
    if (isBeType || isTrendType) return [];
    return selectedProdi.map((prodiName) => {
      const prodiStudents = MOCK_STUDENTS.filter((s) => s.prodi === prodiName);
      const total = prodiStudents.length || 1;
      const row: Record<string, any> = {
        prodi:     prodiName.length > 25 ? prodiName.substring(0, 23) + "..." : prodiName,
        fullProdi: prodiName,
        total:     prodiStudents.length,
      };
      if (isKepuasanType) {
        const sb = Math.floor(Math.random() * 35 + 25);
        const b  = Math.floor(Math.random() * 25 + 20);
        const c  = Math.floor(Math.random() * 15 + 10);
        const k  = Math.max(0, 100 - sb - b - c);
        Object.assign(row, { sangatBaik: sb, baik: b, cukup: c, kurang: k,
          sangatBaikCount: Math.floor(total * sb / 100), baikCount: Math.floor(total * b / 100),
          cukupCount: Math.floor(total * c / 100), kurangCount: Math.floor(total * k / 100) });
      } else {
        const counts: Record<string, number> = {};
        let totalCounted = 0;
        categories.forEach((cat) => { const n = prodiStudents.filter(cat.filter).length; counts[cat.key] = n; totalCounted += n; });
        categories.forEach((cat) => {
          row[cat.key] = totalCounted > 0 ? parseFloat(((counts[cat.key] / totalCounted) * 100).toFixed(1)) : 0;
          row[`${cat.key}Count`] = counts[cat.key];
        });
      }
      return row;
    });
  }, [selectedProdi, chartType, categories, isBeType, isTrendType, isKepuasanType]);

  const heatmapData = useMemo(() => {
    if (!isTrendType) return [];
    return selectedProdi.map((prodiName) => {
      const row: Record<string, any> = { prodi: prodiName };
      YEARS.forEach((year) => {
        const yearStudents = MOCK_STUDENTS.filter((s) => s.prodi === prodiName && s.tahunLulus === parseInt(year));
        const total = yearStudents.length || 1;
        const count = yearStudents.filter(currentTrendCat?.filter ?? (() => false)).length;
        row[year] = ((count / total) * 100).toFixed(1);
        row[`${year}Count`] = count;
        row[`${year}Total`] = yearStudents.length;
      });
      return row;
    });
  }, [selectedProdi, isTrendType, currentTrendCat]);

  const handleMockBarClick = (data: any, categoryKey: string) => {
    const prodiName = data.fullProdi || data.prodi;
    const cat = categories.find((c) => c.key === categoryKey);
    if (!cat) return;
    const filtered = MOCK_STUDENTS.filter((s) => s.prodi === prodiName && cat.filter(s));
    setMockModalData({ title: `${prodiName} - ${cat.name}`, students: filtered, segments: categories.map((c) => ({ key: c.key, name: c.name })), selectedSegment: categoryKey });
    setMockModalOpen(true);
  };

  const handleMockSegmentChange = (segKey: string) => {
    const prodiName = mockModalData.title.split(" - ")[0];
    const prodiStudents = MOCK_STUDENTS.filter((s) => s.prodi === prodiName);
    const cat = categories.find((c) => c.key === segKey);
    const filtered = segKey === "all" ? prodiStudents : (cat ? prodiStudents.filter(cat.filter) : prodiStudents);
    const segName = segKey === "all" ? "Semua" : (cat?.name ?? segKey);
    setMockModalData((prev) => ({ ...prev, students: filtered, selectedSegment: segKey, title: `${prodiName} - ${segName}` }));
  };

  const getMockSegmentStats = () => {
    if (!mockModalOpen || categories.length === 0) return [];
    const prodiName = mockModalData.title.split(" - ")[0];
    const ps = MOCK_STUDENTS.filter((s) => s.prodi === prodiName);
    return categories.map((cat) => {
      const count = ps.filter(cat.filter).length;
      return { name: cat.name, count, percentage: ps.length > 0 ? ((count / ps.length) * 100).toFixed(1) : "0" };
    });
  };

  const chartHeight = Math.max(
    400,
    (isKeterserapanBE ? beChartData.length
      : isKesesuaian ? ksChartData.length
      : isWaktuTunggu ? mtChartData.length
      : isWirausaha ? wsChartData.length
      : isIncome ? incomeChartData.length
      : isIncomeKelompok ? incomeKelompokChartData.length
      : isJenisInstansi ? instansiJenisChartData.length
      : isTingkatInstansi ? instansiTingkatChartData.length
      : isSumberBiaya ? pembiayaanChartData.length
      : (isCompletion || isParticipation) ? rrChartData.length
      : selectedProdi.length) * 52
  );

  const pageTitle = isStatusDistrib
    ? "Perbandingan Distribusi Status Alumni Antar Program Studi"
    : isAbsorption
    ? "Perbandingan Keterserapan Lulusan Antar Program Studi"
    : isKesesuaian
    ? "Perbandingan Kesesuaian Bidang Antar Program Studi"
    : isWaktuTunggu
    ? "Perbandingan Masa Tunggu Kerja Antar Program Studi"
    : isWirausaha
    ? "Perbandingan Posisi Wirausaha Antar Program Studi"
    : isIncome
    ? "Perbandingan Distribusi UMP Antar Program Studi"
    : isIncomeKelompok
    ? "Perbandingan Kelompok Pendapatan Antar Program Studi"
    : isJenisInstansi
    ? "Perbandingan Jenis Instansi Antar Program Studi"
    : isTingkatInstansi
    ? "Perbandingan Sebaran Level Perusahaan Antar Program Studi"
    : isSumberBiaya
    ? "Perbandingan Sumber Pembiayaan Kuliah Antar Program Studi"
    : isLearning
    ? "Perbandingan Persepsi Metode Pembelajaran Antar Program Studi"
    : isCompetency
    ? "Perbandingan Profil Kompetensi Antar Program Studi"
    : isCompletion
    ? "Perbandingan Status Pengisian Survei Antar Program Studi"
    : isParticipation
    ? "Perbandingan Tren Partisipasi Antar Program Studi"
    : isTrendType
    ? `Heatmap Trend ${indicatorParam} per Prodi`
    : config?.title ?? "";

  const pageDesc = isStatusDistrib
    ? "Distribusi lengkap status keterserapan per program studi (data real)"
    : isAbsorption
    ? "Distribusi status alumni per program studi (data real)"
    : isKesesuaian
    ? "Distribusi tingkat kesesuaian bidang kerja per program studi (hanya alumni bekerja)"
    : isWaktuTunggu
    ? "Distribusi rentang masa tunggu mendapatkan pekerjaan per prodi"
    : isWirausaha
    ? "Distribusi posisi alumni yang berwirausaha per program studi"
    : isIncome
    ? "Proporsi alumni ≥ 1,2× UMP vs < 1,2× UMP per program studi"
    : isIncomeKelompok
    ? "Distribusi pendapatan alumni per program studi"
    : isJenisInstansi
    ? "Distribusi jenis instansi tempat alumni bekerja per program studi"
    : isTingkatInstansi
    ? "Distribusi Lokal / Nasional / Internasional per program studi"
    : isSumberBiaya
    ? "Distribusi sumber pembiayaan kuliah mahasiswa per program studi"
    : isLearning
    ? "Distribusi tingkat persepsi alumni terhadap metode pembelajaran"
    : isCompetency
    ? "Distribusi level kompetensi alumni per program studi"
    : isTrendType
    ? "Visualisasi persentase indikator per prodi per tahun"
    : config?.description ?? "";

  const incomeProdiList = isIncomeKelompok
    ? (incomeKelompokBandingkanHook.data?.prodi_list ?? [])
    : (incomeBandingkanHook.data?.prodi_list ?? []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold">{pageTitle}</h1>
            <p className="text-muted-foreground">{pageDesc}</p>
          </div>
        </div>

        {/* Chip prodi */}
        {(() => {
          const chips = isIncome || isIncomeKelompok
            ? incomeProdiList
            : isJenisInstansi || isTingkatInstansi
            ? (instansiBandingkanHook.data?.prodi_list ?? [])
            : isKesesuaian
            ? (ksBandingkanHook.data?.prodi_list ?? [])
            : isWirausaha
            ? (wsBandingkanHook.data?.prodi_list ?? [])
            : isWaktuTunggu
            ? (mtBandingkanHook.data?.data?.map((d) => d.nama_prodi) ?? [])
            : isSumberBiaya
            ? (pembiayaanBandingkanHook.data?.prodi_list ?? [])
            : (isCompletion || isParticipation)
            ? (responseRateBarHook.data?.data?.map((d) => d.prodi) ?? [])
            : selectedProdi;
          return chips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {chips.slice(0, 10).map((p) => (
                <span key={p} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">{p}</span>
              ))}
              {chips.length > 10 && (
                <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">+{chips.length - 10} lainnya</span>
              )}
            </div>
          ) : null;
        })()}

        {/* ══════════════════════════════════════════════════════════════════
            KETERSERAPAN (absorption + status distribution) — data dari BE
        ══════════════════════════════════════════════════════════════════ */}
        {isKeterserapanBE && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              {bandingkanHook.loading ? (
                <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /><span>Memuat data…</span>
                </div>
              ) : bandingkanHook.error ? (
                <div className="flex items-center justify-center h-64 text-destructive">{bandingkanHook.error}</div>
              ) : beChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Tidak ada data</div>
              ) : (
                <div className="overflow-y-auto max-h-[600px]">
                  <div style={{ minHeight: chartHeight }}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={beChartData} layout="vertical" margin={{ top: 20, right: 30, left: 180, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="prodi" type="category" width={170} fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null;
                            const row = beChartData.find((d) => d.prodi === label);
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                                <p className="font-semibold mb-1">{row?.fullProdi ?? label}</p>
                                <p className="text-xs text-muted-foreground mb-2">Total: {row?.total?.toLocaleString("id-ID")} alumni</p>
                                {payload.map((e: any) => (
                                  <p key={e.dataKey} style={{ color: e.color }} className="text-xs">
                                    {getShortLabel(e.dataKey)}: <strong>{e.value}%</strong> ({row?.[`${e.dataKey}Count`]} alumni)
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                        {beLabels.map((label) => (
                          <Bar key={label} dataKey={label} name={getShortLabel(label)} stackId="a" fill={beColorMap[label]} cursor="pointer" onClick={(d) => handleBeBarClick(d, label)} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Summary table absorption */}
            {beTableData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Program Studi</th>
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Total</th>
                        {beLabels.map((l) => <th key={l} className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{getShortLabel(l)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {beTableData.map((row) => {
                        const sm = Object.fromEntries(row.statuses.map((s) => [s.label, s]));
                        return (
                          <tr key={row.nama_prodi} className="border-t border-border/30 hover:bg-secondary/20">
                            <td className="py-2 px-3 font-medium">{row.nama_prodi}</td>
                            <td className="py-2 px-3 text-muted-foreground">{row.total}</td>
                            {beLabels.map((l) => {
                              const s = sm[l];
                              return (
                                <td key={l} className="py-2 px-3">
                                  {s ? <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: beColorMap[l] }}>{s.pct}% ({s.count})</span> : <span className="text-muted-foreground text-xs">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <DrillDownModal
              isOpen={beModal.open}
              onClose={() => setBeModal((m) => ({ ...m, open: false }))}
              title={beModal.title}
              data={beModalData}
              loading={drillHook.loading}
              error={drillHook.error}
              contextColumn={{ key: "status", label: "Status" }}
              onPageChange={handleBePageChange}
            />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            KESESUAIAN BIDANG — data dari BE
        ══════════════════════════════════════════════════════════════════ */}
        {isKesesuaian && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              {ksBandingkanHook.loading ? (
                <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /><span>Memuat data…</span>
                </div>
              ) : ksBandingkanHook.error ? (
                <div className="flex items-center justify-center h-64 text-destructive">{ksBandingkanHook.error}</div>
              ) : ksChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Tidak ada data</div>
              ) : (
                <div className="overflow-y-auto max-h-[600px]">
                  <div style={{ minHeight: chartHeight }}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={ksChartData} layout="vertical" margin={{ top: 20, right: 30, left: 180, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="prodi" type="category" width={170} fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null;
                            const row = ksChartData.find((d) => d.prodi === label);
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                                <p className="font-semibold mb-1">{row?.fullProdi ?? label}</p>
                                <p className="text-xs text-muted-foreground mb-2">Total: {row?.total?.toLocaleString("id-ID")} alumni</p>
                                {payload.map((e: any) => (
                                  <p key={e.dataKey} style={{ color: e.color }} className="text-xs">
                                    {getShortLabel(e.dataKey)}: <strong>{e.value}%</strong> ({row?.[`${e.dataKey}Count`]} alumni)
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                        {ksLabels.map((label) => (
                          <Bar
                            key={label} dataKey={label} name={getShortLabel(label)} stackId="a" fill={ksColorMap[label]} cursor="pointer"
                            onClick={(d: any) => {
                              const sk = KESESUAIAN_SK_MAP[label] ?? 1;
                              setKsModal({ open: true, title: `${d.fullProdi ?? d.prodi} — ${getShortLabel(label)}`, kesesuaian_sk: sk });
                              ksDrillHook.fetch({ kesesuaian_sk: sk });
                            }}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Summary table kesesuaian */}
            {ksTableData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Program Studi</th>
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Total</th>
                        {ksLabels.map((l) => <th key={l} className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{getShortLabel(l)}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {ksTableData.map((row) => (
                        <tr key={row.nama_prodi} className="border-t border-border/30 hover:bg-secondary/20">
                          <td className="py-2 px-3 font-medium">{row.nama_prodi}</td>
                          <td className="py-2 px-3 text-muted-foreground">{row.total}</td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: ksColorMap["Sesuai Bidang"] }}>
                              {row.pct_sesuai}% ({Math.round(row.total * row.pct_sesuai / 100)})
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: ksColorMap["Tidak Sesuai"] }}>
                              {row.pct_tidak_sesuai}% ({Math.round(row.total * row.pct_tidak_sesuai / 100)})
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <DrillDownModal
              isOpen={ksModal.open}
              onClose={() => setKsModal((m) => ({ ...m, open: false }))}
              title={ksModal.title}
              data={ksDrillHook.data}
              loading={ksDrillHook.loading}
              error={ksDrillHook.error}
              contextColumn={{ key: "kesesuaian_bidang", label: "Kesesuaian Bidang" }}
              onPageChange={(page, search) => ksDrillHook.fetch({ kesesuaian_sk: ksModal.kesesuaian_sk!, page, search })}
            />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            WAKTU TUNGGU — data dari BE
        ══════════════════════════════════════════════════════════════════ */}
        {isWaktuTunggu && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              {mtBandingkanHook.loading ? (
                <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /><span>Memuat data…</span>
                </div>
              ) : mtBandingkanHook.error ? (
                <div className="flex items-center justify-center h-64 text-destructive">{mtBandingkanHook.error}</div>
              ) : mtChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Tidak ada data</div>
              ) : (
                <div className="overflow-y-auto max-h-[600px]">
                  <div style={{ minHeight: chartHeight }}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={mtChartData} layout="vertical" margin={{ top: 20, right: 30, left: 180, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="prodi" type="category" width={170} fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null;
                            const row = mtChartData.find((d) => d.prodi === label);
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                                <p className="font-semibold mb-1">{row?.fullProdi ?? label}</p>
                                <p className="text-xs text-muted-foreground mb-1">Avg masa tunggu: {row?.avg} bln</p>
                                {payload.map((e: any) => (
                                  <p key={e.dataKey} style={{ color: e.color }} className="text-xs">
                                    {e.dataKey}: <strong>{e.value}%</strong> ({row?.[`${e.dataKey}Count` as keyof typeof row]} alumni)
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                        {mtLabels.map((label) => (
                          <Bar
                            key={label} dataKey={label} stackId="a" fill={mtColorMap[label]} cursor="pointer"
                            onClick={(d: any) => {
                              const rentang = label === "< 3 bulan" ? "0-3" : label === "3-6 bulan" ? "3-6" : ">6";
                              setMtModal({ open: true, title: `${d.fullProdi ?? d.prodi} — ${label}`, rentang: rentang as any });
                              mtDrillHook.fetch({ rentang: rentang as any });
                            }}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Summary table masa tunggu */}
            {mtChartData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Program Studi</th>
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Avg (bln)</th>
                        {mtLabels.map((l) => <th key={l} className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{l}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {mtChartData.map((row) => (
                        <tr key={row.fullProdi} className="border-t border-border/30 hover:bg-secondary/20">
                          <td className="py-2 px-3 font-medium">{row.fullProdi}</td>
                          <td className="py-2 px-3 text-muted-foreground">{row.avg}</td>
                          {mtLabels.map((l) => (
                            <td key={l} className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: mtColorMap[l] }}>
                                {row[l as keyof typeof row]}% ({row[`${l}Count` as keyof typeof row]})
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <DrillDownModal
              isOpen={mtModal.open}
              onClose={() => setMtModal((m) => ({ ...m, open: false }))}
              title={mtModal.title}
              data={mtDrillHook.data}
              loading={mtDrillHook.loading}
              error={mtDrillHook.error}
              contextColumn={{ key: "masa_tunggu_bekerja", label: "Masa Tunggu (bln)" }}
              onPageChange={(page, search) => mtDrillHook.fetch({ rentang: mtModal.rentang!, page, search })}
            />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            WIRAUSAHA — data dari BE
        ══════════════════════════════════════════════════════════════════ */}
        {isWirausaha && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              {wsBandingkanHook.loading ? (
                <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /><span>Memuat data…</span>
                </div>
              ) : wsBandingkanHook.error ? (
                <div className="flex items-center justify-center h-64 text-destructive">{wsBandingkanHook.error}</div>
              ) : wsChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Tidak ada data</div>
              ) : (
                <div className="overflow-y-auto max-h-[600px]">
                  <div style={{ minHeight: chartHeight }}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={wsChartData} layout="vertical" margin={{ top: 20, right: 30, left: 180, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="prodi" type="category" width={170} fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null;
                            const row = wsChartData.find((d) => d.prodi === label);
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                                <p className="font-semibold mb-1">{row?.fullProdi ?? label}</p>
                                <p className="text-xs text-muted-foreground mb-2">Wirausaha: {row?.count_wirausaha} ({row?.pct_wirausaha}%)</p>
                                {payload.map((e: any) => (
                                  <p key={e.dataKey} style={{ color: e.color }} className="text-xs">
                                    {e.dataKey}: <strong>{e.value}%</strong> ({row?.[`${e.dataKey}Count`]} alumni)
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                        {wsLabels.map((label) => (
                          <Bar
                            key={label} dataKey={label} stackId="a" fill={wsColorMap[label]} cursor="pointer"
                            onClick={(d: any) => {
                              setWsModal({ open: true, title: `${d.fullProdi ?? d.prodi} — ${label}`, tingkat: label });
                              wsDrillHook.fetch({ jabatan: label });
                            }}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Summary table wirausaha */}
            {wsChartData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Program Studi</th>
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">% Wirausaha</th>
                        {wsLabels.map((l) => <th key={l} className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{l}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {wsChartData.map((row) => (
                        <tr key={row.fullProdi} className="border-t border-border/30 hover:bg-secondary/20">
                          <td className="py-2 px-3 font-medium">{row.fullProdi}</td>
                          <td className="py-2 px-3 text-muted-foreground">{row.pct_wirausaha}%</td>
                          {wsLabels.map((l) => (
                            <td key={l} className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: wsColorMap[l] }}>
                                {row[l] ?? 0}% ({row[`${l}Count`] ?? 0})
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <DrillDownModal
              isOpen={wsModal.open}
              onClose={() => setWsModal((m) => ({ ...m, open: false }))}
              title={wsModal.title}
              data={wsDrillHook.data}
              loading={wsDrillHook.loading}
              error={wsDrillHook.error}
              contextColumn={null}
              onPageChange={(page, search) => wsDrillHook.fetch({ jabatan: wsModal.tingkat!, page, search })}
            />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            INCOME — data dari BE
        ══════════════════════════════════════════════════════════════════ */}
        {isIncome && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              {incomeBandingkanHook.loading ? (
                <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /><span>Memuat data…</span>
                </div>
              ) : incomeBandingkanHook.error ? (
                <div className="flex items-center justify-center h-64 text-destructive">{incomeBandingkanHook.error}</div>
              ) : incomeChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Tidak ada data</div>
              ) : (
                <div className="overflow-y-auto max-h-[600px]">
                  <div style={{ minHeight: chartHeight }}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={incomeChartData} layout="vertical" margin={{ top: 20, right: 30, left: 180, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="prodi" type="category" width={170} fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null;
                            const row = incomeChartData.find((d) => d.prodi === label);
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                                <p className="font-semibold mb-1">{row?.fullProdi ?? label}</p>
                                <p className="text-xs text-muted-foreground mb-2">Total: {row?.total?.toLocaleString("id-ID")} alumni</p>
                                {payload.map((e: any) => (
                                  <p key={e.dataKey} style={{ color: e.color }} className="text-xs">
                                    {e.dataKey}: <strong>{e.value}%</strong> ({row?.[`${e.dataKey}Count`]} alumni)
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                        {incomeLabels.map((label) => (
                          <Bar
                            key={label} dataKey={label} stackId="a" fill={incomeColorMap[label]} cursor="pointer"
                            onClick={(d: any) => {
                              const segmen: "above_ump" | "below_ump" = label === "≥ 1,2× UMP" ? "above_ump" : "below_ump";
                              const namaProdi = d.fullProdi ?? d.prodi;
                              setIncomeModal({ open: true, title: `${namaProdi} — ${label}`, segmen, namaProdi });
                              incomeDrillHook.fetch({ page: 1, segmen_ump: segmen, nama_prodi: namaProdi });
                            }}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Summary table income */}
            {incomeTableData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Program Studi</th>
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Total Alumni</th>
                        {incomeLabels.map((l) => (
                          <th key={l} className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(incomeTableData as PendapatanBandingkanItem[]).map((row) => {
                        const sm = Object.fromEntries(row.statuses.map((s) => [s.label, s]));
                        return (
                          <tr key={row.nama_prodi} className="border-t border-border/30 hover:bg-secondary/20">
                            <td className="py-2 px-3 font-medium">{row.nama_prodi}</td>
                            <td className="py-2 px-3 text-muted-foreground">{row.total}</td>
                            {incomeLabels.map((l) => {
                              const s = sm[l];
                              return (
                                <td key={l} className="py-2 px-3">
                                  {s ? (
                                    <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: incomeColorMap[l] }}>
                                      {s.pct}% ({s.count})
                                    </span>
                                  ) : <span className="text-muted-foreground text-xs">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <DrillDownModal
              isOpen={incomeModal.open}
              onClose={() => setIncomeModal((m) => ({ ...m, open: false }))}
              title={incomeModal.title}
              data={incomeDrillHook.data as any}
              loading={incomeDrillHook.loading}
              error={incomeDrillHook.error}
              contextColumn={{ key: "perusahaan", label: "Perusahaan" }}
              onPageChange={(page, search) => incomeDrillHook.fetch({ page, search, segmen_ump: incomeModal.segmen, nama_prodi: incomeModal.namaProdi })}
            />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            INCOME KELOMPOK — kelompok jt per prodi (data dari BE)
        ══════════════════════════════════════════════════════════════════ */}
        {isIncomeKelompok && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              {incomeKelompokBandingkanHook.loading ? (
                <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /><span>Memuat data…</span>
                </div>
              ) : incomeKelompokBandingkanHook.error ? (
                <div className="flex items-center justify-center h-64 text-destructive">{incomeKelompokBandingkanHook.error}</div>
              ) : incomeKelompokChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Tidak ada data</div>
              ) : (
                <div className="overflow-y-auto max-h-[600px]">
                  <div style={{ minHeight: chartHeight }}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={incomeKelompokChartData} layout="vertical" margin={{ top: 20, right: 30, left: 180, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="prodi" type="category" width={170} fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null;
                            const row = incomeKelompokChartData.find((d) => d.prodi === label);
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                                <p className="font-semibold mb-1">{row?.fullProdi ?? label}</p>
                                <p className="text-xs text-muted-foreground mb-2">Total: {row?.total?.toLocaleString("id-ID")} alumni</p>
                                {payload.map((e: any) => (
                                  <p key={e.dataKey} style={{ color: e.color }} className="text-xs">
                                    {e.dataKey}: <strong>{e.value}%</strong> ({row?.[`${e.dataKey}Count`]} alumni)
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                        {incomeKelompokLabels.map((label) => (
                          <Bar key={label} dataKey={label} stackId="a" fill={incomeKelompokColorMap[label]} cursor="pointer"
                            onClick={(d: any) => {
                              const segmen: "above_ump" | "below_ump" = label === "≥ 1,2× UMP" ? "above_ump" : "below_ump";
                              const namaProdi = d.fullProdi ?? d.prodi;
                              setIncomeModal({ open: true, title: `${namaProdi} — ${label}`, segmen, namaProdi });
                              incomeDrillHook.fetch({ page: 1, segmen_ump: segmen, nama_prodi: namaProdi });
                            }}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>

            {incomeKelompokTableData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Program Studi</th>
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Total Alumni</th>
                        {incomeKelompokLabels.map((l) => (
                          <th key={l} className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{l.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(incomeKelompokTableData as PendapatanBandingkanItem[]).map((row) => {
                        const sm = Object.fromEntries(row.statuses.map((s) => [s.label, s]));
                        return (
                          <tr key={row.nama_prodi} className="border-t border-border/30 hover:bg-secondary/20">
                            <td className="py-2 px-3 font-medium">{row.nama_prodi}</td>
                            <td className="py-2 px-3 text-muted-foreground">{row.total}</td>
                            {incomeKelompokLabels.map((l) => {
                              const s = sm[l];
                              return (
                                <td key={l} className="py-2 px-3">
                                  {s ? (
                                    <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: incomeKelompokColorMap[l] }}>
                                      {s.pct}% ({s.count})
                                    </span>
                                  ) : <span className="text-muted-foreground text-xs">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <DrillDownModal
              isOpen={incomeModal.open}
              onClose={() => setIncomeModal((m) => ({ ...m, open: false }))}
              title={incomeModal.title}
              data={incomeDrillHook.data as any}
              loading={incomeDrillHook.loading}
              error={incomeDrillHook.error}
              contextColumn={{ key: "perusahaan", label: "Perusahaan" }}
              onPageChange={(page, search) => incomeDrillHook.fetch({ page, search, segmen_ump: incomeModal.segmen, nama_prodi: incomeModal.namaProdi })}
            />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            JENIS INSTANSI — data dari BE
        ══════════════════════════════════════════════════════════════════ */}
        {isJenisInstansi && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              {instansiBandingkanHook.loading ? (
                <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /><span>Memuat data…</span>
                </div>
              ) : instansiBandingkanHook.error ? (
                <div className="flex items-center justify-center h-64 text-destructive">{instansiBandingkanHook.error}</div>
              ) : instansiJenisChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Tidak ada data</div>
              ) : (
                <div className="overflow-y-auto max-h-[600px]">
                  <div style={{ minHeight: chartHeight }}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={instansiJenisChartData} layout="vertical" margin={{ top: 20, right: 30, left: 180, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="prodi" type="category" width={170} fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null;
                            const row = instansiJenisChartData.find((d) => d.prodi === label);
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                                <p className="font-semibold mb-1">{row?.fullProdi ?? label}</p>
                                <p className="text-xs text-muted-foreground mb-2">Total: {row?.total?.toLocaleString("id-ID")} alumni</p>
                                {payload.map((e: any) => (
                                  <p key={e.dataKey} style={{ color: e.color }} className="text-xs">
                                    {e.dataKey}: <strong>{e.value}%</strong> ({row?.[`${e.dataKey}Count`]} alumni)
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                        {instansiJenisLabels.map((label) => (
                          <Bar key={label} dataKey={label} stackId="a" fill={instansiJenisColorMap[label]} cursor="pointer"
                            onClick={(d: any) => handleInstansiJenisClick(d, label)}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>

            {instansiJenisChartData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Program Studi</th>
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Total Alumni</th>
                        {instansiJenisLabels.map((l) => (
                          <th key={l} className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(instansiBandingkanHook.data?.data ?? []).map((row) => (
                        <tr key={row.nama_prodi} className="border-t border-border/30 hover:bg-secondary/20">
                          <td className="py-2 px-3 font-medium">{row.nama_prodi}</td>
                          <td className="py-2 px-3 text-muted-foreground">{row.total}</td>
                          {instansiJenisLabels.map((l) => {
                            const j = row.jenis.find((x) => x.label === l);
                            return (
                              <td key={l} className="py-2 px-3">
                                {j ? (
                                  <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: instansiJenisColorMap[l] }}>
                                    {j.pct}% ({j.count})
                                  </span>
                                ) : <span className="text-muted-foreground text-xs">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <DrillDownModal
              isOpen={instansiModal.open && isJenisInstansi}
              onClose={() => setInstansiModal((m) => ({ ...m, open: false }))}
              title={instansiModal.title}
              data={instansiDrillHook.data as any}
              loading={instansiDrillHook.loading}
              error={instansiDrillHook.error}
              contextColumn={{ key: "jenis_instansi", label: "Jenis Instansi" }}
              onPageChange={handleInstansiPageChange}
            />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TINGKAT INSTANSI — data dari BE
        ══════════════════════════════════════════════════════════════════ */}
        {isTingkatInstansi && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              {instansiBandingkanHook.loading ? (
                <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /><span>Memuat data…</span>
                </div>
              ) : instansiBandingkanHook.error ? (
                <div className="flex items-center justify-center h-64 text-destructive">{instansiBandingkanHook.error}</div>
              ) : instansiTingkatChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Tidak ada data</div>
              ) : (
                <div className="overflow-y-auto max-h-[600px]">
                  <div style={{ minHeight: chartHeight }}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={instansiTingkatChartData} layout="vertical" margin={{ top: 20, right: 30, left: 180, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="prodi" type="category" width={170} fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null;
                            const row = instansiTingkatChartData.find((d) => d.prodi === label);
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                                <p className="font-semibold mb-1">{row?.fullProdi ?? label}</p>
                                <p className="text-xs text-muted-foreground mb-2">Total: {row?.total?.toLocaleString("id-ID")} alumni</p>
                                {payload.map((e: any) => (
                                  <p key={e.dataKey} style={{ color: e.color }} className="text-xs">
                                    {e.dataKey}: <strong>{e.value}%</strong> ({row?.[`${e.dataKey}Count`]} alumni)
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                        {instansiTingkatLabels.map((label) => (
                          <Bar key={label} dataKey={label} stackId="a" fill={instansiTingkatColorMap[label]} cursor="pointer"
                            onClick={(d: any) => handleInstansiTingkatClick(d, label)}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>

            {instansiTingkatChartData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Program Studi</th>
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Total Alumni</th>
                        {instansiTingkatLabels.map((l) => (
                          <th key={l} className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(instansiBandingkanHook.data?.data ?? []).map((row) => (
                        <tr key={row.nama_prodi} className="border-t border-border/30 hover:bg-secondary/20">
                          <td className="py-2 px-3 font-medium">{row.nama_prodi}</td>
                          <td className="py-2 px-3 text-muted-foreground">{row.total}</td>
                          {instansiTingkatLabels.map((l) => {
                            const t = row.tingkat.find((x) => x.label === l);
                            return (
                              <td key={l} className="py-2 px-3">
                                {t ? (
                                  <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: instansiTingkatColorMap[l] }}>
                                    {t.pct}% ({t.count})
                                  </span>
                                ) : <span className="text-muted-foreground text-xs">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <DrillDownModal
              isOpen={instansiModal.open && isTingkatInstansi}
              onClose={() => setInstansiModal((m) => ({ ...m, open: false }))}
              title={instansiModal.title}
              data={instansiDrillHook.data as any}
              loading={instansiDrillHook.loading}
              error={instansiDrillHook.error}
              contextColumn={{ key: "tingkat_instansi", label: "Tingkat Instansi" }}
              onPageChange={handleInstansiPageChange}
            />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            RESPONSE RATE — completion (KPI2) & participation (KPI3)
        ══════════════════════════════════════════════════════════════════ */}
        {(isCompletion || isParticipation) && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              {responseRateBarHook.loading ? (
                <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /><span>Memuat data…</span>
                </div>
              ) : responseRateBarHook.error ? (
                <div className="flex items-center justify-center h-64 text-destructive">{responseRateBarHook.error}</div>
              ) : rrChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Tidak ada data</div>
              ) : (
                <div className="overflow-y-auto max-h-[600px]">
                  <div style={{ minHeight: chartHeight }}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={rrChartData} layout="vertical" margin={{ top: 20, right: 30, left: 180, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="prodi" type="category" width={170} fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null;
                            const row = rrChartData.find((d) => d.prodi === label);
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                                <p className="font-semibold mb-1">{row?.fullProdi ?? label}</p>
                                <p className="text-xs text-muted-foreground mb-2">Total: {row?.total?.toLocaleString("id-ID")} alumni</p>
                                {payload.map((e: any) => (
                                  <p key={e.dataKey} style={{ color: e.color }} className="text-xs">
                                    {e.dataKey}: <strong>{e.value}%</strong> ({row?.[`${e.dataKey}Count`]} alumni)
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                        {rrLabels.map((label) => (
                          <Bar key={label} dataKey={label} stackId="a" fill={rrColorMap[label]} cursor="pointer"
                            onClick={(d: any) => {
                              const sk = statusNameToKey(label);
                              setRrModal({ open: true, title: `${d.fullProdi ?? d.prodi} — ${label}`, status: sk });
                              responseRateDrillHook.fetch({ status: sk, page: 1 });
                            }}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>

            {rrChartData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Program Studi</th>
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Total Alumni</th>
                        {rrLabels.map((l) => (
                          <th key={l} className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rrChartData.map((row) => (
                        <tr key={row.prodi} className="border-t border-border/30 hover:bg-secondary/20">
                          <td className="py-2 px-3 font-medium">{row.fullProdi}</td>
                          <td className="py-2 px-3 text-muted-foreground">{row.total}</td>
                          {rrLabels.map((l) => (
                            <td key={l} className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: rrColorMap[l] }}>
                                {row[l]}% ({row[`${l}Count`]})
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <DrillDownModal
              isOpen={rrModal.open}
              onClose={() => setRrModal((m) => ({ ...m, open: false }))}
              title={rrModal.title}
              data={responseRateDrillHook.data as any}
              loading={responseRateDrillHook.loading}
              error={responseRateDrillHook.error}
              contextColumn={{ key: "status", label: "Status" }}
              onPageChange={(page, search) => responseRateDrillHook.fetch({ status: rrModal.status, page, search })}
            />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SUMBER BIAYA — data dari BE
        ══════════════════════════════════════════════════════════════════ */}
        {isSumberBiaya && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              {pembiayaanBandingkanHook.isLoading ? (
                <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /><span>Memuat data…</span>
                </div>
              ) : pembiayaanBandingkanHook.error ? (
                <div className="flex items-center justify-center h-64 text-destructive">{(pembiayaanBandingkanHook.error as Error)?.message ?? "Gagal memuat data"}</div>
              ) : pembiayaanChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Tidak ada data</div>
              ) : (
                <div className="overflow-y-auto max-h-[600px]">
                  <div style={{ minHeight: chartHeight }}>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={pembiayaanChartData} layout="vertical" margin={{ top: 20, right: 30, left: 180, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis dataKey="prodi" type="category" width={170} fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                          content={({ active, payload, label }) => {
                            if (!active || !payload) return null;
                            const row = pembiayaanChartData.find((d) => d.prodi === label);
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                                <p className="font-semibold mb-1">{row?.fullProdi ?? label}</p>
                                <p className="text-xs text-muted-foreground mb-2">Total: {row?.total?.toLocaleString("id-ID")} alumni</p>
                                {payload.map((e: any) => (
                                  <p key={e.dataKey} style={{ color: e.color }} className="text-xs">
                                    {e.dataKey}: <strong>{e.value}%</strong> ({row?.[`${e.dataKey}Count`]} alumni)
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                        {pembiayaanLabels.map((label) => (
                          <Bar key={label} dataKey={label} stackId="a" fill={pembiayaanColorMap[label]} cursor="pointer"
                            onClick={(d: any) => {
                              setPembiayaanModal({ open: true, title: `${d.fullProdi ?? d.prodi} — ${label}`, sumber_biaya: label });
                              pembiayaanDrillHook.fetch({ sumber_biaya: label, page: 1 });
                            }}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </motion.div>

            {pembiayaanChartData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Program Studi</th>
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Total Alumni</th>
                        {pembiayaanLabels.map((l) => (
                          <th key={l} className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(pembiayaanBandingkanHook.data?.data ?? []).map((row) => (
                        <tr key={row.nama_prodi} className="border-t border-border/30 hover:bg-secondary/20">
                          <td className="py-2 px-3 font-medium">{row.nama_prodi}</td>
                          <td className="py-2 px-3 text-muted-foreground">{row.total}</td>
                          {pembiayaanLabels.map((l) => {
                            const s = row.sumber.find((x) => x.label === l);
                            return (
                              <td key={l} className="py-2 px-3">
                                {s ? <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: pembiayaanColorMap[l] }}>{s.pct}% ({s.count})</span> : <span className="text-muted-foreground text-xs">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <DrillDownModal
              isOpen={pembiayaanModal.open}
              onClose={() => setPembiayaanModal((m) => ({ ...m, open: false }))}
              title={pembiayaanModal.title}
              data={pembiayaanDrillHook.data as any}
              loading={pembiayaanDrillHook.loading}
              error={pembiayaanDrillHook.error}
              contextColumn={{ key: "sumber_biaya", label: "Sumber Biaya" }}
              onPageChange={(page, search) => pembiayaanDrillHook.fetch({ sumber_biaya: pembiayaanModal.sumber_biaya, page, search })}
            />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            GAP KOMPETENSI — data dari BE
        ══════════════════════════════════════════════════════════════════ */}
        {isCompetency && (
          <>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            {kompetensiGapHook.loading ? (
              <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /><span>Memuat data…</span>
              </div>
            ) : kompetensiGapHook.error ? (
              <div className="flex items-center justify-center h-64 text-destructive">{kompetensiGapHook.error}</div>
            ) : competencyChartData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">Tidak ada data</div>
            ) : (
              <div style={{ minHeight: chartHeight }}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart data={competencyChartData} layout="vertical" margin={{ top: 20, right: 30, left: 180, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="prodi" type="category" width={170} fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload) return null;
                        const row = competencyChartData.find((d) => d.prodi === label);
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                            <p className="font-semibold mb-1">{row?.fullProdi ?? label}</p>
                            <p className="text-xs text-muted-foreground mb-2">Total: {row?.total} indikator</p>
                            {payload.map((e: any) => (
                              <p key={e.dataKey} style={{ color: e.color }} className="text-xs">
                                {e.dataKey}: <strong>{e.value}%</strong> ({row?.[`${e.dataKey}Count`]})
                              </p>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                    {competencyLevels.map((label) => (
                      <Bar key={label} dataKey={label} stackId="a" fill={competencyColorMap[label]}
                        cursor="pointer"
                        onClick={(d: any) => {
                          const allProdi = kompetensiGapHook.data?.data ?? [];
                          const prodiRow = allProdi.find((p) => p.nama_prodi === d.fullProdi) ?? allProdi.find((p) => p.nama_prodi.includes(d.prodi?.replace("…", "")));
                          const levelIndicators = prodiRow?.indikator?.filter((m) =>
                            label === "Tinggi (>4)" ? m.skor_lulus > 4 : label === "Sedang (3-4)" ? m.skor_lulus >= 3 && m.skor_lulus <= 4 : m.skor_lulus < 3
                          );
                          const gg = levelIndicators?.[0]?.grup_gap ?? prodiRow?.indikator?.[0]?.grup_gap ?? allProdi[0]?.indikator?.[0]?.grup_gap;
                          setKompModal({ open: true, title: `${label} — ${d.fullProdi ?? d.prodi}`, grup_gap: gg });
                          if (gg) kompetensiDrillHook.fetch({ grup_gap: gg, page: 1 });
                        }}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>

          {competencyChartData.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Program Studi</th>
                      <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Total Indikator</th>
                      {competencyLevels.map((l) => (
                        <th key={l} className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{l}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {competencyChartData.map((row) => (
                      <tr key={row.fullProdi} className="border-t border-border/30 hover:bg-secondary/20">
                        <td className="py-2 px-3 font-medium">{row.fullProdi}</td>
                        <td className="py-2 px-3 text-muted-foreground">{row.total}</td>
                        {competencyLevels.map((l) => (
                          <td key={l} className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: competencyColorMap[l] }}>
                              {row[l]}% ({row[`${l}Count`]})
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          <DrillDownModal
            isOpen={kompModal.open}
            onClose={() => setKompModal((m) => ({ ...m, open: false }))}
            title={kompModal.title}
            data={kompetensiDrillHook.data}
            loading={kompetensiDrillHook.loading}
            error={kompetensiDrillHook.error}
            contextColumn={{ key: "gap", label: "Gap" }}
            onPageChange={(page, search) => kompetensiDrillHook.fetch({ grup_gap: kompModal.grup_gap, page, search })}
          />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            PERSEPSI METODE PEMBELAJARAN — data dari BE
        ══════════════════════════════════════════════════════════════════ */}
        {isLearning && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              {metodeBandingkanHook.loading ? (
                <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /><span>Memuat data…</span>
                </div>
              ) : metodeBandingkanHook.error ? (
                <div className="flex items-center justify-center h-64 text-destructive">{metodeBandingkanHook.error}</div>
              ) : learningChartData.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">Tidak ada data</div>
              ) : (
                <div style={{ minHeight: chartHeight }}>
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart data={learningChartData} layout="vertical" margin={{ top: 20, right: 30, left: 180, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis dataKey="prodi" type="category" width={170} fontSize={11} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload) return null;
                          const row = learningChartData.find((d) => d.prodi === label);
                          return (
                            <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
                              <p className="font-semibold mb-1">{row?.fullProdi ?? label}</p>
                              <p className="text-xs text-muted-foreground mb-2">Total: {row?.total} metode</p>
                              {payload.map((e: any) => (
                                <p key={e.dataKey} style={{ color: e.color }} className="text-xs">
                                  {e.dataKey}: <strong>{e.value}%</strong> ({row?.[`${e.dataKey}Count`]} metode)
                                </p>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                      {learningLevels.map((label) => (
                        <Bar key={label} dataKey={label} stackId="a" fill={learningColorMap[label]}
                          cursor="pointer"
                          onClick={(d: any) => {
                            const prodiRow = metodeBandingkanHook.data?.data?.find((p) => p.nama_prodi === d.fullProdi || p.nama_prodi.startsWith(d.prodi));
                            const methods = prodiRow?.metode?.filter((m) =>
                              label === "Tinggi (>4)" ? m.avg_skor > 4 : label === "Sedang (3-4)" ? m.avg_skor >= 3 && m.avg_skor <= 4 : m.avg_skor < 3
                            );
                            const kf = methods?.[0]?.kode_field;
                            setMetodeModal({ open: true, title: `${label} — ${d.fullProdi ?? d.prodi}`, kode_field: kf });
                            metodeDrillHook.fetch({ kode_field: kf, page: 1 });
                          }}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </motion.div>

            {learningChartData.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
                <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Program Studi</th>
                        <th className="py-2 px-3 text-left font-semibold text-muted-foreground">Total Alumni</th>
                        {learningLevels.map((l) => (
                          <th key={l} className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{l}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {learningChartData.map((row) => (
                        <tr key={row.fullProdi} className="border-t border-border/30 hover:bg-secondary/20">
                          <td className="py-2 px-3 font-medium">{row.fullProdi}</td>
                          <td className="py-2 px-3 text-muted-foreground">{row.total}</td>
                          {learningLevels.map((l) => (
                            <td key={l} className="py-2 px-3">
                              <span className="px-2 py-0.5 rounded text-xs font-medium text-white" style={{ backgroundColor: learningColorMap[l] }}>
                                {row[l]}% ({row[`${l}Count`]})
                              </span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            <DrillDownModal
              isOpen={metodeModal.open}
              onClose={() => setMetodeModal((m) => ({ ...m, open: false }))}
              title={metodeModal.title}
              data={metodeDrillHook.data}
              loading={metodeDrillHook.loading}
              error={metodeDrillHook.error}
              contextColumn={{ key: "metode", label: "Metode" }}
              onPageChange={(page, search) => metodeDrillHook.fetch({ kode_field: metodeModal.kode_field, page, search })}
            />
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TREND HEATMAP — mock
        ══════════════════════════════════════════════════════════════════ */}
        {isTrendType && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px] bg-secondary/50"><SelectValue placeholder="Pilih Kategori" /></SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {trendCategories.map((c) => <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <UITooltip>
                <TooltipTrigger><Info className="w-4 h-4 text-muted-foreground" /></TooltipTrigger>
                <TooltipContent className="max-w-xs bg-card border-border">
                  <p className="text-sm">Heatmap menunjukkan persentase {currentTrendCat?.name} per prodi per tahun.</p>
                </TooltipContent>
              </UITooltip>
            </div>
            <div className="overflow-y-auto max-h-[500px]">
              <div className="min-w-[500px]">
                <div className="flex sticky top-0 bg-card z-10">
                  <div className="w-48 flex-shrink-0 px-2 py-2 text-sm font-medium text-muted-foreground">Program Studi</div>
                  {YEARS.map((y) => <div key={y} className="flex-1 min-w-[80px] px-2 py-2 text-center text-sm font-medium">{y}</div>)}
                </div>
                <div className="flex flex-col gap-1">
                  {heatmapData.map((row) => (
                    <div key={row.prodi} className="flex gap-1">
                      <div className="w-48 flex-shrink-0 px-2 py-3 flex items-center bg-secondary/20 rounded-l-md">
                        <span className="text-xs font-medium truncate">{row.prodi}</span>
                      </div>
                      {YEARS.map((year, idx) => {
                        const val = parseFloat(row[year]) || 0;
                        return (
                          <UITooltip key={year}>
                            <TooltipTrigger asChild>
                              <div className={`flex-1 min-w-[80px] h-12 flex items-center justify-center transition-all hover:scale-[1.02] ${idx === YEARS.length - 1 ? "rounded-r-md" : ""}`}
                                style={{ backgroundColor: getHeatmapColor(val, currentTrendCat?.isPositive ?? true) }}>
                                <span className="text-xs font-bold text-white drop-shadow-md">{val.toFixed(0)}%</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-card border-border p-3">
                              <p className="font-semibold text-sm">{row.prodi}</p>
                              <p className="text-sm text-primary">Tahun {year}: <span className="font-bold">{val.toFixed(1)}%</span></p>
                              <p className="text-xs text-muted-foreground mt-1">{row[`${year}Count`]} dari {row[`${year}Total`]} alumni</p>
                            </TooltipContent>
                          </UITooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            KPI LAIN — mock (stacked bar)
        ══════════════════════════════════════════════════════════════════ */}
        {!isBeType && !isTrendType && (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              {isKepuasanType && (
                <div className="flex items-center gap-4 mb-6">
                  <Select value={selectedKepuasanIndicator} onValueChange={setSelectedKepuasanIndicator}>
                    <SelectTrigger className="w-[220px] bg-secondary/50"><SelectValue placeholder="Pilih Indikator" /></SelectTrigger>
                    <SelectContent className="bg-card border-border z-50">
                      {SATISFACTION_INDICATORS.map((i) => <SelectItem key={i.key} value={i.key}>{i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="overflow-y-auto max-h-[600px]">
                <div style={{ minHeight: chartHeight }}>
                  <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart data={mockChartData} layout="vertical" margin={{ top: 20, right: 30, left: 150, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" horizontal={false} />
                      <XAxis type="number" stroke="hsl(215 20% 55%)" fontSize={12} domain={[0, 100]} tickFormatter={(v: number) => `${Math.round(v)}%`} />
                      <YAxis dataKey="prodi" type="category" stroke="hsl(215 20% 55%)" fontSize={11} width={140} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(222 47% 11%)", border: "1px solid hsl(217 33% 22%)", borderRadius: "8px" }}
                        content={({ active, payload, label }) => {
                          if (!active || !payload) return null;
                          const row = mockChartData.find((d) => d.prodi === label);
                          return (
                            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-semibold text-sm mb-2">{row?.fullProdi || label}</p>
                              <p className="text-xs text-muted-foreground mb-2">Total: {row?.total} alumni</p>
                              {payload.map((e: any) => {
                                const cat = categories.find((c) => c.key === e.dataKey);
                                return <p key={e.dataKey} className="text-xs" style={{ color: e.color }}>{cat?.name}: <strong>{e.value}% ({row?.[`${e.dataKey}Count`]} alumni)</strong></p>;
                              })}
                            </div>
                          );
                        }}
                      />
                      <Legend wrapperStyle={{ paddingTop: "10px" }} formatter={(v) => { const c = categories.find((x) => x.key === v); return <span className="text-sm text-foreground">{c?.name || v}</span>; }} />
                      {categories.map((cat) => (
                        <Bar key={cat.key} dataKey={cat.key} stackId="a" fill={cat.color} onClick={(d) => handleMockBarClick(d, cat.key)} style={{ cursor: "pointer" }} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            {/* Summary table mock */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
              <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Program Studi</th><th>Total Alumni</th>
                      {categories.map((c) => <th key={c.key}>{c.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {mockChartData.map((row) => (
                      <tr key={row.fullProdi}>
                        <td className="font-medium">{row.fullProdi}</td>
                        <td>{row.total}</td>
                        {categories.map((cat) => (
                          <td key={cat.key}>
                            <span className="px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                              {row[cat.key]}% ({row[`${cat.key}Count`]})
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>

            {/* Modal mock */}
            <StudentDataModal
              isOpen={mockModalOpen}
              onClose={() => setMockModalOpen(false)}
              title={mockModalData.title}
              subtitle={
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Filter segmen:</span>
                    <Select value={mockModalData.selectedSegment} onValueChange={handleMockSegmentChange}>
                      <SelectTrigger className="w-[160px] h-8 text-sm bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border z-[10000]">
                        <SelectItem value="all">Semua</SelectItem>
                        {mockModalData.segments.map((s) => <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getMockSegmentStats().map((stat) => (
                      <span key={stat.name} className="text-xs bg-secondary/50 px-2 py-1 rounded">{stat.name}: {stat.count} ({stat.percentage}%)</span>
                    ))}
                  </div>
                </div>
              }
              students={mockModalData.students}
              columns={[{ key: "prodi", label: "Prodi" }, { key: "status", label: "Status" }]}
            />
          </>
        )}

      </div>
    </DashboardLayout>
  );
};

export default ComparePage;
