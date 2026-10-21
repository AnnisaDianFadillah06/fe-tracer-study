import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

export interface SummaryCardItem {
  title: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  color?: string;
  trend?: string;
  trendUp?: boolean;
}

/**
 * Cakupan angkatan kartu ringkasan. Kartu mengikuti filter Tahun Lulus;
 * "Semua Tahun" berarti seluruh angkatan digabung -- beda dengan grafik
 * distribusi/pie di bawahnya yang default ke tahun terakhir, jadi cakupannya
 * perlu tertulis agar keduanya tidak dibandingkan begitu saja.
 */
export const scopeLabelForTahun = (tahunLulus: string) =>
  !tahunLulus || tahunLulus === "all" ? "Semua angkatan" : `Angkatan ${tahunLulus}`;

const SummaryCards = ({
  items,
  className,
  scopeLabel,
}: {
  items: SummaryCardItem[];
  className?: string;
  scopeLabel?: string;
}) => {
  return (
    <div className={`flex flex-wrap justify-center gap-3 ${className ?? ""}`}>
      {items.map((it, i) => (
        <motion.div
          key={it.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="glass-card p-3 flex flex-col gap-1 cursor-default select-none w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.5rem)] xl:w-[calc(16.666%-0.625rem)] min-w-[140px]"
          title="Ringkasan KPI — hanya bersifat informatif"
        >
          <div className="flex items-center justify-between">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center ${it.color ?? "bg-primary/10 text-primary"}`}>
              <it.icon className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              {it.trend && (
                <span className={`text-[11px] font-semibold ${it.trendUp ? "text-emerald-500" : "text-destructive"}`}>
                  {it.trend}
                </span>
              )}
              {scopeLabel && (
                <span className="text-[10px] font-medium text-muted-foreground">{scopeLabel}</span>
              )}
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground leading-tight">{it.title}</p>
          <p className="font-heading text-lg font-bold leading-tight">{it.value}</p>
          {it.hint && <p className="text-[11px] text-muted-foreground leading-tight truncate">{it.hint}</p>}
        </motion.div>
      ))}
    </div>
  );
};

export default SummaryCards;