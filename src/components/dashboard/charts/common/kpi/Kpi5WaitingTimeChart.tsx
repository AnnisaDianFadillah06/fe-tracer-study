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

const defaultCombo = [
  { year: "2021", value: 4.8 },
  { year: "2022", value: 4.2 },
  { year: "2023", value: 3.6 },
  { year: "2024", value: 3.1 },
];
const defaultDist = [
  { cat: "< 3 bulan", value: 58, color: C.green },
  { cat: "3-6 bulan", value: 28, color: C.orange },
  { cat: "> 6 bulan", value: 14, color: C.red },
];

interface Props {
  comboData?: typeof defaultCombo;
  distData?: typeof defaultDist;
}

const Kpi5WaitingTimeChart = ({ comboData = defaultCombo, distData = defaultDist }: Props) => (
  <div className="grid lg:grid-cols-2 gap-4">
    <KpiCard title="Tren Rata-rata Masa Tunggu (Bulan)" subtitle="Combo chart">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={comboData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="year" fontSize={12} />
            <YAxis domain={[0, 8]} fontSize={12} tickFormatter={(v) => `${v} bln`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} bulan`} />
            <Bar dataKey="value" name="Masa Tunggu" fill={C.blue} radius={[6, 6, 0, 0]} maxBarSize={50}>
              <LabelList dataKey="value" position="center" fill="#fff" fontSize={11} formatter={(v: number) => `${v}`} />
            </Bar>
            <Line type="monotone" dataKey="value" name="Tren" stroke={C.blueDark} strokeWidth={2.5} dot={{ r: 4 }} />
            <ReferenceLine y={3} stroke={C.red} strokeDasharray="6 3" label={{ value: "LAM/BAN-PT ≤ 3 bln", fill: C.red, fontSize: 11, position: "insideTopRight" }} />
            <ReferenceLine y={4.0} stroke={C.gray} strokeDasharray="4 2" label={{ value: "Rata2 institusi", fill: C.gray, fontSize: 11, position: "insideBottomRight" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
    <KpiCard title="Distribusi Kategori Masa Tunggu" subtitle="Periode terakhir">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={11} />
            <YAxis type="category" dataKey="cat" width={90} fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={36}>
              {distData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
              <LabelList dataKey="value" position="center" fill="#fff" fontSize={11} formatter={(v: number) => `${v}%`} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
  </div>
);

export default Kpi5WaitingTimeChart;