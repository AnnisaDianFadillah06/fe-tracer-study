import { useRole } from "@/contexts/RoleContext";
import P2mppEmployment from "./P2mppEmployment";
import KaprodiEmployment from "./KaprodiEmployment";
import KotcEmployment from "./KotcEmployment";

const EmploymentPage = () => {
  const { currentRole } = useRole();

  switch (currentRole) {
    case "kaprodi":
      return <KaprodiEmployment />;
    case "tracer_team":
      return <KotcEmployment />;
    default:
      return <P2mppEmployment />;
  }
};

export default EmploymentPage;
