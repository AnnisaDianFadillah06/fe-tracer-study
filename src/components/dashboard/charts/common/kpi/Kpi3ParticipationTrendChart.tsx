import { useMemo, useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import { Check, X } from "lucide-react";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import { useLamFilter } from "./useLamFilter";
import { useThresholds } from "@/hooks/useFilterThresholds";
import { formatPctCount, nFromPct, markMax } from "./format";
import { MethodologyBlock } from "./Methodology";
import { useResponseRateTrend, useResponseRateDrillDown } from "@/hooks/useResponseRate";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import DrillDownModal from "@/components/dashboard/DrillDownModal";

interface TrendRow {
  year: string;
  positive: number; // response rate (%) tahun tsb.
  negative: number; // 100 - positive
  total: number;
  threshold: number | null; // beda tiap tahun (formula Slovin), null = belum ada data
}

// Label persentase di tengah tiap segmen bar (vertikal: bar berdiri, bukan horizontal)
const SegmentLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  if (height < 20) return null;
  return (
    // pointer-events="none" -- tanpa ini <text> menutupi rect <Bar> di
    // bawahnya dan menelan klik, sehingga drill-down (klik bar "Belum
    // Mengisi") tidak pernah sampai ke handler onClick milik <Bar>.
    <text x={x + width / 2} y={y + height / 2} fill="#fff" fontSize={11} fontWeight={600}
      textAnchor="middle" dominantBaseline="central" pointerEvents="none">
      {Number(value).toFixed(1)}%
    </text>
  );
};

const Kpi3ParticipationTrendChart = () => {
  const { data, loading, error } = useResponseRateTrend();
  const drillHook = useResponseRateDrillDown();
  const { tahunLulus } = useGlobalFilters();
  // useLamFilter dipakai HANYA utk resolve prodiId (kaprodi-aware) — jangan pakai
  // lam.allVersions/lam.isDisabled langsung, karena hook itu sengaja tidak fetch
  // sama sekali saat mode "Semua Prodi" (didesain utk kartu 1-nilai-tunggal).
  // Grafik tren ini butuh threshold tetap muncul walau prodi="Semua" (BE sudah
  // mendukung agregat semua prodi utk tracer_response), makanya fetch sendiri
  // lewat useThresholds langsung dengan enabled=true selalu.
  const lam = useLamFilter("participation");
  const { data: thresholdData, loading: thresholdLoading } = useThresholds(
    lam.prodiId,
    "tracer_response",
    true,
  );

  // Threshold response rate berbeda tiap tahun angkatan — mengikuti jumlah lulusan
  // angkatan tsb (formula Slovin), bukan 1 nilai tetap seperti indikator lain.
  // Jadi tiap baris (tahun) dibandingkan ke threshold tahunnya sendiri-sendiri,
  // tidak ada satu garis threshold global yang berlaku utk semua tahun.
  const thresholdByYear = useMemo(
    () => new Map((thresholdData?.versions ?? []).map((v) => [String(v.year), v.thresholds.baik.value])),
    [thresholdData],
  );

  const [modal, setModal] = useState<{ open: boolean; title: string; status: string; tahun_lulus?: string }>({ open: false, title: "", status: "" });

  const chartData: TrendRow[] = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((d) => ({
      year: String(d.year),
      positive: d.rate,
      negative: Math.max(0, 100 - d.rate),
      total: d.total,
      threshold: thresholdByYear.get(String(d.year)) ?? null,
    }));
  }, [data, thresholdByYear]);

  const isEmpty = !loading && chartData.length === 0;

  const subtitle = thresholdLoading
    ? "Memuat data…"
    : thresholdByYear.size === 0
    ? "Threshold belum tersedia — akan muncul otomatis setelah ada data lulusan"
    : "Threshold minimum dihitung otomatis per tahun lulus (formula Slovin)";

  // Icon centang/silang di atas bar — menandai tercapai/tidaknya threshold KHUSUS
  // tahun tsb (beda dari komponen serupa lain yg statik 1 threshold).
  const CheckIcon = (props: any) => {
    const { x, y, width, index } = props;
    const entry = chartData[index];
    if (!entry || entry.threshold == null || width < 20) return null;
    const met = entry.positive >= entry.threshold;
    const iconX = x + width / 2 - 6;
    const iconY = y - 16;
    return (
      <foreignObject x={iconX} y={iconY} width={12} height={12}>
        <div style={{ color: met ? C.green : C.red, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {met ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          )}
        </div>
      </foreignObject>
    );
  };

  const chartWidth = Math.max(chartData.length * 90 + 40, 320);

  return (
    <>
    <KpiCard loading={loading} error={error} empty={isEmpty}
      title="Tren Response Rate Antar Periode"
      subtitle={subtitle}
      compareType="participation-trend"
      methodology={
        <>
          <MethodologyBlock
            description="Response Rate Tracer Study — proporsi lulusan yang mengisi kuesioner tracer dalam satu periode kelulusan."
            formula={<>Response Rate (%) = (Jumlah Lulusan Merespons / Total Lulusan Periode) × 100%</>}
            notes="Periode dihitung berdasarkan tahun kelulusan."
          />
          <MethodologyBlock
            description="Threshold minimum tiap tahun dihitung otomatis dari jumlah lulusan tahun tsb — bukan nilai tetap, karena tiap tahun lulus punya jumlah lulusan berbeda."
            formula={<>n = N / (1 + N·e²)</>}
            notes="n = responden minimum (threshold), N = total lulusan tahun tsb., e = margin of error (2,3%)."
          />
        </>
      }>
      <div className="overflow-x-auto" style={{ scrollBehavior: "smooth" }}>
        <div style={{ width: chartData.length > 6 ? chartWidth : "100%", height: 340 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={markMax(chartData, "positive")} margin={{ top: 30, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`}
                stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(value: number, name: string, p: any) => {
                  if (name === "Threshold") return [`${Number(value).toFixed(1)}%`, name];
                  if (name !== "Response Rate") return [`${Number(value).toFixed(1)}%`, name];
                  const total = p?.payload?.total ?? 0;
                  return [formatPctCount(value, nFromPct(value, total), total), "Response Rate"];
                }}
                labelFormatter={(label: string, payload: any) => {
                  const th = payload?.[0]?.payload?.threshold;
                  return th != null ? `Lulusan ${label} — Min. threshold: ${th.toFixed(1)}%` : `Lulusan ${label}`;
                }} />

              {tahunLulus !== "all" && (
                <ReferenceArea x1={tahunLulus} x2={tahunLulus} fill="hsl(var(--foreground))" fillOpacity={0.06}
                  stroke="hsl(var(--foreground))" strokeOpacity={0.3} strokeDasharray="3 3" />
              )}
              {markMax(chartData, "positive").filter((d) => d.isMax).map((d) => (
                <ReferenceArea key={`max-${d.year}`} x1={d.year} x2={d.year}
                  fill="hsl(45 95% 55%)" fillOpacity={0.14}
                  stroke="hsl(45 95% 45%)" strokeOpacity={0.55} strokeDasharray="4 2" />
              ))}

              <Bar dataKey="positive" stackId="a" name="Response Rate" cursor="pointer" maxBarSize={60}
                onClick={(d: any) => {
                  const total = d.total ?? 0;
                  const n = Math.round((d.positive / 100) * total);
                  setModal({ open: true, title: `Alumni Merespons — ${d.year} (${n}/${total})`, status: "submitted", tahun_lulus: d.year });
                  drillHook.fetch({ status: "submitted", tahun_lulus: d.year, page: 1 });
                }}>
                {chartData.map((d, i) => {
                  const met = d.threshold == null ? null : d.positive >= d.threshold;
                  const fill = met === null ? C.gray : met ? C.green : C.red;
                  return <Cell key={i} fill={fill} />;
                })}
                <LabelList content={SegmentLabel} />
                <LabelList content={CheckIcon} />
              </Bar>
              {/* Segmen "Belum Mengisi" juga bisa di-drill down. Backend memetakan
                  status 'started' (termasuk alumni yang belum punya baris responses)
                  ke bucket ini — lihat ResponseRateRepository. */}
              <Bar dataKey="negative" stackId="a" fill={C.grayDark} radius={[4, 4, 0, 0]} name="Belum Mengisi" maxBarSize={60}
                cursor="pointer"
                onClick={(d: any) => {
                  const total = d.total ?? 0;
                  const n = Math.round((d.negative / 100) * total);
                  setModal({ open: true, title: `Belum Mengisi — ${d.year} (${n}/${total})`, status: "started", tahun_lulus: d.year });
                  drillHook.fetch({ status: "started", tahun_lulus: d.year, page: 1 });
                }}>
                <LabelList content={SegmentLabel} />
              </Bar>
              <Line type="monotone" dataKey="positive" name="Tren Response Rate" stroke={C.blueDark} strokeWidth={2.5}
                dot={{ r: 4 }} activeDot={{ r: 7 } as any} />
              <Line type="monotone" dataKey="threshold" name="Threshold" stroke={C.red} strokeWidth={2}
                strokeDasharray="6 3" dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-3 justify-center flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: C.green }} />
          <span className="text-xs text-muted-foreground">Sudah Mengisi (%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: C.grayDark }} />
          <span className="text-xs text-muted-foreground">Belum Mengisi (%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="w-3 h-3 text-emerald-500" />
          <span className="text-xs text-muted-foreground">Tercapai (threshold tahun tsb.)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <X className="w-3 h-3 text-red-500" />
          <span className="text-xs text-muted-foreground">Belum tercapai</span>
        </div>
      </div>
    </KpiCard>

      <DrillDownModal
        isOpen={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        title={modal.title}
        data={drillHook.data as any}
        loading={drillHook.loading}
        error={drillHook.error}
        contextColumn={{ key: "status", label: "Status" }}
        onPageChange={(page, search) => drillHook.fetch({ status: modal.status, tahun_lulus: modal.tahun_lulus, page, search })}
      />
    </>
  );
};

export default Kpi3ParticipationTrendChart;
