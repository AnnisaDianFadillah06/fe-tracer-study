import {
  LayoutDashboard,
  Briefcase,
  BookOpen,
  BarChart3,
  Users,
  ShieldCheck,
  ClipboardList,
  GraduationCap,
  Building2,
} from "lucide-react";

// ── Role definitions ─────────────────────────────────────────────────────────
export type AppRole =
  | "head_tracer"
  | "tracer_team"
  | "wadir"
  | "kajur"
  | "kaprodi"
  | "alumni";

export const roleLabels: Record<AppRole, string> = {
  head_tracer: "Super Admin (Ketua Tracer)",
  tracer_team: "Admin (Tim Tracer)",
  wadir: "Pimpinan (Direktur/Wadir/P2MPP)",
  kajur: "Ketua Jurusan",
  kaprodi: "Ketua Program Studi",
  alumni: "Alumni",
};

export const roleDescriptions: Record<AppRole, string> = {
  head_tracer: "Full system access — kelola user, kuesioner, approval, master data",
  tracer_team: "Kelola & edit kuesioner, ajukan perubahan via approval",
  wadir: "Viewer seluruh data institusi & download",
  kajur: "Viewer data jurusan & download",
  kaprodi: "Viewer data program studi & download",
  alumni: "Pengisi kuesioner tracer study",
};

// ── Permissions ──────────────────────────────────────────────────────────────
export type Permission =
  | "dashboard.overview"
  | "dashboard.employment"
  | "dashboard.education"
  | "dashboard.analytics"
  | "admin.user"
  | "admin.questionnaire"
  | "admin.questionnaire.request"
  | "admin.approval"
  | "admin.master"
  | "academic.alumni_data"
  | "academic.questionnaire_results"
  | "questionnaire.fill";

export const rolePermissions: Record<AppRole, Permission[]> = {
  head_tracer: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.analytics",
    "admin.user",
    "admin.questionnaire",
    "admin.approval",
    "admin.master",
  ],
  tracer_team: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.analytics",
    "admin.questionnaire",
    "admin.questionnaire.request",
    "admin.approval",
  ],
  wadir: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.analytics",
    "academic.alumni_data",
    "academic.questionnaire_results",
  ],
  kajur: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "academic.alumni_data",
    "academic.questionnaire_results",
  ],
  kaprodi: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "academic.alumni_data",
    "academic.questionnaire_results",
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
  { title: "Kelola Staff", href: "/dashboard/staff-management", icon: Users, description: "CRUD semua akun user", permission: "admin.user" },
  { title: "Kelola Mahasiswa", href: "/dashboard/student-management", icon: Users, description: "CRUD akun mahasiswa/alumni", permission: "admin.user" },
  { title: "Manajemen Kuesioner", href: "/dashboard/form-management", icon: ClipboardList, description: "Kelola kuesioner", permission: "admin.questionnaire" },
  { title: "Approval Request", href: "/dashboard/approvals", icon: ShieldCheck, description: "Riwayat & approval pengajuan", permission: "admin.approval" },
  { title: "Master Data", href: "/dashboard/master-data", icon: Building2, description: "Prodi, provinsi, kota", permission: "admin.master" },
];

const academicItems: MenuItem[] = [
  { title: "Data Alumni", href: "/dashboard/alumni-data", icon: GraduationCap, description: "Data alumni per prodi/jurusan", permission: "academic.alumni_data" },
  { title: "Hasil Kuesioner", href: "/dashboard/questionnaire-results", icon: ClipboardList, description: "Hasil respon kuesioner", permission: "academic.questionnaire_results" },
];

const allGroups: MenuGroup[] = [
  { label: "Dashboard", items: dashboardItems },
  { label: "Administrasi", items: adminItems },
  { label: "Akademik", items: academicItems },
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
  "/dashboard/staff-management": "admin.user",
  "/dashboard/form-management": "admin.questionnaire",
  "/dashboard/approvals": "admin.approval",
  "/dashboard/master-data": "admin.master",
  "/dashboard/alumni-data": "academic.alumni_data",
  "/dashboard/questionnaire-results": "academic.questionnaire_results",
};

export function getDefaultRoute(role: AppRole): string {
  if (role === "alumni") return "/form";
  return "/dashboard/overview";
}

export function mapBackendRole(backendRole?: string): AppRole {
  const map: Record<string, AppRole> = {
    head_tracer: "head_tracer",
    tracer_team: "tracer_team",
    wadir: "wadir",
    kajur: "kajur",
    kaprodi: "kaprodi",
    alumni: "alumni",
    // Legacy compat
    admin: "head_tracer",
    p2mpp: "wadir",
    prodi: "kaprodi",
  };
  return map[backendRole ?? ""] ?? "alumni";
}
