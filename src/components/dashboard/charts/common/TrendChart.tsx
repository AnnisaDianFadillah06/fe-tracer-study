import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LineChart,
  Line,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TrendChartProps {
  showProdiFilter?: boolean;
}

const INDICATORS = [
  { 
    key: "kesesuaian", 
    label: "Kesesuaian Bidang", 
    description: "Persentase alumni yang bekerja sesuai bidang studi",
    column: { key: "kesesuaianBidang", label: "Kesesuaian" }
  },
  { 
    key: "jenisPerusahaan", 
    label: "Jenis Perusahaan", 
    description: "Distribusi jenis perusahaan (lokal, nasional, internasional)",
    column: { key: "kategoriPerusahaan", label: "Kategori" }
  },
  { 
    key: "gaji", 
    label: "Rentang Gaji", 
    description: "Rata-rata gaji alumni per tahun",
    column: { key: "gaji", label: "Gaji" }
  },
  { 
    key: "status", 
    label: "Status Penerimaan Kerja", 
    description: "Distribusi status alumni (bekerja, wiraswasta, studi lanjut)",
    column: { key: "status", label: "Status" }
  },
];

const YEARS = ["2020", "2021", "2022", "2023", "2024"];

const TrendChart = ({ showProdiFilter = true }: TrendChartProps) => {
  const navigate = useNavigate();
  const [selectedProdi, setSelectedProdi] = useState<string[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState("kesesuaian");
  const [selectedYears, setSelectedYears] = useState<string[]>(YEARS);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; students: Student[] }>({ 
    title: "", 
    students: [] 
  });

  const indicator = INDICATORS.find(i => i.key === selectedIndicator) || INDICATORS[0];
  const canCompare = selectedProdi.length === 0 || selectedProdi.length >= 2;

  // Generate trend data based on indicator
  const trendData = useMemo(() => {
    return selectedYears.map(year => {
      const yearNum = parseInt(year);
      const yearStudents = MOCK_STUDENTS.filter(s => 
        s.tahunLulus === yearNum &&
        (selectedProdi.length === 0 || selectedProdi.includes(s.prodi))
      );

      const dataPoint: Record<string, any> = { year, totalStudents: yearStudents.length };

      if (selectedIndicator === "kesesuaian") {
        const sesuai = yearStudents.filter(s => 
          s.kesesuaianBidang === "Sangat Erat" || s.kesesuaianBidang === "Erat"
        ).length;
        const cukup = yearStudents.filter(s => s.kesesuaianBidang === "Cukup Erat").length;
        const tidak = yearStudents.filter(s => 
          s.kesesuaianBidang === "Kurang Erat" || s.kesesuaianBidang === "Tidak Sesuai"
        ).length;
        const total = yearStudents.length || 1;
        dataPoint["Sesuai"] = ((sesuai / total) * 100).toFixed(1);
        dataPoint["Cukup Sesuai"] = ((cukup / total) * 100).toFixed(1);
        dataPoint["Tidak Sesuai"] = ((tidak / total) * 100).toFixed(1);
      } else if (selectedIndicator === "jenisPerusahaan") {
        const lokal = yearStudents.filter(s => s.kategoriPerusahaan === "Lokal/Tidak BBH").length;
        const nasional = yearStudents.filter(s => s.kategoriPerusahaan === "Nasional/BBH").length;
        const multi = yearStudents.filter(s => s.kategoriPerusahaan === "Multinasional").length;
        const total = yearStudents.length || 1;
        dataPoint["Lokal"] = ((lokal / total) * 100).toFixed(1);
        dataPoint["Nasional"] = ((nasional / total) * 100).toFixed(1);
        dataPoint["Multinasional"] = ((multi / total) * 100).toFixed(1);
      } else if (selectedIndicator === "gaji") {
        const bekerja = yearStudents.filter(s => s.gaji > 0);
        const avgGaji = bekerja.length > 0 
          ? bekerja.reduce((sum, s) => sum + s.gaji, 0) / bekerja.length / 1000000 
          : 0;
        const tinggi = yearStudents.filter(s => s.gaji > 7000000).length;
        const sedang = yearStudents.filter(s => s.gaji >= 4000000 && s.gaji <= 7000000).length;
        const rendah = yearStudents.filter(s => s.gaji > 0 && s.gaji < 4000000).length;
        const total = yearStudents.length || 1;
        dataPoint["Rata-rata (Juta)"] = avgGaji.toFixed(2);
        dataPoint["Tinggi (>7jt)"] = ((tinggi / total) * 100).toFixed(1);
        dataPoint["Sedang (4-7jt)"] = ((sedang / total) * 100).toFixed(1);
        dataPoint["Rendah (<4jt)"] = ((rendah / total) * 100).toFixed(1);
      } else if (selectedIndicator === "status") {
        const bekerja = yearStudents.filter(s => s.status === "Bekerja Full-time" || s.status === "Bekerja Part-time").length;
        const wiraswasta = yearStudents.filter(s => s.status === "Wiraswasta").length;
        const studi = yearStudents.filter(s => s.status === "Studi Lanjut").length;
        const cari = yearStudents.filter(s => s.status === "Mencari Kerja").length;
        const total = yearStudents.length || 1;
        dataPoint["Bekerja"] = ((bekerja / total) * 100).toFixed(1);
        dataPoint["Wiraswasta"] = ((wiraswasta / total) * 100).toFixed(1);
        dataPoint["Studi Lanjut"] = ((studi / total) * 100).toFixed(1);
        dataPoint["Mencari Kerja"] = ((cari / total) * 100).toFixed(1);
      }

      return dataPoint;
    });
  }, [selectedProdi, selectedIndicator, selectedYears]);

  // Get line keys based on indicator
  const lineKeys = useMemo(() => {
    if (selectedIndicator === "kesesuaian") {
      return [
        { key: "Sesuai", color: "#10b981" },
        { key: "Cukup Sesuai", color: "#f59e0b" },
        { key: "Tidak Sesuai", color: "#ef4444" },
      ];
    } else if (selectedIndicator === "jenisPerusahaan") {
      return [
        { key: "Lokal", color: "#8b5cf6" },
        { key: "Nasional", color: "#f97316" },
        { key: "Multinasional", color: "#0ea5e9" },
      ];
    } else if (selectedIndicator === "gaji") {
      return [
        { key: "Rata-rata (Juta)", color: "#10b981" },
        { key: "Tinggi (>7jt)", color: "#0ea5e9" },
        { key: "Sedang (4-7jt)", color: "#f59e0b" },
        { key: "Rendah (<4jt)", color: "#ef4444" },
      ];
    } else {
      return [
        { key: "Bekerja", color: "#10b981" },
        { key: "Wiraswasta", color: "#f97316" },
        { key: "Studi Lanjut", color: "#0ea5e9" },
        { key: "Mencari Kerja", color: "#ef4444" },
      ];
    }
  }, [selectedIndicator]);

  const handlePointClick = (data: any) => {
    if (!data || !data.activePayload) return;
    
    const year = parseInt(data.activeLabel);
    const filtered = getFilteredStudents(MOCK_STUDENTS, {
      tahunLulus: [year],
      prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
    });

    setModalData({
      title: `Data Alumni Tahun ${year}`,
      students: filtered,
    });
    setModalOpen(true);
  };

  const handleCompare = () => {
    // If no prodi selected, use all prodi names
    const prodiParam = selectedProdi.length > 0 ? selectedProdi.join(",") : PRODI_LIST.map(p => p.name).join(",");
    // Pass the selected indicator to the compare page
    navigate(`/dashboard/compare?type=trend&prodi=${encodeURIComponent(prodiParam)}&indicator=${selectedIndicator}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="chart-container"
    >
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-heading font-semibold">Trend Indikator Antar Tahun</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedIndicator} onValueChange={setSelectedIndicator}>
              <SelectTrigger className="w-[180px] h-9 text-sm bg-secondary/50 border-border">
                <SelectValue placeholder="Pilih Indikator" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                {INDICATORS.map(ind => (
                  <SelectItem key={ind.key} value={ind.key}>
                    {ind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                className="h-9 text-xs gap-1"
                onClick={handleCompare}
              >
                <ArrowRightLeft className="w-3 h-3" />
                Compare
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{indicator.description}</p>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart
          data={trendData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          onClick={handlePointClick}
          style={{ cursor: "pointer" }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" />
          <XAxis 
            dataKey="year" 
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
          />
          <YAxis 
            stroke="hsl(215 20% 55%)" 
            fontSize={12}
            label={{ 
              value: selectedIndicator === "gaji" ? "Nilai" : "Persentase (%)", 
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
              if (!active || !payload) return null;
              const dataPoint = trendData.find(d => d.year === label);
              return (
                <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-semibold text-sm mb-2">Tahun: {label}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Total responden: {dataPoint?.totalStudents || 0}
                  </p>
                  {payload.map((entry: any) => (
                    <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
                      {entry.name}: <span className="font-bold">
                        {entry.value}{selectedIndicator !== "gaji" || entry.name === "Rata-rata (Juta)" ? "" : "%"}
                      </span>
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground mt-2 italic">Klik untuk detail</p>
                </div>
              );
            }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: "10px" }}
            formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
          />
          {lineKeys.map(line => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={2}
              dot={{ fill: line.color, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <StudentDataModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        students={modalData.students}
        columns={[indicator.column, { key: "prodi", label: "Prodi" }]}
      />
    </motion.div>
  );
};

export default TrendChart;
