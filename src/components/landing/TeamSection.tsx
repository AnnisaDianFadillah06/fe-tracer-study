import { motion } from "framer-motion";
import { User, Mail, Phone } from "lucide-react";

const teamMembers = [
  {
    name: "Dr. Tomy Andrianto, S.S.T., M-M.Par.",
    role: "Wakil Direktur Bidang Kemahasiswaan",
    isLead: true,
  },
  {
    name: "Rony Pasonang Sihombing, S.T., M.Eng.",
    role: "Tim Tracer Study",
    isLead: false,
  },
  {
    name: "Hanny Madiawati, S.S.T., M.T.",
    role: "Tim Tracer Study",
    isLead: false,
  },
  {
    name: "Yeti Nugraheni, S.T., M.T.",
    role: "Tim Tracer Study",
    isLead: false,
  },
  {
    name: "Asri Maspupah, S.S.T., M.T.",
    role: "Tim Tracer Study",
    isLead: false,
  },
  {
    name: "Susilawati, S.T., M.Eng.",
    role: "Tim Tracer Study",
    isLead: false,
  },
];

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
            Tim <span className="text-primary">Tracer Study</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Koordinator dan tim yang bertanggung jawab dalam pengelolaan Tracer Study POLBAN
          </p>
        </motion.div>

        {/* Lead - Wakil Direktur */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex justify-center mb-10"
        >
          <div className="glass-card p-6 text-center max-w-sm w-full border-2 border-primary/30">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary/30 to-orange-light/30 flex items-center justify-center border-2 border-primary/50">
              <User className="w-12 h-12 text-primary" />
            </div>
            <h3 className="font-heading font-bold text-lg mb-1">
              {teamMembers[0].name}
            </h3>
            <p className="text-primary text-sm font-medium mb-3">
              {teamMembers[0].role}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Mail className="w-3 h-3" />
              <span>wadir3@polban.ac.id</span>
            </div>
          </div>
        </motion.div>

        {/* Team Members */}
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          {teamMembers.slice(1).map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="glass-card p-4 text-center hover:border-primary/30 transition-all"
            >
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center border border-border">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <h4 className="font-medium text-sm mb-1 leading-tight">
                {member.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {member.role}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-6 px-6 py-3 bg-secondary/30 rounded-xl border border-border">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">tracerstudy@polban.ac.id</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">(022) 2013789</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TeamSection;
