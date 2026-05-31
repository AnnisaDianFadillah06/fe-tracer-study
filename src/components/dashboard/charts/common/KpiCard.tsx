import { motion } from "framer-motion";
import { Loader2, AlertCircle, ArrowRightLeft, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useKpiUI } from "@/contexts/GlobalFiltersContext";

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
  loading = false,
  error = null,
  empty = false,
  emptyMessage = "Belum ada data untuk filter ini",
  compareType,
  headerExtra,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: string | null;
  /** Render empty-state placeholder instead of children. */
  empty?: boolean;
  emptyMessage?: string;
  /** Compare type key passed to /dashboard/compare?type=... — omit to hide button */
  compareType?: string;
  /** Extra header controls (filters etc.) */
  headerExtra?: React.ReactNode;
}) => {
  const navigate = useNavigate();
  const { hideCompare } = useKpiUI();
  return (
  <div className={`glass-card p-5 ${className}`}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="font-heading font-semibold text-base">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {headerExtra}
        {compareType && !hideCompare && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => navigate(`/dashboard/compare?type=${encodeURIComponent(compareType)}`)}
          >
            <ArrowRightLeft className="w-3 h-3" />
            Bandingkan
          </Button>
        )}
      </div>
    </div>
    {loading ? (
      <div className="flex flex-col items-center justify-center h-72 text-muted-foreground gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs">Memuat data...</p>
      </div>
    ) : error ? (
      <div className="flex flex-col items-center justify-center h-72 text-destructive gap-2 px-4 text-center">
        <AlertCircle className="w-6 h-6" />
        <p className="text-xs font-medium">Gagal memuat data</p>
        <p className="text-[11px] text-muted-foreground">{error}</p>
      </div>
    ) : empty ? (
      <div className="flex flex-col items-center justify-center h-72 text-muted-foreground gap-2 px-4 text-center border border-dashed border-border rounded-lg bg-muted/10">
        <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center">
          <Inbox className="w-6 h-6" />
        </div>
        <p className="text-sm font-medium text-foreground">{emptyMessage}</p>
        <p className="text-xs">Coba ubah filter atau pilih periode lain.</p>
      </div>
    ) : (
      children
    )}
  </div>
  );
};
