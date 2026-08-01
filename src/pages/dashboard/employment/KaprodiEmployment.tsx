import { KpiUIProvider } from "@/contexts/GlobalFiltersContext";
import EmploymentPageContent from "@/components/dashboard/pages/EmploymentPageContent";

/** Kaprodi — single-prodi: hide Compare; demo empty K7 (no wirausaha data this prodi). */
const KaprodiEmploymentOutcomePage = () => (
  <KpiUIProvider hideCompare>
    <EmploymentPageContent emptyKpis={["k7"]} />
  </KpiUIProvider>
);

export default KaprodiEmploymentOutcomePage;
