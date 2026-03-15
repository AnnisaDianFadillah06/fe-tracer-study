import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Info } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MOCK_STUDENTS, PRODI_LIST, getFilteredStudents, Student, SUMBER_BIAYA_OPTIONS, CARA_MENDAPAT_KERJA_OPTIONS, JENIS_INSTANSI_OPTIONS } from "@/lib/mockData";

// Chart configurations
const CHART_CONFIGS: Record<string, {
  title: string;
  description: string;
  getCategories: () => { key: string; name: string; color: string; filter: (s: any) => boolean }[];
}> = {
  gender: {
    title: "Perbandingan Distribusi Gender per Prodi",
    description: "Persentase mahasiswa berdasarkan gender untuk setiap program studi",
    getCategories: () => [
      { key: "pria", name: "Pria", color: "#0ea5e9", filter: (s) => s.gender === "Pria" },
      { key: "wanita", name: "Wanita", color: "#f97316", filter: (s) => s.gender === "Wanita" },
    ],
  },
  status: {
    title: "Perbandingan Status Alumni per Prodi",
    description: "Distribusi status pekerjaan alumni untuk setiap program studi",
    getCategories: () => [
      { key: "bekerja", name: "Bekerja", color: "#10b981", filter: (s) => s.status === "Bekerja" },
      { key: "cariKerja", name: "Mencari Kerja", color: "#f59e0b", filter: (s) => s.status === "Mencari Kerja" },
      { key: "studiLanjut", name: "Studi Lanjut", color: "#0ea5e9", filter: (s) => s.status === "Studi Lanjut" },
      { key: "wiraswasta", name: "Wiraswasta", color: "#8b5cf6", filter: (s) => s.status === "Wiraswasta" },
      { key: "studiBekerja", name: "Studi & Bekerja", color: "#3b82f6", filter: (s) => s.status === "Studi & Bekerja" },
      { key: "belumBekerja", name: "Belum Bekerja", color: "#6b7280", filter: (s) => s.status === "Belum Bekerja" },
    ],
  },
  kesesuaian: {
    title: "Perbandingan Kesesuaian Bidang per Prodi",
    description: "Tingkat kesesuaian pekerjaan dengan bidang studi",
    getCategories: () => [
      { key: "sangatErat", name: "Sangat Erat", color: "#10b981", filter: (s) => s.kesesuaianBidang === "Sangat Erat" },
      { key: "erat", name: "Erat", color: "#22c55e", filter: (s) => s.kesesuaianBidang === "Erat" },
      { key: "cukup", name: "Cukup Erat", color: "#f59e0b", filter: (s) => s.kesesuaianBidang === "Cukup Erat" },
      { key: "kurang", name: "Kurang Erat", color: "#f97316", filter: (s) => s.kesesuaianBidang === "Kurang Erat" },
      { key: "tidak", name: "Tidak Sesuai", color: "#ef4444", filter: (s) => s.kesesuaianBidang === "Tidak Sesuai" },
    ],
  },
  waktuTunggu: {
    title: "Perbandingan Waktu Tunggu Kerja per Prodi",
    description: "Distribusi waktu tunggu mendapatkan pekerjaan pertama",
    getCategories: () => [
      { key: "cepat", name: "< 3 bulan", color: "#10b981", filter: (s) => s.waktuTunggu < 3 },
      { key: "sedang", name: "3-6 bulan", color: "#f59e0b", filter: (s) => s.waktuTunggu >= 3 && s.waktuTunggu <= 6 },
      { key: "lama", name: "> 6 bulan", color: "#ef4444", filter: (s) => s.waktuTunggu > 6 },
    ],
  },
  perusahaan: {
    title: "Perbandingan Kategori Perusahaan per Prodi",
    description: "Distribusi jenis perusahaan tempat alumni bekerja",
    getCategories: () => [
      { key: "nasional", name: "Nasional/BBH", color: "#f97316", filter: (s) => s.kategoriPerusahaan === "Nasional/BBH" },
      { key: "multinasional", name: "Multinasional", color: "#0ea5e9", filter: (s) => s.kategoriPerusahaan === "Multinasional" },
      { key: "lokal", name: "Lokal/Tidak BBH", color: "#8b5cf6", filter: (s) => s.kategoriPerusahaan === "Lokal/Tidak BBH" },
    ],
  },
  kepuasan: {
    title: "Perbandingan Kepuasan Pengguna per Prodi",
    description: "Penilaian stakeholder terhadap kompetensi alumni",
    getCategories: () => [
      { key: "sangatBaik", name: "Sangat Baik", color: "#10b981", filter: () => Math.random() > 0.5 },
      { key: "baik", name: "Baik", color: "#22c55e", filter: () => Math.random() > 0.5 },
      { key: "cukup", name: "Cukup", color: "#f59e0b", filter: () => Math.random() > 0.5 },
      { key: "kurang", name: "Kurang", color: "#ef4444", filter: () => Math.random() > 0.5 },
    ],
  },
  sumberBiaya: {
    title: "Perbandingan Sumber Biaya Kuliah per Prodi",
    description: "Distribusi sumber pembiayaan kuliah mahasiswa",
    getCategories: () => SUMBER_BIAYA_OPTIONS.map((opt, idx) => ({
      key: opt.replace(/[^a-zA-Z]/g, '').toLowerCase(),
      name: opt,
      color: ["#f97316", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#6b7280"][idx % 7],
      filter: (s: any) => s.sumberBiayaKuliah === opt,
    })),
  },
  caraMendapatKerja: {
    title: "Perbandingan Cara Mendapat Pekerjaan per Prodi",
    description: "Distribusi metode pencarian kerja (multiple response)",
    getCategories: () => CARA_MENDAPAT_KERJA_OPTIONS.slice(0, 8).map((opt, idx) => ({
      key: opt.key,
      name: opt.label.length > 18 ? opt.label.substring(0, 16) + "..." : opt.label,
      color: ["#f97316", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#6366f1", "#14b8a6"][idx % 8],
      filter: (s: any) => s.caraMendapatKerja?.includes(opt.key),
    })),
  },
  jenisInstansi: {
    title: "Perbandingan Jenis Instansi per Prodi",
    description: "Distribusi jenis instansi tempat alumni bekerja",
    getCategories: () => JENIS_INSTANSI_OPTIONS.map((opt, idx) => ({
      key: opt.replace(/[^a-zA-Z]/g, '').toLowerCase(),
      name: opt.length > 20 ? opt.substring(0, 18) + "..." : opt,
      color: ["#0ea5e9", "#8b5cf6", "#f97316", "#10b981", "#f59e0b", "#ec4899", "#6b7280"][idx % 7],
      filter: (s: any) => s.jenisInstansi === opt,
    })),
  },
};

// Satisfaction indicators for kepuasan chart
const SATISFACTION_INDICATORS = [
  { key: "etika", name: "Etika" },
  { key: "kompetensi", name: "Keahlian Bidang Ilmu" },
  { key: "bahasa", name: "Kemampuan Bahasa Asing" },
  { key: "ti", name: "Penggunaan TI" },
  { key: "komunikasi", name: "Kemampuan Komunikasi" },
  { key: "kerjasama", name: "Kerjasama" },
  { key: "pengembangan", name: "Pengembangan Diri" },
];

// Trend categories based on indicator type
// isPositive: true = high value is good, false = low value is good
const TREND_CATEGORIES: Record<string, { key: string; name: string; filter: (s: any) => boolean; isPositive: boolean }[]> = {
  kesesuaian: [
    { key: "sesuai", name: "Sesuai", filter: (s: any) => s.kesesuaianBidang === "Sangat Erat" || s.kesesuaianBidang === "Erat", isPositive: true },
    { key: "cukup", name: "Cukup Sesuai", filter: (s: any) => s.kesesuaianBidang === "Cukup Erat", isPositive: true },
    { key: "tidak", name: "Tidak Sesuai", filter: (s: any) => s.kesesuaianBidang === "Kurang Erat" || s.kesesuaianBidang === "Tidak Sesuai", isPositive: false },
  ],
  jenisPerusahaan: [
    { key: "lokal", name: "Lokal", filter: (s: any) => s.kategoriPerusahaan === "Lokal/Tidak BBH", isPositive: true },
    { key: "nasional", name: "Nasional", filter: (s: any) => s.kategoriPerusahaan === "Nasional/BBH", isPositive: true },
    { key: "multinasional", name: "Multinasional", filter: (s: any) => s.kategoriPerusahaan === "Multinasional", isPositive: true },
  ],
  gaji: [
    { key: "tinggi", name: "Tinggi (>7jt)", filter: (s: any) => s.gaji > 7000000, isPositive: true },
    { key: "sedang", name: "Sedang (4-7jt)", filter: (s: any) => s.gaji >= 4000000 && s.gaji <= 7000000, isPositive: true },
    { key: "rendah", name: "Rendah (<4jt)", filter: (s: any) => s.gaji > 0 && s.gaji < 4000000, isPositive: false },
  ],
  status: [
    { key: "bekerja", name: "Bekerja", filter: (s: any) => s.status === "Bekerja Full-time" || s.status === "Bekerja Part-time", isPositive: true },
    { key: "wiraswasta", name: "Wiraswasta", filter: (s: any) => s.status === "Wiraswasta", isPositive: true },
    { key: "studiLanjut", name: "Studi Lanjut", filter: (s: any) => s.status === "Studi Lanjut", isPositive: true },
    { key: "mencariKerja", name: "Mencari Kerja", filter: (s: any) => s.status === "Mencari Kerja", isPositive: false },
  ],
};

const YEARS = ["2020", "2021", "2022", "2023", "2024"];

// Color helper for heatmap - considers whether high or low values are desirable
const getHeatmapColor = (value: number, isPositive: boolean = true) => {
  // If isPositive is false (low value is good), invert the logic
  const effectiveValue = isPositive ? value : (100 - value);
  
  if (effectiveValue >= 80) return "hsl(142, 70%, 45%)"; // Green
  if (effectiveValue >= 60) return "hsl(80, 60%, 45%)"; // Yellow-green
  if (effectiveValue >= 40) return "hsl(40, 80%, 50%)"; // Amber
  if (effectiveValue >= 20) return "hsl(20, 70%, 45%)"; // Orange
  return "hsl(0, 65%, 40%)"; // Red
};

const ComparePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const chartType = searchParams.get("type") || "gender";
  const prodiParam = searchParams.get("prodi") || "";
  const indicatorParam = searchParams.get("indicator") || "kesesuaian"; // For trend type
  const selectedProdi = prodiParam ? prodiParam.split(",") : [];
  
  // State for trend heatmap - only category filter, indicator comes from URL param
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  // State for kepuasan indicator filter
  const [selectedKepuasanIndicator, setSelectedKepuasanIndicator] = useState(SATISFACTION_INDICATORS[0].key);

  // State for modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ 
    title: string; 
    students: Student[];
    segments: { key: string; name: string }[];
    selectedSegment: string;
  }>({ title: "", students: [], segments: [], selectedSegment: "all" });

  const isTrendType = chartType === "trend";
  const isKepuasanType = chartType === "kepuasan";
  const config = isTrendType ? null : (CHART_CONFIGS[chartType] || CHART_CONFIGS.gender);
  const categories = config ? config.getCategories() : [];

  // Get trend categories based on indicator from URL
  const trendCategories = TREND_CATEGORIES[indicatorParam] || TREND_CATEGORIES.kesesuaian;
  
  // Set default category on mount
  useMemo(() => {
    if (isTrendType && !selectedCategory && trendCategories.length > 0) {
      setSelectedCategory(trendCategories[0].key);
    }
  }, [isTrendType, trendCategories, selectedCategory]);

  const currentTrendCategory = trendCategories.find(c => c.key === selectedCategory) || trendCategories[0];

  // Generate comparison data for standard charts (stacked bar = 100%)
  const chartData = useMemo(() => {
    if (isTrendType) return [];
    
    return selectedProdi.map(prodiName => {
      const prodiStudents = MOCK_STUDENTS.filter(s => s.prodi === prodiName);
      const total = prodiStudents.length || 1;
      
      const dataPoint: Record<string, any> = {
        prodi: prodiName.length > 25 ? prodiName.substring(0, 23) + "..." : prodiName,
        fullProdi: prodiName,
        total: prodiStudents.length,
      };

      // For kepuasan, use selected indicator's mock data
      if (isKepuasanType) {
        const sangatBaik = Math.floor(Math.random() * 35 + 25);
        const baik = Math.floor(Math.random() * 25 + 20);
        const cukup = Math.floor(Math.random() * 15 + 10);
        const kurang = Math.max(0, 100 - sangatBaik - baik - cukup);
        
        dataPoint.sangatBaik = sangatBaik;
        dataPoint.baik = baik;
        dataPoint.cukup = cukup;
        dataPoint.kurang = kurang;
        
        // Store counts for tooltip/modal
        dataPoint.sangatBaikCount = Math.floor(total * sangatBaik / 100);
        dataPoint.baikCount = Math.floor(total * baik / 100);
        dataPoint.cukupCount = Math.floor(total * cukup / 100);
        dataPoint.kurangCount = Math.floor(total * kurang / 100);
      } else {
        // Calculate percentages that add up to 100%
        const counts: Record<string, number> = {};
        let totalCounted = 0;
        
        categories.forEach(cat => {
          const count = prodiStudents.filter(cat.filter).length;
          counts[cat.key] = count;
          totalCounted += count;
        });

        // Convert to percentages
        categories.forEach(cat => {
          const percentage = totalCounted > 0 ? ((counts[cat.key] / totalCounted) * 100) : 0;
          dataPoint[cat.key] = parseFloat(percentage.toFixed(1));
          dataPoint[`${cat.key}Count`] = counts[cat.key];
        });
      }

      return dataPoint;
    });
  }, [selectedProdi, chartType, categories, isTrendType, isKepuasanType]);

  // Generate heatmap data for trend
  const heatmapData = useMemo(() => {
    if (!isTrendType) return [];
    
    return selectedProdi.map(prodiName => {
      const row: Record<string, any> = { prodi: prodiName };
      
      YEARS.forEach(year => {
        const yearNum = parseInt(year);
        const yearProdiStudents = MOCK_STUDENTS.filter(s => 
          s.prodi === prodiName && s.tahunLulus === yearNum
        );
        const total = yearProdiStudents.length || 1;
        const count = yearProdiStudents.filter(currentTrendCategory?.filter || (() => false)).length;
        row[year] = ((count / total) * 100).toFixed(1);
        row[`${year}Count`] = count;
        row[`${year}Total`] = yearProdiStudents.length;
      });
      
      return row;
    });
  }, [selectedProdi, isTrendType, currentTrendCategory]);

  // Handle bar click for modal
  const handleBarClick = (data: any, categoryKey: string) => {
    const prodiName = data.fullProdi || data.prodi;
    const cat = categories.find(c => c.key === categoryKey);
    if (!cat) return;

    const prodiStudents = MOCK_STUDENTS.filter(s => s.prodi === prodiName);
    const filtered = prodiStudents.filter(cat.filter);

    // Build segments list
    const segments = categories.map(c => ({ key: c.key, name: c.name }));

    setModalData({
      title: `${prodiName} - ${cat.name}`,
      students: filtered,
      segments,
      selectedSegment: categoryKey,
    });
    setModalOpen(true);
  };

  // Handle segment filter change in modal
  const handleSegmentChange = (segmentKey: string) => {
    if (segmentKey === modalData.selectedSegment) return;
    
    const prodiName = modalData.title.split(" - ")[0];
    const prodiStudents = MOCK_STUDENTS.filter(s => s.prodi === prodiName);
    
    let filtered: Student[];
    let segmentName: string;
    
    if (segmentKey === "all") {
      filtered = prodiStudents;
      segmentName = "Semua";
    } else {
      const cat = categories.find(c => c.key === segmentKey);
      if (!cat) return;
      filtered = prodiStudents.filter(cat.filter);
      segmentName = cat.name;
    }

    setModalData(prev => ({
      ...prev,
      students: filtered,
      selectedSegment: segmentKey,
      title: `${prodiName} - ${segmentName}`,
    }));
  };

  // Calculate chart height based on number of prodi
  const chartHeight = Math.max(400, selectedProdi.length * 40);

  // Get indicator label for trend
  const getIndicatorLabel = () => {
    switch (indicatorParam) {
      case "kesesuaian": return "Kesesuaian Bidang";
      case "jenisPerusahaan": return "Jenis Perusahaan";
      case "gaji": return "Rentang Gaji";
      case "status": return "Status Penerimaan Kerja";
      default: return "Kesesuaian Bidang";
    }
  };

  // Calculate segment stats for modal
  const getSegmentStats = () => {
    if (!modalOpen || categories.length === 0) return [];
    
    const prodiName = modalData.title.split(" - ")[0];
    const prodiStudents = MOCK_STUDENTS.filter(s => s.prodi === prodiName);
    const total = prodiStudents.length;
    
    return categories.map(cat => {
      const count = prodiStudents.filter(cat.filter).length;
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0";
      return { name: cat.name, count, percentage };
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold">
              {isTrendType ? `Heatmap Trend ${getIndicatorLabel()} per Prodi` : config?.title}
            </h1>
            <p className="text-muted-foreground">
              {isTrendType ? "Visualisasi persentase indikator per prodi per tahun" : config?.description}
            </p>
          </div>
        </div>

        {/* Selected Prodi Info */}
        <div className="flex flex-wrap gap-2">
          {selectedProdi.slice(0, 10).map(prodi => (
            <span key={prodi} className="px-3 py-1 bg-primary/20 text-primary rounded-full text-sm">
              {prodi}
            </span>
          ))}
          {selectedProdi.length > 10 && (
            <span className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm">
              +{selectedProdi.length - 10} lainnya
            </span>
          )}
        </div>

        {/* Trend Heatmap View */}
        {isTrendType && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            {/* Single filter for categories */}
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px] bg-secondary/50">
                  <SelectValue placeholder="Pilih Kategori" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-50">
                  {trendCategories.map(cat => (
                    <SelectItem key={cat.key} value={cat.key}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <UITooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-card border-border">
                  <p className="text-sm">
                    Heatmap menunjukkan persentase {currentTrendCategory?.name || ""} per prodi per tahun. 
                    {currentTrendCategory?.isPositive 
                      ? " Warna hijau menunjukkan persentase tinggi (baik), merah menunjukkan rendah."
                      : " Warna hijau menunjukkan persentase rendah (baik), merah menunjukkan tinggi."}
                  </p>
                </TooltipContent>
              </UITooltip>
            </div>

            {/* Color Legend */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs text-muted-foreground">
                {currentTrendCategory?.isPositive ? "Rendah → Tinggi:" : "Tinggi → Rendah:"}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">{currentTrendCategory?.isPositive ? "0%" : "100%"}</span>
                <div className="flex h-5 rounded overflow-hidden border border-border/30">
                  {[0, 20, 40, 60, 80, 100].map((val, idx) => (
                    <div 
                      key={idx}
                      className="w-8 h-full"
                      style={{ backgroundColor: getHeatmapColor(val, currentTrendCategory?.isPositive ?? true) }}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">{currentTrendCategory?.isPositive ? "100%" : "0%"}</span>
              </div>
            </div>

            {/* Heatmap Grid */}
            <div className="overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-border">
              <div className="min-w-[500px]">
                {/* Header Row */}
                <div className="flex sticky top-0 bg-card z-10">
                  <div className="w-48 flex-shrink-0 px-2 py-2 font-medium text-sm text-muted-foreground">
                    Program Studi
                  </div>
                  {YEARS.map(year => (
                    <div key={year} className="flex-1 min-w-[80px] px-2 py-2 text-center">
                      <span className="text-sm font-medium">{year}</span>
                    </div>
                  ))}
                </div>

                {/* Data Rows */}
                <div className="flex flex-col gap-1">
                  {heatmapData.map((row) => (
                    <div key={row.prodi} className="flex gap-1">
                      <div className="w-48 flex-shrink-0 px-2 py-3 flex items-center bg-secondary/20 rounded-l-md">
                        <span className="text-xs font-medium truncate">{row.prodi}</span>
                      </div>
                      {YEARS.map((year, idx) => {
                        const value = parseFloat(row[year]) || 0;
                        const isLast = idx === YEARS.length - 1;
                        return (
                          <UITooltip key={year}>
                            <TooltipTrigger asChild>
                              <div 
                                className={`flex-1 min-w-[80px] h-12 flex items-center justify-center transition-all hover:scale-[1.02] ${isLast ? 'rounded-r-md' : ''}`}
                                style={{ backgroundColor: getHeatmapColor(value, currentTrendCategory?.isPositive ?? true) }}
                              >
                                <span className="text-xs font-bold text-white drop-shadow-md">{value.toFixed(0)}%</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-card border-border p-3">
                              <p className="font-semibold text-sm">{row.prodi}</p>
                              <p className="text-sm text-primary">Tahun {year}: <span className="font-bold">{value.toFixed(1)}%</span></p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {row[`${year}Count`]} dari {row[`${year}Total`]} alumni
                              </p>
                              <p className="text-xs text-muted-foreground">Kategori: {currentTrendCategory?.name}</p>
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

        {/* Standard Stacked Bar Chart (horizontal layout: Y = prodi, X = percentage) */}
        {!isTrendType && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            {/* Kepuasan indicator filter */}
            {isKepuasanType && (
              <div className="flex items-center gap-4 mb-6">
                <Select value={selectedKepuasanIndicator} onValueChange={setSelectedKepuasanIndicator}>
                  <SelectTrigger className="w-[220px] bg-secondary/50">
                    <SelectValue placeholder="Pilih Indikator" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    {SATISFACTION_INDICATORS.map(ind => (
                      <SelectItem key={ind.key} value={ind.key}>{ind.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  Menampilkan data: <span className="font-medium text-foreground">
                    {SATISFACTION_INDICATORS.find(i => i.key === selectedKepuasanIndicator)?.name}
                  </span>
                </span>
              </div>
            )}
            
            <div className="overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-border">
              <div style={{ minHeight: `${chartHeight}px` }}>
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 150, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" horizontal={false} />
                    <XAxis 
                      type="number"
                      stroke="hsl(215 20% 55%)" 
                      fontSize={12}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <YAxis 
                      dataKey="prodi" 
                      type="category"
                      stroke="hsl(215 20% 55%)" 
                      fontSize={11}
                      width={140}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(222 47% 11%)",
                        border: "1px solid hsl(217 33% 22%)",
                        borderRadius: "8px",
                      }}
                      content={({ active, payload, label }) => {
                        if (!active || !payload) return null;
                        const data = chartData.find(d => d.prodi === label);
                        return (
                          <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                            <p className="font-semibold text-sm mb-2">{data?.fullProdi || label}</p>
                            <p className="text-xs text-muted-foreground mb-2">Total: {data?.total} alumni</p>
                            {payload.map((entry: any) => {
                              const cat = categories.find(c => c.key === entry.dataKey);
                              const count = data?.[`${entry.dataKey}Count`] || 0;
                              return (
                                <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
                                  {cat?.name}: <span className="font-bold">{entry.value}% ({count} alumni)</span>
                                </p>
                              );
                            })}
                          </div>
                        );
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: "10px" }}
                      formatter={(value) => {
                        const cat = categories.find(c => c.key === value);
                        return <span className="text-sm text-foreground">{cat?.name || value}</span>;
                      }}
                    />
                    {categories.map(cat => (
                      <Bar 
                        key={cat.key}
                        dataKey={cat.key}
                        stackId="a"
                        fill={cat.color}
                        onClick={(data) => handleBarClick(data, cat.key)}
                        style={{ cursor: "pointer" }}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* Summary Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <h3 className="font-heading font-semibold mb-4">Ringkasan Data</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Program Studi</th>
                  {isTrendType ? (
                    YEARS.map(year => <th key={year}>{year}</th>)
                  ) : (
                    <>
                      <th>Total Alumni</th>
                      {categories.map(cat => (
                        <th key={cat.key}>{cat.name}</th>
                      ))}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {isTrendType ? (
                  heatmapData.map(row => (
                    <tr key={row.prodi}>
                      <td className="font-medium">{row.prodi}</td>
                      {YEARS.map(year => (
                        <td key={year}>
                          <span 
                            className="px-2 py-1 rounded text-xs font-medium text-white"
                            style={{ backgroundColor: getHeatmapColor(parseFloat(row[year]), currentTrendCategory?.isPositive ?? true) }}
                          >
                            {row[year]}%
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  chartData.map(row => (
                    <tr key={row.fullProdi}>
                      <td className="font-medium">{row.fullProdi}</td>
                      <td>{row.total}</td>
                      {categories.map(cat => (
                        <td key={cat.key}>
                          <span 
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                          >
                            {row[cat.key]}% ({row[`${cat.key}Count`]})
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Student Data Modal with Segment Filter */}
        <StudentDataModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={modalData.title}
          subtitle={
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Filter segmen:</span>
                <Select 
                  value={modalData.selectedSegment} 
                  onValueChange={handleSegmentChange}
                >
                  <SelectTrigger className="w-[160px] h-8 text-sm bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-[10000]">
                    <SelectItem value="all">Semua</SelectItem>
                    {modalData.segments.map(seg => (
                      <SelectItem key={seg.key} value={seg.key}>{seg.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                {getSegmentStats().map(stat => (
                  <span key={stat.name} className="text-xs bg-secondary/50 px-2 py-1 rounded">
                    {stat.name}: {stat.count} ({stat.percentage}%)
                  </span>
                ))}
              </div>
            </div>
          }
          students={modalData.students}
          columns={[
            { key: "prodi", label: "Prodi" },
            { key: "status", label: "Status" },
          ]}
        />
      </div>
    </DashboardLayout>
  );
};

export default ComparePage;