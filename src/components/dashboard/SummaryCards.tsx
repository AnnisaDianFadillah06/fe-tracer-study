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

const SummaryCards = ({ items }: { items: SummaryCardItem[] }) => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((it, i) => (
        <motion.div
          key={it.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="glass-card p-4 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${it.color ?? "bg-primary/10 text-primary"}`}>
              <it.icon className="w-5 h-5" />
            </div>
            {it.trend && (
              <span className={`text-xs font-semibold ${it.trendUp ? "text-emerald-500" : "text-destructive"}`}>
                {it.trend}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-muted-foreground">{it.title}</p>
          <p className="font-heading text-2xl font-bold leading-tight">{it.value}</p>
          {it.hint && <p className="text-xs text-muted-foreground">{it.hint}</p>}
        </motion.div>
      ))}
    </div>
  );
};

export default SummaryCards;