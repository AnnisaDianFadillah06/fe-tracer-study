import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { C, KpiCard } from "../KpiCard";
import { MethodologyBlock } from "./Methodology";
import {
  useKpi13Comparison,
  Kpi13Metric,
  Kpi13ProdiRow,
  Kpi13Threshold,
  Kpi13ThresholdStatus,
} from "@/hooks/useKpi13Comparison";

// FR-020: perbandingan 5 metrik KPI lintas program studi, warna bar mengikuti
// status pencapaian threshold LAM prodi itu sendiri (hijau=unggul,
// kuning=baik, merah=kurang, abu=belum ada threshold). Batas tiap prodi bisa
// berbeda (mis. KBK LAM Teknik D3 ≥ 80% vs Sarjana Terapan ≥ 60%), jadi yang
// dibandingkan adalah status, bukan sekadar tinggi batang.

const METRICS: { key: Kpi13Metric; label: string; formula: string }[] = [
  { key: "keterserapan", label: "Keterserapan",         formula: "Lulusan terserap (bekerja, wirausaha, studi lanjut) / seluruh lulusan" },
  { key: "masa_tunggu",  label: "Masa Tunggu Cepat",    formula: "Lulusan bekerja dengan masa tunggu ≤ batas bulan LAM (default 6) / lulusan bekerja" },
  { key: "kesesuaian",   label: "Kesesuaian Bidang",    formula: "Lulusan sesuai bidang / lulusan bekerja yang terkategori (sesuai + tidak sesuai)" },
  { key: "wirausaha",    label: "Wirausaha",            formula: "Lulusan berwirausaha / seluruh lulusan" },
  { key: "pendapatan",   label: "Pendapatan ≥ Ambang UMP", formula: "Lulusan bergaji ≥ kelipatan UMP LAM (default 1,2×) / lulusan dengan data UMP" },
];

const STATUS_META: { key: Exclude<Kpi13ThresholdStatus, null> | "none"; label: string; color: string }[] = [
  { key: "unggul", label: "Unggul",              color: C.green },
  { key: "baik",   label: "Baik",                color: C.yellow },
  { key: "kurang", label: "Kurang",              color: C.red },
  { key: "none",   label: "Belum ada threshold", color: C.gray },
];

const colorOf = (s: Kpi13ThresholdStatus) => STATUS_META.find((m) => m.key === (s ?? "none"))!.color;

const ROW_HEIGHT = 30;

function thresholdText(t: Kpi13Threshold | undefined): string | null {
  if (!t || (t.baik === null && t.unggul === null)) return null;
  const parts = [
    t.baik !== null ? `Baik ≥ ${t.baik}%` : null,
    t.unggul !== null ? `Unggul ≥ ${t.unggul}%` : null,
  ].filter(Boolean);
  return `${t.lam ?? "LAM"} · ${parts.join(" · ")}`;
}

interface Props {
  /** Kunci ke satu metrik (halaman Bandingkan per Prodi); tanpa ini muncul pemilih metrik. */
  metric?: Kpi13Metric;
  /** Filter eksplisit, diteruskan ke useKpi13Comparison. */
  params?: Record<string, string>;
}

const Kpi13InstitutionComparisonChart = ({ metric, params }: Props) => {
  const { data, loading, error } = useKpi13Comparison(params);
  const [selectedMetric, setSelectedMetric] = useState<Kpi13Metric>("kesesuaian");
  const activeMetric = metric ?? selectedMetric;
  const metricMeta = METRICS.find((m) => m.key === activeMetric)!;

  const rows: Kpi13ProdiRow[] = useMemo(() => data?.data ?? [], [data]);
  const isEmpty = !loading && rows.length === 0;

  const chartData = useMemo(
    () =>
      rows
        .map((r) => ({
          prodi: r.prodi,
          jurusan: r.jurusan,
          value: r[activeMetric],
          status: r.threshold_status[activeMetric],
          threshold: r.thresholds?.[activeMetric],
        }))
        // Prodi yang punya threshold di atas, "belum ada threshold" dikumpulkan
        // di bawah; masing-masing kelompok urut nilai tertinggi.
        .sort((a, b) => Number(a.status === null) - Number(b.status === null) || b.value - a.value),
    [rows, activeMetric]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { unggul: 0, baik: 0, kurang: 0, none: 0 };
    chartData.forEach((d) => { c[d.status ?? "none"] += 1; });
    return c;
  }, [chartData]);

  const chartHeight = Math.max(chartData.length * ROW_HEIGHT + 40, 200);

  return (
    <KpiCard
      loading={loading}
      error={error}
      empty={isEmpty}
      title={metric ? `Capaian ${metricMeta.label} terhadap Threshold LAM` : "Perbandingan KPI Lintas Program Studi"}
      subtitle="Warna batang = status capaian prodi terhadap standar LAM/BAN-PT prodi itu sendiri."
      headerExtra={
        metric ? undefined : (
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as Kpi13Metric)}
            className="text-sm rounded-md border border-input bg-background px-2 py-1"
          >
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
        )
      }
      methodology={
        <MethodologyBlock
          description="Satu batang per program studi. Angka dihitung dengan rumus yang sama dengan grafik per angkatan di tab Employment Outcome, dijumlahkan untuk seluruh angkatan pada filter aktif."
          formula={<>{metricMeta.label} (%) = {metricMeta.formula}</>}
          notes="Threshold berbeda per lembaga dan jenjang. Unggul = batas skor 4, Baik = batas skor ≥ 3 pada matriks LAM; untuk BAN-PT, Baik = syarat Terakreditasi. Prodi yang LAM-nya belum menetapkan indikator ini berwarna abu-abu."
        />
      }
    >
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs">
        {STATUS_META.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 text-muted-foreground">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label}
            <strong className="text-foreground">{counts[s.key]}</strong>
          </span>
        ))}
      </div>
      <div className="overflow-y-auto max-h-[560px] pr-1">
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                type="category"
                dataKey="prodi"
                width={230}
                interval={0}
                fontSize={11}
                tickLine={false}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof chartData)[number];
                  const meta = STATUS_META.find((m) => m.key === (d.status ?? "none"))!;
                  const th = thresholdText(d.threshold);
                  return (
                    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-xs space-y-1">
                      <p className="font-semibold text-sm">{d.prodi}</p>
                      {d.jurusan && <p className="text-muted-foreground">{d.jurusan}</p>}
                      <p>{metricMeta.label}: <strong>{d.value}%</strong></p>
                      <p style={{ color: meta.color }} className="font-medium">{meta.label}</p>
                      <p className="text-muted-foreground">{th ?? "LAM prodi ini belum menetapkan indikator ini"}</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" name={metricMeta.label} radius={[0, 4, 4, 0]} barSize={18}>
                {chartData.map((d) => (
                  <Cell key={d.prodi} fill={colorOf(d.status)} />
                ))}
                <LabelList dataKey="value" position="right" formatter={(v: number) => `${v}%`} fontSize={11} fill="hsl(var(--muted-foreground))" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </KpiCard>
  );
};

export default Kpi13InstitutionComparisonChart;
