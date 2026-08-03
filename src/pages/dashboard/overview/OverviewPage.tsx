import { useRole } from "@/contexts/RoleContext";
import P2mppOverview from "./P2mppOverview";
import KaprodiOverview from "./KaprodiOverview";
import KotcOverview from "./KotcOverview";

const OverviewPage = () => {
  const { currentRole } = useRole();

  switch (currentRole) {
    case "kaprodi":
      return <KaprodiOverview />;
    case "tracer_team":
      return <KotcOverview />;
    default:
      return <P2mppOverview />;
  }
};

export default OverviewPage;
