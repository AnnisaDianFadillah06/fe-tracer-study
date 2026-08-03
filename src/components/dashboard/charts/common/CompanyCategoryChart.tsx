import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from "recharts";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartProdiFilter } from "@/components/dashboard/DashboardFilters";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MOCK_STUDENTS, getFilteredStudents, Student, PRODI_LIST } from "@/lib/mockData";

interface CompanyCategoryChartProps {
  data?: { name: string; value: number; color: string }[];
  showProdiFilter?: boolean;
}

const defaultData = [
  { name: "Nasional/BBH", value: 57, color: "#f97316" },
  { name: "Multinasional", value: 26.7, color: "#0ea5e9" },
  { name: "Lokal/Tidak BBH", value: 16.3, color: "#8b5cf6" },
];

const CompanyCategoryChart = ({ data = defaultData, showProdiFilter = false }: CompanyCategoryChartProps) => {
  const navigate = useNavigate();
  const [selectedProdi, setSelectedProdi] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; students: Student[] }>({ title: "", students: [] });

  // Show compare button by default (all prodi selected) or when 2+ prodi selected
  const canCompare = selectedProdi.length === 0 || selectedProdi.length >= 2;

  const handleClick = (entry: any) => {
    const filtered = getFilteredStudents(MOCK_STUDENTS, { kategoriPerusahaan: entry.name, prodi: selectedProdi.length > 0 ? selectedProdi : undefined });
    setModalData({ title: `Kategori: ${entry.name}`, students: filtered });
    setModalOpen(true);
  };

  const handleCompare = () => {
    // If no prodi selected, use all prodi names
    const prodiParam = selectedProdi.length > 0 ? selectedProdi.join(",") : PRODI_LIST.map(p => p.name).join(",");
    navigate(`/dashboard/compare?type=perusahaan&prodi=${encodeURIComponent(prodiParam)}`);
  };

  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return <Sector cx={cx} cy={cy} innerRadius={innerRadius - 3} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} style={{ cursor: "pointer" }} />;
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="chart-container h-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold">Kategori Perusahaan</h3>
        <div className="flex items-center gap-2">
          {showProdiFilter && <ChartProdiFilter selectedProdi={selectedProdi} onChange={setSelectedProdi} showLamInfo={false} />}
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
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ value }) => `${value}%`} labelLine={false} activeIndex={activeIndex !== null ? activeIndex : undefined} activeShape={renderActiveShape} onMouseEnter={(_, i) => setActiveIndex(i)} onMouseLeave={() => setActiveIndex(null)} onClick={handleClick} style={{ cursor: "pointer" }}>
            {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
          </Pie>
          <Tooltip contentStyle={{ backgroundColor: "hsl(222 47% 11%)", border: "1px solid hsl(217 33% 22%)", borderRadius: "8px" }} formatter={(value: number) => [`${value}%`, ""]} />
          <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-sm text-foreground">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
      <StudentDataModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalData.title} students={modalData.students} columns={[{ key: "kategoriPerusahaan", label: "Kategori" }, { key: "gaji", label: "Gaji" }]} />
    </motion.div>
  );
};

export default CompanyCategoryChart;
