import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  GraduationCap, 
  LayoutDashboard, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  User,
  Bell,
  Users,
  KeyRound,
  Briefcase,
  BookOpen,
  UserCog,
  ClipboardList,
  FileText,
  Gauge,
  Target,
  Radio,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import RoleSwitcher from "@/components/dashboard/RoleSwitcher";
import { useRole } from "@/contexts/RoleContext";
import { Badge } from "@/components/ui/badge";
import GlobalFilters from "@/components/dashboard/GlobalFilters";
import { GlobalFiltersProvider } from "@/contexts/GlobalFiltersContext";
import DownloadDataButton from "@/components/dashboard/DownloadDataButton";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Navigation items — role-agnostic routes
const navItems = [
  {
    title: "Monitoring Operasional",
    icon: LayoutDashboard,
    href: "/dashboard/overview",
    description: "Pemantauan pengisian tracer study",
  },
  {
    title: "Luaran Pekerjaan",
    icon: Briefcase,
    href: "/dashboard/employment",
    description: "Penempatan & karier alumni",
  },
  {
    title: "Evaluasi Pendidikan",
    icon: BookOpen,
    href: "/dashboard/education",
    description: "Kompetensi & pembelajaran",
  },
  {
    title: "Ringkasan KPI",
    icon: Gauge,
    href: "/dashboard/kpi",
    description: "Gabungan 13 KPI tracer",
  },
];

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { currentRole, selectedProdi, roleLabels } = useRole();

  // Show GlobalFilters on dashboard data pages (overview/employment/education/kpi)
  const showGlobalFilters = /\/dashboard\/(overview|employment|education|kpi)/.test(location.pathname);
  const filtersMode = currentRole === "kaprodi" ? "kaprodi" : "full";
  const isRealtimePage = /\/dashboard\/overview/.test(location.pathname);
  const todayId = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  return (
    <GlobalFiltersProvider>
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 260 }}
        transition={{ duration: 0.3 }}
        className="fixed left-0 top-0 bottom-0 z-40 bg-sidebar border-r border-sidebar-border flex flex-col"
      >
        {/* Logo */}
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/dashboard/overview" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-light flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="font-heading font-bold text-lg text-sidebar-foreground">
                  Tracer Study
                </span>
                <span className="text-xs text-muted-foreground block -mt-1">
                  Dashboard
                </span>
              </motion.div>
            )}
          </Link>
        </div>

        {/* Role Badge in Sidebar */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <Badge variant="outline" className="w-full justify-center py-1.5">
              {roleLabels[currentRole]}
              {selectedProdi && (
                <span className="ml-1 text-xs opacity-70">• {selectedProdi}</span>
              )}
            </Badge>
          </div>
        )}

        {/* Navigation — scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
          {/* Main nav */}
          {!collapsed && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1">
              Dashboard
            </p>
          )}
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`sidebar-item ${isActive ? "active" : ""}`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-primary" : "text-sidebar-foreground"}`} />
                {!collapsed && (
                  <div>
                    <div className={`font-medium ${isActive ? "text-primary" : "text-sidebar-foreground"}`}>
                      {item.title}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                )}
              </Link>
            );
          })}

          {/* Admin section */}
          {!collapsed && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-4 pb-1">
              Administrasi
            </p>
          )}
          {collapsed && <div className="my-2 border-t border-sidebar-border" />}
          {[
            { href: "/dashboard/team-management", icon: Users, title: "Tim Koordinator", desc: "Kelola tim tracer" },
            { href: "/dashboard/student-management", icon: UserCog, title: "Akun Mahasiswa", desc: "CRUD akun kuesioner" },
            { href: "/dashboard/question-management", icon: ClipboardList, title: "Pertanyaan", desc: "Manajemen kuesioner" },
            { href: "/dashboard/form-preview", icon: FileText, title: "Preview Form", desc: "Lihat tampilan form" },
            { href: "/dashboard/threshold-management", icon: Target, title: "Threshold", desc: "Nilai LAM/BAN-PT" },
            { href: "/dashboard/master-ump", icon: Wallet, title: "Master UMP", desc: "Data UMP per provinsi" },
          ].map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`sidebar-item ${isActive ? "active" : ""}`}
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-primary" : "text-sidebar-foreground"}`} />
                {!collapsed && (
                  <div>
                    <div className={`font-medium ${isActive ? "text-primary" : "text-sidebar-foreground"}`}>
                      {item.title}
                    </div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Role Switcher pinned to bottom */}
        {!collapsed && (
          <div className="p-3 border-t border-sidebar-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-2">
              Beralih Peran (Demo)
            </p>
            <RoleSwitcher />
          </div>
        )}

        {/* Collapse Toggle */}
        <div className="p-4 border-t border-sidebar-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-center"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div 
        className="flex-1 flex flex-col transition-all duration-300"
        style={{ marginLeft: collapsed ? 80 : 260 }}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            {/* Current page info */}
            <div className="hidden md:block">
              <h1 className="font-heading font-semibold text-lg">
                {navItems.find(item => item.href === location.pathname)?.title || "Dashboard"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {navItems.find(item => item.href === location.pathname)?.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Realtime indicator (Overview only) */}
            {isRealtimePage && (
              <Badge
                variant="outline"
                className="hidden md:flex h-8 px-3 gap-1.5 items-center text-xs border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" /> Realtime — {todayId}
              </Badge>
            )}

            {/* Prodi indicator for Kaprodi */}
            {selectedProdi && (
              <Badge variant="secondary" className="hidden md:flex">
                Prodi: {selectedProdi}
              </Badge>
            )}

            {/* Theme Toggle */}
            {showGlobalFilters && <DownloadDataButton />}
            <ThemeToggle />

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-orange-light flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="hidden md:inline">Admin</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/profile" className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard/change-password" className="flex items-center">
                    <KeyRound className="w-4 h-4 mr-2" />
                    Ganti Password
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/" className="flex items-center text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Keluar
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Sticky Global Filters under the top bar */}
        {showGlobalFilters && (
          <div className="sticky top-16 z-20">
            <GlobalFilters mode={filtersMode} kaprodiName={selectedProdi ?? undefined} />
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
    </GlobalFiltersProvider>
  );
};

export default DashboardLayout;
