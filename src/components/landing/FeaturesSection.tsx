import { motion } from "framer-motion";
import { 
  BarChart3, 
  Users, 
  Clock, 
  Target,
  Database,
  Zap
} from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "Pemantauan Respons Secara Realtime",
    description: "Pantau tingkat partisipasi dan pengisian status tracer study secara realtime selama periode survei aktif berlangsung.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Users,
    title: "Segmentasi Alumni",
    description: "Kelompokkan alumni berdasarkan program studi, status pekerjaan, pendapatan, dan karakteristik lainnya untuk analisis yang lebih terarah.",
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
  },
  {
    icon: Clock,
    title: "Alur Analisis Mingguan",
    description: "Data tracer study diproses secara mingguan melalui pipeline analitik otomatis untuk menghasilkan wawasan yang konsisten dan akurat.",
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
  },
  {
    icon: Target,
    title: "Analisis Kesenjangan Keterampilan",
    description: "Identifikasi kesenjangan kompetensi antara capaian lulusan dan kebutuhan industri sebagai dasar evaluasi kurikulum berbasis OBE.",
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
  },
  {
    icon: Database,
    title: "Dukungan Studi Multi-Program",
    description: "Membantu analisis lintas program studi dan jenjang pendidikan dengan filter, benchmarking, dan breakdown KPI secara detail.",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  {
    icon: Zap,
    title: "Pelaporan Ekspor & Akreditasi",
    description: "Menghasilkan laporan tracer study dan indikator KPI dalam berbagai format untuk kebutuhan evaluasi, akreditasi, dan pelaporan institusi.",
    color: "text-orange-light",
    bgColor: "bg-orange-light/10",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
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
            Fitur <span className="gradient-text">Unggulan</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Platform analitik tracer study terlengkap dengan berbagai fitur canggih
            untuk mendukung penjaminan mutu pendidikan tinggi
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass-card-hover p-6 group"
            >
              <div className={`w-12 h-12 rounded-xl ${feature.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`w-6 h-6 ${feature.color}`} />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;