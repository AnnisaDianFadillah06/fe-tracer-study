import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartProdiFilter } from "@/components/dashboard/DashboardFilters";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import {
  MOCK_STUDENTS,
  getFilteredStudents,
  Student,
  PRODI_LIST,
  CARA_MENDAPAT_KERJA_OPTIONS,
} from "@/lib/mockData";

interface JobFindingMethodChartProps {
  showProdiFilter?: boolean;
  filters?: { prodi?: string; jenjang?: string; tahun?: string };
}

const COLORS = [
  "#f97316", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b",
  "#ec4899", "#6366f1", "#14b8a6", "#f43f5e", "#84cc16",
  "#a855f7", "#22c55e", "#3b82f6", "#eab308", "#6b7280",
];

const JobFindingMethodChart = ({ showProdiFilter = false, filters }: JobFindingMethodChartProps) => {
  const navigate = useNavigate();
  const [selectedProdi, setSelectedProdi] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{
    title: string;
    students: Student[];
    segments: { key: string; name: string }[];
    selectedSegment: string;
  }>({ title: "", students: [], segments: [], selectedSegment: "all" });

  const canCompare = selectedProdi.length === 0 || selectedProdi.length >= 2;

  // Calculate data based on filters - IMPORTANT: Multiple Response Percentage
  // % = (Number of respondents who selected option X) / (Total respondents)
  const { chartData, totalRespondents } = useMemo(() => {
    // Only include students who are working (have job finding methods)
    const workingStudents = getFilteredStudents(MOCK_STUDENTS, {
      prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
    }).filter(s => s.caraMendapatKerja.length > 0);

    const total = workingStudents.length;

    const data = CARA_MENDAPAT_KERJA_OPTIONS.map((method, index) => {
      // Count respondents who selected this method (not total selections)
      const count = workingStudents.filter(s => 
        s.caraMendapatKerja.includes(method.key)
      ).length;
      const percentage = total > 0 ? (count / total) * 100 : 0;
      return {
        key: method.key,
        name: method.label,
        shortName: method.label.length > 25 ? method.label.substring(0, 23) + "..." : method.label,
        value: parseFloat(percentage.toFixed(1)),
        count,
        color: COLORS[index % COLORS.length],
      };
    }).sort((a, b) => b.value - a.value);

    return { chartData: data, totalRespondents: total };
  }, [selectedProdi]);

  const handleBarClick = (entry: any) => {
    const workingStudents = getFilteredStudents(MOCK_STUDENTS, {
      prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
    }).filter(s => s.caraMendapatKerja.length > 0);

    const filtered = workingStudents.filter(s => 
      s.caraMendapatKerja.includes(entry.key)
    );

    const segments = CARA_MENDAPAT_KERJA_OPTIONS.map(m => ({ key: m.key, name: m.label }));

    setModalData({
      title: `Cara: ${entry.name}`,
      students: filtered,
      segments,
      selectedSegment: entry.key,
    });
    setModalOpen(true);
  };

  const handleSegmentChange = (segmentKey: string) => {
    if (segmentKey === modalData.selectedSegment) return;

    const workingStudents = getFilteredStudents(MOCK_STUDENTS, {
      prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
    }).filter(s => s.caraMendapatKerja.length > 0);

    let filtered: Student[];
    let segmentName: string;

    if (segmentKey === "all") {
      filtered = workingStudents;
      segmentName = "Semua";
    } else {
      filtered = workingStudents.filter(s => s.caraMendapatKerja.includes(segmentKey));
      const method = CARA_MENDAPAT_KERJA_OPTIONS.find(m => m.key === segmentKey);
      segmentName = method?.label || segmentKey;
    }

    setModalData(prev => ({
      ...prev,
      students: filtered,
      selectedSegment: segmentKey,
      title: `Cara: ${segmentName}`,
    }));
  };

  const handleCompare = () => {
    const prodiParam = selectedProdi.length > 0
      ? selectedProdi.join(",")
      : PRODI_LIST.map(p => p.name).join(",");
    navigate(`/dashboard/compare?type=caraMendapatKerja&prodi=${encodeURIComponent(prodiParam)}`);
  };

  const getSegmentStats = () => {
    return chartData.slice(0, 5).map(item => ({
      name: item.name,
      count: item.count,
      percentage: item.value.toFixed(1),
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="chart-container"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold">Cara Mendapat Pekerjaan</h3>
          <Badge variant="secondary" className="text-xs">
            n={totalRespondents.toLocaleString()}
          </Badge>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Bekerja
          </Badge>
        </div>
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

      <div className="overflow-y-auto max-h-[400px] scrollbar-thin scrollbar-thumb-border">
        <div style={{ height: Math.max(300, chartData.length * 28) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 130, bottom: 5 }}
            >
              <XAxis
                type="number"
                stroke="hsl(215 20% 55%)"
                fontSize={12}
                domain={[0, "auto"]}
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                dataKey="shortName"
                type="category"
                stroke="hsl(215 20% 55%)"
                fontSize={10}
                width={125}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(222 47% 11%)",
                  border: "1px solid hsl(217 33% 22%)",
                  borderRadius: "8px",
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold text-sm">{data.name}</p>
                      <p className="text-primary font-bold">{data.value}%</p>
                      <p className="text-xs text-muted-foreground">
                        Dipilih oleh: {data.count} alumni ({data.value}%)
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 italic">
                        *Multiple response - total dapat &gt;100%
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="value"
                onClick={(data) => handleBarClick(data)}
                style={{ cursor: "pointer" }}
                radius={[0, 4, 4, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mt-2 italic">
        *Multiple response: Responden dapat memilih lebih dari satu opsi
      </p>

      <StudentDataModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalData.title}
        subtitle={
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Filter:</span>
              <select
                value={modalData.selectedSegment}
                onChange={(e) => handleSegmentChange(e.target.value)}
                className="h-8 text-sm bg-secondary/50 border border-border rounded px-2"
              >
                <option value="all">Semua</option>
                {modalData.segments.map((seg) => (
                  <option key={seg.key} value={seg.key}>
                    {seg.name.length > 30 ? seg.name.substring(0, 28) + "..." : seg.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                Total: {modalData.students.length}
              </span>
              {getSegmentStats().map((stat) => (
                <span
                  key={stat.name}
                  className="text-xs bg-secondary/50 px-2 py-1 rounded"
                >
                  {stat.name.length > 12 ? stat.name.substring(0, 10) + "..." : stat.name}: {stat.count} ({stat.percentage}%)
                </span>
              ))}
            </div>
          </div>
        }
        students={modalData.students}
        columns={[
          { key: "prodi", label: "Prodi" },
          { key: "caraMendapatKerja", label: "Cara", render: (v: string[]) => {
            const labels = v.map(key => {
              const opt = CARA_MENDAPAT_KERJA_OPTIONS.find(o => o.key === key);
              return opt?.label.substring(0, 15) || key;
            });
            return labels.join(", ");
          }},
          { key: "tahunLulus", label: "Tahun" },
        ]}
      />
    </motion.div>
  );
};

export default JobFindingMethodChart;
