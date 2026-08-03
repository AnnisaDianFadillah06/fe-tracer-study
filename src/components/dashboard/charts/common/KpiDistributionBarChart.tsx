import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

interface KpiDistributionData {
  category: string;
  value: number;
  color: string;
}

interface KpiDistributionBarChartProps {
  title: string;
  data: KpiDistributionData[];
  selectedYear: string | null;
}

const CenterLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (width < 30) return null;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="#fff"
      fontSize={10}
      fontWeight={600}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {value?.toFixed(1)}%
    </text>
  );
};

const KpiDistributionBarChart = ({
  title,
  data,
  selectedYear,
}: KpiDistributionBarChartProps) => {
  const subtitle = selectedYear
    ? `Tahun ${selectedYear}`
    : "Agregasi 3 Tahun";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 h-full"
    >
      <div className="mb-4">
        <h3 className="font-heading font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div style={{ height: Math.max(data.length * 50 + 40, 200) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
            <XAxis
              type="number"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={130}
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
            />
            <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={30}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
              <LabelList content={CenterLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default KpiDistributionBarChart;
