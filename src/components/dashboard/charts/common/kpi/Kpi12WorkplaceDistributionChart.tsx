import { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MethodologyBlock } from "./Methodology";
import { MOCK_STUDENTS, Student } from "@/lib/mockData";
import { renderActivePieShape, usePieActive } from "./pieUtils";
import { formatPctCount } from "./format";

const defaultPie = [
  { name: "Lokal", value: 38, color: C.greenLight },
  { name: "Nasional", value: 47, color: C.blue },
  { name: "Multinasional", value: 15, color: C.navy },
];
const defaultGrouped = [
  { year: "2022", lokal: 42, nasional: 44, multi: 14 },
  { year: "2023", lokal: 40, nasional: 45, multi: 15 },
  { year: "2024", lokal: 38, nasional: 47, multi: 15 },
];

interface Props {
  pieData?: typeof defaultPie;
  groupedData?: typeof defaultGrouped;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
}

const Kpi12WorkplaceDistributionChart = ({
  pieData = defaultPie,
  groupedData = defaultGrouped, loading, error, isEmpty }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  const pieActive = usePieActive();
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);
  const openModal = (title: string, n: number) => setModal({ open: true, title, students: MOCK_STUDENTS.slice(0, Math.max(n, 5)) });
  return (
  <>
  <div className="grid lg:grid-cols-2 gap-4">
    <KpiCard loading={loading} error={error} empty={isEmpty} title="Sebaran Level Perusahaan" subtitle="Distribusi level perusahaan tempat kerja lulusan — periode terakhir" compareType="jenisInstansi"
      methodology={
        <MethodologyBlock
          description="Proporsi lulusan menurut level perusahaan tempat bekerja (Lokal/Nasional/Multinasional)."
          formula={<>% Level = (Lulusan Bekerja di Level X / Total Lulusan Bekerja) × 100%</>}
        />
      }>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label={(e: any) => `${e.name}: ${e.value}%`}
              activeIndex={pieActive.activeIndex} activeShape={renderActivePieShape}
              onMouseEnter={pieActive.onMouseEnter} onMouseLeave={pieActive.onMouseLeave}
              cursor="pointer" onClick={(d: any) => openModal(`${d.name} (${d.value}%)`, d.value)}>
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
    <KpiCard loading={loading} error={error} empty={isEmpty} title="Perubahan Sebaran Level Perusahaan Antar Periode" subtitle="Sumbu Y: persentase lulusan • Sumbu X: tahun kelulusan" compareType="jenisInstansi"
      methodology={
        <MethodologyBlock
          description="Tren proporsi level perusahaan tempat bekerja lulusan antar tahun kelulusan."
          formula={<>% Level per Tahun = (Lulusan Bekerja di Level X pada Tahun T / Total Lulusan Bekerja Tahun T) × 100%</>}
        />
      }>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={groupedData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="year" fontSize={12} />
            <YAxis tickFormatter={(v) => `${v}%`} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="lokal" name="Lokal" fill={C.greenLight} radius={[3, 3, 0, 0]} cursor="pointer"
              onClick={(d: any) => openModal(`Lokal — ${d.year} (${d.lokal}%)`, d.lokal)}
              activeBar={{ stroke: C.greenDark, strokeWidth: 2 } as any}>
              <LabelList dataKey="lokal" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
            <Bar dataKey="nasional" name="Nasional" fill={C.blue} radius={[3, 3, 0, 0]} cursor="pointer"
              onClick={(d: any) => openModal(`Nasional — ${d.year} (${d.nasional}%)`, d.nasional)}
              activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}>
              <LabelList dataKey="nasional" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
            <Bar dataKey="multi" name="Multinasional" fill={C.navy} radius={[3, 3, 0, 0]} cursor="pointer"
              onClick={(d: any) => openModal(`Multinasional — ${d.year} (${d.multi}%)`, d.multi)}
              activeBar={{ stroke: C.navy, strokeWidth: 2 } as any}>
              <LabelList dataKey="multi" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
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

export default Kpi12WorkplaceDistributionChart;