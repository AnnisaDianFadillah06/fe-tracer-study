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
}

const Kpi12WorkplaceDistributionChart = ({
  pieData = defaultPie,
  groupedData = defaultGrouped,
}: Props) => (
  <div className="grid lg:grid-cols-2 gap-4">
    <KpiCard title="Distribusi Level Instansi Tempat Kerja" subtitle="Periode terakhir">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label={(e: any) => `${e.name}: ${e.value}%`}>
              {pieData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
    <KpiCard title="Perubahan Sebaran Antar Periode" subtitle="Grouped bar chart">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={groupedData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="year" fontSize={12} />
            <YAxis tickFormatter={(v) => `${v}%`} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="lokal" name="Lokal" fill={C.greenLight} radius={[3, 3, 0, 0]} />
            <Bar dataKey="nasional" name="Nasional" fill={C.blue} radius={[3, 3, 0, 0]} />
            <Bar dataKey="multi" name="Multinasional" fill={C.navy} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
  </div>
);

export default Kpi12WorkplaceDistributionChart;