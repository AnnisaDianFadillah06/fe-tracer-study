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
import { MethodologyBlock } from "./Methodology";
import { MOCK_STUDENTS, Student } from "@/lib/mockData";
import { useLamFilter, LamFilterControls, lamSubtitle } from "./useLamFilter";

const defaultAvg = [
  { year: "2021", avg: 7.2, pctAbove: 52 },
  { year: "2022", avg: 7.8, pctAbove: 58 },
  { year: "2023", avg: 8.4, pctAbove: 64 },
  { year: "2024", avg: 9.1, pctAbove: 71 },
];
const defaultDist = [
  { year: "2021", below: 48, above: 52 },
  { year: "2022", below: 42, above: 58 },
  { year: "2023", below: 36, above: 64 },
  { year: "2024", below: 29, above: 71 },
];

interface Props {
  avgData?: typeof defaultAvg;
  distData?: typeof defaultDist;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
}

const Kpi8IncomeChart = ({ avgData = defaultAvg, distData = defaultDist, loading, error, isEmpty }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  // incomePct → indicator: income_level
  const lam = useLamFilter("incomePct");
  const openModal = (title: string, n: number) => setModal({ open: true, title, students: MOCK_STUDENTS.slice(0, Math.max(n, 5)) });

  const showRefLine = !lam.isDisabled && !!lam.threshold;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">
        <KpiCard
          loading={loading} error={error} empty={isEmpty}
          title="Tren Pendapatan & % Lulusan ≥ 1,2× UMP"
          subtitle={lamSubtitle(lam)}
          compareType="income"
          headerExtra={<LamFilterControls lam={lam} />}
          methodology={
            <MethodologyBlock
              description="Mengukur rata-rata pendapatan lulusan serta proporsi yang berpendapatan ≥ 1,2× UMP daerah kerja."
              formula={
                <>
                  Rata-rata Gaji = Σ Gaji Lulusan Bekerja / Total Lulusan Bekerja<br />
                  % ≥ 1,2× UMP = (Lulusan dengan Gaji ≥ 1,2 × UMP / Total Lulusan Bekerja) × 100%
                </>
              }
              notes="UMP mengacu pada daerah lokasi kerja lulusan pada tahun pengukuran."
            />
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={avgData} margin={{ top: 30, right: 50, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="year" fontSize={13} stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Tahun Kelulusan", position: "insideBottom", offset: -8, fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  yAxisId="left" tickFormatter={(v) => `${v} jt`} fontSize={13} domain={[0, 12]} stroke={C.blue}
                  label={{ value: "Rata-rata Gaji (Juta Rp)", angle: -90, position: "insideLeft", fontSize: 12, fill: C.blue }}
                />
                <YAxis
                  yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} fontSize={13} domain={[0, 100]} stroke={C.red}
                  label={{ value: "% Lulusan ≥ 1,2× UMP", angle: 90, position: "insideRight", fontSize: 12, fill: C.red }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n) => n === "Rata-rata Gaji" ? [`Rp ${v} jt`, n] : [`${v}%`, n]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="left" dataKey="avg" name="Rata-rata Gaji" fill={C.blue} radius={[6, 6, 0, 0]} maxBarSize={60}
                  cursor="pointer"
                  onClick={(d: any) => openModal(`Pendapatan ${d.year} — Rata2 Rp ${d.avg} jt`, Math.round(d.avg * 10))}
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}
                >
                  <LabelList dataKey="avg" position="center" fill="#fff" fontSize={12} fontWeight={600} formatter={(v: number) => `${v}jt`} />
                </Bar>
                <Line
                  yAxisId="right" type="monotone" dataKey="pctAbove" name="% ≥ 1,2× UMP"
                  stroke={C.red} strokeWidth={2.5} dot={{ r: 5, fill: C.red }}
                />
                {showRefLine && (
                  <ReferenceLine
                    yAxisId="right" y={lam.threshold} stroke={C.red} strokeDasharray="6 3" strokeWidth={2}
                    label={{
                      value: `Target ${lam.level === "baik" ? "Baik" : "Unggul"} ≥ ${lam.threshold}%`,
                      fill: C.red, fontSize: 12, fontWeight: 600, position: "insideTopRight",
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>

        <KpiCard
          loading={loading} error={error} empty={isEmpty}
          title="Proporsi Lulusan Berdasar UMP"
          subtitle="Dua kelompok: < 1,2× UMP vs ≥ 1,2× UMP per tahun"
          compareType="income"
          methodology={
            <MethodologyBlock
              description="Membagi lulusan bekerja ke dua kelompok pendapatan berdasarkan ambang 1,2× UMP."
              formula={<>% Kelompok = (Lulusan pada Kelompok / Total Lulusan Bekerja) × 100%</>}
            />
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} margin={{ top: 30, right: 20, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="year" fontSize={13} stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Tahun Kelulusan", position: "insideBottom", offset: -8, fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`} fontSize={13} domain={[0, 100]}
                  label={{ value: "Persentase Lulusan (%)", angle: -90, position: "insideLeft", fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="below" name="< 1,2× UMP" fill={C.orange} radius={[3, 3, 0, 0]}
                  cursor="pointer"
                  onClick={(d: any) => openModal(`< 1,2× UMP — ${d.year} (${d.below}%)`, d.below)}
                  activeBar={{ stroke: "hsl(20 90% 45%)", strokeWidth: 2 } as any}
                >
                  <LabelList dataKey="below" position="center" fontSize={12} fontWeight={600} fill="#fff" formatter={(v: number) => `${v}%`} />
                </Bar>
                <Bar
                  dataKey="above" name="≥ 1,2× UMP" fill={C.blue} radius={[3, 3, 0, 0]}
                  cursor="pointer"
                  onClick={(d: any) => openModal(`≥ 1,2× UMP — ${d.year} (${d.above}%)`, d.above)}
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}
                >
                  <LabelList dataKey="above" position="center" fontSize={12} fontWeight={600} fill="#fff" formatter={(v: number) => `${v}%`} />
                </Bar>
              </BarChart>
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

export default Kpi8IncomeChart;