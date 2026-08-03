import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LabelList,
} from "recharts";
import { Check, X } from "lucide-react";

interface KpiStackedData {
  name: string;
  positive: number;
  negative: number;
}

interface LamThreshold {
  name: string;
  threshold: number;
}

interface KpiStackedBarChartProps {
  title: string;
  data: KpiStackedData[];
  positiveLabel: string;
  negativeLabel: string;
  threshold?: number;
  thresholdLabel?: string;
  selectedYear: string | null;
  lamThresholds?: LamThreshold[];
}

type ThresholdMode = "ban-pt" | "lam";

// Custom label renderer for positive bar - shows value + LAM icon inside the bar end
const PositiveLabelInside = (props: any) => {
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

const NegativeLabelInside = (props: any) => {
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

const KpiStackedBarChart = ({
  title,
  data,
  positiveLabel,
  negativeLabel,
  threshold,
  thresholdLabel = "Threshold",
  selectedYear,
  lamThresholds,
}: KpiStackedBarChartProps) => {
  const [mode, setMode] = useState<ThresholdMode>("ban-pt");
  const hasLam = lamThresholds && lamThresholds.length > 0;

  const subtitle = selectedYear ? `Tahun ${selectedYear}` : "Agregasi 3 Tahun";

  const getLamThreshold = (prodiName: string): number | undefined => {
    return lamThresholds?.find((l) => l.name === prodiName)?.threshold;
  };

  // Custom tick for LAM mode: show check/x icon at end of positive bar
  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, height, index } = props;
    if (mode !== "lam" || !hasLam) return null;
    const entry = data[index];
    if (!entry) return null;
    const lamT = getLamThreshold(entry.name);
    if (lamT === undefined) return null;
    const met = entry.positive >= lamT;

    // Icon inside the bar end
    const iconX = x + width - 14;
    const iconY = y + height / 2 - 6;

    return (
      <g>
        {/* Check/X icon inside bar end */}
        <foreignObject x={iconX} y={iconY} width={12} height={12}>
          {met ? (
            <div style={{ color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
          ) : (
            <div style={{ color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </div>
          )}
        </foreignObject>
      </g>
    );
  };

  // Custom label at the end of the full bar showing LAM threshold
  const renderLamThresholdLabel = (props: any) => {
    const { x, y, width, height, index } = props;
    if (mode !== "lam" || !hasLam) return null;
    const entry = data[index];
    if (!entry) return null;
    const lamT = getLamThreshold(entry.name);
    if (lamT === undefined) return null;
    const met = entry.positive >= lamT;

    // Position outside the full bar (x + total bar width is at 100%)
    return (
      <text
        x={x + width + 4}
        y={y + height / 2}
        fill={met ? "#10b981" : "#ef4444"}
        fontSize={10}
        fontWeight={600}
        textAnchor="start"
        dominantBaseline="central"
      >
        {lamT}%
      </text>
    );
  };

  const chartHeight = Math.max(data.length * 36 + 40, 200);
  const maxScrollHeight = 400;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 h-full flex flex-col"
    >
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-heading font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {hasLam && (
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as ThresholdMode)}
            className="text-xs px-2 py-1.5 rounded-md border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary shrink-0"
          >
            <option value="ban-pt">BAN-PT</option>
            <option value="lam">LAM Masing-masing</option>
          </select>
        )}
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{ maxHeight: maxScrollHeight }}
      >
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: mode === "lam" ? 50 : 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
                horizontal={false}
              />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
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
                formatter={(value: number, name: string) => [
                  `${value.toFixed(1)}%`,
                  name === "positive" ? positiveLabel : negativeLabel,
                ]}
              />

              <Bar dataKey="positive" stackId="a" radius={[0, 0, 0, 0]} name="positive">
                {data.map((entry, i) => {
                  let fill = "#10b981";
                  if (mode === "ban-pt" && threshold) {
                    fill = entry.positive >= threshold ? "#10b981" : "#ef4444";
                  } else if (mode === "lam" && hasLam) {
                    const lamT = getLamThreshold(entry.name);
                    fill = lamT !== undefined && entry.positive < lamT ? "#ef4444" : "#10b981";
                  }
                  return <Cell key={i} fill={fill} />;
                })}
                <LabelList content={PositiveLabelInside} />
                {mode === "lam" && <LabelList content={renderCustomBarLabel} />}
              </Bar>
              <Bar dataKey="negative" stackId="a" fill="#6b7280" radius={[0, 4, 4, 0]} name="negative">
                <LabelList content={NegativeLabelInside} />
                {mode === "lam" && <LabelList content={renderLamThresholdLabel} />}
              </Bar>

              {/* BAN-PT threshold line in FRONT (rendered last) */}
              {mode === "ban-pt" && threshold && (
                <ReferenceLine
                  x={threshold}
                  stroke="#f59e0b"
                  strokeDasharray="6 3"
                  strokeWidth={2}
                  label={{
                    value: `${thresholdLabel}: ${threshold}%`,
                    position: "top",
                    fill: "#f59e0b",
                    fontSize: 10,
                  }}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-xs text-muted-foreground">{positiveLabel}</span>
        </div>
        {mode === "ban-pt" && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span className="text-xs text-muted-foreground">Di bawah target</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-gray-500" />
          <span className="text-xs text-muted-foreground">{negativeLabel}</span>
        </div>
        {mode === "lam" && (
          <>
            <div className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-xs text-muted-foreground">Tercapai</span>
            </div>
            <div className="flex items-center gap-1.5">
              <X className="w-3 h-3 text-red-500" />
              <span className="text-xs text-muted-foreground">Belum tercapai</span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default KpiStackedBarChart;
