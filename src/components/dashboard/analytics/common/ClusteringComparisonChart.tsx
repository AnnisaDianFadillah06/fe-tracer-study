import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Cell,
} from "recharts";
import { Info, AlertTriangle } from "lucide-react";
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
  LAM_THRESHOLDS,
  PRODI_LIST,
  Student 
} from "@/lib/mockData";

interface ClusteringComparisonChartProps {
  domain: string;
  showProdiFilter?: boolean;
  filters?: { prodi?: string; jenjang?: string; tahun?: string };
}

// Cluster definitions per domain
const CLUSTER_CONFIGS: Record<string, { 
  clusters: { name: string; key: string; color: string; filter: (s: Student) => boolean }[];
  title: string;
  yLabel: string;
  description: string;
}> = {
  "wait-time": {
    title: "Distribusi Cluster Masa Tunggu per Prodi",
    yLabel: "Jumlah Alumni",
    description: "Distribusi alumni berdasarkan kecepatan mendapat pekerjaan",
    clusters: [
      { name: "Cepat (<3 bln)", key: "cepat", color: "#10b981", filter: (s) => s.waktuTunggu < 3 },
      { name: "Sedang (3-6 bln)", key: "sedang", color: "#f59e0b", filter: (s) => s.waktuTunggu >= 3 && s.waktuTunggu <= 6 },
      { name: "Lama (>6 bln)", key: "lama", color: "#ef4444", filter: (s) => s.waktuTunggu > 6 },
    ]
  },
  "career-profile": {
    title: "Distribusi Cluster Profil Karier per Prodi",
    yLabel: "Jumlah Alumni",
    description: "Distribusi alumni berdasarkan tipe karier dan level jabatan",
    clusters: [
      { name: "Corporate (Gaji Tinggi)", key: "corporate", color: "#f97316", filter: (s) => s.gaji > 7000000 },
      { name: "Mid-Level", key: "midlevel", color: "#0ea5e9", filter: (s) => s.gaji >= 4000000 && s.gaji <= 7000000 },
      { name: "Entry/UMKM", key: "entry", color: "#8b5cf6", filter: (s) => s.gaji < 4000000 && s.gaji > 0 },
    ]
  },
  "field-relevance": {
    title: "Distribusi Cluster Kesesuaian Bidang per Prodi",
    yLabel: "Jumlah Alumni",
    description: "Distribusi alumni berdasarkan relevansi pekerjaan dengan bidang studi",
    clusters: [
      { name: "Sangat Relevan", key: "relevan", color: "#10b981", filter: (s) => s.kesesuaianBidang === "Sangat Erat" || s.kesesuaianBidang === "Erat" },
      { name: "Cukup Relevan", key: "cukup", color: "#f59e0b", filter: (s) => s.kesesuaianBidang === "Cukup Erat" },
      { name: "Tidak Relevan", key: "tidakRelevan", color: "#ef4444", filter: (s) => s.kesesuaianBidang === "Kurang Erat" || s.kesesuaianBidang === "Tidak Sesuai" },
    ]
  },
  "job-search": {
    title: "Distribusi Cluster Strategi Cari Kerja per Prodi",
    yLabel: "Jumlah Alumni",
    description: "Distribusi alumni berdasarkan efektivitas pencarian kerja",
    clusters: [
      { name: "High Effort (>20 lamaran)", key: "high", color: "#10b981", filter: (s) => s.jumlahLamaran > 20 },
      { name: "Medium (10-20)", key: "medium", color: "#f59e0b", filter: (s) => s.jumlahLamaran >= 10 && s.jumlahLamaran <= 20 },
      { name: "Low (<10)", key: "low", color: "#ef4444", filter: (s) => s.jumlahLamaran < 10 },
    ]
  },
  "entrepreneurship": {
    title: "Distribusi Cluster Wirausaha per Prodi",
    yLabel: "Jumlah Alumni",
    description: "Distribusi alumni wirausaha berdasarkan pendapatan",
    clusters: [
      { name: "Pendapatan Tinggi", key: "tinggi", color: "#10b981", filter: (s) => s.status === "Wiraswasta" && s.gaji > 6000000 },
      { name: "Pendapatan Sedang", key: "sedang", color: "#f59e0b", filter: (s) => s.status === "Wiraswasta" && s.gaji >= 3000000 && s.gaji <= 6000000 },
      { name: "Pendapatan Rendah", key: "rendah", color: "#ef4444", filter: (s) => s.status === "Wiraswasta" && s.gaji < 3000000 },
    ]
  },
  "funding": {
    title: "Distribusi Cluster Pembiayaan per Prodi",
    yLabel: "Jumlah Alumni",
    description: "Distribusi alumni berdasarkan sumber pembiayaan kuliah",
    clusters: [
      { name: "Beasiswa", key: "beasiswa", color: "#10b981", filter: (s) => s.sumberPembiayaan.includes("Beasiswa") },
      { name: "Mandiri", key: "mandiri", color: "#0ea5e9", filter: (s) => s.sumberPembiayaan === "Mandiri" },
      { name: "Campuran/Lainnya", key: "lainnya", color: "#8b5cf6", filter: (s) => s.sumberPembiayaan === "Campuran" || s.sumberPembiayaan === "Bantuan Perusahaan" },
    ]
  },
  "competency": {
    title: "Distribusi Cluster Kompetensi per Prodi",
    yLabel: "Jumlah Alumni",
    description: "Distribusi alumni berdasarkan level kompetensi rata-rata",
    clusters: [
      { name: "High Skill (>80)", key: "high", color: "#10b981", filter: (s) => ((s.skorPengetahuan + s.skorTI + s.skorKomunikasi) / 3) > 80 },
      { name: "Medium (60-80)", key: "medium", color: "#f59e0b", filter: (s) => { const avg = (s.skorPengetahuan + s.skorTI + s.skorKomunikasi) / 3; return avg >= 60 && avg <= 80; }},
      { name: "Low (<60)", key: "low", color: "#ef4444", filter: (s) => ((s.skorPengetahuan + s.skorTI + s.skorKomunikasi) / 3) < 60 },
    ]
  },
  "learning": {
    title: "Distribusi Cluster Pembelajaran per Prodi",
    yLabel: "Jumlah Alumni",
    description: "Distribusi alumni berdasarkan intensitas metode pembelajaran",
    clusters: [
      { name: "Praktikum Dominan", key: "praktikum", color: "#10b981", filter: (s) => s.metodePraktikum >= 4 },
      { name: "Magang Dominan", key: "magang", color: "#0ea5e9", filter: (s) => s.metodeMagang >= 4 },
      { name: "Teori Dominan", key: "teori", color: "#f59e0b", filter: (s) => s.metodePerkuliahan >= 4 && s.metodePraktikum < 4 && s.metodeMagang < 4 },
    ]
  },
};

const ClusteringComparisonChart = ({ 
  domain, 
  showProdiFilter = true,
  filters = {} 
}: ClusteringComparisonChartProps) => {
  const [selectedProdi, setSelectedProdi] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; students: Student[]; clusterName: string }>({ 
    title: "", 
    students: [],
    clusterName: "" 
  });

  const config = CLUSTER_CONFIGS[domain] || CLUSTER_CONFIGS["wait-time"];

  // Generate data with clusters per prodi
  const chartData = useMemo(() => {
    const prodiNames = selectedProdi.length > 0 
      ? selectedProdi 
      : [...new Set(PRODI_LIST.map(p => p.name))].slice(0, 8);

    return prodiNames.map(prodiName => {
      const prodiStudents = MOCK_STUDENTS.filter(s => s.prodi === prodiName);
      const prodiInfo = PRODI_LIST.find(p => p.name === prodiName);
      
      const dataPoint: Record<string, any> = {
        prodi: prodiName,
        lam: prodiInfo?.lam,
        threshold: prodiInfo?.threshold,
        total: prodiStudents.length,
      };

      // Count students in each cluster
      config.clusters.forEach(cluster => {
        dataPoint[cluster.key] = prodiStudents.filter(cluster.filter).length;
      });

      return dataPoint;
    });
  }, [selectedProdi, domain, config]);

  // Get unique LAMs in current data
  const lamInfo = useMemo(() => {
    return Object.entries(LAM_THRESHOLDS).map(([lam, info]) => ({
      lam,
      threshold: info.threshold,
      prodis: info.prodi.filter(p => 
        selectedProdi.length === 0 || selectedProdi.includes(p)
      ),
    })).filter(l => l.prodis.length > 0);
  }, [selectedProdi]);

  const handleBarClick = (data: any, clusterKey: string) => {
    const prodiName = data.prodi;
    const cluster = config.clusters.find(c => c.key === clusterKey);
    if (!cluster) return;

    const filtered = getFilteredStudents(MOCK_STUDENTS, {
      prodi: [prodiName],
      jenjang: filters.jenjang && filters.jenjang !== "all" ? [filters.jenjang] : undefined,
      tahunLulus: filters.tahun && filters.tahun !== "all" ? [parseInt(filters.tahun)] : undefined,
    }).filter(cluster.filter);

    const domainColumns = CLUSTER_DOMAINS[domain as keyof typeof CLUSTER_DOMAINS]?.columns || [];
    
    setModalData({
      title: `${cluster.name} - ${prodiName}`,
      students: filtered,
      clusterName: cluster.name,
    });
    setModalOpen(true);
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
              <p className="text-sm">{config.description}</p>
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs font-semibold mb-1">Threshold LAM:</p>
                {lamInfo.map(l => (
                  <p key={l.lam} className="text-xs text-muted-foreground">
                    {l.lam} ({l.threshold}%): {l.prodis.slice(0, 3).join(", ")}{l.prodis.length > 3 ? "..." : ""}
                  </p>
                ))}
              </div>
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

      {/* Cluster Legend */}
      <div className="flex flex-wrap gap-2 mb-3">
        {config.clusters.map(cluster => (
          <div 
            key={cluster.key} 
            className="flex items-center gap-1.5 px-2 py-1 bg-secondary/30 rounded text-xs"
          >
            <span 
              className="w-3 h-3 rounded" 
              style={{ backgroundColor: cluster.color }}
            />
            <span className="text-muted-foreground">{cluster.name}</span>
          </div>
        ))}
      </div>

      {/* LAM Threshold Legend */}
      <div className="flex flex-wrap gap-2 mb-3">
        {lamInfo.map(l => (
          <div 
            key={l.lam} 
            className="flex items-center gap-1 px-2 py-1 bg-secondary/30 rounded text-xs"
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span className="text-muted-foreground">{l.lam}:</span>
            <span className="font-medium">{l.threshold}%</span>
          </div>
        ))}
      </div>

      {/* Scrollable chart container - horizontal scroll for many prodi */}
      <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <div style={{ minWidth: `${Math.max(chartData.length * 100, 600)}px` }}>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" />
              <XAxis 
                dataKey="prodi" 
                stroke="hsl(215 20% 55%)" 
                fontSize={10}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
              />
              <YAxis 
                stroke="hsl(215 20% 55%)" 
                fontSize={12}
                label={{ 
                  value: config.yLabel, 
                  angle: -90, 
                  position: "insideLeft", 
                  fill: "hsl(215 20% 55%)",
                  fontSize: 11
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222 47% 11%)",
                  border: "1px solid hsl(217 33% 22%)",
                  borderRadius: "8px",
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  
                  const prodiData = chartData.find(d => d.prodi === label);
                  const total = prodiData?.total || 0;
                  const threshold = prodiData?.threshold || 0;
                  const lam = prodiData?.lam || "-";
                  
                  // Calculate "good" cluster percentage (first cluster typically is the best)
                  const goodClusterKey = config.clusters[0]?.key;
                  const goodClusterCount = prodiData?.[goodClusterKey] || 0;
                  const goodPercentage = total > 0 ? ((goodClusterCount / total) * 100).toFixed(1) : 0;
                  const meetsThreshold = Number(goodPercentage) >= threshold;

                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-sm mb-2">Prodi: {label}</p>
                      {payload.map((entry: any) => {
                        const cluster = config.clusters.find(c => c.key === entry.dataKey);
                        return (
                          <p key={entry.dataKey} className="text-xs" style={{ color: entry.color }}>
                            {cluster?.name}: <span className="font-bold">{entry.value} alumni</span>
                          </p>
                        );
                      })}
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">LAM: {lam} (threshold {threshold}%)</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs">Status:</span>
                          {meetsThreshold ? (
                            <span className="text-xs text-emerald-400 flex items-center gap-1">
                              ✓ Memenuhi threshold ({goodPercentage}%)
                            </span>
                          ) : (
                            <span className="text-xs text-red-400 flex items-center gap-1">
                              ✗ Belum memenuhi ({goodPercentage}% / {threshold}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: "10px" }}
                formatter={(value) => {
                  const cluster = config.clusters.find(c => c.key === value);
                  return <span className="text-sm text-foreground">{cluster?.name || value}</span>;
                }}
              />
              
              {/* Multiple bars for each cluster */}
              {config.clusters.map((cluster) => (
                <Bar 
                  key={cluster.key}
                  dataKey={cluster.key} 
                  name={cluster.key}
                  fill={cluster.color}
                  radius={[4, 4, 0, 0]}
                  onClick={(data) => handleBarClick(data, cluster.key)}
                  style={{ cursor: "pointer" }}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

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

export default ClusteringComparisonChart;
