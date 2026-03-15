import { useRole } from "@/contexts/RoleContext";
import P2mppEducation from "./P2mppEducation";
import KaprodiEducation from "./KaprodiEducation";
import KotcEducation from "./KotcEducation";

const EducationPage = () => {
  const { currentRole } = useRole();

  switch (currentRole) {
    case "p2mpp":
      return <P2mppEducation />;
    case "kaprodi":
      return <KaprodiEducation />;
    case "kotc":
      return <KotcEducation />;
    default:
      return null;
  }
};

export default EducationPage;
