import { useRole } from "@/contexts/RoleContext";
import P2mppEducation from "./P2mppEducation";
import KaprodiEducation from "./KaprodiEducation";
import KotcEducation from "./KotcEducation";

const EducationPage = () => {
  const { currentRole } = useRole();

  switch (currentRole) {
    case "kaprodi":
      return <KaprodiEducation />;
    case "tracer_team":
      return <KotcEducation />;
    default:
      return <P2mppEducation />;
  }
};

export default EducationPage;
