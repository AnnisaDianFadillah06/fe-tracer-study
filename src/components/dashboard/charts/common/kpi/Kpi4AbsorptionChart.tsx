import { useState, useMemo } from "react";
import {
  ResponsiveContainer, ComposedChart, PieChart, Pie, Cell,
  Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, LabelList, ReferenceArea,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import { MethodologyBlock } from "./Methodology";
import { markMax } from "./format";
import { useLamFilter, LamFilterControls, lamSubtitle } from "./useLamFilter";
import { renderActivePieShape, usePieActive } from "./pieUtils";
import { formatPctCount } from "./format";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import { useKeterserapanBar, useKeterserapanPie, useKeterserapanDrillDown } from "@/hooks/useKeterserapan";
import { buildColorMap, getShortLabel } from "@/lib/chartColors";
import DrillDownModal from "@/components/dashboard/DrillDownModal";

const Kpi4AbsorptionChart = () => {
  const { tahunLulus } = useGlobalFilters();
  const lam = useLamFilter("absorption");

  const barHook   = useKeterserapanBar();
  const pieHook   = useKeterserapanPie();
  const drillHook = useKeterserapanDrillDown();

  // ── Modal state — simpan juga apakah dari bar atau pie ─────────────────────
  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    status?: string;
    tahunLulus?: string;
    showStatusColumn: boolean;  // bar=true, pie=false
  }>({ open: false, title: "", showStatusColumn: false });

  const openFromBar = (title: string, tahun: string) => {
    // Klik bar → selalu status=terserap + tahun yang diklik
    setModal({ open: true, title, status: "terserap", tahunLulus: tahun, showStatusColumn: true });
    drillHook.fetch({ status: "terserap", tahun_lulus: tahun, page: 1 });
  };

  const openFromPie = (title: string, status: string) => {
    // Klik pie → status spesifik, tanpa filter tahun (pakai tahunEfektif dari hook)
    setModal({ open: true, title, status, tahunLulus: pieHook.tahunEfektif, showStatusColumn: false });
    drillHook.fetch({ status, tahun_lulus: pieHook.tahunEfektif, page: 1 });
  };

  const handlePageChange = (page: number, search?: string) => {
    drillHook.fetch({
      status: modal.status,
      tahun_lulus: modal.tahunLulus,
      page,
      search,
    });
  };

  // ── Bar data ────────────────────────────────────────────────────────────────
  const comboData = useMemo(() => {
    if (!barHook.data?.data) return [];
    return barHook.data.data.map((d) => ({
      year: String(d.tahun_lulus),
      value: d.pct_terserap,
      total: d.total,
      n: d.count_terserap,
    }));
  }, [barHook.data]);

  // ── Pie data ────────────────────────────────────────────────────────────────
  const pieData = useMemo(() => {
    if (!pieHook.data?.data) return [];
    const labels = pieHook.data.data.map((d) => d.status);
    const colorMap = buildColorMap(labels);
    return pieHook.data.data.map((d) => ({
      name:      getShortLabel(d.status),
      olapLabel: d.status,           // label OLAP asli untuk filter ke BE
      value:     d.pct,
      count:     d.count,
      color:     colorMap[d.status],
    }));
  }, [pieHook.data]);

  // ── Subtitle pie: dinamis sesuai tahun aktif ────────────────────────────────
  const pieSubtitle = useMemo(() => {
    const total = pieHook.data?.total ?? 0;
    const tahun = pieHook.tahunEfektif;
    const tahunLabel = tahun
      ? (tahunLulus && tahunLulus !== "all" ? `Tahun ${tahun}` : `Tahun terakhir (${tahun})`)
      : "Semua tahun";
    return `${tahunLabel} — total ${total.toLocaleString("id-ID")} alumni`;
  }, [pieHook.data, pieHook.tahunEfektif, tahunLulus]);

  const pieTotal  = pieHook.data?.total ?? 0;
  const pieActive = usePieActive();
  const showRefLine = !lam.isDisabled && !!lam.threshold;
  const isLoading   = barHook.loading || pieHook.loading;
  const hasError    = barHook.error || pieHook.error;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">

        {/* ── Grafik Bar: Tren Keterserapan ───────────────────────────────── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && comboData.length === 0}
          title="Tren Keterserapan Lulusan"
          subtitle={lamSubtitle(lam)}
          // fix #4: compareType harus "absorption" bukan "status"
          compareType="absorption"
          headerExtra={<LamFilterControls lam={lam} />}
          methodology={
            <MethodologyBlock
              description="Mengukur lulusan S1/Diploma yang berhasil bekerja (A), melanjutkan studi (B), atau berwirausaha (C) dalam satu periode."
              formula={<>Keterserapan (%) = ((A + B + C) × 100) / Total Lulusan S1 &amp; Diploma dalam Satu Periode</>}
              notes="A = bekerja, B = lanjut studi, C = wiraswasta. Sumber: BAN-PT / IAPS 4.0."
            />
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={markMax(comboData, "value")} margin={{ top: 30, right: 20, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="year" fontSize={13}
                  label={{ value: "Tahun Kelulusan", position: "insideBottom", offset: -8, fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} fontSize={13}
                  label={{ value: "Keterserapan (%)", angle: -90, position: "insideLeft", fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                />
                <Tooltip contentStyle={tooltipStyle}
                  formatter={(v: number, _n, p: any) => [
                    formatPctCount(v, p?.payload?.n ?? 0, p?.payload?.total ?? 0),
                    "Keterserapan",
                  ]}
                />
                {tahunLulus !== "all" && (
                  <ReferenceArea x1={tahunLulus} x2={tahunLulus}
                    fill="hsl(var(--foreground))" fillOpacity={0.06}
                    stroke="hsl(var(--foreground))" strokeOpacity={0.3} strokeDasharray="3 3"
                  />
                )}
                {markMax(comboData, "value").filter((d) => d.isMax).map((d) => (
                  <ReferenceArea key={`max-${d.year}`} x1={d.year} x2={d.year}
                    fill="hsl(45 95% 55%)" fillOpacity={0.14}
                    stroke="hsl(45 95% 45%)" strokeOpacity={0.55} strokeDasharray="4 2" />
                ))}
                <Bar dataKey="value" name="Keterserapan" radius={[6, 6, 0, 0]} maxBarSize={50}
                  cursor="pointer"
                  onClick={(d: any) => openFromBar(
                    `Terserap ${d.year} — ${d.value}% (${d.n}/${d.total} alumni)`,
                    d.year
                  )}
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}
                >
                  {markMax(comboData, "value").map((d) => (
                    <Cell key={d.year}
                      fill={showRefLine && lam.threshold ? (d.value >= lam.threshold ? C.blue : C.orange) : C.blue}
                    />
                  ))}
                  <LabelList dataKey="value" position="center" fill="#fff" fontSize={11} formatter={(v: number) => `${v}%`} />
                  <LabelList dataKey="isMax" position="top" content={(p: any) =>
                    p.value ? <text x={p.x + p.width / 2} y={p.y - 6} fontSize={11} fontWeight={700} fill="hsl(38 92% 38%)" textAnchor="middle">★ Tertinggi</text> : null
                  } />
                </Bar>
                <Line type="monotone" dataKey="value" name="Tren" stroke={C.blueDark} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 } as any} />
                {showRefLine && (
                  <ReferenceLine y={lam.threshold} stroke={C.red} strokeDasharray="6 3" strokeWidth={2}
                    label={{ value: `${lam.level === "baik" ? "Baik" : "Unggul"} ${lam.threshold}%`, fill: C.red, fontSize: 11, position: "insideTopRight" }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>

        {/* ── Grafik Pie: Distribusi Status ──────────────────────────────── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && pieData.length === 0}
          title="Distribusi Status Keterserapan"
          // fix #1: subtitle dinamis dengan tahun aktif
          subtitle={pieSubtitle}
          compareType="status"
          methodology={
            <MethodologyBlock
              description="Proporsi status aktivitas lulusan pada periode terakhir."
              formula={<>% Status (X) = (Jumlah Lulusan Status X / Total Lulusan Periode) × 100%</>}
            />
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100}
                  label={(e: any) => `${e.name}: ${e.value}%`}
                  activeIndex={pieActive.activeIndex} activeShape={renderActivePieShape}
                  onMouseEnter={pieActive.onMouseEnter} onMouseLeave={pieActive.onMouseLeave}
                  cursor="pointer"
                  onClick={(d: any) => openFromPie(
                    `${d.name} — ${d.value}% (${d.count?.toLocaleString("id-ID")} alumni)`,
                    d.olapLabel ?? d.name
                  )}
                >
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle}
                  formatter={(v: number, n, p: any) => [
                    `${v}% (${p.payload?.count?.toLocaleString("id-ID")} alumni)`, n,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>
      </div>

      {/* ── Drill-down Modal ─────────────────────────────────────────────── */}
      <DrillDownModal
        isOpen={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.title}
        data={drillHook.data}
        loading={drillHook.loading}
        error={drillHook.error}
        // fix #3: kolom status hanya muncul saat dari bar
        contextColumn={modal.showStatusColumn ? { key: "status", label: "Status" } : null}
        onPageChange={handlePageChange}
      />
    </>
  );
};

export default Kpi4AbsorptionChart;