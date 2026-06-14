import { KpiUIProvider } from "@/contexts/GlobalFiltersContext";
import OverviewPageContent from "@/components/dashboard/pages/OverviewPageContent";

/** Kaprodi — single-prodi view: hide Compare, demo empty K13 (no cross-prodi data). */
const KaprodiOverviewPage = () => (
  <KpiUIProvider hideCompare>
    <OverviewPageContent emptyKpis={["k13"]} />
  </KpiUIProvider>
);

export default KaprodiOverviewPage;
