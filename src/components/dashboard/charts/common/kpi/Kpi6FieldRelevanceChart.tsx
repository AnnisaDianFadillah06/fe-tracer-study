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

const defaultCombo = [
  { year: "2021", value: 68 },
  { year: "2022", value: 72 },
  { year: "2023", value: 76 },
  { year: "2024", value: 79 },
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
}

const Kpi6FieldRelevanceChart = ({
  comboData = defaultCombo,
  pieData = defaultPie,
  reasonsData = defaultReasons,
}: Props) => (
  <div className="grid lg:grid-cols-2 gap-4">
    <KpiCard title="Tren Kesesuaian Bidang Kerja" subtitle="Combo chart">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={comboData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="year" fontSize={12} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
            <Bar dataKey="value" name="Kesesuaian" fill={C.blue} radius={[6, 6, 0, 0]} maxBarSize={50}>
              <LabelList dataKey="value" position="center" fill="#fff" fontSize={11} formatter={(v: number) => `${v}%`} />
            </Bar>
            <Line type="monotone" dataKey="value" stroke={C.blueDark} strokeWidth={2.5} dot={{ r: 4 }} />
            <ReferenceLine y={80} stroke={C.red} strokeDasharray="6 3" label={{ value: "LAM/BAN-PT 80%", fill: C.red, fontSize: 11, position: "insideTopRight" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
    <KpiCard title="Distribusi Tingkat Kesesuaian" subtitle="Periode terakhir">
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
    <KpiCard title="Frekuensi Alasan Ketidaksesuaian" subtitle="Horizontal bar chart" className="lg:col-span-2">
      <div style={{ height: reasonsData.length * 50 + 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={reasonsData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
            <XAxis type="number" fontSize={11} />
            <YAxis type="category" dataKey="reason" width={220} fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill={C.orange} radius={[0, 6, 6, 0]} maxBarSize={28}>
              <LabelList dataKey="value" position="right" fontSize={11} fill="hsl(var(--foreground))" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </KpiCard>
  </div>
);

export default Kpi6FieldRelevanceChart;