import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertCircle, ArrowRightLeft, Inbox, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useKpiUI, useGlobalFilters, ALL } from "@/contexts/GlobalFiltersContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
  methodology,
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
  /** Methodology / formula explanation shown via info icon (hover + click). */
  methodology?: React.ReactNode;
}) => {
  const navigate = useNavigate();
  const { hideCompare } = useKpiUI();
  const { prodi, isApplying } = useGlobalFilters();
  const compareDisabled = prodi !== ALL || isApplying;
  const { degree, jurusan, tahunLulus, weekKey } = useGlobalFilters();
 
  const handleCompareClick = () => {
    if (compareDisabled || !compareType) return;
  
    const params = new URLSearchParams();
    params.set("type", compareType);
  
    // Encode filter aktif ke URL supaya ComparePage bisa baca
    // walau GlobalFiltersProvider tidak wrap halaman compare
    if (degree && degree !== "__all__") params.set("jenjang", degree);
    if (jurusan && jurusan !== "__all__") params.set("jurusan", jurusan);
    if (tahunLulus && tahunLulus !== "all") params.set("tahun_lulus", tahunLulus);
    if (weekKey) params.set("minggu_snapshot", weekKey);
  
    navigate(`/dashboard/compare?${params.toString()}`);
  };

  // Per-card staggered loading window so charts don't all finish at once.
  const stagger = useMemo(() => 250 + Math.floor(Math.random() * 700), []);
  const [localLoading, setLocalLoading] = useState(false);
 
  // Stagger: saat filter diterapkan, tahan skeleton sebentar
  // supaya chart tidak flash-update semua sekaligus
  useEffect(() => {
    if (!isApplying) return;
    setLocalLoading(true);
    const t = setTimeout(() => setLocalLoading(false), stagger);
    return () => clearTimeout(t);
  }, [isApplying, stagger]);
 
  // ← FIX: saat data hook sudah selesai, clear skeleton segera
  // Jangan tunggu timeout — loading prop false = data sudah ada
  useEffect(() => {
    if (loading === false) setLocalLoading(false);
  }, [loading]);
 
  // Skeleton tampil hanya kalau:
  // - filter sedang diterapkan (isApplying) ATAU localLoading masih aktif
  // - DAN hook belum selesai (loading !== false)
  const showSkeleton = (isApplying || localLoading) && loading !== false;
  const compareTooltip = isApplying
    ? "Tunggu data selesai dimuat."
    : "Jangan filter hingga prodi — butuh lebih dari 1 prodi untuk fitur ini.";
  return (
  <div className={`glass-card p-5 ${className}`} aria-busy={showSkeleton}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="font-heading font-semibold text-base">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {headerExtra}
        {methodology && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <Popover>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Lihat metodologi perhitungan"
                      className="inline-flex items-center justify-center h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Lihat Metodologi Perhitungan
                </TooltipContent>
                <PopoverContent side="bottom" align="end" className="w-80 text-xs leading-relaxed">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary mb-2">
                    <Info className="w-3.5 h-3.5" /> Metodologi Perhitungan
                  </div>
                  <div className="space-y-2 text-foreground">{methodology}</div>
                </PopoverContent>
              </Popover>
            </Tooltip>
          </TooltipProvider>
        )}
        {compareType && !hideCompare && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={compareDisabled ? 0 : -1}>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={compareDisabled}
                    className="h-8 text-xs gap-1"
                    aria-disabled={compareDisabled}
                    onClick={handleCompareClick}
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    Bandingkan
                  </Button>
                </span>
              </TooltipTrigger>
              {compareDisabled && (
                <TooltipContent side="top" className="max-w-[220px] text-xs">
                  {compareTooltip}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
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
      <div className="relative">
        {/* Keep previously rendered chart visible while new data loads —
            only dim slightly and disable interactions so users keep context. */}
        <div
          className={
            showSkeleton
              ? "opacity-80 pointer-events-none transition-opacity duration-300"
              : "transition-opacity duration-300"
          }
        >
          {children}
        </div>
        {showSkeleton && (
          <>
            {/* Subtle top progress bar to show activity without hiding the chart */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-md bg-primary/10">
              <div className="h-full w-1/3 bg-primary/70 animate-shimmer" />
            </div>
            <div
              role="status"
              aria-live="polite"
              className="absolute top-2 right-2 flex items-center gap-1.5 text-[11px] text-muted-foreground bg-card/90 border border-border rounded-full px-2 py-0.5 shadow-sm animate-in fade-in"
            >
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              Memperbarui…
            </div>
          </>
        )}
      </div>
    )}
  </div>
  );
};
