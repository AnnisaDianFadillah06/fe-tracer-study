import { useState } from "react";
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
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MOCK_STUDENTS, Student } from "@/lib/mockData";

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
  loading?: boolean;
  error?: string | null;
}

const Kpi10LearningPerceptionChart = ({
  data = defaultData,
  title = "Persepsi Alumni terhadap 7 Metode Pembelajaran (Q14)",
  subtitle = "Radar chart — rata-rata skor Likert 1-5 per metode pembelajaran", loading, error }: Props) => {
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  return (
  <>
  <KpiCard loading={loading} error={error} title={title} subtitle={subtitle} compareType="learning">
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} onClick={(e: any) => {
          const d = e?.activePayload?.[0]?.payload;
          if (d) setModal({ open: true, title: `Persepsi: ${d.dim} (skor ${d.skor})`, students: MOCK_STUDENTS.slice(0, 30) });
        }}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="dim" fontSize={10} />
          <PolarRadiusAxis domain={[0, 5]} fontSize={10} />
          <Radar name="Profil Persepsi" dataKey="skor" stroke={C.blue} fill={C.blue} fillOpacity={0.45} dot={{ r: 4, fill: C.blueDark, cursor: "pointer" } as any} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  </KpiCard>
  <StudentDataModal isOpen={modal.open} onClose={() => setModal((m) => ({ ...m, open: false }))} title={modal.title} students={modal.students} columns={[]} />
  </>
  );
};

export default Kpi10LearningPerceptionChart;