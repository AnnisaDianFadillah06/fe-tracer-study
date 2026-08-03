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
  Cell,
} from "recharts";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartProdiFilter } from "@/components/dashboard/DashboardFilters";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MOCK_STUDENTS, getFilteredStudents, Student, PRODI_LIST } from "@/lib/mockData";

interface StatusChartProps {
  data?: { name: string; value: number; color: string }[];
  showProdiFilter?: boolean;
  filters?: { prodi?: string; jenjang?: string; tahun?: string };
}

const defaultData = [
  { name: "Bekerja", value: 1168, color: "#10b981" },
  { name: "Mencari Kerja", value: 192, color: "#f59e0b" },
  { name: "Studi Lanjut", value: 89, color: "#0ea5e9" },
  { name: "Wiraswasta", value: 52, color: "#8b5cf6" },
  { name: "Studi & Bekerja", value: 75, color: "#3b82f6" },
  { name: "Belum Bekerja", value: 25, color: "#6b7280" },
];

const NO_SALARY_STATUSES = ["Mencari Kerja", "Studi Lanjut", "Belum Bekerja"];

const StatusChart = ({ data = defaultData, showProdiFilter = false, filters = {} }: StatusChartProps) => {
  const navigate = useNavigate();
  const [selectedProdi, setSelectedProdi] = useState<string[]>([]);
  const [activeBar, setActiveBar] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; students: Student[]; showSalary: boolean }>({ title: "", students: [], showSalary: true });

  const canCompare = selectedProdi.length === 0 || selectedProdi.length >= 2;

  const handleBarClick = (entry: any) => {
    const statusValue = entry.name;
    const showSalary = !NO_SALARY_STATUSES.includes(statusValue);
    
    const filtered = getFilteredStudents(MOCK_STUDENTS, {
      status: statusValue,
      prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
      jenjang: filters.jenjang && filters.jenjang !== "all" ? [filters.jenjang] : undefined,
      tahunLulus: filters.tahun && filters.tahun !== "all" ? [parseInt(filters.tahun)] : undefined,
    });

    setModalData({
      title: `Status: ${statusValue}`,
      students: filtered,
      showSalary,
    });
    setModalOpen(true);
  };

  const handleCompare = () => {
    // If no prodi selected, use all prodi names
    const prodiParam = selectedProdi.length > 0 ? selectedProdi.join(",") : PRODI_LIST.map(p => p.name).join(",");
    navigate(`/dashboard/compare?type=status&prodi=${encodeURIComponent(prodiParam)}`);
  };

  const getColumns = () => {
    const baseColumns = [{ key: "status", label: "Status" }];
    if (modalData.showSalary) {
      baseColumns.push({ key: "gaji", label: "Gaji" });
    }
    return baseColumns;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="chart-container h-80"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold">Status Alumni</h3>
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
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" horizontal={false} />
          <XAxis type="number" stroke="hsl(215 20% 55%)" fontSize={12} />
          <YAxis
            dataKey="name"
            type="category"
            width={100}
            stroke="hsl(215 20% 55%)"
            fontSize={11}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 11%)",
              border: "1px solid hsl(217 33% 22%)",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value} orang`, "Jumlah"]}
          />
          <Bar 
            dataKey="value" 
            radius={[0, 4, 4, 0]}
            onClick={(data) => handleBarClick(data)}
            style={{ cursor: "pointer" }}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                opacity={activeBar === null || activeBar === index ? 1 : 0.5}
                onMouseEnter={() => setActiveBar(index)}
                onMouseLeave={() => setActiveBar(null)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <StudentDataModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        subtitle="Klik untuk melihat detail data mahasiswa"
        students={modalData.students}
        columns={getColumns()}
      />
    </motion.div>
  );
};

export default StatusChart;
