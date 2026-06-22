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

const PIE_COLORS = [C.blueLight, C.green, C.orange, C.gray, C.blue, C.red];

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

  // Ambil semua label unik dari pie (sudah urut by count desc) → warna konsisten
  const fixLabel = (l: string) => (l === "0" || l === "" ? "Tidak Mengisi" : l);

  const allLabels = useMemo(() => {
    const arr: string[] = [];
    const seen = new Set<string>();
    pieResult.data?.data?.forEach((d) => {
      const label = fixLabel(d.sumber_biaya);
      if (!seen.has(label)) { arr.push(label); seen.add(label); }
    });
    antarResult.data?.data?.forEach((t) =>
      t.sumber.forEach((s) => {
        const label = fixLabel(s.label);
        if (!seen.has(label)) { arr.push(label); seen.add(label); }
      })
    );
    return arr;
  }, [pieResult.data, antarResult.data]);

  const labelColor = (label: string) =>
    PIE_COLORS[allLabels.indexOf(label) % PIE_COLORS.length] ?? C.gray;

  const MAX_PIE_SLICES = 8;
  const pieData = useMemo(() => {
    if (!pieResult.data?.data) return [];
    const sorted = [...pieResult.data.data].sort((a, b) => b.pct - a.pct);
    const top = sorted.slice(0, MAX_PIE_SLICES);
    const rest = sorted.slice(MAX_PIE_SLICES);
    const result = top.map((d) => ({
      name: d.sumber_biaya === "0" || d.sumber_biaya === "" ? "Tidak Mengisi" : d.sumber_biaya,
      value: +(d.pct).toFixed(1),
      count: d.count,
    }));
    if (rest.length > 0) {
      result.push({
        name: "Lainnya",
        value: +(rest.reduce((s, d) => s + d.pct, 0)).toFixed(1),
        count: rest.reduce((s, d) => s + d.count, 0),
      });
    }
    return result;
  }, [pieResult.data]);

  // Antar periode — grouped bar per tahun_lulus (top N + Lainnya)
  const antarTopLabels = useMemo(() => {
    if (!antarResult.data?.data) return [] as string[];
    const totals: Record<string, number> = {};
    antarResult.data.data.forEach((t) =>
      t.sumber.forEach((s) => { totals[fixLabel(s.label)] = (totals[fixLabel(s.label)] ?? 0) + s.count; })
    );
    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, MAX_PIE_SLICES).map(([l]) => l);
    if (sorted.length > MAX_PIE_SLICES) top.push("Lainnya");
    return top;
  }, [antarResult.data]);

  const antarData = useMemo(() => {
    if (!antarResult.data?.data) return [];
    const topSet = new Set(antarTopLabels.filter((l) => l !== "Lainnya"));
    return antarResult.data.data.map((t) => {
      const row: Record<string, any> = { tahun: t.tahun_lulus };
      let lainnyaPct = 0;
      t.sumber.forEach((s) => {
        const label = fixLabel(s.label);
        if (topSet.has(label)) {
          row[label] = +(s.pct).toFixed(1);
        } else {
          lainnyaPct += s.pct;
        }
      });
      if (antarTopLabels.includes("Lainnya")) row["Lainnya"] = +(lainnyaPct).toFixed(1);
      return row;
    });
  }, [antarResult.data, antarTopLabels]);

  const antarLabels = antarTopLabels;

  // Tooltip antar periode: tampilkan grouped sumber untuk tahun itu
  const antarTooltipData = useMemo(() => {
    const topSet = new Set(antarTopLabels.filter((l) => l !== "Lainnya"));
    const map: Record<string, Record<string, number>> = {};
    antarResult.data?.data?.forEach((t) => {
      map[t.tahun_lulus] = {};
      let lainnya = 0;
      t.sumber.forEach((s) => {
        const label = fixLabel(s.label);
        if (topSet.has(label)) {
          map[t.tahun_lulus][label] = s.pct;
        } else {
          lainnya += s.pct;
        }
      });
      if (antarTopLabels.includes("Lainnya")) map[t.tahun_lulus]["Lainnya"] = +(lainnya).toFixed(1);
    });
    return map;
  }, [antarResult.data, antarTopLabels]);

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
            : "Perubahan distribusi antar periode (grouped bar)"
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
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={antarData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
                    barCategoryGap="20%"
                    barGap={2}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3" stroke="hsl(var(--border))"
                      opacity={0.4} vertical={false}
                    />
                    <XAxis
                      dataKey="tahun" fontSize={12}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tickFormatter={(v) => `${v}%`} fontSize={12}
                      domain={[0, 100]}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip content={<CustomAntarTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {antarLabels.map((label) => (
                      <Bar
                        key={label} dataKey={label}
                        fill={labelColor(label)} radius={[3, 3, 0, 0]}
                        maxBarSize={40} cursor="pointer"
                        onClick={(d: any) =>
                          openModal(
                            `${label} — ${d.tahun} (${d[label]}%)`,
                            { sumber_biaya: label, tahun_lulus: d.tahun }
                          )
                        }
                        activeBar={{ stroke: "hsl(var(--foreground))", strokeWidth: 1.5 } as any}
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
                <h4 className="font-semibold text-foreground text-[15px]">Cara Membaca Grouped Bar</h4>
                <p className="text-muted-foreground">
                  Tiap kelompok bar mewakili satu tahun kelulusan. Tinggi bar = persentase lulusan dengan sumber
                  pembiayaan tertentu pada tahun tersebut.
                </p>
                <p className="text-sm text-muted-foreground">
                  Bandingkan ketinggian bar antar tahun untuk melihat pergeseran tren: misalnya kenaikan porsi beasiswa atau
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
