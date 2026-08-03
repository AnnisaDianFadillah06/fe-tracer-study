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
  SUMBER_BIAYA_OPTIONS,
} from "@/lib/mockData";

interface FundingSourceChartProps {
  showProdiFilter?: boolean;
  filters?: { prodi?: string; jenjang?: string; tahun?: string };
}

const COLORS = ["#f97316", "#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#6b7280"];

const FundingSourceChart = ({ showProdiFilter = false, filters }: FundingSourceChartProps) => {
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

  // Calculate data based on filters
  const { chartData, totalRespondents } = useMemo(() => {
    const filteredStudents = getFilteredStudents(MOCK_STUDENTS, {
      prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
    });

    const total = filteredStudents.length;
    
    const data = SUMBER_BIAYA_OPTIONS.map((source, index) => {
      const count = filteredStudents.filter(s => s.sumberBiayaKuliah === source).length;
      const percentage = total > 0 ? (count / total) * 100 : 0;
      return {
        name: source,
        shortName: source.length > 20 ? source.substring(0, 18) + "..." : source,
        value: parseFloat(percentage.toFixed(1)),
        count,
        color: COLORS[index % COLORS.length],
      };
    }).sort((a, b) => b.value - a.value);

    return { chartData: data, totalRespondents: total };
  }, [selectedProdi]);

  const handleBarClick = (entry: any) => {
    const filtered = getFilteredStudents(MOCK_STUDENTS, {
      sumberBiayaKuliah: entry.name,
      prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
    });

    const segments = SUMBER_BIAYA_OPTIONS.map(s => ({ key: s, name: s }));

    setModalData({
      title: `Sumber Biaya: ${entry.name}`,
      students: filtered,
      segments,
      selectedSegment: entry.name,
    });
    setModalOpen(true);
  };

  const handleSegmentChange = (segmentKey: string) => {
    if (segmentKey === modalData.selectedSegment) return;

    let filtered: Student[];
    let segmentName: string;

    if (segmentKey === "all") {
      filtered = getFilteredStudents(MOCK_STUDENTS, {
        prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
      });
      segmentName = "Semua";
    } else {
      filtered = getFilteredStudents(MOCK_STUDENTS, {
        sumberBiayaKuliah: segmentKey,
        prodi: selectedProdi.length > 0 ? selectedProdi : undefined,
      });
      segmentName = segmentKey;
    }

    setModalData(prev => ({
      ...prev,
      students: filtered,
      selectedSegment: segmentKey,
      title: `Sumber Biaya: ${segmentName}`,
    }));
  };

  const handleCompare = () => {
    const prodiParam = selectedProdi.length > 0
      ? selectedProdi.join(",")
      : PRODI_LIST.map(p => p.name).join(",");
    navigate(`/dashboard/compare?type=sumberBiaya&prodi=${encodeURIComponent(prodiParam)}`);
  };

  const getSegmentStats = () => {
    return chartData.map(item => ({
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
          <h3 className="font-heading font-semibold">Sumber Biaya Kuliah</h3>
          <Badge variant="secondary" className="text-xs">
            n={totalRespondents.toLocaleString()}
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

      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
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
            fontSize={11}
            width={95}
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
                    Dipilih oleh: {data.count} alumni
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
                    {seg.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                Total: {modalData.students.length}
              </span>
              {getSegmentStats().slice(0, 4).map((stat) => (
                <span
                  key={stat.name}
                  className="text-xs bg-secondary/50 px-2 py-1 rounded"
                >
                  {stat.name.length > 15 ? stat.name.substring(0, 13) + "..." : stat.name}: {stat.count} ({stat.percentage}%)
                </span>
              ))}
            </div>
          </div>
        }
        students={modalData.students}
        columns={[
          { key: "prodi", label: "Prodi" },
          { key: "sumberBiayaKuliah", label: "Sumber Biaya" },
          { key: "tahunLulus", label: "Tahun Lulus" },
        ]}
      />
    </motion.div>
  );
};

export default FundingSourceChart;
