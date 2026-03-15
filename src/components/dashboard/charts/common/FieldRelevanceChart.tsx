import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  Sector,
} from "recharts";
import { Info, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartProdiFilter } from "@/components/dashboard/DashboardFilters";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MOCK_STUDENTS, getFilteredStudents, Student, LAM_THRESHOLDS, PRODI_LIST } from "@/lib/mockData";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FieldRelevanceChartProps {
  data?: { name: string; value: number; color: string }[];
  showProdiFilter?: boolean;
  filters?: { prodi?: string; jenjang?: string; tahun?: string };
}

const defaultData = [
  { name: "Sangat Erat", value: 42.6, color: "#10b981" },
  { name: "Erat", value: 18.8, color: "#22c55e" },
  { name: "Cukup Erat", value: 23, color: "#f59e0b" },
  { name: "Kurang Erat", value: 10.9, color: "#f97316" },
  { name: "Tidak Sesuai", value: 4.7, color: "#ef4444" },
];

const FieldRelevanceChart = ({ data = defaultData, showProdiFilter = false, filters = {} }: FieldRelevanceChartProps) => {
  const navigate = useNavigate();
  const [selectedProdi, setSelectedProdi] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; subtitle: string; students: Student[] }>({
    title: "",
    subtitle: "",
    students: [],
  });

  // Show compare button by default (all prodi selected) or when 2+ prodi selected
  const canCompare = selectedProdi.length === 0 || selectedProdi.length >= 2;

  const handleClick = (entry: any) => {
    const kesesuaianValue = entry.name;
    
    const filtered = getFilteredStudents(MOCK_STUDENTS, {
      kesesuaianBidang: kesesuaianValue,
      prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
      jenjang: filters.jenjang && filters.jenjang !== "all" ? [filters.jenjang] : undefined,
      tahunLulus: filters.tahun && filters.tahun !== "all" ? [parseInt(filters.tahun)] : undefined,
    });

    setModalData({
      title: `Kesesuaian Bidang: ${kesesuaianValue}`,
      subtitle: `${entry.value}% alumni memiliki kesesuaian bidang "${kesesuaianValue}"`,
      students: filtered,
    });
    setModalOpen(true);
  };

  const handleCompare = () => {
    // If no prodi selected, use all prodi names
    const prodiParam = selectedProdi.length > 0 ? selectedProdi.join(",") : PRODI_LIST.map(p => p.name).join(",");
    navigate(`/dashboard/compare?type=kesesuaian&prodi=${encodeURIComponent(prodiParam)}`);
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.3))", cursor: "pointer" }}
      />
    );
  };

  const getThresholdInfo = () => {
    if (selectedProdi.length === 0) return null;
    const prodiData = PRODI_LIST.find(p => selectedProdi.includes(p.name));
    if (!prodiData) return null;
    return { lam: prodiData.lam, threshold: prodiData.threshold };
  };

  const thresholdInfo = getThresholdInfo();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="chart-container h-80"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold">Kesesuaian Bidang Kerja</h3>
          <UITooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-card border-border">
              <p className="text-sm mb-2">Klik pada chart untuk melihat detail mahasiswa</p>
              <div className="text-xs space-y-1">
                {Object.entries(LAM_THRESHOLDS).map(([lam, info]) => (
                  <div key={lam}>
                    <span className="text-primary">{lam} ({info.threshold}%)</span>
                    <span className="text-muted-foreground"> = {info.prodi.slice(0, 2).join(", ")}</span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </UITooltip>
        </div>
        <div className="flex items-center gap-2">
          {showProdiFilter && (
            <ChartProdiFilter
              selectedProdi={selectedProdi}
              onChange={setSelectedProdi}
            />
          )}
          {canCompare && (
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

      {thresholdInfo && (
        <div className="text-xs text-muted-foreground mb-2">
          Threshold: <span className="text-primary">{thresholdInfo.lam} ({thresholdInfo.threshold}%)</span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={thresholdInfo ? "78%" : "85%"}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ value }) => `${value}%`}
            labelLine={false}
            activeIndex={activeIndex !== null ? activeIndex : undefined}
            activeShape={renderActiveShape}
            onMouseEnter={(_, index) => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            onClick={handleClick}
            style={{ cursor: "pointer" }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 11%)",
              border: "1px solid hsl(217 33% 22%)",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value}%`, ""]}
          />
          <Legend
            verticalAlign="bottom"
            height={48}
            formatter={(value) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      <StudentDataModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        subtitle={modalData.subtitle}
        students={modalData.students}
        columns={[
          { key: "kesesuaianBidang", label: "Kesesuaian Bidang" },
          { key: "status", label: "Status" },
        ]}
      />
    </motion.div>
  );
};

export default FieldRelevanceChart;
