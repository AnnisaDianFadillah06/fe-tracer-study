import { useState } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LabelList,
} from "recharts";
import { C, tooltipStyle, KpiCard } from "../KpiCard";
import StudentDataModal from "@/components/dashboard/StudentDataModal";
import { MethodologyBlock } from "./Methodology";
import { MOCK_STUDENTS, Student } from "@/lib/mockData";

const defaultRadar = [
  { kompetensi: "Etika", lulus: 4.6, industri: 4.3 },
  { kompetensi: "Keahlian Bid. Ilmu", lulus: 3.8, industri: 4.4 },
  { kompetensi: "Bahasa Inggris", lulus: 3.1, industri: 4.2 },
  { kompetensi: "Teknologi Informasi", lulus: 4.5, industri: 4.2 },
  { kompetensi: "Komunikasi", lulus: 3.6, industri: 4.3 },
  { kompetensi: "Kerja Sama Tim", lulus: 4.5, industri: 4.1 },
  { kompetensi: "Pengembangan Diri", lulus: 3.7, industri: 4.2 },
];

interface Props {
  radarData?: typeof defaultRadar;
  loading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
}

const Kpi9CompetencyGapChart = ({ radarData = defaultRadar, loading, error, isEmpty }: Props) => {
  const gap = radarData.map((d) => ({
    kompetensi: d.kompetensi,
    gap: +(d.lulus - d.industri).toFixed(2),
  }));
  const [modal, setModal] = useState<{ open: boolean; title: string; students: Student[] }>({ open: false, title: "", students: [] });
  const openModal = (title: string) => setModal({ open: true, title, students: MOCK_STUDENTS.slice(0, 30) });
  return (
    <>
    <div className="grid lg:grid-cols-2 gap-4">
      <KpiCard loading={loading} error={error} empty={isEmpty} title="Profil Kompetensi: Saat Lulus vs Kebutuhan Industri" subtitle="Radar chart" compareType="competency"
        methodology={
          <MethodologyBlock
            description="Membandingkan rata-rata skor kompetensi yang dimiliki saat lulus dengan skor kompetensi yang dibutuhkan industri."
            formula={<>Skor Kompetensi = Σ Skor Likert (1–5) / Jumlah Responden</>}
          />
        }>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="kompetensi" fontSize={10} />
              <PolarRadiusAxis domain={[0, 5]} fontSize={10} />
              <Radar name="Saat Lulus" dataKey="lulus" stroke={C.blue} fill={C.blue} fillOpacity={0.3} />
              <Radar name="Kebutuhan Industri" dataKey="industri" stroke={C.orange} fill={C.orange} fillOpacity={0.3} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </KpiCard>
      <KpiCard loading={loading} error={error} empty={isEmpty} title="Gap Kompetensi per Indikator" subtitle="Bar horizontal — merah = gap negatif, hijau = aman" compareType="competency"
        methodology={
          <MethodologyBlock
            description="Selisih rata-rata skor kompetensi saat lulus terhadap kebutuhan industri."
            formula={<>Gap = Skor Saat Lulus − Skor Kebutuhan Industri</>}
            notes="Gap negatif berarti kompetensi lulusan di bawah ekspektasi industri."
          />
        }>
        <div style={{ height: gap.length * 44 + 40 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gap} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} horizontal={false} />
              <XAxis type="number" domain={[-1.5, 1.5]} fontSize={11} />
              <YAxis type="category" dataKey="kompetensi" width={150} fontSize={10} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine x={0} stroke="hsl(var(--foreground))" />
              <Bar dataKey="gap" radius={[0, 6, 6, 0]} maxBarSize={24}
                cursor="pointer" onClick={(d: any) => openModal(`Gap ${d.kompetensi} (${d.gap})`)}
                activeBar={{ stroke: "hsl(var(--foreground))", strokeWidth: 2 } as any}>
                {gap.map((d, i) => (
                  <Cell key={i} fill={d.gap < 0 ? C.red : C.green} />
                ))}
                <LabelList dataKey="gap" position="right" fontSize={11} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </KpiCard>
    </div>
    <StudentDataModal isOpen={modal.open} onClose={() => setModal((m) => ({ ...m, open: false }))} title={modal.title} students={modal.students} columns={[]} />
    </>
  );
};

export default Kpi9CompetencyGapChart;