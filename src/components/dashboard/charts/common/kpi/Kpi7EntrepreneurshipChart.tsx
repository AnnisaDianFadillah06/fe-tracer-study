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
}

const Kpi7EntrepreneurshipChart = ({ comboData = defaultCombo, pieData = defaultPie }: Props) => (
  <div className="grid lg:grid-cols-2 gap-4">
    <KpiCard title="Tren Persentase Wirausaha" subtitle="Combo chart">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={comboData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="year" fontSize={12} />
            <YAxis domain={[0, 20]} tickFormatter={(v) => `${v}%`} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
            <Bar dataKey="value" name="Wirausaha" fill={C.green} radius={[6, 6, 0, 0]} maxBarSize={50}>
              <LabelList dataKey="value" position="center" fill="#fff" fontSize={11} formatter={(v: number) => `${v}%`} />
            </Bar>
            <Line type="monotone" dataKey="value" stroke={C.greenDark} strokeWidth={2.5} dot={{ r: 4 }} />
            <ReferenceLine y={5} stroke={C.red} strokeDasharray="6 3" label={{ value: "LAM/BAN-PT 5%", fill: C.red, fontSize: 11, position: "insideTopRight" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
    <KpiCard title="Distribusi Posisi Wirausaha" subtitle="Periode terakhir">
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
  </div>
);

export default Kpi7EntrepreneurshipChart;