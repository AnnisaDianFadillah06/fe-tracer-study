import { useState } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, Sector } from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import { MethodologyBlock } from "./Methodology";
import { useResponseRatePie, useResponseRateDrillDown, statusNameToKey } from "@/hooks/useResponseRate";
import { formatPctCount } from "./format";
import DrillDownModal from "@/components/dashboard/DrillDownModal";

const STATUS_COLORS: Record<string, string> = {
  "Selesai": C.green,
  "Sedang Mengisi": C.orange,
  "Belum Mengisi": C.red,
};

const RENDER_LABEL = ({ cx, cy, midAngle, outerRadius, name, value, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 25;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.03) return null;
  return (
    <text x={x} y={y} fill="hsl(var(--foreground))" fontSize={11}
      textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
      {name}: {value}
    </text>
  );
};

const Kpi2CompletionStatusChart = () => {
  const { data, loading, error } = useResponseRatePie();
  const drillHook = useResponseRateDrillDown();
  const [activeIdx, setActiveIdx] = useState<number | undefined>();
  const [modal, setModal] = useState<{ open: boolean; title: string; status: string }>({ open: false, title: "", status: "" });

  const chartData = data?.data ?? [];
  const total = data?.total ?? chartData.reduce((s, d) => s + d.value, 0);
  const isEmpty = !loading && chartData.length === 0;
  const subtitleText = `Total target ${total.toLocaleString("id-ID")} alumni`;

  const handleClick = (entry: any) => {
    const statusKey = statusNameToKey(entry.name);
    const pct = total > 0 ? Math.round(entry.value / total * 100) : 0;
    setModal({ open: true, title: `${entry.name} — ${pct}% (${entry.value} alumni)`, status: statusKey });
    drillHook.fetch({ status: statusKey, page: 1 });
  };

  const renderActive = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8}
          startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={13} fontWeight={600}>{payload.name}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>
          {value} ({total > 0 ? Math.round(value / total * 100) : 0}%)
        </text>
      </g>
    );
  };

  return (
    <>
      <KpiCard loading={loading} error={error} empty={isEmpty}
        title="Status Pengisian Survei per Alumni" subtitle={subtitleText}
        compareType="completion"
        methodology={
          <MethodologyBlock
            description="Status penyelesaian pengisian tracer study oleh alumni."
            formula={<>% Status = (Jumlah Alumni pada Status / Total Alumni Target) × 100%</>}
            notes="Selesai = submitted, Sedang Mengisi = draft/on-going, Belum Mengisi = belum ada respons."
          />
        }>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={110}
                paddingAngle={3}
                cursor="pointer"
                activeIndex={activeIdx}
                activeShape={renderActive}
                onMouseEnter={(_, i) => setActiveIdx(i)}
                onMouseLeave={() => setActiveIdx(undefined)}
                onClick={handleClick}
                label={RENDER_LABEL}
                labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
              >
                {chartData.map((d, i) => (
                  <Cell key={i} fill={STATUS_COLORS[d.name] ?? C.gray} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle}
                formatter={(v: number, n) => [formatPctCount(total > 0 ? Math.round(v / total * 100) : 0, v, total), n]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </KpiCard>

      <DrillDownModal
        isOpen={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.title}
        data={drillHook.data as any}
        loading={drillHook.loading}
        error={drillHook.error}
        contextColumn={{ key: "status", label: "Status" }}
        onPageChange={(page, search) => drillHook.fetch({ status: modal.status, page, search })}
      />
    </>
  );
};

export default Kpi2CompletionStatusChart;
