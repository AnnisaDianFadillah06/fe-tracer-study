import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
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
import { renderActivePieShape, usePieActive } from "./pieUtils";
import { formatPctCount } from "./format";
import {
  useKesesuaianBar,
  useKesesuaianPie,
  useKesesuaianAlasan,
  useKesesuaianDrillDown,
} from "@/hooks/useKesesuaian";
import DrillDownModal from "@/components/dashboard/DrillDownModal";
import { buildColorMap } from "@/lib/chartColors";

const CONTEXT_COLUMN = { key: "kesesuaian_bidang", label: "Kesesuaian Bidang" };

const KESESUAIAN_SK: Record<string, number> = {
  "Sangat Erat": 1,
  "Erat": 2,
  "Cukup Erat": 3,
  "Kurang Erat": 4,
  "Tidak Sama Sekali": 5,
};

const Kpi6FieldRelevanceChart = () => {
  const barHook    = useKesesuaianBar();
  const pieHook    = useKesesuaianPie();
  const alasanHook = useKesesuaianAlasan();
  const drillHook  = useKesesuaianDrillDown();
  const lam        = useLamFilter("fieldRelevance");
  const pieActive  = usePieActive();

  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    kesesuaian_sk?: number;
    tahun_lulus?: string;
  }>({ open: false, title: "" });

  const openModal = (title: string, kesesuaian_sk: number, tahun_lulus?: string) => {
    setModal({ open: true, title, kesesuaian_sk, tahun_lulus });
    drillHook.fetch({ kesesuaian_sk, tahun_lulus, page: 1 });
  };

  const handlePageChange = (page: number, search?: string) => {
    if (!modal.kesesuaian_sk) return;
    drillHook.fetch({ kesesuaian_sk: modal.kesesuaian_sk, tahun_lulus: modal.tahun_lulus, page, search });
  };

  // Aggregate bar: per-prodi/tahun → per tahun
  const comboData = useMemo(() => {
    if (!barHook.data?.data) return [];
    const byTahun = new Map<string, { totalAlumni: number; totalSesuai: number }>();
    barHook.data.data.forEach((d) => {
      const cur = byTahun.get(d.tahun_lulus) ?? { totalAlumni: 0, totalSesuai: 0 };
      byTahun.set(d.tahun_lulus, {
        totalAlumni: cur.totalAlumni + d.count_alumni,
        totalSesuai: cur.totalSesuai + d.count_sesuai_bidang,
      });
    });
    return [...byTahun.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, v]) => ({
        year,
        value: v.totalAlumni > 0 ? Math.round((v.totalSesuai / v.totalAlumni) * 100 * 10) / 10 : 0,
        total: v.totalAlumni,
        n:     v.totalSesuai,
      }));
  }, [barHook.data]);

  // Pie: map BE data → recharts format dengan warna
  const pieData = useMemo(() => {
    if (!pieHook.data?.data) return [];
    const labels = pieHook.data.data.map((d) => d.label);
    const colorMap = buildColorMap(labels);
    return pieHook.data.data.map((d) => ({
      name:  d.label,
      value: d.pct,
      count: d.count,
      color: colorMap[d.label],
    }));
  }, [pieHook.data]);

  // Alasan: map BE data → recharts format
  const reasonsData = useMemo(() => {
    if (!alasanHook.data?.data) return [];
    return alasanHook.data.data.map((d) => ({
      reason: d.label,
      value:  d.count,
    }));
  }, [alasanHook.data]);

  const isLoading   = barHook.loading || pieHook.loading || alasanHook.loading;
  const hasError    = barHook.error || pieHook.error || alasanHook.error;
  const showRefLine = !lam.isDisabled && !!lam.threshold;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">
        {/* ── Bar: tren % kesesuaian per tahun ── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && comboData.length === 0}
          title="Tren Kesesuaian Bidang Kerja"
          subtitle={lamSubtitle(lam)}
          compareType="kesesuaian"
          headerExtra={<LamFilterControls lam={lam} />}
          methodology={
            <MethodologyBlock
              description="Mengukur kesesuaian bidang pekerjaan lulusan terhadap bidang studi."
              formula={<>Kesesuaian (%) = (Lulusan Sesuai Bidang / Total Lulusan Bekerja) × 100%</>}
              notes="Kategori sesuai mencakup: Sangat Erat dan Erat."
            />
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={comboData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="year" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, _n, p: any) =>
                    [formatPctCount(v, p.payload.n, p.payload.total), "Kesesuaian"]
                  }
                />
                <Bar
                  dataKey="value" name="Kesesuaian" radius={[6, 6, 0, 0]} maxBarSize={50}
                  cursor="pointer"
                  onClick={(d: any) => openModal(
                    `Sangat Erat — ${d.year} (${d.value}% · ${d.n}/${d.total} lulusan)`, 1, d.year
                  )}
                  activeBar={{ stroke: C.blueDark, strokeWidth: 2 } as any}
                >
                  {comboData.map((d) => (
                    <Cell
                      key={d.year}
                      fill={showRefLine && lam.threshold ? (d.value >= lam.threshold ? C.blue : C.orange) : C.blue}
                    />
                  ))}
                  <LabelList dataKey="value" position="center" fill="#fff" fontSize={11} fontWeight={600} formatter={(v: number) => `${v}%`} />
                </Bar>
                <Line type="monotone" dataKey="value" stroke={C.blueDark} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 7 } as any} />
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

        {/* ── Pie: distribusi tingkat kesesuaian ── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && pieData.length === 0}
          title="Distribusi Tingkat Kesesuaian"
          subtitle="Periode aktif — klik slice untuk lihat alumni"
          compareType="kesesuaian"
          methodology={
            <MethodologyBlock
              description="Sebaran lulusan menurut tingkat keeratan bidang kerja dengan bidang studi."
              formula={<>% Tingkat = (Jumlah Lulusan pada Tingkat / Total Lulusan Bekerja) × 100%</>}
            />
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} dataKey="value" nameKey="name" outerRadius={100}
                  activeIndex={pieActive.activeIndex} activeShape={renderActivePieShape}
                  onMouseEnter={pieActive.onMouseEnter} onMouseLeave={pieActive.onMouseLeave}
                  cursor="pointer"
                  onClick={(d: any) => {
                    const sk = KESESUAIAN_SK[d.name];
                    if (sk) openModal(`${d.name} (${d.value}% · ${d.count} alumni)`, sk);
                  }}
                >
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [`${v}%`, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>

        {/* ── Bar horizontal: alasan ketidaksesuaian ── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && reasonsData.length === 0}
          title="Frekuensi Alasan Ketidaksesuaian"
          subtitle="Jumlah responden per alasan (multi-pilih)"
          className="lg:col-span-2"
          compareType="kesesuaian"
          methodology={
            <MethodologyBlock
              description="Frekuensi alasan lulusan memilih pekerjaan di luar bidang studi."
              formula={<>Frekuensi Alasan X = Jumlah Responden yang Memilih Alasan X</>}
              notes="Responden dapat memilih lebih dari satu alasan."
            />
          }
        >
          <div style={{ height: Math.max(reasonsData.length * 50 + 40, 120) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonsData} layout="vertical" margin={{ top: 5, right: 50, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
                <XAxis type="number" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="reason" width={240} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [v, "Responden"]} />
                <Bar dataKey="value" fill={C.orange} radius={[0, 6, 6, 0]} maxBarSize={28}>
                  <LabelList dataKey="value" position="right" fontSize={11} fill="hsl(var(--foreground))" />
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

export default Kpi6FieldRelevanceChart;
