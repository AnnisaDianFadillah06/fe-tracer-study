import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { FundingSourceChart, UserSatisfactionChart } from "@/components/dashboard/charts/common";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useKaprodiEducation } from "@/hooks/dashboard/kaprodi";

const KaprodiEducationalAssessmentPage = () => {
  const { prodi, filters, metrics, kompetensiRows } = useKaprodiEducation();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-bold">Educational Assessment</h1>
          <p className="text-muted-foreground">Kompetensi gap & learning effectiveness untuk {prodi}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <Card key={metric.title} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{metric.title}</CardTitle>
                <metric.icon className={`w-5 h-5 ${metric.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="relative">
          <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">Prodi</Badge>
          <FundingSourceChart showProdiFilter={false} filters={filters} />
        </div>

        <div className="relative">
          <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">Employer Survey</Badge>
          <UserSatisfactionChart showProdiFilter={false} filters={filters} />
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="font-heading font-semibold mb-4">Analisis Gap Kompetensi — {prodi}</h3>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Kompetensi</th><th>Level Dicapai</th><th>Level Dibutuhkan</th><th>Gap</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {kompetensiRows.map((row) => (
                  <tr key={row.kompetensi}>
                    <td className="font-medium">{row.kompetensi}</td>
                    <td>{row.dicapai.toFixed(1)}</td>
                    <td>{row.dibutuhkan.toFixed(1)}</td>
                    <td className={row.gap >= 0 ? "text-emerald-500" : "text-amber-500"}>
                      {row.gap >= 0 ? "+" : ""}{row.gap.toFixed(1)}
                    </td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        row.gap >= 0 ? "badge-success" : row.gap >= -0.5 ? "badge-warning" : "badge-error"
                      }`}>
                        {row.gap >= 0 ? "Surplus" : row.gap >= -0.5 ? "Minor Gap" : "Major Gap"}
                      </span>
                    </td>
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

export default KaprodiEducationalAssessmentPage;
