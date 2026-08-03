import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

interface MultiLineDataPoint {
  year: string;
  [key: string]: string | number;
}

interface LineConfig {
  dataKey: string;
  label: string;
  color: string;
}

interface KpiMultiLineChartProps {
  title: string;
  data: MultiLineDataPoint[];
  lines: LineConfig[];
  selectedYear: string | null;
}

const CustomDot = (props: any & { selectedYear: string | null }) => {
  const { cx, cy, payload, fill, selectedYear: sy } = props;
  const isSelected = sy && payload?.year === sy;
  const isDimmed = sy && payload?.year !== sy;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isSelected ? 8 : 5}
      fill={fill}
      stroke="hsl(var(--card))"
      strokeWidth={2}
      opacity={isDimmed ? 0.35 : 1}
    />
  );
};

const KpiMultiLineChart = ({
  title,
  data,
  lines,
  selectedYear,
}: KpiMultiLineChartProps) => {
  const subtitle = selectedYear ? `Tahun ${selectedYear}` : "Tren 3 Tahun";

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
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="year"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => {
                const line = lines.find((l) => l.dataKey === name);
                return [`${value.toFixed(1)}%`, line?.label ?? name];
              }}
            />
            <Legend
              formatter={(value: string) => {
                const line = lines.find((l) => l.dataKey === value);
                return <span className="text-xs">{line?.label ?? value}</span>;
              }}
            />

            {/* Vertical highlight line for selected year */}
            {selectedYear && (
              <ReferenceLine
                x={selectedYear}
                stroke="hsl(var(--foreground))"
                strokeDasharray="4 2"
                strokeWidth={1.5}
                opacity={0.5}
                label={{
                  value: selectedYear,
                  position: "top",
                  fill: "hsl(var(--foreground))",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}

            {lines.map((line) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={line.color}
                strokeWidth={2.5}
                strokeOpacity={selectedYear ? 0.6 : 1}
                dot={(dotProps: any) => (
                  <CustomDot {...dotProps} fill={line.color} selectedYear={selectedYear} />
                )}
                activeDot={{ r: 7 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default KpiMultiLineChart;
