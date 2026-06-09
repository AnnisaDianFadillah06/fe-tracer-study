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
import { MethodologyBlock } from "./Methodology";
import { MOCK_STUDENTS, Student } from "@/lib/mockData";
import { useLamFilter, LamFilterControls, lamSubtitle } from "./useLamFilter";
import { renderActivePieShape, usePieActive } from "./pieUtils";
import { formatPctCount } from "./format";

const defaultCombo = [
  { year: "2021", value: 4 },
  { year: "2022", value: 6 },
  { year: "2023", value: 8 },
  { year: "2024", value: 11 },
];
const defaultPie = [
  { name: "Owner", value: 42, color: C.green },
  { name: "Co-founder", value: 28, color: C.greenLight },
  { name: "Freelancer", value: 18, color: C.blueLight },
  { name: "Lainnya", value: 12, color: C.blue },
];

interface Props {
  comboData?: typeof defaultCombo;
  pieData?: typeof defaultPie;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
}

const Kpi7EntrepreneurshipChart = ({ comboData = defaultCombo, pieData = defaultPie, loading, error, isEmpty }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  const lam = useLamFilter("entrepreneurship");
  const pieActive = usePieActive();
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);
  const openModal = (title: string, n: number) => setModal({ open: true, title, students: MOCK_STUDENTS.slice(0, Math.max(n, 5)) });

  const showRefLine = !lam.isDisabled && !!lam.threshold;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">
        <KpiCard
          loading={loading} error={error} empty={isEmpty}
          title="Tren Persentase Wirausaha"
          subtitle={lamSubtitle(lam)}
          compareType="entrepreneurship"
          headerExtra={<LamFilterControls lam={lam} />}
          methodology={
            <MethodologyBlock
              description="Proporsi lulusan yang berstatus wirausaha (owner/co-founder) dalam satu periode."
              formula={<>% Wirausaha = (Jumlah Lulusan Berstatus Wirausaha / Total Lulusan Periode) × 100%</>}
              notes="Termasuk lulusan dengan usaha berbadan hukum maupun usaha mandiri yang aktif."
            />
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comboData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="year" fontSize={12} />
                <YAxis domain={[0, 20]} tickFormatter={(v) => `${v}%`} fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Wirausaha"]} />
                <Bar
                  dataKey="value" name="Wirausaha" radius={[6, 6, 0, 0]} maxBarSize={50}
                  cursor="pointer"
                  onClick={(d: any) => openModal(`Wirausaha ${d.year} (${d.value}%)`, d.value * 3)}
                  activeBar={{ stroke: C.greenDark, strokeWidth: 2 } as any}
                >
                  {comboData.map((d) => (
                    <Cell
                      key={d.year}
                      fill={showRefLine && lam.threshold ? (d.value >= lam.threshold ? C.green : C.orange) : C.green}
                    />
                  ))}
                  <LabelList dataKey="value" position="center" fill="#fff" fontSize={11} formatter={(v: number) => `${v}%`} />
                </Bar>
                <Line type="monotone" dataKey="value" stroke={C.greenDark} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 } as any} />
                {showRefLine && (
                  <ReferenceLine
                    y={lam.threshold} stroke={C.red} strokeDasharray="6 3"
                    label={{ value: `${lam.level === "baik" ? "Baik" : "Unggul"} ${lam.threshold}%`, fill: C.red, fontSize: 11, position: "insideTopRight" }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>

        <KpiCard
          loading={loading} error={error} empty={isEmpty}
          title="Distribusi Posisi Wirausaha"
          subtitle="Periode terakhir"
          compareType="entrepreneurship"
          methodology={
            <MethodologyBlock
              description="Sebaran posisi/peran lulusan wirausaha."
              formula={<>% Posisi = (Jumlah Wirausaha pada Posisi / Total Lulusan Wirausaha) × 100%</>}
            />
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} dataKey="value" nameKey="name" outerRadius={100}
                  label={(e: any) => `${e.name}: ${e.value}%`}
                  activeIndex={pieActive.activeIndex} activeShape={renderActivePieShape}
                  onMouseEnter={pieActive.onMouseEnter} onMouseLeave={pieActive.onMouseLeave}
                  cursor="pointer" onClick={(d: any) => openModal(`${d.name} (${d.value}%)`, d.value)}
                >
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [formatPctCount(v, v, pieTotal), n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>
      </div>
      <StudentDataModal
        isOpen={modal.open} onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.title} students={modal.students} columns={[]}
      />
    </>
  );
};

export default Kpi7EntrepreneurshipChart;