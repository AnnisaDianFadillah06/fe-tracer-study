import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";

const defaultData = [
  { name: "Selesai", value: 612, color: C.green },
  { name: "Sedang Mengisi", value: 184, color: C.orange },
  { name: "Belum Mengisi", value: 297, color: C.red },
];

interface Props {
  data?: typeof defaultData;
  title?: string;
  subtitle?: string;
}

const Kpi2CompletionStatusChart = ({
  data = defaultData,
  title = "Status Pengisian Survei per Alumni",
  subtitle = "Total target 1.093 alumni",
}: Props) => (
  <KpiCard title={title} subtitle={subtitle}>
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={60}
            outerRadius={110}
            paddingAngle={3}
            label={(e: any) => `${e.name}: ${e.value}`}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </KpiCard>
);

export default Kpi2CompletionStatusChart;