import { ReactNode } from "react";
import LandingNav from "@/components/landing/LandingNav";

/**
 * Kerangka halaman publik (tanpa login).
 *
 * Dipisah dari DashboardLayout karena tidak boleh menyentuh RoleContext atau
 * AuthContext sama sekali -- pengunjung tidak punya sesi, dan layout dashboard
 * mengasumsikan ada user yang sedang login.
 */

interface PublicPageShellProps {
  title: string;
  description?: string;
  /** Kontrol seperti pemilih tahun, ditaruh sebaris dengan judul. */
  actions?: ReactNode;
  children: ReactNode;
}

const PublicPageShell = ({ title, description, actions, children }: PublicPageShellProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar yang sama persis dengan halaman depan. Sebelumnya halaman
          publik memakai menu tersendiri berisi tiga tautan, sehingga menunya
          berganti bentuk begitu pengunjung menekan Statistik atau Laporan TS —
          terasa seperti berpindah ke aplikasi lain, padahal masih satu situs. */}
      <LandingNav />

      <main className="mx-auto max-w-7xl px-4 pb-8 pt-24 sm:px-6">
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
