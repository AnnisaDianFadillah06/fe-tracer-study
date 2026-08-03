import { useState, useMemo } from "react";
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
  ReferenceLine,
} from "recharts";
import { Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODI_LIST, MOCK_STUDENTS, Student } from "@/lib/mockData";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { ChartProdiFilter } from "@/components/dashboard/DashboardFilters";

type IndicatorType = "jenjang" | "gender" | "prodi" | "ipk" | "usia";

interface SurvivalLine {
  key: string;
  name: string;
  color: string;
  filter: (s: Student) => boolean;
}

const INDICATOR_CONFIG: Record<IndicatorType, { 
  label: string; 
  lines: SurvivalLine[];
}> = {
  jenjang: {
    label: "Jenjang Pendidikan",
    lines: [
      { key: "overall", name: "Overall", color: "#f97316", filter: () => true },
      { key: "diii", name: "D-III", color: "#0ea5e9", filter: (s) => s.jenjang === "D3" },
      { key: "div", name: "D-IV", color: "#10b981", filter: (s) => s.jenjang === "D4" },
      { key: "s2", name: "S2-Terapan", color: "#8b5cf6", filter: (s) => s.jenjang === "S2" },
    ]
  },
  gender: {
    label: "Gender",
    lines: [
      { key: "overall", name: "Overall", color: "#f97316", filter: () => true },
      { key: "pria", name: "Pria", color: "#0ea5e9", filter: (s) => s.gender === "Pria" },
      { key: "wanita", name: "Wanita", color: "#ec4899", filter: (s) => s.gender === "Wanita" },
    ]
  },
  ipk: {
    label: "Kategori IPK",
    lines: [
      { key: "overall", name: "Overall", color: "#f97316", filter: () => true },
      { key: "tinggi", name: "IPK > 3.5", color: "#10b981", filter: (s) => s.ipk > 3.5 },
      { key: "sedang", name: "IPK 3.0-3.5", color: "#f59e0b", filter: (s) => s.ipk >= 3.0 && s.ipk <= 3.5 },
      { key: "rendah", name: "IPK < 3.0", color: "#ef4444", filter: (s) => s.ipk < 3.0 },
    ]
  },
  usia: {
    label: "Kategori Usia Lulus",
    lines: [
      { key: "overall", name: "Overall", color: "#f97316", filter: () => true },
      { key: "muda", name: "≤22 tahun", color: "#10b981", filter: (s) => s.tahunLulus >= 2022 },
      { key: "sedang", name: "23-25 tahun", color: "#f59e0b", filter: (s) => s.tahunLulus >= 2020 && s.tahunLulus < 2022 },
      { key: "tua", name: ">25 tahun", color: "#8b5cf6", filter: (s) => s.tahunLulus < 2020 },
    ]
  },
  prodi: {
    label: "Program Studi",
    lines: [] // Will be dynamically generated based on selected prodi
  },
};

const PRODI_COLORS = [
  "#f97316", "#0ea5e9", "#10b981", "#8b5cf6", "#ec4899", 
  "#f59e0b", "#6366f1", "#14b8a6", "#f43f5e", "#84cc16"
];

const SurvivalAnalysisChart = () => {
  const [indicator, setIndicator] = useState<IndicatorType>("jenjang");
  const [selectedProdi, setSelectedProdi] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; students: Student[] }>({ title: "", students: [] });

  // Get unique prodi names
  const prodiNames = useMemo(() => [...new Set(PRODI_LIST.map(p => p.name))], []);

  // Generate survival lines based on indicator
  const survivalLines = useMemo(() => {
    if (indicator === "prodi") {
      const prodisToShow = selectedProdi.length > 0 ? selectedProdi : prodiNames.slice(0, 5);
      return [
        { key: "overall", name: "Overall", color: "#f97316", filter: () => true },
        ...prodisToShow.map((p, idx) => ({
          key: p.toLowerCase().replace(/\s+/g, "_"),
          name: p,
          color: PRODI_COLORS[idx % PRODI_COLORS.length],
          filter: (s: Student) => s.prodi === p,
        }))
      ];
    }
    return INDICATOR_CONFIG[indicator].lines;
  }, [indicator, selectedProdi, prodiNames]);

  // Generate Kaplan-Meier survival data
  const survivalData = useMemo(() => {
    const months = Array.from({ length: 13 }, (_, i) => i);
    
    return months.map(month => {
      const dataPoint: Record<string, any> = { month };
      
      survivalLines.forEach(line => {
        const lineStudents = MOCK_STUDENTS.filter(line.filter);
        const stillSearching = lineStudents.filter(s => s.waktuTunggu > month).length;
        const total = lineStudents.length;
        dataPoint[line.key] = total > 0 ? Math.round((stillSearching / total) * 100) : 0;
      });
      
      return dataPoint;
    });
  }, [survivalLines]);

  // Calculate median survival time
  const medianTime = useMemo(() => {
    const overallLine = survivalData.find(d => d.overall <= 50);
    return overallLine ? overallLine.month : 6;
  }, [survivalData]);

  const handleLineClick = (lineKey: string) => {
    const line = survivalLines.find(l => l.key === lineKey);
    if (!line) return;

    const filtered = MOCK_STUDENTS.filter(line.filter);
    setModalData({
      title: `Survival Analysis - ${line.name}`,
      students: filtered,
    });
    setModalOpen(true);
  };

  const toggleProdi = (prodi: string) => {
    setSelectedProdi(prev => 
      prev.includes(prodi) 
        ? prev.filter(p => p !== prodi)
        : [...prev, prodi]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="chart-container"
    >
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-semibold">Kaplan-Meier Survival Curve</h3>
            <UITooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs bg-card border-border">
                <p className="text-sm">
                  Kurva survival menunjukkan probabilitas alumni yang masih mencari kerja 
                  seiring waktu. Penurunan kurva menunjukkan terjadinya event (mendapat pekerjaan).
                </p>
              </TooltipContent>
            </UITooltip>
          </div>
          <div className="text-xs text-muted-foreground">Median: {medianTime} bulan</div>
        </div>

        {/* Indicator & Prodi Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Indikator:</span>
            <Select value={indicator} onValueChange={(v) => setIndicator(v as IndicatorType)}>
              <SelectTrigger className="w-[160px] h-8 bg-secondary/50 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="jenjang">Jenjang Pendidikan</SelectItem>
                <SelectItem value="gender">Gender</SelectItem>
                <SelectItem value="ipk">Kategori IPK</SelectItem>
                <SelectItem value="usia">Kategori Usia</SelectItem>
                <SelectItem value="prodi">Program Studi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Prodi Filter (only shown when indicator is "prodi") - using ChartProdiFilter for consistency */}
          {indicator === "prodi" && (
            <ChartProdiFilter
              selectedProdi={selectedProdi}
              onChange={setSelectedProdi}
              showLamInfo={true}
            />
          )}
        </div>

        {/* Active Lines Legend */}
        <div className="flex flex-wrap gap-2">
          {survivalLines.map(line => (
            <button
              key={line.key}
              onClick={() => handleLineClick(line.key)}
              className="flex items-center gap-1.5 px-2 py-1 bg-secondary/30 rounded text-xs hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <span 
                className="w-3 h-0.5 rounded" 
                style={{ backgroundColor: line.color }}
              />
              <span className="text-muted-foreground">{line.name}</span>
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={survivalData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" />
          <XAxis
            dataKey="month"
            stroke="hsl(215 20% 55%)"
            fontSize={12}
            label={{ value: "Bulan Setelah Lulus", position: "bottom", fill: "hsl(215 20% 55%)" }}
          />
          <YAxis
            stroke="hsl(215 20% 55%)"
            fontSize={12}
            domain={[0, 100]}
            label={{ value: "Survival Probability (%)", angle: -90, position: "insideLeft", fill: "hsl(215 20% 55%)" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 11%)",
              border: "1px solid hsl(217 33% 22%)",
              borderRadius: "8px",
            }}
            formatter={(value: number, name: string) => {
              const line = survivalLines.find(l => l.key === name);
              return [`${value}%`, line?.name || name];
            }}
            labelFormatter={(label) => `Bulan ke-${label}`}
          />
          <Legend
            wrapperStyle={{ paddingTop: "20px" }}
            formatter={(value) => {
              const line = survivalLines.find(l => l.key === value);
              return <span className="text-sm text-foreground">{line?.name || value}</span>;
            }}
          />
          <ReferenceLine 
            y={50} 
            stroke="hsl(215 20% 55%)" 
            strokeDasharray="5 5" 
            label={{ value: "Median", fill: "hsl(215 20% 55%)", fontSize: 10 }} 
          />
          
          {survivalLines.map((line) => (
            <Line
              key={line.key}
              type="stepAfter"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={line.key === "overall" ? 3 : 2}
              name={line.key}
              dot={false}
              activeDot={{ r: 4, cursor: "pointer" }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <StudentDataModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        subtitle="Data alumni berdasarkan analisis survival"
        students={modalData.students}
        columns={[
          { key: "waktuTunggu", label: "Waktu Tunggu (Bulan)" },
          { key: "status", label: "Status" },
          { key: "ipk", label: "IPK" },
        ]}
      />
    </motion.div>
  );
};

export default SurvivalAnalysisChart;
