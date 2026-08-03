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
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartProdiFilter } from "@/components/dashboard/DashboardFilters";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MOCK_STUDENTS, getFilteredStudents, Student, PRODI_LIST } from "@/lib/mockData";

interface GenderChartProps {
  data?: { name: string; value: number; color: string }[];
  showProdiFilter?: boolean;
  filters?: { prodi?: string; jenjang?: string; tahun?: string };
}

const defaultData = [
  { name: "Pria", value: 768, color: "#0ea5e9" },
  { name: "Wanita", value: 924, color: "#f97316" },
];

const GenderChart = ({ data = defaultData, showProdiFilter = false, filters = {} }: GenderChartProps) => {
  const navigate = useNavigate();
  const [selectedProdi, setSelectedProdi] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; students: Student[] }>({ title: "", students: [] });

  const total = data.reduce((sum, item) => sum + item.value, 0);
  // Show compare button by default (all prodi) or when 2+ prodi selected
  const canCompare = selectedProdi.length === 0 || selectedProdi.length >= 2;

  const handleClick = (entry: any, index: number) => {
    const genderValue = entry.name;
    
    const filtered = getFilteredStudents(MOCK_STUDENTS, {
      gender: genderValue,
      prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
      jenjang: filters.jenjang && filters.jenjang !== "all" ? [filters.jenjang] : undefined,
      tahunLulus: filters.tahun && filters.tahun !== "all" ? [parseInt(filters.tahun)] : undefined,
    });

    setModalData({
      title: `Data Alumni ${genderValue}`,
      students: filtered,
    });
    setModalOpen(true);
  };

  const handleCompare = () => {
    // If no prodi selected, use all prodi names
    const prodiParam = selectedProdi.length > 0 ? selectedProdi.join(",") : PRODI_LIST.map(p => p.name).join(",");
    navigate(`/dashboard/compare?type=gender&prodi=${encodeURIComponent(prodiParam)}`);
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius - 5}
          outerRadius={outerRadius + 8}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.3))", cursor: "pointer" }}
        />
      </g>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="chart-container h-80"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold">Distribusi Gender</h3>
        <div className="flex items-center gap-2">
          {showProdiFilter && (
            <ChartProdiFilter
              selectedProdi={selectedProdi}
              onChange={setSelectedProdi}
              showLamInfo={false}
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
      <ResponsiveContainer width="100%" height="85%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
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
            formatter={(value: number) => [
              `${value} orang (${((value / total) * 100).toFixed(1)}%)`,
              "",
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-sm text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      <StudentDataModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        subtitle="Klik untuk melihat detail data mahasiswa"
        students={modalData.students}
        columns={[
          { key: "gender", label: "Gender" },
        ]}
      />
    </motion.div>
  );
};

export default GenderChart;
