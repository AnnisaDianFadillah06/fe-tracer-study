import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarChart3, FileText, Home } from "lucide-react";

/**
 * Kerangka halaman publik (tanpa login).
 *
 * Dipisah dari DashboardLayout karena tidak boleh menyentuh RoleContext atau
 * AuthContext sama sekali -- pengunjung tidak punya sesi, dan layout dashboard
 * mengasumsikan ada user yang sedang login.
 */

const navItems = [
  { to: "/", label: "Beranda", icon: Home },
  { to: "/statistik", label: "Statistik", icon: BarChart3 },
  { to: "/laporan", label: "Laporan TS", icon: FileText },
];

interface PublicPageShellProps {
  title: string;
  description?: string;
  /** Kontrol seperti pemilih tahun, ditaruh sebaris dengan judul. */
  actions?: ReactNode;
  children: ReactNode;
}

const PublicPageShell = ({ title, description, actions, children }: PublicPageShellProps) => {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-heading font-bold">Tracer Study</span>
            <span className="text-xs text-muted-foreground">POLBAN</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                aria-current={pathname === to ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm transition-colors",
                  pathname === to
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </Link>
            ))}
            <Button asChild size="sm" className="ml-2">
              <Link to="/login">Masuk</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold sm:text-3xl">{title}</h1>
            {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>

        {children}
      </main>

      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto max-w-7xl px-4 text-sm text-muted-foreground sm:px-6">
          Tracer Study Politeknik Negeri Bandung
        </div>
      </footer>
    </div>
  );
};

export default PublicPageShell;
