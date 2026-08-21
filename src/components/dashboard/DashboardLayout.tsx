import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Bell,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/common/ThemeToggle";

import { useRole, roleLabels } from "@/contexts/RoleContext";
import { useAuth } from "@/hooks/auth/useAuth";
import { Badge } from "@/components/ui/badge";
import InstitutionLogo from "@/components/common/InstitutionLogo";
import GlobalFilters from "@/components/dashboard/GlobalFilters";
import DownloadDataButton from "@/components/dashboard/DownloadDataButton";
import { useGlobalFilters, ALL } from "@/contexts/GlobalFiltersContext";
import { Building2 } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentRole, selectedProdi, selectedJurusan, jurusanScopeNames, selectedFakultas, menu } = useRole();
  const { jurusan: activeJurusan } = useGlobalFilters();

  // Filter global hanya relevan di halaman data OLAP; halaman admin/konfigurasi
  // punya filternya sendiri.
  const showGlobalFilters = /\/dashboard\/(overview|employment|education|kpi)/.test(
    location.pathname,
  );
  const filtersMode =
    currentRole === "kaprodi"
      ? "kaprodi"
      : currentRole === "kajur"
        ? "kajur"
        : currentRole === "ketua_fakultas"
          ? "ketua_fakultas"
          : "full";

  // Ketua Fakultas wajib pilih 1 jurusan dari cakupannya sebelum melihat data
  // apa pun -- tanpa ini setiap endpoint analitik menolak dengan 422 (lihat
  // EnforcesProdiScope::scopedParams). Halaman data diganti prompt sampai
  // jurusan dipilih, alih-alih membiarkan tiap halaman menampilkan errornya
  // masing-masing.
  const needsJurusanPick =
    showGlobalFilters && currentRole === "ketua_fakultas" && activeJurusan === ALL;

  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Flatten menu items for page title lookup
  const allItems = menu.flatMap((g) => g.items);
  const currentItem = allItems.find((item) => location.pathname.startsWith(item.href));

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
            <InstitutionLogo compact title="Tracer Study" subtitle="Dashboard" showText={!collapsed} />
          </Link>
        </div>

        {/* Role Badge */}
        {!collapsed && (
          <div className="px-4 py-3 border-b border-sidebar-border">
            <Badge variant="outline" className="w-full justify-center py-1.5">
              {roleLabels[currentRole]}
              {selectedProdi && (
                <span className="ml-1 text-xs opacity-70">• {selectedProdi}</span>
              )}
              {selectedFakultas && (
                <span className="ml-1 text-xs opacity-70">• {selectedFakultas}</span>
              )}
            </Badge>
          </div>
        )}

        {/* Navigation — config-driven */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
          {menu.map((group, gi) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 pb-1 pt-3 first:pt-0">
                  {group.label}
                </p>
              )}
              {collapsed && gi > 0 && <div className="my-2 border-t border-sidebar-border" />}
              {group.items.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
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
            </div>
          ))}
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
            <div className="hidden md:block">
              <h1 className="font-heading font-semibold text-lg">
                {currentItem?.title || "Dashboard"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentItem?.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedProdi && (
              <Badge variant="secondary" className="hidden md:flex">
                Prodi: {selectedProdi}
              </Badge>
            )}
            {selectedFakultas && (
              <Badge variant="secondary" className="hidden md:flex">
                Fakultas: {selectedFakultas}
              </Badge>
            )}
            {showGlobalFilters && <DownloadDataButton />}
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-orange-light flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="hidden md:inline">{user?.name ?? "User"}</span>
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
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Filter global sticky di bawah top bar */}
        {showGlobalFilters && (
          <div className="sticky top-16 z-20">
            <GlobalFilters
              mode={filtersMode}
              kaprodiName={selectedProdi ?? undefined}
              kajurJurusan={selectedJurusan ?? undefined}
              ketuaFakultasJurusanScopes={jurusanScopeNames ?? undefined}
            />
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {needsJurusanPick ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
              <Building2 className="w-10 h-10 opacity-50" />
              <p className="font-medium text-foreground">Pilih jurusan terlebih dahulu</p>
              <p className="text-sm max-w-sm">
                Akun Anda mencakup beberapa jurusan. Pilih salah satu dari filter jurusan di atas
                lalu klik "Terapkan" untuk melihat datanya.
              </p>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
