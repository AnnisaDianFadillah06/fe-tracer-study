import { motion } from "framer-motion";
import { Mail, Phone, MapPin, ShieldCheck } from "lucide-react";
import { institution } from "@/config/institution";

/**
 * Bagian kontak pengelola tracer study di halaman muka.
 *
 * Dulu bagian ini memuat enam nama dan gelar pejabat sungguhan yang ditulis
 * langsung di kode. Itu dihapus: SmartTracer dipasang di perguruan tinggi
 * mana pun, dan susunan timnya berganti tiap periode — data orang tidak
 * boleh tinggal di dalam berkas sumber. Yang tersisa adalah kanal kontak
 * kelembagaan yang seluruhnya dibaca dari konfigurasi institusi.
 */
const contacts = [
  { icon: Mail, label: "Surel", value: institution.email },
  { icon: Phone, label: "Telepon", value: institution.phone },
  { icon: MapPin, label: "Alamat", value: institution.address },
].filter((item) => item.value);

const TeamSection = () => {
  return (
    <section id="team" className="py-20 bg-secondary/20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Pengelola <span className="text-primary">Smart Tracer</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Penyelenggaraan tracer study {institution.name} dikoordinasikan oleh{" "}
            {institution.unit}. Hubungi kanal di bawah untuk pertanyaan seputar
            pengisian kuesioner maupun permintaan data.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-8"
        >
          <div className="glass-card p-6 text-center max-w-md w-full border-2 border-primary/30">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/30 to-orange-light/30 flex items-center justify-center border-2 border-primary/50">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-heading font-bold text-lg mb-1">{institution.unit}</h3>
            <p className="text-primary text-sm font-medium">
              Penanggung jawab pelaksanaan tracer study
            </p>
          </div>
        </motion.div>

        {contacts.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {contacts.map((contact, index) => (
              <motion.div
                key={contact.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.15 + index * 0.05 }}
                className="glass-card p-4 flex items-center gap-3 hover:border-primary/30 transition-all"
              >
                <div className="w-10 h-10 flex-none rounded-lg bg-secondary/60 flex items-center justify-center border border-border">
                  <contact.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{contact.label}</p>
                  <p className="text-sm font-medium break-words">{contact.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default TeamSection;
