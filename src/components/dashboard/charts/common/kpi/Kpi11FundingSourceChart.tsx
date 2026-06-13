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
import { PieChart as PieIcon, BarChart3 } from "lucide-react";
import { usePembiayaanPie, usePembiayaanPerProdi } from "@/hooks/usePembiayaan";

const PIE_COLORS = [C.blueLight, C.green, C.orange, C.gray, C.blue, C.red];

const Kpi11FundingSourceChart = () => {
  const pieResult      = usePembiayaanPie();
  const perProdiResult = usePembiayaanPerProdi();
  const pieActive      = usePieActive();
  const [view, setView] = useState<"pie" | "bar">("pie");

  const loading = pieResult.isLoading || perProdiResult.isLoading;
  const error   = (pieResult.error as Error | null)?.message
                ?? (perProdiResult.error as Error | null)?.message
                ?? null;

  // Label ordering dari pie (BE returns by count desc) → warna konsisten antara pie & bar
  const allLabels = useMemo(() => {
    const arr: string[] = [];
    const seen = new Set<string>();
    pieResult.data?.data?.forEach((d) => {
      if (!seen.has(d.sumber_biaya)) { arr.push(d.sumber_biaya); seen.add(d.sumber_biaya); }
    });
    perProdiResult.data?.data?.forEach((p) =>
      p.sumber.forEach((s) => {
        if (!seen.has(s.label)) { arr.push(s.label); seen.add(s.label); }
      })
    );
    return arr;
  }, [pieResult.data, perProdiResult.data]);

  const labelColor = (label: string) =>
    PIE_COLORS[allLabels.indexOf(label) % PIE_COLORS.length] ?? C.gray;

  const pieData = useMemo(() => {
    if (!pieResult.data?.data) return [];
    return pieResult.data.data.map((d) => ({
      name:  d.sumber_biaya,
      value: d.pct,
      count: d.count,
    }));
  }, [pieResult.data]);

  const barData = useMemo(() => {
    if (!perProdiResult.data?.data) return [];
    return perProdiResult.data.data.map((p) => {
      const row: Record<string, any> = { prodi: p.nama_prodi };
      p.sumber.forEach((s) => { row[s.label] = +(s.pct).toFixed(1); });
      return row;
    });
  }, [perProdiResult.data]);

  const barLabels = useMemo(() => {
    const set = new Set<string>();
    perProdiResult.data?.data?.forEach((p) => p.sumber.forEach((s) => set.add(s.label)));
    return [...set];
  }, [perProdiResult.data]);

  const isEmpty = !loading && (view === "pie" ? pieData.length === 0 : barData.length === 0);
  const barChartHeight = Math.max(barData.length * 44 + 60, 288);
  const total = pieResult.data?.total ?? 0;

  return (
    <KpiCard
      loading={loading}
      error={error}
      empty={isEmpty}
      title="Distribusi Sumber Pembiayaan Kuliah"
      subtitle={
        view === "pie"
          ? "Proporsi sumber pembiayaan — periode terakhir"
          : "Distribusi sumber pembiayaan per program studi"
      }
      compareType="sumberBiaya"
      headerExtra={
        <ToggleGroup
          type="single" value={view} size="sm"
          onValueChange={(v) => v && setView(v as "pie" | "bar")}
          className="bg-muted/40 rounded-md p-0.5"
        >
          <ToggleGroupItem
            value="pie" aria-label="Tampilkan pie"
            className="h-7 px-2 text-xs gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <PieIcon className="w-3.5 h-3.5" /> Pie
          </ToggleGroupItem>
          <ToggleGroupItem
            value="bar" aria-label="Tampilkan per prodi"
            className="h-7 px-2 text-xs gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <BarChart3 className="w-3.5 h-3.5" /> Per Prodi
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
            description="Distribusi sumber pembiayaan studi lulusan per program studi."
            formula={<>% Sumber per Prodi = (Lulusan Prodi dengan Sumber X / Total Lulusan Prodi) × 100%</>}
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
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {barLabels.map((label) => (
                    <Bar key={label} dataKey={label} stackId="a" fill={labelColor(label)} />
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
              <h4 className="font-semibold text-foreground text-[15px]">Cara Membaca Per Prodi</h4>
              <p className="text-muted-foreground">
                Setiap baris mewakili <strong>satu program studi</strong>. Panjang segmen = persentase alumni prodi
                tersebut yang menggunakan sumber pembiayaan tertentu.
              </p>
              <p className="text-sm text-muted-foreground">
                Bandingkan antar prodi untuk melihat perbedaan pola pembiayaan studi.
              </p>
              <ul className="space-y-1.5 text-sm mt-1">
                {barLabels.map((label) => (
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
  );
};

export default Kpi11FundingSourceChart;
