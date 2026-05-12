import { useRole, roleLabels, type AppRole } from "@/contexts/RoleContext";
import { roleDescriptions, mapBackendRole } from "@/lib/rbac";
import { useAuth } from "@/hooks/useAuth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const roles = Object.keys(roleLabels) as AppRole[];

/**
 * Dev/demo role-preview switcher.
 *
 * HANYA super admin yang boleh melihat dropdown ini. Role lain yang mencoba
 * impersonasi (misal kaprodi → wadir) ditolak agar batas permission tidak
 * bisa di-bypass dari sisi UI.
 *
 * Catatan: pengecekan pakai role BACKEND ASLI (useAuth().user.role), bukan
 * currentRole dari context — agar admin yang sedang preview sebagai role
 * lain tetap bisa balik ke admin lewat switcher yang sama.
 */
const RoleSwitcher = () => {
  const { currentRole, setCurrentRole } = useRole();
  const { user } = useAuth();

  // Hide switcher kecuali user asli di BE adalah admin.
  if (mapBackendRole(user?.role) !== "admin") return null;

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
