import {
  ResponsiveContainer,
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

const defaultData = [
  { prodi: "T. Elektro", responded: 72, notResponded: 28 },
  { prodi: "T. Mesin", responded: 65, notResponded: 35 },
  { prodi: "T. Sipil", responded: 58, notResponded: 42 },
  { prodi: "T. Kimia", responded: 81, notResponded: 19 },
  { prodi: "T. Informatika", responded: 76, notResponded: 24 },
  { prodi: "Akuntansi", responded: 49, notResponded: 51 },
  { prodi: "Adm. Niaga", responded: 55, notResponded: 45 },
];

interface Props {
  data?: typeof defaultData;
  title?: string;
  subtitle?: string;
}

const Kpi1ParticipationChart = ({
  data = defaultData,
  title = "Response Rate per Program Studi",
  subtitle = "Realtime — periode aktif",
}: Props) => (
  <KpiCard title={title} subtitle={subtitle}>
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
          <XAxis dataKey="prodi" fontSize={11} stroke="hsl(var(--muted-foreground))" />
          <YAxis tickFormatter={(v) => `${v}%`} fontSize={11} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="responded" name="Sudah Merespons" stackId="a" fill={C.blue}>
            <LabelList dataKey="responded" position="center" fill="#fff" fontSize={10} formatter={(v: number) => `${v}%`} />
          </Bar>
          <Bar dataKey="notResponded" name="Belum Merespons" stackId="a" fill={C.gray} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </KpiCard>
);

export default Kpi1ParticipationChart;