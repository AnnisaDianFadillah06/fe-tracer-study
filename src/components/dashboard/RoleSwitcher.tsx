import { useRole, UserRole, roleLabels, roleDescriptions } from "@/contexts/RoleContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, GraduationCap, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const roleIcons: Record<UserRole, React.ElementType> = {
  p2mpp: Building2,
  kaprodi: GraduationCap,
  kotc: Users,
};

const RoleSwitcher = () => {
  const { currentRole, setCurrentRole } = useRole();

  const handleRoleChange = (newRole: UserRole) => {
    if (newRole === currentRole) return;
    setCurrentRole(newRole);
    // No URL change — same page, different content via RoleContext
  };

  return (
    <Tabs value={currentRole} onValueChange={(value) => handleRoleChange(value as UserRole)}>
      <TabsList className="bg-secondary/50 border border-border/50">
        {(Object.keys(roleLabels) as UserRole[]).map((role) => {
          const Icon = roleIcons[role];
          return (
            <Tooltip key={role}>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value={role}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{roleLabels[role]}</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{roleLabels[role]}</p>
                <p className="text-xs text-muted-foreground">{roleDescriptions[role]}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TabsList>
    </Tabs>
  );
};

export default RoleSwitcher;
