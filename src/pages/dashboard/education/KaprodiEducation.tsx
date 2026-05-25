import { KpiUIProvider } from "@/contexts/GlobalFiltersContext";
import P2mppEducationalAssessmentPage from "./P2mppEducation";

const KaprodiEducationalAssessmentPage = () => (
  <KpiUIProvider hideCompare>
    <P2mppEducationalAssessmentPage />
  </KpiUIProvider>
);

export default KaprodiEducationalAssessmentPage;
