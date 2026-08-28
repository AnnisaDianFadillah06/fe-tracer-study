import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import InstitutionLogo from "@/components/common/InstitutionLogo";

const LandingNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();

  /**
   * Navbar ini dipakai halaman depan MAUPUN halaman publik lain (Statistik,
   * Laporan TS), supaya menunya tidak berganti bentuk saat pengunjung
   * berpindah halaman.
   *
   * Konsekuensinya jangkar harus sadar tempat: `#features` hanya berarti
   * sesuatu di halaman depan. Dibiarkan apa adanya, menekan "Fitur" dari
   * halaman Statistik tidak melakukan apa pun. Di luar halaman depan,
   * jangkarnya diubah menjadi tautan ke halaman depan beserta jangkarnya.
   */
  const isLanding = pathname === "/";

  /**
   * `href` = jangkar di halaman ini, `to` = halaman publik tersendiri.
   *
   * "Statistik" sebelumnya menunjuk jangkar #stats, padahal StatsSection tidak
   * ikut dirender di Landing.tsx -- menunya tidak melakukan apa-apa saat
   * diklik. Sekarang mengarah ke halaman statistik publik yang sebenarnya.
   */
  const anchor = (hash: string) =>
    isLanding ? { href: hash } : { to: `/${hash}` };

  const navLinks: Array<{ name: string; href?: string; to?: string }> = [
    { name: "Beranda", ...anchor("#hero") },
    { name: "Fitur", ...anchor("#features") },
    { name: "Statistik", to: "/statistik" },
    { name: "Laporan TS", to: "/laporan" },
    { name: "Tentang", ...anchor("#about") },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/30"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <InstitutionLogo compact title="Smart Tracer" />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.to ? (
                <Link key={link.name} to={link.to} className="nav-link text-sm font-medium">
                  {link.name}
                </Link>
              ) : (
                <a key={link.name} href={link.href} className="nav-link text-sm font-medium">
                  {link.name}
                </a>
              )
            ))}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Masuk
              </Button>
            </Link>
            <Link to="/login">
              <Button className="btn-primary">
                Dashboard
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden py-4 border-t border-border/30"
          >
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const className = "px-4 py-2 text-muted-foreground hover:text-foreground transition-colors";
                return link.to ? (
                  <Link key={link.name} to={link.to} className={className} onClick={() => setIsOpen(false)}>
                    {link.name}
                  </Link>
                ) : (
                  <a key={link.name} href={link.href} className={className} onClick={() => setIsOpen(false)}>
                    {link.name}
                  </a>
                );
              })}
              <div className="flex gap-2 mt-4 px-4">
                <ThemeToggle />
                <Link to="/login" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Masuk
                  </Button>
                </Link>
                <Link to="/login" className="flex-1">
                  <Button className="btn-primary w-full">
                    Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.nav>
  );
};

export default LandingNav;
