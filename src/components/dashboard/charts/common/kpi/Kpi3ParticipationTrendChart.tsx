import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";

const defaultData = [
  { year: "2020", rate: 42 },
  { year: "2021", rate: 48 },
  { year: "2022", rate: 55 },
  { year: "2023", rate: 61 },
  { year: "2024", rate: 68 },
];

interface Props {
  data?: typeof defaultData;
  title?: string;
  subtitle?: string;
}

const Kpi3ParticipationTrendChart = ({
  data = defaultData,
  title = "Tren Response Rate Antar Periode",
  subtitle = "Garis tren 5 tahun terakhir",
}: Props) => (
  <KpiCard title={title} subtitle={subtitle}>
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey="year" fontSize={12} stroke="hsl(var(--muted-foreground))" />
          <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} fontSize={12} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={30} stroke={C.red} strokeDasharray="6 3" label={{ value: "PDDIKTI 30%", fill: C.red, fontSize: 11, position: "insideTopLeft" }} />
          <ReferenceLine y={50} stroke={C.orange} strokeDasharray="6 3" label={{ value: "LAM/BAN-PT 50%", fill: C.orange, fontSize: 11, position: "insideTopRight" }} />
          <Line type="monotone" dataKey="rate" name="Response Rate" stroke={C.blue} strokeWidth={3} dot={{ r: 5, fill: C.blue }} activeDot={{ r: 7 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </KpiCard>
);

export default Kpi3ParticipationTrendChart;