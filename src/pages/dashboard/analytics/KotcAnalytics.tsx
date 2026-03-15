import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  SurvivalAnalysisChart,
  ClusteringCareerChart,
  ClusteringComparisonChart,
  ClusteringHeatmapChart,
  ClusteringSkillGapChart,
  ClusteringWaitTimeChart,
} from "@/components/dashboard/analytics/common";
import { useKotcAnalytics } from "@/hooks/dashboard/kotc";

const KotcAnalyticsPage = () => {
  const { description } = useKotcAnalytics();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-2xl font-bold">Dashboard Analitik</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <section>
          <h2 className="font-heading text-xl font-semibold mb-4">Survival Analysis</h2>
          <p className="text-muted-foreground mb-4">Analisis waktu tunggu kerja dengan metode Kaplan-Meier</p>
          <SurvivalAnalysisChart />
        </section>

        <section>
          <h2 className="font-heading text-xl font-semibold mb-4">Clustering Analysis</h2>
          <p className="text-muted-foreground mb-4">Segmentasi alumni berdasarkan karakteristik karir</p>
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <ClusteringCareerChart />
            <ClusteringWaitTimeChart />
          </div>
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <ClusteringComparisonChart domain="wait-time" />
            <ClusteringSkillGapChart />
          </div>
          <ClusteringHeatmapChart domain="wait-time" />
        </section>
      </div>
    </DashboardLayout>
  );
};

export default KotcAnalyticsPage;
