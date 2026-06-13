import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
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
import { MethodologyBlock } from "./Methodology";
import { useLamFilter, LamFilterControls, lamSubtitle } from "./useLamFilter";
import {
  usePendapatanBar,
  usePendapatanDistribusi,
  usePendapatanDrillDown,
  PendapatanDrillDownParams,
} from "@/hooks/usePendapatan";
import DrillDownModal from "@/components/dashboard/DrillDownModal";

const Kpi8IncomeChart = () => {
  const barHook   = usePendapatanBar();
  const distHook  = usePendapatanDistribusi();
  const drillHook = usePendapatanDrillDown();
  const lam       = useLamFilter("incomePct");

  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    fetchParams: PendapatanDrillDownParams;
  }>({ open: false, title: "", fetchParams: {} });

  const openModal = (title: string, fetchParams: PendapatanDrillDownParams) => {
    setModal({ open: true, title, fetchParams });
    drillHook.fetch({ ...fetchParams, page: 1 });
  };

  // Map BE response → format yang dipakai chart
  const avgData = useMemo(
    () =>
      (barHook.data?.data ?? []).map((d) => ({
        year:     d.tahun_lulus,
        avg:      Math.round((d.avg_gaji / 1_000_000) * 100) / 100,
        pctAbove: d.pct_above_ump,
      })),
    [barHook.data]
  );

  const distData = useMemo(
    () =>
      (distHook.data?.data ?? []).map((d) => ({
        year:  d.tahun_lulus,
        below: d.pct_below_ump,
        above: d.pct_above_ump,
      })),
    [distHook.data]
  );

  const showRefLine = !lam.isDisabled && !!lam.threshold;
  const isEmpty     = !barHook.loading  && !barHook.error  && avgData.length  === 0;
  const isEmpty2    = !distHook.loading && !distHook.error && distData.length === 0;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">
        {/* ── Grafik 1: Tren rata-rata gaji + % ≥ 1,2× UMP ── */}
        <KpiCard
          loading={barHook.loading}
          error={barHook.error}
          empty={isEmpty}
          title="Tren Pendapatan & % Lulusan ≥ 1,2× UMP"
          subtitle={lamSubtitle(lam)}
          compareType="income-kelompok"
          headerExtra={<LamFilterControls lam={lam} />}
          methodology={
            <MethodologyBlock
              description="Mengukur rata-rata pendapatan lulusan serta proporsi yang berpendapatan ≥ 1,2× UMP daerah kerja."
              formula={
                <>
                  Rata-rata Gaji = Σ Gaji Lulusan Bekerja / Total Lulusan Bekerja<br />
                  % ≥ 1,2× UMP = (Lulusan dengan Gaji ≥ 1,2 × UMP / Total Lulusan Bekerja) × 100%
                </>
              }
              notes="UMP mengacu pada daerah lokasi kerja lulusan pada tahun pengukuran."
            />
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={avgData} margin={{ top: 30, right: 50, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="year"
                  fontSize={13}
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Tahun Kelulusan", position: "insideBottom", offset: -8, fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  yAxisId="left"
                  tickFormatter={(v) => `${v} jt`}
                  fontSize={13}
                  domain={[0, "auto"]}
                  stroke={C.blue}
                  label={{ value: "Rata-rata Gaji (Juta Rp)", angle: -90, position: "insideLeft", fontSize: 12, fill: C.blue }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${v}%`}
                  fontSize={13}
                  domain={[0, 100]}
                  stroke={C.red}
                  label={{ value: "% Lulusan ≥ 1,2× UMP", angle: 90, position: "insideRight", fontSize: 12, fill: C.red }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n) =>
                    n === "Rata-rata Gaji" ? [`Rp ${v.toFixed(2)} jt`, n] : [`${v}%`, n]
                  }
                />
                <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                <Bar
                  yAxisId="left"
                  dataKey="avg"
                  name="Rata-rata Gaji"
                  fill={C.blue}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={60}
                  cursor="pointer"
                  onClick={(d: any) =>
                    openModal(`Pendapatan Lulusan ${d.year}`, { tahun_lulus: d.year })
                  }
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}
                >
                  <LabelList
                    dataKey="avg"
                    position="center"
                    fill="#fff"
                    fontSize={12}
                    fontWeight={600}
                    formatter={(v: number) => `${v.toFixed(1)}jt`}
                  />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="pctAbove"
                  name="% ≥ 1,2× UMP"
                  stroke={C.red}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: C.red }}
                />
                {showRefLine && (
                  <ReferenceLine
                    yAxisId="right"
                    y={lam.threshold}
                    stroke={C.red}
                    strokeDasharray="6 3"
                    strokeWidth={2}
                    label={{
                      value: `Target ${lam.level === "baik" ? "Baik" : "Unggul"} ≥ ${lam.threshold}%`,
                      fill: C.red,
                      fontSize: 12,
                      fontWeight: 600,
                      position: "insideTopRight",
                    }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>

        {/* ── Grafik 2: Proporsi < UMP vs ≥ UMP ── */}
        <KpiCard
          loading={distHook.loading}
          error={distHook.error}
          empty={isEmpty2}
          title="Proporsi Lulusan Berdasar UMP"
          subtitle="Dua kelompok: < 1,2× UMP vs ≥ 1,2× UMP per tahun"
          compareType="income"
          methodology={
            <MethodologyBlock
              description="Membagi lulusan bekerja ke dua kelompok pendapatan berdasarkan ambang 1,2× UMP."
              formula={<>% Kelompok = (Lulusan pada Kelompok / Total Lulusan Bekerja) × 100%</>}
            />
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} margin={{ top: 30, right: 20, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="year"
                  fontSize={13}
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Tahun Kelulusan", position: "insideBottom", offset: -8, fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickFormatter={(v) => `${v}%`}
                  fontSize={13}
                  domain={[0, 100]}
                  label={{ value: "Persentase Lulusan (%)", angle: -90, position: "insideLeft", fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
                <Bar
                  dataKey="below"
                  name="< 1,2× UMP"
                  fill={C.orange}
                  radius={[3, 3, 0, 0]}
                  cursor="pointer"
                  onClick={(d: any) =>
                    openModal(`Alumni < 1,2× UMP — ${d.year}`, { segmen_ump: "below_ump", tahun_lulus: d.year })
                  }
                  activeBar={{ stroke: "hsl(20 90% 45%)", strokeWidth: 2 } as any}
                >
                  <LabelList dataKey="below" position="center" fontSize={12} fontWeight={600} fill="#fff" formatter={(v: number) => `${v}%`} />
                </Bar>
                <Bar
                  dataKey="above"
                  name="≥ 1,2× UMP"
                  fill={C.blue}
                  radius={[3, 3, 0, 0]}
                  cursor="pointer"
                  onClick={(d: any) =>
                    openModal(`Alumni ≥ 1,2× UMP — ${d.year}`, { segmen_ump: "above_ump", tahun_lulus: d.year })
                  }
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}
                >
                  <LabelList dataKey="above" position="center" fontSize={12} fontWeight={600} fill="#fff" formatter={(v: number) => `${v}%`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>
      </div>

      <DrillDownModal
        isOpen={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.title}
        data={drillHook.data as any}
        loading={drillHook.loading}
        error={drillHook.error}
        contextColumn={{ key: "perusahaan", label: "Perusahaan" }}
        onPageChange={(page, search) =>
          drillHook.fetch({ ...modal.fetchParams, page, search })
        }
      />
    </>
  );
};

export default Kpi8IncomeChart;
