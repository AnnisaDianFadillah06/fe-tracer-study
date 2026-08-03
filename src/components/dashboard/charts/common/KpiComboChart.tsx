import { motion } from "framer-motion";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LabelList,
} from "recharts";

interface KpiComboData {
  year: string;
  value: number;
}

interface KpiComboChartProps {
  title: string;
  data: KpiComboData[];
  threshold: number;
  thresholdLabel?: string;
  selectedYear: string | null;
  onYearClick: (year: string | null) => void;
  unit?: string;
}

const KpiComboChart = ({
  title,
  data,
  threshold,
  thresholdLabel = "Threshold",
  selectedYear,
  onYearClick,
  unit = "%",
}: KpiComboChartProps) => {
  const average = data.reduce((sum, d) => sum + d.value, 0) / data.length;

  const handleBarClick = (entry: any) => {
    if (!entry?.year) return;
    onYearClick(selectedYear === entry.year ? null : entry.year);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 h-full"
    >
      <h3 className="font-heading font-semibold text-sm mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 25, right: 20, left: 0, bottom: 5 }}>
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
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value.toFixed(1)}${unit}`, ""]}
            />

            {/* Bar first (behind) */}
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              onClick={handleBarClick}
              style={{ cursor: "pointer" }}
              maxBarSize={60}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.year}
                  fill={
                    selectedYear === entry.year
                      ? "#10b981"
                      : entry.value >= threshold
                      ? "hsl(var(--primary))"
                      : "#ef4444"
                  }
                  opacity={selectedYear && selectedYear !== entry.year ? 0.4 : 1}
                />
              ))}
              <LabelList
                dataKey="value"
                position="center"
                formatter={(v: number) => `${v.toFixed(1)}${unit}`}
                style={{ fontSize: 11, fontWeight: 600, fill: "#fff" }}
              />
            </Bar>

            <Line
              type="monotone"
              dataKey="value"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={{ r: 5, fill: "#06b6d4", strokeWidth: 2, stroke: "hsl(var(--card))" }}
              activeDot={{ r: 7 }}
            />

            {/* Reference lines last (in front) */}
            <ReferenceLine
              y={threshold}
              stroke="#f59e0b"
              strokeDasharray="6 3"
              strokeWidth={2}
              ifOverflow="extendDomain"
              label={{
                value: `${thresholdLabel}: ${threshold}%`,
                position: "insideTopRight",
                fill: "#f59e0b",
                fontSize: 11,
              }}
            />

            <ReferenceLine
              y={average}
              stroke="#8b5cf6"
              strokeDasharray="4 2"
              strokeWidth={1.5}
              ifOverflow="extendDomain"
              label={{
                value: `Rata-rata: ${average.toFixed(1)}%`,
                position: "insideBottomRight",
                fill: "#8b5cf6",
                fontSize: 11,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Klik bar untuk drill-down per prodi
        {selectedYear && (
          <span className="ml-2 text-primary font-medium">
            — Tahun {selectedYear} dipilih
            <button
              onClick={() => onYearClick(null)}
              className="ml-1 underline hover:text-primary/80"
            >
              (reset)
            </button>
          </span>
        )}
      </p>
    </motion.div>
  );
};

export default KpiComboChart;
