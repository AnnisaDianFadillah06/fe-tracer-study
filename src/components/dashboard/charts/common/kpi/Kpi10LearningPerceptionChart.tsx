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

const defaultData = [
  { dim: "Perkuliahan dalam Prodi", skor: 4.2 },
  { dim: "Perkuliahan di luar Prodi", skor: 3.6 },
  { dim: "Responsi dan Tutorial", skor: 3.9 },
  { dim: "Seminar", skor: 3.7 },
  { dim: "Praktikum", skor: 4.4 },
  { dim: "Penelitian/Perancangan", skor: 4.0 },
  { dim: "Magang/Kerja Lapangan", skor: 4.5 },
];

interface Props {
  data?: typeof defaultData;
  title?: string;
  subtitle?: string;
}

const Kpi10LearningPerceptionChart = ({
  data = defaultData,
  title = "Persepsi Alumni terhadap 7 Metode Pembelajaran (Q14)",
  subtitle = "Radar chart — rata-rata skor Likert 1-5 per metode pembelajaran",
}: Props) => (
  <KpiCard title={title} subtitle={subtitle}>
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="dim" fontSize={10} />
          <PolarRadiusAxis domain={[0, 5]} fontSize={10} />
          <Radar name="Profil Persepsi" dataKey="skor" stroke={C.blue} fill={C.blue} fillOpacity={0.45} dot={{ r: 4, fill: C.blueDark }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  </KpiCard>
);

export default Kpi10LearningPerceptionChart;