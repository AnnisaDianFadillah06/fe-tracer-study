import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
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
import { formatPctCount, nFromPct } from "./format";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import { ReferenceArea } from "recharts";

const defaultCombo = [
  { year: "2021", value: 72, total: 220 },
  { year: "2022", value: 78, total: 240 },
  { year: "2023", value: 81, total: 250 },
  { year: "2024", value: 84, total: 260 },
];
const defaultPie = [
  { name: "Bekerja", value: 68, color: C.blue },
  { name: "Berwirausaha", value: 8, color: C.green },
  { name: "Melanjutkan Studi", value: 12, color: C.purple },
  { name: "Belum Bekerja", value: 12, color: C.gray },
];

interface Props {
  comboData?: typeof defaultCombo;
  pieData?: typeof defaultPie;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
}

const Kpi4AbsorptionChart = ({ comboData = defaultCombo, pieData = defaultPie, loading, error, isEmpty }: Props) => {
  const { tahunLulus } = useGlobalFilters();
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  const lam = useLamFilter("absorption");
  const openModal = (title: string, n: number) => setModal({ open: true, title, students: MOCK_STUDENTS.slice(0, n) });
  return (
  <>
  <div className="grid lg:grid-cols-2 gap-4">
    <KpiCard loading={loading} error={error} empty={isEmpty} title="Tren Keterserapan Lulusan" subtitle={lamSubtitle(lam)}
      compareType="absorption" headerExtra={<LamFilterControls lam={lam} />}>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={comboData} margin={{ top: 20, right: 20, left: 10, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="year" fontSize={13}
              label={{ value: "Tahun Kelulusan", position: "insideBottom", offset: -8, fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} fontSize={13}
              label={{ value: "Keterserapan (%)", angle: -90, position: "insideLeft", fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(v: number, _n, p: any) => {
                const t = p?.payload?.total ?? 0;
                return [formatPctCount(v, nFromPct(v, t), t), "Keterserapan"];
              }} />
            {tahunLulus !== "all" && (
              <ReferenceArea x1={tahunLulus} x2={tahunLulus} fill={C.orange} fillOpacity={0.12} />
            )}
            <Bar dataKey="value" name="Keterserapan" radius={[6, 6, 0, 0]} maxBarSize={50}
              cursor="pointer" onClick={(d: any) => openModal(`Keterserapan ${d.year} • ${formatPctCount(d.value, nFromPct(d.value, d.total), d.total)}`, nFromPct(d.value, d.total))}
              activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}>
              {comboData.map((d) => (
                <Cell key={d.year} fill={d.value >= lam.threshold ? C.blue : C.orange} />
              ))}
              <LabelList dataKey="value" position="center" fill="#fff" fontSize={11} formatter={(v: number) => `${v}%`} />
            </Bar>
            <Line type="monotone" dataKey="value" name="Tren" stroke={C.blueDark} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 } as any} />
            <ReferenceLine y={lam.threshold} stroke={C.red} strokeDasharray="6 3" strokeWidth={2}
              label={{ value: `${lam.level === "baik" ? "Baik" : "Unggul"} ${lam.threshold}%`, fill: C.red, fontSize: 11, position: "insideTopRight" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
    <KpiCard loading={loading} error={error} empty={isEmpty} title="Distribusi Status Keterserapan" subtitle={`Periode terakhir — total ${pieTotal}%`} compareType="status">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label={(e: any) => `${e.name}: ${e.value}%`}
              cursor="pointer" onClick={(d: any) => openModal(`${d.name} • ${formatPctCount(d.value, d.value, pieTotal)}`, d.value)}>
              {pieData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [formatPctCount(v, v, pieTotal), n]} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
  </div>
  <StudentDataModal isOpen={modal.open} onClose={() => setModal((m) => ({ ...m, open: false }))} title={modal.title} students={modal.students} columns={[]} />
  </>
  );
};

export default Kpi4AbsorptionChart;