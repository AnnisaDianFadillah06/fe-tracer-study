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
import { MethodologyBlock } from "./Methodology";
import { MOCK_STUDENTS, Student } from "@/lib/mockData";
import { useLamFilter, LamFilterControls, lamSubtitle } from "./useLamFilter";

const defaultCombo = [
  { year: "2021", pct: 62, n: 124, total: 200 },
  { year: "2022", pct: 70, n: 154, total: 220 },
  { year: "2023", pct: 78, n: 187, total: 240 },
  { year: "2024", pct: 85, n: 221, total: 260 },
];
const defaultDist = [
  { cat: "< 3 bulan", value: 58, color: C.green },
  { cat: "3-6 bulan", value: 28, color: C.blue },
  { cat: "> 6 bulan", value: 14, color: C.orange },
];

interface Props {
  comboData?: typeof defaultCombo;
  distData?: typeof defaultDist;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
}

const Kpi5WaitingTimeChart = ({ comboData = defaultCombo, distData = defaultDist, loading, error, isEmpty }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  const lam = useLamFilter("waitingTime");
  const openModal = (title: string, n: number) => setModal({ open: true, title, students: MOCK_STUDENTS.slice(0, n) });

  // Hanya tampilkan ReferenceLine jika threshold tersedia (prodi spesifik)
  const showRefLine = !lam.isDisabled && !!lam.threshold;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">
        <KpiCard
          loading={loading} error={error} empty={isEmpty}
          title="% Lulusan Mendapat Kerja dalam ≤ 6 Bulan"
          subtitle={lamSubtitle(lam)}
          compareType="waktuTunggu"
          headerExtra={<LamFilterControls lam={lam} />}
          methodology={
            <MethodologyBlock
              description="Mengukur kecepatan lulusan memperoleh pekerjaan pertama setelah lulus."
              formula={<>% ≤ 6 Bulan = (Jumlah Lulusan dengan Masa Tunggu ≤ 6 Bulan / Total Lulusan Bekerja) × 100%</>}
              notes="Masa tunggu dihitung dari bulan kelulusan ke bulan mulai pekerjaan pertama."
            />
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comboData} margin={{ top: 30, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="year" fontSize={13} stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Tahun Kelulusan", position: "insideBottom", offset: -8, fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  domain={[0, 100]} fontSize={13} stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${v}%`}
                  label={{ value: "% Lulusan ≤ 6 bln", angle: -90, position: "insideLeft", fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, _name, p: any) => [`${v}% (${p.payload.n}/${p.payload.total} lulusan)`, "≤ 6 bulan"]}
                />
                <Bar
                  dataKey="pct" name="% ≤ 6 bln" radius={[6, 6, 0, 0]} maxBarSize={60}
                  cursor="pointer"
                  onClick={(d: any) => openModal(`Lulusan ≤ 6 bln — ${d.year} (${d.pct}% • ${d.n}/${d.total})`, d.n)}
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}
                >
                  {comboData.map((d) => (
                    <Cell
                      key={d.year}
                      fill={showRefLine && lam.threshold ? (d.pct >= lam.threshold ? C.blue : C.orange) : C.blue}
                    />
                  ))}
                  <LabelList dataKey="pct" position="center" fill="#fff" fontSize={12} fontWeight={600} formatter={(v: number) => `${v}%`} />
                </Bar>
                <Line type="monotone" dataKey="pct" name="Tren" stroke={C.blueDark} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 } as any} />
                {showRefLine && (
                  <ReferenceLine
                    y={lam.threshold} stroke={C.red} strokeDasharray="6 3" strokeWidth={2}
                    label={{ value: `Target ${lam.level === "baik" ? "Baik" : "Unggul"} ≥ ${lam.threshold}%`, fill: C.red, fontSize: 12, fontWeight: 600, position: "insideTopRight" }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>

        <KpiCard
          loading={loading} error={error} empty={isEmpty}
          title="Distribusi Kategori Masa Tunggu"
          subtitle="Periode terakhir — sumbu X: % lulusan"
          compareType="waktuTunggu"
          methodology={
            <MethodologyBlock
              description="Proporsi lulusan menurut kategori rentang masa tunggu kerja."
              formula={<>% Kategori = (Jumlah Lulusan pada Kategori / Total Lulusan Bekerja) × 100%</>}
            />
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                <XAxis
                  type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={13}
                  label={{ value: "Persentase Lulusan (%)", position: "insideBottom", offset: -8, fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis type="category" dataKey="cat" width={100} fontSize={13} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                <Bar
                  dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={40}
                  cursor="pointer"
                  onClick={(d: any) => openModal(`Masa tunggu ${d.cat} (${d.value}%)`, d.value)}
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}
                >
                  {distData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                  <LabelList dataKey="value" position="center" fill="#fff" fontSize={12} fontWeight={600} formatter={(v: number) => `${v}%`} />
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

export default Kpi5WaitingTimeChart;