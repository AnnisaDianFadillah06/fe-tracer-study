import { useState } from "react";
import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import {
  KpiComboChart,
  KpiStackedBarChart,
  KpiDistributionBarChart,
} from "@/components/dashboard/charts/common";
import { useP2mppOverview } from "@/hooks/dashboard/p2mpp";

const P2mppOverviewPage = () => {
  const { stats, kpiPartisipasi, kpiWirausaha, kpiMasaTunggu, kpiKesesuaian } = useP2mppOverview();

  const [selectedYearPartisipasi, setSelectedYearPartisipasi] = useState<string | null>(null);
  const [selectedYearWirausaha, setSelectedYearWirausaha] = useState<string | null>(null);
  const [selectedYearMasaTunggu, setSelectedYearMasaTunggu] = useState<string | null>(null);
  const [selectedYearKesesuaian, setSelectedYearKesesuaian] = useState<string | null>(null);

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
            <h1 className="font-heading text-2xl font-bold">Overview Dashboard</h1>
            <p className="text-muted-foreground">KPI Tracer Study — Politeknik Negeri Bandung</p>
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

        {/* ── KPI 1: Tingkat Partisipasi Alumni ── */}
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            KPI Tingkat Partisipasi Alumni
          </h2>
          <div className="grid lg:grid-cols-2 gap-4">
            <KpiComboChart
              title="Tren Tingkat Partisipasi Alumni (3 Tahun)"
              data={kpiPartisipasi.combo}
              threshold={kpiPartisipasi.threshold}
              thresholdLabel="Target"
              selectedYear={selectedYearPartisipasi}
              onYearClick={setSelectedYearPartisipasi}
            />
            <KpiStackedBarChart
              title="Partisipasi Alumni per Prodi"
              data={getProdiData(kpiPartisipasi.perProdi, selectedYearPartisipasi)}
              positiveLabel="Sudah Mengisi (%)"
              negativeLabel="Belum Mengisi (%)"
              threshold={kpiPartisipasi.threshold}
              thresholdLabel="Target"
              selectedYear={selectedYearPartisipasi}
              lamThresholds={kpiPartisipasi.lamThresholds}
            />
          </div>
        </section>

        {/* ── KPI 2: Lulusan Berwirausaha ── */}
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            KPI Lulusan Berwirausaha
          </h2>
          <div className="grid lg:grid-cols-2 gap-4">
            <KpiComboChart
              title="Tren Lulusan Berwirausaha (3 Tahun)"
              data={kpiWirausaha.combo}
              threshold={kpiWirausaha.threshold}
              thresholdLabel="Target"
              selectedYear={selectedYearWirausaha}
              onYearClick={setSelectedYearWirausaha}
            />
            <KpiStackedBarChart
              title="Lulusan Berwirausaha per Prodi"
              data={getProdiData(kpiWirausaha.perProdi, selectedYearWirausaha)}
              positiveLabel="Berwirausaha (%)"
              negativeLabel="Lainnya (%)"
              threshold={kpiWirausaha.threshold}
              thresholdLabel="Target"
              selectedYear={selectedYearWirausaha}
              lamThresholds={kpiWirausaha.lamThresholds}
            />
          </div>
        </section>

        {/* ── KPI 3: Masa Tunggu Kerja ≤ 6 Bulan ── */}
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            KPI Masa Tunggu Kerja ≤ 6 Bulan
          </h2>
          <div className="mb-4">
            <KpiComboChart
              title="Tren Masa Tunggu Kerja ≤ 6 Bulan (3 Tahun)"
              data={kpiMasaTunggu.combo}
              threshold={kpiMasaTunggu.threshold}
              thresholdLabel="Target"
              selectedYear={selectedYearMasaTunggu}
              onYearClick={setSelectedYearMasaTunggu}
            />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <KpiStackedBarChart
              title="Masa Tunggu ≤ 6 Bulan per Prodi"
              data={getProdiData(kpiMasaTunggu.perProdi, selectedYearMasaTunggu)}
              positiveLabel="WT ≤ 6 bulan (%)"
              negativeLabel="Lainnya (%)"
              threshold={kpiMasaTunggu.threshold}
              thresholdLabel="Target"
              selectedYear={selectedYearMasaTunggu}
              lamThresholds={kpiMasaTunggu.lamThresholds}
            />
            <KpiDistributionBarChart
              title="Distribusi Masa Tunggu Kerja"
              data={getDistribution(kpiMasaTunggu.distribution, selectedYearMasaTunggu)}
              selectedYear={selectedYearMasaTunggu}
            />
          </div>
        </section>

        {/* ── KPI 4: Kesesuaian Bidang Kerja ── */}
        <section className="space-y-2">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            KPI Kesesuaian Bidang Kerja
          </h2>
          <div className="mb-4">
            <KpiComboChart
              title="Tren Kesesuaian Bidang Kerja (3 Tahun)"
              data={kpiKesesuaian.combo}
              threshold={kpiKesesuaian.threshold}
              thresholdLabel="Target"
              selectedYear={selectedYearKesesuaian}
              onYearClick={setSelectedYearKesesuaian}
            />
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <KpiStackedBarChart
              title="Kesesuaian Bidang Kerja per Prodi"
              data={getProdiData(kpiKesesuaian.perProdi, selectedYearKesesuaian)}
              positiveLabel="Sesuai (%)"
              negativeLabel="Tidak Sesuai (%)"
              threshold={kpiKesesuaian.threshold}
              thresholdLabel="Target"
              selectedYear={selectedYearKesesuaian}
              lamThresholds={kpiKesesuaian.lamThresholds}
            />
            <KpiDistributionBarChart
              title="Distribusi Tingkat Kesesuaian Bidang Kerja"
              data={getDistribution(kpiKesesuaian.distribution, selectedYearKesesuaian)}
              selectedYear={selectedYearKesesuaian}
            />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default P2mppOverviewPage;
