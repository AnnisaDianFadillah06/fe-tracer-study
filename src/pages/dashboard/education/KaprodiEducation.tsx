import { KpiUIProvider } from "@/contexts/GlobalFiltersContext";
import EducationPageContent from "@/components/dashboard/pages/EducationPageContent";

const KaprodiEducationalAssessmentPage = () => (
  <KpiUIProvider hideCompare>
    <EducationPageContent />
  </KpiUIProvider>
);

export default KaprodiEducationalAssessmentPage;
