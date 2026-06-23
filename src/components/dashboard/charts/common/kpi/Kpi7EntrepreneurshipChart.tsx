import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
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
import { renderActivePieShape, usePieActive } from "./pieUtils";
import { useWirausahaBar, useWirausahaPie, useWirausahaDrillDown } from "@/hooks/useWirausaha";
import DrillDownModal from "@/components/dashboard/DrillDownModal";

const CONTEXT_COLUMN = { key: "tingkat_instansi", label: "Tingkat Wirausaha" };

const PIE_COLORS = [C.green, C.greenLight, C.blueLight, C.blue, C.orange];

const Kpi7EntrepreneurshipChart = () => {
  const barHook   = useWirausahaBar();
  const pieHook   = useWirausahaPie();
  const drillHook = useWirausahaDrillDown();
  const lam       = useLamFilter("entrepreneurship");
  const pieActive = usePieActive();

  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    jabatan?: string;
    jabatanValues?: string[];
    tahunLulus?: string;
  }>({ open: false, title: "" });

  const openPieModal = (title: string, tingkat: string, jabatanValues?: string[]) => {
    setModal({ open: true, title, jabatan: tingkat, jabatanValues });
    drillHook.fetch({
      tingkat,
      ...(jabatanValues?.length ? { jabatan_values: jabatanValues } : {}),
      page: 1,
    });
  };

  const openBarModal = (title: string, tahunLulus: string) => {
    setModal({ open: true, title, tahunLulus });
    drillHook.fetch({ tahun_lulus: tahunLulus, page: 1 });
  };

  const handlePageChange = (page: number, search?: string) => {
    if (modal.jabatan) {
      drillHook.fetch({
        tingkat: modal.jabatan,
        ...(modal.jabatanValues?.length ? { jabatan_values: modal.jabatanValues } : {}),
        page, search,
      });
    } else if (modal.tahunLulus) {
      drillHook.fetch({ tahun_lulus: modal.tahunLulus, page, search });
    }
  };

  // Aggregate bar: per-prodi/tahun → per tahun
  const comboData = useMemo(() => {
    if (!barHook.data?.data) return [];
    const byTahun = new Map<string, { totalAlumni: number; totalWirausaha: number }>();
    barHook.data.data.forEach((d) => {
      const cur = byTahun.get(d.tahun_lulus) ?? { totalAlumni: 0, totalWirausaha: 0 };
      byTahun.set(d.tahun_lulus, {
        totalAlumni:    cur.totalAlumni    + (d.count_alumni   ?? 0),
        totalWirausaha: cur.totalWirausaha + (d.count_wirausaha ?? 0),
      });
    });
    return [...byTahun.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, v]) => ({
        year,
        value: v.totalAlumni > 0 ? Math.round((v.totalWirausaha / v.totalAlumni) * 100 * 10) / 10 : 0,
        n:     v.totalWirausaha,
        total: v.totalAlumni,
      }));
  }, [barHook.data]);

  // Pie: dari field `posisi` (bukan `data` atau `tingkat`) di response
  const pieData = useMemo(() => {
    if (!pieHook.data?.posisi) return [];
    return pieHook.data.posisi.map((d, i) => ({
      name:       d.label,
      value:      d.pct,
      count:      d.count,
      sub_labels: d.sub_labels,
      color:      PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [pieHook.data]);

  const isLoading   = barHook.loading || pieHook.loading;
  const hasError    = barHook.error || pieHook.error;
  const showRefLine = !lam.isDisabled && !!lam.threshold;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">
        {/* ── Bar: tren % wirausaha per tahun ── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && comboData.length === 0}
          title="Tren Persentase Wirausaha"
          subtitle={lamSubtitle(lam)}
          compareType="entrepreneurship"
          headerExtra={<LamFilterControls lam={lam} />}
          methodology={
            <MethodologyBlock
              description="Proporsi lulusan yang berstatus wirausaha dalam satu periode."
              formula={<>% Wirausaha = (Jumlah Lulusan Wirausaha / Total Lulusan Periode) × 100%</>}
              notes="Termasuk lulusan dengan usaha berbadan hukum maupun usaha mandiri yang aktif."
            />
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comboData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="year" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 20]} tickFormatter={(v) => `${v}%`} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const bar = (payload as any[]).find((p) => p.name === "Wirausaha");
                    if (!bar) return null;
                    const d = bar.payload;
                    return (
                      <div style={{ ...tooltipStyle, padding: "8px 12px" }}>
                        <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
                        <p style={{ color: bar.color }}>
                          {`Wirausaha: ${bar.value}% (${d.n}/${d.total} lulusan)`}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="value" name="Wirausaha" radius={[6, 6, 0, 0]} maxBarSize={50}
                  cursor="pointer"
                  onClick={(d: any) => openBarModal(
                    `Wirausaha — ${d.year} (${d.value}% · ${d.n}/${d.total} lulusan)`, d.year
                  )}
                  activeBar={{ stroke: C.greenDark, strokeWidth: 2 } as any}
                >
                  {comboData.map((d) => (
                    <Cell
                      key={d.year}
                      fill={showRefLine && lam.threshold ? (d.value >= lam.threshold ? C.green : C.orange) : C.green}
                    />
                  ))}
                  <LabelList dataKey="value" position="center" fill="#fff" fontSize={11} fontWeight={600} formatter={(v: number) => `${v}%`} />
                </Bar>
                <Line type="monotone" dataKey="value" stroke={C.greenDark} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 } as any} />
                {showRefLine && (
                  <ReferenceLine
                    y={lam.threshold} stroke={C.red} strokeDasharray="6 3" strokeWidth={2}
                    label={{ value: `${lam.level === "baik" ? "Baik" : "Unggul"} ${lam.threshold}%`, fill: C.red, fontSize: 11, position: "insideTopRight" }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>

        {/* ── Pie: distribusi posisi wirausaha ── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && pieData.length === 0}
          title="Distribusi Posisi Wirausaha"
          subtitle="Periode terakhir"
          compareType="entrepreneurship"
          methodology={
            <MethodologyBlock
              description="Sebaran lulusan wirausaha berdasarkan posisi/jabatan usaha."
              formula={<>% Posisi = (Jumlah Wirausaha pada Posisi / Total Wirausaha) × 100%</>}
            />
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} dataKey="value" nameKey="name" outerRadius={100}
                  label={(e: any) => `${e.name}: ${e.value}%`}
                  cursor="pointer"
                  activeIndex={pieActive.activeIndex} activeShape={renderActivePieShape}
                  onMouseEnter={pieActive.onMouseEnter} onMouseLeave={pieActive.onMouseLeave}
                  onClick={(d: any) => openPieModal(
                    `${d.name} (${d.value}% · ${d.count} alumni)`, d.name, d.sub_labels
                  )}
                >
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [`${v}%`, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>
      </div>

      {/* ── Drill-down Modal ── */}
      <DrillDownModal
        isOpen={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.title}
        data={drillHook.data}
        loading={drillHook.loading}
        error={drillHook.error}
        contextColumn={CONTEXT_COLUMN}
        onPageChange={handlePageChange}
      />
    </>
  );
};

export default Kpi7EntrepreneurshipChart;
