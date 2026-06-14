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
  const allLabels = useMemo(() => {
    const arr: string[] = [];
    const seen = new Set<string>();
    pieResult.data?.data?.forEach((d) => {
      if (!seen.has(d.sumber_biaya)) { arr.push(d.sumber_biaya); seen.add(d.sumber_biaya); }
    });
    antarResult.data?.data?.forEach((t) =>
      t.sumber.forEach((s) => {
        if (!seen.has(s.label)) { arr.push(s.label); seen.add(s.label); }
      })
    );
    return arr;
  }, [pieResult.data, antarResult.data]);

  const labelColor = (label: string) =>
    PIE_COLORS[allLabels.indexOf(label) % PIE_COLORS.length] ?? C.gray;

  // Pie data
  const pieData = useMemo(() => {
    if (!pieResult.data?.data) return [];
    return pieResult.data.data.map((d) => ({
      name:  d.sumber_biaya,
      value: d.pct,
      count: d.count,
    }));
  }, [pieResult.data]);

  // Antar periode — grouped bar per tahun_lulus
  const antarData = useMemo(() => {
    if (!antarResult.data?.data) return [];
    return antarResult.data.data.map((t) => {
      const row: Record<string, any> = { tahun: t.tahun_lulus };
      t.sumber.forEach((s) => { row[s.label] = +(s.pct).toFixed(1); });
      return row;
    });
  }, [antarResult.data]);

  const antarLabels = useMemo(() => {
    const set = new Set<string>();
    antarResult.data?.data?.forEach((t) => t.sumber.forEach((s) => set.add(s.label)));
    return [...set];
  }, [antarResult.data]);

  // Tooltip antar periode: tampilkan semua sumber untuk tahun itu
  const antarTooltipData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    antarResult.data?.data?.forEach((t) => {
      map[t.tahun_lulus] = {};
      t.sumber.forEach((s) => { map[t.tahun_lulus][s.label] = s.pct; });
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
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={antarData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
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
                      label={{ value: "Tahun Kelulusan", position: "insideBottom", offset: -10, fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
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
                  {allLabels.map((label) => (
                    <li key={label} className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 rounded-sm shrink-0" style={{ background: labelColor(label) }} />
                      <strong>{label}</strong>
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
