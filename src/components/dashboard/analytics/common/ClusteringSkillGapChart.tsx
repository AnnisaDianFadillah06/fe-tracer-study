import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const skillGapData = [
  { skill: "Pengetahuan Bidang", saat_lulus: 75, dibutuhkan: 85, gap: -10 },
  { skill: "Kemampuan TI", saat_lulus: 70, dibutuhkan: 90, gap: -20 },
  { skill: "Bahasa Inggris", saat_lulus: 55, dibutuhkan: 80, gap: -25 },
  { skill: "Komunikasi", saat_lulus: 72, dibutuhkan: 88, gap: -16 },
  { skill: "Kerjasama Tim", saat_lulus: 78, dibutuhkan: 85, gap: -7 },
  { skill: "Problem Solving", saat_lulus: 68, dibutuhkan: 90, gap: -22 },
  { skill: "Kepemimpinan", saat_lulus: 60, dibutuhkan: 75, gap: -15 },
  { skill: "Etika Profesional", saat_lulus: 80, dibutuhkan: 85, gap: -5 },
];

const ClusteringSkillGapChart = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="chart-container"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-semibold">Skill Gap Analysis</h3>
          <UITooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs bg-card border-border">
              <p className="text-sm">
                Perbandingan kompetensi saat lulus (f1761-f1774 A) dengan yang dibutuhkan 
                pekerjaan (B). Gap negatif menunjukkan kompetensi yang perlu ditingkatkan.
              </p>
            </TooltipContent>
          </UITooltip>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-cyan-accent" />
            Saat Lulus
          </span>
          <span className="text-xs flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-primary" />
            Dibutuhkan
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={skillGapData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 22%)" horizontal={false} />
          <XAxis
            type="number"
            domain={[0, 100]}
            stroke="hsl(215 20% 55%)"
            fontSize={12}
          />
          <YAxis
            dataKey="skill"
            type="category"
            stroke="hsl(215 20% 55%)"
            fontSize={11}
            tickLine={false}
            width={95}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(222 47% 11%)",
              border: "1px solid hsl(217 33% 22%)",
              borderRadius: "8px",
            }}
            formatter={(value: number, name: string) => {
              const label = name === "saat_lulus" ? "Kompetensi Saat Lulus" : "Kompetensi Dibutuhkan";
              return [`${value}%`, label];
            }}
          />
          <Legend
            wrapperStyle={{ paddingTop: "10px" }}
            formatter={(value) => (
              <span className="text-sm text-foreground">
                {value === "saat_lulus" ? "Saat Lulus" : "Dibutuhkan"}
              </span>
            )}
          />
          <Bar dataKey="saat_lulus" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={12} />
          <Bar dataKey="dibutuhkan" fill="#f97316" radius={[0, 4, 4, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>

      {/* Gap Summary */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30 text-center">
          <div className="text-lg font-bold text-red-400">-25%</div>
          <div className="text-xs text-muted-foreground">Gap Tertinggi</div>
          <div className="text-xs font-medium">Bahasa Inggris</div>
        </div>
        <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30 text-center">
          <div className="text-lg font-bold text-amber-400">-15%</div>
          <div className="text-xs text-muted-foreground">Gap Rata-rata</div>
          <div className="text-xs font-medium">Semua Kompetensi</div>
        </div>
        <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30 text-center">
          <div className="text-lg font-bold text-emerald-400">-5%</div>
          <div className="text-xs text-muted-foreground">Gap Terendah</div>
          <div className="text-xs font-medium">Etika Profesional</div>
        </div>
      </div>
    </motion.div>
  );
};

export default ClusteringSkillGapChart;
