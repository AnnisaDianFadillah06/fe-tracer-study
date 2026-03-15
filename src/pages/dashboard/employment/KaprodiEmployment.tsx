import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { WaitingTimeChart, CompanyCategoryChart, FieldRelevanceChart, JobFindingMethodChart, CompanyTypeChart } from "@/components/dashboard/charts/common";
import { Badge } from "@/components/ui/badge";
import { useKaprodiEmployment } from "@/hooks/dashboard/kaprodi";

const KaprodiEmploymentOutcomePage = () => {
  const { prodi, filters } = useKaprodiEmployment();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold">Employment Outcome</h1>
            <p className="text-muted-foreground">Job placement & career progression untuk {prodi}</p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Info</Badge>
            <span className="text-sm text-muted-foreground">Data khusus {prodi} — alumni yang sudah bekerja</span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="relative">
            <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">Prodi</Badge>
            <WaitingTimeChart showProdiFilter={false} filters={filters} />
          </div>
          <div className="relative">
            <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">Prodi</Badge>
            <FieldRelevanceChart showProdiFilter={false} filters={filters} />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="relative">
            <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">Prodi</Badge>
            <CompanyCategoryChart showProdiFilter={false} />
          </div>
          <div className="relative">
            <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">Prodi</Badge>
            <CompanyTypeChart showProdiFilter={false} filters={filters} />
          </div>
        </div>

        <div className="relative">
          <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">Multiple Response</Badge>
          <JobFindingMethodChart showProdiFilter={false} filters={filters} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default KaprodiEmploymentOutcomePage;
