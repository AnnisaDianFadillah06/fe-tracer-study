import { motion } from "framer-motion";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import DashboardFilters from "@/components/dashboard/DashboardFilters";
import { WaitingTimeChart, CompanyCategoryChart, FieldRelevanceChart, JobFindingMethodChart, CompanyTypeChart } from "@/components/dashboard/charts/common";
import { Badge } from "@/components/ui/badge";
import { useKotcEmployment } from "@/hooks/dashboard/kotc";

const KotcEmploymentOutcomePage = () => {
  const { selectedProdi, setSelectedProdi, selectedTahun, setSelectedTahun, selectedJenjang, setSelectedJenjang, filters } = useKotcEmployment();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold">Employment Outcome</h1>
            <p className="text-muted-foreground">Job placement & career progression — data operasional</p>
          </div>
          <DashboardFilters
            selectedProdi={selectedProdi} setSelectedProdi={setSelectedProdi}
            selectedTahun={selectedTahun} setSelectedTahun={setSelectedTahun}
            selectedJenjang={selectedJenjang} setSelectedJenjang={setSelectedJenjang}
          />
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Info</Badge>
            <span className="text-sm text-muted-foreground">Data pada halaman ini berdasarkan alumni yang sudah bekerja (n=892)</span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="relative">
            <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">n=892</Badge>
            <WaitingTimeChart showProdiFilter={true} filters={filters} />
          </div>
          <div className="relative">
            <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">n=892</Badge>
            <FieldRelevanceChart showProdiFilter={true} filters={filters} />
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="relative">
            <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">n=892</Badge>
            <CompanyCategoryChart showProdiFilter={true} />
          </div>
          <div className="relative">
            <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">n=892</Badge>
            <CompanyTypeChart showProdiFilter={true} filters={filters} />
          </div>
        </div>

        <div className="relative">
          <Badge variant="outline" className="absolute top-2 right-2 z-10 text-xs">n=892 (Multiple Response)</Badge>
          <JobFindingMethodChart showProdiFilter={true} filters={filters} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default KotcEmploymentOutcomePage;
