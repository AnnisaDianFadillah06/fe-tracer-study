import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LabelList,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MOCK_STUDENTS, Student } from "@/lib/mockData";
import { useLamFilter, LamFilterControls, lamSubtitle } from "./useLamFilter";

const defaultData = [
  { year: "2020", rate: 42 },
  { year: "2021", rate: 48 },
  { year: "2022", rate: 55 },
  { year: "2023", rate: 61 },
  { year: "2024", rate: 68 },
];

interface Props {
  data?: typeof defaultData;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
}

const Kpi3ParticipationTrendChart = ({
  data = defaultData,
  title = "Tren Response Rate Antar Periode",
  subtitle = "Garis tren 5 tahun terakhir", loading, error }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  const lam = useLamFilter("participation");
  const handleClick = (entry: any) => {
    if (!entry) return;
    const rate = entry.rate;
    const sample = MOCK_STUDENTS.slice(0, Math.round((rate / 100) * 80));
    setModal({ open: true, title: `Alumni Merespons — ${entry.year} (${rate}%)`, students: sample });
  };
  const avg = data.reduce((s, d) => s + d.rate, 0) / data.length;
  return (
  <>
  <KpiCard loading={loading} error={error} title={title} subtitle={lamSubtitle(lam)}
    compareType="participation-trend" headerExtra={<LamFilterControls lam={lam} />}>
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 30, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey="year" fontSize={12} stroke="hsl(var(--muted-foreground))" />
          <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} fontSize={12} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="rate" name="Response Rate" radius={[6, 6, 0, 0]} maxBarSize={60}
            cursor="pointer" onClick={(d: any) => handleClick(d)}>
            {data.map((d) => (
              <Cell key={d.year} fill={d.rate >= lam.threshold ? C.blue : C.orange} />
            ))}
            <LabelList dataKey="rate" position="center" formatter={(v: number) => `${v}%`}
              style={{ fontSize: 11, fontWeight: 600, fill: "#fff" }} />
          </Bar>
          <Line type="monotone" dataKey="rate" name="Tren" stroke="#06b6d4" strokeWidth={2}
            dot={{ r: 5, fill: "#06b6d4", strokeWidth: 2, stroke: "hsl(var(--card))" } as any}
            activeDot={{ r: 7 } as any} />
          <ReferenceLine y={lam.threshold} stroke={C.red} strokeDasharray="6 3"
            label={{ value: `${lam.level === "baik" ? "Baik" : "Unggul"} ${lam.threshold}%`, fill: C.red, fontSize: 11, position: "insideTopRight" }} />
          <ReferenceLine y={avg} stroke={C.purple} strokeDasharray="4 2"
            label={{ value: `Rata-rata ${avg.toFixed(1)}%`, fill: C.purple, fontSize: 11, position: "insideBottomRight" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
    <p className="text-xs text-muted-foreground mt-2 text-center">Klik bar untuk drill-down alumni</p>
  </KpiCard>
  <StudentDataModal isOpen={modal.open} onClose={() => setModal((m) => ({ ...m, open: false }))} title={modal.title} students={modal.students} columns={[]} />
  </>
  );
};

export default Kpi3ParticipationTrendChart;