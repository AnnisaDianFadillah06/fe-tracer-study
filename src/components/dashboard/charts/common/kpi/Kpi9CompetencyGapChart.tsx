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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Radar as RadarIcon, BarChart3 } from "lucide-react";

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
  const [view, setView] = useState<"radar" | "bar">("radar");
  return (
    <>
    <KpiCard
      loading={loading}
      error={error}
      empty={isEmpty}
      title="Analisis Gap Kompetensi Lulusan"
      subtitle={view === "radar" ? "Radar chart — profil kompetensi saat lulus vs kebutuhan industri" : "Bar horizontal — gap per kompetensi (hijau = aman, merah = di bawah industri)"}
      compareType="competency"
      headerExtra={
        <ToggleGroup type="single" value={view} size="sm" onValueChange={(v) => v && setView(v as any)} className="bg-muted/40 rounded-md p-0.5">
          <ToggleGroupItem value="radar" aria-label="Tampilkan radar" className="h-7 px-2 text-xs gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <RadarIcon className="w-3.5 h-3.5" /> Radar
          </ToggleGroupItem>
          <ToggleGroupItem value="bar" aria-label="Tampilkan bar horizontal" className="h-7 px-2 text-xs gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <BarChart3 className="w-3.5 h-3.5" /> Bar Gap
          </ToggleGroupItem>
        </ToggleGroup>
      }
      methodology={
        view === "radar" ? (
          <MethodologyBlock
            description="Membandingkan rata-rata skor kompetensi yang dimiliki saat lulus dengan skor kompetensi yang dibutuhkan industri."
            formula={<>Skor Kompetensi = Σ Skor Likert (1–5) / Jumlah Responden</>}
          />
        ) : (
          <MethodologyBlock
            description="Selisih rata-rata skor kompetensi saat lulus terhadap kebutuhan industri."
            formula={<>Gap = Skor Saat Lulus − Skor Kebutuhan Industri</>}
            notes="Gap negatif berarti kompetensi lulusan di bawah ekspektasi industri."
          />
        )
      }
    >
      <div className="grid lg:grid-cols-2 gap-5 items-stretch">
        <div className="min-w-0">
          {view === "radar" ? (
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
          ) : (
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
          )}
        </div>
        <aside className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed flex flex-col gap-3">
          {view === "radar" ? (
            <>
              <h4 className="font-semibold text-foreground">Cara Membaca Radar</h4>
              <p className="text-muted-foreground">
                Nilai pada grafik merupakan <strong>rata-rata skor persepsi</strong> alumni terhadap kompetensi pada skala
                <strong> 1–5</strong>:
              </p>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: C.blue }} /> <span><strong>Saat Lulus</strong> — kompetensi yang dimiliki alumni saat lulus.</span></li>
                <li className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded-sm" style={{ background: C.orange }} /> <span><strong>Kebutuhan Industri</strong> — ekspektasi industri terhadap kompetensi.</span></li>
              </ul>
              <div className="text-xs text-muted-foreground border-t border-border pt-2 space-y-0.5">
                <p><strong>1</strong> = sangat kecil / sangat kurang</p>
                <p><strong>3</strong> = cukup</p>
                <p><strong>5</strong> = sangat besar / sangat baik</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Semakin luas area biru menutup area oranye, semakin sesuai kompetensi lulusan dengan kebutuhan industri.
              </p>
            </>
          ) : (
            <>
              <h4 className="font-semibold text-foreground">Cara Membaca Gap</h4>
              <p className="text-muted-foreground">
                Bar menunjukkan <strong>selisih</strong> skor kompetensi lulusan terhadap kebutuhan industri.
              </p>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm mt-1 shrink-0" style={{ background: C.green }} />
                  <span><strong>Hijau (positif)</strong> — kompetensi lulusan <em>melampaui</em> persepsi kebutuhan industri. Ini kondisi yang baik.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm mt-1 shrink-0" style={{ background: C.red }} />
                  <span><strong>Merah (negatif)</strong> — kompetensi lulusan <em>di bawah</em> kebutuhan industri. Indikator yang perlu perhatian / perbaikan kurikulum.</span>
                </li>
              </ul>
              <p className="text-xs text-muted-foreground border-t border-border pt-2">
                Klik bar untuk melihat data alumni terkait kompetensi tersebut.
              </p>
            </>
          )}
        </aside>
      </div>
    </KpiCard>
    <StudentDataModal isOpen={modal.open} onClose={() => setModal((m) => ({ ...m, open: false }))} title={modal.title} students={modal.students} columns={[]} />
    </>
  );
};

export default Kpi9CompetencyGapChart;