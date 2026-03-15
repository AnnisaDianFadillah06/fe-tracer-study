import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { GenderChart, StatusChart, TrendChart } from "@/components/dashboard/charts/common";
import { Badge } from "@/components/ui/badge";
import { useKaprodiOverview } from "@/hooks/dashboard/kaprodi";

const KaprodiOverviewPage = () => {
  const { prodi, filters, stats, tahunRows } = useKaprodiOverview();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold">Overview Dashboard</h1>
            <p className="text-muted-foreground">High-level metrics untuk {prodi}</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-emerald-400">Realtime</span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((s) => (
            <StatCard key={s.title} {...s} />
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="relative">
            <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">n=118</Badge>
            <GenderChart showProdiFilter={false} filters={filters} />
          </div>
          <div className="relative">
            <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">n=118</Badge>
            <StatusChart showProdiFilter={false} filters={filters} />
          </div>
        </div>

        <TrendChart showProdiFilter={false} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="font-heading font-semibold mb-4">Statistik Lulusan {prodi}</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tahun Lulus</th><th>Responden</th><th>Bekerja</th><th>IPK Rata-rata</th><th>Waktu Tunggu</th><th>Gaji Rata-rata</th>
                </tr>
              </thead>
              <tbody>
                {tahunRows.map((row) => (
                  <tr key={row.tahun}>
                    <td className="font-medium">{row.tahun}</td>
                    <td>{row.responden}</td>
                    <td><span className={`px-2 py-1 rounded text-xs font-medium ${parseFloat(row.bekerja) >= 80 ? "badge-success" : parseFloat(row.bekerja) >= 60 ? "badge-warning" : "badge-error"}`}>{row.bekerja}</span></td>
                    <td>{row.ipk}</td><td>{row.tunggu}</td><td className="font-medium">{row.gaji}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default KaprodiOverviewPage;
