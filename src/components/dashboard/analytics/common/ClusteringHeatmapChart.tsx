import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChartProdiFilter } from "@/components/dashboard/DashboardFilters";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { 
  MOCK_STUDENTS, 
  getFilteredStudents, 
  CLUSTER_DOMAINS,
  PRODI_LIST,
  Student 
} from "@/lib/mockData";

interface ClusteringHeatmapChartProps {
  domain: string;
  showProdiFilter?: boolean;
  filters?: { prodi?: string; jenjang?: string; tahun?: string };
}

// Cluster definitions with semantic color meaning
const CLUSTER_CONFIGS: Record<string, { 
  clusters: { name: string; key: string; color: string; filter: (s: Student) => boolean }[];
  title: string;
  colorType: "evaluative" | "distributive"; // evaluative = quality-based, distributive = count-based
}> = {
  "wait-time": {
    title: "Heatmap Distribusi Cluster Masa Tunggu Alumni per Prodi",
    colorType: "evaluative",
    clusters: [
      { name: "Cepat (<3 bln)", key: "cepat", color: "#10b981", filter: (s) => s.waktuTunggu < 3 },
      { name: "Sedang (3-6 bln)", key: "sedang", color: "#f59e0b", filter: (s) => s.waktuTunggu >= 3 && s.waktuTunggu <= 6 },
      { name: "Lama (>6 bln)", key: "lama", color: "#ef4444", filter: (s) => s.waktuTunggu > 6 },
    ]
  },
  "career-profile": {
    title: "Heatmap Distribusi Cluster Profil Karier per Prodi",
    colorType: "distributive",
    clusters: [
      { name: "Corporate (Gaji Tinggi)", key: "corporate", color: "#10b981", filter: (s) => s.gaji > 7000000 },
      { name: "Mid-Level", key: "midlevel", color: "#f59e0b", filter: (s) => s.gaji >= 4000000 && s.gaji <= 7000000 },
      { name: "Entry/UMKM", key: "entry", color: "#ef4444", filter: (s) => s.gaji < 4000000 && s.gaji > 0 },
    ]
  },
  "field-relevance": {
    title: "Heatmap Distribusi Cluster Kesesuaian Bidang per Prodi",
    colorType: "evaluative",
    clusters: [
      { name: "Sangat Relevan", key: "relevan", color: "#10b981", filter: (s) => s.kesesuaianBidang === "Sangat Erat" || s.kesesuaianBidang === "Erat" },
      { name: "Cukup Relevan", key: "cukup", color: "#f59e0b", filter: (s) => s.kesesuaianBidang === "Cukup Erat" },
      { name: "Tidak Relevan", key: "tidakRelevan", color: "#ef4444", filter: (s) => s.kesesuaianBidang === "Kurang Erat" || s.kesesuaianBidang === "Tidak Sesuai" },
    ]
  },
  "job-search": {
    title: "Heatmap Distribusi Cluster Strategi Cari Kerja per Prodi",
    colorType: "distributive",
    clusters: [
      { name: "High Effort (>20 lamaran)", key: "high", color: "#10b981", filter: (s) => s.jumlahLamaran > 20 },
      { name: "Medium (10-20)", key: "medium", color: "#f59e0b", filter: (s) => s.jumlahLamaran >= 10 && s.jumlahLamaran <= 20 },
      { name: "Low (<10)", key: "low", color: "#ef4444", filter: (s) => s.jumlahLamaran < 10 },
    ]
  },
  "entrepreneurship": {
    title: "Heatmap Distribusi Cluster Wirausaha per Prodi",
    colorType: "evaluative",
    clusters: [
      { name: "Pendapatan Tinggi", key: "tinggi", color: "#10b981", filter: (s) => s.status === "Wiraswasta" && s.gaji > 6000000 },
      { name: "Pendapatan Sedang", key: "sedang", color: "#f59e0b", filter: (s) => s.status === "Wiraswasta" && s.gaji >= 3000000 && s.gaji <= 6000000 },
      { name: "Pendapatan Rendah", key: "rendah", color: "#ef4444", filter: (s) => s.status === "Wiraswasta" && s.gaji < 3000000 },
    ]
  },
  "funding": {
    title: "Heatmap Distribusi Cluster Pembiayaan per Prodi",
    colorType: "distributive",
    clusters: [
      { name: "Beasiswa", key: "beasiswa", color: "#10b981", filter: (s) => s.sumberPembiayaan.includes("Beasiswa") },
      { name: "Mandiri", key: "mandiri", color: "#0ea5e9", filter: (s) => s.sumberPembiayaan === "Mandiri" },
      { name: "Campuran/Lainnya", key: "lainnya", color: "#8b5cf6", filter: (s) => s.sumberPembiayaan === "Campuran" || s.sumberPembiayaan === "Bantuan Perusahaan" },
    ]
  },
  "competency": {
    title: "Heatmap Distribusi Cluster Kompetensi per Prodi",
    colorType: "evaluative",
    clusters: [
      { name: "High Skill (>80)", key: "high", color: "#10b981", filter: (s) => ((s.skorPengetahuan + s.skorTI + s.skorKomunikasi) / 3) > 80 },
      { name: "Medium (60-80)", key: "medium", color: "#f59e0b", filter: (s) => { const avg = (s.skorPengetahuan + s.skorTI + s.skorKomunikasi) / 3; return avg >= 60 && avg <= 80; }},
      { name: "Low (<60)", key: "low", color: "#ef4444", filter: (s) => ((s.skorPengetahuan + s.skorTI + s.skorKomunikasi) / 3) < 60 },
    ]
  },
  "learning": {
    title: "Heatmap Distribusi Cluster Pembelajaran per Prodi",
    colorType: "distributive",
    clusters: [
      { name: "Praktikum Dominan", key: "praktikum", color: "#10b981", filter: (s) => s.metodePraktikum >= 4 },
      { name: "Magang Dominan", key: "magang", color: "#0ea5e9", filter: (s) => s.metodeMagang >= 4 },
      { name: "Teori Dominan", key: "teori", color: "#f59e0b", filter: (s) => s.metodePerkuliahan >= 4 && s.metodePraktikum < 4 && s.metodeMagang < 4 },
    ]
  },
};

const ClusteringHeatmapChart = ({ 
  domain, 
  showProdiFilter = true,
  filters = {} 
}: ClusteringHeatmapChartProps) => {
  const [selectedProdi, setSelectedProdi] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; students: Student[]; clusterName: string }>({ 
    title: "", 
    students: [],
    clusterName: "" 
  });

  const config = CLUSTER_CONFIGS[domain] || CLUSTER_CONFIGS["wait-time"];

  // Generate heatmap data
  const { heatmapData, maxValue, prodiNames } = useMemo(() => {
    const prodis = selectedProdi.length > 0 
      ? selectedProdi 
      : [...new Set(PRODI_LIST.map(p => p.name))].slice(0, 10);

    let max = 0;
    const data = prodis.map(prodiName => {
      const prodiStudents = MOCK_STUDENTS.filter(s => s.prodi === prodiName);
      const prodiInfo = PRODI_LIST.find(p => p.name === prodiName);
      
      const row: Record<string, any> = {
        prodi: prodiName,
        lam: prodiInfo?.lam,
        threshold: prodiInfo?.threshold,
        total: prodiStudents.length,
      };

      config.clusters.forEach(cluster => {
        const count = prodiStudents.filter(cluster.filter).length;
        row[cluster.key] = count;
        if (count > max) max = count;
      });

      return row;
    });

    return { heatmapData: data, maxValue: max, prodiNames: prodis };
  }, [selectedProdi, domain, config]);

  const handleCellClick = (prodiName: string, clusterKey: string) => {
    const cluster = config.clusters.find(c => c.key === clusterKey);
    if (!cluster) return;

    const filtered = getFilteredStudents(MOCK_STUDENTS, {
      prodi: [prodiName],
      jenjang: filters.jenjang && filters.jenjang !== "all" ? [filters.jenjang] : undefined,
      tahunLulus: filters.tahun && filters.tahun !== "all" ? [parseInt(filters.tahun)] : undefined,
    }).filter(cluster.filter);

    setModalData({
      title: `${cluster.name} - ${prodiName}`,
      students: filtered,
      clusterName: cluster.name,
    });
    setModalOpen(true);
  };

  // Get color for a cell based on cluster and value
  const getCellColor = (clusterKey: string, value: number, maxVal: number) => {
    const cluster = config.clusters.find(c => c.key === clusterKey);
    if (!cluster) return "hsl(222, 47%, 15%)";
    
    // Use the cluster's semantic color with opacity based on value
    const ratio = maxVal > 0 ? value / maxVal : 0;
    if (ratio === 0) return "hsl(222, 47%, 15%)";
    
    // Return the cluster's color with varying brightness
    const opacity = 0.3 + (ratio * 0.7); // Range from 0.3 to 1.0
    return cluster.color;
  };

  // Get cell opacity based on value
  const getCellOpacity = (value: number, maxVal: number) => {
    if (value === 0) return 0.15;
    const ratio = maxVal > 0 ? value / maxVal : 0;
    return 0.4 + (ratio * 0.6); // Range from 0.4 to 1.0
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="chart-container"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold text-sm md:text-base">{config.title}</h3>
          <UITooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-card border-border">
              <p className="text-sm">
                {config.colorType === "evaluative" 
                  ? "Warna merepresentasikan nilai kualitas indikator. Hijau = baik, Kuning = sedang, Merah = perlu perhatian."
                  : "Warna merepresentasikan distribusi jumlah alumni per kategori tanpa penilaian kualitas."}
              </p>
            </TooltipContent>
          </UITooltip>
        </div>
        {showProdiFilter && (
          <ChartProdiFilter
            selectedProdi={selectedProdi}
            onChange={setSelectedProdi}
            showLamInfo={true}
          />
        )}
      </div>

      {/* Color Legend - Semantic per cluster */}
      <div className="flex flex-wrap gap-2 mb-4">
        {config.clusters.map(cluster => (
          <div key={cluster.key} className="flex items-center gap-1.5 px-2 py-1 bg-secondary/30 rounded text-xs">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: cluster.color }} />
            <span className="text-muted-foreground">{cluster.name}</span>
          </div>
        ))}
      </div>

      {/* Heatmap Grid - vertical scroll only, no horizontal scroll */}
      <div className="overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div>
          {/* Header Row */}
          <div className="flex sticky top-0 bg-card z-10">
            <div className="w-48 flex-shrink-0" />
            {config.clusters.map(cluster => (
              <div key={cluster.key} className="flex-1 min-w-[100px] px-1 py-2 text-center">
                <span className="text-xs font-medium text-muted-foreground">{cluster.name}</span>
              </div>
            ))}
          </div>

          {/* Data Rows */}
          <div className="flex flex-col gap-1">
            {heatmapData.map((row) => (
              <div key={row.prodi} className="flex gap-1">
                <div className="w-48 flex-shrink-0 px-2 py-2 flex items-center bg-secondary/20 rounded-l-md">
                  <span className="text-xs font-medium truncate">{row.prodi}</span>
                </div>
                {config.clusters.map((cluster, clusterIdx) => {
                  const value = row[cluster.key] || 0;
                  const isLast = clusterIdx === config.clusters.length - 1;
                  return (
                    <UITooltip key={cluster.key}>
                      <TooltipTrigger asChild>
                        <div 
                          className={`flex-1 min-w-[100px] h-12 flex items-center justify-center cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${isLast ? 'rounded-r-md' : ''}`}
                          style={{ 
                            backgroundColor: cluster.color,
                            opacity: getCellOpacity(value, maxValue)
                          }}
                          onClick={() => handleCellClick(row.prodi, cluster.key)}
                        >
                          <span className="text-xs font-bold text-white drop-shadow-md">{value}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-card border-border p-3 z-50">
                        <p className="font-semibold text-sm">Prodi: {row.prodi}</p>
                        <p className="text-sm" style={{ color: cluster.color }}>
                          {cluster.name}: <span className="font-bold">{value} alumni</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Total alumni: {row.total}</p>
                      </TooltipContent>
                    </UITooltip>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-3 italic">
        {config.colorType === "evaluative" 
          ? "* Warna merepresentasikan nilai kualitas indikator"
          : "* Warna merepresentasikan distribusi kategori (tanpa penilaian kualitas)"}
      </p>

      <StudentDataModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        subtitle={`Cluster: ${modalData.clusterName} - Domain: ${CLUSTER_DOMAINS[domain as keyof typeof CLUSTER_DOMAINS]?.name || domain}`}
        students={modalData.students}
        columns={CLUSTER_DOMAINS[domain as keyof typeof CLUSTER_DOMAINS]?.columns || []}
      />
    </motion.div>
  );
};

export default ClusteringHeatmapChart;
