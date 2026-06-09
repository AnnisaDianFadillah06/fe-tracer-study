import { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
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
import { renderActivePieShape, usePieActive } from "./pieUtils";
import { formatPctCount, nFromPct } from "./format";

const defaultCombo = [
  { year: "2021", value: 68, total: 220 },
  { year: "2022", value: 72, total: 240 },
  { year: "2023", value: 76, total: 250 },
  { year: "2024", value: 79, total: 260 },
];
const defaultPie = [
  { name: "Sangat Erat", value: 38, color: C.greenDark },
  { name: "Erat", value: 28, color: C.green },
  { name: "Cukup Erat", value: 18, color: C.orange },
  { name: "Kurang Erat", value: 10, color: C.orangeLight },
  { name: "Tidak Sama Sekali", value: 6, color: C.red },
];
const defaultReasons = [
  { reason: "Gaji lebih tinggi di bidang lain", value: 38 },
  { reason: "Tidak tersedia lowongan sesuai", value: 27 },
  { reason: "Minat berubah pasca lulus", value: 18 },
  { reason: "Lokasi kerja lebih dekat", value: 11 },
  { reason: "Pengembangan karier lebih luas", value: 6 },
];

interface Props {
  comboData?: typeof defaultCombo;
  pieData?: typeof defaultPie;
  reasonsData?: typeof defaultReasons;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
}

const Kpi6FieldRelevanceChart = ({
  comboData = defaultCombo,
  pieData = defaultPie,
  reasonsData = defaultReasons,
  loading, error, isEmpty,
}: Props) => {
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  const lam = useLamFilter("fieldRelevance");
  const pieActive = usePieActive();
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);
  const openModal = (title: string, n: number) => setModal({ open: true, title, students: MOCK_STUDENTS.slice(0, Math.max(n, 5)) });

  const showRefLine = !lam.isDisabled && !!lam.threshold;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">
        <KpiCard
          loading={loading} error={error} empty={isEmpty}
          title="Tren Kesesuaian Bidang Kerja"
          subtitle={lamSubtitle(lam)}
          compareType="kesesuaian"
          headerExtra={<LamFilterControls lam={lam} />}
          methodology={
            <MethodologyBlock
              description="Mengukur kesesuaian bidang pekerjaan lulusan terhadap bidang studi."
              formula={<>Kesesuaian (%) = ((Sangat Erat + Erat) / Total Lulusan Bekerja) × 100%</>}
              notes="Kategori jawaban: Sangat Erat, Erat, Cukup Erat, Kurang, Tidak Erat."
            />
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comboData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="year" fontSize={12} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, _n, p: any) => {
                    const t = p?.payload?.total ?? 0;
                    return [formatPctCount(v, nFromPct(v, t), t), "Kesesuaian"];
                  }}
                />
                <Bar
                  dataKey="value" name="Kesesuaian" radius={[6, 6, 0, 0]} maxBarSize={50}
                  cursor="pointer"
                  onClick={(d: any) => openModal(`Kesesuaian ${d.year} (${d.value}%)`, d.value)}
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}
                >
                  {comboData.map((d) => (
                    <Cell
                      key={d.year}
                      fill={showRefLine && lam.threshold ? (d.value >= lam.threshold ? C.blue : C.orange) : C.blue}
                    />
                  ))}
                  <LabelList dataKey="value" position="center" fill="#fff" fontSize={11} formatter={(v: number) => `${v}%`} />
                </Bar>
                <Line type="monotone" dataKey="value" stroke={C.blueDark} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 } as any} />
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
          title="Distribusi Tingkat Kesesuaian"
          subtitle="Periode terakhir"
          compareType="kesesuaian"
          methodology={
            <MethodologyBlock
              description="Sebaran lulusan menurut tingkat keeratan bidang kerja dengan bidang studi."
              formula={<>% Tingkat = (Jumlah Lulusan pada Tingkat / Total Lulusan Bekerja) × 100%</>}
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

        <KpiCard
          loading={loading} error={error} empty={isEmpty}
          title="Frekuensi Alasan Ketidaksesuaian"
          subtitle="Horizontal bar chart"
          className="lg:col-span-2"
          compareType="kesesuaian"
          methodology={
            <MethodologyBlock
              description="Frekuensi alasan lulusan memilih pekerjaan di luar bidang studi."
              formula={<>Frekuensi Alasan X = Jumlah Responden yang Memilih Alasan X</>}
              notes="Responden dapat memilih lebih dari satu alasan."
            />
          }
        >
          <div style={{ height: reasonsData.length * 50 + 40 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonsData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="reason" width={220} fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, "Frekuensi"]} />
                <Bar
                  dataKey="value" fill={C.orange} radius={[0, 6, 6, 0]} maxBarSize={28}
                  cursor="pointer"
                  onClick={(d: any) => openModal(`Alasan: ${d.reason}`, d.value)}
                  activeBar={{ stroke: "hsl(20 90% 45%)", strokeWidth: 2 } as any}
                >
                  <LabelList dataKey="value" position="right" fontSize={11} fill="hsl(var(--foreground))" />
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

export default Kpi6FieldRelevanceChart;