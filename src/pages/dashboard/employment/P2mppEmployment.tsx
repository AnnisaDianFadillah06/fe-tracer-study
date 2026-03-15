import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import {
  KpiComboChart,
  KpiStackedBarChart,
  KpiDistributionBarChart,
  KpiMultiLineChart,
  JobFindingMethodChart,
} from "@/components/dashboard/charts/common";
import { useP2mppEmployment } from "@/hooks/dashboard/p2mpp";

const P2mppEmploymentOutcomePage = () => {
  const { selectedYear, setSelectedYear, stats, kpiKeterserapan, levelPerusahaan } = useP2mppEmployment();

  const getProdiData = (
    perProdi: Record<string, { name: string; positive: number; negative: number }[]>,
    year: string | null
  ) => perProdi[year ?? "all"];

  const getDistribution = (
    dist: Record<string, { category: string; value: number; color: string }[]>,
    year: string | null
  ) => dist[year ?? "all"];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold">Employment Outcome</h1>
            <p className="text-muted-foreground">KPI Keterserapan Lulusan — Politeknik Negeri Bandung</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-emerald-400">Realtime</span>
          </div>
        </div>

        {/* Stat Cards */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <StatCard key={s.title} {...s} />
          ))}
        </motion.div>

        {/* ── KPI Tingkat Keterserapan Lulusan ── */}
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            KPI Tingkat Keterserapan Lulusan
          </h2>

          {/* Row 1: Combo chart full width */}
          <KpiComboChart
            title="Tren Tingkat Keterserapan Lulusan (3 Tahun)"
            data={kpiKeterserapan.combo}
            threshold={kpiKeterserapan.threshold}
            thresholdLabel="Target"
            selectedYear={selectedYear}
            onYearClick={setSelectedYear}
          />

          {/* Row 2: 3 charts side by side */}
          <div className="grid lg:grid-cols-3 gap-4">
            <KpiStackedBarChart
              title="Keterserapan per Prodi"
              data={getProdiData(kpiKeterserapan.perProdi, selectedYear)}
              positiveLabel="Terserap (%)"
              negativeLabel="Belum Terserap (%)"
              threshold={kpiKeterserapan.threshold}
              thresholdLabel="Target"
              selectedYear={selectedYear}
              lamThresholds={kpiKeterserapan.lamThresholds}
            />
            <KpiDistributionBarChart
              title="Distribusi Keterserapan Lulusan"
              data={getDistribution(kpiKeterserapan.distribusiKeterserapan, selectedYear)}
              selectedYear={selectedYear}
            />
            <KpiDistributionBarChart
              title="Distribusi Jenis Instansi Tempat Bekerja"
              data={getDistribution(kpiKeterserapan.distribusiInstansi, selectedYear)}
              selectedYear={selectedYear}
            />
          </div>

          {/* Row 3: Multi-line chart */}
          <KpiMultiLineChart
            title="Distribusi Level Perusahaan (Tren 3 Tahun)"
            data={levelPerusahaan}
            lines={[
              { dataKey: "nasional", label: "Nasional", color: "#3b82f6" },
              { dataKey: "multinasional", label: "Multinasional", color: "#f97316" },
              { dataKey: "lokal", label: "Lokal", color: "#8b5cf6" },
            ]}
            selectedYear={selectedYear}
          />
        </section>

        {/* Grafik Cara Mendapat Pekerjaan (kept) */}
        <section>
          <JobFindingMethodChart showProdiFilter={true} filters={{ prodi: "all", jenjang: "all", tahun: "all" }} />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default P2mppEmploymentOutcomePage;
