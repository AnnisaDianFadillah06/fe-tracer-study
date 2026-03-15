import { motion } from "framer-motion";
import { LucideIcon, CheckCircle2, XCircle } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "up" | "down" | "neutral";
  icon: LucideIcon;
  description?: string;
  color?: "orange" | "cyan" | "emerald" | "amber" | "purple";
  thresholdValue?: number;
  thresholdLabel?: string;
  thresholdMet?: boolean;
}

const colorVariants = {
  orange: {
    bg: "bg-primary/10",
    text: "text-primary",
    glow: "shadow-glow-orange",
  },
  cyan: {
    bg: "bg-cyan-accent/10",
    text: "text-cyan-accent",
    glow: "shadow-glow-cyan",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    glow: "",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    glow: "",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    glow: "",
  },
};

const StatCard = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  description,
  color = "orange",
  thresholdValue,
  thresholdLabel,
  thresholdMet,
}: StatCardProps) => {
  const colorClasses = colorVariants[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="stat-card"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses.bg}`}>
          <Icon className={`w-6 h-6 ${colorClasses.text}`} />
        </div>
        {change && (
          <span
            className={`text-sm font-medium px-2 py-1 rounded-lg ${
              changeType === "up"
                ? "bg-emerald-500/10 text-emerald-400"
                : changeType === "down"
                ? "bg-red-500/10 text-red-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {changeType === "up" ? "▲ " : changeType === "down" ? "▼ " : ""}
            {change}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="font-heading text-3xl font-bold">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>

      {thresholdValue !== undefined && (
        <div className="mt-3 pt-3 border-t border-border space-y-1">
          <p className="text-xs text-muted-foreground">
            {thresholdLabel ?? "Threshold BAN-PT"}: {thresholdValue}%
          </p>
          {thresholdMet !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-medium ${thresholdMet ? "text-emerald-400" : "text-red-400"}`}>
              {thresholdMet ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
              {thresholdMet ? "Tercapai" : "Belum Tercapai"}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default StatCard;
