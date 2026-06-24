import { useState, useMemo, useCallback } from "react";
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
  ReferenceLine,
  LabelList,
  Cell,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import { MethodologyBlock } from "./Methodology";
import { useLamFilter, LamFilterControls, lamSubtitle } from "./useLamFilter";
import { useMasaTungguBar, useMasaTungguDistribusi, useMasaTungguDrillDown } from "@/hooks/useMasaTunggu";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import DrillDownModal from "@/components/dashboard/DrillDownModal";
import { buildColorMap } from "@/lib/chartColors";

const CONTEXT_COLUMN = { key: "masa_tunggu_bekerja", label: "Masa Tunggu (bln)" };

const Kpi5WaitingTimeChart = () => {
  const barHook        = useMasaTungguBar();
  const distribusiHook = useMasaTungguDistribusi();
  const drillHook      = useMasaTungguDrillDown();
  const lam            = useLamFilter("waitingTime");

  const { tahunLulus } = useGlobalFilters();

  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    rentang?: "0-3" | "3-6" | ">6";
    tahun_lulus?: string;
  }>({ open: false, title: "" });

  const openModal = (title: string, rentang: "0-3" | "3-6" | ">6", tahun?: string) => {
    setModal({ open: true, title, rentang, tahun_lulus: tahun });
    drillHook.fetch({ rentang, tahun_lulus: tahun, page: 1 });
  };

  const handlePageChange = useCallback((page: number, search?: string) => {
    if (!modal.rentang) return;
    drillHook.fetch({ rentang: modal.rentang, tahun_lulus: modal.tahun_lulus, page, search });
  }, [modal.rentang, modal.tahun_lulus, drillHook]);

  // Aggregate bar data: per-prodi/tahun → per tahun (sum count, hitung pct)
  const comboData = useMemo(() => {
    if (!barHook.data?.data) return [];
    const byTahun = new Map<string, { total: number; totalCepat: number }>();
    barHook.data.data.forEach((d) => {
      const cur = byTahun.get(d.tahun_lulus) ?? { total: 0, totalCepat: 0 };
      byTahun.set(d.tahun_lulus, {
        total:      cur.total      + d.count_alumni,
        totalCepat: cur.totalCepat + d.count_masa_tunggu_cepat,
      });
    });
    return [...byTahun.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, v]) => ({
        year,
        pct:   v.total > 0 ? Math.round((v.totalCepat / v.total) * 100 * 10) / 10 : 0,
        n:     v.totalCepat,
        total: v.total,
      }));
  }, [barHook.data]);

  // Aggregate distribusi: semua prodi/tahun → total per rentang
  const distData = useMemo(() => {
    if (!distribusiHook.data?.data) return [];
    let t03 = 0, t36 = 0, t6plus = 0;
    distribusiHook.data.data.forEach((d) => {
      t03    += d.count_tunggu_0_3_bulan;
      t36    += d.count_tunggu_3_6_bulan;
      t6plus += d.count_tunggu_lebih_6_bulan;
    });
    const total = t03 + t36 + t6plus || 1;
    const colorMap = buildColorMap(["< 3 bulan", "3-6 bulan", "> 6 bulan"]);
    return [
      { cat: "< 3 bulan", value: Math.round(t03    / total * 100 * 10) / 10, count: t03,    total, rentang: "0-3"  as const, color: colorMap["< 3 bulan"] },
      { cat: "3-6 bulan", value: Math.round(t36    / total * 100 * 10) / 10, count: t36,    total, rentang: "3-6"  as const, color: colorMap["3-6 bulan"] },
      { cat: "> 6 bulan", value: Math.round(t6plus / total * 100 * 10) / 10, count: t6plus, total, rentang: ">6"   as const, color: colorMap["> 6 bulan"] },
    ];
  }, [distribusiHook.data]);

  const latestYear = comboData.length > 0 ? comboData[comboData.length - 1].year : undefined;
  const distTahun = tahunLulus === "all" ? latestYear : tahunLulus;

  const showRefLine = !lam.isDisabled && !!lam.threshold;
  const isLoading   = barHook.loading || distribusiHook.loading;
  const hasError    = barHook.error || distribusiHook.error;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">
        {/* ── Bar: tren % ≤ 6 bulan ── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && comboData.length === 0}
          title="% Lulusan Mendapat Kerja dalam ≤ 6 Bulan"
          subtitle={lamSubtitle(lam)}
          compareType="waktuTunggu"
          headerExtra={<LamFilterControls lam={lam} />}
          methodology={
            <MethodologyBlock
              description="Mengukur kecepatan lulusan memperoleh pekerjaan pertama setelah lulus."
              formula={<>% ≤ 6 Bulan = (Jumlah Lulusan dengan Masa Tunggu ≤ 6 Bulan / Total Lulusan Bekerja) × 100%</>}
              notes="Masa tunggu dihitung dari bulan kelulusan ke bulan mulai pekerjaan pertama."
            />
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comboData} margin={{ top: 30, right: 30, left: 20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis
                  dataKey="year" fontSize={13} stroke="hsl(var(--muted-foreground))"
                  label={{ value: "Tahun Kelulusan", position: "insideBottom", offset: -8, fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  domain={[0, 100]} fontSize={13} stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `${v}%`}
                  label={{ value: "% Lulusan ≤ 6 bln", angle: -90, position: "insideLeft", fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, _name, p: any) =>
                    [`${v}% (${p.payload.n}/${p.payload.total} lulusan)`, "≤ 6 bulan"]
                  }
                />
                <Bar
                  dataKey="pct" name="% ≤ 6 bln" radius={[6, 6, 0, 0]} maxBarSize={60}
                  cursor="pointer"
                  onClick={(d: any) => openModal(
                    `Lulusan ≤ 6 bln — ${d.year} (${d.pct}% • ${d.n}/${d.total})`, "0-3", d.year
                  )}
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}
                >
                  {comboData.map((d) => (
                    <Cell
                      key={d.year}
                      fill={showRefLine && lam.threshold ? (d.pct >= lam.threshold ? C.blue : C.orange) : C.blue}
                    />
                  ))}
                  <LabelList dataKey="pct" position="center" fill="#fff" fontSize={12} fontWeight={600} formatter={(v: number) => `${v}%`} />
                </Bar>
                <Line type="monotone" dataKey="pct" name="Tren" stroke={C.blueDark} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 } as any} />
                {showRefLine && (
                  <ReferenceLine
                    y={lam.threshold} stroke={C.red} strokeDasharray="6 3" strokeWidth={2}
                    label={{ value: `Target ${lam.level === "baik" ? "Baik" : "Unggul"} ≥ ${lam.threshold}%`, fill: C.red, fontSize: 12, fontWeight: 600, position: "insideTopRight" }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>

        {/* ── Bar horizontal: distribusi rentang ── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && distData.length === 0}
          title="Distribusi Kategori Masa Tunggu"
          subtitle={distTahun ? `Tahun kelulusan ${distTahun} — sumbu X: % lulusan` : "Semua periode aktif — sumbu X: % lulusan"}
          compareType="waktuTunggu"
          methodology={
            <MethodologyBlock
              description="Proporsi lulusan menurut kategori rentang masa tunggu kerja."
              formula={<>% Kategori = (Jumlah Lulusan pada Kategori / Total Lulusan Bekerja) × 100%</>}
            />
          }
        >
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                <XAxis
                  type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={13}
                  label={{ value: "Persentase Lulusan (%)", position: "insideBottom", offset: -8, fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis type="category" dataKey="cat" width={100} fontSize={13} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                <Bar
                  dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={40}
                  cursor="pointer"
                  onClick={(d: any) => openModal(`Masa tunggu ${d.cat} (${d.value}% · ${d.count} alumni)`, d.rentang, distTahun)}
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}
                >
                  {distData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  <LabelList dataKey="value" position="center" fill="#fff" fontSize={12} fontWeight={600} formatter={(v: number) => `${v}%`} />
                </Bar>
              </BarChart>
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

export default Kpi5WaitingTimeChart;
