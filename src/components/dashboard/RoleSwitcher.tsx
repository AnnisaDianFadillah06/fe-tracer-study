import { useRole, roleLabels, type AppRole } from "@/contexts/RoleContext";
import { roleDescriptions } from "@/lib/rbac";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const roles = Object.keys(roleLabels) as AppRole[];

const RoleSwitcher = () => {
  const { currentRole, setCurrentRole } = useRole();

  return (
    <Select value={currentRole} onValueChange={(v) => setCurrentRole(v as AppRole)}>
      <SelectTrigger className="w-[180px] h-9 text-sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {roles.map((role) => (
          <SelectItem key={role} value={role}>
            <div>
              <span className="font-medium">{roleLabels[role]}</span>
              <span className="ml-2 text-xs text-muted-foreground">{roleDescriptions[role]}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default RoleSwitcher;
