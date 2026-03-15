import { useRole } from "@/contexts/RoleContext";
import P2mppEmployment from "./P2mppEmployment";
import KaprodiEmployment from "./KaprodiEmployment";
import KotcEmployment from "./KotcEmployment";

const EmploymentPage = () => {
  const { currentRole } = useRole();

  switch (currentRole) {
    case "p2mpp":
      return <P2mppEmployment />;
    case "kaprodi":
      return <KaprodiEmployment />;
    case "kotc":
      return <KotcEmployment />;
    default:
      return null;
  }
};

export default EmploymentPage;
