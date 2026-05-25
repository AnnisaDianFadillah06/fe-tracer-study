import { KpiUIProvider } from "@/contexts/GlobalFiltersContext";
import P2mppEmploymentOutcomePage from "./P2mppEmployment";

const KaprodiEmploymentOutcomePage = () => (
  <KpiUIProvider hideCompare>
    <P2mppEmploymentOutcomePage />
  </KpiUIProvider>
);

export default KaprodiEmploymentOutcomePage;
