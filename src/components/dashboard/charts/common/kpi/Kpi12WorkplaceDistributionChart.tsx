import { useState, useMemo, useRef, useEffect } from "react";
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
import { tooltipStyle, KpiCard } from "../KpiCard";
import { MethodologyBlock } from "./Methodology";
import { renderActivePieShape, usePieActive } from "./pieUtils";
import {
  useInstansiJenis,
  useInstansiTingkat,
  useInstansiDrillDown,
  InstansiDrillDownParams,
} from "@/hooks/useInstansi";
import { useGlobalFilters } from "@/contexts/GlobalFiltersContext";
import DrillDownModal from "@/components/dashboard/DrillDownModal";
import { buildColorMap } from "@/lib/chartColors";

const OFFICIAL_JENIS_MAP: Record<string, string> = {
  "instansi pemerintah": "Instansi Pemerintah",
  "lembaga pemerintah": "Instansi Pemerintah",
  "organisasi non-profit/lembaga swadaya masyarakat": "Organisasi Non-profit",
  "perusahaan swasta": "Perusahaan Swasta",
  "wiraswasta/perusahaan sendiri": "Wiraswasta",
  "bumn/bumd": "BUMN/BUMD",
  "institusi/organisasi multilateral": "Institusi/Organisasi Multilateral",
};
const JENIS_DISPLAY = [
  "Instansi Pemerintah", "Organisasi Non-profit", "Perusahaan Swasta",
  "Wiraswasta", "BUMN/BUMD", "Institusi/Organisasi Multilateral", "Lainnya",
];
const JENIS_COLORS: Record<string, string> = {
  "Instansi Pemerintah": "#3b82f6",
  "Organisasi Non-profit": "#f59e0b",
  "Perusahaan Swasta": "#f97316",
  "Wiraswasta": "#8b5cf6",
  "BUMN/BUMD": "#10b981",
  "Institusi/Organisasi Multilateral": "#06b6d4",
  "Lainnya": "#9ca3af",
};
const normalizeJenis = (l: string): string => {
  if (!l || l === "0" || l === "Lainnya, tuliskan") return "Lainnya";
  const key = l.toLowerCase().trim();
  return OFFICIAL_JENIS_MAP[key] ?? "Lainnya";
};

/** Berapa kelompok batang yang muat tanpa scroll horizontal. */
const VISIBLE_YEARS = 3;
const BAR_GROUP_WIDTH = 180;

const Kpi12WorkplaceDistributionChart = () => {
  const { tahunLulus } = useGlobalFilters();
  const jenisHook = useInstansiJenis();
  const tingkatHook = useInstansiTingkat();
  const drillHook = useInstansiDrillDown();
  const pieActive = usePieActive();

  const [modal, setModal] = useState<{
    open: boolean;
    title: string;
    fetchParams: InstansiDrillDownParams;
  }>({ open: false, title: "", fetchParams: {} });

  const openModal = (title: string, fetchParams: InstansiDrillDownParams) => {
    setModal({ open: true, title, fetchParams });
    drillHook.fetch({ ...fetchParams, page: 1 });
  };

  const pieData = useMemo(() => {
    if (!jenisHook.data?.data) return [];
    const merged: Record<string, { pct: number; count: number }> = {};
    jenisHook.data.data.forEach((d) => {
      const label = normalizeJenis(d.jenis);
      if (!merged[label]) merged[label] = { pct: 0, count: 0 };
      merged[label].pct += d.pct;
      merged[label].count += d.count;
    });
    return JENIS_DISPLAY
      .filter((l) => merged[l])
      .map((l) => ({
        name: l,
        value: +(merged[l].pct).toFixed(1),
        count: merged[l].count,
        color: JENIS_COLORS[l] ?? "#9ca3af",
      }));
  }, [jenisHook.data]);

  // Label MENTAH yang jatuh ke irisan "Lainnya". Sebelumnya "0" ikut dibuang di
  // sini padahal normalizeJenis() memasukkannya ke irisan ini — akibatnya isi
  // modal selalu lebih sedikit dari angka pada irisannya, dan kalau seluruh
  // "Lainnya" kebetulan berasal dari "0" array-nya kosong dan backend membalas
  // 422. Yang dibuang cukup label kosong, karena tidak bisa difilter.
  const lainnyaRawLabels = useMemo(() => {
    if (!jenisHook.data?.data) return [] as string[];
    return jenisHook.data.data
      .filter((d) => normalizeJenis(d.jenis) === "Lainnya" && !!d.jenis)
      .map((d) => d.jenis);
  }, [jenisHook.data]);

  const pieTotal = jenisHook.data?.total ?? pieData.reduce((s, d) => s + d.count, 0);
  const displayTahun = tahunLulus === "all" ? undefined : tahunLulus;

  // ── Bar: sebaran level perusahaan per prodi ──
  // Dulu bagian ini merender DEFAULT_GROUPED — angka karangan 2019–2024 yang
  // tidak pernah menyentuh backend, sehingga drill-down-nya mustahil benar.
  // Sekarang memakai /dashboard/sebaraninstansi/tingkat, satu-satunya endpoint
  // tingkat yang ada. Endpoint itu mengagregasi per PRODI (bukan per tahun),
  // jadi sumbu X ikut berubah.
  const tingkatLabels = useMemo(() => {
    const seen = new Set<string>();
    tingkatHook.data?.data?.forEach((p) =>
      p.tingkat.forEach((t) => { if (t.label) seen.add(t.label); }),
    );
    return [...seen].sort();
  }, [tingkatHook.data]);

  const tingkatColor = useMemo(() => buildColorMap(tingkatLabels), [tingkatLabels]);

  const tingkatData = useMemo(() => {
    if (!tingkatHook.data?.data) return [];
    return tingkatHook.data.data.map((p) => {
      const row: Record<string, any> = { prodi: p.nama_prodi, jenjang: p.jenjang };
      p.tingkat.forEach((t) => {
        if (!t.label) return;   // label kosong tidak bisa difilter saat drill-down
        row[t.label] = +((row[t.label] ?? 0) + t.pct).toFixed(1);
        row[`${t.label}_count`] = (row[`${t.label}_count`] ?? 0) + t.count;
      });
      return row;
    });
  }, [tingkatHook.data]);

  const barChartWidth = Math.max(tingkatData.length * BAR_GROUP_WIDTH, 400);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && tingkatData.length > VISIBLE_YEARS) {
      el.scrollLeft = 0;
    }
  }, [tingkatData.length]);

  const pieEmpty = !jenisHook.loading && pieData.length === 0;

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-4">
        {/* ── Pie: Sebaran Jenis Perusahaan (data real dari BE) ── */}
        <KpiCard
          loading={jenisHook.loading}
          error={jenisHook.error}
          empty={pieEmpty}
          title="Sebaran Jenis Perusahaan"
          subtitle={displayTahun ? `Tahun kelulusan ${displayTahun}` : "Semua periode"}
          compareType="jenisInstansi"
          methodology={
            <MethodologyBlock
              description="Proporsi lulusan menurut jenis perusahaan tempat bekerja."
              formula={<>% Jenis = (Lulusan Bekerja di Jenis X / Total Lulusan Bekerja) × 100%</>}
            />
          }
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} dataKey="value" nameKey="name" outerRadius={100}
                  label={(e: any) => e.percent > 0.05 ? `${e.name}: ${e.value}%` : ""}
                  labelLine={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                  activeIndex={pieActive.activeIndex} activeShape={renderActivePieShape}
                  onMouseEnter={pieActive.onMouseEnter} onMouseLeave={pieActive.onMouseLeave}
                  cursor="pointer"
                  onClick={(d: any) => {
                    const params: InstansiDrillDownParams = d.name === "Lainnya"
                      ? { jenis_instansi: lainnyaRawLabels }
                      : { jenis_instansi: d.name };
                    openModal(`${d.name} (${d.value}% · ${d.count} alumni)`, params);
                  }}
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: number, n: string) => [
                    `${v}%${pieTotal > 0 ? ` (${Math.round((v * pieTotal) / 100)} alumni)` : ""}`,
                    n,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </KpiCard>

        {/* ── Bar: Sebaran Level Perusahaan per Prodi (data real dari BE) ── */}
        <KpiCard
          loading={tingkatHook.loading}
          error={tingkatHook.error}
          empty={!tingkatHook.loading && tingkatData.length === 0}
          title="Sebaran Level Perusahaan per Program Studi"
          subtitle={`Sumbu Y: persentase lulusan • Sumbu X: program studi${displayTahun ? ` • Tahun kelulusan ${displayTahun}` : ""}`}
          compareType="tingkatInstansi"
          methodology={
            <MethodologyBlock
              description="Proporsi level perusahaan tempat bekerja lulusan per program studi."
              formula={<>% Level per Prodi = (Lulusan Bekerja di Level X pada Prodi P / Total Lulusan Bekerja Prodi P) × 100%</>}
            />
          }
        >
          <div ref={scrollRef} className="h-72 overflow-x-auto overflow-y-hidden" style={{ scrollBehavior: "smooth" }}>
            <div style={{ width: tingkatData.length > VISIBLE_YEARS ? barChartWidth : "100%", height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tingkatData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="prodi" fontSize={11} stroke="hsl(var(--muted-foreground))" interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis tickFormatter={(v) => `${v}%`} fontSize={12} domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {tingkatLabels.map((label) => (
                    <Bar
                      key={label} dataKey={label} name={label}
                      fill={tingkatColor[label]} radius={[3, 3, 0, 0]} cursor="pointer"
                      // Label dikirim apa adanya — backend memfilter 'equals' pada
                      // label asli gudang data. nama_prodi ikut supaya modalnya
                      // benar-benar batang yang diklik, bukan seluruh prodi.
                      onClick={(d: any) =>
                        openModal(
                          `${label} — ${d.prodi} (${d[label] ?? 0}% · ${d[`${label}_count`] ?? 0} alumni)`,
                          { tingkat_instansi: label, nama_prodi: d.prodi, tahun_lulus: displayTahun }
                        )
                      }
                      activeBar={{ stroke: "hsl(var(--foreground))", strokeWidth: 1.5 } as any}
                    >
                      <LabelList dataKey={label} position="top" fontSize={10} formatter={(v: number) => (v ? `${v}%` : "")} />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
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
        contextColumn={{ key: "jenis_instansi", label: "Jenis Instansi" }}
        onPageChange={(page, search) =>
          drillHook.fetch({ ...modal.fetchParams, page, search })
        }
      />
    </>
  );
};

export default Kpi12WorkplaceDistributionChart;
