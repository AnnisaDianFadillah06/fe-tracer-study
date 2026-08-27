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
  Target,
  Coins,
  Workflow,
  AlertTriangle,
  Gauge,
  FileText,
  Globe,
  Contact,
  ShieldQuestion,
  History,
  Layers,
} from "lucide-react";

// ── Role definitions ─────────────────────────────────────────────────────────
export type AppRole =
  | "head_tracer"
  | "tracer_team"
  | "wadir"
  | "kajur"
  | "kaprodi"
  | "dekan"
  | "alumni";

export const roleLabels: Record<AppRole, string> = {
  head_tracer: "Super Admin (Ketua Tracer)",
  tracer_team: "Admin (Tim Tracer)",
  wadir: "Pimpinan (Direktur/Wadir/P2MPP)",
  kajur: "Ketua Jurusan",
  kaprodi: "Ketua Program Studi",
  dekan: "Dekan",
  alumni: "Alumni",
};

export const roleDescriptions: Record<AppRole, string> = {
  head_tracer: "Full system access — kelola user, kuesioner, approval, master data",
  tracer_team: "Kelola & edit kuesioner, ajukan perubahan via approval",
  wadir: "Viewer seluruh data institusi & download",
  kajur: "Viewer data jurusan & download",
  kaprodi: "Viewer data program studi & download",
  dekan: "Viewer data beberapa jurusan sekaligus & download",
  alumni: "Pengisi kuesioner tracer study",
};

// ── Permissions ──────────────────────────────────────────────────────────────
export type Permission =
  | "dashboard.overview"
  | "dashboard.employment"
  | "dashboard.education"
  | "dashboard.analytics"
  // KPI lintas prodi. BE: /api/dashboard/kpi/13/* hanya di balik auth:sanctum
  // tanpa gate role, jadi semua role dashboard boleh.
  | "dashboard.kpi"
  // Eksplorasi data multidimensi via dashboard Metabase eksternal (embed
  // iframe). Bukan endpoint BE tracer study kita -- Metabase punya auth
  // publik-nya sendiri per dashboard UUID, jadi gate di sini murni soal
  // siapa yang boleh melihat menu/route-nya di FE.
  | "dashboard.multidimensi"
  | "admin.user"
  // Konfigurasi threshold & UMP. BE menggate seluruh prefix ump dan semua
  // tulis threshold dengan role:head_tracer.
  | "admin.threshold"
  // Pemetaan semantik & log anomali ETL. BE menggate tulis
  // question-semantic-mappings dengan role:head_tracer.
  | "admin.etl"
  | "admin.questionnaire"
  | "admin.questionnaire.request"
  | "admin.approval"
  | "admin.master"
  // Publikasi ke masyarakat umum: unggah laporan tahunan dan atur rentang
  // tahun halaman publik. BE menggate /api/admin/public-reports dan
  // /api/admin/public-settings dengan role:head_tracer -- requirement menyebut
  // Ketua Tracer secara spesifik, jadi tidak menumpang admin.master yang juga
  // dipegang tracer_team.
  | "admin.public_report"
  // Kontak penilai (atasan/senior/rekan yang disebut alumni). Isinya data
  // pribadi pihak ketiga dan endpoint-nya tidak berlingkup prodi, jadi BE
  // menggate /api/stakeholder-contacts dengan role:head_tracer,tracer_team —
  // merekalah yang mengirim email blast penilaian.
  | "admin.stakeholder"
  // Perlindungan data pribadi: antrean permintaan hak subjek data dan jejak
  // audit. Peladen menggate /api/admin/data-subject-requests dan
  // /api/admin/audit-logs dengan role:head_tracer. Sengaja TIDAK menumpang
  // admin.master atau admin.approval yang juga dipegang peran lain —
  // permintaan alumni kerap memuat keadaan pribadi, dan jejak audit memuat
  // siapa berbuat apa atas data siapa. Keduanya bukan bacaan bagi setiap
  // pengelola prodi.
  | "admin.privacy"
  | "academic.alumni_data"
  | "academic.questionnaire_results"
  | "questionnaire.fill";

export const rolePermissions: Record<AppRole, Permission[]> = {
  head_tracer: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.analytics",
    "dashboard.kpi",
    "dashboard.multidimensi",
    "admin.user",
    "admin.threshold",
    "admin.etl",
    "admin.questionnaire",
    "admin.approval",
    "admin.master",
    "admin.public_report",
    "admin.stakeholder",
    "admin.privacy",
    // Head Tracer = "Full system access" (lihat rolePermissionLabels di
    // bawah) -- sebelumnya daftar ini lupa menyertakan modul Akademik,
    // sehingga role dengan akses tertinggi justru diblokir dari 2 halaman
    // yang bisa diakses wadir/kajur/kaprodi/dekan di bawahnya.
    "academic.alumni_data",
    "academic.questionnaire_results",
  ],
  tracer_team: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.analytics",
    "dashboard.kpi",
    "dashboard.multidimensi",
    "admin.questionnaire",
    "admin.questionnaire.request",
    "admin.approval",
    "admin.stakeholder",
    // UR-006 (Tim Tracer): "mengelola kuesioner sehari-hari, data master,
    // kontak stakeholder, ..." -- sebelumnya daftar ini lupa menyertakan
    // admin.master meski deskripsi role sudah menyebutnya secara eksplisit.
    "admin.master",
  ],
  wadir: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.analytics",
    "dashboard.kpi",
    "dashboard.multidimensi",
    "academic.alumni_data",
    "academic.questionnaire_results",
  ],
  kajur: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.kpi",
    "dashboard.multidimensi",
    "academic.alumni_data",
    "academic.questionnaire_results",
  ],
  kaprodi: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.kpi",
    "dashboard.multidimensi",
    "academic.alumni_data",
    "academic.questionnaire_results",
    // Kaprodi mengajukan pembukaan kembali pengisian alumni (RBAC-12) dan
    // perlu melihat status pengajuannya. BE membuka GET approvals untuk
    // role ini, dan ApprovalController::index() hanya mengembalikan
    // permintaan miliknya sendiri. Tombol setujui/tolak tetap tidak muncul
    // karena digate isHeadTracer di halamannya.
    "admin.approval",
  ],
  // Sama seperti kajur (viewer read-only): satu-satunya beda adalah
  // cakupannya meliputi lebih dari satu jurusan sekaligus, dan pilihan
  // jurusan mana yang aktif ditentukan lewat GlobalFilters, bukan dikunci.
  dekan: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.kpi",
    "dashboard.multidimensi",
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
  /**
   * Judul dan keterangan pengganti untuk peran tertentu, dipakai kalau satu
   * halaman berarti berbeda tergantung siapa yang membukanya. Contohnya
   * Approval Request: Ketua Tracer memutuskan di sana, sedangkan Tim Tracer
   * dan Kaprodi hanya menengok pengajuannya sendiri.
   */
  overrideByRole?: Partial<Record<AppRole, { title?: string; description?: string }>>;
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const dashboardItems: MenuItem[] = [
  { title: "Overview", href: "/dashboard/overview", icon: LayoutDashboard, description: "High-level KPI metrics", permission: "dashboard.overview" },
  { title: "Employment Outcome", href: "/dashboard/employment", icon: Briefcase, description: "Job placement & career", permission: "dashboard.employment" },
  { title: "Educational Assessment", href: "/dashboard/education", icon: BookOpen, description: "Kompetensi & learning", permission: "dashboard.education" },
  // Dimatikan sementara -- fokus pengujian cuma di Overview/Employment/Education.
  // { title: "Analitik", href: "/dashboard/analytics", icon: BarChart3, description: "Clustering & Survival", permission: "dashboard.analytics" },
  // { title: "KPI Lintas Prodi", href: "/dashboard/kpi", icon: Gauge, description: "Perbandingan KPI antar program studi", permission: "dashboard.kpi" },
  { title: "Multidimensi Insight", href: "/dashboard/multidimensi-insight", icon: Layers, description: "Eksplorasi data multidimensi", permission: "dashboard.multidimensi" },
];

// Konfigurasi lapisan OLAP/ETL. Semua di balik admin.threshold / admin.etl
// yang hanya dimiliki head_tracer -- sejajar dengan gate role:head_tracer
// di routes/api.php backend.
const konfigurasiItems: MenuItem[] = [
  { title: "Threshold LAM", href: "/dashboard/threshold-management", icon: Target, description: "Ambang batas indikator per versi LAM", permission: "admin.threshold" },
  { title: "Master UMP", href: "/dashboard/master-ump", icon: Coins, description: "Referensi UMP per provinsi & tahun", permission: "admin.threshold" },
  { title: "Pemetaan Pertanyaan", href: "/dashboard/question-mapping", icon: Workflow, description: "Peta pertanyaan ke semantic role ETL", permission: "admin.etl" },
  { title: "Log Anomali ETL", href: "/dashboard/etl-anomaly-log", icon: AlertTriangle, description: "Riwayat anomali saat snapshot ETL", permission: "admin.etl" },
  { title: "Halaman Publik", href: "/dashboard/public-settings", icon: Globe, description: "Rentang tahun yang tampil untuk publik", permission: "admin.public_report" },
];

const adminItems: MenuItem[] = [
  { title: "Kelola Staff", href: "/dashboard/staff-management", icon: Users, description: "CRUD semua akun user", permission: "admin.user" },
  { title: "Kelola Mahasiswa", href: "/dashboard/student-management", icon: Users, description: "CRUD akun mahasiswa/alumni", permission: "admin.user" },
  { title: "Manajemen Kuesioner", href: "/dashboard/form-management", icon: ClipboardList, description: "Kelola kuesioner", permission: "admin.questionnaire" },
  {
    title: "Approval Request",
    href: "/dashboard/approvals",
    icon: ShieldCheck,
    description: "Riwayat & approval pengajuan",
    permission: "admin.approval",
    // Pemohon tidak memutuskan apa pun di halaman ini — judulnya mengikuti
    // apa yang halaman itu sendiri tampilkan bagi mereka (lihat
    // ApprovalsPage: "Riwayat Pengajuan" untuk selain Ketua Tracer).
    overrideByRole: {
      tracer_team: { title: "Riwayat Pengajuan", description: "Status pengajuan Anda" },
      kaprodi:     { title: "Riwayat Pengajuan", description: "Status pengajuan Anda" },
    },
  },
  { title: "Master Data", href: "/dashboard/master-data", icon: Building2, description: "Prodi, provinsi, kota", permission: "admin.master" },
  { title: "Kontak Penilai", href: "/dashboard/stakeholder-contacts", icon: Contact, description: "Atasan & rekan yang disebut alumni, untuk survei penilaian", permission: "admin.stakeholder" },
  { title: "Laporan Publik", href: "/dashboard/public-reports", icon: FileText, description: "Unggah laporan tahunan untuk publik", permission: "admin.public_report" },
  { title: "Permintaan Data Alumni", href: "/dashboard/permintaan-data", icon: ShieldQuestion, description: "Perbaikan, penghapusan, dan keberatan yang diajukan alumni", permission: "admin.privacy" },
  { title: "Jejak Audit", href: "/dashboard/jejak-audit", icon: History, description: "Riwayat perbuatan atas data pribadi alumni", permission: "admin.privacy" },
];

const academicItems: MenuItem[] = [
  { title: "Data Alumni", href: "/dashboard/alumni-data", icon: GraduationCap, description: "Data alumni per prodi/jurusan", permission: "academic.alumni_data" },
  { title: "Hasil Kuesioner", href: "/dashboard/questionnaire-results", icon: ClipboardList, description: "Hasil respon kuesioner", permission: "academic.questionnaire_results" },
];

const allGroups: MenuGroup[] = [
  { label: "Dashboard", items: dashboardItems },
  { label: "Administrasi", items: adminItems },
  { label: "Akademik", items: academicItems },
  { label: "Konfigurasi", items: konfigurasiItems },
];

export function getMenuForRole(role: AppRole): MenuGroup[] {
  return allGroups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => hasPermission(role, item.permission))
        .map((item) => {
          const override = item.overrideByRole?.[role];
          return override ? { ...item, ...override } : item;
        }),
    }))
    .filter((group) => group.items.length > 0);
}

// ── Route protection config ──────────────────────────────────────────────────
export const routePermissionMap: Record<string, Permission> = {
  "/dashboard/overview": "dashboard.overview",
  "/dashboard/employment": "dashboard.employment",
  "/dashboard/education": "dashboard.education",
  // "/dashboard/analytics": "dashboard.analytics",
  "/dashboard/multidimensi-insight": "dashboard.multidimensi",
  "/dashboard/staff-management": "admin.user",
  "/dashboard/form-management": "admin.questionnaire",
  "/dashboard/approvals": "admin.approval",
  "/dashboard/master-data": "admin.master",
  "/dashboard/alumni-data": "academic.alumni_data",
  "/dashboard/questionnaire-results": "academic.questionnaire_results",
  "/dashboard/kpi": "dashboard.kpi",
  "/dashboard/threshold-management": "admin.threshold",
  "/dashboard/master-ump": "admin.threshold",
  "/dashboard/question-mapping": "admin.etl",
  "/dashboard/etl-anomaly-log": "admin.etl",
  "/dashboard/public-reports": "admin.public_report",
  "/dashboard/public-settings": "admin.public_report",
  "/dashboard/permintaan-data": "admin.privacy",
  "/dashboard/jejak-audit": "admin.privacy",
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
    dekan: "dekan",
    alumni: "alumni",
    // Legacy compat
    admin: "head_tracer",
    p2mpp: "wadir",
    prodi: "kaprodi",
    ketua_fakultas: "dekan",
  };
  return map[backendRole ?? ""] ?? "alumni";
}
