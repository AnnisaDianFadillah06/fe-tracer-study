import { useRole } from "@/contexts/RoleContext";
import P2mppAnalytics from "./P2mppAnalytics";
import KaprodiAnalytics from "./KaprodiAnalytics";
import KotcAnalytics from "./KotcAnalytics";

const AnalyticsPage = () => {
  const { currentRole } = useRole();

  switch (currentRole) {
    case "kaprodi":
      return <KaprodiAnalytics />;
    case "tracer_team":
      return <KotcAnalytics />;
    default:
      return <P2mppAnalytics />;
  }
};

export default AnalyticsPage;
