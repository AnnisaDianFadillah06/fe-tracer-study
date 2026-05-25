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
  ReferenceLine,
  LabelList,
  Cell,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MOCK_STUDENTS, Student } from "@/lib/mockData";
import { useLamFilter, LamFilterControls, lamSubtitle } from "./useLamFilter";

const defaultCombo = [
  { year: "2021", value: 4.8 },
  { year: "2022", value: 4.2 },
  { year: "2023", value: 3.6 },
  { year: "2024", value: 3.1 },
];
const defaultDist = [
  { cat: "< 3 bulan", value: 58, color: C.green },
  { cat: "3-6 bulan", value: 28, color: C.orange },
  { cat: "> 6 bulan", value: 14, color: C.red },
];

interface Props {
  comboData?: typeof defaultCombo;
  distData?: typeof defaultDist;
  loading?: boolean;
  error?: string | null;
}

const Kpi5WaitingTimeChart = ({ comboData = defaultCombo, distData = defaultDist, loading, error }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  const lam = useLamFilter("waitingTime");
  const openModal = (title: string, n: number) => setModal({ open: true, title, students: MOCK_STUDENTS.slice(0, n) });
  return (
  <>
  <div className="grid lg:grid-cols-2 gap-4">
    <KpiCard loading={loading} error={error} title="Tren Rata-rata Masa Tunggu (Bulan)" subtitle={lamSubtitle(lam)}
      compareType="waktuTunggu" headerExtra={<LamFilterControls lam={lam} />}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={comboData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="year" fontSize={12} />
            <YAxis domain={[0, 8]} fontSize={12} tickFormatter={(v) => `${v} bln`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} bulan`} />
            <Bar dataKey="value" name="Masa Tunggu" radius={[6, 6, 0, 0]} maxBarSize={50}
              cursor="pointer" onClick={(d: any) => openModal(`Alumni ${d.year} — Rata2 ${d.value} bln`, Math.round(d.value * 20))}>
              {comboData.map((d) => (
                <Cell key={d.year} fill={d.value <= lam.threshold ? C.blue : C.orange} />
              ))}
              <LabelList dataKey="value" position="center" fill="#fff" fontSize={11} formatter={(v: number) => `${v}`} />
            </Bar>
            <Line type="monotone" dataKey="value" name="Tren" stroke={C.blueDark} strokeWidth={2.5} dot={{ r: 4 }} />
            <ReferenceLine y={lam.threshold} stroke={C.red} strokeDasharray="6 3"
              label={{ value: `${lam.level === "baik" ? "Baik" : "Unggul"} ≤ ${lam.threshold} bln`, fill: C.red, fontSize: 11, position: "insideTopRight" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
    <KpiCard loading={loading} error={error} title="Distribusi Kategori Masa Tunggu" subtitle="Periode terakhir" compareType="waktuTunggu">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={11} />
            <YAxis type="category" dataKey="cat" width={90} fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={36}
              cursor="pointer" onClick={(d: any) => openModal(`Masa tunggu ${d.cat} (${d.value}%)`, d.value)}>
              {distData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
              <LabelList dataKey="value" position="center" fill="#fff" fontSize={11} formatter={(v: number) => `${v}%`} />
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

export default Kpi5WaitingTimeChart;