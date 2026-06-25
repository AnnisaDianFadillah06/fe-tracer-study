import { useState, useMemo, useRef, useEffect } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import { MethodologyBlock } from "./Methodology";
import { renderActivePieShape, usePieActive } from "./pieUtils";
import {
  useInstansiJenis,
  useInstansiDrillDown,
  InstansiDrillDownParams,
} from "@/hooks/useInstansi";
import DrillDownModal from "@/components/dashboard/DrillDownModal";
import { buildColorMap } from "@/lib/chartColors";

const DEFAULT_GROUPED = [
  { year: "2019", lokal: 45, nasional: 40, multi: 15 },
  { year: "2020", lokal: 44, nasional: 42, multi: 14 },
  { year: "2021", lokal: 43, nasional: 43, multi: 14 },
  { year: "2022", lokal: 42, nasional: 44, multi: 14 },
  { year: "2023", lokal: 40, nasional: 45, multi: 15 },
  { year: "2024", lokal: 38, nasional: 47, multi: 15 },
];

const BAR_LABEL_NAMES: Record<string, string> = { lokal: "Lokal", nasional: "Nasional", multi: "Multinasional" };
const BAR_COLORS: Record<string, string> = { lokal: C.greenLight, nasional: C.blue, multi: C.navy };

const VISIBLE_YEARS = 3;
const BAR_GROUP_WIDTH = 180;

const Kpi12WorkplaceDistributionChart = () => {
  const jenisHook = useInstansiJenis();
  const drillHook = useInstansiDrillDown();
  const pieActive = usePieActive();

  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    fetchParams: InstansiDrillDownParams;
  }>({ open: false, title: "", fetchParams: {} });

  const openModal = (title: string, fetchParams: InstansiDrillDownParams) => {
    setModal({ open: true, title, fetchParams });
    drillHook.fetch({ ...fetchParams, page: 1 });
  };

  const pieData = useMemo(() => {
    if (!jenisHook.data?.data) return [];
    const labels = jenisHook.data.data.map((d) => d.jenis);
    const colorMap = buildColorMap(labels);
    return jenisHook.data.data.map((d) => ({
      name: d.jenis,
      value: d.pct,
      count: d.count,
      color: colorMap[d.jenis],
    }));
  }, [jenisHook.data]);

  const pieTotal = jenisHook.data?.total ?? pieData.reduce((s, d) => s + d.count, 0);

  const barChartWidth = Math.max(DEFAULT_GROUPED.length * BAR_GROUP_WIDTH, 400);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && DEFAULT_GROUPED.length > VISIBLE_YEARS) {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    }
  }, []);

  const pieEmpty = !jenisHook.loading && pieData.length === 0;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">
        {/* ── Pie: Sebaran Jenis Perusahaan (data real dari BE) ── */}
        <KpiCard
          loading={jenisHook.loading}
          error={jenisHook.error}
          empty={pieEmpty}
          title="Sebaran Jenis Perusahaan"
          subtitle="Distribusi jenis perusahaan tempat kerja lulusan — periode terakhir"
          compareType="jenisInstansi"
          methodology={
            <MethodologyBlock
              description="Proporsi lulusan menurut jenis perusahaan tempat bekerja."
              formula={<>% Jenis = (Lulusan Bekerja di Jenis X / Total Lulusan Bekerja) × 100%</>}
            />
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} dataKey="value" nameKey="name" outerRadius={100}
                  label={(e: any) => e.percent > 0.05 ? `${e.name}: ${e.value}%` : ""}
                  labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                  activeIndex={pieActive.activeIndex} activeShape={renderActivePieShape}
                  onMouseEnter={pieActive.onMouseEnter} onMouseLeave={pieActive.onMouseLeave}
                  cursor="pointer"
                  onClick={(d: any) =>
                    openModal(
                      `${d.name} (${d.value}% · ${d.count} alumni)`,
                      { jenis_instansi: d.name }
                    )
                  }
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n: string) => [
                    `${v}%${pieTotal > 0 ? ` (${Math.round((v * pieTotal) / 100)} alumni)` : ""}`,
                    n,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>

        {/* ── Bar: Sebaran Level Perusahaan Antar Periode (mock — waiting BE endpoint) ── */}
        <KpiCard
          title="Perubahan Sebaran Level Perusahaan Antar Periode"
          subtitle="Sumbu Y: persentase lulusan • Sumbu X: tahun kelulusan"
          compareType="tingkatInstansi"
          methodology={
            <MethodologyBlock
              description="Tren proporsi level perusahaan tempat bekerja lulusan antar tahun kelulusan."
              formula={<>% Level per Tahun = (Lulusan Bekerja di Level X pada Tahun T / Total Lulusan Bekerja Tahun T) × 100%</>}
            />
          }
        >
          <div ref={scrollRef} className="h-72 overflow-x-auto overflow-y-hidden" style={{ scrollBehavior: "smooth" }}>
            <div style={{ width: DEFAULT_GROUPED.length > VISIBLE_YEARS ? barChartWidth : "100%", height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DEFAULT_GROUPED} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="year" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tickFormatter={(v) => `${v}%`} fontSize={12} domain={[0, 60]} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {(["lokal", "nasional", "multi"] as const).map((key) => (
                    <Bar
                      key={key} dataKey={key} name={BAR_LABEL_NAMES[key]}
                      fill={BAR_COLORS[key]} radius={[3, 3, 0, 0]} cursor="pointer"
                      onClick={(d: any) =>
                        openModal(
                          `${BAR_LABEL_NAMES[key]} — ${d.year} (${d[key]}%)`,
                          { tingkat_instansi: BAR_LABEL_NAMES[key] }
                        )
                      }
                      activeBar={{ stroke: "hsl(var(--foreground))", strokeWidth: 1.5 } as any}
                    >
                      <LabelList dataKey={key} position="top" fontSize={10} formatter={(v: number) => `${v}%`} />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </KpiCard>
      </div>

      <DrillDownModal
        isOpen={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.title}
        data={drillHook.data}
        loading={drillHook.loading}
        error={drillHook.error}
        contextColumn={{ key: "jenis_instansi", label: "Jenis Instansi" }}
        onPageChange={(page, search) =>
          drillHook.fetch({ ...modal.fetchParams, page, search })
        }
      />
    </>
  );
};

export default Kpi12WorkplaceDistributionChart;
