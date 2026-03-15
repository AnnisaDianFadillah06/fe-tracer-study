import { useState } from "react";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
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

interface ClusteringCareerChartProps {
  showProdiFilter?: boolean;
  filters?: { prodi?: string; jenjang?: string; tahun?: string };
}

const ClusteringCareerChart = ({ 
  showProdiFilter = true,
  filters = {} 
}: ClusteringCareerChartProps) => {
  const [selectedProdi, setSelectedProdi] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; students: Student[] }>({ title: "", students: [] });

  const colors = ["#f97316", "#0ea5e9", "#10b981", "#8b5cf6", "#ec4899"];

  // Generate radar data for selected prodis
  const generateRadarData = () => {
    const prodis = selectedProdi.length > 0 
      ? selectedProdi 
      : [...new Set(PRODI_LIST.map(p => p.name))].slice(0, 3);

    const skills = ["Pendapatan", "Level Jabatan", "Perusahaan Besar", "Stabilitas", "Benefit", "Work-Life"];

    return skills.map(skill => {
      const dataPoint: Record<string, any> = { skill };
      
      prodis.forEach((prodi, idx) => {
        const prodiStudents = MOCK_STUDENTS.filter(s => s.prodi === prodi && s.gaji > 0);
        
        let value = 50;
        switch (skill) {
          case "Pendapatan":
            const avgGaji = prodiStudents.reduce((a, s) => a + s.gaji, 0) / prodiStudents.length || 0;
            value = Math.min(100, (avgGaji / 10000000) * 100);
            break;
          case "Level Jabatan":
            const seniorCount = prodiStudents.filter(s => 
              s.levelJabatan === "Senior" || s.levelJabatan === "Manager" || s.levelJabatan === "Supervisor"
            ).length;
            value = (seniorCount / prodiStudents.length) * 100 || 0;
            break;
          case "Perusahaan Besar":
            const bigCompany = prodiStudents.filter(s => 
              s.jenisPerusahaan === "Multinasional" || s.jenisPerusahaan === "BUMN/BUMD"
            ).length;
            value = (bigCompany / prodiStudents.length) * 100 || 0;
            break;
          case "Stabilitas":
            const stable = prodiStudents.filter(s => s.status === "Bekerja").length;
            value = (stable / prodiStudents.length) * 100 || 0;
            break;
          case "Benefit":
            value = Math.floor(Math.random() * 30) + 50; // Simulated
            break;
          case "Work-Life":
            value = Math.floor(Math.random() * 30) + 50; // Simulated
            break;
        }
        
        dataPoint[prodi] = Math.round(value);
      });

      return dataPoint;
    });
  };

  const radarData = generateRadarData();
  const displayProdis = selectedProdi.length > 0 
    ? selectedProdi 
    : [...new Set(PRODI_LIST.map(p => p.name))].slice(0, 3);

  const handleRadarClick = (prodi: string) => {
    const filtered = getFilteredStudents(MOCK_STUDENTS, {
      prodi: [prodi],
      jenjang: filters.jenjang && filters.jenjang !== "all" ? [filters.jenjang] : undefined,
      tahunLulus: filters.tahun && filters.tahun !== "all" ? [parseInt(filters.tahun)] : undefined,
    });

    setModalData({
      title: `Profil Karier: ${prodi}`,
      students: filtered.filter(s => s.gaji > 0),
    });
    setModalOpen(true);
  };

  const columns = CLUSTER_DOMAINS["career-profile"].columns;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="chart-container"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold">Clustering: Profil Karier</h3>
          <UITooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-card border-border">
              <p className="text-sm">
                Radar chart menampilkan profil karier per prodi berdasarkan pendapatan, 
                level jabatan, tipe perusahaan, dan aspek lainnya.
              </p>
              <div className="mt-2 pt-2 border-t border-border text-xs">
                <p><strong>Indikator:</strong> Jenis Perusahaan, Level Jabatan, Gaji, Lokasi</p>
              </div>
            </TooltipContent>
          </UITooltip>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">{displayProdis.length} Prodi</div>
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
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
          <PolarGrid stroke="hsl(217 33% 22%)" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: "hsl(215 20% 55%)", fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fill: "hsl(215 20% 55%)", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 11%)",
              border: "1px solid hsl(217 33% 22%)",
              borderRadius: "8px",
            }}
          />
          {displayProdis.map((prodi, idx) => (
            <Radar
              key={prodi}
              name={prodi}
              dataKey={prodi}
              stroke={colors[idx % colors.length]}
              fill={colors[idx % colors.length]}
              fillOpacity={0.2}
              onClick={() => handleRadarClick(prodi)}
              style={{ cursor: "pointer" }}
            />
          ))}
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            formatter={(value) => (
              <span 
                className="text-xs text-foreground cursor-pointer hover:text-primary"
                onClick={() => handleRadarClick(value)}
              >
                {value}
              </span>
            )}
          />
        </RadarChart>
      </ResponsiveContainer>

      <StudentDataModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        subtitle="Indikator: Jenis Perusahaan, Level Jabatan, Gaji, Lokasi"
        students={modalData.students}
        columns={columns}
      />
    </motion.div>
  );
};

export default ClusteringCareerChart;
