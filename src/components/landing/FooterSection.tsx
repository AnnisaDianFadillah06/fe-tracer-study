import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";
import InstitutionLogo from "@/components/common/InstitutionLogo";
import { institution } from "@/config/institution";

const FooterSection = () => {
  return (
    <footer id="about" className="py-16 border-t border-border/30">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <InstitutionLogo className="mb-4" compact title="Tracer Study" />
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mb-6">
              Platform analitik komprehensif untuk penelusuran alumni{" "}
              {institution.name}. Mendukung penjaminan mutu pendidikan dengan
              keputusan berbasis data.
            </p>
            {/* Alamat dan telepon boleh kosong di konfigurasi: barisnya ikut hilang
                daripada menampilkan label tanpa isi. */}
            <div className="space-y-2 text-sm text-muted-foreground">
              {institution.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{institution.address}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span>{institution.email}</span>
              </div>
              {institution.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{institution.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Tautan Cepat</h4>
            <ul className="space-y-2 text-sm">
              {["Beranda", "Fitur", "Statistik", "Tentang"].map((link) => (
                <li key={link}>
                  <a href={`#${link.toLowerCase()}`} className="text-muted-foreground hover:text-foreground transition-colors">
                    {link}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
                  Login Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-heading font-semibold mb-4">Sumber Daya</h4>
            <ul className="space-y-2 text-sm">
              {[
                "Panduan Pengisian",
                "FAQ",
                "Laporan Tahunan",
                "Kebijakan Privasi",
                "Kontak Admin",
              ].map((link) => (
                <li key={link}>
                  <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border/30 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {institution.name}. Seluruh hak cipta dilindungi.
          </p>
          <p className="text-sm text-muted-foreground">
            {institution.unit}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
