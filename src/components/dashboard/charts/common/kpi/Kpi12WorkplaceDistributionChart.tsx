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
  LabelList,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import { MethodologyBlock } from "./Methodology";
import { renderActivePieShape, usePieActive } from "./pieUtils";
import { formatPctCount } from "./format";
import { useInstansiJenis, useInstansiTingkat, useInstansiDrillDown, InstansiDrillDownParams } from "@/hooks/useInstansi";
import DrillDownModal from "@/components/dashboard/DrillDownModal";

const MAX_PIE_SLICES = 8;
const JENIS_COLORS = [C.blueLight, C.green, C.orange, C.gray, C.blue, C.purple, C.red, C.greenLight];
const TINGKAT_COLOR: Record<string, string> = {
  "Lokal": C.greenLight,
  "Nasional": C.blue,
  "Internasional": C.navy,
};

const Kpi12WorkplaceDistributionChart = () => {
  const jenisHook = useInstansiJenis();
  const tingkatHook = useInstansiTingkat();
  const drillHook = useInstansiDrillDown();
  const pieActive = usePieActive();

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
  const hasError = jenisHook.error || tingkatHook.error;

  // Pie data — jenis perusahaan (top N + Lainnya)
  const pieData = useMemo(() => {
    if (!jenisHook.data?.data) return [];
    const sorted = [...jenisHook.data.data].sort((a, b) => b.pct - a.pct);
    const top = sorted.slice(0, MAX_PIE_SLICES);
    const rest = sorted.slice(MAX_PIE_SLICES);
    const result = top.map((d, i) => ({
      name: d.jenis,
      value: +(d.pct).toFixed(1),
      count: d.count,
      color: JENIS_COLORS[i % JENIS_COLORS.length],
    }));
    if (rest.length > 0) {
      result.push({
        name: "Lainnya",
        value: +(rest.reduce((s, d) => s + d.pct, 0)).toFixed(1),
        count: rest.reduce((s, d) => s + d.count, 0),
        color: C.gray,
      });
    }
    return result;
  }, [jenisHook.data]);

  // Tingkat pie — aggregate dari semua prodi → Lokal/Nasional/Internasional
  const tingkatPieData = useMemo(() => {
    if (!tingkatHook.data?.data) return [];
    const totals: Record<string, number> = {};
    tingkatHook.data.data.forEach((p) =>
      p.tingkat.forEach((t) => {
        totals[t.label] = (totals[t.label] ?? 0) + t.count;
      })
    );
    const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([label, count]) => ({
        name: label,
        value: +(count / grandTotal * 100).toFixed(1),
        count,
        color: TINGKAT_COLOR[label] ?? C.gray,
      }));
  }, [tingkatHook.data]);

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
  const tingkatTotal = tingkatPieData.reduce((s, d) => s + d.count, 0);

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

        {/* ── Pie: sebaran level perusahaan (Lokal/Nasional/Internasional) ── */}
        <KpiCard
          loading={isLoading} error={hasError}
          empty={!isLoading && tingkatPieData.length === 0}
          title="Sebaran Level Perusahaan"
          subtitle="Distribusi level perusahaan tempat kerja lulusan — periode terakhir"
          compareType="tingkatInstansi"
          methodology={
            <MethodologyBlock
              description="Proporsi lulusan menurut level perusahaan tempat bekerja (Lokal/Nasional/Internasional)."
              formula={<>% Level = (Lulusan Bekerja di Level X / Total Lulusan Bekerja) × 100%</>}
            />
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tingkatPieData} dataKey="value" nameKey="name" outerRadius={100}
                  label={(e: any) => `${e.name}: ${e.value}%`}
                  activeIndex={pieActive.activeIndex} activeShape={renderActivePieShape}
                  onMouseEnter={pieActive.onMouseEnter} onMouseLeave={pieActive.onMouseLeave}
                  cursor="pointer"
                  onClick={(d: any) =>
                    openModal(
                      `${d.name} (${d.value}% · ${d.count} alumni)`,
                      { tingkat_instansi: d.name },
                      { key: "jenis_instansi", label: "Jenis Instansi" }
                    )
                  }
                >
                  {tingkatPieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n) => [
                    formatPctCount(v, Math.round((v * tingkatTotal) / 100), tingkatTotal),
                    n,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>
      </div>

      {/* ── Bar: tingkat instansi per prodi ── */}
      {barData.length > 0 && (
        <KpiCard
          loading={isLoading} error={hasError}
          empty={false}
          title="Sebaran Tingkat Instansi per Prodi"
          subtitle="Distribusi Lokal / Nasional / Internasional per program studi"
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `${v}%`} fontSize={12} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="prodi" width={150} fontSize={10} stroke="hsl(var(--muted-foreground))" tick={{ fill: "hsl(var(--foreground))" }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [`${v}%`, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {["Lokal", "Nasional", "Internasional"].map((label) => (
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
      )}

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
