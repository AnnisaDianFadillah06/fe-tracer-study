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
import { ChartProdiFilter } from "@/components/dashboard/DashboardFilters";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MOCK_STUDENTS, getFilteredStudents, Student, PRODI_LIST } from "@/lib/mockData";

interface WaitingTimeChartProps {
  data?: { name: string; "< 3 bulan": number; "3-6 bulan": number; "> 6 bulan": number }[];
  showProdiFilter?: boolean;
  filters?: { prodi?: string; jenjang?: string; tahun?: string };
}

const defaultData = [
  { name: "POLBAN", "< 3 bulan": 605, "3-6 bulan": 378, "> 6 bulan": 234 },
  { name: "D-IV", "< 3 bulan": 284, "3-6 bulan": 154, "> 6 bulan": 89 },
  { name: "D-III", "< 3 bulan": 315, "3-6 bulan": 218, "> 6 bulan": 143 },
  { name: "S-2", "< 3 bulan": 6, "3-6 bulan": 6, "> 6 bulan": 2 },
];

const WaitingTimeChart = ({ data = defaultData, showProdiFilter = false, filters = {} }: WaitingTimeChartProps) => {
  const navigate = useNavigate();
  const [selectedProdi, setSelectedProdi] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; students: Student[] }>({ title: "", students: [] });

  // Show compare button by default (all prodi selected) or when 2+ prodi selected
  const canCompare = selectedProdi.length === 0 || selectedProdi.length >= 2;

  const handleBarClick = (data: any, dataKey: string) => {
    let minMonths = 0, maxMonths = 12;
    if (dataKey === "< 3 bulan") maxMonths = 3;
    else if (dataKey === "3-6 bulan") { minMonths = 3; maxMonths = 6; }
    else if (dataKey === "> 6 bulan") minMonths = 6;

    const filtered = getFilteredStudents(MOCK_STUDENTS, {
      waktuTungguRange: [minMonths, maxMonths],
      prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
    });

    setModalData({ title: `Waktu Tunggu: ${dataKey}`, students: filtered });
    setModalOpen(true);
  };

  const handleCompare = () => {
    // If no prodi selected, use all prodi names
    const prodiParam = selectedProdi.length > 0 ? selectedProdi.join(",") : PRODI_LIST.map(p => p.name).join(",");
    navigate(`/dashboard/compare?type=waktuTunggu&prodi=${encodeURIComponent(prodiParam)}`);
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="chart-container h-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold">Waktu Tunggu Kerja</h3>
        <div className="flex items-center gap-2">
          {showProdiFilter && <ChartProdiFilter selectedProdi={selectedProdi} onChange={setSelectedProdi} />}
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
          <span className="text-sm text-muted-foreground">Rata-rata: 3.35 bulan</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" />
          <XAxis dataKey="name" stroke="hsl(215 20% 55%)" fontSize={12} />
          <YAxis stroke="hsl(215 20% 55%)" fontSize={12} />
          <Tooltip contentStyle={{ backgroundColor: "hsl(222 47% 11%)", border: "1px solid hsl(217 33% 22%)", borderRadius: "8px" }} formatter={(value: number) => [`${value} orang`, ""]} />
          <Legend wrapperStyle={{ paddingTop: "10px" }} formatter={(value) => <span className="text-sm text-foreground">{value}</span>} />
          <Bar dataKey="< 3 bulan" fill="#10b981" radius={[4, 4, 0, 0]} onClick={(d) => handleBarClick(d, "< 3 bulan")} style={{ cursor: "pointer" }} />
          <Bar dataKey="3-6 bulan" fill="#f59e0b" radius={[4, 4, 0, 0]} onClick={(d) => handleBarClick(d, "3-6 bulan")} style={{ cursor: "pointer" }} />
          <Bar dataKey="> 6 bulan" fill="#ef4444" radius={[4, 4, 0, 0]} onClick={(d) => handleBarClick(d, "> 6 bulan")} style={{ cursor: "pointer" }} />
        </BarChart>
      </ResponsiveContainer>
      <StudentDataModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalData.title} students={modalData.students} columns={[{ key: "waktuTunggu", label: "Waktu Tunggu (Bulan)" }]} />
    </motion.div>
  );
};

export default WaitingTimeChart;
