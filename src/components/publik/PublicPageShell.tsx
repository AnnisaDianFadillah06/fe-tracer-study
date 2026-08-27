import { ReactNode } from "react";
import LandingNav from "@/components/landing/LandingNav";
import { institution } from "@/config/institution";

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
  /**
   * Lebar kolom isi.
   *
   * "wide" (bawaan) untuk halaman bertabel dan berbagan yang memang memakai
   * seluruh lebar layar. "narrow" untuk halaman bacaan -- Panduan, FAQ,
   * Kebijakan Privasi -- yang isinya satu kolom teks selebar max-w-3xl.
   *
   * Lebarnya diatur DI SINI, bukan lewat kelas max-w di masing-masing
   * halaman. Cara lama membuat kolom teks selebar 768px menempel di tepi
   * kiri kotak main selebar 1280px, jadi seluruh halaman terlihat miring ke
   * kiri di layar lebar padahal main-nya sendiri sudah di tengah. Dengan
   * lebar dipasang di main, judul dan isinya ikut satu kolom yang sama dan
   * benar-benar di tengah.
   */
  width?: "wide" | "narrow";
  children: ReactNode;
}

const PublicPageShell = ({ title, description, actions, width = "wide", children }: PublicPageShellProps) => {
  const maxWidth = width === "narrow" ? "max-w-3xl" : "max-w-7xl";

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar yang sama persis dengan halaman depan. Sebelumnya halaman
          publik memakai menu tersendiri berisi tiga tautan, sehingga menunya
          berganti bentuk begitu pengunjung menekan Statistik atau Laporan TS —
          terasa seperti berpindah ke aplikasi lain, padahal masih satu situs. */}
      <LandingNav />

      <main className={`mx-auto ${maxWidth} px-4 pb-8 pt-24 sm:px-6`}>
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
        <div className={`mx-auto ${maxWidth} px-4 text-sm text-muted-foreground sm:px-6`}>
          Tracer Study {institution.name}
        </div>
      </footer>
    </div>
  );
};

export default PublicPageShell;
