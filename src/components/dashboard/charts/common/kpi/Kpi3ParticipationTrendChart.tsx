import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LabelList,
  ReferenceArea,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import { useLamFilter, LamFilterControls, lamSubtitle } from "./useLamFilter";
import { formatPctCount, markMax, nFromPct } from "./format";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import { MethodologyBlock } from "./Methodology";
import { useResponseRateTrend, useResponseRateDrillDown } from "@/hooks/useResponseRate";
import DrillDownModal from "@/components/dashboard/DrillDownModal";

const Kpi3ParticipationTrendChart = () => {
  const { tahunLulus } = useGlobalFilters();
  const { data, loading, error } = useResponseRateTrend();
  const drillHook = useResponseRateDrillDown();
  const lam = useLamFilter("participation");
  const [modal, setModal] = useState<{ open: boolean; title: string; status: string }>({ open: false, title: "", status: "" });

  const chartData = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((d) => ({
      year: String(d.year),
      rate: d.rate,
      total: d.total,
    }));
  }, [data]);

  const marked = markMax(chartData, "rate");
  const isEmpty = !loading && chartData.length === 0;
  const avg = chartData.length > 0
    ? chartData.reduce((s, d) => s + d.rate, 0) / chartData.length
    : 0;

  return (
    <>
    <KpiCard loading={loading} error={error} empty={isEmpty}
      title="Tren Response Rate Antar Periode"
      subtitle={lamSubtitle(lam)}
      compareType="participation-trend"
      headerExtra={<LamFilterControls lam={lam} />}
      methodology={
        <MethodologyBlock
          description="Response Rate Tracer Study — proporsi lulusan yang mengisi kuesioner tracer dalam satu periode kelulusan."
          formula={<>Response Rate (%) = (Jumlah Lulusan Merespons / Total Lulusan Periode) × 100%</>}
          notes="Periode dihitung berdasarkan tahun kelulusan terpilih pada filter global."
        />
      }>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={marked} margin={{ top: 30, right: 60, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="year" fontSize={13} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} fontSize={13} stroke="hsl(var(--muted-foreground))"
              label={{ value: "Response Rate (%)", angle: -90, position: "insideLeft", fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(v: number, _n: any, p: any) => {
                const total = p?.payload?.total ?? 0;
                return [formatPctCount(v, nFromPct(v, total), total), "Response Rate"];
              }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {tahunLulus !== "all" && (
              <ReferenceArea x1={tahunLulus} x2={tahunLulus} fill="hsl(var(--foreground))" fillOpacity={0.06}
                stroke="hsl(var(--foreground))" strokeOpacity={0.3} strokeDasharray="3 3" />
            )}
            {marked.filter((d: any) => d.isMax).map((d: any) => (
              <ReferenceArea key={`max-${d.year}`} x1={d.year} x2={d.year}
                fill="hsl(45 95% 55%)" fillOpacity={0.14}
                stroke="hsl(45 95% 45%)" strokeOpacity={0.55} strokeDasharray="4 2" />
            ))}
            <Bar dataKey="rate" name="Response Rate" radius={[6, 6, 0, 0]} maxBarSize={60}
              cursor="pointer"
              onClick={(d: any) => {
                const total = d.total ?? 0;
                const n = Math.round((d.rate / 100) * total);
                setModal({ open: true, title: `Alumni Merespons — ${d.year} (${n}/${total})`, status: "submitted" });
                drillHook.fetch({ status: "submitted", page: 1 });
              }}
              activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}>
              {marked.map((d: any) => (
                <Cell key={d.year} fill={d.rate >= lam.threshold ? C.blue : C.orange} />
              ))}
              <LabelList dataKey="rate" position="center" formatter={(v: number) => `${v}%`}
                style={{ fontSize: 13, fontWeight: 700, fill: "#fff" }} />
              <LabelList dataKey="isMax" position="top" content={(p: any) =>
                p.value ? <text x={p.x + p.width / 2} y={p.y - 6} fontSize={11} fontWeight={700} fill="hsl(38 92% 38%)" textAnchor="middle">★ Tertinggi</text> : null
              } />
            </Bar>
            <Line type="monotone" dataKey="rate" name="Tren" stroke="#06b6d4" strokeWidth={2}
              dot={{ r: 5, fill: "#06b6d4", strokeWidth: 2, stroke: "hsl(var(--card))" } as any}
              activeDot={{ r: 7 } as any} />
            {!lam.isDisabled && !!lam.threshold && (
              <ReferenceLine y={lam.threshold} stroke={C.red} strokeDasharray="6 3" strokeWidth={2}
                label={{ value: `${lam.level === "baik" ? "Baik" : "Unggul"} ${lam.threshold}%`, fill: C.red, fontSize: 11, position: "insideTopRight" }} />
            )}
            <ReferenceLine y={avg} stroke={C.purple} strokeDasharray="4 2" strokeWidth={2}
              label={{ value: `Rata-rata ${Number.isInteger(avg) ? avg : avg.toFixed(1)}%`, fill: C.purple, fontSize: 11, position: "insideTopRight" }} />
          </ComposedChart>
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

export default Kpi3ParticipationTrendChart;
