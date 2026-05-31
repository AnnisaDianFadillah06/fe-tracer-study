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
import { formatPctCount, markMax, nFromPct } from "./format";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import { ReferenceArea } from "recharts";

const defaultData = [
  { year: "2020", rate: 42, total: 1320 },
  { year: "2021", rate: 48, total: 1410 },
  { year: "2022", rate: 55, total: 1505 },
  { year: "2023", rate: 61, total: 1602 },
  { year: "2024", rate: 68, total: 1692 },
];

interface Props {
  data?: typeof defaultData;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
}

const Kpi3ParticipationTrendChart = ({
  data = defaultData,
  title = "Tren Response Rate Antar Periode",
  subtitle, loading, error, isEmpty }: Props) => {
  const effective = data && data.length > 0 ? data : defaultData;
  const isDataEmpty = isEmpty || (data?.length === 0);
  const { tahunLulus } = useGlobalFilters();
  const marked = markMax(effective, "rate");
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  const lam = useLamFilter("participation");
  const handleClick = (entry: any) => {
    if (!entry) return;
    const rate = entry.rate;
    const n = nFromPct(rate, entry.total ?? 0);
    const sample = MOCK_STUDENTS.slice(0, Math.max(n, 5));
    setModal({ open: true, title: `Alumni Merespons — ${entry.year} • ${formatPctCount(rate, n, entry.total ?? 0)}`, students: sample });
  };
  const avg = effective.reduce((s, d) => s + d.rate, 0) / effective.length;
  return (
  <>
  <KpiCard loading={loading} error={error} empty={isDataEmpty} title={title} subtitle={subtitle ?? lamSubtitle(lam)}
    compareType="participation-trend" headerExtra={<LamFilterControls lam={lam} />}>
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={marked} margin={{ top: 30, right: 30, left: 10, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey="year" fontSize={13} stroke="hsl(var(--muted-foreground))"
            label={{ value: "Tahun Kelulusan", position: "insideBottom", offset: -8, fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} fontSize={13} stroke="hsl(var(--muted-foreground))"
            label={{ value: "Response Rate (%)", angle: -90, position: "insideLeft", fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip contentStyle={tooltipStyle}
            formatter={(v: number, _n, p: any) => {
              const total = p?.payload?.total ?? 0;
              return [formatPctCount(v, nFromPct(v, total), total), "Response Rate"];
            }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {tahunLulus !== "all" && (
            <ReferenceArea x1={tahunLulus} x2={tahunLulus} fill={C.orange} fillOpacity={0.12}
              label={{ value: "Filter aktif", fontSize: 10, fill: C.orange, position: "insideTop" }} />
          )}
          <Bar dataKey="rate" name="Response Rate" radius={[6, 6, 0, 0]} maxBarSize={60}
            cursor="pointer" onClick={(d: any) => handleClick(d)}
            activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}>
            {marked.map((d: any) => (
              <Cell key={d.year} fill={d.isMax ? C.blueDark : d.rate >= lam.threshold ? C.blue : C.orange}
                stroke={d.isMax ? C.orange : undefined} strokeWidth={d.isMax ? 2 : 0} />
            ))}
            <LabelList dataKey="rate" position="center" formatter={(v: number) => `${v}%`}
              style={{ fontSize: 11, fontWeight: 600, fill: "#fff" }} />
            <LabelList dataKey="isMax" position="top" content={(p: any) =>
              p.value ? <text x={p.x + p.width / 2} y={p.y - 6} fontSize={10} fontWeight={700} fill={C.orange} textAnchor="middle">↑ Tertinggi</text> : null
            } />
          </Bar>
          <Line type="monotone" dataKey="rate" name="Tren" stroke="#06b6d4" strokeWidth={2}
            dot={{ r: 5, fill: "#06b6d4", strokeWidth: 2, stroke: "hsl(var(--card))" } as any}
            activeDot={{ r: 7 } as any} />
          <ReferenceLine y={lam.threshold} stroke={C.red} strokeDasharray="6 3" strokeWidth={2}
            label={{ value: `${lam.level === "baik" ? "Baik" : "Unggul"} ${lam.threshold}%`, fill: C.red, fontSize: 11, position: "insideTopRight" }} />
          <ReferenceLine y={avg} stroke={C.purple} strokeDasharray="4 2" strokeWidth={2}
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