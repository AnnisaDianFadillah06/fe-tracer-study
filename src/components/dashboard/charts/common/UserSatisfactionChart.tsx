import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "recharts";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartProdiFilter } from "@/components/dashboard/DashboardFilters";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MOCK_STUDENTS, getFilteredStudents, Student, PRODI_LIST } from "@/lib/mockData";

interface UserSatisfactionChartProps {
  showProdiFilter?: boolean;
  filters?: { prodi?: string; jenjang?: string; tahun?: string };
}

// 7 indicators with 4 satisfaction levels
const INDICATORS = [
  { key: "etika", name: "Etika" },
  { key: "kompetensi", name: "Keahlian Bidang Ilmu" },
  { key: "bahasa", name: "Kemampuan Bahasa Asing" },
  { key: "ti", name: "Penggunaan TI" },
  { key: "komunikasi", name: "Kemampuan Komunikasi" },
  { key: "kerjasama", name: "Kerjasama" },
  { key: "pengembangan", name: "Pengembangan Diri" },
];

const LEVELS = [
  { key: "sangatBaik", name: "Sangat Baik", color: "#10b981" },
  { key: "baik", name: "Baik", color: "#22c55e" },
  { key: "cukup", name: "Cukup", color: "#f59e0b" },
  { key: "kurang", name: "Kurang", color: "#ef4444" },
];

// Generate mock satisfaction data (ensuring percentages sum to 100%)
const generateSatisfactionData = () => {
  return INDICATORS.map(indicator => {
    const sangatBaik = Math.floor(Math.random() * 35 + 25); // 25-60%
    const baik = Math.floor(Math.random() * 25 + 20); // 20-45%
    const cukup = Math.floor(Math.random() * 15 + 10); // 10-25%
    const kurang = Math.max(0, 100 - sangatBaik - baik - cukup);
    
    return {
      name: indicator.name,
      key: indicator.key,
      sangatBaik,
      baik,
      cukup,
      kurang,
    };
  });
};

const satisfactionData = generateSatisfactionData();

const UserSatisfactionChart = ({ showProdiFilter = false, filters = {} }: UserSatisfactionChartProps) => {
  const navigate = useNavigate();
  const [selectedProdi, setSelectedProdi] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ 
    title: string; 
    students: Student[];
    selectedLevel: string;
    indicatorName: string;
  }>({ 
    title: "", 
    students: [],
    selectedLevel: "all",
    indicatorName: "",
  });

  // By default (all prodi selected), show compare button; or when 2+ prodi selected
  const allProdiNames = [...new Set(PRODI_LIST.map(p => p.name))];
  const showCompareButton = selectedProdi.length === 0 || selectedProdi.length >= 2;

  const handleBarClick = (data: any, level: string) => {
    const levelInfo = LEVELS.find(l => l.key === level);
    const indicatorName = data.name;
    
    // Filter students based on prodi selection
    const filtered = getFilteredStudents(MOCK_STUDENTS, {
      prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
      jenjang: filters.jenjang && filters.jenjang !== "all" ? [filters.jenjang] : undefined,
      tahunLulus: filters.tahun && filters.tahun !== "all" ? [parseInt(filters.tahun)] : undefined,
    }).slice(0, Math.floor(Math.random() * 50 + 20));

    setModalData({
      title: `${indicatorName} - ${levelInfo?.name}`,
      students: filtered,
      selectedLevel: level,
      indicatorName,
    });
    setModalOpen(true);
  };

  const handleLevelFilterChange = (levelKey: string) => {
    const levelInfo = levelKey === "all" ? null : LEVELS.find(l => l.key === levelKey);
    const levelName = levelInfo?.name || "Semua";
    
    // Re-filter students (mock)
    const filtered = getFilteredStudents(MOCK_STUDENTS, {
      prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
      jenjang: filters.jenjang && filters.jenjang !== "all" ? [filters.jenjang] : undefined,
      tahunLulus: filters.tahun && filters.tahun !== "all" ? [parseInt(filters.tahun)] : undefined,
    }).slice(0, Math.floor(Math.random() * 50 + 20));

    setModalData(prev => ({
      ...prev,
      title: `${prev.indicatorName} - ${levelName}`,
      students: filtered,
      selectedLevel: levelKey,
    }));
  };

  const handleCompare = () => {
    const prodiParam = selectedProdi.length > 0 
      ? selectedProdi.join(",") 
      : allProdiNames.slice(0, 10).join(","); // Default top 10 prodi
    navigate(`/dashboard/compare?type=kepuasan&prodi=${encodeURIComponent(prodiParam)}`);
  };

  // Get level stats for modal
  const getLevelStats = () => {
    const indicatorData = satisfactionData.find(d => d.name === modalData.indicatorName);
    if (!indicatorData) return [];
    
    const total = modalData.students.length || 100;
    return LEVELS.map(level => ({
      name: level.name,
      key: level.key,
      percentage: indicatorData[level.key as keyof typeof indicatorData],
      count: Math.floor((indicatorData[level.key as keyof typeof indicatorData] as number / 100) * total),
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="chart-container"
    >
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-heading font-semibold">Kepuasan Pengguna Lulusan</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Penilaian stakeholder terhadap kompetensi alumni
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showProdiFilter && (
            <ChartProdiFilter
              selectedProdi={selectedProdi}
              onChange={setSelectedProdi}
              showLamInfo={false}
            />
          )}
          {showCompareButton && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-8 text-xs gap-1"
              onClick={handleCompare}
            >
              <ArrowRightLeft className="w-3 h-3" />
              Compare
            </Button>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={satisfactionData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
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
            dataKey="name" 
            type="category" 
            stroke="hsl(215 20% 55%)" 
            fontSize={11}
            width={110}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 11%)",
              border: "1px solid hsl(217 33% 22%)",
              borderRadius: "8px",
            }}
            formatter={(value: number, name: string) => {
              const level = LEVELS.find(l => l.key === name);
              return [`${value}%`, level?.name || name];
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: "10px" }}
            formatter={(value) => {
              const level = LEVELS.find(l => l.key === value);
              return <span className="text-sm text-foreground">{level?.name || value}</span>;
            }}
          />
          {LEVELS.map(level => (
            <Bar 
              key={level.key}
              dataKey={level.key}
              name={level.key}
              stackId="a"
              fill={level.color}
              onClick={(data) => handleBarClick(data, level.key)}
              style={{ cursor: "pointer" }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      <StudentDataModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        subtitle={
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filter tingkat:</span>
              <Select 
                value={modalData.selectedLevel} 
                onValueChange={handleLevelFilterChange}
              >
                <SelectTrigger className="w-[140px] h-8 text-sm bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border z-[10000]">
                  <SelectItem value="all">Semua</SelectItem>
                  {LEVELS.map(level => (
                    <SelectItem key={level.key} value={level.key}>{level.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground">Total: {modalData.students.length} alumni</span>
              {getLevelStats().map(stat => (
                <span key={stat.key} className="text-xs bg-secondary/50 px-2 py-1 rounded">
                  {stat.name}: {stat.percentage}%
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
    </motion.div>
  );
};

export default UserSatisfactionChart;