import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, Users, TrendingUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-accent/20 rounded-full blur-3xl animate-pulse-slow animation-delay-300" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/5 to-cyan-accent/5 rounded-full blur-3xl" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
              linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-6"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Dashboard Analitik Terbaru 2024
              </span>
            </motion.div>

            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              <span className="text-foreground">Tracer Study</span>
              <br />
              <span className="gradient-text">Politeknik Negeri</span>
              <br />
              <span className="gradient-text-cyan">Bandung</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Platform analitik komprehensif untuk penelusuran alumni dengan 
              visualisasi data real-time, clustering analysis, dan survival analysis 
              untuk penjaminan mutu pendidikan.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/login">
                <Button size="lg" className="btn-primary gap-2 w-full sm:w-auto">
                  Mulai Eksplorasi
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline" className="btn-outline w-full sm:w-auto">
                  Lihat Fitur
                </Button>
              </a>
            </div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-3 gap-6 mt-12"
            >
              {[
                { value: "1,692", label: "Alumni" },
                { value: "37", label: "Program Studi" },
                { value: "3.4", label: "Rata-rata IPK" },
              ].map((stat, i) => (
                <div key={i} className="text-center lg:text-left">
                  <div className="font-heading text-2xl md:text-3xl font-bold gradient-text">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Content - Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative"
          >
            <div className="relative glass-card p-6 rounded-2xl glow-orange">
              {/* Mini Dashboard Preview */}
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">tracer-study.polban.ac.id</span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: Users, value: "1,168", label: "Bekerja", color: "text-emerald-400" },
                    { icon: BarChart3, value: "72.5%", label: "Tingkat Kerja", color: "text-primary" },
                    { icon: TrendingUp, value: "3.35", label: "Bulan Tunggu", color: "text-cyan-accent" },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.1 }}
                      className="bg-secondary/50 rounded-lg p-3 text-center"
                    >
                      <item.icon className={`w-5 h-5 mx-auto mb-1 ${item.color}`} />
                      <div className="font-heading font-bold text-lg">{item.value}</div>
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Chart Placeholder */}
                <div className="bg-secondary/30 rounded-lg p-4 h-40 flex items-end justify-around gap-2">
                  {[65, 45, 80, 55, 70, 90, 60, 75, 85, 50].map((height, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.8 + i * 0.05, duration: 0.5 }}
                      className={`w-full rounded-t ${i % 2 === 0 ? 'bg-primary' : 'bg-cyan-accent'}`}
                    />
                  ))}
                </div>

                {/* Table Preview */}
                <div className="bg-secondary/30 rounded-lg p-3">
                  <div className="space-y-2">
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-2 bg-muted rounded" />
                        <div className="flex-1 h-2 bg-muted/50 rounded" />
                        <div className="w-16 h-2 bg-primary/30 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-6 -right-6 glass-card px-4 py-2 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-medium">Real-time Data</span>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute -bottom-4 -left-4 glass-card px-4 py-2 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-accent" />
                <span className="text-xs font-medium">K-Means Clustering</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
