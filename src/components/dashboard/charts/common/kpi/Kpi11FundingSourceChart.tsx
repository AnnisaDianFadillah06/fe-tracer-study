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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PieChart as PieIcon, BarChart3, TrendingUp } from "lucide-react";
import {
  usePembiayaanPie,
  usePembiayaanAntarPeriode,
  usePembiayaanDrillDown,
  PembiayaanDrillDownParams,
} from "@/hooks/usePembiayaan";
import DrillDownModal from "@/components/dashboard/DrillDownModal";

const PIE_COLORS = [C.blueLight, C.green, C.orange, C.gray, C.blue, C.red, "#8b5cf6", "#ec4899"];

const OFFICIAL_SOURCES = new Set([
  "Biaya Sendiri/Keluarga",
  "Beasiswa BIDIKMISI",
  "Beasiswa PPA",
  "Beasiswa Perusahaan/Swasta",
  "Beasiswa AFIRMASI",
  "Beasiswa ADIK",
  "Tidak Mengisi",
]);

const normalizeLabel = (l: string): string => {
  if (l === "0" || l === "") return "Tidak Mengisi";
  if (OFFICIAL_SOURCES.has(l)) return l;
  return "Lainnya";
};

type View = "pie" | "antar";

const Kpi11FundingSourceChart = () => {
  const pieResult   = usePembiayaanPie();
  const antarResult = usePembiayaanAntarPeriode();
  const drillHook   = usePembiayaanDrillDown();
  const pieActive   = usePieActive();
  const [view, setView] = useState<View>("pie");

  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    fetchParams: PembiayaanDrillDownParams;
  }>({ open: false, title: "", fetchParams: {} });

  const openModal = (title: string, fetchParams: PembiayaanDrillDownParams) => {
    setModal({ open: true, title, fetchParams });
    drillHook.fetch({ ...fetchParams, page: 1 });
  };

  const loading = view === "pie" ? pieResult.isLoading : antarResult.isLoading;
  const error   = view === "pie"
    ? (pieResult.error as Error | null)?.message ?? null
    : (antarResult.error as Error | null)?.message ?? null;

  const LABEL_ORDER = [...OFFICIAL_SOURCES, "Lainnya"];

  const labelColor = (label: string) =>
    PIE_COLORS[LABEL_ORDER.indexOf(label) % PIE_COLORS.length] ?? C.gray;

  const pieData = useMemo(() => {
    if (!pieResult.data?.data) return [];
    const merged: Record<string, { pct: number; count: number }> = {};
    pieResult.data.data.forEach((d) => {
      const label = normalizeLabel(d.sumber_biaya);
      if (!merged[label]) merged[label] = { pct: 0, count: 0 };
      merged[label].pct += d.pct;
      merged[label].count += d.count;
    });
    return LABEL_ORDER
      .filter((l) => merged[l])
      .map((l) => ({ name: l, value: +(merged[l].pct).toFixed(1), count: merged[l].count }));
  }, [pieResult.data]);

  const antarLabels = useMemo(() => {
    if (!antarResult.data?.data) return [] as string[];
    const seen = new Set<string>();
    antarResult.data.data.forEach((t) =>
      t.sumber.forEach((s) => seen.add(normalizeLabel(s.label)))
    );
    return LABEL_ORDER.filter((l) => seen.has(l));
  }, [antarResult.data]);

  const antarData = useMemo(() => {
    if (!antarResult.data?.data) return [];
    return antarResult.data.data.map((t) => {
      const row: Record<string, any> = { tahun: t.tahun_lulus };
      t.sumber.forEach((s) => {
        const label = normalizeLabel(s.label);
        row[label] = +((row[label] ?? 0) + s.pct).toFixed(1);
        row[`${label}_count`] = (row[`${label}_count`] ?? 0) + s.count;
      });
      return row;
    });
  }, [antarResult.data]);

  const antarTooltipData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    antarResult.data?.data?.forEach((t) => {
      const merged: Record<string, number> = {};
      t.sumber.forEach((s) => {
        const label = normalizeLabel(s.label);
        merged[label] = (merged[label] ?? 0) + s.pct;
      });
      map[t.tahun_lulus] = Object.fromEntries(
        Object.entries(merged).map(([k, v]) => [k, +(v).toFixed(1)])
      );
    });
    return map;
  }, [antarResult.data]);

  const isEmpty = !loading && (view === "pie" ? pieData.length === 0 : antarData.length === 0);
  const total   = pieResult.data?.total ?? 0;

  const CustomAntarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const tahunData = antarTooltipData[label] ?? {};
    return (
      <div style={{ ...tooltipStyle, minWidth: 160 }}>
        <p className="font-semibold mb-1">{label}</p>
        {Object.entries(tahunData).map(([k, v]) => (
          <p key={k} style={{ color: labelColor(k) }}>{k}: {v}%</p>
        ))}
      </div>
    );
  };

  return (
    <>
      <KpiCard
        loading={loading}
        error={error}
        empty={isEmpty}
        title="Distribusi Sumber Pembiayaan Kuliah"
        subtitle={
          view === "pie"
            ? "Proporsi sumber pembiayaan — periode terakhir"
            : "Perubahan distribusi antar periode (stacked bar)"
        }
        compareType="sumberBiaya"
        headerExtra={
          <ToggleGroup
            type="single" value={view} size="sm"
            onValueChange={(v) => v && setView(v as View)}
            className="bg-muted/40 rounded-md p-0.5"
          >
            <ToggleGroupItem
              value="pie" aria-label="Tampilkan pie"
              className="h-7 px-2 text-xs gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <PieIcon className="w-3.5 h-3.5" /> Pie
            </ToggleGroupItem>
            <ToggleGroupItem
              value="antar" aria-label="Antar periode"
              className="h-7 px-2 text-xs gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <TrendingUp className="w-3.5 h-3.5" /> Antar Periode
            </ToggleGroupItem>
          </ToggleGroup>
        }
        methodology={
          view === "pie" ? (
            <MethodologyBlock
              description="Proporsi sumber pembiayaan studi lulusan pada periode terakhir."
              formula={<>% Sumber = (Jumlah Lulusan dengan Sumber Pembiayaan X / Total Lulusan Periode) × 100%</>}
            />
          ) : (
            <MethodologyBlock
              description="Perubahan distribusi sumber pembiayaan antar tahun kelulusan."
              formula={<>% Sumber per Tahun = (Lulusan dengan Sumber X pada Tahun T / Total Lulusan Tahun T) × 100%</>}
            />
          )
        }
      >
        <div className="grid lg:grid-cols-2 gap-5 items-stretch">
          <div className="min-w-0">
            {view === "pie" ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData} dataKey="value" nameKey="name" outerRadius={90} innerRadius={0}
                      label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ""}
                      labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                      activeIndex={pieActive.activeIndex} activeShape={renderActivePieShape}
                      onMouseEnter={pieActive.onMouseEnter} onMouseLeave={pieActive.onMouseLeave}
                      cursor="pointer"
                      onClick={(d: any) =>
                        openModal(
                          `${d.name} — ${d.value}% (${d.count} alumni)`,
                          { sumber_biaya: d.name }
                        )
                      }
                    >
                      {pieData.map((d, i) => (
                        <Cell key={i} fill={labelColor(d.name)} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number, n) => [
                        `${v}%${total > 0 ? ` (${Math.round((v * total) / 100)} alumni)` : ""}`,
                        n,
                      ]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: Math.max(200, antarData.length * 52) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={antarData}
                    layout="vertical"
                    margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3" stroke="hsl(var(--border))"
                      horizontal={false}
                    />
                    <XAxis
                      type="number" domain={[0, 100]}
                      tickFormatter={(v: number) => `${Math.round(v)}%`}
                      fontSize={12} stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      dataKey="tahun" type="category" width={50}
                      fontSize={12} stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                      content={<CustomAntarTooltip />}
                    />
                    <Legend wrapperStyle={{ paddingTop: 10, fontSize: 11 }} />
                    {antarLabels.map((label) => (
                      <Bar
                        key={label} dataKey={label} stackId="a"
                        fill={labelColor(label)} cursor="pointer"
                        onClick={(d: any) =>
                          openModal(
                            `${label} — ${d.tahun} (${d[label]}% · ${d[`${label}_count`] ?? "?"} alumni)`,
                            { sumber_biaya: label, tahun_lulus: d.tahun }
                          )
                        }
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <aside className="rounded-lg border border-border bg-muted/30 p-5 text-sm leading-relaxed flex flex-col gap-3">
            {view === "pie" ? (
              <>
                <h4 className="font-semibold text-foreground text-[15px]">Cara Membaca Pie</h4>
                <p className="text-muted-foreground">
                  Pie menunjukkan <strong>proporsi sumber pembiayaan</strong> studi lulusan pada periode terakhir.
                  Setiap potongan = persentase lulusan yang menggunakan sumber tersebut.
                </p>
                <p className="text-xs text-muted-foreground">
                  Klik potongan pie untuk melihat daftar alumni dengan sumber pembiayaan tersebut.
                </p>
                <ul className="space-y-1.5 text-sm">
                  {pieData.map((d) => (
                    <li key={d.name} className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 rounded-sm shrink-0" style={{ background: labelColor(d.name) }} />
                      <strong>{d.name}</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h4 className="font-semibold text-foreground text-[15px]">Cara Membaca Stacked Bar</h4>
                <p className="text-muted-foreground">
                  Tiap baris mewakili satu tahun kelulusan. Panjang segmen = persentase lulusan dengan sumber
                  pembiayaan tertentu pada tahun tersebut.
                </p>
                <p className="text-sm text-muted-foreground">
                  Bandingkan proporsi segmen antar tahun untuk melihat pergeseran tren: misalnya kenaikan porsi beasiswa atau
                  penurunan porsi mandiri.
                </p>
                <p className="text-xs text-muted-foreground">
                  Klik bar untuk melihat data alumni pada sumber &amp; tahun tersebut.
                </p>
                <ul className="space-y-1.5 text-sm mt-1">
                  {antarLabels.map((label) => (
                    <li key={label} className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 rounded-sm shrink-0" style={{ background: labelColor(label) }} />
                      <span>{label}</span>
                    </li>
                  ))}
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
        contextColumn={{ key: "sumber_biaya", label: "Sumber Biaya" }}
        onPageChange={(page, search) =>
          drillHook.fetch({ ...modal.fetchParams, page, search })
        }
      />
    </>
  );
};

export default Kpi11FundingSourceChart;
