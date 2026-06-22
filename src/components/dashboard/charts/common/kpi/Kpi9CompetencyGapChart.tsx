import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  Cell,
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
import { useKompetensiGap, useKompetensiGapDrillDown } from "@/hooks/useKompetensi";
import DrillDownModal from "@/components/dashboard/DrillDownModal";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Radar as RadarIcon, BarChart3 } from "lucide-react";

const CONTEXT_COLUMN = { key: "gap", label: "Gap" };

const Kpi9CompetencyGapChart = () => {
  const { data, loading, error } = useKompetensiGap();
  const drillHook = useKompetensiGapDrillDown();
  const [view, setView] = useState<"radar" | "bar">("radar");
  const [modal, setModal] = useState<{ open: boolean; title: string; kode_field?: string }>({ open: false, title: "" });

  // Transform: radar membutuhkan skor_lulus & skor_dibutuhkan per indikator
  const cleanLabel = (label: string) =>
    label.replace(/\s*[—–-]\s*dikuasai saat lulus$/i, "").trim();

  const radarData = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((d) => ({
      kompetensi: cleanLabel(d.label),
      lulus:      d.skor_lulus,
      industri:   d.skor_dibutuhkan,
    }));
  }, [data]);

  const gapData = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((d) => ({
      kompetensi: cleanLabel(d.label),
      gap:        +(d.skor_lulus - d.skor_dibutuhkan).toFixed(2),
    }));
  }, [data]);

  const isEmpty = !loading && radarData.length === 0;

  return (
    <>
    <KpiCard
      loading={loading}
      error={error}
      empty={isEmpty}
      title="Analisis Gap Kompetensi Lulusan"
      subtitle={
        view === "radar"
          ? "Radar chart — profil kompetensi saat lulus vs kebutuhan industri"
          : "Bar horizontal — gap per kompetensi (hijau = aman, merah = di bawah industri)"
      }
      compareType="competency"
      headerExtra={
        <ToggleGroup
          type="single" value={view} size="sm"
          onValueChange={(v) => v && setView(v as "radar" | "bar")}
          className="bg-muted/40 rounded-md p-0.5"
        >
          <ToggleGroupItem
            value="radar" aria-label="Tampilkan radar"
            className="h-7 px-2 text-xs gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <RadarIcon className="w-3.5 h-3.5" /> Radar
          </ToggleGroupItem>
          <ToggleGroupItem
            value="bar" aria-label="Tampilkan bar horizontal"
            className="h-7 px-2 text-xs gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Bar Gap
          </ToggleGroupItem>
        </ToggleGroup>
      }
      methodology={
        view === "radar" ? (
          <MethodologyBlock
            description="Membandingkan rata-rata skor kompetensi yang dimiliki saat lulus dengan skor kompetensi yang dibutuhkan industri."
            formula={<>Skor Kompetensi = Σ Skor Likert (1–5) / Jumlah Responden</>}
          />
        ) : (
          <MethodologyBlock
            description="Selisih rata-rata skor kompetensi saat lulus terhadap kebutuhan industri."
            formula={<>Gap = Skor Saat Lulus − Skor Kebutuhan Industri</>}
            notes="Gap negatif berarti kompetensi lulusan di bawah ekspektasi industri."
          />
        )
      }
    >
      <div className="grid lg:grid-cols-2 gap-5 items-stretch">
        {/* ── Chart area ── */}
        <div className="min-w-0">
          {view === "radar" ? (
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 16, right: 24, bottom: 8, left: 24 }}>
                  {/* Grid lebih kontras supaya terlihat jelas seperti jaring laba-laba */}
                  <PolarGrid
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.8}
                    strokeWidth={1}
                  />
                  {/* Label sumbu — font lebih besar untuk keterbacaan */}
                  <PolarAngleAxis
                    dataKey="kompetensi"
                    tick={{ fontSize: 13, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                  />
                  {/* Cincin skala 0–5 dengan label numerik di sumbu */}
                  <PolarRadiusAxis
                    domain={[0, 5]}
                    tickCount={6}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    angle={72}
                    axisLine={false}
                  />
                  <Radar
                    name="Saat Lulus" dataKey="lulus"
                    stroke={C.blue} fill={C.blue} fillOpacity={0.35}
                    dot={{ r: 5, fill: C.blue, strokeWidth: 0 }}
                    activeDot={{ r: 7 } as any}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Kebutuhan Industri" dataKey="industri"
                    stroke={C.orange} fill={C.orange} fillOpacity={0.2}
                    dot={{ r: 5, fill: C.orange, strokeWidth: 0 }}
                    activeDot={{ r: 7 } as any}
                    strokeWidth={2}
                  />
                  <Legend wrapperStyle={{ fontSize: 13, fontWeight: 500, paddingTop: 8 }} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number, name) => [v.toFixed(2), name]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ height: Math.max(gapData.length * 52 + 48, 200) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={gapData}
                  layout="vertical"
                  margin={{ top: 5, right: 48, left: 8, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3" stroke="hsl(var(--border))"
                    opacity={0.35} horizontal={false}
                  />
                  <XAxis
                    type="number" domain={[-1.5, 1.5]} fontSize={12}
                    tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    type="category" dataKey="kompetensi"
                    width={160} fontSize={12}
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fill: "hsl(var(--foreground))", fontWeight: 500 }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v: number) => [
                      `${v >= 0 ? "+" : ""}${v.toFixed(2)} (${v >= 0 ? "Aman" : "Perlu ditingkatkan"})`,
                      "Gap",
                    ]}
                  />
                  <ReferenceLine x={0} stroke="hsl(var(--foreground))" strokeWidth={1.5} />
                  <Bar dataKey="gap" radius={[0, 6, 6, 0]} maxBarSize={30}
                    cursor="pointer"
                    onClick={(d: any) => {
                      const item = data?.data?.find((x) => cleanLabel(x.label) === d.kompetensi);
                      setModal({ open: true, title: `${d.kompetensi} (Gap: ${d.gap >= 0 ? "+" : ""}${d.gap.toFixed(2)})`, kode_field: item?.kode_field });
                      drillHook.fetch({ kode_field: item?.kode_field, page: 1 });
                    }}>
                    {gapData.map((d, i) => (
                      <Cell key={i} fill={d.gap >= 0 ? C.green : C.red} />
                    ))}
                    <LabelList
                      dataKey="gap"
                      position="right"
                      fontSize={12}
                      fontWeight={600}
                      formatter={(v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}`}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* ── Keterangan samping ── */}
        <aside className="rounded-lg border border-border bg-muted/30 p-5 text-sm leading-relaxed flex flex-col gap-3">
          {view === "radar" ? (
            <>
              <h4 className="font-semibold text-foreground text-[15px]">Cara Membaca Radar</h4>
              <p className="text-muted-foreground">
                Nilai pada grafik merupakan <strong>rata-rata skor persepsi</strong> alumni terhadap kompetensi pada skala{" "}
                <strong>1–5</strong>:
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2.5">
                  <span
                    className="inline-block w-4 h-4 rounded-sm shrink-0"
                    style={{ background: C.blue }}
                  />
                  <span>
                    <strong>Saat Lulus</strong> — kompetensi yang dimiliki alumni saat lulus.
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <span
                    className="inline-block w-4 h-4 rounded-sm shrink-0"
                    style={{ background: C.orange }}
                  />
                  <span>
                    <strong>Kebutuhan Industri</strong> — ekspektasi industri terhadap kompetensi.
                  </span>
                </li>
              </ul>
              <div className="text-sm text-muted-foreground border-t border-border pt-3 space-y-1">
                <p><strong>1</strong> = sangat kecil / sangat kurang</p>
                <p><strong>3</strong> = cukup</p>
                <p><strong>5</strong> = sangat besar / sangat baik</p>
              </div>
              <p className="text-sm text-muted-foreground">
                Semakin luas area biru menutup area oranye, semakin sesuai kompetensi lulusan dengan kebutuhan industri.
              </p>
            </>
          ) : (
            <>
              <h4 className="font-semibold text-foreground text-[15px]">Cara Membaca Gap</h4>
              <p className="text-muted-foreground">
                Bar menunjukkan <strong>selisih</strong> skor kompetensi lulusan terhadap kebutuhan industri.
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <span
                    className="inline-block w-4 h-4 rounded-sm mt-0.5 shrink-0"
                    style={{ background: C.green }}
                  />
                  <span>
                    <strong>Hijau (positif)</strong> — kompetensi lulusan{" "}
                    <em>melampaui</em> persepsi kebutuhan industri. Ini kondisi yang baik.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span
                    className="inline-block w-4 h-4 rounded-sm mt-0.5 shrink-0"
                    style={{ background: C.red }}
                  />
                  <span>
                    <strong>Merah (negatif)</strong> — kompetensi lulusan{" "}
                    <em>di bawah</em> kebutuhan industri. Indikator yang perlu perhatian / perbaikan kurikulum.
                  </span>
                </li>
              </ul>
            </>
          )}
        </aside>
      </div>
    </KpiCard>

    <DrillDownModal
      isOpen={modal.open}
      onClose={() => setModal((m) => ({ ...m, open: false }))}
      title={modal.title}
      data={drillHook.data}
      loading={drillHook.loading}
      error={drillHook.error}
      contextColumn={CONTEXT_COLUMN}
      onPageChange={(page, search) => drillHook.fetch({ kode_field: modal.kode_field, page, search })}
    />
    </>
  );
};

export default Kpi9CompetencyGapChart;
