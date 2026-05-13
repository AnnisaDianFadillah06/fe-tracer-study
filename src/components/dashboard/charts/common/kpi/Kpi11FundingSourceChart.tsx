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
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";

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
}

const Kpi11FundingSourceChart = ({ pieData = defaultPie, groupedData = defaultGrouped }: Props) => (
  <div className="grid lg:grid-cols-2 gap-4">
    <KpiCard title="Distribusi Sumber Pembiayaan" subtitle="Periode terakhir">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label={(e: any) => `${e.name}: ${e.value}%`}>
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
    <KpiCard title="Perubahan Distribusi Antar Periode" subtitle="Grouped bar chart">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={groupedData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="year" fontSize={12} />
            <YAxis tickFormatter={(v) => `${v}%`} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="mandiri" name="Mandiri" fill={C.blueLight} radius={[3, 3, 0, 0]} />
            <Bar dataKey="pemerintah" name="Pemerintah" fill={C.green} radius={[3, 3, 0, 0]} />
            <Bar dataKey="swasta" name="Inst./Swasta" fill={C.orange} radius={[3, 3, 0, 0]} />
            <Bar dataKey="lain" name="Lainnya" fill={C.gray} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
  </div>
);

export default Kpi11FundingSourceChart;