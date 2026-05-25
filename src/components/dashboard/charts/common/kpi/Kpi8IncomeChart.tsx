import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
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
import { Cell } from "recharts";

const defaultAvg = [
  { year: "2021", avg: 7.2 },
  { year: "2022", avg: 7.8 },
  { year: "2023", avg: 8.4 },
  { year: "2024", avg: 9.1 },
];
const defaultDist = [
  { year: "2021", lt5: 22, b5_8: 38, b8_12: 24, gt12: 16 },
  { year: "2022", lt5: 18, b5_8: 36, b8_12: 28, gt12: 18 },
  { year: "2023", lt5: 14, b5_8: 34, b8_12: 30, gt12: 22 },
  { year: "2024", lt5: 10, b5_8: 30, b8_12: 33, gt12: 27 },
];

interface Props {
  avgData?: typeof defaultAvg;
  distData?: typeof defaultDist;
  loading?: boolean;
  error?: string | null;
}

const Kpi8IncomeChart = ({ avgData = defaultAvg, distData = defaultDist, loading, error }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  const lam = useLamFilter("income");
  const openModal = (title: string, n: number) => setModal({ open: true, title, students: MOCK_STUDENTS.slice(0, Math.max(n, 5)) });
  return (
  <>
  <div className="grid lg:grid-cols-2 gap-4">
    <KpiCard loading={loading} error={error} title="Tren Rata-rata Pendapatan (Juta Rp)" subtitle={lamSubtitle(lam)}
      compareType="income" headerExtra={<LamFilterControls lam={lam} />}>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={avgData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="year" fontSize={12} />
            <YAxis tickFormatter={(v) => `${v} jt`} fontSize={12} domain={[0, 12]} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} jt`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="avg" name="Rata-rata Pendapatan" radius={[6, 6, 0, 0]} maxBarSize={60}
              cursor="pointer" onClick={(d: any) => openModal(`Pendapatan ${d.year} — Rata2 Rp ${d.avg} jt`, Math.round(d.avg * 10))}>
              {avgData.map((d) => (
                <Cell key={d.year} fill={d.avg >= lam.threshold ? C.blue : C.orange} />
              ))}
              <LabelList dataKey="avg" position="center" fill="#fff" fontSize={11} formatter={(v: number) => `${v} jt`} />
            </Bar>
            <Line type="monotone" dataKey="avg" name="Tren" stroke={C.blueDark} strokeWidth={2.5} dot={{ r: 4 }} />
            <ReferenceLine y={lam.threshold} stroke={C.red} strokeDasharray="6 3"
              label={{ value: `${lam.level === "baik" ? "Baik" : "Unggul"} ${lam.threshold} jt`, fill: C.red, fontSize: 11, position: "insideTopRight" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
    <KpiCard loading={loading} error={error} title="Distribusi Kelompok Pendapatan Antar Periode" subtitle="Grouped bar chart — proporsi tiap kelompok pendapatan per tahun" compareType="income">
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="year" fontSize={12} />
            <YAxis tickFormatter={(v) => `${v}%`} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="lt5" name="< 5 jt" fill={C.blueLight} radius={[3, 3, 0, 0]} cursor="pointer" onClick={(d: any) => openModal(`< 5 jt — ${d.year} (${d.lt5}%)`, d.lt5)}>
              <LabelList dataKey="lt5" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
            <Bar dataKey="b5_8" name="5-8 jt" fill={C.blue} radius={[3, 3, 0, 0]} cursor="pointer" onClick={(d: any) => openModal(`5-8 jt — ${d.year} (${d.b5_8}%)`, d.b5_8)}>
              <LabelList dataKey="b5_8" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
            <Bar dataKey="b8_12" name="8-12 jt" fill={C.blueDark} radius={[3, 3, 0, 0]} cursor="pointer" onClick={(d: any) => openModal(`8-12 jt — ${d.year} (${d.b8_12}%)`, d.b8_12)}>
              <LabelList dataKey="b8_12" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
            <Bar dataKey="gt12" name="> 12 jt" fill={C.navy} radius={[3, 3, 0, 0]} cursor="pointer" onClick={(d: any) => openModal(`> 12 jt — ${d.year} (${d.gt12}%)`, d.gt12)}>
              <LabelList dataKey="gt12" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
  </div>
  <StudentDataModal isOpen={modal.open} onClose={() => setModal((m) => ({ ...m, open: false }))} title={modal.title} students={modal.students} columns={[]} />
  </>
  );
};

export default Kpi8IncomeChart;