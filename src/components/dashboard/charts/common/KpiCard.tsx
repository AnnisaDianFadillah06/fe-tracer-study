import { motion } from "framer-motion";

/* ============================================================
   COLOR TOKENS — sesuai psikologi warna pada spesifikasi KPI
   ============================================================ */
export const C = {
  blue: "#3b82f6",
  blueDark: "#1e40af",
  blueLight: "#93c5fd",
  green: "#10b981",
  greenDark: "#047857",
  greenLight: "#6ee7b7",
  orange: "#f59e0b",
  orangeLight: "#fcd34d",
  red: "#ef4444",
  yellow: "#eab308",
  purple: "#8b5cf6",
  navy: "#1e3a8a",
  gray: "#9ca3af",
  grayDark: "#6b7280",
};

export const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

export const KpiSection = ({
  no,
  title,
  desc,
  children,
}: {
  no: string;
  title: string;
  desc: string;
  children: React.ReactNode;
}) => (
  <motion.section
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="space-y-4"
  >
    <div className="border-l-4 border-primary pl-4">
      <p className="text-xs font-semibold text-primary tracking-wider">KPI {no}</p>
      <h2 className="font-heading font-bold text-xl">{title}</h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
    <div className="grid gap-4">{children}</div>
  </motion.section>
);

export const KpiCard = ({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`glass-card p-5 ${className}`}>
    <div className="mb-4">
      <h3 className="font-heading font-semibold text-sm">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
    {children}
  </div>
);
