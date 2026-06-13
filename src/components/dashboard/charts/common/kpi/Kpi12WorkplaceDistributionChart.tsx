import { useMemo, useState } from "react";
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
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import { MethodologyBlock } from "./Methodology";
import { renderActivePieShape, usePieActive } from "./pieUtils";
import { useInstansiJenis, useInstansiTingkat, useInstansiDrillDown, InstansiDrillDownParams } from "@/hooks/useInstansi";
import DrillDownModal from "@/components/dashboard/DrillDownModal";

const JENIS_COLORS = [C.blueLight, C.green, C.orange, C.gray, C.blue, C.purple];

// Warna tetap untuk tingkat — sesuai screenshot UI (greenLight, blue, navy)
const TINGKAT_COLOR: Record<string, string> = {
  "Lokal":         C.greenLight,
  "Nasional":      C.blue,
  "Internasional": C.navy,
};
const TINGKAT_LABELS = ["Lokal", "Nasional", "Internasional"];

const Kpi12WorkplaceDistributionChart = () => {
  const jenisHook   = useInstansiJenis();
  const tingkatHook = useInstansiTingkat();
  const drillHook   = useInstansiDrillDown();
  const pieActive   = usePieActive();

  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    fetchParams: InstansiDrillDownParams;
    contextColumn: { key: string; label: string };
  }>({
    open: false,
    title: "",
    fetchParams: {},
    contextColumn: { key: "tingkat_instansi", label: "Tingkat" },
  });

  const openModal = (
    title: string,
    fetchParams: InstansiDrillDownParams,
    contextColumn: { key: string; label: string }
  ) => {
    setModal({ open: true, title, fetchParams, contextColumn });
    drillHook.fetch({ ...fetchParams, page: 1 });
  };

  const handlePageChange = (page: number, search?: string) => {
    drillHook.fetch({ ...modal.fetchParams, page, search });
  };

  const isLoading = jenisHook.loading || tingkatHook.loading;
  const hasError  = jenisHook.error || tingkatHook.error;

  // Pie data — jenis perusahaan
  const pieData = useMemo(() => {
    if (!jenisHook.data?.data) return [];
    return jenisHook.data.data.map((d, i) => ({
      name:  d.jenis,
      value: d.pct,
      count: d.count,
      color: JENIS_COLORS[i % JENIS_COLORS.length],
    }));
  }, [jenisHook.data]);

  // Bar data — tingkat per prodi (horizontal stacked)
  const barData = useMemo(() => {
    if (!tingkatHook.data?.data) return [];
    return tingkatHook.data.data.map((p) => {
      const row: Record<string, any> = { prodi: p.nama_prodi };
      p.tingkat.forEach((t) => { row[t.label] = +(t.pct).toFixed(1); });
      return row;
    });
  }, [tingkatHook.data]);

  const barChartHeight = Math.max(barData.length * 44 + 60, 288);
  const total = jenisHook.data?.total ?? 0;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">
        {/* ── Pie: jenis perusahaan ── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && pieData.length === 0}
          title="Jenis Perusahaan Tempat Kerja"
          subtitle="Distribusi jenis instansi tempat kerja lulusan — periode terakhir"
          compareType="jenisInstansi"
          methodology={
            <MethodologyBlock
              description="Proporsi lulusan menurut jenis perusahaan/instansi tempat bekerja."
              formula={<>% Jenis = (Lulusan Bekerja di Jenis X / Total Lulusan Bekerja) × 100%</>}
              notes="Hanya mencakup lulusan dengan status bekerja (bukan wirausaha)."
            />
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} dataKey="value" nameKey="name" outerRadius={100}
                  label={(e: any) => `${e.name}: ${e.value}%`}
                  activeIndex={pieActive.activeIndex} activeShape={renderActivePieShape}
                  onMouseEnter={pieActive.onMouseEnter} onMouseLeave={pieActive.onMouseLeave}
                  cursor="pointer"
                  onClick={(d: any) =>
                    openModal(
                      `${d.name} (${d.value}% · ${d.count} alumni)`,
                      { jenis_instansi: d.name },
                      { key: "tingkat_instansi", label: "Tingkat Instansi" }
                    )
                  }
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n) => [
                    `${v}%${total > 0 ? ` (${Math.round((v * total) / 100)} alumni)` : ""}`,
                    n,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>

        {/* ── Bar: tingkat instansi per prodi ── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && barData.length === 0}
          title="Sebaran Tingkat Instansi per Prodi"
          subtitle="Distribusi Lokal / Nasional / Internasional per program studi"
          compareType="jenisInstansi"
          methodology={
            <MethodologyBlock
              description="Proporsi lulusan per prodi berdasarkan skala/tingkat instansi tempat bekerja."
              formula={<>% Tingkat per Prodi = (Lulusan Prodi di Tingkat X / Total Lulusan Bekerja Prodi) × 100%</>}
            />
          }
        >
          <div style={{ height: barChartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 8, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3" stroke="hsl(var(--border))"
                  opacity={0.4} horizontal={false}
                />
                <XAxis
                  type="number" tickFormatter={(v) => `${v}%`}
                  fontSize={12} domain={[0, 100]}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  type="category" dataKey="prodi"
                  width={150} fontSize={10}
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: "hsl(var(--foreground))" }}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n) => [`${v}%`, n]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {TINGKAT_LABELS.map((label) => (
                  <Bar
                    key={label} dataKey={label} stackId="a"
                    fill={TINGKAT_COLOR[label] ?? C.gray}
                    cursor="pointer"
                    onClick={(d: any) =>
                      openModal(
                        `${label} — ${d.prodi} (${d[label]}%)`,
                        { tingkat_instansi: label },
                        { key: "jenis_instansi", label: "Jenis Instansi" }
                      )
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
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
        contextColumn={modal.contextColumn}
        onPageChange={handlePageChange}
      />
    </>
  );
};

export default Kpi12WorkplaceDistributionChart;
