import { useRole } from "@/contexts/RoleContext";
import P2mppAnalytics from "./P2mppAnalytics";
import KaprodiAnalytics from "./KaprodiAnalytics";
import KotcAnalytics from "./KotcAnalytics";

const AnalyticsPage = () => {
  const { currentRole } = useRole();

  switch (currentRole) {
    case "p2mpp":
      return <P2mppAnalytics />;
    case "kaprodi":
      return <KaprodiAnalytics />;
    case "kotc":
      return <KotcAnalytics />;
    default:
      return null;
  }
};

export default AnalyticsPage;
