import { KpiUIProvider } from "@/contexts/GlobalFiltersContext";
import P2mppOverviewPage from "./P2mppOverview";

/** Kaprodi reuses the P2MPP layout but hides Compare buttons (single-prodi view). */
const KaprodiOverviewPage = () => (
  <KpiUIProvider hideCompare>
    <P2mppOverviewPage />
  </KpiUIProvider>
);

export default KaprodiOverviewPage;
