import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  BarChart3, 
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
import PolbanLogo from "@/components/PolbanLogo";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Navigation items — role-agnostic routes
const navItems = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    href: "/dashboard/overview",
    description: "High-level KPI metrics",
  },
  {
    title: "Employment Outcome",
    icon: Briefcase,
    href: "/dashboard/employment",
    description: "Job placement & career",
  },
  {
    title: "Educational Assessment",
    icon: BookOpen,
    href: "/dashboard/education",
    description: "Kompetensi & learning",
  },
  {
    title: "Analitik",
    icon: BarChart3,
    href: "/dashboard/analytics",
    description: "Clustering & Survival",
  },
];

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { currentRole, selectedProdi, roleLabels } = useRole();

  return (
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
            <PolbanLogo compact title="Tracer Study" subtitle="Dashboard" showText={!collapsed} />
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
            { href: "/dashboard/form-management", icon: ClipboardList, title: "Form Management", desc: "Kelola formulir dan hasil respon" },
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
            {/* Role Switcher */}
            <RoleSwitcher />
            
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
            {/* Prodi indicator for Kaprodi */}
            {selectedProdi && (
              <Badge variant="secondary" className="hidden md:flex">
                Prodi: {selectedProdi}
              </Badge>
            )}

            {/* Theme Toggle */}
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

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
