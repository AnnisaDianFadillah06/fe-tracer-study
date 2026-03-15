import { useRole } from "@/contexts/RoleContext";
import P2mppOverview from "./P2mppOverview";
import KaprodiOverview from "./KaprodiOverview";
import KotcOverview from "./KotcOverview";

const OverviewPage = () => {
  const { currentRole } = useRole();

  switch (currentRole) {
    case "p2mpp":
      return <P2mppOverview />;
    case "kaprodi":
      return <KaprodiOverview />;
    case "kotc":
      return <KotcOverview />;
    default:
      return null;
  }
};

export default OverviewPage;
