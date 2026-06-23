import { useMemo } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  Legend,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import { MethodologyBlock } from "./Methodology";
import { useMetodePembelajaran } from "@/hooks/useMetodePembelajaran";

const Kpi10LearningPerceptionChart = () => {
  const { data, loading, error } = useMetodePembelajaran();

  const radarData = useMemo(() => {
    if (!data?.data) return [];
    return data.data.map((d) => ({
      dim:  d.label,
      skor: d.avg_skor,
    }));
  }, [data]);

  const isEmpty = !loading && radarData.length === 0;

  return (
    <KpiCard
      loading={loading}
      error={error}
      empty={isEmpty}
      title="Persepsi Alumni terhadap Metode Pembelajaran"
      subtitle="Radar chart — rata-rata skor Likert 1–5 per metode pembelajaran"
      compareType="learning"
      methodology={
        <MethodologyBlock
          description="Persepsi alumni terhadap efektivitas metode pembelajaran selama kuliah — diukur dengan skala Likert 1–5."
          formula={<>Skor Metode = Σ Jawaban Responden / Jumlah Responden<br/>Skala: 1 = Sangat Kurang, 5 = Sangat Baik</>}
        />
      }
    >
      <div className="grid lg:grid-cols-2 gap-5 items-stretch">
        <div className="h-80 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} margin={{ top: 16, right: 24, bottom: 8, left: 24 }}>
              <PolarGrid
                stroke="hsl(var(--border))"
                strokeOpacity={0.8}
                strokeWidth={1}
              />
              <PolarAngleAxis
                dataKey="dim"
                tick={{ fontSize: 13, fontWeight: 500, fill: "hsl(var(--foreground))" }}
              />
              <PolarRadiusAxis
                domain={[0, 5]}
                tickCount={6}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }}
                angle={90}
                axisLine={false}
              />
              <Radar
                name="Profil Persepsi"
                dataKey="skor"
                stroke={C.blue}
                fill={C.blue}
                fillOpacity={0.4}
                dot={{ r: 5, fill: C.blue, strokeWidth: 0 }}
                activeDot={{ r: 7 } as any}
                strokeWidth={2}
              />
              <Legend wrapperStyle={{ fontSize: 13, fontWeight: 500, paddingTop: 8 }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v: number, name) => [v.toFixed(2), name]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <aside className="rounded-lg border border-border bg-muted/30 p-5 text-sm leading-relaxed flex flex-col gap-3">
          <h4 className="font-semibold text-foreground text-[15px]">Cara Membaca Grafik</h4>
          <p className="text-muted-foreground">
            Nilai pada radar merupakan <strong>rata-rata skor persepsi alumni</strong> terhadap efektivitas
            metode pembelajaran selama kuliah, diukur dengan skala Likert <strong>1–5</strong>.
          </p>
          <div className="text-sm text-muted-foreground border-t border-border pt-3 space-y-1">
            <p><strong>1</strong> = sangat kurang</p>
            <p><strong>2</strong> = kurang</p>
            <p><strong>3</strong> = cukup</p>
            <p><strong>4</strong> = baik</p>
            <p><strong>5</strong> = sangat baik</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Semakin luas area biru menutup polygon, semakin merata kualitas metode pembelajaran yang dirasakan alumni.
          </p>
        </aside>
      </div>
    </KpiCard>
  );
};

export default Kpi10LearningPerceptionChart;
