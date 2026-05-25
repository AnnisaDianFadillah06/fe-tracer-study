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
import { MOCK_STUDENTS, Student } from "@/lib/mockData";

const defaultPie = [
  { name: "Mandiri/Keluarga", value: 58, color: C.blueLight },
  { name: "Beasiswa Pemerintah", value: 22, color: C.green },
  { name: "Beasiswa Institusi/Swasta", value: 14, color: C.orange },
  { name: "Lainnya", value: 6, color: C.gray },
];
const defaultGrouped = [
  { year: "2022", mandiri: 62, pemerintah: 18, swasta: 12, lain: 8 },
  { year: "2023", mandiri: 60, pemerintah: 20, swasta: 13, lain: 7 },
  { year: "2024", mandiri: 58, pemerintah: 22, swasta: 14, lain: 6 },
];

interface Props {
  pieData?: typeof defaultPie;
  groupedData?: typeof defaultGrouped;
  loading?: boolean;
  error?: string | null;
}

const Kpi11FundingSourceChart = ({ pieData = defaultPie, groupedData = defaultGrouped, loading, error }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  const openModal = (title: string, n: number) => setModal({ open: true, title, students: MOCK_STUDENTS.slice(0, Math.max(n, 5)) });
  return (
  <>
  <div className="grid lg:grid-cols-2 gap-4">
    <KpiCard loading={loading} error={error} title="Distribusi Sumber Pembiayaan" subtitle="Periode terakhir" compareType="sumberBiaya">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label={(e: any) => `${e.name}: ${e.value}%`}
              cursor="pointer" onClick={(d: any) => openModal(`${d.name} (${d.value}%)`, d.value)}>
              {pieData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
    <KpiCard loading={loading} error={error} title="Perubahan Distribusi Antar Periode" subtitle="Grouped bar chart" compareType="sumberBiaya">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={groupedData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="year" fontSize={12} />
            <YAxis tickFormatter={(v) => `${v}%`} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="mandiri" name="Mandiri" fill={C.blueLight} radius={[3, 3, 0, 0]} cursor="pointer" onClick={(d: any) => openModal(`Mandiri — ${d.year} (${d.mandiri}%)`, d.mandiri)}>
              <LabelList dataKey="mandiri" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
            <Bar dataKey="pemerintah" name="Pemerintah" fill={C.green} radius={[3, 3, 0, 0]} cursor="pointer" onClick={(d: any) => openModal(`Pemerintah — ${d.year} (${d.pemerintah}%)`, d.pemerintah)}>
              <LabelList dataKey="pemerintah" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
            <Bar dataKey="swasta" name="Inst./Swasta" fill={C.orange} radius={[3, 3, 0, 0]} cursor="pointer" onClick={(d: any) => openModal(`Inst./Swasta — ${d.year} (${d.swasta}%)`, d.swasta)}>
              <LabelList dataKey="swasta" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
            </Bar>
            <Bar dataKey="lain" name="Lainnya" fill={C.gray} radius={[3, 3, 0, 0]} cursor="pointer" onClick={(d: any) => openModal(`Lainnya — ${d.year} (${d.lain}%)`, d.lain)}>
              <LabelList dataKey="lain" position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
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

export default Kpi11FundingSourceChart;