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
import { buildColorMap } from "@/lib/chartColors";
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
  waktuTunggu: {
    title: "Perbandingan Waktu Tunggu Kerja per Prodi",
    description: "Distribusi waktu tunggu mendapatkan pekerjaan pertama",
    getCategories: () => [
      { key: "cepat",  name: "< 3 bulan", color: "#10b981", filter: (s) => s.waktuTunggu < 3 },
      { key: "sedang", name: "3-6 bulan", color: "#f59e0b", filter: (s) => s.waktuTunggu >= 3 && s.waktuTunggu <= 6 },
      { key: "lama",   name: "> 6 bulan", color: "#ef4444", filter: (s) => s.waktuTunggu > 6 },
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

  const isAbsorption   = chartType === "absorption";
  const isTrendType    = chartType === "trend";
  const isKepuasanType = chartType === "kepuasan";

  // selectedProdi hanya untuk tampilan chip — tidak dipakai untuk fetch
  // (fetch dilakukan berdasarkan filter aktif di GlobalFiltersContext)
  const selectedProdi: string[] = [];

  // ── Data BE — hanya absorption ────────────────────────────────────────────
  const bandingkanHook = useKeterserapanBandingkan(isAbsorption);
  const drillHook      = useKeterserapanDrillDown();

  // ── Segment & warna dinamis dari BE ───────────────────────────────────────
  const { allLabels: beLabels, colorMap: beColorMap } = useMemo(() => {
    if (!bandingkanHook.data?.chart) return { allLabels: [] as string[], colorMap: {} as Record<string, string> };
    const set = new Set<string>();
    bandingkanHook.data.chart.forEach((item) => item.statuses.forEach((s) => set.add(s.label)));
    const labels = [...set];
    return { allLabels: labels, colorMap: buildColorMap(labels) };
  }, [bandingkanHook.data]);

  const beChartData = useMemo(
    () => (isAbsorption && bandingkanHook.data?.chart)
      ? buildBeChartData(bandingkanHook.data.chart)
      : [],
    [bandingkanHook.data, isAbsorption]
  );
  const beTableData = bandingkanHook.data?.table ?? [];

  // ── Modal absorption (BE — DrillDownModal) ────────────────────────────────
  const [beModal, setBeModal] = useState<{ open: boolean; title: string; status?: string }>({ open: false, title: "" });

  const handleBeBarClick = (barData: any, statusLabel: string) => {
    setBeModal({ open: true, title: `${barData.fullProdi ?? barData.prodi} — ${statusLabel}`, status: statusLabel });
    drillHook.fetch({ status: statusLabel });
  };

  const handleBePageChange = (page: number, search?: string) => {
    drillHook.fetch({ status: beModal.status, page, search });
  };

  // ── Mock data (KPI selain absorption) ────────────────────────────────────
  const config     = !isAbsorption && !isTrendType ? (CHART_CONFIGS[chartType] ?? CHART_CONFIGS.gender) : null;
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
    if (isAbsorption || isTrendType) return [];
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
  }, [selectedProdi, chartType, categories, isAbsorption, isTrendType, isKepuasanType]);

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

  const chartHeight = Math.max(400, selectedProdi.length * (isAbsorption ? 52 : 40));

  const pageTitle = isAbsorption
    ? "Perbandingan Keterserapan Lulusan per Prodi"
    : isTrendType
    ? `Heatmap Trend ${indicatorParam} per Prodi`
    : config?.title ?? "";

  const pageDesc = isAbsorption
    ? "Distribusi status alumni per program studi (data real)"
    : isTrendType
    ? "Visualisasi persentase indikator per prodi per tahun"
    : config?.description ?? "";

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
        <div className="flex flex-wrap gap-2">
          {selectedProdi.slice(0, 10).map((p) => (
            <span key={p} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">{p}</span>
          ))}
          {selectedProdi.length > 10 && (
            <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">+{selectedProdi.length - 10} lainnya</span>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            ABSORPTION — data dari BE
        ══════════════════════════════════════════════════════════════════ */}
        {isAbsorption && (
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
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                                    {e.dataKey}: <strong>{e.value}%</strong> ({row?.[`${e.dataKey}Count`]} alumni)
                                  </p>
                                ))}
                              </div>
                            );
                          }}
                        />
                        <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                        {beLabels.map((label) => (
                          <Bar key={label} dataKey={label} stackId="a" fill={beColorMap[label]} cursor="pointer" onClick={(d) => handleBeBarClick(d, label)} />
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
                        {beLabels.map((l) => <th key={l} className="py-2 px-3 text-left font-semibold text-muted-foreground whitespace-nowrap">{l}</th>)}
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
              data={drillHook.data}
              loading={drillHook.loading}
              error={drillHook.error}
              contextColumn={{ key: "status", label: "Status" }}
              onPageChange={handleBePageChange}
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
        {!isAbsorption && !isTrendType && (
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
                      <XAxis type="number" stroke="hsl(215 20% 55%)" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
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