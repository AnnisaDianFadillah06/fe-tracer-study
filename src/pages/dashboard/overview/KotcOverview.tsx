import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import StatCard from "@/components/dashboard/StatCard";
import { GenderChart, StatusChart, TrendChart, ProdiInputChart } from "@/components/dashboard/charts/common";
import { Badge } from "@/components/ui/badge";
import { useKotcOverview } from "@/hooks/dashboard/kotc";

const KotcOverviewPage = () => {
  const { filters, stats, pengumpulanRows } = useKotcOverview();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold">Overview Dashboard</h1>
            <p className="text-muted-foreground">Monitoring operasional tracer study Politeknik Negeri Bandung</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-emerald-400">Realtime</span>
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {stats.map((s) => (
            <StatCard key={s.title} {...s} />
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="relative">
            <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">n=1,227</Badge>
            <GenderChart showProdiFilter={true} filters={filters} />
          </div>
          <div className="relative">
            <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">n=1,227</Badge>
            <StatusChart showProdiFilter={true} filters={filters} />
          </div>
        </div>

        <TrendChart showProdiFilter={true} />
        <ProdiInputChart />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="font-heading font-semibold mb-4">Status Pengumpulan per Jenjang</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Jenjang</th><th>Target</th><th>Terkumpul</th><th>Response Rate</th><th>Sisa</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pengumpulanRows.map((row) => (
                  <tr key={row.jenjang}>
                    <td className="font-medium">{row.jenjang}</td>
                    <td>{row.target}</td>
                    <td>{row.terkumpul}</td>
                    <td><span className={`px-2 py-1 rounded text-xs font-medium ${parseFloat(row.rate) >= 80 ? "badge-success" : parseFloat(row.rate) >= 60 ? "badge-warning" : "badge-error"}`}>{row.rate}</span></td>
                    <td>{row.sisa}</td>
                    <td><span className={`px-2 py-1 rounded text-xs font-medium ${row.sisa <= 50 ? "badge-success" : row.sisa <= 200 ? "badge-warning" : "badge-error"}`}>{row.sisa <= 50 ? "Hampir Selesai" : row.sisa <= 200 ? "Dalam Proses" : "Perlu Follow-up"}</span></td>
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

export default KotcOverviewPage;
