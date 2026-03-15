import { motion } from "framer-motion";
import { 
  GraduationCap, 
  Briefcase, 
  TrendingUp, 
  MapPin, 
  Building2, 
  DollarSign 
} from "lucide-react";

const stats = [
  {
    icon: GraduationCap,
    value: "1,692",
    label: "Total Alumni",
    description: "Lulusan tahun 2022",
    color: "from-primary to-orange-light",
  },
  {
    icon: Briefcase,
    value: "72.5%",
    label: "Tingkat Bekerja",
    description: "Sudah mendapat pekerjaan",
    color: "from-emerald-400 to-emerald-500",
  },
  {
    icon: TrendingUp,
    value: "3.35",
    label: "Bulan Tunggu",
    description: "Rata-rata masa tunggu kerja",
    color: "from-cyan-accent to-cyan-light",
  },
  {
    icon: MapPin,
    value: "25",
    label: "Provinsi",
    description: "Sebaran lokasi kerja",
    color: "from-purple-400 to-purple-500",
  },
  {
    icon: Building2,
    value: "57%",
    label: "Perusahaan Nasional",
    description: "Bekerja di perusahaan nasional",
    color: "from-amber-400 to-amber-500",
  },
  {
    icon: DollarSign,
    value: "Rp 5.02M",
    label: "Rata-rata Gaji",
    description: "Take home pay per bulan",
    color: "from-pink-400 to-pink-500",
  },
];

const StatsSection = () => {
  return (
    <section id="stats" className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Statistik <span className="gradient-text-cyan">Tracer Study 2023</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Gambaran umum hasil penelusuran alumni Politeknik Negeri Bandung
            lulusan tahun 2022
          </p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card p-6 relative overflow-hidden group"
            >
              {/* Gradient Overlay */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
              
              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${stat.color} mb-4`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
                
                <div className="font-heading text-4xl font-bold mb-1">
                  {stat.value}
                </div>
                
                <div className="font-semibold text-foreground mb-1">
                  {stat.label}
                </div>
                
                <div className="text-sm text-muted-foreground">
                  {stat.description}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 glass-card p-8 text-center"
        >
          <h3 className="font-heading text-xl font-semibold mb-4">
            Status Alumni Tahun 2022
          </h3>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { status: "Bekerja", value: "72.5%", color: "bg-emerald-500" },
              { status: "Mencari Kerja", value: "11.9%", color: "bg-amber-500" },
              { status: "Melanjutkan Studi", value: "5.5%", color: "bg-cyan-accent" },
              { status: "Wiraswasta", value: "3.2%", color: "bg-purple-500" },
              { status: "Studi & Bekerja", value: "4.7%", color: "bg-blue-500" },
              { status: "Lainnya", value: "2.2%", color: "bg-muted" },
            ].map((item) => (
              <div key={item.status} className="flex items-center gap-2 px-4 py-2 bg-secondary/50 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-sm font-medium">{item.status}</span>
                <span className="text-sm text-muted-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default StatsSection;
