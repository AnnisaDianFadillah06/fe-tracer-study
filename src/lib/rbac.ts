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
} from "lucide-react";

// ── Role definitions (DFR-26: data-driven, bukan union type statis) ──────────
//
// AppRole dulu union type 6 string literal yang di-compile statis --
// menambah satu role baru (mis. hasil DFR-12 di backend) berarti mengubah
// kode ini plus setiap Record<AppRole,...> yang menjabarkannya. Sekarang
// AppRole = string, dan seluruh data per-role (label/description/permission)
// hidup di satu `roleRegistry` yang bisa diperluas lewat
// `registerRole()`/`hydrateRoleRegistryFromApi()` tanpa menyentuh definisi
// tipe. Untuk keenam role existing, isi registry-nya SAMA PERSIS dengan
// Record literal lama -- ini refactor struktur, bukan perubahan perilaku.
export type AppRole = string;

export interface RoleConfig {
  label: string;
  description: string;
  permissions: Permission[];
}

/**
 * Permission catalog sungguhan belum ada di backend (lihat DFR-26 di
 * cetak-biru-struktur-dinamis.md, bagian "di luar cakupan sampai ada
 * permission catalog"). Role generik baru yang HANYA dikenal dari
 * `GET /api/roles` (nama/label/scope) tapi tidak punya definisi permission
 * statis di sini jatuh ke set paling minim ini -- bisa lihat Overview, tidak
 * lebih -- sampai permission catalog sungguhan dibangun di fase mendatang.
 */
const UNKNOWN_ROLE_FALLBACK_PERMISSIONS: Permission[] = ["dashboard.overview"];

const roleRegistry: Record<string, RoleConfig> = {
  head_tracer: {
    label: "Super Admin (Ketua Tracer)",
    description: "Full system access — kelola user, kuesioner, approval, master data",
    permissions: [],
  },
  tracer_team: {
    label: "Admin (Tim Tracer)",
    description: "Kelola & edit kuesioner, ajukan perubahan via approval",
    permissions: [],
  },
  wadir: {
    label: "Pimpinan (Direktur/Wadir/P2MPP)",
    description: "Viewer seluruh data institusi & download",
    permissions: [],
  },
  kajur: {
    label: "Ketua Jurusan",
    description: "Viewer data jurusan & download",
    permissions: [],
  },
  kaprodi: {
    label: "Ketua Program Studi",
    description: "Viewer data program studi & download",
    permissions: [],
  },
  alumni: {
    label: "Alumni",
    description: "Pengisi kuesioner tracer study",
    permissions: ["questionnaire.fill"],
  },
};

/** Role belum dikenal (bukan salah satu dari keenam role di atas) jatuh ke sini. */
const FALLBACK_ROLE: AppRole = "alumni";

function getRoleConfig(role: AppRole): RoleConfig {
  return roleRegistry[role] ?? roleRegistry[FALLBACK_ROLE];
}

/**
 * Daftarkan/perbarui satu role di registry. Dipakai baik oleh definisi
 * statis di bawah (permissions per role existing) maupun oleh
 * hydrateRoleRegistryFromApi() untuk role baru yang datang dari backend.
 */
function registerRole(name: string, config: RoleConfig): void {
  roleRegistry[name] = config;
}

/**
 * DFR-26: sinkronkan label/deskripsi role dari `GET /api/roles` (tabel
 * `roles` backend -- name/label/description/scope, lihat RoleController).
 * Role yang namanya SUDAH dikenal statis (enam role di atas) hanya
 * memperbarui label/description-nya (permission set tetap, supaya perilaku
 * tidak berubah); role yang baru murni dari API mendapat
 * UNKNOWN_ROLE_FALLBACK_PERMISSIONS sampai ada permission catalog.
 */
export function hydrateRoleRegistryFromApi(
  roles: Array<{ name: string; label?: string | null; description?: string | null }>,
): void {
  for (const r of roles) {
    if (!r.name) continue;
    const existing = roleRegistry[r.name];
    registerRole(r.name, {
      label: r.label?.trim() || existing?.label || r.name,
      description: r.description?.trim() || existing?.description || "",
      permissions: existing?.permissions ?? UNKNOWN_ROLE_FALLBACK_PERMISSIONS,
    });
  }
}

/** Proxy read-only yang berperilaku seperti Record<AppRole,string> lama. */
function labelProxy(pick: (c: RoleConfig) => string): Record<string, string> {
  return new Proxy(
    {},
    {
      get: (_target, prop) => (typeof prop === "string" ? pick(getRoleConfig(prop)) : undefined),
      has: (_target, prop) => typeof prop === "string" && prop in roleRegistry,
      ownKeys: () => Object.keys(roleRegistry),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    },
  ) as Record<string, string>;
}

export const roleLabels: Record<AppRole, string> = labelProxy((c) => c.label);
export const roleDescriptions: Record<AppRole, string> = labelProxy((c) => c.description);

// ── Permissions ──────────────────────────────────────────────────────────────
export type Permission =
  | "dashboard.overview"
  | "dashboard.employment"
  | "dashboard.education"
  | "dashboard.analytics"
  // KPI lintas prodi. BE: /api/dashboard/kpi/13/* hanya di balik auth:sanctum
  // tanpa gate role, jadi semua role dashboard boleh.
  | "dashboard.kpi"
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

// Permission set per role existing -- isinya SAMA PERSIS dengan Record
// literal lama, hanya dipindahkan jadi registrasi ke roleRegistry supaya
// satu sumber data melayani roleLabels/roleDescriptions/rolePermissions
// sekaligus (lihat catatan DFR-26 di atas).
registerRole("head_tracer", {
  ...roleRegistry.head_tracer,
  permissions: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.analytics",
    "dashboard.kpi",
    "admin.user",
    "admin.threshold",
    "admin.etl",
    "admin.questionnaire",
    "admin.approval",
    "admin.master",
    "admin.public_report",
    "admin.stakeholder",
    "admin.privacy",
  ],
});

registerRole("tracer_team", {
  ...roleRegistry.tracer_team,
  permissions: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.analytics",
    "dashboard.kpi",
    "admin.questionnaire",
    "admin.questionnaire.request",
    "admin.approval",
    "admin.stakeholder",
  ],
});

registerRole("wadir", {
  ...roleRegistry.wadir,
  permissions: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.analytics",
    "dashboard.kpi",
    "academic.alumni_data",
    "academic.questionnaire_results",
  ],
});

registerRole("kajur", {
  ...roleRegistry.kajur,
  permissions: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.kpi",
    "academic.alumni_data",
    "academic.questionnaire_results",
  ],
});

registerRole("kaprodi", {
  ...roleRegistry.kaprodi,
  permissions: [
    "dashboard.overview",
    "dashboard.employment",
    "dashboard.education",
    "dashboard.kpi",
    "academic.alumni_data",
    "academic.questionnaire_results",
    // Kaprodi mengajukan pembukaan kembali pengisian alumni (RBAC-12) dan
    // perlu melihat status pengajuannya. BE membuka GET approvals untuk
    // role ini, dan ApprovalController::index() hanya mengembalikan
    // permintaan miliknya sendiri. Tombol setujui/tolak tetap tidak muncul
    // karena digate isHeadTracer di halamannya.
    "admin.approval",
  ],
});

/** Proxy read-only yang berperilaku seperti Record<AppRole,Permission[]> lama. */
export const rolePermissions: Record<AppRole, Permission[]> = new Proxy(
  {},
  {
    get: (_target, prop) => (typeof prop === "string" ? getRoleConfig(prop).permissions : undefined),
    has: (_target, prop) => typeof prop === "string" && prop in roleRegistry,
    ownKeys: () => Object.keys(roleRegistry),
    getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
  },
) as Record<AppRole, Permission[]>;

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return getRoleConfig(role).permissions.includes(permission);
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
  "/dashboard/analytics": "dashboard.analytics",
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

/**
 * Alias role lama yang tidak lagi dikirim backend, tapi tetap dipetakan
 * untuk kompatibilitas (mis. data lama / integrasi yang belum dimutakhirkan).
 */
const LEGACY_ROLE_ALIASES: Record<string, AppRole> = {
  admin: "head_tracer",
  p2mpp: "wadir",
  prodi: "kaprodi",
};

/**
 * DFR-26: role apa pun yang sudah terdaftar di roleRegistry (baik enam role
 * statis, maupun role baru yang masuk lewat hydrateRoleRegistryFromApi())
 * dikembalikan apa adanya -- tidak ada lagi union type yang harus diperluas
 * tiap kali DFR-12 di backend melahirkan role baru. Alias legacy tetap
 * dicek dulu supaya kompatibel dengan role lama yang sudah tidak dikirim
 * backend. Role yang sama sekali tidak dikenal jatuh ke "alumni" (paling
 * minim akses), sama seperti perilaku sebelumnya.
 */
export function mapBackendRole(backendRole?: string): AppRole {
  const role = backendRole ?? "";

  if (role in roleRegistry) return role;
  if (role in LEGACY_ROLE_ALIASES) return LEGACY_ROLE_ALIASES[role];

  return FALLBACK_ROLE;
}
