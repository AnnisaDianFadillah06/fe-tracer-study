import {
  LayoutDashboard,
  Briefcase,
  BookOpen,
  BarChart3,
  Users,
  UserCog,
  ClipboardList,
  GraduationCap,
  FileText,
  Building2,
  ShieldCheck,
} from "lucide-react";

// ── Role definitions ─────────────────────────────────────────────────────────
export type AppRole =
  | "admin"
  | "head_tracer"
  | "tracer_team"
  | "kaprodi"
  | "wadir"
  | "alumni";

export const roleLabels: Record<AppRole, string> = {
  admin: "Admin",
  head_tracer: "Kepala Tracer Study",
  tracer_team: "Tim Tracer",
  kaprodi: "Kaprodi",
  wadir: "Wakil Direktur",
  alumni: "Alumni",
};

export const roleDescriptions: Record<AppRole, string> = {
  admin: "Full system administrator",
  head_tracer: "Kepala unit Tracer Study",
  tracer_team: "Anggota tim pelaksana Tracer Study",
  kaprodi: "Kepala Program Studi",
  wadir: "Wakil Direktur — monitoring & analytics",
  alumni: "Lulusan — pengisi kuesioner",
};

// ── Permissions ──────────────────────────────────────────────────────────────
export type Permission =
  | "dashboard.overview"
  | "dashboard.employment"
  | "dashboard.education"
  | "dashboard.analytics"
  | "admin.team"
  | "admin.students"
  | "admin.staff"
  | "admin.questionnaire"
  | "academic.alumni_data"
  | "academic.questionnaire_results"
  | "reports.statistics"
  | "reports.tracer"
  | "questionnaire.fill";

export const rolePermissions: Record<AppRole, Permission[]> = {
  admin: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.analytics",
    "admin.team",
    "admin.students",
    "admin.staff",
    "admin.questionnaire",
  ],
  head_tracer: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.analytics",
    "admin.team",
    "admin.staff",
    "admin.questionnaire",
  ],
  tracer_team: [
    "dashboard.overview",
    "dashboard.employment",
    "admin.questionnaire",
  ],
  kaprodi: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "academic.alumni_data",
    "academic.questionnaire_results",
  ],
  wadir: [
    "dashboard.overview",
    "dashboard.analytics",
    "reports.statistics",
    "reports.tracer",
  ],
  alumni: ["questionnaire.fill"],
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: AppRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

// ── Menu / Sidebar config ────────────────────────────────────────────────────
export interface MenuItem {
  title: string;
  href: string;
  icon: React.ElementType;
  description: string;
  permission: Permission;
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const dashboardItems: MenuItem[] = [
  { title: "Overview", href: "/dashboard/overview", icon: LayoutDashboard, description: "High-level KPI metrics", permission: "dashboard.overview" },
  { title: "Employment Outcome", href: "/dashboard/employment", icon: Briefcase, description: "Job placement & career", permission: "dashboard.employment" },
  { title: "Educational Assessment", href: "/dashboard/education", icon: BookOpen, description: "Kompetensi & learning", permission: "dashboard.education" },
  { title: "Analitik", href: "/dashboard/analytics", icon: BarChart3, description: "Clustering & Survival", permission: "dashboard.analytics" },
];

const adminItems: MenuItem[] = [
  { title: "Tim Koordinator", href: "/dashboard/team-management", icon: Users, description: "Kelola tim tracer", permission: "admin.team" },
  { title: "Akun Staff", href: "/dashboard/staff-management", icon: ShieldCheck, description: "Kelola akun & role staff", permission: "admin.staff" },
  { title: "Akun Mahasiswa", href: "/dashboard/student-management", icon: UserCog, description: "CRUD akun kuesioner", permission: "admin.students" },
  { title: "Manajemen Kuisioner", href: "/dashboard/form-management", icon: ClipboardList, description: "Kelola kuisioner", permission: "admin.questionnaire" },
];

const academicItems: MenuItem[] = [
  { title: "Data Alumni Prodi", href: "/dashboard/alumni-data", icon: GraduationCap, description: "Data alumni program studi", permission: "academic.alumni_data" },
  { title: "Hasil Kuesioner Prodi", href: "/dashboard/questionnaire-results", icon: ClipboardList, description: "Hasil respon kuesioner", permission: "academic.questionnaire_results" },
];

const reportItems: MenuItem[] = [
  { title: "Statistik Institusi", href: "/dashboard/statistics", icon: Building2, description: "Statistik lintas prodi", permission: "reports.statistics" },
  { title: "Laporan Tracer Study", href: "/dashboard/reports", icon: FileText, description: "Laporan tracer study", permission: "reports.tracer" },
];

const allGroups: MenuGroup[] = [
  { label: "Dashboard", items: dashboardItems },
  { label: "Administrasi", items: adminItems },
  { label: "Akademik", items: academicItems },
  { label: "Laporan", items: reportItems },
];

export function getMenuForRole(role: AppRole): MenuGroup[] {
  return allGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasPermission(role, item.permission)),
    }))
    .filter((group) => group.items.length > 0);
}

// ── Route protection config ──────────────────────────────────────────────────
export const routePermissionMap: Record<string, Permission> = {
  "/dashboard/overview": "dashboard.overview",
  "/dashboard/employment": "dashboard.employment",
  "/dashboard/education": "dashboard.education",
  "/dashboard/analytics": "dashboard.analytics",
  "/dashboard/team-management": "admin.team",
  "/dashboard/student-management": "admin.students",
  "/dashboard/form-management": "admin.questionnaire",
  "/dashboard/alumni-data": "academic.alumni_data",
  "/dashboard/questionnaire-results": "academic.questionnaire_results",
  "/dashboard/statistics": "reports.statistics",
  "/dashboard/reports": "reports.tracer",
};

export function getDefaultRoute(role: AppRole): string {
  if (role === "alumni") return "/form";
  return "/dashboard/overview";
}

export function mapBackendRole(backendRole?: string): AppRole {
  const map: Record<string, AppRole> = {
    admin: "admin",
    head_tracer: "head_tracer",
    tracer_team: "tracer_team",
    kaprodi: "kaprodi",
    wadir: "wadir",
    alumni: "alumni",
    kotc: "tracer_team",
  };
  return map[backendRole ?? ""] ?? "alumni";
}
