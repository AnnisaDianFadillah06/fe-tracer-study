import { useState } from "react";
import { motion } from "framer-motion";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend,
  Cell,
} from "recharts";
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

interface ClusteringWaitTimeChartProps {
  showProdiFilter?: boolean;
  filters?: { prodi?: string; jenjang?: string; tahun?: string };
}

const ClusteringWaitTimeChart = ({ 
  showProdiFilter = true,
  filters = {} 
}: ClusteringWaitTimeChartProps) => {
  const [selectedProdi, setSelectedProdi] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; students: Student[] }>({ title: "", students: [] });

  // Generate cluster data based on selected prodi
  const generateClusterData = () => {
    const prodis = selectedProdi.length > 0 ? selectedProdi : [...new Set(PRODI_LIST.map(p => p.name))];
    const colors = ["#10b981", "#f59e0b", "#ef4444"];
    
    const clusters = {
      clusterA: [] as any[], // < 3 months
      clusterB: [] as any[], // 3-6 months
      clusterC: [] as any[], // > 6 months
    };

    prodis.forEach(prodi => {
      const prodiStudents = MOCK_STUDENTS.filter(s => s.prodi === prodi);
      const avgWait = prodiStudents.reduce((a, s) => a + s.waktuTunggu, 0) / prodiStudents.length || 0;
      const employed = prodiStudents.filter(s => s.status === "Bekerja" || s.status === "Wiraswasta").length;
      const employRate = (employed / prodiStudents.length) * 100 || 0;

      const point = {
        x: avgWait,
        y: employRate,
        z: prodiStudents.length,
        name: prodi,
      };

      if (avgWait < 3) {
        clusters.clusterA.push(point);
      } else if (avgWait < 6) {
        clusters.clusterB.push(point);
      } else {
        clusters.clusterC.push(point);
      }
    });

    return clusters;
  };

  const clusterData = generateClusterData();

  const handleScatterClick = (data: any, cluster: string) => {
    const prodiName = data.name;
    const clusterLabel = cluster === "clusterA" ? "Cepat" : cluster === "clusterB" ? "Sedang" : "Lama";
    
    const filtered = getFilteredStudents(MOCK_STUDENTS, {
      prodi: [prodiName],
      jenjang: filters.jenjang && filters.jenjang !== "all" ? [filters.jenjang] : undefined,
      tahunLulus: filters.tahun && filters.tahun !== "all" ? [parseInt(filters.tahun)] : undefined,
    });

    setModalData({
      title: `Cluster ${clusterLabel}: ${prodiName}`,
      students: filtered,
    });
    setModalOpen(true);
  };

  const columns = CLUSTER_DOMAINS["wait-time"].columns;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="chart-container"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold">Clustering: Pola Masa Tunggu</h3>
          <UITooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-card border-border">
              <p className="text-sm">
                Visualisasi K-Means clustering berdasarkan waktu tunggu kerja (bulan) 
                dan tingkat keberhasilan mendapat pekerjaan (%). Ukuran bubble menunjukkan jumlah alumni.
              </p>
              <div className="mt-2 pt-2 border-t border-border text-xs">
                <p><strong>Indikator:</strong> Waktu Tunggu, Mulai Cari Kerja, Status Aktif Mencari</p>
              </div>
            </TooltipContent>
          </UITooltip>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">K = 3</div>
          {showProdiFilter && (
            <ChartProdiFilter
              selectedProdi={selectedProdi}
              onChange={setSelectedProdi}
              showLamInfo={true}
            />
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" />
          <XAxis
            type="number"
            dataKey="x"
            name="Waktu Tunggu"
            unit=" bln"
            stroke="hsl(215 20% 55%)"
            fontSize={12}
            label={{ value: "Waktu Tunggu (Bulan)", position: "bottom", fill: "hsl(215 20% 55%)" }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Tingkat Kerja"
            unit="%"
            stroke="hsl(215 20% 55%)"
            fontSize={12}
            label={{ value: "Tingkat Kerja (%)", angle: -90, position: "insideLeft", fill: "hsl(215 20% 55%)" }}
          />
          <ZAxis type="number" dataKey="z" range={[50, 400]} name="Jumlah Alumni" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{
              backgroundColor: "hsl(222 47% 11%)",
              border: "1px solid hsl(217 33% 22%)",
              borderRadius: "8px",
            }}
            content={({ payload }) => {
              if (!payload || !payload[0]) return null;
              const data = payload[0].payload;
              return (
                <div className="p-3 bg-card border border-border rounded-lg">
                  <p className="font-semibold text-foreground">{data.name}</p>
                  <p className="text-sm text-muted-foreground">Waktu Tunggu: {data.x.toFixed(1)} bulan</p>
                  <p className="text-sm text-muted-foreground">Tingkat Kerja: {data.y.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Alumni: {data.z} orang</p>
                  <p className="text-xs text-primary mt-1">Klik untuk detail</p>
                </div>
              );
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
          />
          <Scatter 
            name="Cepat (< 3 bln)" 
            data={clusterData.clusterA} 
            fill="#10b981"
            onClick={(data) => handleScatterClick(data, "clusterA")}
            style={{ cursor: "pointer" }}
          />
          <Scatter 
            name="Sedang (3-6 bln)" 
            data={clusterData.clusterB} 
            fill="#f59e0b"
            onClick={(data) => handleScatterClick(data, "clusterB")}
            style={{ cursor: "pointer" }}
          />
          <Scatter 
            name="Lama (> 6 bln)" 
            data={clusterData.clusterC} 
            fill="#ef4444"
            onClick={(data) => handleScatterClick(data, "clusterC")}
            style={{ cursor: "pointer" }}
          />
        </ScatterChart>
      </ResponsiveContainer>

      <StudentDataModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        subtitle="Indikator: Waktu Tunggu, Mulai Cari Kerja, Status Aktif"
        students={modalData.students}
        columns={columns}
      />
    </motion.div>
  );
};

export default ClusteringWaitTimeChart;
