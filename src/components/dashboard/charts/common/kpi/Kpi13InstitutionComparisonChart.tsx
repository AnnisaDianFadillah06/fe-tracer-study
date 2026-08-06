import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import { MethodologyBlock } from "./Methodology";
import { useKpi13Comparison, Kpi13ProdiRow, Kpi13ThresholdStatus } from "@/hooks/useKpi13Comparison";

// FR-020: perbandingan 5 metrik KPI lintas program studi / jurusan, satu
// chart per metrik, warna bar mengikuti status pencapaian threshold LAM
// (hijau=unggul, kuning=baik, merah=kurang, abu=belum ada threshold).

const METRICS: { key: keyof Kpi13ProdiRow; label: string; unit: string }[] = [
  { key: "keterserapan", label: "Keterserapan", unit: "%" },
  { key: "masa_tunggu",   label: "Masa Tunggu ≤6bln", unit: "%" },
  { key: "kesesuaian",    label: "Kesesuaian Bidang", unit: "%" },
  { key: "wirausaha",     label: "Wirausaha", unit: "%" },
  { key: "pendapatan",    label: "Pendapatan ≥1,2x UMP", unit: "%" },
];

const STATUS_COLOR: Record<Exclude<Kpi13ThresholdStatus, null>, string> = {
  unggul: C.green,
  baik: C.yellow,
  kurang: C.red,
};

const Kpi13InstitutionComparisonChart = () => {
  const { data, loading, error } = useKpi13Comparison();
  const [activeMetric, setActiveMetric] = useState<keyof Kpi13ProdiRow>("keterserapan");

  const rows = data?.data ?? [];
  const isEmpty = !loading && rows.length === 0;

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        prodi: r.prodi,
        jurusan: r.jurusan,
        value: r[activeMetric] as number,
        status: r.threshold_status[activeMetric as keyof Kpi13ProdiRow["threshold_status"]],
      })),
    [rows, activeMetric]
  );

  const chartWidth = Math.max(chartData.length * 70 + 40, 320);
  const metricMeta = METRICS.find((m) => m.key === activeMetric)!;

  return (
    <KpiCard
      loading={loading}
      error={error}
      empty={isEmpty}
      title="Perbandingan KPI Lintas Program Studi"
      subtitle="Bandingkan capaian antar prodi/jurusan untuk satu metrik, diwarnai sesuai status threshold LAM."
      headerExtra={
        <select
          value={activeMetric}
          onChange={(e) => setActiveMetric(e.target.value as keyof Kpi13ProdiRow)}
          className="text-sm rounded-md border border-input bg-background px-2 py-1"
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      }
      methodology={
        <MethodologyBlock
          description="Perbandingan institusi-wide untuk 5 indikator utama: keterserapan, masa tunggu kerja, kesesuaian bidang, wirausaha, dan pendapatan."
          formula={<>Warna bar = status threshold LAM yang berlaku untuk prodi tsb. (Unggul / Baik / Kurang)</>}
          notes="Metrik pendapatan menggunakan ambang seragam 1,2x UMP untuk semua prodi, supaya perbandingan lintas prodi tetap apple-to-apple (bukan ambang per-LAM yang bisa berbeda-beda)."
        />
      }
    >
      <div className="overflow-x-auto" style={{ scrollBehavior: "smooth" }}>
        <div style={{ width: chartData.length > 5 ? chartWidth : "100%", height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis dataKey="prodi" fontSize={11} stroke="hsl(var(--muted-foreground))" interval={0} angle={-25} textAnchor="end" height={70} />
              <YAxis
                domain={metricMeta.unit === "%" ? [0, 100] : undefined}
                tickFormatter={(v) => `${v}${metricMeta.unit}`}
                fontSize={12} stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, _n, p: any) => [
                  `${v}${metricMeta.unit} (${p?.payload?.status ?? "belum ada threshold"})`,
                  metricMeta.label,
                ]}
                labelFormatter={(label: string, payload: any) => {
                  const jurusan = payload?.[0]?.payload?.jurusan;
                  return jurusan ? `${label} — ${jurusan}` : label;
                }}
              />
              <Legend
                payload={[
                  { value: "Unggul", type: "square", color: C.green },
                  { value: "Baik", type: "square", color: C.yellow },
                  { value: "Kurang", type: "square", color: C.red },
                  { value: "Belum ada threshold", type: "square", color: C.gray },
                ]}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar dataKey="value" name={metricMeta.label} radius={[4, 4, 0, 0]} maxBarSize={50}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.status ? STATUS_COLOR[d.status] : C.gray} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </KpiCard>
  );
};

export default Kpi13InstitutionComparisonChart;
